# SPEC: Consecutivos automáticos de actas por organizador

- Estado: implemented
- Fecha: 2026-09-12
- Módulo funcional: `actividades-grupales`
- Alcance: generación automática, corrección individual auditada y renumeración masiva de actas históricas
- Roles: creación y edición según permisos actuales; correcciones individuales y masivas solo `super_admin`

## 1. Objetivo

Reemplazar el número de acta digitado manualmente por un consecutivo automático que dependa del
centro y del organizador de la sesión grupal.

Ejemplos para un mismo centro:

```txt
Enfermería      ENFER-001, ENFER-002
Nutricionista   NUTRI-001, NUTRI-002
Psicóloga       PSICO-001
```

La solución debe corregir de forma segura las actas existentes, preservar referencias históricas y
evitar duplicados ante creación concurrente.

## 2. Decisiones funcionales cerradas

1. El código visible se genera automáticamente al crear el acta; no es editable en el formulario normal.
2. Cada serie es independiente por `(centro, organizador)`.
3. El consecutivo comienza en `001`, se rellena a tres dígitos y puede crecer sin truncarse (`ENFER-1000`).
4. El código se asigna una sola vez y no cambia al editar otros datos de la sesión.
5. Cambiar el organizador de un acta ya creada es una corrección sensible, no una edición ordinaria.
6. Solo `super_admin` puede corregir organizador/código de una acta existente o ejecutar una renumeración masiva.
7. La corrección conserva el número anterior y registra auditoría.
8. La renumeración histórica incluye actas activas y en papelera: una acta eliminada lógicamente conserva
   su posición histórica y no libera un número.
9. La renumeración masiva se ordena de forma determinista por fecha, hora de inicio, hora de fin,
   fecha de creación e ID.
10. Los PDFs y reportes nuevos muestran el código vigente; archivos ya descargados no se reescriben.

## 3. Series por organizador

| Organizador técnico | Prefijo | Ejemplo |
| --- | --- | --- |
| `director` | `DIREC` | `DIREC-001` |
| `medico` | `MED` | `MED-001` |
| `enfermeria` | `ENFER` | `ENFER-001` |
| `psicologa` | `PSICO` | `PSICO-001` |
| `trabajadora_social` | `TSOC` | `TSOC-001` |
| `nutricionista` | `NUTRI` | `NUTRI-001` |
| `fisioterapeuta` | `FISIO` | `FISIO-001` |
| `recreacionista` | `RECRE` | `RECRE-001` |

Los prefijos son constantes de dominio, no etiquetas traducibles ni nombres de empleados. El guion
debe ser uniforme: `<PREFIJO>-<SECUENCIA>`.

> Nota de implementación: confirmar con negocio la abreviatura `MED` antes de codificarla. Si se
> requiere `MEDIC`, cambiar la tabla y las pruebas, pero no permitir prefijos configurables por UI
> en esta primera versión.

## 4. Persistencia y concurrencia

Actualmente existe un contador global por centro (`actividad_grupal_acta_counters`) y `acta_number`
es único por centro. El modelo debe evolucionar a series por organizador.

### 4.1 Actas

Agregar a `actividades_grupales`:

```ts
actaOrganizer: actividadGrupalOrganizer("acta_organizer").notNull(),
actaSequence: integer("acta_sequence").notNull(),
previousActaNumber: varchar("previous_acta_number", { length: 40 }),
actaNumberCorrectedAt: timestamp("acta_number_corrected_at", { withTimezone: true }),
actaNumberCorrectedByUserId: uuid("acta_number_corrected_by_user_id"),
```

- `actaOrganizer` es el organizador que originó el código y debe coincidir con `organizer`; ambos
  solo cambian juntos mediante la corrección auditada.
- `actaSequence` es el entero fuente de verdad; `actaNumber` es su representación visible.
- `previousActaNumber` conserva el último código reemplazado. La auditoría conserva toda la cadena.

Mantener el índice único existente `(tenant_id, acta_number)` y agregar:

```ts
uniqueIndex("actividades_grupales_tenant_acta_series_unique")
  .on(table.tenantId, table.actaOrganizer, table.actaSequence),
index("actividades_grupales_tenant_acta_series_idx")
  .on(table.tenantId, table.actaOrganizer, table.actaSequence),
```

### 4.2 Contadores

Crear `actividad_grupal_acta_organizer_counters`:

```ts
tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
organizer: actividadGrupalOrganizer("organizer").notNull(),
lastValue: integer("last_value").notNull().default(0),
updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
primaryKey({ columns: [table.tenantId, table.organizer] }),
```

La asignación debe ocurrir dentro de una transacción y usar un `INSERT ... ON CONFLICT ... UPDATE`
atómico que incremente `lastValue` y devuelva el nuevo valor. Nunca calcular `MAX(acta_sequence) + 1`
en código de aplicación.

El contador global existente no se elimina en la primera migración. Debe quedar sin uso y retirarse
solo después de validar la renumeración en producción.

## 5. Creación y edición ordinaria

### 5.1 Crear

1. El frontend no envía `actaNumber`.
2. El backend determina `tenantId` y valida el organizador.
3. El repositorio reserva el siguiente consecutivo para `(tenantId, organizer)` en la misma transacción
   que inserta el acta.
4. Se persisten `actaOrganizer = organizer`, `actaSequence` y `actaNumber` compuesto.
5. La respuesta devuelve el código asignado.

El formulario muestra una ayuda no editable: `El número se asignará automáticamente al guardar`.

### 5.2 Editar

- El número de acta es de solo lectura.
- El organizador queda de solo lectura en la edición normal si el acta ya existe.
- Los demás campos mantienen el flujo de edición actual.
- Un acta restaurada desde papelera conserva exactamente su código y no consume un nuevo consecutivo.

## 6. Corrección individual

### 6.1 Caso de uso

Ruta propuesta:

```http
POST /actividades-grupales/:id/correct-acta-number
```

Body:

```json
{
  "organizer": "nutricionista",
  "reason": "El acta fue registrada bajo Enfermería por error"
}
```

Reglas:

1. Solo `super_admin`.
2. Motivo obligatorio, entre 1 y 500 caracteres.
3. Reserva el siguiente consecutivo de la nueva serie; no rellena huecos ni renumera otras actas.
4. Actualiza en una transacción `organizer`, `actaOrganizer`, `actaSequence`, `actaNumber`,
   `previousActaNumber`, campos de corrección y auditoría.
5. Si el organizador no cambia, la operación debe responder `409` para evitar correcciones vacías.
6. Si el acta está en papelera, puede corregirse solo desde una superficie `super_admin` y conserva su estado.

Auditoría:

```txt
action: actividades-grupales.acta-number-corrected
metadata:
  activityId
  previousActaNumber
  newActaNumber
  previousOrganizer
  newOrganizer
  reason
```

La interfaz debe mostrar el código anterior como referencia, pedir confirmación explícita y advertir
que documentos futuros usarán el código nuevo.

## 7. Renumeración masiva de actas existentes

La migración histórica no debe ejecutarse automáticamente al desplegar. Debe ser una operación
administrativa de dos fases, exclusivamente para `super_admin`.

### 7.0 Validación previa de horarios

La fecha y el horario de la actividad son la fuente de verdad para el orden histórico. Antes de
generar una vista previa, los horarios deben estar corregidos y expresados en formato de 24 horas.

Ejemplo: una actividad de `2:00 p. m. a 4:00 p. m.` debe registrarse como `14:00 - 16:00`, no como
`02:00 - 04:00`. El sistema no debe inferir ni transformar automáticamente horas AM/PM ambiguas.

El `super_admin` debe validar los registros históricos antes de iniciar la corrección. La herramienta
de preview mostrará una advertencia para horarios entre `00:00` y `05:59`, pero no bloqueará casos
que sean legítimamente nocturnos ni cambiará datos por sí sola.

### 7.1 Vista previa

```http
POST /actividades-grupales/acta-number-corrections/preview
```

Body:

```json
{
  "tenantId": "uuid",
  "scope": "all"
}
```

La respuesta incluye un `operationToken` de corta duración y filas con:

```ts
{
  activityId: string;
  activityDate: string;
  startTime: string;
  organizer: ActividadGrupalOrganizer;
  currentActaNumber: string;
  proposedActaNumber: string;
  sequence: number;
  isDeleted: boolean;
}
```

Algoritmo por centro y organizador:

```txt
ORDER BY activity_date ASC,
         start_time ASC,
         end_time ASC,
         created_at ASC,
         id ASC
```

La vista previa debe incluir cuántas actas cambian, cuántas ya están correctas y la fecha de corte.
No escribe datos.

### 7.2 Aplicar

```http
POST /actividades-grupales/acta-number-corrections/apply
```

Body:

```json
{
  "operationToken": "token generado por preview",
  "reason": "Normalización inicial de consecutivos por organizador"
}
```

Condiciones de seguridad:

1. Token de un solo uso, asociado al `super_admin`, centro y snapshot de actas.
2. Si una acta incluida cambió desde la vista previa, responder `409`; se debe generar una nueva vista previa.
3. Tomar un bloqueo transaccional por centro para impedir simultáneamente nuevas asignaciones y otra
   renumeración del mismo centro.
4. Ejecutar todas las actualizaciones, contadores y auditorías dentro de una sola transacción.
5. Como `acta_number` es único por centro, aplicar primero valores temporales únicos
   (`TMP-<operation>-<id>`) y luego los códigos definitivos; evita colisiones durante intercambios.
6. Actualizar los contadores de cada organizador al mayor consecutivo aplicado.
7. Guardar por cada fila modificada `previousActaNumber` y metadatos completos de auditoría.
8. Si una sola fila falla, revertir toda la operación.

Auditoría de lote:

```txt
action: actividades-grupales.acta-number-bulk-corrected
metadata:
  operationId
  tenantId
  reason
  changedCount
  unchangedCount
  ordering: [activityDate, startTime, createdAt, id]
```

Además, registrar una auditoría individual por acta para facilitar trazabilidad.

## 8. Contratos y permisos

1. Eliminar `actaNumber` de los requests de creación y edición ordinaria.
2. Exponer `actaNumber`, `actaOrganizer`, `actaSequence` y `previousActaNumber` en detalle para roles
   autorizados; no mostrar el valor anterior en listados normales.
3. Agregar schemas y tipos para preview, aplicación masiva y corrección individual.
4. Crear policies explícitas:

```ts
canCorrectActividadGrupalActaNumber(user) => user.role === "super_admin"
canBulkCorrectActividadGrupalActaNumbers(user) => user.role === "super_admin"
```

Ocultar las acciones a los demás roles, pero asegurar `403` desde API ante acceso directo.

## 9. UI propuesta

### Formulario de creación

- Reemplazar el campo editable `Número de acta` por una nota de solo lectura.
- Tras guardar, mostrar el código asignado en confirmación, tabla y detalle.

### Detalle/edición

- Mostrar el código como dato de solo lectura.
- Solo `super_admin` ve `Corregir consecutivo`.
- El modal de corrección muestra código actual, organizador actual, nueva serie, motivo y advertencia.

### Herramienta de normalización

- Ruta administrativa separada y solo para `super_admin`.
- Selección de centro obligatoria.
- Vista previa paginada o descargable antes de habilitar `Aplicar corrección`.
- Confirmación que exige escribir el nombre del centro o `CORREGIR`.
- Resultado visible: total corregido, sin cambios, errores y enlace al registro de auditoría.

## 10. Compatibilidad documental

- Búsquedas deben encontrar el código vigente y, para roles autorizados, el anterior cuando exista.
- PDFs de acta, exportaciones y ZIP nuevos deben usar `actaNumber` vigente.
- Nombres de archivos ya almacenados no se renombran ni se eliminan.
- Reportes generados previamente permanecen como evidencia del momento de emisión.

## 11. Plan de despliegue

1. Respaldar la base de datos y contabilizar actas por centro/organizador.
2. Aplicar migración aditiva: columnas nuevas, tabla de contadores e índices.
3. Desplegar generación automática para nuevas actas, inicialmente sin eliminar el contador global antiguo.
4. Validar y corregir los horarios históricos en formato de 24 horas antes del preview.
5. Ejecutar preview en producción por cada centro y validar con negocio la tabla de cambios.
6. Aplicar la corrección masiva por centro con ventana administrativa y monitoreo.
7. Validar unicidad, contadores y PDFs nuevos.
8. Retirar el contador global antiguo en una migración posterior, nunca en el mismo despliegue.

## 12. Pruebas de aceptación

1. Crear dos actas de Enfermería en un centro genera `ENFER-001` y `ENFER-002`.
2. Crear una de Nutrición en el mismo centro genera `NUTRI-001`.
3. El mismo organizador en otro centro inicia en `001`.
4. Dos creaciones concurrentes no generan el mismo código.
5. El formulario no permite enviar un número manual.
6. La edición ordinaria no cambia código ni organizador.
7. Una corrección individual solo es posible para `super_admin`, conserva el código anterior y registra auditoría.
8. Un código corregido usa el próximo valor de su nueva serie y no rellena huecos.
9. Preview masivo ordena por fecha, hora de inicio, hora de fin, creación e ID de forma determinista.
10. Una actividad de `2:00 p. m. a 4:00 p. m.` se registra como `14:00 - 16:00` y queda después de
    una actividad del mismo día de `08:00 - 12:00`.
11. Aplicar una preview obsoleta responde `409` y no modifica ninguna acta.
12. La corrección masiva evita colisiones durante intercambios de números.
13. Las actas en papelera participan en la serie pero no aparecen en listados operativos.
14. Restaurar un acta conserva su código.
15. PDFs y ZIP nuevos usan el código vigente.
16. Usuarios no `super_admin` reciben `403` en endpoints de corrección.

## 13. Fuera de alcance

- Prefijos configurables desde interfaz.
- Reescritura o eliminación de PDFs/ZIP ya emitidos.
- Reutilización de consecutivos de actas enviadas a papelera.
- Renumeración automática después de cada edición histórica.
