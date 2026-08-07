#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PATH="$ROOT_DIR/.tools/node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
export LD_LIBRARY_PATH="$ROOT_DIR/.local/playwright-libs/usr/lib/x86_64-linux-gnu:$ROOT_DIR/.local/playwright-libs/usr/lib/x86_64-linux-gnu/nss:${LD_LIBRARY_PATH:-}"

cd "$ROOT_DIR"
exec pnpm dev
