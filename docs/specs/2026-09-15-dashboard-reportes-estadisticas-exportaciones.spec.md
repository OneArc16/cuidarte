# SPEC: Dashboard de reportes estadisticos y exportaciones por rango de fecha

- Estado: planned
- Fecha: 2026-09-15
- Tipo: implementation-spec
- Estrategia: implementacion incremental con aprobacion entre pasos
- Modulos impactados: `reportes`, `atenciones-enfermeria`, `atenciones-individuales`,
  `actividades-grupales`, `alimentacion`
- Paquetes impactados: `packages/contracts`, `apps/api`, `apps/web`
- Dependencias nuevas propuestas: `recharts`, `react-day-picker`, `pptxgenjs`
- Dependencias existentes reutilizadas: `@radix-ui/react-dialog`, `exceljs`, `pdf-lib`,
  `playwright`, BullMQ y Redis

## 1. Objetivo

Extender el modulo de reportes con un dashboard estadistico por rango de fecha que permita a una
persona autorizada consultar indicadores operativos y descargar el mismo resumen en PowerPoint,
PDF y Excel.

El dashboard debe responder una sola pregunta operativa: que se realizo durante un rango de
fechas seleccionado. No debe exponer datos personales de adultos mayores en la vista ejecutiva.

## 2. Resultado esperado

Con un rango como `2026-09-15` a `2026-10-20`, la persona ve:

```text
Atenciones de enfermeria  |  Atenciones medicas  |  Actividades
Auxilios de transporte    |  Refrigerios         |  Almuerzos

Grafico: atenciones por dia
Grafico: actividades por tipo
Grafico: entregas de alimentacion por dia

[ Descargar PowerPoint ] [ Descargar PDF ] [ Descargar Excel ]
```

Todos los indicadores, graficas y archivos corresponden exactamente al mismo rango y alcance de
autorizacion.

## 3. Decisiones funcionales cerradas

1. El unico filtro visible es un rango de fecha obligatorio: `from` y `to`.
2. No se agrega selector visible de sede, tipo de actividad, profesional ni estado.
3. `admin` y `director` ven exclusivamente la informacion de su `tenant`.
4. `super_admin` ve el consolidado de todos los tenants activos dentro del rango.
5. Los permisos se aplican siempre en API; la UI no decide el tenant efectivo.
6. Una atencion medica es un registro de `atenciones_individuales` cuyo creador tiene rol actual
   `medico`. Los registros historicos creados por otros roles no cuentan como atenciones medicas.
7. Una atencion de enfermeria es un registro no eliminado de `atenciones_enfermeria`.
8. Una actividad cuenta una vez por registro no eliminado de `actividades_grupales`.
9. Los refrigerios se cuentan por cada campo entregado: `refrigerio1` y `refrigerio2` con valor
   `entregado`; el total de refrigerios es la suma de ambos.
10. Almuerzos y auxilios de transporte cuentan cuando su campo tiene valor `entregado`.
11. El rango es inclusivo en ambos extremos y se interpreta usando las columnas `date` de negocio,
    no `createdAt` ni `updatedAt`.
12. Excel, PDF y PowerPoint exportan datos agregados, sin nombres, documentos ni historia clinica
    de adultos mayores.
13. Los archivos de exportacion se generan como trabajos asincronos y usan la bandeja global de
    descargas ya existente.
14. El formato PowerPoint es una presentacion ejecutiva 16:9, no una exportacion plana de tabla.

## 4. Alcance

### Incluido

- Dashboard estadistico dentro de `Reportes`.
- Selector de rango de fecha en modal de dos meses.
- Indicadores agregados, series por dia y actividades agrupadas por tipo.
- Graficas de barras, linea y dona.
- Exportaciones PPTX, PDF y XLSX del mismo conjunto de datos mostrado.
- Integracion con la bandeja de descargas concurrentes.
- Pruebas de calculo, rango, permisos, contratos y exportaciones.

### Fuera de alcance de la primera version

- Filtros adicionales visibles.
- Comparacion entre periodos.
- Selector de una sede especifica para `super_admin`.
- Drill-down hacia historias clinicas o datos identificables.
- Edicion de graficas en el navegador.
- Plantillas PowerPoint administrables desde interfaz.
- Recalculo en tiempo real por WebSocket.

## 5. Definicion de metricas

| Indicador                | Fuente                              | Fecha usada      | Regla                                                                        |
| ------------------------ | ----------------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| Atenciones de enfermeria | `atenciones_enfermeria`             | `attention_date` | Contar registros con `deleted_at IS NULL`.                                   |
| Atenciones medicas       | `atenciones_individuales` + `users` | `attention_date` | Contar registros cuyo creador tiene rol `medico`.                            |
| Actividades              | `actividades_grupales`              | `activity_date`  | Contar registros con `deleted_at IS NULL`.                                   |
| Actividades por tipo     | `actividades_grupales` + catalogo   | `activity_date`  | Agrupar por `activity_type_id`; mostrar nombre historico/catalgo disponible. |
| Auxilios entregados      | `alimentacion_registros`            | `delivery_date`  | Contar `auxilio_transporte = entregado`.                                     |
| Refrigerio 1             | `alimentacion_registros`            | `delivery_date`  | Contar `refrigerio_1 = entregado`.                                           |
| Refrigerio 2             | `alimentacion_registros`            | `delivery_date`  | Contar `refrigerio_2 = entregado`.                                           |
| Refrigerios totales      | `alimentacion_registros`            | `delivery_date`  | Refrigerio 1 + Refrigerio 2 entregados.                                      |
| Almuerzos entregados     | `alimentacion_registros`            | `delivery_date`  | Contar `almuerzo = entregado`.                                               |

El conteo de atenciones medicas por rol actual es una decision explicita de v1. Si en el futuro el
rol de un usuario cambia y se requiere conservar la clasificacion historica, se debe agregar una
instantanea de rol profesional al crear la atencion. No se hace migracion retrospectiva en este
alcance.

## 6. Selector de rango de fecha

### 6.1 Experiencia visual

La pagina muestra un solo trigger, por ejemplo:

```text
[ 15 sep. 2026 - 20 oct. 2026 ]
```

Al activarlo se abre un `Dialog` centrado con fondo atenuado, similar a la referencia funcional:

```text
┌─────────────────────────────────────────────────────────────┐
│  [<]       Septiembre 2026        Octubre 2026        [>]   │
│                                                              │
│  Lu Ma Mi Ju Vi Sa Do        Lu Ma Mi Ju Vi Sa Do           │
│                                                              │
│       15 ●──────────────────────────────● 20                │
│                                                              │
│                                  [Limpiar] [Aplicar]         │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Interaccion

1. El primer dia elegido es `from`.
2. El segundo dia elegido es `to`.
3. Los extremos se muestran como circulos oscuros; los dias intermedios con una banda suave.
4. Las flechas desplazan los dos meses como un par consecutivo.
5. `Aplicar` cierra el modal y consulta el dashboard.
6. `Limpiar` restaura el rango inicial propuesto: primer dia del mes actual hasta hoy.
7. `Escape` o clic fuera descartan cambios no aplicados.
8. En movil se muestra un mes a la vez, conservando el mismo estado y navegacion.
9. El calendario debe ser navegable con teclado y anunciar fecha inicial/final a lectores de
   pantalla.

### 6.3 Dependencias de UI

- Usar `@radix-ui/react-dialog`, ya disponible, para foco, portal y cierre accesible.
- Instalar `react-day-picker` en modo rango y dos meses. Su estilo se personaliza; no se usa su
  apariencia por defecto.
- Usar `lucide-react` para controles de navegacion.

## 7. Arquitectura de datos y API

### 7.1 Contratos

Agregar en `packages/contracts/src/reports.ts` contratos equivalentes a:

```ts
type ReportsDashboardQuery = {
  from: "YYYY-MM-DD";
  to: "YYYY-MM-DD";
};

type ReportsDashboardSummary = {
  nursingAttendances: number;
  medicalAttendances: number;
  activities: number;
  transportAllowancesDelivered: number;
  snackOneDelivered: number;
  snackTwoDelivered: number;
  snacksDelivered: number;
  lunchesDelivered: number;
};

type ReportsDashboardDailyPoint = {
  date: "YYYY-MM-DD";
  nursingAttendances: number;
  medicalAttendances: number;
  activities: number;
  transportAllowancesDelivered: number;
  snacksDelivered: number;
  lunchesDelivered: number;
};

type ReportsDashboardActivityType = {
  activityTypeId: string;
  activityTypeName: string;
  count: number;
};

type ReportsDashboardResponse = {
  range: { from: string; to: string };
  scope: { tenantId: string | null; tenantName: string | null; isConsolidated: boolean };
  summary: ReportsDashboardSummary;
  dailySeries: ReportsDashboardDailyPoint[];
  activitiesByType: ReportsDashboardActivityType[];
};
```

Reglas de validacion:

- `from` y `to` siguen formato ISO `YYYY-MM-DD`.
- `from <= to`.
- limite maximo inicial: 366 dias, para proteger consultas y documentos.
- los numeros son enteros no negativos.
- `dailySeries` incluye todos los dias del rango, incluso cuando todos sus conteos son `0`.

### 7.2 Endpoints

```http
GET  /reports/dashboard?from=2026-09-15&to=2026-10-20
POST /reports/dashboard/exports
GET  /reports/dashboard/exports/:exportId
POST /reports/dashboard/exports/:exportId/cancel
GET  /reports/dashboard/exports/:exportId/download
```

Solicitud de exportacion:

```ts
type CreateReportsDashboardExportRequest = {
  from: string;
  to: string;
  format: "pptx" | "pdf" | "xlsx";
};
```

El backend resuelve el alcance desde la sesion. No recibe `tenantId` en estos endpoints.

### 7.3 Repositorio analitico

Crear un puerto separado, por ejemplo `ReportsDashboardRepository`, con consultas agregadas. No
reutilizar repositorios de CRUD para cargar filas y contarlas en memoria.

Las consultas deben:

1. aplicar `tenant_id` cuando el actor no es `super_admin`;
2. usar `attention_date`, `activity_date` o `delivery_date` segun la metrica;
3. excluir eliminados logicamente donde corresponde;
4. agrupar en SQL por fecha y por tipo de actividad;
5. usar parametros ligados, nunca SQL interpolado desde el rango recibido;
6. completarse con dias vacios en servicio, no mediante una consulta por dia.

Los indices existentes por tenant y fecha cubren las tablas principales. Antes de liberar se debe
ejecutar `EXPLAIN ANALYZE` sobre el rango maximo con datos representativos.

## 8. Interfaz del dashboard

### 8.1 Orden de contenido

```text
Rango de fecha
Resumen: 6 tarjetas de indicadores
Atenciones por dia: linea o barras agrupadas
Actividades por tipo: barras horizontales
Alimentacion y transporte: barras agrupadas o dona
Acciones de exportacion: PowerPoint, PDF, Excel
Historial de exportaciones recientes
```

Las tarjetas se adaptan a tres columnas en escritorio, dos en tablet y una en movil. Las secciones
del dashboard no se presentan como tarjetas dentro de otras tarjetas.

### 8.2 Graficas

Instalar `recharts` para la interfaz React:

- `BarChart` para actividades por tipo.
- `LineChart` o `ComposedChart` para atenciones por dia.
- `BarChart` agrupado para refrigerios, almuerzos y transporte por dia.
- `PieChart`/dona solo si aporta lectura; no debe sustituir valores exactos visibles.

Cada grafica debe incluir titulo, leyenda, tooltip con valor exacto, alternativa textual y una
tabla de datos accesible para lectores de pantalla. No usar solamente color para diferenciar series.

## 9. Exportaciones

### 9.1 Coherencia

Cada exportacion reconstruye el dashboard en backend a partir de `from`, `to` y el alcance de la
sesion congelados al crear el trabajo. Nunca recibe datos agregados desde el navegador.

### 9.2 Excel

Usar `exceljs`, ya instalado. Libro con hojas:

1. `Resumen`: rango, alcance y ocho indicadores.
2. `Por dia`: serie diaria completa.
3. `Actividades por tipo`: conteo por tipo.
4. `Metodologia`: definicion de cada indicador y fecha usada.

### 9.3 PDF

Generar un informe ejecutivo con portada, rango, alcance, indicadores, graficas y tablas resumidas.
Usar plantilla HTML impresa con Playwright para mantener tipografia, layout y graficas consistentes.
No depender de una captura del navegador del usuario.

### 9.4 PowerPoint

Instalar `pptxgenjs` en API. Presentacion 16:9 con:

1. Portada: centro/consolidado y rango.
2. Resumen de indicadores.
3. Atenciones por dia.
4. Actividades por tipo.
5. Alimentacion y transporte.
6. Metodologia y fecha de generacion.

Las graficas se construyen como objetos editables de PowerPoint a partir de las series del backend,
no como imagenes del navegador.

### 9.5 Cola y descarga

Las exportaciones se implementan como una familia nueva de trabajos de reporte con formato
`pptx`, `pdf` o `xlsx`. Deben usar la misma infraestructura BullMQ y bandeja global, pero tener
un contrato propio de exportacion analitica; no sobrecargar los tipos actuales de ZIP mensual.

El trabajo congela:

```ts
{
  exportId: string;
  tenantScope: {
    type: "all" | "tenant";
    tenantId: string | null;
  }
  from: string;
  to: string;
  format: "pptx" | "pdf" | "xlsx";
  requestedByUserId: string;
}
```

La UI registra cada `exportId` en el provider de descargas para conservar progreso, minimizar,
cancelar y descargar de forma independiente.

## 10. Autorizacion y privacidad

| Actor         | Dashboard | Exportar | Alcance                                  |
| ------------- | --------- | -------- | ---------------------------------------- |
| `super_admin` | Si        | Si       | Consolidado de todos los tenants activos |
| `admin`       | Si        | Si       | Solo su tenant                           |
| `director`    | Si        | Si       | Solo su tenant                           |
| Otros roles   | No        | No       | Ninguno                                  |

La autorizacion se verifica en dashboard, creacion de exportacion, consulta de estado,
cancelacion y descarga. Un identificador de exportacion de otro tenant responde como no
accesible y nunca revela metadatos.

## 11. Criterios de aceptacion

### Dashboard

- El unico filtro visible es un rango de fecha.
- El selector muestra dos meses consecutivos en escritorio y coincide con la jerarquia visual
  acordada.
- Cambiar el rango actualiza todas las tarjetas y graficas con una sola consulta de dashboard.
- Un rango sin registros muestra `0` y graficas vacias explicitas, sin errores ni porcentajes
  inventados.
- La serie diaria incluye dias sin actividad.
- Actividades por tipo no incluye actividades eliminadas.
- Refrigerios totales es igual a refrigerio 1 + refrigerio 2.
- Atenciones medicas excluyen registros creados por roles distintos de `medico`.

### Exportaciones

- Los tres formatos contienen el mismo rango, alcance y valores de resumen que el dashboard.
- El Excel incluye las cuatro hojas definidas.
- El PDF incluye valores legibles y graficas con etiquetas.
- El PowerPoint se abre en PowerPoint, LibreOffice Impress y Google Slides tras importacion.
- Cancelar una exportacion no cancela las demas descargas en curso.

### Seguridad y rendimiento

- Un actor de tenant no puede consultar ni descargar informacion de otro tenant.
- El navegador no recibe filas con datos personales para calcular totales.
- El rango mayor a 366 dias se rechaza con mensaje claro.
- Las consultas usan indices de tenant y fecha y se miden con datos representativos.

## 12. Pruebas requeridas

### Contratos y backend

- Validacion de fechas, rango invertido y limite de 366 dias.
- Cada metrica con datos positivos, cero y fechas limite inclusivas.
- Exclusion de registros eliminados de enfermeria y actividades.
- Atenciones medicas creadas por `medico` cuentan; las creadas por otro rol no.
- Conteo correcto de refrigerio 1, refrigerio 2, almuerzo y transporte.
- Serie diaria completa con dias en cero.
- Aislamiento entre dos tenants y consolidado de `super_admin`.
- Exportaciones con valores identicos al endpoint de dashboard.
- Reintentos, cancelacion y descarga autorizada de exportaciones asincronas.

### Frontend

- Selector de rango: inicio, fin, reinicio, aplicar, limpiar y navegacion mensual.
- Version movil de un solo mes.
- Accesibilidad: foco, teclado, Escape, nombres accesibles y anuncio de rango.
- Renderizado de metricas en cero, carga, error y datos parciales.
- Tooltips y tabla alternativa de las graficas.
- Solicitud de cada formato registra una descarga independiente en la bandeja.

### Manual y operativa

- Verificar una exportacion PPTX en PowerPoint, LibreOffice y Google Slides.
- Comparar los valores de cada formato con el dashboard para un rango conocido.
- Medir tiempo, CPU, memoria y almacenamiento temporal para el rango maximo.
- Probar dos exportaciones simultaneas con formatos distintos.

## 13. Plan de implementacion incremental

El implementador debe completar un paso, ejecutar su puerta de salida y detenerse para revision.

### Paso 1: contratos y base analitica

- Agregar contratos de rango, respuesta de dashboard y formato de exportacion.
- Crear puerto/repositorio analitico y consultas agregadas.
- Implementar `GET /reports/dashboard` con autorizacion.

Puerta de salida: build de contracts y API; pruebas de metricas, rango y tenant.

### Paso 2: selector de rango y dashboard base

- Instalar `react-day-picker`.
- Crear selector modal de dos meses con `Dialog` de Radix.
- Integrar query de dashboard, tarjetas y estados de carga/vacio/error.

Puerta de salida: build web; pruebas de selector y renderizado de metricas.

### Paso 3: graficas accesibles

- Instalar `recharts`.
- Implementar las tres visualizaciones y tabla alternativa.
- Verificar responsive y teclado en escritorio/movil.

Puerta de salida: pruebas web de datos, cero, tooltip y accesibilidad basica.

### Paso 4: exportacion Excel

- Crear trabajo asincrono para `xlsx`.
- Generar libro con las cuatro hojas definidas.
- Integrarlo con la bandeja de descargas.

Puerta de salida: prueba de workbook, API y descarga concurrente.

### Paso 5: exportacion PDF y PowerPoint

- Crear plantilla PDF con Playwright.
- Instalar `pptxgenjs` y crear plantilla 16:9.
- Integrar ambos formatos con trabajos asincronos.

Puerta de salida: archivos validos, pruebas de contenido y descarga concurrente.

### Paso 6: validacion final

- Ejecutar builds de contracts, API y web.
- Ejecutar pruebas de los modulos impactados.
- Verificar permisos con dos tenants y consolidado super admin.
- Ejecutar `git diff --check`.
- Medir rendimiento del rango maximo y dos exportaciones concurrentes.

Puerta de salida: criterios de aceptacion completos o excepciones documentadas y aprobadas.

## 14. Archivos candidatos

```text
packages/contracts/src/reports.ts
apps/api/src/modules/reports/application/reports-dashboard.service.ts
apps/api/src/modules/reports/application/reports-dashboard-export.service.ts
apps/api/src/modules/reports/domain/reports-dashboard.repository.ts
apps/api/src/modules/reports/infrastructure/drizzle-reports-dashboard.repository.ts
apps/api/src/modules/reports/presentation/reports-dashboard.controller.ts
apps/api/src/modules/reports/reports.module.ts
apps/web/src/features/reports/api/reports-api.ts
apps/web/src/features/reports/components/reports-date-range-dialog.tsx
apps/web/src/features/reports/components/reports-dashboard.tsx
apps/web/src/features/reports/components/reports-dashboard-charts.tsx
apps/web/src/features/reports/model/reports-dashboard-queries.ts
apps/web/src/features/reports/pages/reports-page.tsx
apps/web/src/features/reports/reports.css
```

La lista es orientativa. La implementacion debe reutilizar patrones existentes, preservar los
reportes ZIP actuales y evitar refactors no necesarios.

## 15. Riesgos y decisiones operativas

1. El rol actual del creador no es una instantanea historica; este es el criterio acordado para
   atenciones medicas de v1.
2. Los graficos del dashboard son informativos; las exportaciones se generan desde datos del
   servidor para mantener consistencia y privacidad.
3. PDF y PPTX pueden consumir recursos considerables; se generan como trabajos asincronos y se
   miden antes de subir la concurrencia.
4. El limite inicial de 366 dias evita consultas y documentos excesivos. Cualquier ampliacion debe
   basarse en mediciones.
5. Una vista consolidada de `super_admin` puede revelar totales entre sedes; esta autorizada por
   la decision funcional, pero no incluye detalles personales.
