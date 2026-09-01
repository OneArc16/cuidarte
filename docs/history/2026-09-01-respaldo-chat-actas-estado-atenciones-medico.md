# Respaldo de chat: actas, estado de adultos mayores e indicador medico

- Fecha: 2026-09-01
- Proyecto: `cuidarte`
- Rama de trabajo: `feat/actas-alimentacion-home-incremental`
- Objetivo: conservar el contexto tecnico y funcional de esta conversacion para poder retomarla en otro chat.

## Resumen general

Durante este chat se trabajaron tres bloques principales:

1. ajuste del acta/formato de alimentacion para mostrar fechas marcadas;
2. nuevo campo `Estado` en datos personales del adulto mayor;
3. nuevo indicador operativo `Atenciones del medico` en el home.

Tambien se corrigio una base local desactualizada aplicando la migracion pendiente del campo `status`.

## Acta de alimentacion

El usuario indico que en el acta de alimentacion solo se debian modificar las fechas.

Decision funcional:

- El formato se mantiene por mes, sin acumulacion de ciclos anteriores.
- En la parte superior del acta se muestran las primeras 12 columnas.
- En la parte inferior se muestran las ultimas 12 columnas.
- La fila `Fecha` ya no debe mostrar solamente la fecha de generacion.
- Debe mostrar las fechas reales de los dias que tienen una `X`.
- El formato de fecha esperado es `dd-mm-yyyy`, por ejemplo `01-09-2026`, `02-09-2026`, `03-09-2026`.
- Si arriba hay 3 dias marcados, arriba deben mostrarse esas 3 fechas.

Archivos relevantes:

- `apps/api/src/modules/alimentacion/application/alimentacion-formato-export.service.ts`
- `apps/api/src/modules/alimentacion/application/alimentacion-formato-export.service.test.ts`
- `apps/api/src/modules/alimentacion/application/alimentacion-formato-pdf-template.ts`
- `apps/api/src/modules/alimentacion/application/alimentacion-formato-pdf-template.test.ts`

Commit creado:

- `11a8e96` - `Ajustar fechas en formato de alimentacion`

## Campo Estado en adultos mayores

El usuario pidio agregar un campo `Estado` en `Datos personales` para indicar si el adulto mayor esta `Vivo` o `Fallecido`.

Decision tecnica:

- En contrato y base se maneja como enum estable:
  - `alive`
  - `deceased`
- En UI se muestra como:
  - `Vivo`
  - `Fallecido`
- Los registros nuevos quedan por defecto en `Vivo`.
- El valor se carga y persiste al editar un adulto mayor.
- El estado se incluye en exportaciones Excel/PDF de adultos mayores.

Archivos relevantes:

- `packages/contracts/src/adultos-mayores.ts`
- `apps/api/src/database/schema.ts`
- `apps/api/drizzle/0031_adulto_mayor_status.sql`
- `apps/api/drizzle/meta/_journal.json`
- `apps/api/src/modules/adultos-mayores/application/adultos-mayores.service.ts`
- `apps/api/src/modules/adultos-mayores/infrastructure/drizzle-adultos-mayores.repository.ts`
- `apps/api/src/modules/adultos-mayores/application/adultos-mayores-export.service.ts`
- `apps/web/src/features/adultos-mayores/components/adulto-mayor-form.tsx`
- `apps/web/src/features/adultos-mayores/schemas/adulto-mayor-form.schema.ts`
- `apps/web/src/app/__tests__/adultos-mayores-flow.test.tsx`

Commit creado:

- `683c805` - `Agregar estado a adultos mayores`

## Error de consola por columna faltante

Despues de agregar `Estado`, aparecio un error en consola:

- Codigo PostgreSQL: `42703`
- Routine: `errorMissingColumn`

Diagnostico:

- El backend ya estaba consultando `adultos_mayores.status`.
- La base local aun no tenia la columna `status`.
- La migracion `0031_adulto_mayor_status.sql` existia en el codigo, pero no estaba aplicada en PostgreSQL.

Accion realizada:

- Se ejecuto `pnpm --filter @cuidarte/api db:migrate`.
- La migracion se aplico correctamente.
- Se verifico que la columna quedo creada:
  - columna: `status`
  - tipo: `adulto_mayor_status`
  - default: `'alive'`
  - `NOT NULL`

Nota para retomar:

- Si vuelve a aparecer el error, revisar que la base apuntada por `DATABASE_URL` tenga aplicada la migracion `0031`.
- Si la API estaba encendida durante la migracion, reiniciar el backend.

## Indicador Atenciones del medico

El usuario pidio agregar un contador de resumen operativo llamado `Atenciones del medico`, respetando permisos de perfiles.

Decision tecnica:

- El indicador se agrega al contrato del home como `atenciones_medico`.
- El backend cuenta filas de `atenciones_individuales`.
- El conteo usa `resolveAtencionIndividualScope(actor)` para respetar el alcance existente:
  - `super_admin`: alcance global;
  - perfiles con tenant: alcance por tenant;
  - perfiles sin acceso al dashboard siguen rechazados por `canViewHomeDashboard`.
- En frontend se muestra la tarjeta como `Atenciones del medico`.
- La tarjeta usa icono `Stethoscope`.
- La tarjeta navega a `Adultos mayores`, porque el flujo de atenciones individuales/historia clinica parte desde ese modulo y no desde un modulo independiente en el menu.

Archivos modificados y pendientes de commit al momento de este respaldo:

- `packages/contracts/src/home.ts`
- `apps/api/src/modules/home/home.service.ts`
- `apps/api/src/modules/home/home.service.test.ts`
- `apps/web/src/features/home/lib/home-dashboard-definitions.ts`
- `apps/web/src/test/fixtures/home.fixtures.ts`
- `apps/web/src/app/__tests__/home-dashboard.test.tsx`

Verificaciones realizadas:

- `pnpm --filter @cuidarte/contracts build`: paso.
- `pnpm --filter @cuidarte/api build`: paso.
- `pnpm --filter @cuidarte/api exec node --import tsx --test src/modules/home/home.service.test.ts`: paso.
- `pnpm --filter @cuidarte/web exec vitest run src/app/__tests__/home-dashboard.test.tsx --reporter=dot`: paso.
- `pnpm --filter @cuidarte/web typecheck`: paso.
- `git diff --check`: paso.

Verificacion con ruido preexistente:

- `pnpm --filter @cuidarte/api typecheck` falla por errores preexistentes en tests de enfermeria, backoffice y empleados.
- Esos errores no estan relacionados con el indicador `Atenciones del medico`.

## Estado actual del repositorio al guardar este respaldo

Despues de los commits anteriores, el arbol estaba limpio.

Luego se implemento `Atenciones del medico`, que esta pendiente de commit junto con este archivo de respaldo.

Cambios pendientes esperados:

- `packages/contracts/src/home.ts`
- `apps/api/src/modules/home/home.service.ts`
- `apps/api/src/modules/home/home.service.test.ts`
- `apps/web/src/features/home/lib/home-dashboard-definitions.ts`
- `apps/web/src/test/fixtures/home.fixtures.ts`
- `apps/web/src/app/__tests__/home-dashboard.test.tsx`
- `docs/history/2026-09-01-respaldo-chat-actas-estado-atenciones-medico.md`

## Contexto util para otro chat

Si este respaldo se usa para continuar en otro chat, el punto de partida recomendado es:

1. revisar el diff pendiente del indicador `Atenciones del medico`;
2. confirmar si el usuario quiere hacer commit de ese indicador;
3. mantener la navegacion del indicador hacia `Adultos mayores` salvo que se cree un modulo propio para atenciones individuales;
4. no revertir los commits `683c805` ni `11a8e96`;
5. recordar que la base local ya recibio la migracion `0031` del campo `Estado`.
