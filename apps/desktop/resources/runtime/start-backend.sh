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
export AI_PROVIDER=minimax
export API_PORT=4000
export DATABASE_URL="file:$HOME/Documents/LawDesk/database/lawdesk.db"

# Load AI configuration
AI_CONFIG="$HOME/Documents/LawDesk/config/ai.json"

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


mkdir -p "$HOME/Documents/LawDesk/logs"

node "$BACKEND_DIR/dist/index.js" \
> "$HOME/Documents/LawDesk/logs/backend.log" 2>&1 &

echo $! > "$HOME/Documents/LawDesk/logs/backend.pid"

echo "[LawDesk] Backend started"
