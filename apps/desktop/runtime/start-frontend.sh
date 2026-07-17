#!/bin/bash

set -e

CURRENT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -d "$CURRENT_DIR/../resources/frontend" ]; then
    FRONTEND_DIR="$CURRENT_DIR/../resources/frontend"
else
    FRONTEND_DIR="$(cd "$CURRENT_DIR/.." && pwd)/frontend"
fi

echo "[LawDesk] Starting Frontend..."
echo "[LawDesk] Frontend dir: $FRONTEND_DIR"

mkdir -p "$HOME/Documents/LawDesk/logs"

cd "$FRONTEND_DIR"

node_modules/.bin/next start -p 3000 \
> "$HOME/Documents/LawDesk/logs/frontend.log" 2>&1 &

echo $! > "$HOME/Documents/LawDesk/logs/frontend.pid"

echo "[LawDesk] Frontend started"
