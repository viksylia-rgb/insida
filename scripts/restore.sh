#!/usr/bin/env bash
# Восстановление из копии: bash scripts/restore.sh backups/insida-ДАТА.dump
# ВНИМАНИЕ: текущие данные в базе DATABASE_URL будут заменены.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; source .env; set +a; fi
: "${DATABASE_URL:?Не задан DATABASE_URL}"
FILE="${1:?Укажите файл копии}"
read -r -p "Заменить данные в базе копией $FILE? Введите yes: " OK
[ "$OK" = "yes" ] || { echo "Отменено"; exit 1; }
pg_restore --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" "$FILE"
echo "✓ Восстановлено"
