#!/usr/bin/env bash
# Резервная копия базы INSIDA: bash scripts/backup.sh
# Нужна утилита pg_dump (входит в PostgreSQL). Копия попадает в папку backups/.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; source .env; set +a; fi
: "${DATABASE_URL:?Не задан DATABASE_URL}"
mkdir -p backups
FILE="backups/insida-$(date +%Y-%m-%d_%H-%M).dump"
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" -f "$FILE"
echo "✓ Резервная копия: $FILE ($(du -h "$FILE" | cut -f1))"
# Храним 14 последних копий
ls -1t backups/*.dump 2>/dev/null | tail -n +15 | xargs -r rm --
