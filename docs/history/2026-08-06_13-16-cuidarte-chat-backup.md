# Respaldo de chat

Fecha y hora: 2026-08-06 13:16

## Resumen

Durante esta conversación se dejó el proyecto listo para desarrollo local en WSL y se resolvieron varios puntos de infraestructura y arranque.

## Lo que se hizo

- Se instalaron dependencias con `pnpm install`.
- Se aprobaron los build scripts necesarios para que funcionaran paquetes como `argon2` y `esbuild`.
- Se verificó que `pnpm typecheck` y `pnpm build` pasaran correctamente.
- Se levantó PostgreSQL y Redis con Docker.
- Se corrigió el `docker-compose.yml` para usar un puerto accesible desde el entorno local.
- Se aplicaron migraciones con `pnpm db:migrate`.
- Se cargó el seed con `pnpm db:seed`.
- Se sincronizó el catálogo CIE-10 con `pnpm db:bootstrap` / `pnpm db:reference-data`.
- Se actualizó el frontend para funcionar mejor en WSL:
  - la API pasó a usarse como `/api`
  - Vite quedó con proxy hacia la API local
- Se explicó dónde se guardan las imágenes:
  - los archivos van a disco
  - la base de datos guarda metadatos y rutas relativas

## Datos útiles que quedaron definidos

- PostgreSQL local:
  - host: `127.0.0.1`
  - puerto: `15432`
  - base: `cuidarte`
  - usuario: `cuidarte`
  - contraseña: `cuidarte_dev_password`
- API local:
  - `http://localhost:3001`
- Web local:
  - `http://localhost:5173`
  - en WSL también puede aparecer por IP de red cuando `localhost` no enruta igual desde Windows

## Usuarios semilla

- `superadmin@cuidarte.test` / `Cuidarte123!`
- `admin@centro-demo.test` / `Cuidarte123!`

## Archivos tocados durante la sesión

- `docker-compose.yml`
- `.env.example`
- `apps/api/.env.example`
- `apps/api/src/config/env.ts`
- `apps/api/drizzle.config.ts`
- `apps/web/.env.example`
- `apps/web/src/shared/api/api-config.ts`
- `apps/web/vite.config.ts`
- `apps/web/playwright.config.ts`
- `scripts/smoke-auth.sh`
- `README.md`

## Nota

Este respaldo resume la conversación y los cambios principales, no es una transcripción literal completa.
