#!/bin/sh
# ============================================================
# 生成自签名 SSL 证书（仅用于本地开发/测试）
# 生产环境请使用 Let's Encrypt (certbot)
# ============================================================

set -e

SSL_DIR="$(cd "$(dirname "$0")" && pwd)"
CERT_FILE="$SSL_DIR/fullchain.pem"
KEY_FILE="$SSL_DIR/privkey.pem"

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
  echo "[SSL] Certificates already exist in $SSL_DIR"
  echo "  Cert: $CERT_FILE"
  echo "  Key:  $KEY_FILE"
  echo "  To regenerate, delete them and re-run this script."
  exit 0
fi

echo "[SSL] Generating self-signed certificate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -subj "/C=CN/ST=Local/L=Local/O=Dev/OU=Dev/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"

chmod 644 "$CERT_FILE"
chmod 600 "$KEY_FILE"

echo "[SSL] Done!"
echo "  Cert: $CERT_FILE"
echo "  Key:  $KEY_FILE"
echo ""
echo "  ⚠️  Self-signed cert — browser will show a warning. OK for local testing."
echo "  For production, use: docker compose -f docker-compose.prod.yml run --rm certbot"
