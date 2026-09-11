# SPEC: Modulo de Reportes y Descargas Mensuales

- Estado: planned
- Fecha: 2026-09-11
- Tipo: implementation-spec
- Estrategia: implementacion incremental con aprobacion entre pasos
- Modulos impactados: `reportes`, `actividades-grupales`, `alimentacion`
- Paquetes impactados: `packages/contracts`, `apps/api`, `apps/web`
- Infraestructura impactada: Redis, worker de reportes y almacenamiento temporal

## 1. Objetivo

Crear un modulo de reportes que permita generar y descargar, por centro y mes, paquetes
separados de documentos de:

1. actas de sesiones grupales;
2. formatos mensuales de entrega de alimentos, un PDF individual por adulto mayor.

El modulo debe ser comodo para el usuario, respetar el aislamiento por tenant y producir los
archivos en segundo plano para que una descarga grande no bloquee ni tumbe la API.

La primera version debe permitir que `super_admin` seleccione el centro. Los roles `admin` y
`director` trabajan automaticamente con el centro de su sesion.

## 2. Protocolo obligatorio de ejecucion incremental

Este spec no autoriza implementar todos los pasos en una sola ejecucion.

Reglas para quien implemente:

1. ejecutar exclusivamente el primer paso pendiente del checklist de la seccion 16;
2. no adelantar archivos, endpoints ni refactors de pasos posteriores;
3. completar las pruebas y la puerta de salida del paso actual;
4. cambiar `[ ]` por `[x]` solamente cuando la puerta de salida este verde;
5. registrar en la seccion 18 los archivos cambiados, pruebas y decisiones;
6. detenerse y presentar el resultado al usuario;
7. continuar solamente despues de una instruccion explicita como `continua`;
8. corregir las fallas del paso actual antes de avanzar;
9. si una decision funcional contradice este documento, detenerse y solicitar confirmacion;
10. no mezclar limpieza general, renombrados masivos ni cambios cosmeticos ajenos al alcance;
11. mantener contratos, API y web compilables cuando sean impactados;
12. los cambios de base de datos deben ser aditivos y compatibles con la version anterior.

## 3. Contexto y hallazgos de la implementacion actual

Antes de implementar se deben conservar estas invariantes:

1. El formato de alimentacion se genera en `AlimentacionFormatoExportService`.
2. Es un PDF individual por adulto mayor y por `deliveryMonth`.
3. El contenido mensual contiene los registros de entrega del adulto mayor, agrupados en
   bloques de visitas.
4. El sistema ya persiste emisiones del formato y puede reutilizar un PDF cuando no cambiaron
   sus dependencias o datos de origen.
5. El nombre tecnico actual del PDF generado es:

   ```txt
   formato-entrega-{numero-documento}-{YYYY-MM}.pdf
   ```

6. Los PDFs importados son versiones diligenciadas y conservan el nombre original cargado por
   el usuario.
7. Las actas de sesiones grupales y sus evidencias pertenecen al modulo
   `actividades-grupales`.
8. La API es la fuente de verdad para permisos, tenant, existencia de documentos y alcance.
9. Redis ya forma parte del entorno local, aunque el reporte no debe depender de que Redis sea
   accesible desde el navegador.

El modulo de reportes debe consumir puertos de lectura y servicios existentes. No debe duplicar
la logica de generacion de PDFs ni consultar directamente las tablas de otros modulos desde un
controller.

## 4. Decisiones funcionales cerradas

### 4.1 Tipos de reporte

El modulo ofrece dos reportes independientes:

1. `ACTAS_SESIONES_GRUPALES`;
2. `FORMATOS_ENTREGA_ALIMENTACION`.

Cada reporte tiene su propia tarea, progreso, archivo comprimido, auditoria y descarga. Nunca se
mezclan actas y formatos de alimentacion dentro del mismo paquete.

### 4.2 Filtros

La primera version requiere:

1. `deliveryMonth` o periodo en formato `YYYY-MM`;
2. `tenantId` solamente cuando el actor es `super_admin`;
3. el tenant de la sesion para `admin` y `director`.

No se agrega un filtro libre de fechas en la primera version. El periodo mensual debe ser una
entrada valida, no un texto arbitrario.

### 4.3 Permisos

| Rol           | Ver modulo | Seleccionar centro       | Crear reporte | Ver historial | Descargar |
| ------------- | ---------- | ------------------------ | ------------- | ------------- | --------- |
| `super_admin` | Si         | Si, dentro de su alcance | Si            | Si            | Si        |
| `admin`       | Si         | No, usa su centro        | Si            | Si, su centro | Si        |
| `director`    | Si         | No, usa su centro        | Si            | Si, su centro | Si        |
| `auditor`     | No         | No                       | No            | No            | No        |
| Otros roles   | No         | No                       | No            | No            | No        |

La API debe validar el rol y el alcance del tenant en cada caso de uso. Ocultar el modulo o
deshabilitar un boton en React no reemplaza la autorizacion backend.

### 4.4 Resultado sin documentos

Si no existen documentos para el centro y mes solicitado:

1. no se crea un ZIP vacio;
2. la API responde con un resultado explicito de `NO_DOCUMENTS` al consultar el conteo; o
3. una tarea ya creada termina en estado `empty` con una explicacion visible.

La interfaz debe informar si no hay actas, formatos o ambos.

### 4.5 Formato de compresion

El formato predeterminado sera ZIP, no RAR, por compatibilidad multiplataforma, soporte nativo
en los sistemas operativos y disponibilidad de librerias Node.js seguras para streaming.

La implementacion debe aislar la compresion detras de un puerto, por ejemplo
`ReportArchiveWriter`. Si una exigencia institucional obliga a RAR, se agregara un adaptador de
worker basado en una herramienta instalada y validada en infraestructura, sin contaminar el
caso de uso con comandos del sistema operativo.

No se implementara una conversion silenciosa de ZIP a RAR ni se asumira que el usuario tiene una
aplicacion RAR instalada.

## 5. Convencion de nombres

### 5.1 PDF de formato de alimentacion dentro del reporte

El formato es individual por adulto mayor, mensual. Para los archivos entregados en el reporte
se usara:

```txt
FORMATO_ENTREGA_{DOCUMENTO}_{APELLIDOS}_{NOMBRES}_{YYYY-MM}.pdf
```

Ejemplo:

```txt
FORMATO_ENTREGA_1020304050_GOMEZ_PEREZ_MARIA_ELENA_2026-08.pdf
```

Reglas de normalizacion:

1. convertir a mayusculas;
2. quitar tildes y diacriticos;
3. reemplazar caracteres no alfanumericos por `_`;
4. colapsar separadores repetidos;
5. eliminar separadores al inicio y al final;
6. preservar el numero de documento como identificador principal;
7. limitar la longitud total del filename sin perder documento ni periodo;
8. no incluir datos clinicos, correo, telefono ni informacion adicional sensible.

El orden de la persona debe derivarse de los campos estructurados disponibles. Si el dominio
solo entrega `fullName`, se documenta y prueba el criterio de normalizacion vigente; no se debe
intentar adivinar apellidos dividiendo el texto de forma fragil.

### 5.2 Actas de sesiones grupales

El nombre debe usar el identificador estable del acta, la fecha y un descriptor normalizado:

```txt
ACTA_SESION_GRUPAL_{FECHA}_{NUMERO_ACTA}_{DESCRIPTOR}.pdf
```

Ejemplo:

```txt
ACTA_SESION_GRUPAL_2026-08-15_0042_ACTIVIDAD_FISICA.pdf
```

Si el acta existente ya tiene un filename persistido, el reporte debe preferir el filename
historico seguro y solamente construir uno nuevo cuando el documento se genere durante el
proceso. No se deben renombrar masivamente archivos existentes como parte de este modulo.

### 5.3 Nombre del archivo comprimido

```txt
FORMATOS_ENTREGA_ALIMENTACION_{CENTRO}_{YYYY-MM}.zip
ACTAS_SESIONES_GRUPALES_{CENTRO}_{YYYY-MM}.zip
```

Para el reporte global de `super_admin`:

```txt
FORMATOS_ENTREGA_ALIMENTACION_TODOS_LOS_CENTROS_{YYYY-MM}.zip
ACTAS_SESIONES_GRUPALES_TODOS_LOS_CENTROS_{YYYY-MM}.zip
```

Cuando el reporte sea global, el ZIP debe separar los centros en carpetas normalizadas:

```txt
CENTRO_VIDA_BOGOTA/
  FORMATO_ENTREGA_1020304050_GOMEZ_PEREZ_MARIA_ELENA_2026-08.pdf
CENTRO_VIDA_MEDELLIN/
  FORMATO_ENTREGA_8001234567_RODRIGUEZ_LOPEZ_JUAN_CARLOS_2026-08.pdf
```

## 6. Experiencia de usuario

La pantalla debe llamarse `Reportes` y mantener los dos flujos separados dentro del mismo
modulo:

```txt
Reportes

[Mes] [Centro, solo super_admin]

Actas de sesiones grupales
  Actas disponibles: 35
  [Generar reporte de actas]

Formatos de entrega de alimentos
  Adultos con formato disponible: 180
  [Generar reporte de alimentacion]

Reportes recientes
  Tipo | Centro | Periodo | Documentos | Estado | Accion
```

La interfaz debe:

1. cargar centros solamente para `super_admin`;
2. precargar el centro del actor cuando corresponda;
3. consultar conteos antes de permitir una solicitud innecesaria;
4. deshabilitar unicamente el boton del tipo que esta creando;
5. permitir navegar fuera de la pantalla mientras el reporte continua;
6. actualizar estado mediante polling controlado o una estrategia equivalente;
7. mostrar progreso sin prometer un porcentaje exacto si el total aun no fue calculado;
8. ofrecer descarga solamente cuando el estado sea `ready`;
9. mostrar errores accionables y una opcion de reintento seguro;
10. diferenciar claramente formatos generados de PDFs importados si ambos aparecen en el
    resultado.

Estados visibles:

```txt
Pendiente
Procesando
Listo
Sin documentos
Error
Cancelado
Expirado
```

## 7. Arquitectura de procesamiento

La peticion HTTP no debe generar todos los PDFs ni construir el ZIP completo. El flujo esperado
es:

```txt
Web
  -> Reports API: crea tarea
  -> Redis/BullMQ: encola trabajo
  -> Report worker: consulta y procesa documentos
  -> Storage temporal: guarda ZIP
  -> Reports API: expone estado y descarga autorizada
  -> Web: descarga cuando esta listo
```

### 7.1 Separacion de responsabilidades

`reports` debe tener casos de uso enfocados, por ejemplo:

```txt
reports/
├── application/
│   ├── create-report.service.ts
│   ├── get-report-status.service.ts
│   ├── download-report.service.ts
│   └── process-report.service.ts
├── domain/
│   ├── report.policy.ts
│   ├── report.types.ts
│   ├── report.errors.ts
│   └── report-archive-writer.ts
├── infrastructure/
│   ├── drizzle-reports.repository.ts
│   ├── bullmq-report-queue.ts
│   └── local-report-files.storage.ts
├── presentation/
│   └── reports.controller.ts
└── reports.module.ts
```

El worker puede vivir en el mismo proyecto API como proceso separado al inicio, pero no debe
ejecutar trabajos dentro del controller ni compartir estado mutable global con las peticiones.
En despliegue se recomienda un proceso/contendor independiente:

```txt
api
report-worker
web
postgres
redis
```

### 7.2 Procesamiento de documentos

El worker debe:

1. validar que la tarea sigue vigente y no fue cancelada;
2. obtener el alcance congelado de la tarea, no volver a confiar en filtros del navegador;
3. consultar documentos mediante puertos de lectura del modulo correspondiente;
4. reutilizar PDFs emitidos cuando sus invariantes permitan reutilizacion;
5. generar solamente los PDFs faltantes;
6. agregar cada archivo al ZIP mediante streaming;
7. actualizar progreso por documento procesado;
8. finalizar la tarea en una transaccion logica consistente;
9. limpiar archivos parciales si el trabajo falla;
10. registrar auditoria con actor, tenant, tipo, periodo y resultado.

No se debe cargar el conjunto completo de PDFs en un arreglo de `Buffer`. El archivo comprimido
debe escribirse en streaming hacia almacenamiento temporal o un object storage compatible.

### 7.3 Concurrencia y proteccion del servidor

La primera version debe aplicar limites configurables:

1. concurrencia global del worker: 1 o 2 trabajos;
2. maximo de un trabajo activo del mismo tipo y tenant para el mismo periodo;
3. un documento en renderizado por worker;
4. reintentos limitados, con backoff;
5. limite maximo de documentos por tarea, con error explicito si se supera;
6. timeout por documento y timeout total de tarea;
7. cancelacion cooperativa entre documentos;
8. deduplicacion por `tenantId`, tipo y periodo mientras exista una tarea activa o lista valida.

Los limites deben ser configuracion del worker, no constantes dispersas en controllers y
componentes.

## 8. Persistencia y ciclo de vida

Se recomienda una entidad `report_jobs` para el historial y el seguimiento, con al menos:

| Campo                | Regla                             |
| -------------------- | --------------------------------- |
| `id`                 | UUID, PK                          |
| `tenantId`           | FK o alcance global controlado    |
| `requestedByUserId`  | usuario que solicito              |
| `type`               | enum de actas o alimentacion      |
| `period`             | `YYYY-MM`                         |
| `status`             | estado del ciclo de vida          |
| `totalDocuments`     | nullable hasta contar             |
| `processedDocuments` | entero no negativo                |
| `failedDocuments`    | entero no negativo                |
| `storageKey`         | nullable hasta finalizar          |
| `downloadFilename`   | nombre seguro del ZIP             |
| `errorCode`          | nullable, estable para UI         |
| `expiresAt`          | fecha obligatoria al quedar listo |
| `startedAt`          | nullable                          |
| `completedAt`        | nullable                          |
| `createdAt`          | fecha de solicitud                |
| `updatedAt`          | fecha de cambio                   |

Restricciones recomendadas:

1. `processedDocuments <= totalDocuments` cuando ambos existan;
2. contadores no negativos;
3. periodo validado como `YYYY-MM`;
4. transicion de estado validada por el dominio;
5. indice por `tenantId`, `createdAt`;
6. indice por `status`, `expiresAt`;
7. indice de deduplicacion para tareas activas por tenant, tipo y periodo.

El resultado comprimido debe expirar, inicialmente, 24 horas despues de quedar listo. Un job
de limpieza debe eliminar el archivo y conservar el registro historico como `expired`.

## 9. Contrato HTTP propuesto

Los schemas de entrada y salida deben vivir en `packages/contracts`.

### 9.1 Conteo previo

```txt
GET /api/reports/availability?type=alimentacion&period=2026-08&tenantId=...
```

Reglas:

1. `tenantId` es obligatorio solamente para `super_admin` cuando el alcance lo requiere;
2. `admin` y `director` no pueden forzar otro tenant;
3. la respuesta informa conteo y si existen documentos descargables;
4. la consulta no genera PDFs.

### 9.2 Crear tarea

```txt
POST /api/reports
```

Entrada conceptual:

```json
{
  "type": "alimentacion",
  "period": "2026-08",
  "tenantId": "..."
}
```

Respuesta conceptual: `202 Accepted` con `reportId`, estado inicial y datos de seguimiento.

### 9.3 Consultar estado

```txt
GET /api/reports/{reportId}
```

La respuesta incluye estado, contadores, timestamps, mensaje seguro para el usuario y si la
descarga esta disponible. No expone rutas absolutas del servidor, errores internos ni claves de
storage.

### 9.4 Descargar

```txt
GET /api/reports/{reportId}/download
```

La API debe:

1. validar sesion, rol y alcance;
2. validar que el reporte pertenece al actor o a su tenant permitido;
3. validar estado `ready` y `expiresAt`;
4. enviar el archivo como attachment con filename seguro;
5. registrar auditoria de descarga;
6. no regenerar el reporte durante la descarga.

### 9.5 Historial y cancelacion

```txt
GET /api/reports?period=2026-08&type=alimentacion
POST /api/reports/{reportId}/cancel
```

La cancelacion solamente aplica a tareas `pending` o `processing` y debe ser cooperativa. No
debe matar un proceso del sistema operativo ni borrar datos fuente.

## 10. Puertos y dependencias entre modulos

El modulo de reportes no debe importar repositorios concretos de alimentacion o actividades.
Debe depender de contratos internos de lectura, por ejemplo:

```ts
interface AlimentacionReportSource {
  countMonthlyFormats(scope: ReportScope, period: string): Promise<number>;
  streamMonthlyFormats(scope: ReportScope, period: string): AsyncIterable<MonthlyFormatReportItem>;
}
```

Y de forma equivalente para actas.

Los adaptadores concretos pueden reutilizar servicios existentes, pero la regla de nombre y la
orquestacion del ZIP pertenecen al contexto `reportes`. Si el worker necesita datos que el
modulo actual no expone, se agrega un puerto de lectura pequeño; no se copia una segunda
implementacion de la consulta.

## 11. PDFs generados e importados de alimentacion

El reporte de formatos de alimentacion debe declarar explicitamente el origen incluido:

1. `generated`: PDF producido por el formato mensual del sistema;
2. `imported`: PDF diligenciado cargado como version historica.

La primera version debe elegir una politica visible y consistente. Recomendacion:

1. incluir por defecto la ultima version disponible por adulto mayor y periodo;
2. priorizar la version importada si existe y esta vigente para ese periodo;
3. si no existe version importada, usar la emision generada reutilizable;
4. no incluir dos PDFs del mismo adulto y mes sin indicarlo en la interfaz;
5. mostrar en el conteo cuantas versiones se incluiran.

Si negocio requiere todas las versiones, debe ser un filtro separado y no un comportamiento
implícito.

Los PDFs importados conservaran su contenido, pero el nombre dentro del reporte se normalizara
al patron descriptivo del adulto, documento y mes, agregando `IMPORTADO_V{version}` cuando sea
necesario para evitar colisiones:

```txt
FORMATO_ENTREGA_1020304050_GOMEZ_PEREZ_MARIA_ELENA_2026-08_IMPORTADO_V2.pdf
```

## 12. Auditoria, privacidad y seguridad

Cada solicitud y descarga debe registrar:

1. usuario actor;
2. rol;
3. tenant solicitado y tenant efectivo;
4. tipo de reporte;
5. periodo;
6. cantidad solicitada y procesada;
7. estado final;
8. reportId;
9. timestamps.

El sistema no debe:

1. publicar URLs permanentes;
2. permitir adivinar un `reportId` para descargar otro tenant;
3. incluir cédulas en logs de error o mensajes de UI innecesarios;
4. exponer rutas locales o comandos RAR/ZIP;
5. aceptar un `tenantId` que no pertenezca al alcance del `super_admin`;
6. usar el nombre del archivo como mecanismo de autorizacion.

## 13. Pruebas y puertas de calidad

### 13.1 Dominio y contratos

Probar:

1. validacion de periodo;
2. matriz de permisos por rol;
3. alcance de tenant;
4. transiciones validas e invalidas;
5. normalizacion de nombres con tildes, caracteres especiales y espacios;
6. preservacion de documento y periodo;
7. colisiones de nombres y sufijo de version;
8. limites de contadores.

### 13.2 API y worker

Probar:

1. respuesta `202` al crear una tarea;
2. rechazo de filtros de tenant no autorizados;
3. idempotencia de solicitudes duplicadas;
4. reanudacion o reintento controlado;
5. cancelacion cooperativa;
6. expiracion y rechazo de descarga expirada;
7. limpieza de archivos parciales ante error;
8. descarga solamente en estado `ready`;
9. que el worker procesa por streaming y respeta concurrencia;
10. auditoria de solicitud y descarga.

### 13.3 Web

Probar:

1. selector de centro visible solamente para `super_admin`;
2. centro automatico para `admin` y `director`;
3. actas y alimentacion como acciones independientes;
4. estados de carga, progreso, error, vacio y expirado;
5. invalidacion del historial tras crear, completar o cancelar;
6. boton de descarga solamente cuando corresponda;
7. nombres de archivo recibidos correctamente.

## 14. Observabilidad y operacion

El worker debe emitir logs estructurados con `reportId`, tipo, tenant, periodo, estado y
duracion. No debe registrar el contenido de PDFs ni nombres completos de adultos mayores en logs
de nivel normal.

Metricas recomendadas:

1. reportes solicitados por tipo;
2. tiempo total de generacion;
3. PDFs generados frente a reutilizados;
4. errores por tipo de documento;
5. tamano del ZIP;
6. trabajos activos y pendientes;
7. expiraciones y cancelaciones.

La limpieza de archivos expirados debe ser segura, acotada y observable. Nunca debe borrar el
almacenamiento fuente de PDFs individuales.

## 15. Decisiones que no deben tomarse durante la implementacion

1. No generar todos los PDFs dentro de una peticion HTTP.
2. No crear un controller distinto para cada rol.
3. No duplicar la logica de nombres en API, worker y web.
4. No consultar las tablas de otros modulos directamente desde la UI.
5. No mezclar actas y alimentacion en una tarea polimorfica sin tipo explicito.
6. No usar `setTimeout` en memoria como cola de trabajos.
7. No guardar ZIPs indefinidamente.
8. No borrar ni renombrar masivamente emisiones existentes.
9. No introducir RAR mediante shell en el proceso HTTP.
10. No hacer que el navegador genere o comprima los PDFs.

## 16. Checklist de implementacion incremental

- [ ] Paso 1: cerrar contratos, permisos, normalizador de nombres y fuentes de lectura, con
      pruebas unitarias sin cambiar UI ni persistencia.
- [ ] Paso 2: agregar persistencia de `report_jobs`, migracion aditiva y repositorio con
      transiciones protegidas.
- [ ] Paso 3: implementar conteo y creacion de tareas para un tipo de reporte, con autorizacion
      por tenant e idempotencia.
- [ ] Paso 4: implementar worker, cola Redis, almacenamiento temporal y ZIP por streaming.
- [ ] Paso 5: integrar primero reportes de formatos de alimentacion, respetando emisiones,
      versiones importadas y nombres descriptivos.
- [ ] Paso 6: integrar reportes de actas de sesiones grupales con sus nombres y fuentes actuales.
- [ ] Paso 7: agregar endpoints de estado, historial, descarga y cancelacion con auditoria.
- [ ] Paso 8: construir la pantalla web de Reportes con las dos secciones independientes.
- [ ] Paso 9: agregar limpieza de expirados, observabilidad y limites operativos.
- [ ] Paso 10: ejecutar pruebas completas, typecheck, build y prueba manual de descarga por
      `super_admin`, `admin` y `director`.

## 17. Criterios de aceptacion

1. `super_admin` puede seleccionar un centro y periodo.
2. `admin` y `director` solamente pueden reportar su centro.
3. Actas y formatos de alimentacion se generan en ZIPs separados.
4. Cada formato de alimentacion representa un adulto mayor y un mes.
5. El nombre del formato contiene documento, apellidos, nombres y periodo.
6. Una solicitud grande no bloquea la API ni requiere mantener abierta la pantalla.
7. El usuario puede consultar progreso e historial.
8. No se descarga un archivo pendiente, fallido o expirado.
9. El worker respeta limites de concurrencia y no carga todos los PDFs en memoria.
10. Los reportes respetan tenant, rol y auditoria.
11. Los archivos temporales se eliminan despues de su expiracion.
12. No se alteran ni renombran masivamente los PDFs historicos existentes.

## 18. Registro de implementacion

| Fecha      | Paso              | Archivos cambiados                                                                                                                                                                     | Pruebas                                                                                                                                                                                                                                                                                                       | Decisiones o desviaciones                                                                                                                                                                         |
| ---------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-11 | Spec              | `docs/specs/2026-09-11-modulo-reportes-descargas-mensuales.spec.md`                                                                                                                    | Revision documental                                                                                                                                                                                                                                                                                           | Se recomienda ZIP como formato predeterminado; RAR queda aislado detras de un adaptador si es obligatorio.                                                                                        |
| 2026-09-11 | Implementacion v1 | `packages/contracts/src/reports.ts`, `apps/api/src/modules/reports/**`, `apps/api/drizzle/0032_report_jobs.sql`, `apps/web/src/features/reports/**` y conexiones de navegacion/modulos | `pnpm --filter @cuidarte/api build`; `pnpm --filter @cuidarte/web typecheck`; `pnpm --filter @cuidarte/contracts typecheck`; `node --import tsx --test src/modules/reports/domain/report-filenames.test.ts src/modules/reports/domain/report-status.test.ts src/modules/reports/domain/report.policy.test.ts` | Se implemento cola diferida local detras de `LocalReportsQueue` porque el repo no trae `bullmq`/`ioredis`; el contrato queda aislado para reemplazar por BullMQ/Redis sin tocar controller ni UI. |
