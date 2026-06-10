#!/usr/bin/env bash
# ============================================================
# cloudflare-tunnel-setup.sh — Cloudflare Tunnel 配置指南
#
# 此脚本提供交互式引导，帮助你在服务器上完成 Cloudflare Tunnel 的配置。
# 注意：部分操作（创建 Tunnel）需要在有浏览器的机器上执行，
#       也可以在 Cloudflare Dashboard 的 Zero Trust 页面操作。
# ============================================================
set -euo pipefail

echo "============================================"
echo "  Cloudflare Tunnel Setup"
echo "  HapLotes405 Wiki"
echo "============================================"
echo ""

# ============================================================
# Step 0: 前置检查
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  前置条件检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "请确认以下条件已满足："
echo ""
echo "  [ ] 1. 域名已添加到 Cloudflare"
echo "         → 在 Cloudflare Dashboard 中添加你的域名"
echo "         → 在域名注册商处修改 NS 记录为 Cloudflare 提供的 NS"
echo "         → 等待 NS 生效（通常 1-24 小时）"
echo ""
echo "  [ ] 2. 服务器可出站访问互联网"
echo "         → cloudflared 需要连接到 Cloudflare 的边缘节点"
echo "         → 测试: curl -I https://region1.v2.argotunnel.com"
echo ""
echo "  [ ] 3. Docker 已安装并运行"
echo "         → docker --version"
echo ""

read -p "确认以上条件已满足？(y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "请先满足前置条件后重新运行此脚本。"
  exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  安装 cloudflared CLI（用于创建 Tunnel）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
  . /etc/os-release
fi

CLOUDFLARED_BIN=""

if command -v cloudflared &>/dev/null; then
  echo "[✓] cloudflared 已安装: $(cloudflared --version 2>&1 | head -1)"
  CLOUDFLARED_BIN="cloudflared"
else
  echo "[*] 下载 cloudflared..."
  ARCH=$(uname -m)
  case "$ARCH" in
    x86_64)  CF_ARCH="amd64" ;;
    aarch64) CF_ARCH="arm64" ;;
    *)       echo "[!] 不支持的架构: $ARCH"; exit 1 ;;
  esac

  CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}"
  curl -fsSL "$CF_URL" -o /usr/local/bin/cloudflared
  chmod +x /usr/local/bin/cloudflared
  CLOUDFLARED_BIN="/usr/local/bin/cloudflared"
  echo "[✓] cloudflared 安装完成: $($CLOUDFLARED_BIN --version 2>&1 | head -1)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  创建 Cloudflare Tunnel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查是否已登录
echo "[*] 检查 cloudflared 登录状态..."
if ! $CLOUDFLARED_BIN tunnel list &>/dev/null; then
  echo ""
  echo "  ╔══════════════════════════════════════════════════════════╗"
  echo "  ║  需要先登录 Cloudflare                                    ║"
  echo "  ║                                                          ║"
  echo "  ║  执行以下命令后，会打开浏览器完成认证：                      ║"
  echo "  ║    cloudflared tunnel login                               ║"
  echo "  ║                                                          ║"
  echo "  ║  如果你在无 GUI 的服务器上：                                ║"
  echo "  ║    1. 在本地电脑安装 cloudflared                           ║"
  echo "  ║       https://developers.cloudflare.com/cloudflare-one/   ║"
  echo "  ║       connections/connect-networks/downloads/             ║"
  echo "  ║    2. 在本地执行: cloudflared tunnel login                 ║"
  echo "  ║    3. 然后继续在服务器上创建 tunnel                        ║"
  echo "  ╚══════════════════════════════════════════════════════════╝"
  echo ""
  read -p "是否已在本地/当前完成登录？(y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "请先完成 cloudflared tunnel login 后重新运行此脚本。"
    exit 0
  fi
fi

echo ""
echo "请输入你要使用的域名（例如: haplotest405.wiki）："
read -p "域名: " DOMAIN

if [ -z "$DOMAIN" ]; then
  echo "[!] 域名不能为空"
  exit 1
fi

TUNNEL_NAME="wiki-tunnel-$(date +%s)"

echo ""
echo "[*] 创建 Tunnel: $TUNNEL_NAME ..."
if $CLOUDFLARED_BIN tunnel create "$TUNNEL_NAME"; then
  echo "[✓] Tunnel 创建成功"
else
  echo "[!] Tunnel 创建失败。也可以前往 Cloudflare Dashboard 手动创建："
  echo "    https://one.dash.cloudflare.com/ → Networks → Tunnels → Create a tunnel"
  echo ""
  echo "    手动创建后，获取 Token 并填入 .env 的 CF_TUNNEL_TOKEN 即可。"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  配置 DNS 和 Tunnel 路由"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 获取 tunnel token
echo "[*] 获取 Tunnel Token..."
TUNNEL_TOKEN=$($CLOUDFLARED_BIN tunnel token "$TUNNEL_NAME" 2>/dev/null || echo "")

if [ -n "$TUNNEL_TOKEN" ]; then
  echo "[✓] Token: ${TUNNEL_TOKEN:0:20}..."
else
  echo "[!] 无法自动获取 token，请手动获取："
  echo "    cloudflared tunnel token $TUNNEL_NAME"
  TUNNEL_TOKEN="YOUR_TUNNEL_TOKEN_HERE"
fi

# 配置 DNS
echo ""
echo "[*] 配置 DNS 记录..."
echo "    将创建以下 DNS 记录（通过 Cloudflare API）："
echo "    CNAME  ${DOMAIN}  →  ${TUNNEL_NAME}.cfargotunnel.com"
echo "    CNAME  *.${DOMAIN}  →  ${TUNNEL_NAME}.cfargotunnel.com"
echo ""

read -p "是否自动配置 DNS？(y/n，或手动在 Cloudflare Dashboard 配置) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  $CLOUDFLARED_BIN tunnel route dns "$TUNNEL_NAME" "${DOMAIN}" || \
    echo "[*] DNS 配置可能需要手动完成"
  $CLOUDFLARED_BIN tunnel route dns "$TUNNEL_NAME" "*.${DOMAIN}" || \
    echo "[*] 通配符 DNS 配置可能需要手动完成"
else
  echo ""
  echo "  请手动在 Cloudflare Dashboard 添加以下 DNS 记录："
  echo "  ┌──────────┬──────────────────────────────────────┬──────┐"
  echo "  │  Type    │  Name                                │  TTL │"
  echo "  ├──────────┼──────────────────────────────────────┼──────┤"
  echo "  │  CNAME   │  ${DOMAIN}                            │ Auto │"
  echo "  │          │  → ${TUNNEL_NAME}.cfargotunnel.com    │      │"
  echo "  ├──────────┼──────────────────────────────────────┼──────┤"
  echo "  │  CNAME   │  *.${DOMAIN}                          │ Auto │"
  echo "  │          │  → ${TUNNEL_NAME}.cfargotunnel.com    │      │"
  echo "  └──────────┴──────────────────────────────────────┴──────┘"
  echo ""
fi

# 配置 config.yml (供 cloudflared 使用)
echo "[*] 创建 cloudflared 配置文件..."
mkdir -p /opt/wiki/cloudflared

cat > /opt/wiki/cloudflared/config.yml << EOF
# Cloudflare Tunnel 配置
tunnel: ${TUNNEL_NAME}
credentials-file: /etc/cloudflared/credentials.json

ingress:
  # 所有流量转发到内部 nginx
  - hostname: ${DOMAIN}
    service: http://nginx:80
  - hostname: "*.${DOMAIN}"
    service: http://nginx:80

  # 默认规则（必须）
  - service: http_status:404
EOF

echo "[✓] 配置已保存到 /opt/wiki/cloudflared/config.yml"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  配置项目环境变量"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 更新 .env
ENV_FILE="/opt/wiki/.env"
if [ -f "$ENV_FILE" ]; then
  # 删除旧的 CF_TUNNEL_TOKEN 行（如果存在）
  sed -i '/^CF_TUNNEL_TOKEN=/d' "$ENV_FILE"
  # 添加新的
  echo "" >> "$ENV_FILE"
  echo "# Cloudflare Tunnel Token" >> "$ENV_FILE"
  echo "CF_TUNNEL_TOKEN=${TUNNEL_TOKEN}" >> "$ENV_FILE"
  echo "[✓] CF_TUNNEL_TOKEN 已添加到 $ENV_FILE"
else
  echo "[!] $ENV_FILE 不存在，请手动创建并添加："
  echo "    CF_TUNNEL_TOKEN=${TUNNEL_TOKEN}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  启动服务"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /opt/wiki

echo "[*] 拉取最新镜像..."
docker compose -f docker-compose.prod.yml pull

echo "[*] 启动所有服务（含 cloudflared）..."
docker compose -f docker-compose.prod.yml up -d

echo "[*] 等待服务就绪..."
sleep 5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  检查状态"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

docker compose -f docker-compose.prod.yml ps

echo ""
echo "  [*] 检查 cloudflared 日志："
echo "      docker compose -f docker-compose.prod.yml logs cloudflared"
echo ""

# 检查 tunnel 状态
if docker compose -f docker-compose.prod.yml logs cloudflared 2>/dev/null | grep -q "Registered tunnel connection"; then
  echo "  [✓] Tunnel 连接成功！"
else
  echo "  [*] 等待 Tunnel 连接建立..."
  echo "      运行 'docker compose -f docker-compose.prod.yml logs -f cloudflared' 查看进度"
fi

echo ""
echo "============================================"
echo "  Setup 完成！"
echo "============================================"
echo ""
echo "  下一步："
echo "  1. 在 Cloudflare Dashboard → SSL/TLS 设置为 Full (strict)"
echo "  2. 在 Cloudflare Dashboard → SSL/TLS → Edge Certificates："
echo "     ✅ Always Use HTTPS"
echo "     ✅ Automatic HTTPS Rewrites"
echo "  3. 等待 DNS 生效后访问 https://${DOMAIN}"
echo ""
echo "  验证 Tunnel 状态："
echo "    docker compose -f docker-compose.prod.yml logs cloudflared"
echo ""
echo "  常见问题排查："
echo "    - DNS 未生效: dig ${DOMAIN} (应该指向 Cloudflare IP)"
echo "    - Tunnel 连接失败: 检查出站网络、防火墙规则"
echo "    - 502 错误: 检查 nginx 是否正常运行"
echo "============================================"
