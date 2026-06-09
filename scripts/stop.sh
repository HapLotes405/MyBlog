#!/usr/bin/env bash
# stop.sh — Stop all Docker services without removing volumes
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "[*] Stopping all services..."
docker compose down
echo "[✓] All services stopped. Volumes preserved."
