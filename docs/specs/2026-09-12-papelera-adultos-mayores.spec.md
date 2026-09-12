# SPEC: Papelera de Adultos Mayores

- Estado: implemented
- Fecha: 2026-09-12
- Modulo funcional: `adultos-mayores`
- Superficie administrativa: `papelera-adultos-mayores`
- Alcance: envio a papelera, consulta exclusiva de papelera, restauracion y auditoria
- Roles autorizados: `super_admin`

## 1. Objetivo

Permitir que un `super_admin` retire un adulto mayor de la operacion mediante la accion
`Enviar a papelera`, conservando tecnicamente sus relaciones historicas para proteger la
integridad de la base de datos.

Mientras el registro este en papelera debe comportarse como eliminado para la operacion
normal: no debe aparecer en listados, buscadores, exportaciones, reportes ni formularios de
nuevas atenciones.

La papelera y todas sus acciones deben ser visibles y accesibles exclusivamente para
`super_admin`.

## 2. Decisiones funcionales cerradas

1. La accion visible se llamara `Enviar a papelera`.
2. Solo `super_admin` puede ver y ejecutar la accion.
3. Solo `super_admin` puede ver la papelera.
4. El envio a papelera es una baja logica, no un `DELETE` fisico.
5. Las atenciones, documentos y demas datos relacionados no se eliminan automaticamente.
6. El adulto en papelera no aparece en ningun listado o busqueda normal.
7. El adulto en papelera no aparece en reportes, indicadores ni exportaciones nuevas.
8. No se pueden crear nuevas atenciones, registros de alimentacion o participaciones mientras
   el adulto este en papelera.
9. El historial existente se conserva en la base de datos y puede consultarse unicamente desde
   una superficie administrativa autorizada o despues de restaurar el registro.
10. La restauracion tambien es exclusiva para `super_admin`.
11. El documento de identidad sigue reservado mientras el registro este en papelera, evitando
    crear dos historiales para la misma persona.
12. La eliminacion fisica permanente y la anonimizacion quedan fuera de este alcance.

## 3. Modelo de estados

```txt
Activo
  |
  | Enviar a papelera
  v
En papelera
  |
  | Restaurar
  v
Activo
```

Un registro se considera activo cuando `deletedAt IS NULL`. Se considera en papelera cuando
`deletedAt IS NOT NULL`.

## 4. Matriz de permisos

| Rol | Ver accion | Enviar a papelera | Ver papelera | Restaurar |
| --- | --- | --- | --- | --- |
| `super_admin` | Si | Si | Si | Si |
| `admin` | No | No | No | No |
| `director` | No | No | No | No |
| `auditor` | No | No | No | No |
| Otros roles | No | No | No | No |

La autorizacion debe aplicarse en backend mediante policy y guard. Ocultar botones o rutas en
React no reemplaza la validacion de la API.

## 5. Persistencia

Agregar a `adultos_mayores`:

```ts
deletedAt: timestamp("deleted_at", { withTimezone: true }),
deletedByUserId: uuid("deleted_by_user_id")
  .references(() => users.id, { onDelete: "restrict" }),
deletionReason: varchar("deletion_reason", { length: 500 }),
```

Agregar indices para las consultas operativas y de papelera:

```ts
index("adultos_mayores_deleted_at_idx").on(table.deletedAt),
index("adultos_mayores_tenant_deleted_at_idx").on(table.tenantId, table.deletedAt),
```

La migracion debe ser aditiva y conservar todos los registros existentes como activos.

El indice unico actual por centro, tipo y numero de documento debe mantenerse sin cambios.
Por tanto, un documento enviado a papelera no puede registrarse nuevamente; se debe restaurar
o corregir el registro original.

## 6. Contratos

Agregar un contrato para el motivo:

```ts
const sendAdultoMayorToTrashRequestSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
```

La respuesta de las mutaciones debe seguir el formato existente de operaciones exitosas:

```json
{ "success": true }
```

El listado de papelera debe incluir como minimo:

```ts
{
  id: string;
  tenantId: string;
  tenantName: string;
  documentType: string;
  documentNumber: string;
  names: string;
  surnames: string;
  deletedAt: string;
  deletedByUserId: string;
  deletionReason: string;
}
```

## 7. API propuesta

### 7.1 Enviar a papelera

```http
DELETE /adultos-mayores/:id
```

Body obligatorio:

```json
{
  "reason": "Registro duplicado"
}
```

Respuestas esperadas:

- `200`: registro enviado a papelera;
- `400`: motivo ausente o invalido;
- `401`: sesion requerida;
- `403`: actor diferente de `super_admin`;
- `404`: adulto inexistente o ya oculto para la operacion actual;
- `409`: cambio concurrente de estado.

### 7.2 Listar papelera

```http
GET /adultos-mayores/trash
```

Solo `super_admin`. Debe permitir como minimo busqueda por nombre o documento y filtro por
centro. La consulta nunca debe mezclar registros activos.

### 7.3 Restaurar

```http
POST /adultos-mayores/:id/restore
```

Solo `super_admin`. Si el registro no esta en papelera debe responder `404` o `409` de forma
determinista y documentada.

## 8. Reglas de servicio y repositorio

### 8.1 Envio a papelera

El caso de uso debe:

1. validar que el actor sea `super_admin`;
2. buscar el registro activo por ID;
3. marcar `deletedAt`, `deletedByUserId` y `deletionReason` dentro de una transaccion;
4. actualizar `updatedAt`;
5. crear una entrada de auditoria en la misma transaccion;
6. devolver exito solamente si la actualizacion afecto exactamente un registro.

### 8.2 Consultas operativas

Todas las consultas normales de adultos mayores deben incluir el filtro equivalente a:

```ts
isNull(adultosMayores.deletedAt)
```

Esto incluye:

- listado y busqueda;
- detalle por ID;
- busqueda por documento;
- exportaciones Excel y PDF;
- opciones de adultos para atenciones;
- opciones de adultos para alimentacion y actividades;
- validacion y confirmacion de importaciones.

Un adulto en papelera consultado por un endpoint operativo debe responder como no encontrado.
No se debe filtrar unicamente en frontend.

### 8.3 Restauracion

La restauracion debe:

1. validar que el actor sea `super_admin`;
2. buscar un registro en papelera;
3. limpiar los campos de borrado;
4. actualizar `updatedAt`;
5. registrar la accion en auditoria;
6. invalidar las consultas relacionadas en frontend.

## 9. Atenciones y datos relacionados

Si el adulto mayor tiene atenciones existentes:

- no se borran las atenciones;
- no se modifica su autoria ni su contenido;
- se conserva la integridad referencial;
- no se permiten nuevas atenciones mientras el adulto este en papelera;
- la historia no debe aparecer en buscadores o reportes normales;
- despues de restaurar, sus atenciones vuelven a estar asociadas al registro operativo.

Los servicios de atenciones, enfermeria, alimentacion y actividades deben validar el estado del
adulto en backend antes de crear un registro nuevo.

## 10. Buscadores, reportes y archivos

Un adulto en papelera debe quedar excluido de:

1. buscadores globales y especificos;
2. listados de todos los modulos;
3. reportes historicos generados nuevamente;
4. exportaciones Excel y PDF;
5. indicadores y conteos del inicio;
6. selectores de formularios.

Las consultas sobre tablas relacionadas deben unir contra adultos activos, por ejemplo:

```sql
JOIN adultos_mayores am
  ON am.id = atenciones.adulto_mayor_id
 AND am.deleted_at IS NULL
```

Los archivos previamente generados que contengan datos del adulto no se consideran revocados
automaticamente por esta baja logica. La implementacion debe revisar sus rutas de descarga y
aplicar una de estas politicas antes de cerrar el alcance:

1. revocar el acceso al archivo cuando su fuente este en papelera; o
2. incluirlo en una politica de retencion y limpieza de archivos generados.

## 11. Auditoria

Registrar como minimo:

### Envio a papelera

```txt
action: adultos-mayores.deleted
targetTenantId: tenant del adulto
summary: Adulto mayor enviado a papelera
metadata:
  adultoMayorId
  documentType
  documentNumberMasked
  reason
```

### Restauracion

```txt
action: adultos-mayores.restored
targetTenantId: tenant del adulto
summary: Adulto mayor restaurado desde papelera
metadata:
  adultoMayorId
```

La auditoria debe persistirse en la misma transaccion que cambia el estado. El motivo es
obligatorio y los datos personales deben minimizarse en `metadata`.

## 12. Experiencia de usuario

### 12.1 Tabla principal

Solo para `super_admin`, cada fila puede mostrar la accion `Enviar a papelera` junto a editar.

El modal debe mostrar:

- nombre completo;
- documento;
- centro;
- advertencia de que dejara de aparecer en el sistema operativo;
- advertencia de que el historial se conservara tecnicamente;
- motivo obligatorio;
- confirmacion explicita.

El boton debe deshabilitarse durante la solicitud y evitar doble envio.

### 12.2 Papelera

La ruta y el acceso de navegacion solo se renderizan para `super_admin`. La pantalla debe
mostrar:

- centro;
- documento;
- nombre completo;
- fecha de envio;
- usuario que ejecuto la accion;
- motivo;
- accion `Restaurar`.

Si un usuario no autorizado intenta abrir la ruta directamente, la aplicacion debe redirigirlo
y la API debe responder `403`.

## 13. Pruebas de aceptacion

1. Un `admin` no ve el boton `Enviar a papelera`.
2. Un `admin` no ve el menu ni la ruta de papelera.
3. Un `admin` que llama directamente a la API recibe `403`.
4. Un `super_admin` puede enviar un adulto activo a papelera con motivo valido.
5. El motivo vacio o mayor de 500 caracteres es rechazado.
6. El adulto enviado no aparece en listados, busquedas ni exportaciones.
7. El adulto enviado no aparece en reportes nuevos ni indicadores.
8. No se puede crear una nueva atencion para un adulto en papelera.
9. Las atenciones existentes no se eliminan.
10. El documento no puede reutilizarse para crear un segundo adulto.
11. El envio queda registrado en auditoria.
12. La papelera muestra el registro y su motivo unicamente a `super_admin`.
13. Un `super_admin` puede restaurar el registro.
14. Despues de restaurar, el adulto vuelve a aparecer en listados y selectores.
15. La restauracion queda registrada en auditoria.
16. Dos solicitudes concurrentes no producen estados inconsistentes.

## 14. Checklist de implementacion

- [ ] Agregar columnas e indices y generar migracion Drizzle.
- [ ] Agregar schemas y tipos en `packages/contracts`.
- [ ] Agregar policy exclusiva para papelera.
- [ ] Extender repositorio con envio, listado y restauracion.
- [ ] Implementar casos de uso y auditoria transaccional.
- [ ] Aplicar `deletedAt IS NULL` a todas las consultas operativas y reportes.
- [ ] Bloquear nuevas relaciones sobre adultos en papelera.
- [ ] Agregar endpoints protegidos.
- [ ] Agregar pruebas backend de permisos, estado, auditoria y concurrencia.
- [ ] Agregar API, queries y mutations en frontend.
- [ ] Agregar modal de confirmacion y boton exclusivo para superadmin.
- [ ] Agregar pantalla de papelera exclusiva para superadmin.
- [ ] Agregar pruebas frontend y e2e del flujo completo.
- [ ] Definir y probar politica para archivos previamente generados.

## 15. Fuera de alcance

- Eliminacion fisica inmediata de adultos mayores.
- Eliminacion automatica de atenciones historicas.
- Fusion de adultos mayores duplicados.
- Purga automatica por antiguedad.
- Papelera disponible para admins de tenant.
