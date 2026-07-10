#!/usr/bin/env bash
# One-command deploy for the Barkast self-host (Part F).
#
# The box PULLS a version-tagged image from GHCR (outbound-only — works behind the Cloudflare
# Tunnel with no inbound ports) and rolls it out. Because the app is local-first, a brief API
# restart only pauses sync; every client keeps working from its cache, so downtime is invisible.
#
#   ./deploy.sh <image-tag>       # pull that tag, take an encrypted DB backup, run migrations, roll out
#   ./deploy.sh <tag> --api-only  # roll out only the api service (no mongo/cloudflared restart)
#   ./deploy.sh --rollback        # redeploy the previously-running tag (saved in .deployed-previous)
#
# The image ref is IMAGE_REPO:<tag> (default ghcr.io/aartpieterse/barkast-api). Set IMAGE_REPO in
# deploy/.env to match your GHCR package. The currently-deployed tag is recorded in .deployed-current
# and the prior one in .deployed-previous, so a rollback is always one command away.
set -euo pipefail

cd "$(dirname "$0")"
if [ -f .env ]; then set -a; . ./.env; set +a; fi

IMAGE_REPO="${IMAGE_REPO:-ghcr.io/aartpieterse/barkast-api}"
CURRENT_FILE=".deployed-current"
PREVIOUS_FILE=".deployed-previous"
COMPOSE=(docker compose -f docker-compose.yml)

log() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }

roll_out() {
  local tag="$1" api_only="$2"
  export IMAGE_REF="$IMAGE_REPO:$tag"
  log "Pulling $IMAGE_REF …"
  # Pull by fully-qualified ref so we deploy the exact image, not whatever :latest points at.
  docker pull "$IMAGE_REF"
  # Tag it as the image name the compose file expects, so `up` uses the pulled image as-is.
  docker tag "$IMAGE_REF" barkast-api:latest

  # Pre-migration safety: an encrypted dump before any schema/data change (no-op if age unset).
  if [ -x ./backup.sh ] && [ -n "${AGE_RECIPIENT:-}" ]; then
    log "Taking a pre-deploy encrypted backup …"
    ./backup.sh || { echo "Backup failed — aborting deploy."; exit 1; }
  else
    log "Skipping backup (AGE_RECIPIENT not set)."
  fi

  if [ "$api_only" = "1" ]; then
    log "Rolling out api only …"
    "${COMPOSE[@]}" up -d --no-deps api
  else
    log "Rolling out full stack …"
    "${COMPOSE[@]}" up -d
  fi

  # Versioned user-data migrations (migrate-mongo), if configured. Runs after the backup above.
  if [ -f migrate-mongo-config.js ] && command -v npx >/dev/null; then
    log "Running database migrations …"
    npx migrate-mongo up || { echo "Migration failed — consider ./deploy.sh --rollback"; exit 1; }
  fi

  # Record deploy history for instant rollback.
  [ -f "$CURRENT_FILE" ] && cp "$CURRENT_FILE" "$PREVIOUS_FILE"
  echo "$tag" > "$CURRENT_FILE"
  log "Deployed $IMAGE_REF. Previous tag kept for rollback."
}

case "${1:-}" in
  --rollback)
    [ -f "$PREVIOUS_FILE" ] || { echo "No previous deploy recorded ($PREVIOUS_FILE missing)."; exit 1; }
    prev="$(cat "$PREVIOUS_FILE")"
    log "Rolling back to $prev …"
    roll_out "$prev" "0"
    ;;
  "" | -h | --help)
    grep '^#' "$0" | sed 's/^# \{0,1\}//'
    ;;
  *)
    tag="$1"
    api_only="0"
    [ "${2:-}" = "--api-only" ] && api_only="1"
    roll_out "$tag" "$api_only"
    ;;
esac
