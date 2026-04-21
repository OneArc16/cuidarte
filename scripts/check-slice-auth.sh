#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PATH="$ROOT_DIR/.tools/node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

cd "$ROOT_DIR"

docker compose up -d
pnpm --filter @cuidarte/api db:migrate
pnpm --filter @cuidarte/api db:seed
pnpm --filter @cuidarte/web test
pnpm --filter @cuidarte/web e2e
bash scripts/smoke-auth.sh
