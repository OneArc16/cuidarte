#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

stop_from_pid_file() {
  local pid_file="$1"

  if [ ! -f "$pid_file" ]; then
    return
  fi

  local pid
  pid="$(cat "$pid_file")"

  if ! [[ "$pid" =~ ^[1-9][0-9]*$ ]]; then
    rm -f "$pid_file"
    return
  fi

  if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
    kill -- "-$pid" >/dev/null 2>&1 || kill "$pid"
  fi

  rm -f "$pid_file"
}

stop_from_pid_file "$ROOT_DIR/.tools/pids/api.pid"
stop_from_pid_file "$ROOT_DIR/.tools/pids/web.pid"

echo "Servidores detenidos."
