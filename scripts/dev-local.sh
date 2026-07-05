#!/usr/bin/env bash
set -euo pipefail

# Dev helper: start backend and frontend locally
#  - cd to repo root
#  - load .env if exists
#  - free ports 3000 and 4000
#  - start backend and frontend in background and tail logs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."
cd "${ROOT_DIR}"

echo "Starting dev-local from ${ROOT_DIR}"

# Load .env if present
if [ -f .env ]; then
  echo "Loading .env"
  # shellcheck disable=SC1091
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

# Ensure log dir
mkdir -p .logs

kill_port() {
  local port=$1
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids=$(lsof -ti tcp:${port} || true)
    if [ -n "$pids" ]; then
      echo "Killing existing process(es) on port ${port}: $pids"
      echo "$pids" | xargs -r kill -9 || true
    fi
  fi
}

kill_port 3000
kill_port 4000

echo "Starting backend and frontend... logs -> .logs/backend.log .logs/frontend.log"

# Start backend
pnpm --filter @lawdesk/backend dev > .logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: ${BACKEND_PID}"

# Start frontend
pnpm --filter @lawdesk/frontend dev > .logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: ${FRONTEND_PID}"

cleanup() {
  echo "Shutting down..."
  kill -9 ${BACKEND_PID} || true
  kill -9 ${FRONTEND_PID} || true
  exit 0
}

trap cleanup INT TERM

echo "Frontend: http://127.0.0.1:3000/matters"
echo "Backend:  http://127.0.0.1:4000/matters"

echo "Tailing logs. Press Ctrl-C to stop."
tail -n +1 -f .logs/backend.log .logs/frontend.log &
TAIL_PID=$!

wait ${BACKEND_PID} ${FRONTEND_PID} ${TAIL_PID} || true
