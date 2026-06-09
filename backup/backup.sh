#!/bin/sh
# ============================================================
# PostgreSQL 数据库备份脚本
# 用法:
#   docker exec wiki-db sh /backup/backup.sh     # 在容器内运行
#   docker compose exec db sh /backup/backup.sh   # 通过 compose
# ============================================================

set -e

BACKUP_DIR="/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/wiki_backup_$TIMESTAMP.sql.gz"

echo "[Backup] Starting backup at $(date)"

pg_dump -U "${POSTGRES_USER:-postgres}" \
        -d "${POSTGRES_DB:-wiki}" \
        --no-owner \
        --no-acl \
  | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[Backup] Done: $BACKUP_FILE ($SIZE)"

  # 只保留最近 7 天的备份
  find "$BACKUP_DIR" -name "wiki_backup_*.sql.gz" -mtime +7 -delete
  echo "[Backup] Cleaned up backups older than 7 days"
else
  echo "[Backup] FAILED!"
  exit 1
fi
