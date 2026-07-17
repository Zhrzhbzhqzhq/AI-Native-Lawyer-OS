#!/bin/bash

set -e

CURRENT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -d "$CURRENT_DIR/../resources/backend" ]; then
    BACKEND_DIR="$CURRENT_DIR/../resources/backend"
else
    BACKEND_DIR="$(cd "$CURRENT_DIR/.." && pwd)/resources/backend"
fi

echo "[LawDesk] Starting Backend..."
echo "[LawDesk] Backend dir: $BACKEND_DIR"

export LAWDESK_MODE=desktop
export API_PORT=4000
export DATABASE_URL="file:$HOME/Documents/LawDesk/database/lawdesk.db"

mkdir -p "$HOME/Documents/LawDesk/logs"

node "$BACKEND_DIR/dist/index.js" \
> "$HOME/Documents/LawDesk/logs/backend.log" 2>&1 &

echo $! > "$HOME/Documents/LawDesk/logs/backend.pid"

echo "[LawDesk] Backend started"
