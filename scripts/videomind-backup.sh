#!/bin/bash
# videomind PostgreSQL 定期备份
# 由 root crontab 每天 03:17 调用
# 备份到 /backup/videomind/，gzip 压缩，保留 7 天
# 日志：/var/log/videomind-backup.log
set -euo pipefail

BACKUP_DIR=/backup/videomind
DB_CONTAINER=videomind-postgres
DB_USER=tpaper
DB_NAME=videomind
RETAIN_DAYS=7
LOG_FILE=/var/log/videomind-backup.log

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
FILE="$BACKUP_DIR/videomind-$TIMESTAMP.sql.gz"

# pg_dump 经 docker exec，gzip 压缩
if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" 2>/dev/null | gzip > "$FILE"; then
  SIZE=$(du -h "$FILE" | cut -f1)
  echo "[$(date '+%F %T')] OK backup -> $FILE ($SIZE)" >> "$LOG_FILE"
else
  echo "[$(date '+%F %T')] FAIL backup, pg_dump error" >> "$LOG_FILE"
  rm -f "$FILE"
  exit 1
fi

# 清理超过保留期的旧备份
find "$BACKUP_DIR" -name "videomind-*.sql.gz" -mtime +$RETAIN_DAYS -delete
echo "[$(date '+%F %T')] cleaned backups older than $RETAIN_DAYS days" >> "$LOG_FILE"
