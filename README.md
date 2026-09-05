# Cuidarte

Aplicativo web multi-tenant para Centros de Vida de Ancianos.

## Stack Base

- React + Vite + TypeScript strict.
- NestJS + Fastify + TypeScript strict.
- PostgreSQL + Row Level Security.
- Drizzle ORM.
- pnpm workspaces + Turborepo minimo.
- shadcn/ui + Tailwind CSS v4.

## Vertical Slice Actual

La primera vertical slice tecnica valida el camino completo:

```txt
apps/web -> packages/contracts -> apps/api
```

Endpoint:

```txt
GET http://localhost:3001/api/health
```

Contrato compartido:

```txt
packages/contracts/src/health.ts
```

## Comandos Esperados

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

Si se usa el Node portable del proyecto:

```bash
bash scripts/dev.sh
bash scripts/check.sh
```

## Infraestructura Local

Usaremos Docker Compose para servicios de infraestructura:

```bash
docker compose up -d
docker compose ps
docker compose down
```

Servicios:

- PostgreSQL en `localhost:15432`.
- Redis en `localhost:6379`.

Las apps `web` y `api` se ejecutan en WSL/host durante desarrollo para mantener recarga rapida y evitar friccion innecesaria.

## PDFs de soportes

En local, los PDFs de atenciones individuales se guardan en `apps/api/.data/uploads` (al ejecutar los comandos del paquete API), fuera de `dist/` y sin exponerse como contenido publico. La API conserva el nombre original solo como metadata, escribe un UUID interno bajo `<tenantId>/atenciones-individuales/<atencionId>/` y sirve la descarga autenticada desde su endpoint existente.

La carpeta se crea al subir el primer archivo. Para probarla localmente:

```bash
find apps/api/.data/uploads -type f
```

En la VPS, use [docker-compose.vps.yml](docker-compose.vps.yml) con un archivo `.env.vps` basado en `.env.vps.example`:

```bash
docker compose --env-file .env.vps -f docker-compose.vps.yml up -d
```

Esta configuración monta `/var/lib/cuidarte/uploads:/data/uploads` solamente en el contenedor de API y no publica PostgreSQL ni Redis. Cree la ruta del host con permisos restrictivos para el usuario que ejecuta Docker; no la publique mediante Nginx ni otro servidor estático.

## Auth Local

La primera slice real incluye login por correo y contrasena con cookie HttpOnly.

La slice cubre:

- Contratos compartidos Zod.
- Migracion Drizzle.
- Seed local.
- Endpoints `login`, `me` y `logout`.
- UI de login y sesion activa.
- Tests frontend con MSW.
- E2E Playwright en navegador real.
- Smoke test real contra PostgreSQL local.

Para preparar la base local:

```bash
docker compose up -d
pnpm db:bootstrap
pnpm db:seed:login
```

`db:bootstrap` ejecuta las migraciones, sincroniza los datos de referencia obligatorios y
completa los IDs de ubicacion de los registros historicos que puedan asociarse sin ambiguedad.
Es idempotente y debe ejecutarse en cada despliegue, antes de iniciar la API. La sincronizacion
de DIVIPOLA descarga el catalogo oficial de Datos Abiertos de Colombia, por lo que el entorno
de despliegue necesita salida HTTPS durante ese paso.

En la configuracion de VPS, el servicio `database-bootstrap` ejecuta este flujo automaticamente
y la API espera a que finalice correctamente antes de iniciar.

`db:seed` y `db:seed:login` cargan los datos demo de autenticacion y algunos registros de
apoyo para desarrollo y pruebas; no deben ejecutarse en produccion.

Para actualizar unicamente los datos de referencia:

```bash
pnpm db:seed:cie10
pnpm db:seed:ubicaciones
EPS_REFERENCE_DATA_FILE=/ruta/catalogo-eps.xlsx EPS_REFERENCE_DATA_VERSION=2026-08 pnpm db:seed:eps
pnpm db:seed:eps:demo
```

El archivo de EPS debe incluir las columnas `codigo`, `nit` y `nombre`. La columna de ID
externo se ignora. Puede revisar las coincidencias historicas antes de escribirlas con
`pnpm db:backfill:eps`; use `pnpm db:backfill:eps:write` despues de validar el reporte.
El seed `db:seed:eps:demo` inserta de forma idempotente el registro `EPS001` sin desactivar
otras EPS existentes.

Si `EPS_REFERENCE_DATA_FILE` no esta configurado, `pnpm db:seed:eps` y el bootstrap de
produccion cargan el catalogo versionado incluido en `src/database/reference-data/eps.csv`.

Usuarios de seed:

```txt
superadmin@cuidarte.test / Cuidarte123!
admin@centro-demo.test / Cuidarte123!
auditor@centro-demo.test / Cuidarte123!
```

Smoke test de auth:

```bash
bash scripts/smoke-auth.sh
```

E2E de auth en Chromium:

```bash
pnpm --filter @cuidarte/web e2e:install
pnpm --filter @cuidarte/web e2e
```

Nota: `e2e` ahora ejecuta un preflight de dependencias nativas de Playwright.
Si detecta librerias faltantes (por ejemplo `libnspr4`), fallara temprano con instrucciones de instalacion.

Exportacion PDF de la API:

```bash
pnpm pdf:install-deps
```

Este comando instala Chromium y sus librerias nativas para los PDFs generados desde NestJS con Playwright. En Linux/WSL puede pedir contrasena de `sudo`.

Verificacion completa de la slice Auth:

```bash
pnpm check:slice:auth
```

## Arquitectura de Testing Frontend

Estructura recomendada en `apps/web/src/test`:

- `fixtures/`: datos de prueba por dominio (sin comportamiento HTTP).
- `handlers/`: handlers MSW por dominio para simular la API.
- `test-server.ts`: fachada estable que compone `setupServer(...defaultHandlers)`.
- `helpers/`: utilidades reutilizables de testing (render, auth UI, overrides MSW).

Convenciones:

- Tests de flujo en `apps/web/src/app/__tests__/`.
- `server` se importa desde `test-server`.
- Datos de prueba se importan desde `fixtures`.
- Overrides de sesion (`/api/auth/me`) se hacen via helper semantico (`mockAuthMe`) para evitar duplicacion.
