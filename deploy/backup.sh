#!/usr/bin/env bash
# Encrypted MongoDB backup for the Barkast self-host.
#
# Dumps the Mongo container and encrypts the archive with `age` BEFORE it touches disk — the dump
# (which contains user emails + password hashes) is never written in plaintext. Run nightly via
# cron/systemd-timer, then copy the newest .age file OFF the box and TEST restores regularly.
#
# Requires: docker compose, age (https://github.com/FiloSottile/age).
# Config comes from deploy/.env (MONGO_USER/PASSWORD/DB, AGE_RECIPIENT, BACKUP_DIR, BACKUP_KEEP).
set -euo pipefail

cd "$(dirname "$0")"
if [ -f .env ]; then set -a; . ./.env; set +a; fi

: "${MONGO_USER:?set in deploy/.env}"
: "${MONGO_PASSWORD:?set in deploy/.env}"
: "${MONGO_DB:?set in deploy/.env}"
: "${AGE_RECIPIENT:?set AGE_RECIPIENT (age public key) in deploy/.env}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP="${BACKUP_KEEP:-14}"

command -v age >/dev/null || { echo "age is not installed"; exit 1; }

mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUP_DIR/barkast-$stamp.archive.gz.age"

echo "Dumping Mongo → $out (encrypted)…"
# mongodump streams a gzip archive to stdout; age encrypts it straight to the output file.
docker compose exec -T mongo mongodump \
  --username "$MONGO_USER" --password "$MONGO_PASSWORD" --authenticationDatabase admin \
  --db "$MONGO_DB" --archive --gzip \
  | age -r "$AGE_RECIPIENT" -o "$out"

# Retain only the newest $KEEP encrypted dumps.
echo "Pruning to the newest $KEEP backups…"
ls -1t "$BACKUP_DIR"/barkast-*.archive.gz.age 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

count="$(ls -1 "$BACKUP_DIR"/barkast-*.archive.gz.age 2>/dev/null | wc -l | tr -d ' ')"
echo "Done. $count encrypted backup(s) retained in $BACKUP_DIR."
echo "REMEMBER: copy $out off-box, and periodically verify with deploy/restore.sh."
