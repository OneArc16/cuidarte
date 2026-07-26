#!/usr/bin/env bash
set -euo pipefail

PORTS=(3001 5173)

find_listener_pids() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
    return
  fi

  if command -v fuser >/dev/null 2>&1; then
    fuser -n tcp "$port" 2>/dev/null | tr ' ' '\n' || true
    return
  fi

  echo "No se encontró ni lsof ni fuser para liberar el puerto $port." >&2
  exit 1
}

stop_pid() {
  local pid="$1"
  local pgid

  pgid="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ' || true)"

  if [[ "$pgid" =~ ^[1-9][0-9]*$ ]]; then
    kill -- "-$pgid" >/dev/null 2>&1 || true
  fi

  kill "$pid" >/dev/null 2>&1 || true

  if kill -0 "$pid" >/dev/null 2>&1; then
    kill -9 "$pid" >/dev/null 2>&1 || true
  fi
}

for port in "${PORTS[@]}"; do
  pids="$(find_listener_pids "$port" | awk 'NF' | sort -u)"

  if [ -z "$pids" ]; then
    echo "Puerto $port ya está libre."
    continue
  fi

  echo "Liberando puerto $port..."

  while IFS= read -r pid; do
    [ -z "$pid" ] && continue

    cmd="$(ps -o args= -p "$pid" 2>/dev/null || true)"
    if [ -n "$cmd" ]; then
      echo " - Deteniendo PID $pid ($cmd)"
    else
      echo " - Deteniendo PID $pid"
    fi

    stop_pid "$pid"
  done <<< "$pids"
done
