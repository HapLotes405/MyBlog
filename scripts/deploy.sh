#!/usr/bin/env bash
# deploy.sh — Build and start all Docker services for HapLotes405 Wiki
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "============================================"
echo "  HapLotes405 Wiki — Docker Deploy"
echo "============================================"
echo ""

# 1. Set up .env if not present
if [ ! -f .env ]; then
  if [ -f .env.docker ]; then
    echo "[*] Creating .env from .env.docker..."
    cp .env.docker .env
    echo "[✓] .env created."
    echo "[!] Review .env and change passwords before deploying to production!"
  else
    echo "[!] No .env or .env.docker found — using docker-compose defaults."
  fi
else
  echo "[*] Using existing .env file."
fi

echo ""

# 2. Build images
echo "[*] Building Docker images..."
docker compose build --pull
echo "[✓] Build complete."
echo ""

# 3. Start services
echo "[*] Starting services..."
docker compose up -d
echo "[✓] Services started."
echo ""

# 4. Wait for health
echo "[*] Waiting for backend to become healthy..."
for i in $(seq 1 30); do
  STATUS=$(docker compose ps --format json backend 2>/dev/null | grep -o '"Health":"[^"]*"' || echo '')
  if echo "$STATUS" | grep -q 'healthy'; then
    echo "[✓] Backend is healthy!"
    break
  fi
  sleep 2
done

echo ""
echo "============================================"
echo "  Services running:"
echo "  - Frontend : http://localhost:${FRONTEND_PORT:-3000}"
echo "  - Backend  : http://localhost:${BACKEND_PORT:-8000}"
echo "  - Health   : http://localhost:${BACKEND_PORT:-8000}/api/health"
echo "============================================"
echo ""
echo "  Useful commands:"
echo "  docker compose logs -f          # tail all logs"
echo "  docker compose logs -f backend  # tail backend logs"
echo "  docker compose ps               # service status"
echo "  docker compose down             # stop all services"
echo "  scripts/stop.sh                 # stop all services"
echo "  scripts/reset.sh                # stop + remove volumes"
echo "============================================"
