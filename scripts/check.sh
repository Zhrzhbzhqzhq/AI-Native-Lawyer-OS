#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "== LawDesk quick check =="

# frontend build if script exists
if command -v pnpm >/dev/null 2>&1; then
  echo "Using pnpm"
  if pnpm -w -s ls @lawdesk/frontend >/dev/null 2>&1; then
    echo "Building frontend..."
    echo "[check] cleaning frontend .next cache"
    rm -rf apps/frontend/.next
    pnpm --filter @lawdesk/frontend build
    echo "✅ required check: frontend build passed"
  else
    echo "⚠ optional: frontend build skipped (@lawdesk/frontend not found)"
  fi
else
  echo "pnpm not found; skipping pnpm tasks"
fi

# backend build if script exists (optional, non-blocking)
if command -v pnpm >/dev/null 2>&1; then
  if pnpm -w -s ls @lawdesk/backend >/dev/null 2>&1; then
    echo "Building backend (tsc) (optional)..."
    if pnpm --filter @lawdesk/backend build; then
      echo "⚠ optional check: backend build passed"
    else
      echo "⚠ optional check: backend build failed (non-blocking)"
    fi
  else
    echo "⚠ optional: backend build skipped (@lawdesk/backend not found)"
  fi
fi

# run lint/typecheck (best-effort)
# typecheck (optional, non-blocking). Do NOT run lint to avoid interactive Next.js prompts
if command -v pnpm >/dev/null 2>&1; then
  echo "Running workspace typecheck (optional)..."
  if pnpm -w -s run typecheck; then
    echo "⚠ optional check: typecheck passed"
  else
    echo "⚠ optional check: typecheck failed or skipped (non-blocking)"
  fi
fi

echo "== Done =="
