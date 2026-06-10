#!/usr/bin/env bash
# ============================================================
# server-deploy.sh — CI/CD 远程部署脚本
# 由 GitHub Actions 通过 SSH 在 ECS 服务器上执行
#
# 用法（GitHub Actions 中）:
#   ssh user@host "bash -s" < scripts/server-deploy.sh
# ============================================================
set -euo pipefail

PROJECT_DIR="/opt/wiki"
COMPOSE_FILE="docker-compose.prod.yml"

cd "$PROJECT_DIR"

echo "============================================"
echo "  Wiki Deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

# ---- 1. Login to GHCR (optional but recommended for rate limiting) ----
if [ -n "${GHCR_PAT:-}" ]; then
  echo "[1/5] Logging in to GHCR..."
  echo "$GHCR_PAT" | docker login ghcr.io -u "${GHCR_USER:-haplotes405}" --password-stdin
  echo "[✓] Logged in"
else
  echo "[1/5] Skipping GHCR login (GHCR_PAT not set — pulling as anonymous, rate-limited)"
fi
echo ""

# ---- 2. Pull latest images ----
echo "[2/5] Pulling latest images..."
docker compose -f "$COMPOSE_FILE" pull
echo "[✓] Images pulled"
echo ""

# ---- 3. Restart services ----
echo "[3/5] Restarting services..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
echo "[✓] Services started"
echo ""

# ---- 4. Health check ----
echo "[4/5] Waiting for backend health check..."
for i in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" ps backend 2>/dev/null | grep -q 'healthy'; then
    echo "[✓] Backend is healthy!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[!] Backend health check timed out after 60s. Check logs:"
    echo "    docker compose -f $COMPOSE_FILE logs backend"
  fi
  sleep 2
done
echo ""

# ---- 5. Verify Cloudflare Tunnel ----
echo "[5/5] Checking Cloudflare Tunnel..."
sleep 3
if docker compose -f "$COMPOSE_FILE" logs cloudflared 2>/dev/null | grep -q "Registered tunnel connection"; then
  echo "[✓] Cloudflare Tunnel connected"
else
  echo "[*] Cloudflare Tunnel status — check logs:"
  echo "    docker compose -f $COMPOSE_FILE logs cloudflared"
fi
echo ""

# ---- Cleanup old images ----
echo "[*] Pruning unused images..."
docker image prune -f
echo "[✓] Prune complete"
echo ""

# ---- Status ----
echo "============================================"
echo "  Deploy complete!"
echo "  Containers:"
docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo "============================================"
