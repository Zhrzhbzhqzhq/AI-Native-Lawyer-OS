#!/bin/bash

set -e

CURRENT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESOURCE_DIR="$(cd "$CURRENT_DIR/.." && pwd)"
BACKEND_DIR="$RESOURCE_DIR/backend"

echo "[LawDesk] Starting Backend..."
echo "[LawDesk] Backend dir: $BACKEND_DIR"

export LAWDESK_MODE=desktop
export AI_PROVIDER=minimax
export API_PORT=4000
export DATABASE_URL="file:$HOME/Documents/LawDesk/database/lawdesk.db"
export LAWDESK_DESKTOP_MIGRATIONS_DIR="$BACKEND_DIR/node_modules/@lawdesk/database/prisma-desktop/migrations"

mkdir -p "$HOME/Documents/LawDesk/database"
mkdir -p "$HOME/Documents/LawDesk/config"
mkdir -p "$HOME/Documents/LawDesk/logs"

# Load AI configuration
AI_CONFIG="$HOME/Documents/LawDesk/config/ai.json"

if [ ! -f "$AI_CONFIG" ]; then
    umask 077
    printf '%s\n' '{' '  "provider": "minimax",' '  "apiKey": "",' '  "model": "MiniMax-M3",' '  "region": "cn",' '  "status": "configuration_required"' '}' > "$AI_CONFIG"
    echo "[LawDesk] Created AI config template: $AI_CONFIG"
    echo "[LawDesk] AI configuration required before AI-assisted workflows can run"
fi

if [ -f "$AI_CONFIG" ]; then
    echo "[LawDesk] Loading AI config..."

    export MINIMAX_API_KEY=$(python3 - <<PY
import json
with open("$AI_CONFIG") as f:
    print(json.load(f).get("apiKey",""))
PY
)

    export MINIMAX_MODEL=$(python3 - <<PY
import json
with open("$AI_CONFIG") as f:
    print(json.load(f).get("model","MiniMax-M3"))
PY
)

    export MINIMAX_REGION=$(python3 - <<PY
import json
with open("$AI_CONFIG") as f:
    print(json.load(f).get("region","cn"))
PY
)

    echo "[LawDesk] AI provider: minimax"
    echo "[LawDesk] AI model: $MINIMAX_MODEL"
else
    echo "[LawDesk] No AI config found"
fi

"$RESOURCE_DIR/node-runtime/bin/node" "$CURRENT_DIR/initialize-database.cjs"

"$RESOURCE_DIR/node-runtime/bin/node" "$BACKEND_DIR/dist/index.js" \
> "$HOME/Documents/LawDesk/logs/backend.log" 2>&1 &

echo $! > "$HOME/Documents/LawDesk/logs/backend.pid"

echo "[LawDesk] Backend started"
