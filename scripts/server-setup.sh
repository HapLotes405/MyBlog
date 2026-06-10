#!/usr/bin/env bash
# ============================================================
# server-setup.sh — ECS 服务器一键初始化脚本
#
# 用法（首次在 ECS 上执行）:
#   curl -fsSL https://raw.githubusercontent.com/haplotes405/Myblog/master/scripts/server-setup.sh | bash
#   或者:
#   ssh root@<ECS_IP> "bash -s" < scripts/server-setup.sh
# ============================================================
set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/haplotes405/Myblog/master"
PROJECT_DIR="/opt/wiki"

echo "============================================"
echo "  HapLotes405 Wiki — Server Setup"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

# ============================================================
# Step 1: Install Docker if not present
# ============================================================
echo "[1/6] Checking Docker installation..."

if ! command -v docker &>/dev/null; then
  echo "  Docker not found. Installing..."

  # Detect OS
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    case "$ID" in
      ubuntu|debian)
        apt-get update -qq
        apt-get install -y -qq ca-certificates curl
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/${ID}/gpg -o /etc/apt/keyrings/docker.asc
        chmod a+r /etc/apt/keyrings/docker.asc
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
        apt-get update -qq
        apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        ;;
      centos|rhel|alinux|alinux2|alinux3|anolis)
        # Alibaba Cloud Linux / CentOS / Anolis
        yum install -y yum-utils
        yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        ;;
      *)
        echo "  [WARN] Unknown OS: $ID. Attempting generic install..."
        curl -fsSL https://get.docker.com | sh
        ;;
    esac
  else
    curl -fsSL https://get.docker.com | sh
  fi

  systemctl enable docker
  systemctl start docker
  echo "  [✓] Docker installed"
else
  echo "  [✓] Docker found: $(docker --version)"
fi

# Verify docker compose (plugin)
if ! docker compose version &>/dev/null; then
  echo "  [WARN] docker compose plugin not found, installing..."
  DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
  mkdir -p $DOCKER_CONFIG/cli-plugins
  COMPOSE_VERSION=$(curl -fsSL https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | sed 's/.*"tag_name": "\(.*\)".*/\1/')
  curl -fsSL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o $DOCKER_CONFIG/cli-plugins/docker-compose
  chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose
fi
echo "  [✓] Docker Compose: $(docker compose version)"
echo ""

# ============================================================
# Step 2: Create project directory
# ============================================================
echo "[2/6] Creating project directory..."
mkdir -p "$PROJECT_DIR/nginx/conf.d" "$PROJECT_DIR/nginx/ssl" "$PROJECT_DIR/nginx/www" "$PROJECT_DIR/backup" "$PROJECT_DIR/cloudflared"
cd "$PROJECT_DIR"
echo "  [✓] Directory: $PROJECT_DIR"
echo ""

# ============================================================
# Step 3: Download configuration files
# ============================================================
echo "[3/6] Downloading configuration files..."

download() {
  local path="$1"
  local dest="$2"
  echo "  → $path"
  curl -fsSL "${REPO_RAW}/${path}" -o "$dest" || {
    echo "  [WARN] Failed to download $path — copy manually if needed"
  }
}

download "docker-compose.prod.yml" "docker-compose.prod.yml"
download "nginx/nginx.conf" "nginx/nginx.conf"
download "nginx/conf.d/default.conf" "nginx/conf.d/default.conf"
download "nginx/conf.d/ssl.conf.example" "nginx/conf.d/ssl.conf.example"
download "nginx/ssl/generate-certs.sh" "nginx/ssl/generate-certs.sh"
download "cloudflared/config.yml.example" "cloudflared/config.yml.example"
download "cloudflared/credentials.json.example" "cloudflared/credentials.json.example"
download "scripts/cloudflare-tunnel-setup.sh" "cloudflare-tunnel-setup.sh"
download "backup/backup.sh" "backup/backup.sh"
download "backup/restore.sh" "backup/restore.sh"
download "backup/docker-backup.sh" "backup/docker-backup.sh"

chmod +x nginx/ssl/generate-certs.sh 2>/dev/null || true
chmod +x cloudflare-tunnel-setup.sh 2>/dev/null || true
chmod +x backup/*.sh 2>/dev/null || true
echo "  [✓] Files downloaded"
echo ""

# ============================================================
# Step 4: Generate .env
# ============================================================
echo "[4/6] Setting up .env..."

if [ -f .env ]; then
  echo "  [*] .env already exists, skipping."
  echo "  To regenerate, delete .env and re-run this script."
else
  cat > .env << 'ENVEOF'
# ===== Wiki Production Environment =====
# Generated by server-setup.sh on $(date '+%Y-%m-%d %H:%M:%S')

# Database
DB_USER=postgres
DB_PASSWORD=CHANGE_ME_DB_PASSWORD
DB_NAME=wiki

# JWT
JWT_SECRET=CHANGE_ME_JWT_SECRET

# Blogger account (will be created by seed script)
BLOGGER_EMAIL=admin@hapLotes405.wiki
BLOGGER_PASSWORD=CHANGE_ME_BLOGGER_PASSWORD

# CORS
CORS_ORIGIN=http://localhost
ENVEOF

  echo "  [✓] .env created with placeholder values"
  echo ""
  echo "  ╔══════════════════════════════════════════════════════════╗"
  echo "  ║  ⚠️  IMPORTANT: Edit .env with REAL passwords NOW!       ║"
  echo "  ║                                                          ║"
  echo "  ║  vim /opt/wiki/.env                                      ║"
  echo "  ║                                                          ║"
  echo "  ║  Generate strong passwords with:                         ║"
  echo "  ║    openssl rand -hex 32                                  ║"
  echo "  ╚══════════════════════════════════════════════════════════╝"
fi
echo ""

# ============================================================
# Step 5: Pull images and start services
# ============================================================
echo "[5/6] Starting services..."

if grep -q "CHANGE_ME" .env 2>/dev/null; then
  echo "  [!] WARNING: .env still contains placeholder passwords!"
  echo "  [!] Edit /opt/wiki/.env before starting services."
  echo "  [!] Skipping service startup for safety."
  echo ""
  echo "  After editing .env, run:"
  echo "    cd /opt/wiki && docker compose -f docker-compose.prod.yml up -d"
  echo "    docker compose -f docker-compose.prod.yml exec backend node dist/db/seed.js"
else
  # Pull images
  docker compose -f docker-compose.prod.yml pull 2>/dev/null || {
    echo "  [*] Could not pull images (GHCR auth may be required)"
    echo "  [*] Run manually: docker login ghcr.io && docker compose -f docker-compose.prod.yml pull"
  }

  # Start
  if docker compose -f docker-compose.prod.yml up -d 2>/dev/null; then
    echo "  [✓] Services started"

    # Wait for health
    echo "  [*] Waiting for backend to become healthy..."
    for i in $(seq 1 30); do
      if docker compose -f docker-compose.prod.yml ps backend 2>/dev/null | grep -q 'healthy'; then
        echo "  [✓] Backend is healthy!"
        break
      fi
      sleep 2
    done
  else
    echo "  [!] Could not start services. Check:"
    echo "      cd /opt/wiki && docker compose -f docker-compose.prod.yml up -d"
  fi
fi
echo ""

# ============================================================
# Step 6: Initialize blogger account
# ============================================================
echo "[6/6] Blogger account..."
if docker compose -f docker-compose.prod.yml ps backend 2>/dev/null | grep -q 'healthy'; then
  docker compose -f docker-compose.prod.yml exec -T backend node dist/db/seed.js 2>/dev/null && \
    echo "  [✓] Blogger account initialized" || \
    echo "  [*] Seed script may have already run (this is OK)"
else
  echo "  [*] Backend not running yet. Run after startup:"
  echo "      docker compose -f docker-compose.prod.yml exec backend node dist/db/seed.js"
fi
echo ""

# ============================================================
# Done
# ============================================================
echo "============================================"
echo "  Setup complete!"
echo ""
echo "  Project dir:  /opt/wiki/"
echo "  Compose file: /opt/wiki/docker-compose.prod.yml"
echo "  Env file:     /opt/wiki/.env"
echo ""
echo "  Useful commands:"
echo "    cd /opt/wiki"
echo "    docker compose -f docker-compose.prod.yml ps"
echo "    docker compose -f docker-compose.prod.yml logs -f"
echo "    docker compose -f docker-compose.prod.yml down"
echo "    docker compose -f docker-compose.prod.yml up -d"
echo "    sh backup/docker-backup.sh"
echo "============================================"
