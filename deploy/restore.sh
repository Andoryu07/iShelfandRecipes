#!/bin/sh
set -eu

if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then
  echo "Usage: deploy/restore.sh backups/ishelf-YYYY-MM-DD.dump" >&2
  exit 1
fi

backupFile="$1"
cd "$(dirname "$0")/.."
compose="docker compose -f docker-compose.production.yml"

echo "Restoring $backupFile. The application is stopped meanwhile."
$compose stop backend worker
$compose exec -T database sh -c 'pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$backupFile"
$compose start backend worker
echo "Restore finished."
