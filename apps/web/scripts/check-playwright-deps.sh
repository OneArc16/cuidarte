#!/usr/bin/env bash
set -euo pipefail

if ! command -v ldd >/dev/null 2>&1; then
  echo "No se encontro 'ldd'. Se omite la verificacion de dependencias nativas de Playwright."
  exit 0
fi

PLAYWRIGHT_CACHE_DIR="${HOME}/.cache/ms-playwright"

if [[ ! -d "$PLAYWRIGHT_CACHE_DIR" ]]; then
  cat <<'EOF'
No se encontro el cache de Playwright.
Instala los navegadores y dependencias antes de ejecutar E2E:
  pnpm --filter @cuidarte/web e2e:install
EOF
  exit 1
fi

mapfile -t SHELL_BINARIES < <(find "$PLAYWRIGHT_CACHE_DIR" -type f -name "chrome-headless-shell" 2>/dev/null)

if [[ "${#SHELL_BINARIES[@]}" -eq 0 ]]; then
  cat <<'EOF'
No se encontro el binario 'chrome-headless-shell' de Playwright.
Instala los navegadores y dependencias antes de ejecutar E2E:
  pnpm --filter @cuidarte/web e2e:install
EOF
  exit 1
fi

missing_libs=""
for shell_bin in "${SHELL_BINARIES[@]}"; do
  while IFS= read -r missing; do
    if [[ -n "$missing" ]]; then
      missing_libs+="${missing}"$'\n'
    fi
  done < <(ldd "$shell_bin" 2>/dev/null | awk '/not found/ { print $1 }')
done

if [[ -n "$missing_libs" ]]; then
  unique_missing_libs="$(printf "%s" "$missing_libs" | sort -u | sed '/^$/d')"

  echo "Faltan librerias nativas para ejecutar Playwright Chromium:"
  echo "$unique_missing_libs"
  cat <<'EOF'

Solucion recomendada:
  pnpm --filter @cuidarte/web e2e:install

Si persiste en Linux/WSL, instala manualmente las librerias faltantes (por ejemplo 'libnspr4').
EOF
  exit 1
fi

echo "Preflight Playwright OK: dependencias nativas detectadas."
