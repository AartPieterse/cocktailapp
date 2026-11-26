#!/usr/bin/env bash
# Automatic pull-deploy for the Barkaart self-host (Part F — the "no manual step" upgrade).
#
# Nothing can push to this box, so releases are PULLED. A release is one commit on the release
# branch, and CI turns it into two images tagged with that commit's SHA: barkaart-api, and
# barkaart-web (the SPA baked into Caddy). Each cycle this script:
#   1. fetches the release branch, and stops if its head is the commit it last deployed;
#   2. waits — changing nothing — until BOTH images for that commit are on GHCR, which is a few
#      minutes after the merge;
#   3. moves the checkout to that commit, so the compose files and deploy.sh that roll the release
#      out are its own and not the previous release's;
#   4. hands off to deploy.sh, so an automatic roll-out gets the same safety as a manual one:
#        pull both images  →  pre-deploy encrypted backup  →  roll out  →  DB migrations  →  history
#      (That's why we don't use plain Watchtower here: it would pull-and-restart with none of that.)
# Nothing is built on the box: it needs git and docker, not node.
#
#   bash auto-deploy.sh         # check once and exit (this is what the systemd timer runs)
#   bash auto-deploy.sh --watch # loop in-process every AUTODEPLOY_INTERVAL seconds
#
# Success is recorded only after deploy.sh finishes, so a failed cycle retries on the next tick. A
# manual `deploy.sh <tag>` or `--rollback` is left alone until the release branch moves again.
#
# Env (all optional; put in deploy/.env):
#   IMAGE_REPO          API image            (default ghcr.io/aartpieterse/barkaart-api)
#   WEB_IMAGE_REPO      web image            (default ghcr.io/aartpieterse/barkaart-web)
#   RELEASE_BRANCH      git branch to track  (default main)
#   AUTODEPLOY_INTERVAL --watch poll seconds (default 300)
#
# GHCR auth: the box pulls anonymously, so both packages must be PUBLIC. A package CI pushes for the
# first time can start out private — make it public on GitHub, or `docker login ghcr.io` once on the
# box with a PAT that has read:packages.
set -euo pipefail

cd "$(dirname "$0")"
if [ -f .env ]; then set -a; . ./.env; set +a; fi

IMAGE_REPO="${IMAGE_REPO:-ghcr.io/aartpieterse/barkaart-api}"
WEB_IMAGE_REPO="${WEB_IMAGE_REPO:-ghcr.io/aartpieterse/barkaart-web}"
RELEASE_BRANCH="${RELEASE_BRANCH:-main}"
STATE_FILE=".autodeploy-commit"
REPO_ROOT="$(cd .. && pwd)"

log() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }

# Each step checks its own status instead of leaning on `set -e`, which bash switches off inside a
# function called from the left of `||` — as the --watch loop calls this one.
check_once() {
  log "Checking origin/${RELEASE_BRANCH} for a new release …"
  git -C "$REPO_ROOT" fetch -q origin "$RELEASE_BRANCH" || { echo "git fetch failed — retrying next cycle."; return 1; }

  local target last
  target="$(git -C "$REPO_ROOT" rev-parse "origin/${RELEASE_BRANCH}")" || return 1
  last="$(cat "$STATE_FILE" 2>/dev/null || true)"
  if [ "$target" = "$last" ]; then
    log "Already on ${target:0:12} — nothing to do."
    return 0
  fi

  local repo
  for repo in "$IMAGE_REPO" "$WEB_IMAGE_REPO"; do
    if ! docker manifest inspect "$repo:$target" >/dev/null 2>&1; then
      log "${repo}:${target:0:12} is not on the registry yet — retrying next cycle."
      echo "Normal for a few minutes after a merge. If it persists: did CI's image job fail, or is the package private?"
      return 0
    fi
  done

  log "New release ${target:0:12} on ${RELEASE_BRANCH} → moving the checkout and deploying"
  # -f, not a merge: the box is a deploy target, never a place work is authored, so a change to a
  # tracked file here is drift to discard — not a conflict to resolve at 03:00. Untracked files (.env,
  # backups, the state files) are left alone. git writes a changed file as a new file instead of
  # rewriting it in place, so the copy of this script bash is still reading stays intact.
  git -C "$REPO_ROOT" checkout -q -f -B "$RELEASE_BRANCH" "$target" || { echo "checkout failed — retrying next cycle."; return 1; }

  ./deploy.sh "$target" || { echo "deploy.sh failed — retrying next cycle. ./deploy.sh --rollback restores the previous release."; return 1; }
  echo "$target" > "$STATE_FILE"   # only after a successful deploy, so a failure retries next cycle
  log "Auto-deploy of ${target:0:12} complete."
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
