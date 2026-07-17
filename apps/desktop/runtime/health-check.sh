#!/bin/bash

set -e

echo "[LawDesk] Checking Backend..."

curl -f http://localhost:4000/health/db

echo

echo "[LawDesk] Checking Frontend..."

curl -f http://localhost:3000

echo

echo "[LawDesk] All services ready"
