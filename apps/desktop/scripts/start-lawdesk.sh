#!/bin/bash

set -e

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"

echo "Starting LawDesk Backend..."

cd "$ROOT_DIR"

export LAWDESK_MODE=desktop
export API_PORT=4000
export DATABASE_URL="file:$HOME/Documents/LawDesk/database/lawdesk.db"

pnpm --filter @lawdesk/backend start
