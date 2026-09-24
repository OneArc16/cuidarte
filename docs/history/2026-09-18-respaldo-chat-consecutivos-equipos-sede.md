# Respaldo de chat - Consecutivos por equipo, normalización y sede

Fecha: 2026-09-18  
Repositorio: `OneArc16/cuidarte`  
Rama: `feat/actas-alimentacion-home-incremental`  
Commit publicado: `d652ac0 feat(actividades): unificar consecutivos por equipo`  
Remoto: `origin/feat/actas-alimentacion-home-incremental`

## Objetivo de la conversación

Se solicitó:

1. Cambiar a la rama de trabajo y traer los cambios del repositorio.
2. Instalar dependencias y ejecutar migraciones.
3. Unificar los consecutivos de actas de sesiones grupales por equipos:
   - Médico y Enfermería comparten `SALUD-001`, `SALUD-002`, etc.
   - Psicología y Trabajo Social comparten `PSICO-001`, `PSICO-002`, etc.
4. Ajustar la herramienta de normalización de consecutivos a estas series.
5. Corregir el filtro de organizador de la lista de actividades.
6. Mostrar la sede debajo del rol en el menú lateral, formada por municipio y departamento.
7. Confirmar y corregir que las sesiones en papelera no cuenten al normalizar las series de equipo.
8. Crear commit y subir los cambios.

## Estado de Git y entorno

La rama usada fue:

```text
feat/actas-alimentacion-home-incremental
```

Se actualizaron los cambios remotos de esa rama, se instalaron dependencias y se ejecutaron migraciones locales.

El commit fue publicado correctamente:

```text
d652ac0 feat(actividades): unificar consecutivos por equipo
origin/feat/actas-alimentacion-home-incremental
```

Al cerrar este respaldo quedan únicamente directorios temporales no versionados, que no se deben agregar al repositorio:

```text
.cache/
node-compile-cache/
```

## Consecutivos compartidos por equipo

La regla implementada quedó así:

| Profesionales | Serie compartida |
| --- | --- |
| Médico y Enfermería | `SALUD-001`, `SALUD-002`, ... |
| Psicología y Trabajo Social | `PSICO-001`, `PSICO-002`, ... |

Por ejemplo, si Enfermería crea la primera sesión de salud, obtiene `SALUD-001`; la siguiente creada por Médico obtiene `SALUD-002`.

La asignación de nuevas actas continúa considerando únicamente registros activos (`deleted_at IS NULL`), por lo cual un acta enviada a papelera no bloquea un consecutivo disponible.

### Archivos principales

- `apps/api/src/modules/actividades-grupales/domain/actividad-grupal-acta-number.ts`
  - Resuelve la serie canónica por equipo y produce los prefijos `SALUD` / `PSICO`.
- `apps/api/src/modules/actividades-grupales/infrastructure/drizzle-actividades-grupales.repository.ts`
  - Reserva y crea consecutivos por la serie canónica, usando solo actas activas.
- `apps/api/src/modules/actividades-grupales/domain/actividad-grupal-acta-number.test.ts`
  - Pruebas de la regla de agrupación.
- `apps/api/src/modules/actividades-grupales/infrastructure/drizzle-actividades-grupales.repository.test.ts`
  - Pruebas de creación y normalización por equipo.

## Migraciones aplicadas

Las siguientes migraciones fueron creadas y aplicadas localmente:

1. `0046_actividades_grupales_shared_team_acta_series.sql`
   - Fusiona los contadores de Médico/Enfermería y Psicología/Trabajo Social.
   - Convierte las actas existentes a las series `SALUD` y `PSICO`.

2. `0047_actividades_grupales_legacy_team_acta_prefixes.sql`
   - Reconoce prefijos históricos como `ENFER`, `MED` y `TSOC` para incorporarlos a la serie correcta, incluso si el organizador histórico no estaba bien registrado.

3. `0048_actividades_grupales_active_team_acta_sequences.sql`
   - Corrección posterior: las sesiones con `deleted_at IS NOT NULL` no participan en la renumeración ni en los contadores activos.
   - Conservan su número histórico para poder consultarse desde el log/papelera.
   - Los índices únicos continúan aplicando solo a filas activas.

La migración `0048` se aplicó con:

```bash
pnpm --filter @cuidarte/api db:migrate
```

### Criterio de orden al migrar/normalizar

Las series se ordenan, por sede y por equipo, con este criterio:

1. `activity_date` ascendente.
2. `start_time` ascendente.
3. `end_time` ascendente.
4. `created_at` ascendente para desempatar.
5. `id` ascendente como último desempate.

La fecha y hora siempre formaron parte del orden. La corrección de `0048` fue excluir las sesiones eliminadas, no cambiar el orden cronológico.

Después de aplicar `0048`, se verificaron localmente las actas activas:

```text
SALUD-001  Enfermería       2026-09-11 10:13
SALUD-002  Enfermería       2026-09-14 10:00
PSICO-001  Trabajo Social   2026-09-18 13:00
SALUD-003  Médico           2026-09-18 13:00
PSICO-002  Psicología       2026-09-18 16:00
```

## Normalización de consecutivos

La vista y la aplicación de normalización ahora agrupan correctamente por los equipos compartidos:

- La serie SALUD agrupa Médico y Enfermería.
- La serie PSICO agrupa Psicología y Trabajo Social.
- El filtro y la vista previa excluyen registros eliminados.
- Se preserva el orden por fecha y hora descrito arriba.

Cambios relacionados en el frontend:

- `apps/web/src/features/actividades-grupales/pages/actividades-grupales-corrections-page.tsx`
- `apps/web/src/features/actividades-grupales/lib/actividades-grupales-filter-state.ts`
- `apps/web/src/features/actividades-grupales/lib/actividades-grupales-formatters.ts`

## Filtro Organizador/equipo

El filtro de la lista de actividades se ajustó para reflejar equipos compartidos:

- Salud permite filtrar la serie que reúne Médico y Enfermería.
- Psicosocial permite filtrar la serie que reúne Psicología y Trabajo Social.
- Los valores históricos de Enfermería y Trabajo Social se normalizan al equipo correspondiente al interpretar el filtro.

Archivo principal:

- `apps/web/src/features/actividades-grupales/components/actividades-grupales-toolbar.tsx`

## Sede en el menú lateral

Debajo del rol gris del resumen de usuario en los menús lateral y móvil ahora se muestra:

```text
Sede · Municipio, Departamento
```

Ejemplo para el tenant local:

```text
Sede · Guamal, Magdalena
```

Los superadministradores que no tienen sede asignada no muestran esta línea.

Para hacer disponible el dato sin crear una consulta adicional en el frontend:

- `packages/contracts/src/auth.ts` agrega `tenantMunicipality` y `tenantDepartment` al usuario autenticado.
- `apps/api/src/modules/auth/auth.service.ts` toma `city` y `department` del tenant durante `login` y `GET /auth/me`.
- `apps/web/src/features/home/components/home-user-summary.tsx` renderiza la sede con el icono de ubicación.
- `apps/web/src/features/home/home.css` agrega el estilo de la línea de sede.

Al probarlo en una instancia que ya estaba ejecutándose, puede ser necesario recargar la aplicación e iniciar/reiniciar la API si no está en modo `watch`.

## Verificaciones realizadas

Pasaron correctamente:

```bash
pnpm --filter @cuidarte/contracts build
pnpm --filter @cuidarte/api build
pnpm --filter @cuidarte/web typecheck
pnpm --filter @cuidarte/web exec vitest run src/app/app.test.tsx
git diff --check
```

La prueba puntual de la aplicación valida que el resumen de usuario contiene:

```text
Sede · Bogota, Cundinamarca
```

Se intentó ejecutar la suite web completa, pero conserva fallos ajenos a este cambio, principalmente handlers MSW faltantes para reportes y algunos flujos preexistentes. La prueba puntual añadida pasó de forma aislada.

## Para continuar en otro chat

1. Leer este archivo.
2. Confirmar el estado del repositorio:

```bash
git status --short
git log -1 --oneline
```

3. La rama esperada y publicada es `feat/actas-alimentacion-home-incremental` con el commit `d652ac0`.
4. No modificar las migraciones `0046`, `0047` ni `0048` si ya fueron aplicadas en algún ambiente. Para cambios posteriores de datos, crear una migración nueva.
5. Si se requiere inspeccionar los consecutivos actuales, usar solo actas con `deleted_at IS NULL` al validar series activas.
