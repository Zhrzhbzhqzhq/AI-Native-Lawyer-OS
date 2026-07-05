#!/usr/bin/env bash
set -euo pipefail

# Move to repo root (scripts/ is under repo root)
cd "$(dirname "$0")/.."

echo "Killing process on port 3000 (if any)"
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "Removing apps/frontend/.next"
rm -rf apps/frontend/.next

echo "Starting frontend dev"
pnpm --filter @lawdesk/frontend dev
