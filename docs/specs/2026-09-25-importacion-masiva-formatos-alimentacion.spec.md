# SPEC: Importacion Masiva de Formatos de Alimentacion Diligenciados

- Estado: proposed
- Fecha: 2026-09-25
- Modulo: `registro-alimentacion`
- Fase: validacion e importacion masiva de PDFs por adulto mayor y mes
- Depende de: `docs/specs/2026-08-06-importar-pdf-alimentacion.spec.md`

## 1. Objetivo

Permitir que un usuario autorizado importe muchos formatos PDF diligenciados en una sola operacion, relacionando cada archivo con el adulto mayor y el mes a partir de su nombre.

La importacion debe reducir el trabajo manual sin convertir el frontend en responsable de la seguridad, la resolucion del adulto mayor o la consistencia de las versiones.

## 2. Contexto tecnico actual

1. El modulo ya permite importar un PDF por adulto mayor y mes mediante `POST /api/registro-alimentacion/adultos-mayores/:adultoMayorId/formato-entrega/imported-pdfs`.
2. Los importados se guardan en una entidad separada de las emisiones generadas por el sistema y manejan versiones por adulto mayor y mes.
3. El almacenamiento actual usa `ALIMENTACION_FORMATOS_DIR/<tenantId>/<adultoMayorId>/<YYYY-MM>/` y nombres internos UUID.
4. El backend valida sesion, permiso, tenant, extension, MIME, firma `%PDF-`, tamano y nombre seguro.
5. La pantalla de Registro de alimentacion tiene filtro por mes, filtro de centro para SuperAdmin, historial de descargas y acciones de importacion individual.
6. El boton visual de importacion masiva ya esta ubicado junto a Historial y Generar ZIP, pero permanece deshabilitado hasta implementar esta spec.

## 3. Decisiones de producto

### 3.1 Nombre de archivo sin tipo de documento

No se incluira el tipo de documento en el nombre. La convencion canonica sera:

```text
<numero-identificacion>-<YYYY-MM>.pdf
```

Ejemplos:

```text
30029339-2026-09.pdf
45871236-2026-09.pdf
30029339-2026-10.pdf
```

El numero de identificacion debe ser unico dentro de la sede seleccionada. Antes de activar la funcionalidad se ejecutara una auditoria para detectar duplicados por tenant. Si existen duplicados, la validacion del lote debe marcar esos archivos como ambiguos y no importarlos automaticamente.

### 3.2 Modos de periodo

La importacion tendra dos modos:

1. **Mes seleccionado**: el usuario selecciona un mes, por ejemplo `2026-09`. Todos los archivos deben incluir ese mismo mes en el nombre.
2. **Todos los meses**: el usuario no fija un mes. Cada archivo debe incluir `YYYY-MM` y el backend determina el mes individualmente.

En ambos modos el mes debe estar presente en el nombre. No se aceptara `30029339.pdf`, porque no permite identificar el periodo cuando se importan varios meses.

### 3.3 Una sede por lote

Cada lote pertenece a una sola sede:

1. los usuarios de una sede usan automaticamente su `tenantId`;
2. un SuperAdmin debe seleccionar una sede antes de validar;
3. el nombre del archivo no incluira la sede;
4. el numero solo se resolvera dentro del tenant elegido.

Esto evita colisiones si dos sedes tienen adultos con el mismo numero de identificacion y mantiene el aislamiento multi-tenant.

### 3.4 Validacion antes de guardar

La operacion tendra dos fases:

1. **Validar**: recibir, analizar y guardar temporalmente los archivos; devolver una previsualizacion por archivo.
2. **Confirmar**: importar solamente los archivos validos que el usuario confirme.

No se ejecutara un ciclo de solicitudes individuales desde el navegador. El backend sera responsable de procesar el lote, controlar permisos, evitar colisiones y devolver resultados individuales.

## 4. Alcance funcional

1. Activar el boton minimalista `Importar formatos masivos` en la barra de Registro de alimentacion.
2. Permitir seleccionar multiples archivos PDF.
3. Permitir elegir `Mes seleccionado` o `Todos los meses`.
4. Solicitar centro cuando el actor sea SuperAdmin.
5. Validar el patron del nombre, PDF, mes, sede y coincidencia con adulto mayor.
6. Mostrar una tabla de previsualizacion antes de confirmar.
7. Permitir confirmar los archivos listos y resolver advertencias.
8. Importar versiones sin sobrescribir archivos historicos.
9. Mostrar un resultado final con importados, omitidos y errores.
10. Permitir reintentar solamente los archivos fallidos sin repetir los ya importados.
11. Mantener funcionando la importacion individual existente.

## 5. Patron y normalizacion del nombre

### 5.1 Nombre canonico

El generador de PDFs debe producir:

```text
30029339-2026-09.pdf
```

El separador entre numero y periodo sera `_`; el periodo sera siempre `YYYY-MM` con mes de dos digitos.

### 5.2 Regla de parseo

La validacion debe extraer:

1. `documentNumber`: texto anterior al ultimo `_`;
2. `deliveryMonth`: segmento con formato `YYYY-MM` inmediatamente anterior a `.pdf`.

El parser debe aceptar mayusculas en la extension y normalizar el nombre sin cambiar el valor original guardado en metadata.

Durante una fase de compatibilidad se podra aceptar el nombre actualmente generado por el sistema, por ejemplo `formato-entrega-30029339-2026-09.pdf`, pero las nuevas descargas deben usar el formato canonico.

### 5.3 Normalizacion de identificacion

La comparacion debe usar una clave normalizada compartida por API y pruebas:

1. quitar espacios al inicio y al final;
2. convertir letras a mayusculas;
3. normalizar separadores permitidos de identificacion de forma determinista;
4. no usar el nombre completo del adulto como criterio de coincidencia;
5. si la normalizacion produce una colision dentro del tenant, marcar el archivo como ambiguo.

La estrategia exacta de separadores debe implementarse como una unica funcion de dominio, no duplicarse en el controlador y el frontend.

## 6. Flujo de usuario

### 6.1 Seleccion

Al presionar `Importar formatos masivos`:

1. se abre un dialogo accesible;
2. se muestra la sede actual o el selector de sede para SuperAdmin;
3. se muestra el selector `Mes seleccionado` / `Todos los meses`;
4. para `Mes seleccionado`, se muestra el mes activo y se permite cambiarlo dentro del dialogo;
5. se habilita un selector multiple con `accept=".pdf,application/pdf"`;
6. se informa la convencion esperada `numero-YYYY-MM.pdf` y un ejemplo.

### 6.2 Previsualizacion

Despues de seleccionar los archivos, el frontend envia el lote a validacion y muestra una tabla con:

| Campo | Descripcion |
| --- | --- |
| Archivo | Nombre original |
| Identificacion | Numero extraido |
| Adulto mayor | Nombre encontrado o `No encontrado` |
| Mes | Periodo extraido |
| Tamano | Tamano del archivo |
| Estado | Listo, advertencia o error |
| Detalle | Motivo accionable |

El resumen debe indicar total, listos, advertencias y errores. El boton de confirmacion debe mostrar cuantas entradas seran importadas.

### 6.3 Confirmacion

1. Los errores no se importan.
2. Las advertencias requieren una decision explicita.
3. El usuario puede omitir un archivo con advertencia o confirmar la creacion de una nueva version.
4. Durante la confirmacion se bloquean cierre, seleccion y doble envio.
5. El resultado muestra el estado de cada archivo y permite descargar un reporte simple de errores, si el lote contiene fallos.

## 7. Reglas de negocio

### 7.1 Resolucion del adulto

El backend resolvera cada archivo con:

```text
tenantId + documentNumber normalizado
```

Nunca se aceptara que el frontend envie un `adultoMayorId` para saltarse la resolucion o el scope. El `adultoMayorId` devuelto por la validacion sera una referencia informativa y se verificara nuevamente al confirmar.

### 7.2 Periodo

1. En modo `month`, el periodo del archivo debe coincidir con el seleccionado.
2. En modo `all`, el periodo se obtiene del nombre y debe ser valido.
3. No se permitiran meses futuros si esa regla coincide con la politica vigente del modulo; si se requiere permitirlos, debe quedar explicitamente configurado en contratos y pruebas.

### 7.3 Duplicados dentro del lote

No se permitiran dos archivos para la misma clave logica:

```text
tenantId + documentNumber + deliveryMonth
```

El lote los marcara como error y pedira al usuario conservar un solo archivo.

### 7.4 Version existente

Si ya existe una version importada para el adulto y mes:

1. el archivo se marca como advertencia;
2. no se sobrescribe la version existente;
3. el usuario elige entre omitirlo o crear una nueva version;
4. si el hash del archivo coincide con una version existente, se recomienda omitirlo como duplicado exacto;
5. una version diferente se registra como nueva version y conserva el historial.

### 7.5 Archivo generado por el sistema

La existencia de una emision generada por el sistema no bloquea automaticamente el PDF diligenciado importado. Son entidades distintas. La interfaz debe informar si existe una emision o importacion previa, pero la politica final de coexistencia debe mantenerse alineada con la spec individual.

## 8. Contratos y API

### 8.1 Contratos compartidos

Agregar en `packages/contracts/src/alimentacion.ts`:

1. enum o union `bulkImportMode`: `month | all`;
2. schema de parametros de validacion;
3. schema de estado por archivo: `ready | warning | error | imported | skipped`;
4. schema de codigos de error estables;
5. schema de resumen del lote;
6. schema de item validado con nombre, identificacion, mes, adulto encontrado, version actual, tamano y hash cuando corresponda;
7. schema de respuesta de validacion con `batchId` y expiracion;
8. schema de confirmacion y respuesta final por archivo.

Los tipos TypeScript deben inferirse desde Zod y reutilizarse en API, web, fixtures y handlers MSW.

### 8.2 Endpoints

| Metodo | Ruta | Funcion |
| --- | --- | --- |
| `POST` | `/api/registro-alimentacion/formato-entrega/imported-pdfs/batch/validate` | Recibe multiples PDFs y devuelve la previsualizacion |
| `POST` | `/api/registro-alimentacion/formato-entrega/imported-pdfs/batch/confirm` | Confirma el lote validado y crea las versiones |
| `GET` | `/api/registro-alimentacion/formato-entrega/imported-pdfs/batch/:batchId` | Consulta el resultado de un lote, si se necesita reabrirlo |

Los parametros de validacion pueden viajar como query para mantener el parser multipart sin campos ambiguos:

```text
?mode=month&deliveryMonth=2026-09&tenantId=<uuid>
```

Para `mode=all`, `deliveryMonth` no se envia. `tenantId` solo se acepta para SuperAdmin y siempre se valida contra el scope del actor.

El campo multipart de archivos sera repetible y se llamara `files`. La API no debe aceptar nombres de campo desconocidos.

### 8.3 Confirmacion

La confirmacion recibira JSON similar a:

```json
{
  "batchId": "uuid",
  "items": [
    { "itemId": "uuid", "decision": "import" },
    { "itemId": "uuid", "decision": "skip" }
  ]
}
```

La API debe volver a verificar actor, tenant, expiracion, hash, existencia del archivo temporal y estado del item antes de guardar.

## 9. Backend

### 9.1 Persistencia del lote

Se crearan tablas separadas para el lote y sus items, mediante migracion Drizzle versionada. El lote debe conservar metadata suficiente para auditar sin guardar secretos.

Campos minimos del lote:

| Campo | Regla |
| --- | --- |
| `id` | UUID |
| `tenant_id` | FK a `tenants` |
| `mode` | `month` o `all` |
| `selected_delivery_month` | Nullable; obligatorio en modo `month` |
| `created_by_user_id` | FK a `users` |
| `status` | `validated`, `processing`, `completed`, `partial`, `expired`, `failed` |
| `expires_at` | Fecha de expiracion del staging |
| `created_at` / `updated_at` | Timestamps |

Campos minimos del item:

| Campo | Regla |
| --- | --- |
| `id` | UUID |
| `batch_id` | FK al lote |
| `original_name` | Nombre seguro recibido |
| `document_number_key` | Identificacion normalizada |
| `delivery_month` | `YYYY-MM` extraido |
| `adulto_mayor_id` | Nullable si no se encontro |
| `staged_relative_path` | Ruta temporal interna |
| `sha256` | Hash del binario |
| `size_bytes` | Tamano validado |
| `status` | Estado por archivo |
| `reason_code` | Codigo estable nullable |
| `imported_version_id` | Nullable hasta confirmar |

El staging debe expirar y eliminar sus archivos. La limpieza puede ser un comando programado de la API o una tarea operativa; no se debe depender de Redis para la consistencia de esta funcionalidad.

### 9.2 Procesamiento de archivos

1. El parser multipart procesara archivos de forma secuencial o con concurrencia limitada.
2. No se cargara el lote completo en memoria.
3. Se mantendra el limite de 10 MiB por PDF.
4. El lote tendra un limite configurable de cantidad y bytes totales, inicialmente 100 archivos y 100 MiB.
5. Cada PDF se validara por MIME, extension, firma `%PDF-`, tamano y nombre.
6. El hash se calculara mientras se escribe en staging.
7. Los archivos finales seguiran usando UUID interno y ruta por tenant/adulto/mes.

### 9.3 Confirmacion y consistencia

1. La creacion de metadata y la asignacion de version deben ocurrir en una transaccion por item.
2. La asignacion de version debe ser segura ante confirmaciones concurrentes.
3. El movimiento de staging a la ruta final debe tener compensacion si la insercion falla.
4. Si un item falla, los items exitosos no se revierten automaticamente; el resultado debe indicar `partial` y permitir reintentar solo los fallidos.
5. Una misma confirmacion no puede crear dos versiones si se reintenta con el mismo `batchId` e `itemId`.

### 9.4 Autorizacion y auditoria

1. Se reutilizara `canManageAlimentacion` y el scope de `alimentacion.policy`.
2. El backend resolvera el adulto por tenant y numero normalizado.
3. No se expondran rutas fisicas ni nombres internos.
4. Se auditara la validacion y la confirmacion con actor, tenant, cantidad y resumen de resultados.
5. Cada importacion exitosa conservara la auditoria individual existente con adulto, mes y version.

## 10. Frontend

### 10.1 Boton de acceso

El boton existente `Importar formatos masivos` se activara cuando el endpoint este disponible:

1. mantendra formato de icono de 40 px junto a Historial y Generar ZIP;
2. usara el icono `Files` y el color azul definido para importacion;
3. tendra tooltip y nombre accesible;
4. respetara permisos de `alimentacion.import`;
5. mostrara estado de carga y no permitira doble apertura del lote.

### 10.2 Componentes

Crear:

1. `alimentacion-bulk-import-dialog.tsx` para seleccion, modo y sede;
2. `alimentacion-bulk-import-preview.tsx` para tabla de validacion;
3. `alimentacion-bulk-import-result.tsx` para resultado final, si la complejidad lo justifica;
4. funciones de parseo visual solo para feedback temprano; la decision definitiva siempre sera del backend.

Modificar:

1. `alimentacion-index-page.tsx` para estado del lote y refresco de queries;
2. `alimentacion-toolbar.tsx` si se decide mover el boton desde el slot de exportaciones;
3. `alimentacion.css` para estados, tabla, responsive y accion flotante si el dialogo lo requiere;
4. `alimentacion-api.ts` y `alimentacion-queries.ts` para validacion y confirmacion.

### 10.3 Estados de interfaz

La interfaz debe contemplar:

1. sin archivos;
2. validando;
3. resultados mixtos;
4. todos listos;
5. errores que impiden confirmar;
6. confirmando;
7. importacion parcial;
8. lote completado;
9. lote expirado o invalido.

La tabla debe permitir filtrar `Todos`, `Listos`, `Advertencias` y `Errores`, sin perder la referencia al nombre del archivo original.

## 11. Seguridad y limites

1. Validar autenticacion y permiso antes de guardar staging.
2. Aislar por tenant en validacion y confirmacion.
3. No permitir traversal mediante nombres ni rutas recibidas.
4. Mantener descarga autenticada; no exponer el staging como carpeta publica.
5. Limitar a 100 archivos y 100 MiB por lote, configurables por ambiente.
6. Mantener 10 MiB por archivo.
7. Rechazar archivos vacios, MIME falso, extension invalida y firma no PDF.
8. Expirar lotes no confirmados, inicialmente despues de 30 minutos.
9. Limpiar archivos temporales expirados.
10. Registrar errores sin guardar el contenido del PDF ni datos sensibles en logs.

## 12. Pruebas obligatorias

### 12.1 Dominio y contratos

1. parseo de `30029339-2026-09.pdf`;
2. rechazo de identificacion o periodo ausente;
3. rechazo de mes invalido;
4. normalizacion de identificadores;
5. deteccion de duplicados logicos dentro del lote;
6. rechazo de nombres peligrosos;
7. validacion de modos y parametros incompatibles.

### 12.2 API

1. lote valido en modo `month`;
2. lote valido en modo `all` con varios meses;
3. archivo de otro mes en modo `month`;
4. adulto no encontrado;
5. identificacion ambigua dentro del tenant;
6. usuario sin permiso;
7. SuperAdmin sin sede o sede no autorizada;
8. archivo no PDF, vacio, demasiado grande o lote excedido;
9. version existente con decision `skip` y `import`;
10. hash duplicado;
11. confirmacion repetida idempotente;
12. expiracion del lote y limpieza de staging;
13. fallo parcial con reintento de items;
14. aislamiento de tenant en validacion y confirmacion;
15. auditoria del lote y de cada importacion exitosa.

### 12.3 Web

1. el boton masivo aparece solo para usuarios autorizados;
2. se puede seleccionar un mes o todos los meses;
3. se puede seleccionar multiples PDFs;
4. se muestran resultados por archivo y resumen;
5. no se puede confirmar si no hay elementos listos;
6. se resuelven advertencias de versiones existentes;
7. se bloquea doble confirmacion;
8. se muestra resultado parcial y permite reintentar fallidos;
9. las queries de alimentacion se invalidan al finalizar;
10. el flujo individual permanece operativo.

### 12.4 Comandos de verificacion

```bash
pnpm --filter @cuidarte/contracts build
pnpm --filter @cuidarte/api typecheck
pnpm --filter @cuidarte/api test
pnpm --filter @cuidarte/web typecheck
pnpm --filter @cuidarte/web test
pnpm build
```

## 13. Plan de implementacion

1. Auditar duplicados de numero de identificacion por tenant.
2. Definir y probar la funcion de normalizacion y parser de nombres.
3. Extender contratos y migraciones para lotes e items.
4. Implementar staging, expiracion y limites de multipart.
5. Implementar validacion batch con scope, matching y estados.
6. Implementar confirmacion idempotente, versionado y auditoria.
7. Implementar cliente API, queries y dialogos de seleccion/previsualizacion.
8. Activar el boton visual y conectar estados de carga, error y resultado.
9. Actualizar el generador de nombres PDF al formato canonico.
10. Completar pruebas de dominio, API, web y persistencia.
11. Verificar volumen persistente, limpieza de staging y comportamiento en VPS.

## 14. Criterios de aceptacion

1. Un usuario autorizado puede seleccionar multiples PDFs desde Registro de alimentacion.
2. El sistema soporta modo mes seleccionado y modo todos los meses.
3. Cada archivo valido se relaciona con el adulto y mes correctos mediante su nombre.
4. Los archivos de otra sede, con nombre ambiguo o sin adulto coincidente no se importan.
5. El usuario puede revisar los resultados antes de confirmar.
6. Las versiones existentes no se sobrescriben y los duplicados exactos no generan versiones innecesarias.
7. Un fallo de un archivo no oculta ni revierte silenciosamente los resultados de los demas.
8. La operacion respeta permisos y aislamiento multi-tenant en ambos pasos.
9. Los archivos se almacenan de forma persistente y las rutas fisicas no se exponen.
10. El flujo individual, historial, descarga y generacion de ZIP continuan funcionando.
11. La interfaz muestra el boton masivo junto a Historial y Generar ZIP con su estilo minimalista.

## 15. Fuera de alcance

1. Reconocer el adulto leyendo el contenido interno del PDF mediante OCR.
2. Importar lotes de varias sedes simultaneamente.
3. Incluir el tipo de documento en el nombre canonico.
4. Reemplazar o eliminar automaticamente versiones historicas.
5. Modificar el contenido del PDF.
6. Migrar historicos existentes a un nuevo formato de nombre.
7. Introducir Redis como dependencia obligatoria de la importacion masiva.
