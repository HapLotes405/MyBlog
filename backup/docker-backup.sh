#!/bin/sh
# ============================================================
# Docker Compose 主机端备份脚本
# 用法:
#   sh backup/docker-backup.sh              # 备份到 ./backup/
#   sh backup/docker-backup.sh /some/path   # 备份到指定目录
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="${1:-$SCRIPT_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$OUTPUT_DIR/wiki_backup_$TIMESTAMP.sql.gz"

echo "[Backup] Running pg_dump inside wiki-db container..."

docker exec wiki-db sh -c \
  "pg_dump -U \${POSTGRES_USER:-postgres} -d \${POSTGRES_DB:-wiki} --no-owner --no-acl" \
  | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[Backup] Done: $BACKUP_FILE ($SIZE)"

  # 清理 7 天前的旧备份
  find "$OUTPUT_DIR" -name "wiki_backup_*.sql.gz" -mtime +7 -delete
  echo "[Backup] Cleaned up backups older than 7 days"
else
  echo "[Backup] FAILED!"
  rm -f "$BACKUP_FILE"
  exit 1
fi
