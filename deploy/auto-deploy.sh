#!/usr/bin/env bash
# Automatic pull-deploy for the Barkast self-host (Part F — the "no manual step" upgrade).
#
# The box has NO inbound ports (the Cloudflare Tunnel dials outbound), so deploys can't be pushed
# to it — they must be PULLED. This script polls GHCR for a newer image on the watched tag
# (:latest by default) and, when the digest changes, hands off to deploy.sh so every automatic
# roll-out still gets the same safety as a manual one:
#     pre-deploy encrypted backup  →  roll out  →  DB migrations  →  rollback history
# (That's why we don't use plain Watchtower here: it would pull-and-restart with none of that.)
#
#   bash auto-deploy.sh         # check once and exit (this is what the systemd timer runs)
#   bash auto-deploy.sh --watch # loop in-process every AUTODEPLOY_INTERVAL seconds
#
# Env (all optional; put in deploy/.env):
#   IMAGE_REPO          GHCR package        (default ghcr.io/aartpieterse/barkast-api)
#   WATCH_TAG           tag to follow       (default latest)
#   AUTODEPLOY_INTERVAL --watch poll seconds (default 300)
#
# GHCR auth: if the package is PRIVATE, `docker login ghcr.io` once on the box with a PAT that has
# read:packages (outbound-only, fine behind the tunnel). If it's public, no login is needed.
set -euo pipefail

cd "$(dirname "$0")"
if [ -f .env ]; then set -a; . ./.env; set +a; fi

IMAGE_REPO="${IMAGE_REPO:-ghcr.io/aartpieterse/barkast-api}"
WATCH_TAG="${WATCH_TAG:-latest}"
STATE_FILE=".autodeploy-digest"

log() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }

check_once() {
  log "Checking ${IMAGE_REPO}:${WATCH_TAG} for a new image …"
  docker pull -q "${IMAGE_REPO}:${WATCH_TAG}" >/dev/null

  # Digest of exactly what we just pulled — the stable identity to compare against.
  local new_digest
  new_digest="$(docker image inspect "${IMAGE_REPO}:${WATCH_TAG}" \
    --format '{{index .RepoDigests 0}}' 2>/dev/null || true)"
  new_digest="${new_digest##*@}"
  [ -n "$new_digest" ] || { echo "Could not read image digest — skipping this cycle."; return 0; }

  local old_digest=""
  [ -f "$STATE_FILE" ] && old_digest="$(cat "$STATE_FILE")"
  if [ "$new_digest" = "$old_digest" ]; then
    log "Already on ${new_digest} — nothing to do."
    return 0
  fi

  # Map the watched tag back to the exact immutable git-sha tag (stamped as an OCI label by CI),
  # so deploy.sh records a precise rollback target instead of the moving :latest.
  local sha
  sha="$(docker image inspect "${IMAGE_REPO}:${WATCH_TAG}" \
    --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' 2>/dev/null || true)"
  if [ -z "$sha" ] || [ "$sha" = "<no value>" ]; then
    echo "Image carries no revision label — falling back to :${WATCH_TAG} (rollback less precise)."
    sha="$WATCH_TAG"
  fi

  log "New image ${new_digest} → deploying tag ${sha}"
  ./deploy.sh "$sha"                 # backup → roll out → migrate → record rollback history
  echo "$new_digest" > "$STATE_FILE" # only after a successful deploy, so a failure retries next cycle
  log "Auto-deploy complete."
}

if [ "${1:-}" = "--watch" ]; then
  interval="${AUTODEPLOY_INTERVAL:-300}"
  log "Watch mode — polling every ${interval}s. Ctrl-C to stop."
  while true; do
    check_once || echo "check failed — will retry next cycle"
    sleep "$interval"
  done
else
  check_once
fi
