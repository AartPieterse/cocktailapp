#!/usr/bin/env bash
# One-command deploy for the Barkaart self-host (Part F).
#
# A release is one git commit, which CI turns into two images on GHCR tagged with its SHA:
# barkaart-api (the API) and barkaart-web (Caddy with the SPA and its Caddyfile baked in). Nothing can
# push to this box, so it PULLS them and rolls them out. Because the app is local-first, a brief API
# restart only pauses sync; every client keeps working from its cache, so downtime is invisible.
#
#   ./deploy.sh <git-sha>         # pull both images, take an encrypted DB backup, roll out, migrate
#   ./deploy.sh <sha> --api-only  # pull and roll out only the api service
#   ./deploy.sh --rollback        # redeploy the previously-running tag (saved in .deployed-previous)
#
# The compose files used are whatever is checked out. auto-deploy.sh moves the checkout to the
# release commit before it calls this, so an automatic roll-out runs that release's own files. Set
# IMAGE_REPO / WEB_IMAGE_REPO in deploy/.env if your GHCR packages differ from the defaults. The
# deployed tag is recorded in .deployed-current and the prior one in .deployed-previous, so a
# rollback is always one command away.
set -euo pipefail

cd "$(dirname "$0")"
if [ -f .env ]; then set -a; . ./.env; set +a; fi

IMAGE_REPO="${IMAGE_REPO:-ghcr.io/aartpieterse/barkaart-api}"
WEB_IMAGE_REPO="${WEB_IMAGE_REPO:-ghcr.io/aartpieterse/barkaart-web}"
CURRENT_FILE=".deployed-current"
PREVIOUS_FILE=".deployed-previous"
# Include every overlay that is actually present, so a roll-out drives the same stack that is
# running. With only the base file, `web` (defined in docker-compose.lan.yml) falls outside compose's
# view and is left behind as an orphan on every deploy.
COMPOSE=(docker compose -f docker-compose.yml)
[ -f docker-compose.lan.yml ] && COMPOSE+=(-f docker-compose.lan.yml)

log() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }

# Pull by fully-qualified ref so we deploy the exact image, not whatever :latest points at, then tag
# it as the name the compose files expect, so `up` uses the pulled image as-is.
pull_as() {
  log "Pulling $1 …"
  docker pull "$1" && docker tag "$1" "$2"
}

roll_out() {
  local tag="$1" api_only="$2"

  # Pull everything before touching anything: a missing image stops the deploy here, with the
  # running stack and the database untouched.
  pull_as "$IMAGE_REPO:$tag" barkaart-api:latest
  if [ "$api_only" != "1" ] && [ -f docker-compose.lan.yml ]; then
    pull_as "$WEB_IMAGE_REPO:$tag" barkaart-web:latest || {
      echo "No $WEB_IMAGE_REPO:$tag. Tags from before the web image existed have none —"
      echo "roll back the API alone with: ./deploy.sh $tag --api-only"
      exit 1
    }
  fi

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
    # --remove-orphans: a service deleted from the compose files (cloudflared was) would otherwise
    # leave its container behind on every host that ever ran it.
    "${COMPOSE[@]}" up -d --remove-orphans
  fi

  # Versioned user-data migrations (migrate-mongo), if configured. Runs after the backup above.
  if [ -f migrate-mongo-config.js ] && command -v npx >/dev/null; then
    log "Running database migrations …"
    npx migrate-mongo up || { echo "Migration failed — consider ./deploy.sh --rollback"; exit 1; }
  fi

  # Record deploy history for instant rollback. Redeploying the tag that is already current must not
  # shift it into .deployed-previous, or the real rollback target is lost.
  local current=""
  [ -f "$CURRENT_FILE" ] && current="$(cat "$CURRENT_FILE")"
  if [ -n "$current" ] && [ "$current" != "$tag" ]; then
    echo "$current" > "$PREVIOUS_FILE"
  fi
  echo "$tag" > "$CURRENT_FILE"
  log "Deployed $tag. Previous tag kept for rollback."
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
