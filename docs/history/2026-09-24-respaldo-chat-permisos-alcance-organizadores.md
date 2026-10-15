# Respaldo de chat - Permisos de organizadores y UI de actividades

Fecha: 2026-09-24  
Repositorio: `OneArc16/cuidarte`  
Rama: `feat/actas-alimentacion-home-incremental`  
Commit publicado: `4d12463 feat(actividades): agrega permisos por organizador y mejoras de selección`  
Remoto: `origin/feat/actas-alimentacion-home-incremental`

## Objetivo de la conversación

Se trabajó en permisos para actividades grupales, especialmente en la posibilidad de que una persona cree actividades para organizadores distintos al suyo. También se ajustó la interfaz del formulario y del modal de configuración.

## Estado final

El commit `4d12463` fue creado y enviado correctamente al remoto. La rama local quedó sincronizada con:

```text
origin/feat/actas-alimentacion-home-incremental
```

El repositorio conserva únicamente estos directorios temporales sin versionar, que no deben agregarse al proyecto:

```text
.cache/
node-compile-cache/
```

## Permisos de organizadores

Se agregó la configuración individual de organizadores permitidos para cada empleado.

Reglas principales:

- SuperAdmin puede consultar personas de todos los centros.
- Admin puede consultar y administrar personas de su propio centro.
- Admin y SuperAdmin pueden abrir el botón de configuración de alcance.
- Una persona siempre puede crear actividades para su propio organizador.
- Los organizadores adicionales se configuran individualmente por persona.
- El backend valida el permiso; ocultar opciones en el frontend no sustituye la autorización.
- Los organizadores propios y los permisos globales de Admin/SuperAdmin se respetan en la política.

## Migraciones

Se crearon y aplicaron localmente:

- `apps/api/drizzle/0055_employees_activity_organizer_permission.sql`
  - Primera versión del permiso global booleano.
- `apps/api/drizzle/0056_employees_activity_organizer_permissions.sql`
  - Migra el permiso a una lista JSON de organizadores permitidos.
  - Si el permiso booleano anterior era verdadero, conserva el acceso otorgando los ocho organizadores.
  - Elimina la columna booleana anterior después de copiar los datos.

La migración `0056` se ejecutó preservando los permisos existentes.

## Backend y contratos

Archivos principales modificados:

- `apps/api/src/database/schema.ts`
- `apps/api/src/modules/empleados/application/empleados.service.ts`
- `apps/api/src/modules/empleados/domain/empleado.types.ts`
- `apps/api/src/modules/empleados/domain/empleados.repository.ts`
- `apps/api/src/modules/empleados/infrastructure/drizzle-empleados.repository.ts`
- `apps/api/src/modules/empleados/presentation/empleados.controller.ts`
- `apps/api/src/modules/actividades-grupales/domain/actividad-grupal.policy.ts`
- `apps/api/src/modules/actividades-grupales/application/actividades-grupales.service.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `packages/contracts/src/auth.ts`

La respuesta de permisos usa `allowedOrganizers`. El usuario autenticado expone `allowedActividadGrupalOrganizers`. La política de actividades combina el organizador propio con los organizadores adicionales autorizados.

También se actualizaron pruebas de aplicación y dominio relacionadas con actividades grupales y empleados.

## Modal “Alcance de organizadores”

Archivo principal:

- `apps/web/src/features/ajustes/components/ajustes-activity-organizer-permissions-dialog.tsx`

El modal permite:

- Buscar y seleccionar personas.
- Editar varias personas antes de guardar.
- Seleccionar organizadores individualmente.
- Mantener el organizador propio siempre seleccionado y bloqueado.
- Seleccionar todos los organizadores adicionales.
- Descartar cambios.
- Guardar cambios de varias personas en una sola acción.
- Mostrar contador de organizadores permitidos.
- Mostrar `+N` de organizadores adicionales en la lista de personas cuando el dato está disponible en la sesión del modal.
- Mostrar punto naranja en personas con cambios sin guardar.
- Mostrar estado “Cambios guardados” durante 2.5 segundos después de guardar.
- Mostrar advertencia al intentar cerrar con cambios pendientes; un segundo intento permite cerrar.
- Navegar con flechas arriba/abajo en la lista de personas y usar Escape para cerrar o iniciar el aviso de cierre.
- Mostrar una vista lista/detalle responsive en móvil.

El modal se rediseñó según la referencia visual:

- Escritorio: ancho máximo de 920px y alto de 620px.
- Overlay oscuro con desenfoque.
- Panel izquierdo de personas de 290px.
- Detalle con cabecera de la persona.
- Organizadores en dos columnas en escritorio.
- Una columna entre 681px y 860px.
- Hoja inferior de 92dvh en móvil.
- El texto “Permitir creación” solo aparece en el organizador propio como “Propio” con candado.
- Las opciones no propias no tienen texto secundario ni bordes individuales.
- Las iniciales de los avatares están centradas usando un elemento interno y alineación flex explícita.

Estilos principales:

- `apps/web/src/features/ajustes/ajustes.css`
- `apps/web/src/features/ajustes/pages/ajustes-page.tsx`

El botón del modal está junto a “Permisos por persona”, visible para Admin y SuperAdmin, con color diferenciado.

## Formulario de actividades grupales

Archivos principales:

- `apps/web/src/features/actividades-grupales/components/actividad-grupal-form.tsx`
- `apps/web/src/features/actividades-grupales/actividades-grupales.css`
- `apps/web/src/features/actividades-grupales/pages/actividad-grupal-create-page.tsx`
- `apps/web/src/features/actividades-grupales/pages/actividad-grupal-edit-page.tsx`
- `apps/web/src/features/actividades-grupales/lib/actividades-grupales-formatters.ts`
- `apps/web/src/features/empleados/api/empleados-api.ts`
- `apps/web/src/features/empleados/model/empleados-queries.ts`

Cambios relevantes:

- El selector de organizador muestra solo las opciones permitidas para crear.
- El organizador propio permanece disponible.
- Se eliminó el mensaje visible “Tu permiso actual permite crear actividades solo para este organizador.”
- La validación de permisos se mantiene en backend.
- La lista de involucrados permite seleccionar empleados y agregarlos todos.
- Al seleccionar o quitar un involucrado, la tarjeta hace un pulso suave y el checkbox tiene una animación breve.
- “Agregar todos” también anima las tarjetas seleccionadas.
- La animación respeta `prefers-reduced-motion`.

## Animación de involucrados

La selección usa el estado `employeeSelectionAnimation` con una secuencia para reiniciar la animación incluso al alternar repetidamente el mismo empleado.

Clases y keyframes principales:

```text
actividad-empleado-option--just-toggled
actividad-empleado-selection-pop
actividad-empleado-checkbox-pop
```

## Verificaciones realizadas

Pasaron correctamente:

```bash
pnpm --filter @cuidarte/web typecheck
pnpm --filter @cuidarte/web exec prettier --write ...
git diff --check
```

También se habían validado previamente contratos, API y pruebas específicas de actividades grupales y empleados.

## Para continuar en otro chat

1. Leer este archivo completo.
2. Confirmar el estado:

```bash
git status --short
git log -1 --oneline
git branch -vv
```

3. La rama publicada es `feat/actas-alimentacion-home-incremental`.
4. El commit de referencia es `4d12463`.
5. No agregar `.cache/` ni `node-compile-cache/`.
6. Si se modifica el modelo de permisos, crear una migración nueva; no editar las migraciones `0055` ni `0056` ya aplicadas.
7. Si se continúa con el modal, conservar la lógica de permisos y limitar los cambios a la interfaz salvo que se solicite explícitamente modificar backend.
