#!/usr/bin/env bash
# Restore a Barkast MongoDB backup produced by backup.sh.
#
#   ./restore.sh backups/barkast-20260101T030000Z.archive.gz.age
#
# DECRYPTS with your age PRIVATE key and restores into the running Mongo container with --drop
# (matching collections are replaced). Test this regularly against a throwaway db — a backup you
# have never restored is not a backup.
#
# Requires: docker compose, age. Config from deploy/.env (MONGO_USER/PASSWORD/DB, AGE_KEY_FILE).
set -euo pipefail

cd "$(dirname "$0")"
if [ -f .env ]; then set -a; . ./.env; set +a; fi

: "${MONGO_USER:?set in deploy/.env}"
: "${MONGO_PASSWORD:?set in deploy/.env}"
: "${MONGO_DB:?set in deploy/.env}"
: "${AGE_KEY_FILE:?set AGE_KEY_FILE (path to your age identity/private key) in deploy/.env or the env}"
archive="${1:?Usage: restore.sh <backup.archive.gz.age>}"

command -v age >/dev/null || { echo "age is not installed"; exit 1; }
[ -f "$archive" ] || { echo "No such backup: $archive"; exit 1; }

echo "Restoring $archive into Mongo db '$MONGO_DB' (DROPS matching collections)…"
age -d -i "$AGE_KEY_FILE" "$archive" \
  | docker compose exec -T mongo mongorestore \
      --username "$MONGO_USER" --password "$MONGO_PASSWORD" --authenticationDatabase admin \
      --archive --gzip --drop
echo "Restore complete."
