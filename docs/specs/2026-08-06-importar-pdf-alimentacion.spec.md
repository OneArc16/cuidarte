# SPEC: Importacion Versionada de Formatos de Alimentacion Diligenciados

- Estado: proposed
- Fecha: 2026-08-06
- Modulo: `registro-alimentacion`
- Fase: importacion, versionado y descarga de formatos PDF diligenciados
- Depende de: `alimentacion-formato-entrega-individual-v2.spec.md`

## 1. Objetivo

Permitir importar, conservar y descargar PDFs diligenciados del formato de entrega de alimentos por adulto mayor y mes, sin reemplazar archivos anteriores ni alterar el flujo de formatos generados y firmados por el sistema.

La solucion debe ser multi-tenant, persistente en VPS, trazable y segura frente a archivos falsos o rutas manipuladas.

## 2. Decision de arquitectura

No se reutilizara `alimentacion_formato_emissions` para las importaciones.

Esa tabla representa formatos emitidos por el sistema y exige snapshots de director, firma y version de firma. Registrar un archivo importado alli obligaria a inventar datos de una emision que nunca ocurrio y degradaria la auditoria historica.

Se creara una entidad separada para versiones importadas. Ambos tipos de documento podran coexistir para el mismo adulto mayor y mes:

1. formato generado por el sistema: se conserva en `alimentacion_formato_emissions`;
2. formato diligenciado importado: se conserva en la nueva tabla de importaciones.

## 3. Alcance funcional

1. El boton de importar de la fila principal del adulto mayor abre el selector de archivos.
2. El selector solo acepta PDFs.
3. Antes de enviar se muestra beneficiario, mes, nombre y tamano del archivo.
4. Si ya hay una version importada, la interfaz solicita confirmacion explicita antes de crear otra.
5. La subida muestra estado de carga y evita doble envio.
6. Al terminar, la fila se actualiza sin recargar la aplicacion y muestra que tiene un PDF importado.
7. La version mas reciente se puede descargar desde las acciones de la fila.
8. Se puede consultar y descargar el historial de versiones importadas.
9. La descarga del PDF generado por el sistema sigue funcionando sin cambios funcionales.

## 4. Modelo de datos y migracion

Se agregara `alimentacion_formato_imported_versions` mediante migracion Drizzle versionada. No se haran alteraciones manuales sobre PostgreSQL.

Campos minimos:

| Campo                 | Regla                                               |
| --------------------- | --------------------------------------------------- |
| `id`                  | UUID, clave primaria                                |
| `tenant_id`           | FK a `tenants`, obligatorio                         |
| `adulto_mayor_id`     | FK a `adultos_mayores`, obligatorio                 |
| `delivery_month`      | `YYYY-MM`, obligatorio                              |
| `version`             | Entero consecutivo por adulto mayor y mes           |
| `source`              | Valor fijo `importado`                              |
| `original_name`       | Nombre saneado recibido del usuario                 |
| `stored_name`         | UUID interno con extension `.pdf`                   |
| `pdf_relative_path`   | Ruta relativa dentro de `ALIMENTACION_FORMATOS_DIR` |
| `mime_type`           | `application/pdf`                                   |
| `size_bytes`          | Tamano validado en bytes                            |
| `imported_by_user_id` | FK a `users`                                        |
| `imported_at`         | Fecha y hora de importacion                         |

Restricciones e indices:

1. indice unico `(adulto_mayor_id, delivery_month, version)`;
2. indice `(tenant_id, delivery_month)` para listados por centro;
3. indice por `adulto_mayor_id` para el historial;
4. FKs con `onDelete: restrict` para preservar trazabilidad.

El numero de migracion se determinara al generarla, segun el ultimo journal de Drizzle vigente. Tambien se actualizaran `schema.ts` y los metadatos generados por Drizzle.

## 5. Contratos y API

### 5.1 Contratos compartidos

`packages/contracts/src/alimentacion.ts` incorporara:

1. schema de `deliveryMonth` reutilizable para importacion y listado;
2. schema de respuesta de importacion;
3. schema de version importada, con ID, version, nombre original, tamano, usuario y fecha;
4. respuesta de historial de versiones;
5. resumen de formato importado en `AlimentacionListItem`, suficiente para marcar la fila y descargar la ultima version;
6. tipos TypeScript inferidos desde los schemas, sin duplicarlos en API o web.

### 5.2 Endpoints

| Metodo | Ruta                                                                                                            | Funcion                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `POST` | `/api/registro-alimentacion/adultos-mayores/:adultoMayorId/formato-entrega/imported-pdfs?deliveryMonth=YYYY-MM` | Importa el campo multipart `file` y crea una nueva version |
| `GET`  | `/api/registro-alimentacion/adultos-mayores/:adultoMayorId/formato-entrega/imported-pdfs?deliveryMonth=YYYY-MM` | Lista las versiones importadas del mes                     |
| `GET`  | `/api/registro-alimentacion/adultos-mayores/:adultoMayorId/formato-entrega/imported-pdfs/:versionId/download`   | Descarga una version importada                             |

El `tenantId` no se aceptara como dato confiable de subida: se resuelve desde el adulto mayor y el scope del usuario autenticado, igual que el flujo de exportacion actual.

### 5.3 Respuesta de descarga

La descarga se servira exclusivamente desde la API autenticada con:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="<nombre-seguro>.pdf"
```

El nombre del header se normalizara para evitar inyeccion de cabeceras. Nunca se expondran rutas fisicas, rutas relativas internas, stack traces ni secretos.

## 6. Backend

### 6.1 Capas a modificar

1. `alimentacion.controller.ts`
   - parser multipart con el patron Fastify existente;
   - endpoints de importacion, listado y descarga;
   - anotaciones Swagger, guard de sesion y respuestas de error.
2. `alimentacion.service.ts`
   - autorizacion por rol y tenant;
   - validacion de adulto mayor y mes;
   - orquestacion de almacenamiento, versionado y lectura.
3. `alimentacion.repository.ts`, `alimentacion.types.ts` y `drizzle-alimentacion.repository.ts`
   - comandos y consultas para crear, listar y buscar versiones importadas;
   - asignacion transaccional de la siguiente version;
   - resumen de la ultima importacion para el listado principal.
4. `alimentacion-formato-files.storage.ts` y `local-alimentacion-formato-files.storage.ts`
   - se reutilizan, extendiendo su resultado para incluir el nombre interno cuando sea necesario;
   - se mantiene la resolucion estricta de rutas dentro de la carpeta base.
5. `alimentacion.module.ts`
   - conserva las inyecciones existentes; no se crea un almacenamiento paralelo innecesario.

### 6.2 Multipart y validaciones de seguridad

El endpoint aceptara exactamente un archivo en el campo `file` y ningun campo multipart adicional. El mes llega como query param para mantener la convencion del endpoint de exportacion existente.

Validaciones, en este orden cuando sea posible:

1. sesion activa y rol con permiso de gestionar alimentacion;
2. `adultoMayorId` UUID y adulto mayor existente dentro del scope del actor;
3. `deliveryMonth` con formato `YYYY-MM` y mes valido;
4. solicitud multipart y presencia de un unico archivo `file`;
5. archivo no vacio y de maximo 10 MiB;
6. extension `.pdf`, sin importar mayusculas/minusculas;
7. MIME declarado exactamente `application/pdf`;
8. primeros bytes con firma `%PDF-`;
9. nombre original sin separadores de ruta, segmentos `.`/`..`, bytes nulos ni caracteres de control; luego se sanea y limita antes de guardarlo como metadato.

El limite global de `@fastify/multipart` ya es de 10 MiB y se mantendra; el servicio repetira la regla para asegurar el comportamiento de negocio y emitir un mensaje claro si el parser reporta truncamiento o exceso.

### 6.3 Almacenamiento y consistencia

Se usara `ALIMENTACION_FORMATOS_DIR` como directorio raiz. Para importados, la convencion sera:

```txt
<ALIMENTACION_FORMATOS_DIR>/<tenantId>/<adultoMayorId>/<YYYY-MM>/<uuid>.pdf
```

Reglas:

1. no se escribe en `/tmp`;
2. el binario no se almacena en PostgreSQL;
3. el nombre interno es UUID y nunca deriva del nombre original;
4. en VPS, `ALIMENTACION_FORMATOS_DIR=/data/uploads/alimentacion-formatos` debe estar dentro del volumen persistente ya montado;
5. no se modificara `.env.vps` ni se agregaran secretos;
6. si falla la transaccion de metadata despues de guardar el archivo, se elimina el archivo nuevo como compensacion;
7. nunca se borran ni se sobrescriben versiones anteriores.

Los valores por defecto y ejemplos locales de `ALIMENTACION_FORMATOS_DIR` se moveran a una ruta persistente del proyecto, por ejemplo `.data/uploads/alimentacion-formatos`, para no promover el uso de `/tmp`.

### 6.4 Auditoria y errores de negocio

Cada importacion creara un registro de auditoria con accion `alimentacion.formato_imported`, tenant, adulto mayor, mes, version, metadata no sensible y usuario actor. Las descargas de importados se auditaran como `alimentacion.formato_imported_downloaded`.

Mensajes controlados esperados:

1. archivo no enviado;
2. solicitud no multipart o campo no soportado;
3. archivo no PDF, extension invalida o MIME invalido;
4. contenido PDF invalido;
5. archivo demasiado grande;
6. mes invalido;
7. adulto mayor inexistente;
8. tenant no autorizado;
9. version no encontrada;
10. fallo de almacenamiento sin exponer la ruta interna.

## 7. Frontend

### 7.1 Componentes y flujo

1. `alimentacion-table.tsx`
   - habilitar el boton Importar solo para roles que ya pueden gestionar alimentacion;
   - abrir un input de archivo oculto con `accept=".pdf,application/pdf"`;
   - exponer accion para abrir el historial cuando exista importacion.
2. Nuevo componente `alimentacion-imported-pdf-dialog.tsx`
   - mostrar beneficiario, mes, nombre de archivo y tamano formateado;
   - confirmar la primera carga;
   - si existe historial, advertir que se agregara una nueva version, sin reemplazar la actual;
   - bloquear acciones durante la mutacion y anunciar exito o error con regiones accesibles.
3. Nuevo componente `alimentacion-imported-pdf-versions-dialog.tsx`
   - listar versiones descendentes con nombre, tamano, fecha y usuario importador;
   - permitir descargar cada version.
4. `alimentacion-index-page.tsx`
   - mantener el estado del archivo seleccionado, dialogos, mensajes y version en carga;
   - exigir que exista un mes seleccionado antes de permitir importar;
   - conservar el flujo de exportacion actual.

Los dialogos seguiran el patron accesible ya presente en el proyecto: `role="dialog"`, `aria-modal`, etiqueta, cierre por Escape y control de clic fuera del contenido.

### 7.2 Cliente API y cache

1. `alimentacion-api.ts`: construir `FormData` con el campo `file` y usar `fetchJson`; no fijar manualmente `Content-Type`.
2. `alimentacion-queries.ts`: agregar mutation de importacion y query de versiones, con claves que incluyan adulto mayor y mes.
3. Tras una importacion exitosa, invalidar las queries de `alimentacion` y el historial correspondiente, sin recargar la pagina.
4. La descarga utilizara `fetchBlob` y el helper `downloadBlob`, preservando cookies de sesion.
5. Fixtures y handlers MSW representaran resumenes importados e historial para pruebas aisladas.

## 8. Plan de implementacion

1. Extender contratos, esquema Drizzle y generar la migracion.
2. Incorporar tipos, repositorio y auditoria para importados, con versionado transaccional.
3. Implementar servicio, parser multipart, validadores de PDF y endpoints autenticados.
4. Añadir cliente web, React Query y componentes de confirmacion/historial.
5. Activar acciones de importacion y descarga en la tabla sin afectar exportacion.
6. Completar pruebas, typecheck, build y verificacion manual de almacenamiento persistente.

## 9. Pruebas obligatorias

### 9.1 API

1. importacion valida y persistencia de metadata;
2. archivo ausente o vacio;
3. MIME invalido;
4. extension invalida;
5. contenido sin firma `%PDF-`;
6. archivo mayor de 10 MiB;
7. mes invalido;
8. adulto mayor inexistente o de tenant no autorizado;
9. dos importaciones para el mismo adulto/mes producen versiones consecutivas y preservan ambas;
10. listado de versiones respetando scope;
11. descarga valida, version inexistente y descarga fuera de tenant;
12. rutas internas seguras y rechazo de nombres peligrosos;
13. compensacion del archivo si falla la persistencia de metadata.

### 9.2 Web

1. el boton abre el selector y restringe PDF;
2. la validacion temprana rechaza archivos no PDF;
3. se muestran beneficiario, mes, nombre y tamano antes de confirmar;
4. existe confirmacion reforzada al agregar una nueva version;
5. el boton muestra carga y queda deshabilitado durante el envio;
6. se presentan mensajes claros de exito y error;
7. la fila se refresca e indica PDF importado;
8. se descarga la ultima version y una version historica.

### 9.3 Comandos de verificacion

```bash
pnpm --filter @cuidarte/contracts build
pnpm --filter @cuidarte/api typecheck
pnpm --filter @cuidarte/api test
pnpm --filter @cuidarte/web typecheck
pnpm --filter @cuidarte/web test
pnpm build
```

En VPS se verificara ademas que el archivo exista bajo `/var/lib/cuidarte/uploads/alimentacion-formatos` en el host, que sobreviva a la recreacion del contenedor y que solo sea accesible mediante la API autenticada.

## 10. Criterios de aceptacion

1. Un usuario autorizado puede importar un PDF valido para un adulto mayor y mes dentro de su tenant.
2. El archivo persiste fuera del contenedor, no en `/tmp`, y PostgreSQL solo guarda metadata.
3. El sistema rechaza archivos falsos, demasiado grandes, mal nombrados o fuera de formato.
4. Cada nueva carga crea una version nueva; nunca elimina ni reemplaza versiones anteriores.
5. La interfaz informa claramente antes y despues de la carga, y actualiza la fila sin recargar la aplicacion.
6. Los usuarios autorizados descargan versiones importadas; usuarios de otro tenant no pueden verlas ni descargarlas.
7. La descarga de formatos generados por el sistema sigue operativa.
8. Las pruebas, typechecks y build relevantes finalizan correctamente o documentan fallos previos no relacionados.

## 11. Riesgos y mitigaciones

1. **Colision de version por cargas concurrentes.**
   Mitigacion: indice unico y asignacion de version en transaccion; traducir conflicto a error de negocio o reintento controlado.
2. **Archivo en disco sin fila en base de datos.**
   Mitigacion: compensacion de borrado ante fallo posterior a la escritura.
3. **Fila de metadata sin archivo en disco.**
   Mitigacion: error controlado de recuperacion, auditoria y alerta operativa; nunca devolver la ruta al cliente.
4. **Crecimiento de disco en VPS.**
   Mitigacion: limite de 10 MiB, monitoreo de disco y backup del volumen persistente.
5. **Regresion en el PDF emitido.**
   Mitigacion: mantener el flujo y tabla de emisiones separados, con prueba especifica de exportacion existente.

## 12. Fuera de alcance

1. Reemplazar o eliminar versiones importadas existentes.
2. Editar el contenido de un PDF despues de importarlo.
3. Almacenamiento externo (S3 u otro proveedor).
4. Migrar historicos de emisiones generadas a la nueva entidad.
5. Despliegue automatico, push o merge.
