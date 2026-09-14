# SPEC: Catálogo configurable de actividades para sesiones grupales

- Estado: proposed
- Fecha: 2026-09-13
- Módulos: `actividades-grupales`, `ajustes`, `home`, `reports`
- Roles administradores: `admin`, `super_admin`
- Alcance: catálogo por centro, desactivación segura, migración de sesiones existentes e indicadores dinámicos en Inicio

## 1. Objetivo

Permitir administrar las actividades disponibles al crear sesiones grupales, sin perder la trazabilidad
de sesiones ya diligenciadas. Un administrador podrá crear y desactivar actividades para su centro; un
superadministrador podrá hacerlo para cualquier centro.

El catálogo reemplaza la lista técnica fija de tipos de actividad. No se debe implementar como un
switch que solo oculte valores del enum actual, ya que debe admitir actividades nuevas.

## 2. Decisiones funcionales cerradas

1. Las actividades se configuran **por centro**. Un `admin` nunca puede modificar las de otro centro.
2. `super_admin` elige el centro sobre el que opera; puede administrar todos los centros.
3. Una actividad tiene nombre visible, estado activo/inactivo y trazabilidad de creación y cambios.
4. No hay eliminación física desde la interfaz ni desde la API funcional.
5. Una actividad inactiva no se ofrece al crear una sesión nueva.
6. Las sesiones existentes mantienen siempre su actividad, aunque esta se inactive posteriormente.
7. Una actividad inactiva con al menos una sesión registrada sigue apareciendo en Inicio con su contador
   y una etiqueta `Inactiva`.
8. Una actividad inactiva sin sesiones registradas no aparece en Inicio.
9. Las actividades activas aparecen en Inicio, incluso cuando su contador sea cero.
10. Al seleccionar un contador de Inicio, se abre Sesiones grupales filtrado por esa actividad.
11. El contador general de Sesiones grupales continúa incluyendo todas las sesiones activas del centro,
    incluidas las que pertenecen a actividades inactivas.
12. La actividad es independiente del organizador responsable; las reglas de visibilidad por equipo ya
    existentes continúan evaluándose por `organizer`.

## 3. Permisos

| Acción | `admin` | `super_admin` | Otros roles |
| --- | --- | --- | --- |
| Ver catálogo del propio centro | Sí | Sí | No |
| Ver catálogo de cualquier centro | No | Sí, seleccionando centro | No |
| Crear actividad | Sí, propio centro | Sí | No |
| Activar o desactivar actividad | Sí, propio centro | Sí | No |
| Registrar sesiones con actividad activa | Según permisos actuales de sesiones | Según permisos actuales | Según permisos actuales |
| Consultar sesiones históricas de actividad inactiva | Según permisos actuales y equipo | Sí | Según permisos actuales y equipo |

La autorización se debe aplicar en el backend, no solo ocultando botones en la web.

## 4. Modelo de datos

Crear la tabla `actividad_grupal_tipos`:

```ts
id: uuid().defaultRandom().primaryKey(),
tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
name: varchar("name", { length: 120 }).notNull(),
normalizedName: varchar("normalized_name", { length: 120 }).notNull(),
isActive: boolean("is_active").notNull().default(true),
createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "restrict" }),
createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
deactivatedByUserId: uuid("deactivated_by_user_id").references(() => users.id, { onDelete: "restrict" }),
```

Índices y restricciones:

```ts
uniqueIndex("actividad_grupal_tipos_tenant_normalized_name_unique")
  .on(table.tenantId, table.normalizedName),
index("actividad_grupal_tipos_tenant_active_idx").on(table.tenantId, table.isActive),
```

Agregar a `actividades_grupales`:

```ts
activityTypeId: uuid("activity_type_id")
  .references(() => actividadGrupalTipos.id, { onDelete: "restrict" }),
```

Tras completar la migración de datos y verificarla, `activity_type_id` debe quedar como `NOT NULL`.
La columna enum actual `activity_type` se conserva inicialmente como respaldo de migración y se retira
solo en una migración posterior, una vez estabilizada la versión nueva.

## 5. Migración de producción y compatibilidad histórica

La migración debe ser aditiva y reversible en sus primeras etapas:

1. Crear la tabla de catálogo y la columna nullable `activity_type_id`.
2. Para cada centro, crear los tipos base actuales con los nombres funcionales existentes:
   Centro de Vida, Actividad de Campo, Sesiones Psicosociales, Salud Preventiva, Nutrición,
   Fisioterapia, Encuentro Intergeneracional, Actividades de Manualidad y Actividades de Recreación.
3. Asociar cada sesión existente con el tipo del mismo centro que corresponda a su valor legacy
   `activity_type`.
4. Ejecutar validaciones antes de continuar:
   - cero sesiones activas o en papelera sin `activity_type_id`;
   - mismo total de sesiones antes y después;
   - mismos totales agrupados por centro y tipo legacy;
   - no existen tipos duplicados por centro tras normalizar nombre.
5. Hacer obligatoria la relación `activity_type_id` y desplegar la aplicación que ya consume el catálogo.
6. Mantener la columna enum legacy durante un periodo de observación; retirarla solo mediante una
   migración posterior planificada.

La migración no altera actas, participantes, diligenciamientos, soportes, fechas ni organizadores.
La desactivación posterior tampoco modifica ninguna sesión histórica.

## 6. API y capa de dominio

Crear un módulo de dominio dedicado, por ejemplo `actividad-grupal-tipos`, con repositorio, servicio,
política y controlador. No mezclar su lógica de administración con el servicio de sesiones.

Endpoints propuestos:

```http
GET    /actividad-grupal-tipos?tenantId=<uuid>&includeInactive=true
POST   /actividad-grupal-tipos
PATCH  /actividad-grupal-tipos/:id
PATCH  /actividad-grupal-tipos/:id/status
```

Contratos principales:

```ts
type ActividadGrupalTipo = {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deactivatedAt: string | null;
};

type CreateActividadGrupalTipoRequest = { tenantId?: string | null; name: string };
type UpdateActividadGrupalTipoStatusRequest = { isActive: boolean };
```

Reglas de validación:

- Nombre obligatorio, con trim, máximo 120 caracteres y comparación normalizada sin distinguir mayúsculas,
  acentos ni espacios repetidos.
- No permitir duplicados por centro, aun si solo cambia la capitalización.
- El formulario de creación de sesión recibe `activityTypeId`; el backend verifica que el tipo pertenezca
  al centro de la sesión y esté activo.
- En una edición ordinaria se permite conservar el tipo inactivo ya asociado a la sesión, pero no cambiar
  la sesión a otro tipo inactivo.
- Las respuestas de sesión incluyen el identificador, nombre y estado del tipo para que listados, PDF y
  reportes no dependan del enum legacy.

Auditar cada creación y cambio de estado:

```txt
actividades-grupales.tipo.created
actividades-grupales.tipo.activated
actividades-grupales.tipo.deactivated
```

La auditoría contiene `tenantId`, tipo, estado anterior/nuevo y actor.

## 7. Interfaz web

Crear el módulo **Ajustes** accesible desde Inicio para `admin` y `super_admin`.

- Para `admin`, el centro se resuelve desde su sesión y no es editable.
- Para `super_admin`, el encabezado incluye selector de centro antes de cargar el catálogo.
- La vista muestra nombre, estado, fecha de actualización y una acción clara para activar/desactivar.
- El alta usa un modal o formulario compacto con un único campo de nombre.
- Desactivar requiere confirmación explícita e informa que no afectará sesiones históricas.
- Los controles deben ser navegables con teclado, tener etiquetas accesibles y comunicar estado pendiente
  y errores mediante regiones apropiadas.

En Sesiones grupales:

- El formulario de creación solo muestra tipos activos del centro.
- El formulario de edición muestra el tipo actual aunque esté inactivo, marcado como tal.
- Barra de filtros, listado, papelera, PDF y reportes usan el nombre resuelto del catálogo.

## 8. Inicio e indicadores dinámicos

Cambiar el contrato fijo de indicadores por una colección dinámica de actividades:

```ts
type HomeDashboardActivityIndicator = {
  activityTypeId: string;
  label: string;
  isActive: boolean;
  total: number;
};
```

El backend debe obtener los indicadores mediante una única consulta agrupada por tipo para el alcance del
usuario. La consulta incluye sesiones no eliminadas lógicamente y debe respetar el centro del actor.

Reglas de inclusión:

```txt
activo                         => mostrar, total puede ser 0
inactivo + total mayor que 0   => mostrar con etiqueta Inactiva
inactivo + total igual a 0     => no mostrar
```

Las tarjetas dirigen a Sesiones grupales con el filtro `activityTypeId`. El dashboard actual solo está
habilitado para roles de supervisión; su política se mantiene salvo que se apruebe una ampliación
separada de sus roles.

## 9. PDF, reportes y datos históricos

- El acta PDF muestra el nombre de la actividad configurada al momento de consultarse.
- Los reportes ZIP conservan el nombre de actividad en sus nombres de archivo y contenido.
- La actividad inactiva se puede exportar y consultar; su estado no invalida documentos ya registrados.
- La desactivación no debe romper filtros guardados: si un filtro apunta a una actividad inactiva, debe
  devolver sus sesiones históricas.

## 10. Pruebas de aceptación

1. Un admin crea una actividad y solo aparece en su centro.
2. El mismo admin no puede consultar ni modificar el catálogo de otro centro, incluso manipulando la URL.
3. Un superadmin puede seleccionar otro centro y gestionar su catálogo.
4. No se permite crear una actividad con nombre duplicado normalizado.
5. Una actividad activa aparece en el formulario de nuevas sesiones y en Inicio con contador cero.
6. Al desactivar una actividad, desaparece del formulario de creación.
7. Una sesión antigua asociada a una actividad desactivada conserva su tipo y se puede abrir, diligenciar,
   exportar y consultar según sus permisos.
8. Una actividad inactiva con sesiones aparece en Inicio con su total y etiqueta `Inactiva`.
9. Una actividad inactiva sin sesiones no aparece en Inicio.
10. El contador general de Sesiones grupales coincide con la suma de sesiones visibles del alcance.
11. El acceso a una tarjeta del Inicio abre el listado filtrado por el tipo correcto.
12. La migración deja cero sesiones sin relación a tipo y preserva todos los conteos históricos.
13. Las reglas actuales de visibilidad por equipo siguen funcionando para sesiones asociadas a tipos nuevos.

## 11. Entregables

- Migración SQL y actualización de esquema Drizzle.
- Contratos compartidos y pruebas de contratos.
- Módulo API de catálogo con autorización y auditoría.
- Refactor de sesiones, filtros, PDF y reportes para usar `activityTypeId`.
- Módulo web de Ajustes y consultas/mutaciones de React Query.
- Indicadores dinámicos de Inicio.
- Pruebas unitarias, de servicio, controlador, migración y flujo web.
