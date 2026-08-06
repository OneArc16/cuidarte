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

- PostgreSQL en `localhost:5433`.
- Redis en `localhost:6379`.

Las apps `web` y `api` se ejecutan en WSL/host durante desarrollo para mantener recarga rapida y evitar friccion innecesaria.

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
pnpm --filter @cuidarte/api db:seed
```

`db:bootstrap` ejecuta las migraciones y sincroniza los datos de referencia obligatorios,
incluido el catalogo CIE-10 versionado. Es idempotente y debe ejecutarse en cada despliegue,
antes de iniciar la API. No requiere descargar datos de Internet.

`db:seed` crea exclusivamente datos demo para desarrollo y pruebas; no debe ejecutarse en
produccion.

Para actualizar unicamente los datos de referencia:

```bash
pnpm db:reference-data
```

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
