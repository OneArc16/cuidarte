# Respaldo de chat - Continuación de series, permisos y normalización

Fecha: 2026-09-23  
Repositorio: `OneArc16/cuidarte`  
Rama: `feat/actas-alimentacion-home-incremental`

Este documento continúa [el respaldo inicial de series especiales](2026-09-23-respaldo-chat-series-especiales-ui.md). Léelo primero al retomar este trabajo en otro chat.

## Decisiones funcionales vigentes

### Series de actas

- Cada actividad tiene su propio prefijo.
- Cuando se administra desde **Todos los centros**, el prefijo se comparte para esa actividad en todos los centros, pero **el consecutivo permanece independiente por centro**.
- La serie global de todas las actividades queda desactivada en producción; no debe sobrescribir los prefijos por actividad.
- Las actas existentes no se renumeran ni cambian automáticamente al configurar un prefijo. Para llevar el histórico a la nueva serie se utiliza el módulo **Normalizar consecutivos**.
- Las personas que comparten una actividad conservan la misma secuencia de esa actividad; la serie se identifica por tipo de actividad y centro, no por cargo.

### Catálogo de producción acordado

Producción ya contiene estas actividades; la migración solo configura sus prefijos:

| Actividad | Prefijo |
| --- | --- |
| Actividad de belleza y peluquería | `BELLE` |
| Actividad de Campo | `CAMP` |
| Actividades de Manualidad | `MANU` |
| Actividades de Recreación | `RECRE` |
| Centro de Vida | `CENTRO` |
| Fisioterapia | `FISIO` |
| Nutrición | `NUTRI` |
| Salud Preventiva | `SALUD` |
| Sesiones Psicosociales | `PSICO` |

Condiciones explícitas del usuario:

- **No crear ni incluir Maquillaje** en producción.
- **No cambiar el estado de Encuentro Intergeneracional**: ya está inactiva.
- No modificar los estados de las demás actividades.

## Cambios funcionales y de interfaz realizados

### Ajustes → actividades grupales

- Se corrigieron los flujos de editar tanto en un centro como en **Todos los centros**.
- El botón para editar una actividad debe abrir siempre el modal correspondiente; no debe quedar un botón adicional junto al selector de centro.
- En Todos los centros, cada actividad muestra la cantidad de centros donde existe.
- El modal de edición global usa pasos **Serie** y **Personas**. El usuario puede guardar la serie y continuar configurando personas sin cerrar el modal.
- La selección de personas se maneja por individuo, no por cargo, y tiene animación breve al activar o desactivar una tarjeta.
- Al guardar personas en el modal global, este debe permanecer abierto; ese comportamiento se corrigió.

### Modal individual de edición

- Fue ampliado para aprovechar la pantalla, con header y footer fijos y un único scroll en el cuerpo.
- En escritorio mide hasta `880px × 820px`; en móvil funciona como hoja inferior.
- La lista de personas no debe tener scroll anidado; usa dos columnas en escritorio/tabla y una en móvil.
- Con Serie especial apagada, los campos de prefijo y consecutivo se colapsan, el borde deja de ser verde y el texto indica que se usa la serie general.
- “Seleccionar todas” solo queda deshabilitado si no existen personas visibles después de buscar o filtrar.

### Permisos por persona

- Se implementó administración de permisos individuales para empleados desde Ajustes, accesible mediante un botón de icono minimalista de seguridad.
- El modal de permisos muestra empleados a la izquierda y módulos/acciones (`Ver`, `Crear`, `Editar`) a la derecha.
- Los permisos tienen prioridad por usuario y complementan las reglas de negocio: por ejemplo, editar una actividad sigue requiriendo que el empleado esté incorporado en el acta cuando esa es la condición funcional.

### Modales de eliminación

- Se rediseñaron los modales de eliminar actas y enviar adultos mayores a papelera.
- El motivo debe ser escrito por la persona; los chips son referencias visuales y no completan el campo automáticamente.

## Normalización de consecutivos

- Se unificó el flujo de normalización para evitar dos acciones separadas.
- La normalización reordena por fecha y hora dentro de la serie de la actividad y permite migrar sesiones históricas al prefijo nuevo.
- La vista previa detecta conflictos, incluidos cruces de horario, y exige motivo antes de aplicar.
- Una normalización debe ejecutarse desde la interfaz por actividad y centro después de desplegar los prefijos en producción. No se creó una migración masiva de números históricos, porque requiere revisar cada vista previa y sus colisiones.
- El normalizador respeta las series compartidas; no debe generar duplicados para quienes participan en la misma actividad.

Archivos principales:

- `apps/web/src/features/actividades-grupales/pages/actividades-grupales-corrections-page.tsx`
- `apps/api/src/modules/actividades-grupales/application/actividades-grupales.service.ts`
- `apps/api/src/modules/actividades-grupales/infrastructure/drizzle-actividades-grupales.repository.ts`

## Migración lista para producción

Se agregó y publicó la migración:

- `apps/api/drizzle/0054_production_actividad_grupal_series.sql`

Esta migración:

1. Valida que ninguno de los prefijos objetivo esté asignado a otra actividad del mismo centro. Si detecta un choque, detiene la migración sin reasignar datos.
2. Configura los nueve prefijos del catálogo anterior para las actividades existentes.
3. Conserva `consecutive_next_value` si ya es válido; si estaba vacío inicia en `1`.
4. No crea actividades, no incluye Maquillaje, no cambia estados y no renumera actas históricas.
5. Desactiva la serie global almacenada en `actividad_grupal_global_series`, para que se use la serie por actividad.

También se actualizó `apps/api/drizzle/meta/_journal.json` con la entrada `0054_production_actividad_grupal_series`.

Validación realizada:

```bash
pnpm --dir apps/api exec drizzle-kit check
```

Resultado: `Everything's fine`.

Para desplegar en producción:

```bash
pnpm --dir apps/api db:migrate
```

Después, normalizar desde la interfaz las sesiones históricas que deban adoptar los nuevos prefijos.

## Commits recientes y publicación

Los cambios relevantes están comprometidos y publicados en `origin/feat/actas-alimentacion-home-incremental`:

- `98443ec` — `feat: agrega series especiales y correcciones de actas`
- `86a5cf3` — `feat: actualiza actividades y permisos por centro`
- `cdadd70` — `fix: normaliza consecutivos por serie de actividad`
- `7489583` — `fix: mantener abierto el modal de permisos globales`
- `e0b87ba` — `feat: configurar series de actividades para produccion`

El commit `e0b87ba` fue enviado correctamente al remoto GitHub `OneArc16/cuidarte`.

## Al retomar en otro chat

1. Leer este documento y el respaldo inicial enlazado arriba.
2. Ejecutar `git status --short` antes de editar; no usar `git reset --hard`.
3. Confirmar en producción que la migración `0054` se aplicó antes de normalizar históricos.
4. No agregar Maquillaje al catálogo productivo sin una solicitud explícita.
5. Mantener como regla que los prefijos son por actividad y los consecutivos son independientes por centro.
