#!/bin/bash

set -e

RESOURCE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

RUNTIME_DIR="$RESOURCE_DIR/runtime"

echo "[LawDesk] Runtime starting..."

"$RUNTIME_DIR/start-backend.sh"

sleep 3

"$RUNTIME_DIR/start-frontend.sh"

sleep 5

"$RUNTIME_DIR/health-check.sh"

echo "[LawDesk] Runtime ready"
