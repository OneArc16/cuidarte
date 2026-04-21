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
