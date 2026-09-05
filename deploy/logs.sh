#!/usr/bin/env bash
# Read the Barkast stack's logs — from the box, or from your laptop over SSH.
#
# Runs either side. If docker is present locally it reads directly; otherwise it SSHes to the box, so
# the same command works from your dev machine and from the box itself.
#
#   ./logs.sh                     # last 100 lines of every container
#   ./logs.sh api                 # one service: api | mongo | web
#   ./logs.sh api -f              # follow live (Ctrl-C stops watching, not the container)
#   ./logs.sh --since 30m         # only the last 30 minutes (30m, 2h, 2026-09-05T09:00)
#   ./logs.sh api --since 1h -f   # combine freely
#   ./logs.sh --errors            # filter to error/warn/exception lines across all containers
#   ./logs.sh --system            # the host's journal instead of containers (boot errors, docker, ssh)
#   ./logs.sh --sizes             # how much disk each container's log is using
#   ./logs.sh --grep "CORS"       # search all container logs
#
# Override the box with BOX=user@host, and the key with SSH_KEY=/path/to/key.
#
# Containers are found by their compose project label rather than by name or by -f flags, so this
# keeps working when overlays change which compose files are in play (docker-compose.lan.yml adds
# `web`, which a plain `-f docker-compose.yml logs` cannot see).
set -euo pipefail

BOX="${BOX:-aart@192.168.1.100}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_barkast}"
PROJECT="${COMPOSE_PROJECT:-barkast}"
TAIL="${TAIL:-100}"

log()  { printf '\033[1;36m▸ %s\033[0m\n' "$*" >&2; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*" >&2; }

# Answer --help here, before any SSH hop. Remotely this script arrives on stdin, so $0 is
# "bash" and the header cannot be read back out of it.
case " $* " in *" -h "*|*" --help "*)
  if [ -r "$0" ]; then sed -n "2,/^$/p" "$0" | sed -e "s/^# //" -e "s/^#$//"
  else echo "usage: logs.sh [service] [-f] [--since T] [--tail N] [--errors|--system|--sizes|--grep P]"; fi
  exit 0 ;;
esac

# Decide which side we are on. The test is "are the containers HERE", not "is docker installed" —
# a dev laptop can have Docker Desktop present with its daemon stopped, which passes `command -v`
# and then fails on every call.
have_local() {
  command -v docker >/dev/null 2>&1 &&
    docker ps -a --filter "label=com.docker.compose.project=$PROJECT"       --format '{{.Names}}' 2>/dev/null | grep -q .
}

# Re-run this same script on the box. It is sent over stdin so the box never needs a checkout of it,
# and "$@" is forwarded verbatim.
if ! have_local; then
  [ -f "$SSH_KEY" ] || { warn "Project '$PROJECT' is not running here and there is no SSH key at $SSH_KEY — set SSH_KEY=…"; exit 1; }
  log "Project '$PROJECT' not running locally; reading $BOX over SSH"
  # -t only when following, so Ctrl-C reaches the remote process; otherwise keep output pipe-clean.
  sshopts=(-i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=15)
  case " $* " in *" -f "*|*" --follow "*) sshopts+=(-t) ;; esac
  exec ssh "${sshopts[@]}" "$BOX" "bash -s -- $*" < "$0"
fi

containers() { docker ps -a --filter "label=com.docker.compose.project=$PROJECT" --format '{{.Names}}' | sort; }

resolve() {  # service name -> container name, tolerating both `api` and `barkast-api-1`
  local want="$1" c
  for c in $(containers); do
    [ "$c" = "$want" ] && { echo "$c"; return; }
    [ "$c" = "$PROJECT-$want-1" ] && { echo "$c"; return; }
  done
  warn "No container for '$want' in project '$PROJECT'. Available:"; containers >&2; exit 1
}

SERVICE=""; FOLLOW=""; SINCE=""; MODE="logs"; PATTERN=""
while [ $# -gt 0 ]; do
  case "$1" in
    -f|--follow) FOLLOW="--follow" ;;
    --since)     SINCE="--since ${2:?--since needs a value}"; shift ;;
    --tail)      TAIL="${2:?--tail needs a value}"; shift ;;
    --errors)    MODE="errors" ;;
    --system)    MODE="system" ;;
    --sizes)     MODE="sizes" ;;
    --grep)      MODE="grep"; PATTERN="${2:?--grep needs a pattern}"; shift ;;
    -*)          warn "Unknown flag: $1"; exit 1 ;;
    *)           SERVICE="$1" ;;
  esac
  shift
done

case "$MODE" in
  system)
    log "Host journal — errors this boot"
    sudo journalctl -p err -b --no-pager | tail -n "$TAIL"
    ;;

  sizes)
    log "Container log sizes (json-file driver writes these unbounded unless daemon.json caps them)"
    total=0
    for c in $(containers); do
      f=$(docker inspect --format '{{.LogPath}}' "$c" 2>/dev/null) || continue
      [ -n "$f" ] || continue
      b=$(sudo stat -c %s "$f" 2>/dev/null || echo 0); total=$((total + b))
      printf '  %-20s %8s\n' "$c" "$(numfmt --to=iec --suffix=B "$b" 2>/dev/null || echo "${b}B")"
    done
    printf '  %-20s %8s\n' "TOTAL" "$(numfmt --to=iec --suffix=B "$total" 2>/dev/null || echo "${total}B")"
    docker info --format '{{.LoggingDriver}}' | grep -q json-file &&
      [ ! -f /etc/docker/daemon.json ] &&
      warn "No /etc/docker/daemon.json — these grow without bound. See docs/plans/next-phase.md step 2."
    ;;

  errors|grep)
    if [ "$MODE" = errors ]; then pat='ERROR|WARN|Exception|FATAL|panic|refused|failed|denied'
    else pat="$PATTERN"; fi
    log "Searching for /$pat/ across ${SERVICE:-all containers}"
    for c in $([ -n "$SERVICE" ] && resolve "$SERVICE" || containers); do
      out=$(docker logs --tail "$TAIL" $SINCE "$c" 2>&1 | grep -iE "$pat" || true)
      [ -n "$out" ] && { printf '\033[1;35m── %s ──\033[0m\n' "$c"; printf '%s\n' "$out"; }
    done
    ;;

  logs)
    if [ -n "$SERVICE" ]; then
      exec docker logs --tail "$TAIL" --timestamps $SINCE $FOLLOW "$(resolve "$SERVICE")" 2>&1
    fi
    for c in $(containers); do
      printf '\033[1;35m── %s ──\033[0m\n' "$c"
      docker logs --tail "$TAIL" --timestamps $SINCE "$c" 2>&1 || true
    done
    [ -n "$FOLLOW" ] && warn "-f needs a single service, e.g. ./logs.sh api -f"
    ;;
esac
