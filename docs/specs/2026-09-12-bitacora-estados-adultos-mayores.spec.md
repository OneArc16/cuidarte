# SPEC: Bitácora de estado y fecha de defunción de adultos mayores

- Estado: proposed
- Fecha: 2026-09-12
- Módulo funcional: `adultos-mayores`
- Alcance: trazabilidad del estado, fecha de defunción y validación de registros históricos.

## 1. Objetivo

Registrar cada cambio entre los estados `Vivo` y `Fallecido`, solicitar la fecha de defunción al marcar a una persona como fallecida y conservar la posibilidad de ingresar información histórica.

Una persona fallecida no se elimina, no va a papelera y continúa visible. Se pueden registrar alimentos, atenciones o asistencias anteriores o iguales a la fecha de defunción; se rechazan registros posteriores.

## 2. Decisiones funcionales cerradas

1. Los estados vigentes son `alive` (Vivo) y `deceased` (Fallecido).
2. Cada cambio de estado genera una entrada inmutable en una bitácora especializada.
3. `fechaDefuncion` es obligatoria al crear o cambiar el estado a `Fallecido`.
4. La fecha no puede ser futura ni anterior a la fecha de nacimiento.
5. Si el estado vigente es `Vivo`, la fecha de defunción vigente es `null`.
6. La corrección `Fallecido -> Vivo` exige motivo obligatorio y conserva todos los eventos previos de la bitácora.
7. Un cambio de otros campos sin transición de estado no crea un evento de bitácora.
8. Los fallecidos históricos sin fecha no reciben una fecha inferida ni un evento histórico artificial.
9. La validación crítica se realiza en backend; el frontend solo la anticipa.
10. La modificación debe ser atómica: adulto mayor, bitácora y auditoría general se guardan en la misma transacción.

## 3. Persistencia

### 3.1 Estado vigente

Agregar a `adultos_mayores`:

```ts
deathDate: date("death_date", { mode: "string" }),
```

- El campo es nullable para permitir la migración de fallecidos históricos sin fecha conocida.
- Para operaciones nuevas, el servicio exige coherencia entre `status` y `deathDate`.
- Agregar índice `(tenant_id, status, death_date)` para consultas y validaciones.

### 3.2 Bitácora especializada

Crear `adulto_mayor_historial_estados`:

```ts
id: uuid("id").defaultRandom().primaryKey(),
adultoMayorId: uuid("adulto_mayor_id")
  .notNull()
  .references(() => adultosMayores.id, { onDelete: "restrict" }),
tenantId: uuid("tenant_id")
  .notNull()
  .references(() => tenants.id, { onDelete: "restrict" }),
previousStatus: adultoMayorStatus("previous_status"),
newStatus: adultoMayorStatus("new_status").notNull(),
previousDeathDate: date("previous_death_date", { mode: "string" }),
newDeathDate: date("new_death_date", { mode: "string" }),
reason: varchar("reason", { length: 500 }),
changedByUserId: uuid("changed_by_user_id")
  .notNull()
  .references(() => users.id, { onDelete: "restrict" }),
createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
```

Índices:

```ts
index("adulto_mayor_historial_estados_adulto_created_at_idx")
  .on(table.adultoMayorId, table.createdAt),
index("adulto_mayor_historial_estados_tenant_created_at_idx")
  .on(table.tenantId, table.createdAt),
```

Además, conservar una entrada en `audit_logs` con la acción `adultos-mayores.status-changed`. La tabla especializada será la fuente de la línea de tiempo funcional.

## 4. Contratos y API

### 4.1 Crear y editar

Extender los contratos:

```ts
deathDate: dateSchema.nullable(),
statusChangeReason: z.string().trim().min(1).max(500).nullable(),
```

| Operación | Fecha de defunción | Motivo |
| --- | --- | --- |
| Crear como Vivo | Debe ser nula | No aplica |
| Crear como Fallecido | Obligatoria | No aplica |
| Vivo -> Fallecido | Obligatoria | Opcional |
| Fallecido -> Vivo | Se limpia | Obligatorio |

El backend consulta el adulto actual y compara el estado persistido con el solicitado; nunca acepta un estado anterior enviado por el cliente.

### 4.2 Consulta de bitácora

Agregar:

```http
GET /adultos-mayores/:id/historial-estados?cursor=<opcional>&limit=20
```

Respuesta:

```ts
{
  entries: Array<{
    id: string;
    previousStatus: "alive" | "deceased" | null;
    newStatus: "alive" | "deceased";
    previousDeathDate: string | null;
    newDeathDate: string | null;
    reason: string | null;
    changedByUserId: string;
    changedByUserFullName: string;
    createdAt: string;
  }>;
  nextCursor: string | null;
}
```

Orden: `created_at DESC, id DESC`. Aplica el mismo alcance por centro y permisos de consulta de adultos mayores.

## 5. Interfaz

### 5.1 Formulario

Mantener el selector actual de estado. Cuando se elija `Fallecido`, mostrar de inmediato:

```txt
Fecha de defunción *
```

No usar modal al cambiar el selector: así no se pierden datos ya diligenciados.

Al volver de `Fallecido` a `Vivo`:

- Mostrar `Motivo de la corrección *`.
- Informar que se retirará la fecha vigente, pero el historial seguirá conservado.
- Solicitar confirmación al guardar.

Los mensajes y toasts deben estar en español y el botón de guardar se deshabilita mientras falten campos obligatorios.

### 5.2 Detalle

Agregar una sección plegable de solo lectura: `Historial de estados`.

Ejemplo:

```txt
12/09/2026, 2:30 p. m.
María Gómez cambió el estado de Vivo a Fallecido.
Fecha de defunción: 10/09/2026
```

Para correcciones a Vivo, mostrar el motivo. Para fallecidos históricos sin fecha, mostrar `Fecha de defunción pendiente de registrar`.

## 6. Regla para registros históricos

Para un registro con fecha `recordDate`:

```txt
Si el adulto está Vivo: permitir.
Si está Fallecido sin fecha de defunción: permitir.
Si está Fallecido y recordDate <= deathDate: permitir.
Si está Fallecido y recordDate > deathDate: rechazar.
```

Mensaje estándar:

```txt
No puedes registrar información posterior a la fecha de defunción del adulto mayor (dd/mm/aaaa).
```

Aplicar la regla en backend a:

- creación y edición de registros de alimentación;
- creación y edición de atenciones de enfermería;
- selección de integrantes/asistentes en actividades grupales cuya fecha sea posterior al fallecimiento.

No modificar registros ya persistidos durante la migración.

## 7. Importación masiva

Agregar la columna opcional `fecha_defuncion` al archivo de importación.

1. Si `estado` es `Fallecido`, la fecha es obligatoria y usa las mismas validaciones.
2. Si `estado` es `Vivo`, la fecha debe estar vacía.
3. Las filas de actualización que cambien estado generan bitácora y auditoría usando como actor al usuario que confirma la importación.
4. Las filas históricas existentes no generan eventos sintéticos.

## 8. Autorización

1. Mantener los permisos actuales para marcar `Fallecido`.
2. Restringir `Fallecido -> Vivo` a `admin`, `director` y `super_admin`.
3. No exponer edición ni eliminación de eventos de bitácora.
4. Las validaciones de permisos y fechas viven en backend.

## 9. Migración de datos

1. Agregar `death_date` nullable y la tabla de historial.
2. No alterar estados existentes.
3. Los adultos ya fallecidos sin fecha quedan identificables como pendientes de completar, sin bloquear su consulta ni sus registros históricos.
4. Considerar un filtro administrativo futuro para identificar esos pendientes.

## 10. Pruebas de aceptación

### Backend

- `Vivo -> Fallecido` sin fecha falla con mensaje en español.
- Fechas futuras o anteriores al nacimiento fallan.
- La transición actualiza el adulto, crea bitácora y auditoría en una sola transacción.
- `Fallecido -> Vivo` sin motivo falla; con motivo limpia la fecha vigente y preserva la bitácora.
- Una edición sin cambio de estado no genera evento.
- La bitácora no se consulta desde otro centro ni se puede editar.
- Crear o importar como fallecido requiere fecha.

### Registros históricos

- Un alimento, atención o asistencia anterior a la defunción se permite.
- Un registro en la fecha de defunción se permite.
- Un registro posterior se rechaza con el mensaje estándar.
- Un fallecido histórico sin fecha sigue permitiendo registros históricos, sin que el sistema invente datos.

### Frontend

- Al elegir Fallecido aparece y exige la fecha.
- Al volver a Vivo aparece y exige el motivo.
- La línea de tiempo muestra usuario, transición, fecha/hora, fecha de defunción y motivo cuando aplique.
- El adulto fallecido sigue visible y disponible para registros con fecha válida.

## 11. Fuera de alcance

- Enviar a papelera o eliminar a una persona por su estado de fallecimiento.
- Ocultar automáticamente fallecidos de listados, búsquedas o reportes.
- Inferir la fecha de defunción a partir de la última atención o alimentación.
- Modificar o borrar registros históricos existentes.

