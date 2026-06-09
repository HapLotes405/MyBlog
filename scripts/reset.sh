#!/usr/bin/env bash
# reset.sh — Stop all services and remove volumes (fresh start)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "[!] This will stop all services and DELETE all data (volumes)."
echo "    Data includes: PostgreSQL database, uploaded files."
read -rp "    Are you sure? [y/N] " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Aborted."
  exit 0
fi

echo "[*] Stopping services and removing volumes..."
docker compose down -v
echo "[✓] All services stopped and volumes removed."
