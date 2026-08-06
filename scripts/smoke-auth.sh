#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PORT="${API_PORT:-3011}"
COOKIE_JAR="$ROOT_DIR/.tools/auth-cookies.txt"

export PATH="$ROOT_DIR/.tools/node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
export PORT="$API_PORT"
export WEB_ORIGIN="http://localhost:5173"
export DATABASE_URL="${DATABASE_URL:-postgres://cuidarte:cuidarte_dev_password@localhost:15432/cuidarte}"

cd "$ROOT_DIR"
mkdir -p .tools/logs

pnpm --filter @cuidarte/api build >/dev/null

node apps/api/dist/main.js > .tools/logs/api-smoke.log 2>&1 &
api_pid="$!"

cleanup() {
  kill "$api_pid" >/dev/null 2>&1 || true
  rm -f "$COOKIE_JAR"
}
trap cleanup EXIT

for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "http://localhost:${API_PORT}/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -fsS \
  -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@centro-demo.test","password":"Cuidarte123!"}' \
  "http://localhost:${API_PORT}/api/auth/login" >/dev/null

curl -fsS \
  -b "$COOKIE_JAR" \
  "http://localhost:${API_PORT}/api/auth/me" |
  grep -q '"email":"admin@centro-demo.test"'

curl -fsS \
  -b "$COOKIE_JAR" \
  -c "$COOKIE_JAR" \
  -X POST \
  "http://localhost:${API_PORT}/api/auth/logout" |
  grep -q '"success":true'

curl -fsS \
  -b "$COOKIE_JAR" \
  "http://localhost:${API_PORT}/api/auth/me" |
  grep -q '"user":null'

echo "Auth smoke test OK."
