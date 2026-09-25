# Respaldo de chat: alimentación, importación masiva y permisos

Fecha: 2026-09-25
Repositorio: `OneArc16/cuidarte`
Rama: `feat/actas-alimentacion-home-incremental`
Último commit publicado: `c8d51ea fix(adultos): informa cuando el duplicado esta en papelera`
Remoto: `origin/feat/actas-alimentacion-home-incremental`

## Propósito

Este respaldo permite reanudar en otro chat el trabajo sobre registro de alimentación, importación masiva de formatos diligenciados, permisos por persona y papelera de adultos mayores.

## Registro de alimentación para múltiples días

- Se agregó el permiso `alimentacion.create_multiple_dates`.
- Se administra desde **Ajustes > Permisos por persona**.
- En la matriz aparece como la columna **VARIOS DÍAS** dentro de Alimentación.
- Sin el permiso se selecciona un solo día; con el permiso se seleccionan varios días independientes, no un rango.
- Al guardar se crea un registro por cada combinación adulto mayor/día.
- Se mantienen validaciones de conflictos, máximo 31 fechas y autorización en backend.
- Migración: `apps/api/drizzle/0058_alimentacion_multiple_dates_permission.sql`.
- El calendario usa `react-day-picker` y está localizado en español.

Archivos principales:

- `apps/web/src/features/alimentacion/components/alimentacion-date-picker.tsx`
- `apps/web/src/features/alimentacion/components/alimentacion-batch-form.tsx`
- `apps/web/src/features/alimentacion/pages/alimentacion-create-page.tsx`
- `apps/api/src/modules/alimentacion/application/alimentacion.service.ts`
- `apps/api/src/modules/alimentacion/domain/alimentacion.policy.ts`
- `packages/contracts/src/auth.ts`
- `docs/specs/2026-09-25-registro-alimentacion-multiples-dias.spec.md`

## Importación masiva de formatos PDF

- Permite importar en modo **Un mes** o **Todos los meses**.
- El nombre esperado es `identificacion-AAAA-MM.pdf`.
- En modo de un mes, el archivo debe coincidir con el mes seleccionado.
- Los PDF se dividen automáticamente en bloques de 100 y se validan secuencialmente.
- 400 PDF se procesan como 4 bloques de 100.
- Cada PDF puede pesar máximo 10 MB y cada bloque máximo 100 MiB.
- La API permite hasta 100 archivos multipart por solicitud; antes tenía un límite global de 6.
- La sede solo se selecciona manualmente cuando el usuario es `super_admin`; los demás roles usan la sede de su sesión.
- El modal tiene altura máxima y scroll interno para mantener visibles los botones.
- Si un `super_admin` intenta abrir la importación sin elegir sede, recibe un aviso y debe seleccionar una sede.

Archivos principales:

- `apps/web/src/features/alimentacion/components/alimentacion-bulk-import-dialog.tsx`
- `apps/web/src/features/alimentacion/pages/alimentacion-index-page.tsx`
- `apps/web/src/features/alimentacion/alimentacion.css`
- `apps/api/src/main.ts`
- `apps/api/src/modules/alimentacion/application/alimentacion-bulk-import.service.ts`
- `apps/api/src/modules/alimentacion/domain/alimentacion-bulk-import.ts`
- `docs/specs/2026-09-25-importacion-masiva-formatos-alimentacion.spec.md`

## Adultos mayores y papelera

- Si el documento pertenece a un adulto en papelera, el backend informa:

  `El adulto mayor con ese documento está en la papelera. Puedes restaurarlo desde la papelera antes de crearlo nuevamente.`

- Los duplicados activos conservan el mensaje genérico anterior.
- El repositorio incluye `deletedAt` al buscar el documento para distinguir ambos casos.
- La restauración se realiza desde la papelera de adultos mayores.

## Otros cambios

- Se mantuvieron los permisos de alcance de organizadores para actividades grupales.
- Los botones del sidebar y acciones de módulos usan elementos `button` para interacción normal y botón central del mouse.
- Se mantuvieron los ajustes de papelera por sede y controles de acceso por persona.

## Problema de Redis

El error `connect ECONNREFUSED 127.0.0.1:6379` significa que la API no logra conectarse a Redis en el puerto 6379. Afecta principalmente la cola `ReportJobsQueue`. Redis debe estar activo y la API debe reiniciarse después de corregir la conexión.

## Commits recientes

- `e57572a feat: improve adult management and sidebar navigation`
- `762ed13 feat: add bulk alimentation pdf import`
- `21cb444 fix(api): stabilize report exports and file downloads`
- `2d00440 feat(alimentacion): permite crear entregas para multiples dias`
- `a3adebd` merge de los cambios remotos
- `938d73a fix(alimentacion): mejora modal de importacion masiva`
- `2d9742a fix(api): permite validar bloques de hasta 100 pdf`
- `c8d51ea fix(adultos): informa cuando el duplicado esta en papelera`

Todos los commits anteriores fueron enviados al remoto.

## Validaciones ejecutadas

- `pnpm --filter @cuidarte/web typecheck`
- `pnpm --filter @cuidarte/api typecheck`
- `pnpm --filter @cuidarte/api build`
- Pruebas específicas de `AdultosMayoresService`: 12/12 correctas.
- Migraciones de API ejecutadas correctamente en el entorno local.

La ejecución completa de pruebas de API contiene algunos fallos preexistentes o no relacionados en pruebas de controller y tenant branding; el typecheck, build y la prueba específica del cambio de papelera pasan.

## Estado para continuar

Confirmar siempre el estado antes de modificar:

```bash
git status --short
git log -1 --oneline
git branch -vv
```

La rama debe estar sincronizada con `origin/feat/actas-alimentacion-home-incremental` en `c8d51ea`.

No agregar estos directorios temporales:

```text
.cache/
node-compile-cache/
```

Si se cambia el modelo de permisos o la base de datos, crear una nueva migración; no editar migraciones ya aplicadas.
