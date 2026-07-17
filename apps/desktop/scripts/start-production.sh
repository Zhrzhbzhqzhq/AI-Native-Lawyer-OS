#!/bin/bash

set -e

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"

cd "$ROOT_DIR"

echo "Starting LawDesk Backend..."

export LAWDESK_MODE=desktop
export API_PORT=4000
export DATABASE_URL="file:$HOME/Documents/LawDesk/database/lawdesk.db"

pnpm --filter @lawdesk/backend start > /tmp/lawdesk-backend.log 2>&1 &

echo "Starting LawDesk Frontend..."

pnpm --filter @lawdesk/frontend start > /tmp/lawdesk-frontend.log 2>&1 &

echo "LawDesk production services started"
