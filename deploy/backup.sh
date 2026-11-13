#!/bin/sh
set -eu

backupHour=3
keepDays="${BACKUP_KEEP_DAYS:-14}"

runBackup() {
  fileName="/backups/ishelf-$(date +%Y-%m-%d).dump"
  pg_dump --format=custom --file="$fileName.partial"
  mv "$fileName.partial" "$fileName"
  find /backups -name 'ishelf-*.dump' -mtime +"$keepDays" -delete
  echo "Backup written to $fileName"
}

if [ ! -f "/backups/ishelf-$(date +%Y-%m-%d).dump" ]; then
  runBackup
fi

while true; do
  nextRun=$(date -d "tomorrow $backupHour:00" +%s)
  if [ "$(date +%H)" -lt "$backupHour" ]; then
    nextRun=$(date -d "today $backupHour:00" +%s)
  fi
  sleep $((nextRun - $(date +%s)))
  runBackup || echo "Backup failed" >&2
done
