#!/bin/sh
# ============================================================
# PostgreSQL 数据库恢复脚本
# 用法:
#   docker exec wiki-db sh /backup/restore.sh wiki_backup_20260101_120000.sql.gz
# ============================================================

set -e

BACKUP_DIR="/backup"
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: restore.sh <backup_file>"
  echo ""
  echo "Available backups:"
  ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "  (none found)"
  exit 1
fi

if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ] && [ ! -f "$BACKUP_FILE" ]; then
  echo "[Restore] ERROR: File not found: $BACKUP_FILE"
  exit 1
fi

# Use absolute path if relative
case "$BACKUP_FILE" in
  /*) FULL_PATH="$BACKUP_FILE" ;;
  *)  FULL_PATH="$BACKUP_DIR/$BACKUP_FILE" ;;
esac

echo "[Restore] WARNING: This will overwrite the current database!"
echo "[Restore] Target: ${POSTGRES_DB:-wiki}"
echo "[Restore] Source: $FULL_PATH"
echo "[Restore] Press Ctrl+C to cancel, or wait 5 seconds..."
sleep 5

echo "[Restore] Restoring from $FULL_PATH ..."
gunzip -c "$FULL_PATH" | psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-wiki}"

if [ $? -eq 0 ]; then
  echo "[Restore] Done! Database restored successfully."
else
  echo "[Restore] FAILED!"
  exit 1
fi
