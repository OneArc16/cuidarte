# SPEC: Creación de registros de alimentación para múltiples días

- Estado: proposed
- Fecha: 2026-09-25
- Módulo: `registro-alimentacion`
- Alcance: creación de registros por selección de días no consecutivos
- Depende de: permisos por persona y flujo actual de creación de alimentación

## 1. Objetivo

Permitir que una persona autorizada seleccione uno o varios días independientes en el formulario de creación de Registro de alimentación. Al guardar, el sistema debe crear un registro individual por cada combinación de adulto mayor seleccionado y día seleccionado.

Ejemplo: 4 adultos mayores seleccionados y 3 días producen 12 registros de alimentación.

La selección debe ser múltiple, no un rango. El usuario podrá seleccionar días consecutivos o no consecutivos.

## 2. Contexto técnico actual

1. El formulario de creación usa `AlimentacionBatchForm` y actualmente recibe un único `deliveryDate`.
2. La API crea registros mediante `POST /api/registro-alimentacion`.
3. La tabla `alimentacion_registros` guarda una fila por adulto mayor y fecha.
4. Existe una restricción única por `tenantId + adultoMayorId + deliveryDate`.
5. El buscador de adultos mayores consulta la disponibilidad para una sola fecha.
6. Los permisos se asignan por persona desde el catálogo de permisos de empleados.
7. La edición de un registro existente trabaja con una sola fecha y no forma parte de este cambio.

Archivos principales relacionados:

- `packages/contracts/src/auth.ts`
- `packages/contracts/src/alimentacion.ts`
- `apps/api/src/modules/empleados/domain/empleado.policy.ts`
- `apps/api/src/modules/alimentacion/domain/alimentacion.policy.ts`
- `apps/api/src/modules/alimentacion/application/alimentacion.service.ts`
- `apps/api/src/modules/alimentacion/infrastructure/drizzle-alimentacion.repository.ts`
- `apps/web/src/features/alimentacion/components/alimentacion-batch-form.tsx`
- `apps/web/src/features/alimentacion/schemas/alimentacion-batch-form.schema.ts`

## 3. Decisiones de producto

### 3.1 Permiso por persona

Agregar el permiso:

```text
alimentacion.create_multiple_dates
```

El permiso debe aparecer en la sección **Permisos por persona**, dentro del grupo **Alimentación**.

Etiqueta recomendada:

```text
Registrar alimentación para múltiples días
```

Descripción recomendada:

```text
Permite crear registros de alimentación para varios días mediante una selección múltiple.
```

Inicialmente el permiso se asignará por defecto a personas con rol `admin` y `super_admin`. Los demás roles no lo recibirán.

La asignación debe respetar el modelo actual:

1. agregar el permiso a `userPermissionValues`;
2. agregarlo al `userPermissionCatalog`;
3. incluirlo en los permisos predeterminados de `admin` y `super_admin`;
4. crear una migración o proceso de backfill para las personas existentes con esos roles;
5. no concederlo automáticamente a una persona de otro rol aunque tenga `alimentacion.create`.

La autorización real estará en el backend. El frontend solo usará el permiso para mostrar el modo de selección correspondiente.

### 3.2 Modos del selector

El formulario tendrá dos comportamientos:

| Permiso de la persona | Selector | Resultado |
| --- | --- | --- |
| Tiene `alimentacion.create_multiple_dates` | Múltiple | Puede marcar y desmarcar varios días |
| No tiene el permiso | Simple | Solo puede mantener un día seleccionado |

No se implementará selección por rango. Seleccionar el día 3 y el día 7 no debe seleccionar automáticamente los días intermedios.

### 3.3 Aplicación de los estados

En esta primera versión, los estados diligenciados para un adulto mayor se copiarán a todos los días seleccionados.

Por ejemplo, si un adulto tiene `almuerzo = entregado` y se seleccionan tres días, se crearán tres registros con ese mismo estado.

Si en el futuro los estados deben variar por día, se necesitará un flujo distinto con una matriz adulto mayor/día. No se incluye en esta implementación.

### 3.4 Creación atómica

La operación será todo o nada:

- si todas las combinaciones son válidas, se crean todas;
- si existe un conflicto o una fecha no permitida, no se crea ninguna;
- el backend devuelve el detalle de los adultos y fechas conflictivas.

No se crearán registros parciales silenciosamente.

## 4. Experiencia de usuario

### 4.1 Componente de fecha

Crear un componente reutilizable, por ejemplo `AlimentacionDatePicker`, con dos modos:

```ts
type DateSelectionMode = "single" | "multiple";
```

Recomendación: utilizar una librería de calendario accesible y mantenida, como `react-day-picker`, en lugar de construir manualmente toda la navegación y accesibilidad del calendario.

El componente debe:

1. mostrar navegación por mes;
2. permitir seleccionar días con teclado y mouse;
3. mostrar visualmente los días seleccionados;
4. permitir deseleccionar un día sin afectar los demás;
5. exponer las fechas en formato ISO `YYYY-MM-DD`;
6. permitir limpiar la selección;
7. mostrar correctamente estados de foco, selección, error y deshabilitado;
8. no depender de fechas locales del navegador para construir el valor ISO.

### 4.2 Modo simple

Para una persona sin el permiso nuevo:

- se selecciona un único día;
- al elegir otro día se reemplaza el anterior;
- el resumen dice `1 día seleccionado`;
- el resto del formulario conserva el comportamiento actual.

### 4.3 Modo múltiple

Para una persona con el permiso nuevo:

- cada clic alterna la selección del día;
- se muestran las fechas seleccionadas como chips o resumen compacto;
- se muestra el total de días y entregas proyectadas;
- se debe poder eliminar un día específico;
- el botón Guardar debe indicar el total de registros a crear.

Ejemplo de resumen:

```text
8 adultos mayores · 3 días · 24 entregas
```

### 4.4 Cambio de fechas con adultos seleccionados

Si el usuario cambia la selección después de agregar adultos mayores:

1. no se deben borrar adultos silenciosamente;
2. se deben volver a consultar sus conflictos para las nuevas fechas;
3. se debe actualizar el resumen de entregas;
4. si hay fechas incompatibles, se debe mostrar una advertencia antes de guardar.

Si se eliminan todas las fechas, se debe impedir la búsqueda y el guardado hasta seleccionar al menos una.

### 4.5 Adulto precargado

El flujo de creación desde el detalle de un adulto mayor debe seguir funcionando.

En modo múltiple, la existencia de un registro en la primera fecha no debe redirigir automáticamente a edición. Debe tratarse como un conflicto de la selección actual y mostrarse al usuario para que pueda cambiar días o retirar el adulto.

## 5. Contrato de creación

### 5.1 Petición

Cambiar el contrato de creación para usar un arreglo de fechas:

```ts
type CreateAlimentacionBatchRequest = {
  tenantId: string | null;
  deliveryDates: string[];
  organizer: AlimentacionOrganizer;
  registros: AlimentacionBatchRecord[];
};
```

Ejemplo:

```json
{
  "tenantId": "tenant-id",
  "deliveryDates": [
    "2026-09-03",
    "2026-09-07",
    "2026-09-12"
  ],
  "organizer": "director",
  "registros": [
    {
      "adultoMayorId": "adulto-id",
      "refrigerio1": "entregado",
      "almuerzo": "entregado",
      "refrigerio2": "entregado",
      "auxilioTransporte": "entregado"
    }
  ]
}
```

El cambio aplica al contrato de creación. Los contratos de edición, detalle y consulta individual seguirán usando una sola fecha.

### 5.2 Reglas del schema

`deliveryDates` debe:

1. tener mínimo una fecha;
2. aceptar máximo 31 fechas;
3. validar el formato `YYYY-MM-DD`;
4. rechazar fechas repetidas;
5. normalizar y ordenar las fechas antes de procesarlas;
6. mantener las fechas como strings ISO, sin convertirlas a `Date` para evitar desfases horarios.

El schema también debe proteger el tamaño máximo de la operación generada. Se recomienda configurar un máximo de 10.000 combinaciones adulto mayor/día y devolver un error claro si se supera.

### 5.3 Respuesta

La respuesta existente puede conservar `createdCount`, pero debe representar el total de filas creadas:

```json
{
  "createdCount": 24,
  "dateCount": 3,
  "adultoMayorCount": 8
}
```

Agregar `dateCount` y `adultoMayorCount` es opcional si rompe consumidores existentes; si se agregan, deben ser campos compatibles y validados por el contrato compartido.

## 6. Disponibilidad de adultos mayores

El endpoint de opciones actualmente consulta disponibilidad para una sola fecha. Debe adaptarse para recibir varias fechas, por ejemplo mediante parámetros repetidos:

```text
deliveryDate=2026-09-03&deliveryDate=2026-09-07&deliveryDate=2026-09-12
```

La respuesta debe incluir las fechas que ya tienen registro para cada adulto:

```ts
type AlimentacionAdultoOption = {
  // campos actuales...
  registeredDeliveryDates?: string[];
};
```

La interfaz puede mostrar:

```text
Ya registrado para 2 de 3 días
```

El adulto no debe desaparecer sin explicación. Si existe un conflicto parcial, debe quedar claro qué fechas están ocupadas.

El backend volverá a validar los conflictos al guardar, porque la consulta de opciones no elimina condiciones de carrera.

## 7. Reglas del backend

En `AlimentacionService.createBatch`:

1. validar `canManageAlimentacion`;
2. si `deliveryDates.length > 1`, validar `canCreateMultipleDateAlimentacion`;
3. resolver el tenant mediante el scope actual;
4. cargar y validar todos los adultos seleccionados;
5. validar el estado y la fecha de cada combinación adulto/día;
6. consultar registros existentes para todas las fechas;
7. construir la lista expandida adulto mayor × fecha;
8. rechazar el lote completo si existe al menos un conflicto;
9. persistir todas las filas dentro de una transacción;
10. registrar una auditoría con fechas, cantidad de adultos y cantidad total de filas.

La política debe exponer una función específica, por ejemplo:

```ts
canCreateMultipleDateAlimentacion(user)
```

No se debe implementar la regla únicamente como `user.role === "admin"`, porque el sistema administra permisos por persona.

## 8. Persistencia y repositorio

No se requiere una tabla nueva ni guardar un arreglo de fechas. La tabla actual ya representa correctamente una fila por día.

El repositorio debe recibir una colección expandida o un comando con fechas y realizar un único `insert` masivo dentro de la transacción.

La restricción existente debe continuar protegiendo:

```text
tenantId + adultoMayorId + deliveryDate
```

Si ocurre una colisión por una condición de carrera, se debe transformar en `409 Conflict` con un mensaje accionable.

## 9. Conflictos y mensajes

El error de conflicto debe incluir, cuando sea posible:

```ts
type AlimentacionDateConflict = {
  adultoMayorId: string;
  deliveryDate: string;
};
```

Mensaje recomendado para el usuario:

```text
No se guardaron los registros porque 3 combinaciones adulto mayor/día ya tienen alimentación registrada. Revisa las fechas seleccionadas.
```

No se deben mostrar identificadores técnicos como único detalle. La interfaz debe resolver el nombre del adulto a partir de los datos disponibles.

## 10. Seguridad y alcance por sede

1. Un usuario de sede solo puede crear para su `tenantId`.
2. El `super_admin` puede seleccionar una sede según el comportamiento actual.
3. El frontend no puede conceder el modo múltiple por su cuenta.
4. El backend debe rechazar múltiples fechas si la persona no tiene el permiso.
5. Los adultos mayores deben resolverse dentro de la sede autorizada.
6. Los IDs recibidos deben validarse nuevamente al crear.

## 11. Pruebas requeridas

### 11.1 Contratos

- acepta una fecha;
- acepta varias fechas;
- rechaza arreglo vacío;
- rechaza fechas repetidas;
- rechaza formato inválido;
- rechaza más de 31 fechas;
- rechaza una operación por encima del máximo de combinaciones.

### 11.2 Permisos

- `admin` con el permiso puede crear múltiples días;
- `super_admin` con el permiso puede crear múltiples días;
- persona sin el permiso puede crear un día;
- persona sin el permiso recibe `403` al enviar múltiples días;
- retirar el permiso de un administrador desactiva el modo múltiple;
- el permiso aparece en el catálogo de permisos por persona.

### 11.3 Servicio y repositorio

- crea una fila por adulto y día;
- devuelve el total expandido correcto;
- rechaza adultos fuera del tenant;
- rechaza adultos con estado o fecha no permitida;
- rechaza cualquier conflicto sin crear filas parciales;
- registra una auditoría con el resumen de la operación;
- transforma colisiones de la restricción única en conflicto controlado.

### 11.4 Frontend

- usuario sin permiso ve selección simple;
- usuario con permiso ve selección múltiple;
- seleccionar un día no selecciona los días intermedios;
- seleccionar nuevamente un día lo desmarca;
- se puede limpiar la selección;
- el resumen calcula adultos × días;
- se muestran conflictos por fecha;
- el formulario no permite guardar sin fecha o sin adultos;
- el flujo de adulto precargado continúa funcionando.

## 12. Fuera de alcance

1. Editar varios registros en una sola operación.
2. Selección por rango.
3. Diferentes estados de alimentación para cada día dentro del mismo envío.
4. Crear registros automáticamente para todos los días del mes.
5. Modificar el comportamiento de importación masiva de PDFs.
6. Cambiar la estructura de la tabla `alimentacion_registros`.

## 13. Criterios de aceptación

- Una persona con `alimentacion.create_multiple_dates` puede seleccionar días independientes.
- Una persona sin ese permiso solo puede seleccionar un día.
- El permiso se administra desde Permisos por persona.
- El backend impide que una persona sin permiso cree múltiples fechas.
- Al guardar se crea una fila por adulto mayor y por día.
- Los registros creados mantienen la unicidad actual por adulto y fecha.
- Si una combinación ya existe, el lote no crea registros parciales y muestra el conflicto.
- La edición de un registro individual continúa funcionando con una sola fecha.
- El proyecto conserva typecheck, pruebas y build exitosos.

## 14. Orden recomendado de implementación

1. Agregar permiso, catálogo y backfill para personas `admin` y `super_admin`.
2. Actualizar contratos compartidos y tipos.
3. Implementar la política y la validación de autorización en backend.
4. Adaptar repositorio y servicio para expandir adulto mayor × fechas.
5. Adaptar la consulta de adultos y sus conflictos por fecha.
6. Crear el componente de calendario simple/múltiple.
7. Adaptar el formulario de creación y sus mensajes.
8. Cubrir pruebas backend y frontend.
9. Ejecutar typecheck, tests y build.
10. Validar manualmente los escenarios de un día, varios días, conflicto y permisos retirados.
