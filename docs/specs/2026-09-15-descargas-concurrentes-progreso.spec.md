# SPEC: Bandeja de descargas concurrentes y progreso de reportes

- Estado: planned
- Fecha: 2026-09-15
- Tipo: implementation-spec
- Spec base: `docs/specs/2026-09-11-modulo-reportes-descargas-mensuales.spec.md`
- Modulos impactados: `reportes`, `actividades-grupales`, `alimentacion`
- Paquetes impactados: `packages/contracts`, `apps/api`, `apps/web`
- Infraestructura impactada: Redis, BullMQ y almacenamiento temporal de reportes

## 1. Objetivo

Permitir que una persona genere y descargue varios reportes al mismo tiempo, especialmente
cuando un usuario autorizado trabaja con varias sedes. Cada reporte debe tener su propio estado,
progreso, cancelacion y resultado de descarga.

La interfaz debe mostrar un modal global de progreso que pueda minimizarse sin detener los
trabajos. Al minimizarlo, debe quedar un toast persistente que permita volver a abrir la bandeja
de descargas mientras la persona continua trabajando en cualquier pantalla de la aplicacion.

Este spec complementa el modulo de reportes existente. No cambia los tipos de reporte, las reglas
de tenant, los permisos ni el contrato de generacion mensual definidos en el spec base.

## 2. Resultado esperado

La bandeja puede mostrar simultaneamente trabajos como:

```text
Actas de sesiones - Sede Norte - 149/400 - Procesando
Formatos de alimentos - Sede Centro - 80/210 - Procesando
Actas de sesiones - Sede Sur - Preparando descarga
```

Cada trabajo se identifica por `reportId`. No se debe usar un unico estado global de descarga.

## 3. Decisiones funcionales cerradas

1. Se soportan multiples trabajos activos en una misma sesion del navegador.
2. Cada trabajo tiene progreso, estado, error y cancelacion independientes.
3. Minimizar oculta el modal, pero nunca cancela ni pausa la generacion.
4. El toast de trabajos minimizados permite reabrir la bandeja.
5. Cancelar un trabajo afecta solamente al `reportId` seleccionado.
6. Un usuario puede continuar navegando y usando otros modulos mientras los trabajos siguen
   activos.
7. Un `super_admin` puede crear trabajos para varias sedes autorizadas; cada trabajo conserva su
   `tenantId` y periodo.
8. Un `admin` o `director` solamente puede crear, consultar, cancelar y descargar trabajos de su
   sede autorizada.
9. El backend sigue siendo la fuente de verdad para permisos, tenant, estado y progreso.
10. La primera version permitira varios trabajos en cola y comenzara con concurrencia de worker
    `2`, configurable por entorno.
11. No se agrega una cola separada por sede: BullMQ compartira la cola de reportes y cada trabajo
    conservara su alcance congelado.
12. La generacion del ZIP y la transferencia del ZIP al navegador son estados distintos.

## 4. Alcance

### Incluido

- Provider global de trabajos de reportes.
- Modal accesible basado en `@radix-ui/react-dialog`.
- Lista de trabajos activos y recientes.
- Toast persistente para la bandeja minimizada.
- Polling concurrente controlado.
- Cancelacion individual de trabajos.
- Recuperacion de trabajos `pending` y `processing` despues de recargar la pagina.
- Descarga automatica cuando cada reporte llega a `ready`.
- Concurrencia configurable del worker BullMQ.
- Pruebas unitarias y de integracion del flujo concurrente.

### Fuera de alcance de la primera version

- Reanudar una transferencia HTTP interrumpida desde el ultimo byte.
- Sincronizar el estado de la bandeja entre varias pestañas mediante `BroadcastChannel`.
- Historial permanente de descargas del navegador.
- Priorizacion manual de trabajos.
- Limite de concurrencia configurable desde la interfaz.
- Generar un ZIP que mezcle tipos de reporte o sedes no autorizadas.

## 5. Estados del trabajo

El estado persistido del reporte conserva los estados existentes:

```text
pending -> processing -> ready
pending -> cancelled
processing -> cancelled
processing -> failed
processing -> empty
ready -> expired
```

La interfaz agrega estados visuales derivados, sin crear nuevos estados persistidos:

| Estado visual         | Fuente                                        | Progreso                                                 |
| --------------------- | --------------------------------------------- | -------------------------------------------------------- |
| Pendiente             | `pending`                                     | Indeterminado o `0/total`                                |
| Procesando documentos | `processing`                                  | `processedDocuments/totalDocuments`                      |
| Preparando descarga   | `ready`, antes de iniciar `fetch`             | Indeterminado                                            |
| Descargando ZIP       | `fetch` activo                                | Porcentaje si hay `Content-Length`; si no, indeterminado |
| Completado            | descarga finalizada                           | `100%`                                                   |
| Cancelado             | `cancelled` o AbortController                 | Detenido                                                 |
| Error                 | `failed`, `expired` o error de red definitivo | Detenido                                                 |

La interfaz no debe mostrar un porcentaje inventado cuando el backend aun no conoce el total.

## 6. Arquitectura frontend

### 6.1 Provider global

Crear un `ReportDownloadsProvider` montado dentro de `AppProviders`, junto al
`QueryClientProvider` y el `Toaster`.

El estado principal sera conceptualmente:

```ts
type ReportDownloadTask = {
  reportId: string;
  status: ReportDownloadUiStatus;
  report: ReportJob | null;
  isMinimized: boolean;
  isDownloading: boolean;
  downloadedBytes: number;
  totalBytes: number | null;
  errorMessage: string | null;
};

type ReportDownloadsState = Map<string, ReportDownloadTask>;
```

El `Map` debe estar indexado por `reportId`. El provider expone operaciones equivalentes a:

```ts
startReport(reportId: string): void;
openReportDownloads(): void;
minimizeReportDownloads(): void;
cancelReport(reportId: string): Promise<void>;
retryReport(reportId: string): Promise<void>;
removeFinishedReport(reportId: string): void;
```

La implementacion puede usar React Query para invalidacion y cache, pero el ciclo de vida de la
descarga debe pertenecer al provider, no a `ReportsPage` ni a una fila individual de tabla.

### 6.2 Integracion de los botones existentes

Unificar estos flujos:

1. `ReportsPage`: accion de descargar un reporte `ready`.
2. `ReportExportButton`: creacion, polling y descarga automatica.

Ambos deben delegar al provider. No debe quedar un polling privado por componente ni una segunda
implementacion de descarga.

Al crear un reporte nuevo, la respuesta de `createReport` se registra inmediatamente en el
provider. Al solicitar un reporte ya listo, se registra directamente en estado de descarga.

### 6.3 Modal

Crear un componente global como `ReportDownloadsDialog` usando `@radix-ui/react-dialog`:

- `Dialog.Root` controlado por el provider.
- `Dialog.Portal` para renderizar sobre la aplicacion.
- `Dialog.Title` y `Dialog.Description` para accesibilidad.
- Boton de esquina con icono `Minimize2` que oculta el modal sin cancelar trabajos.
- Cada fila muestra su propio boton `X` o `CircleX` para cancelar.
- El clic fuera y `Escape` minimizan el modal cuando hay trabajos activos.
- El modal no debe desmontar el provider ni abortar trabajos al cerrarse.
- El foco debe regresar al control que abrio la bandeja.

El modal debe presentar una lista vertical responsiva. En movil, cada trabajo se presenta como una
fila apilada; en escritorio puede usar columnas de tipo, sede, periodo, progreso, estado y accion.

### 6.4 Toast minimizado

Usar el `Toaster` existente de Sonner con un id estable para la bandeja, por ejemplo
`report-downloads-queue`.

Mientras exista al menos un trabajo activo:

- el toast no expira automaticamente;
- muestra cantidad de trabajos activos;
- muestra un resumen de progreso de hasta tres trabajos;
- ofrece la accion `Ver progreso`;
- permite abrir el modal;
- no debe crear un toast nuevo en cada actualizacion del polling.

Cuando no existan trabajos activos, el toast persistente debe desaparecer. Los resultados finales
pueden mostrarse como toasts breves de exito o error.

## 7. Descarga y cancelacion

### 7.1 Generacion

Para un reporte `pending` o `processing`, el provider consulta el estado con un polling
compartido. El intervalo recomendado es de 3 segundos, con backoff temporal ante errores de red.

El polling debe:

1. agrupar los `reportId` activos en un ciclo controlado;
2. detenerse para un reporte terminal;
3. eliminar timers al desmontar el provider;
4. no lanzar una consulta nueva si la anterior sigue pendiente;
5. recuperar trabajos activos consultando `listReports` al autenticarse y al montar la aplicacion.

### 7.2 Cancelacion de generacion

Si el reporte esta `pending` o `processing`, `cancelReport(reportId)` llama al endpoint existente:

```http
POST /reports/:reportId/cancel
```

La respuesta debe invalidar el reporte y actualizar solamente la tarea cancelada. Si el worker ya
esta procesando un documento, la cancelacion se hace cooperativamente en los puntos de control
existentes.

### 7.3 Cancelacion de transferencia

Cuando el reporte esta `ready` y el navegador ya esta leyendo el ZIP, el provider usa un
`AbortController` propio para ese `reportId`.

Abortar la transferencia:

- no cambia un reporte `ready` a `cancelled` en la base de datos;
- libera la descarga del navegador;
- conserva el ZIP para que pueda intentarse de nuevo mientras no expire;
- muestra `Descarga cancelada` para ese trabajo.

### 7.4 Progreso de bytes

La funcion `downloadReport` debe aceptar una senal de abort y, si la respuesta tiene
`Content-Length`, leer `response.body` por chunks para informar:

```ts
onProgress?: (downloadedBytes: number, totalBytes: number | null) => void;
signal?: AbortSignal;
```

Si no existe `Content-Length`, se muestra progreso indeterminado. No se debe forzar un porcentaje
basado en el numero de documentos durante la transferencia del ZIP.

## 8. Arquitectura backend y concurrencia

### 8.1 BullMQ

La cola existente `reports:generation` debe conservar `jobId = reportId`. Esto permite que varios
reportes de distintas sedes existan simultaneamente sin colisiones.

Configurar inicialmente:

```env
REPORT_QUEUE_CONCURRENCY=2
```

El valor debe mantenerse limitado por configuracion validada, por ejemplo entre `1` y `4`, hasta
medir CPU, memoria, PostgreSQL y almacenamiento temporal en VPS.

La concurrencia aplica al worker del proceso. Si se ejecutan varios contenedores worker, la carga
total sera la suma de sus concurrencias y debe documentarse en el despliegue.

### 8.2 Aislamiento por sede

Cada `report_jobs` debe conservar el `tenantId` y los filtros congelados al crear el trabajo. El
worker no debe recibir filtros nuevos desde el navegador ni consultar el tenant actual de la
sesion.

Cada endpoint debe volver a aplicar `assertCanAccessReportJob` sobre el `reportId`, incluyendo:

- estado;
- cancelacion;
- descarga;
- listado;
- recuperacion de datos mostrados en la interfaz.

La concurrencia no modifica las reglas de autorizacion.

### 8.3 Recuperacion

Al recargar el navegador, el frontend reconstruye la bandeja con trabajos visibles que esten en
`pending` o `processing`. Si un trabajo ya no esta en la respuesta filtrada por tenant, no se debe
mostrar ni intentar consultar por identificador desde el cliente.

El backend mantiene la recuperacion de trabajos abandonados y la limpieza de `.part` descritas en
el spec base. Un reinicio del API no debe dejar un trabajo activo solamente en memoria.

## 9. Contratos y API

No se requiere un endpoint nuevo para la primera version. Se reutilizan:

```text
POST /reports
GET  /reports
GET  /reports/:reportId
POST /reports/:reportId/cancel
GET  /reports/:reportId/download
```

Se debe verificar que `ReportJob` incluya toda la informacion necesaria para la bandeja:

- `id`;
- `type`;
- `tenantId` o una representacion autorizada del centro;
- `tenantName`;
- `period`;
- `status`;
- `processedDocuments`;
- `totalDocuments`;
- `downloadAvailable`;
- `downloadFilename`;
- `message`.

No exponer rutas de almacenamiento, nombres temporales ni informacion de otros tenants.

## 10. Seguridad y limites

1. La API valida permisos por cada trabajo, no por la ultima sede seleccionada en React.
2. El cliente no puede cambiar `tenantId` de una tarea existente.
3. La descarga exige autenticacion y autorizacion del reporte.
4. Se debe considerar un limite de trabajos activos por actor para evitar abuso, inicialmente
   `10` trabajos activos salvo que el producto defina otro valor.
5. El limite debe responder con un error de negocio claro y no con un error generico de Redis.
6. El worker debe respetar el TTL de archivos y limpiar temporales de cada reporte fallido o
   cancelado.
7. Las auditorias deben registrar creacion, cancelacion y descarga por separado.

## 11. Criterios de aceptacion

### Concurrencia funcional

- Se pueden crear dos reportes para sedes distintas desde una misma sesion autorizada.
- Ambos aparecen en la bandeja con progreso independiente.
- La finalizacion de un reporte no cierra ni elimina el otro.
- Se puede cancelar el reporte A sin cancelar el reporte B.
- Los trabajos de usuarios distintos no comparten estado en frontend.
- BullMQ procesa hasta la concurrencia configurada y encola el excedente.

### Modal y toast

- Al iniciar un trabajo se abre el modal global.
- El modal lista todos los trabajos activos.
- Minimizar conserva los trabajos en ejecucion.
- El toast persistente muestra la cantidad de trabajos activos.
- `Ver progreso` reabre el modal.
- Cambiar de ruta no pierde la bandeja.
- `Escape`, clic fuera y minimizar no cancelan trabajos.
- El foco de teclado y los nombres accesibles funcionan correctamente.

### Estados y descarga

- El progreso de documentos se calcula con los valores reales del backend.
- No se muestra porcentaje falso cuando el total es desconocido.
- Un reporte `ready` inicia la descarga y muestra el estado correspondiente.
- Cancelar la transferencia no cancela el reporte listo en la base de datos.
- Un error de red no elimina inmediatamente un reporte listo y permite reintentar.
- Un reporte `failed`, `cancelled`, `empty` o `expired` termina su tarea con un mensaje visible.
- Al completar, el ZIP se guarda con el filename recibido por `Content-Disposition`.

### Seguridad y recuperacion

- Un usuario no puede consultar, cancelar o descargar un reporte de otra sede.
- Recargar la pagina reconstruye trabajos activos visibles.
- Reiniciar API y worker permite recuperar trabajos abandonados según el comportamiento existente.
- Dos solicitudes duplicadas del mismo tipo, sede y periodo respetan la regla de deduplicacion del
  modulo.

## 12. Pruebas requeridas

### Frontend

- Provider con dos tareas activas y estados independientes.
- Apertura automatica del modal al registrar una tarea.
- Minimizar y reabrir desde Sonner.
- Cancelacion individual de una tarea.
- Cambio de ruta conservando el provider.
- Recuperacion de tareas activas al montar la aplicacion.
- Descarga con `AbortController`.
- Progreso con y sin `Content-Length`.
- Estados terminales y reintento seguro.
- Accesibilidad basica del Dialog: titulo, descripcion, foco, `Escape` y botones etiquetados.

### Backend

- Dos trabajos de tenants distintos pueden coexistir en BullMQ.
- La concurrencia respeta `REPORT_QUEUE_CONCURRENCY`.
- Un trabajo cancelado no continua agregando documentos después de un punto de control.
- Un actor no puede consultar ni descargar el trabajo de otro tenant.
- La recuperacion después de reinicio no duplica trabajos por `reportId`.
- La limpieza de temporales funciona independientemente para varios reportes.

## 13. Plan de implementacion incremental

El implementador debe completar un paso, ejecutar su puerta de salida y detenerse para revision.

### Paso 1: contrato visual y provider

- Agregar `@radix-ui/react-dialog` al web.
- Crear tipos de estado y `ReportDownloadsProvider`.
- Montarlo en `AppProviders`.
- Crear el Dialog controlado con una lista estatica de tareas de prueba.

Puerta de salida: web typecheck, pruebas del provider y prueba manual de minimizar/reabrir.

### Paso 2: unificar creacion, polling y cancelacion

- Migrar `ReportsPage` y `ReportExportButton` al provider.
- Eliminar polling local duplicado.
- Conectar cancelacion por `reportId`.
- Implementar recuperacion de trabajos activos.

Puerta de salida: pruebas frontend de dos trabajos concurrentes y cancelacion individual.

### Paso 3: descarga y progreso de transferencia

- Agregar `AbortSignal` a `downloadReport`.
- Implementar lectura por chunks cuando exista `Content-Length`.
- Conectar estados `preparing` y `downloading`.

Puerta de salida: pruebas de progreso con stream, abort y descarga completa.

### Paso 4: concurrencia del worker

- Validar `REPORT_QUEUE_CONCURRENCY` con valor inicial `2`.
- Confirmar que el job id siga siendo `reportId`.
- Ejecutar prueba de dos reportes de sedes distintas.
- Revisar consumo de CPU, memoria y espacio temporal.

Puerta de salida: build API, pruebas de cola y prueba operativa en entorno controlado.

### Paso 5: validacion final

- Ejecutar builds de contracts, API y web.
- Ejecutar pruebas del modulo de reportes.
- Ejecutar `git diff --check`.
- Verificar permisos con al menos dos tenants.
- Documentar el valor de concurrencia usado en despliegue.

Puerta de salida: todos los criterios de aceptacion del spec cumplen o tienen una excepcion
documentada y aprobada.

## 14. Archivos candidatos

```text
apps/web/src/app/providers.tsx
apps/web/src/features/reports/api/reports-api.ts
apps/web/src/features/reports/components/report-download-dialog.tsx
apps/web/src/features/reports/components/report-download-toast.tsx
apps/web/src/features/reports/model/report-downloads-context.tsx
apps/web/src/features/reports/model/reports-queries.ts
apps/web/src/features/reports/pages/reports-page.tsx
apps/web/src/features/reports/components/report-export-button.tsx
apps/web/src/features/reports/reports.css
apps/web/src/test/...
apps/api/src/config/env.ts
apps/api/src/modules/reports/application/report-jobs.queue.ts
apps/api/src/modules/reports/application/reports.service.ts
apps/api/src/modules/reports/presentation/reports.controller.ts
apps/api/src/modules/reports/...
apps/web/package.json
pnpm-lock.yaml
```

La lista es orientativa. El implementador debe reutilizar los patrones existentes y evitar crear
archivos duplicados si una abstraccion equivalente ya existe.

## 15. Riesgos y decisiones operativas

1. Aumentar la concurrencia puede saturar CPU y memoria por la generacion simultanea de PDFs.
2. El almacenamiento temporal debe tener espacio suficiente para varios ZIP parciales.
3. Si existen varios procesos worker, la concurrencia total debe calcularse globalmente.
4. Una descarga desde varias pestañas puede repetir transferencia aunque el reporte sea el mismo;
   eso queda fuera de alcance de la primera version.
5. El modal no debe ser la fuente de verdad del reporte: el estado persistido y el endpoint de
   reportes tienen prioridad después de una recarga o una perdida de red.

## 16. Definicion de terminado

La funcionalidad se considera lista cuando una sesion autorizada puede generar reportes para al
menos dos sedes, ver ambos progresos en una bandeja global, minimizarla, continuar navegando,
reabrirla desde el toast, cancelar solamente uno y descargar correctamente los que finalicen,
sin romper el aislamiento por tenant ni dejar trabajos inconsistentes después de reiniciar el
API o el worker.
