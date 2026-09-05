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
#   RELEASE_BRANCH      git branch to track (default main) — set empty to skip the SPA entirely
#
# TWO things are watched, because a release is two artifacts:
#   1. the API, which CI builds into a GHCR image the box pulls;
#   2. the SPA, which is NOT in any image — CI publishes it to Netlify, and the box builds it from
#      source. So the box also tracks the release branch and rebuilds the bundle Caddy serves.
# They are checked independently: a commit that only touches the frontend produces no new API image,
# and vice versa. Each side records its own state, so a failure on one retries without redoing the
# other.
#
# GHCR auth: if the package is PRIVATE, `docker login ghcr.io` once on the box with a PAT that has
# read:packages (outbound-only, fine behind the tunnel). If it's public, no login is needed.
set -euo pipefail

cd "$(dirname "$0")"
if [ -f .env ]; then set -a; . ./.env; set +a; fi

IMAGE_REPO="${IMAGE_REPO:-ghcr.io/aartpieterse/barkast-api}"
WATCH_TAG="${WATCH_TAG:-latest}"
RELEASE_BRANCH="${RELEASE_BRANCH-main}"
STATE_FILE=".autodeploy-digest"
SPA_STATE_FILE=".autodeploy-spa-commit"
REPO_ROOT="$(cd .. && pwd)"

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

# ── SPA: track the release branch and rebuild the bundle Caddy serves ────────────────────────────
# Caddy bind-mounts frontend/dist/frontend/browser (docker-compose.lan.yml), so a rebuild is picked
# up without recreating the container. Reload rather than restart: Caddy re-reads its config and
# keeps serving throughout, so there is no window where the app 502s.
check_spa() {
  [ -n "$RELEASE_BRANCH" ] || return 0
  command -v git >/dev/null 2>&1 || { echo "git not available — skipping SPA check."; return 0; }

  log "Checking origin/${RELEASE_BRANCH} for new commits …"
  git -C "$REPO_ROOT" fetch -q origin "$RELEASE_BRANCH" || { echo "fetch failed — skipping this cycle."; return 0; }

  local remote local_head
  remote="$(git -C "$REPO_ROOT" rev-parse "origin/${RELEASE_BRANCH}")"
  local_head="$(cat "$SPA_STATE_FILE" 2>/dev/null || true)"
  if [ "$remote" = "$local_head" ]; then
    log "SPA already at ${remote:0:12} — nothing to do."
    return 0
  fi

  log "New commit ${remote:0:12} on ${RELEASE_BRANCH} → rebuilding the SPA"
  # --hard, not merge: the box is a deploy target, never a place work is authored. A dirty tree here
  # is drift to be discarded, and a merge conflict at 03:00 would leave the checkout wedged.
  git -C "$REPO_ROOT" checkout -q "$RELEASE_BRANCH" 2>/dev/null || git -C "$REPO_ROOT" checkout -q -b "$RELEASE_BRANCH" "origin/$RELEASE_BRANCH"
  git -C "$REPO_ROOT" reset -q --hard "origin/${RELEASE_BRANCH}"

  # npm ci, not install: the lockfile is the release. Skipping it entirely would silently build
  # against whatever happened to be installed when the box was last touched by hand.
  ( cd "$REPO_ROOT" && npm ci --no-audit --no-fund >/dev/null 2>&1 ) || { echo "npm ci failed — leaving the previous bundle in place."; return 1; }
  ( cd "$REPO_ROOT" && npm run build:shared >/dev/null       && npm run build:catalog >/dev/null       && npm run build --workspace frontend >/dev/null ) || { echo "frontend build failed — leaving the previous bundle in place."; return 1; }

  docker compose -f docker-compose.yml -f docker-compose.lan.yml exec -T web caddy reload --config /etc/caddy/Caddyfile 2>/dev/null     || docker compose -f docker-compose.yml -f docker-compose.lan.yml restart web >/dev/null

  echo "$remote" > "$SPA_STATE_FILE"   # only after a successful build, so a failure retries
  log "SPA now serving ${remote:0:12}."
}

run_cycle() {
  local rc=0
  check_once || rc=1
  check_spa  || rc=1
  return $rc
}

if [ "${1:-}" = "--watch" ]; then
  interval="${AUTODEPLOY_INTERVAL:-300}"
  log "Watch mode — polling every ${interval}s. Ctrl-C to stop."
  while true; do
    run_cycle || echo "check failed — will retry next cycle"
    sleep "$interval"
  done
else
  run_cycle
fi
