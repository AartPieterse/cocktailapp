# Barkaart self-hosting (Part C)

Run Barkaart from home on a dedicated laptop. Docker Compose runs three services: the **API**, a
locked-down **MongoDB**, and a **Caddy** (`web`) whose image has the production SPA baked in. Mongo
and the API publish no host port; only Caddy does, on `:80`.

The box in service is **`aartfileserver` (Ubuntu Server 24.04.4), reachable over the home LAN and
WireGuard only** — no public hostname, no TLS, no account data. Caddy serves static files and has no
`/api` proxy, so the API answers nothing outside the container network. The route to a public
address is [`../docs/plans/public-access.md`](../docs/plans/public-access.md).

```
iba-cocktails-seed.json ──db:seed──▶ MongoDB ◀──▶ API (:3000, internal only)
                                                       │
                                     Caddy `web` ──▶ SPA on :80 (LAN + WireGuard)
```

## Files
| File | Purpose |
|---|---|
| `../backend/Dockerfile` | Multi-stage API image, `barkaart-api` (build context = repo root). |
| `../frontend/Dockerfile` | Multi-stage web image, `barkaart-web`: builds the SPA, bakes it and `Caddyfile.lan` into Caddy. |
| `docker-compose.yml` | `api` + `mongo` (locked down). |
| `docker-compose.lan.yml` | **The overlay in service:** adds the Caddy `web` service on `:80`. |
| `Caddyfile.lan` | Caddy's config, baked into the web image: static SPA, SPA fallback, cache rules. No `/api` proxy. |
| `docker-compose.seed.yml` | One-time override: bind Mongo to `127.0.0.1` for seeding. |
| `docker-compose.admin.yml` | Overlay: publish the API on the LAN (`:8080`) for the admin dashboard. Not in use. |
| `.env.example` | Copy to `.env` and fill in secrets (gitignored). |
| `backup.sh` / `restore.sh` | Encrypted (`age`) `mongodump` + restore. |
| `deploy.sh` | Pull a release's two GHCR images by tag, back up, roll out, migrate; `--rollback`. |
| `auto-deploy.sh` | Poll `main`; once both images for a new commit are on GHCR, move the checkout there and hand off to `deploy.sh`. |
| `logs.sh` | Tail the stack's logs over SSH from the workstation. |
| `systemd/barkaart-autodeploy.{service,timer}` | Units for the §7 auto-deploy poller. |
| `bare-metal-runbook.md` | Phase-by-phase install this box was built from. |

## 1. Host setup (dedicated ASUS VivoBook Pro laptop)
Ubuntu Server / Debian + Docker Engine. Laptop-as-server tweaks:
- **Don't sleep, ever:** `HandleLidSwitch=ignore` in `/etc/systemd/logind.conf` (then
  `systemctl restart systemd-logind`) covers only the lid. Also mask the sleep targets — that is
  what actually holds this box awake:
  `sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target`.
- **Battery:** the ASUS charge limit (60–80%) lives in MyASUS, a **Windows** app — once Windows is
  wiped only a BIOS setting (if your firmware has one) can cap charging. Measure what the pack is
  still worth before calling it a UPS:
  `cat /sys/class/power_supply/BAT0/energy_full{,_design}`. On this box that is 26.7 Wh of
  48.1 Wh — **55.6% of design**. At the 13.65 W measured draw that is roughly **1 h 55**, not the
  ~4 h a healthy 48 Wh pack would give. Treat it as a clean-shutdown window, not outage tolerance —
  and note the box runs flat and dies **without a shutdown entry in the journal**, which looks
  exactly like a suspend bug. Check `AC0/online` before theorising.
- **Network:** wired (a USB-Ethernet adapter) is best. This box runs **Wi-Fi** (`wlo1`), which needs
  one fix: Wi-Fi power saving is on by default and cost ~250 ms of latency here (227–299 ms →
  3–54 ms with it off). Ubuntu Server uses systemd-networkd + wpa_supplicant, **not**
  NetworkManager, so the usual `wifi.powersave=2` recipe does not apply — install a oneshot unit
  instead (here `/etc/systemd/system/wifi-powersave-off.service`, running
  `/usr/sbin/iw dev wlo1 set power_save off`) and `systemctl enable --now` it.
- **Storage:** keep Docker volumes + Mongo data on the internal **NVMe**. Ensure airflow.
- Idle draw ~10–20 W (≈ €30–60/yr).

## 2. Reaching the box from outside the LAN

**WireGuard**: `wg0` on `10.10.0.1/24`, UDP 51820 forwarded on the router, peers carrying their own
keys. Over it the SPA is at `http://10.10.0.1/`, exactly as on the LAN.

Giving Barkaart a public `https://` address is
[`../docs/plans/public-access.md`](../docs/plans/public-access.md).

## 3. Configure secrets
```bash
cd deploy
cp .env.example .env
# generate strong secrets:
openssl rand -hex 32      # MONGO_PASSWORD (hex — base64 breaks the Mongo URI)
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET (must DIFFER from JWT_SECRET)
# set CORS_ORIGIN to the deployed web origin and AGE_RECIPIENT from step 6.
```
`MONGO_PASSWORD` is a **one-shot** decision: Mongo creates the root user only on the first start of
an empty data volume, so changing it afterwards needs `docker compose down -v` (which drops that
volume). Settle it before you seed — the full warning is under Phase 8 of
[`bare-metal-runbook.md`](bare-metal-runbook.md). Leave `AGE_RECIPIENT` **empty** until §6 is really
done: a placeholder value makes `deploy.sh` abort (see §7).

## 4. Bring up
In service, `deploy.sh` (§7) pulls the images CI built for a release. For a first bring-up — or a
local test — build both on the box instead. Nothing needs building on the host first: the web
image runs the whole Angular build itself.

```bash
cd deploy
docker compose -f docker-compose.yml -f docker-compose.lan.yml up -d --build
docker compose ps
docker compose logs -f api        # expect "Barkaart API listening on http://localhost:3000/api"
```
The API requires `CORS_ORIGIN` in production and refuses to boot without it (and refuses if the two
JWT secrets are equal).

**Verify.** The SPA answers on the LAN; the API has no host port, so reach it through the `web`
container. Don't assert a fixed catalog size — it changes; check that the API and the committed
bundle agree:
```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://<box-lan-ip>/          # SPA, expect 200
docker compose exec web wget -qO- http://api:3000/api/catalog | head -c 120   # version + counts
node -p "require('./frontend/public/catalog.json').version"             # from the repo root
```
> `/api/…` on port 80 returns **the SPA shell with HTTP 200**, not the API — Caddy's `try_files`
> fallback catches it. A 200 there proves nothing; check the content type.

**Reboot recovery.** `api`, `mongo` and `web` are `restart: unless-stopped` and `docker.service` is
enabled, so the stack returns on its own — confirmed on this box after a reboot. Note that
`unless-stopped` does **not** restart a container you stopped by hand, which is the state after any
`docker compose stop`.

## 5. Seed the catalog (first bring-up, and after catalog changes)
Mongo isn't published to the host, so seed via the localhost-only override:
```bash
cd deploy
docker compose -f docker-compose.yml -f docker-compose.seed.yml up -d mongo
cd ..
# ONE-TIME on a fresh box, from the repo root — installs the mongodb driver the seed script
# imports, and builds shared/, which it also imports:
npm install
# then, still from the repo root:
MONGODB_URI="mongodb://<MONGO_USER>:<MONGO_PASSWORD>@127.0.0.1:27017/<MONGO_DB>?authSource=admin" \
  npm run db:seed
# remove the localhost binding again:
cd deploy && docker compose -f docker-compose.yml up -d mongo
```
`db:seed` reseeds **only** the catalog collections (`ingredients`, `cocktails`). It must never touch
`users` / user-data / analytics. Clients pick up a changed catalog via `/api/catalog`'s version/ETag.

> **This box needs that re-seed.** Its Mongo serves an older catalog than the committed bundle, so
> the API and the SPA disagree. Nothing reads the API today, so it costs nothing now — and it is a
> live bug the moment `/api` is proxied. `npm run validate:seed` prints the authoritative counts and
> catalog version; compare them with what the API returns (§4).

## 6. Encrypted backups
Install [`age`](https://github.com/FiloSottile/age) on the host and generate a keypair:
```bash
age-keygen -o age-key.txt      # PUBLIC key is printed; keep age-key.txt OFF the box (gitignored anyway)
```
Put the **public** key in `AGE_RECIPIENT` (`.env`). `backup.sh` encrypts the dump with `age`
**before it hits disk** (dumps carry emails + password hashes) and keeps the newest `BACKUP_KEEP`
(14 here) in `deploy/backups/`.

**Nightly, via a systemd timer — not cron.** Cron silently skips runs the box was powered off for,
and this box is a laptop that will be off during exactly the outages you want covered. The two units
run on the box but are **not in this repo**; recreate them as:

```ini
# /etc/systemd/system/barkaart-backup.service     [Service] Type=oneshot, User=aart,
#   WorkingDirectory=…/deploy, ExecStart=/bin/bash …/deploy/backup.sh, Nice=10, IOSchedulingClass=idle
# /etc/systemd/system/barkaart-backup.timer       [Timer] OnCalendar=*-*-* 03:00:00,
#   Persistent=true, RandomizedDelaySec=5m
```

**Off-box copy.** `backup.sh` cannot do this — pull from the workstation, so the box holds no
outbound credentials:
```bash
rsync -av --ignore-existing -e "ssh -i ~/.ssh/id_ed25519_fileserver" \
  aart@192.168.1.100:/home/aart/cocktailapp/deploy/backups/ /c/Users/a.pieterse/barkast-backups/
```
That copy currently lags the box by several archives. Until it is caught up, every recent backup
lives only on the box's single NVMe.

**Restore drill** (an untested backup isn't a backup):
```bash
AGE_KEY_FILE=/secure/age-key.txt ./restore.sh backups/barkaart-<stamp>.archive.gz.age
```
`restore.sh` runs `mongorestore --drop`, so it replaces the **whole** database from the archive
(catalog **and** `users`/`analytics`) — unlike `db:seed`, which only reseeds the catalog collections.
There is no non-destructive flag: to drill without touching live data, restore into a scratch
namespace by hand (`--nsFrom 'barkaart.*' --nsTo 'restoretest.*'`).

## 7. Updating

CI builds + tests every push to `main` and pushes **two** images to GHCR, both tagged with the git
SHA (plus `:latest`): `ghcr.io/<owner>/barkaart-api`, and `ghcr.io/<owner>/barkaart-web` — Caddy
with the production SPA and `Caddyfile.lan` baked in. The box **pulls** them — no inbound access
needed — and builds nothing.

**A release is one commit.** `auto-deploy.sh` follows `origin/main`. When its head moves, it waits —
changing nothing — until both `:<sha>` images are on GHCR (a few minutes after the merge), then moves
the checkout to that commit and hands off to `deploy.sh`. Moving the checkout *first* means the
compose files and `deploy.sh` that roll a release out are that release's own. The checkout is
forced (`git checkout -f`), deliberately: the box is a deploy target, never a place work is
authored, so a dirty tree there is drift to discard rather than a merge to resolve at three in the
morning. Untracked files — `.env`, backups, the deploy state — are left alone.

Shipping the SPA as an image is what makes this safe. A failed frontend build fails in CI and never
reaches the box; a Caddyfile change ships inside the release instead of depending on a reload
noticing an edited file; `deploy.sh --rollback` rolls the SPA back together with the API; and npm,
with every install script in the lockfile, never runs on the production box.

**Why the trigger lives on the box and not in CI.** With no inbound ports, a release cannot be pushed
here — it has to be pulled. A self-hosted GitHub Actions runner would invert that without opening a
port, but this repository is **public**, and a self-hosted runner on a public repo lets a fork's pull
request execute code on your hardware. Polling is the cheap, boring answer.

- **Automatic (recommended):** a systemd timer polls **hourly** and rolls out with **no manual step**.
  It hands off to `deploy.sh`, so an automatic roll-out still does the pre-deploy encrypted backup,
  migrations, and rollback history — unlike plain Watchtower, which would pull-and-restart with none
  of that. Hourly rather than every few minutes because `main` is the stable branch and merges into
  it are rare; a cycle that finds nothing costs one `git fetch`, so the interval governs only how
  long a release sits unnoticed. `OnUnitActiveSec` in the timer is the one line to change.
  It is installed and running on this box. To install it elsewhere:
  > **Finish §6 first.** `deploy.sh` runs `backup.sh` whenever `AGE_RECIPIENT` is **non-empty** — a
  > placeholder counts — and aborts the whole deploy if that backup fails, which it does when `age`
  > isn't installed. Until §6 is done, leave `AGE_RECIPIENT` **empty** so the deploy logs "Skipping
  > backup" instead of failing. Migrations stay inert until a `migrate-mongo-config.js` exists (none
  > is committed).
  ```bash
  cd deploy
  sudo cp systemd/barkaart-autodeploy.{service,timer} /etc/systemd/system/
  # The unit ships with the reference host's paths (user `aart`, checkout at ~/cocktailapp).
  # Edit User + WorkingDirectory/ExecStart only if yours differ.
  sudo systemctl daemon-reload
  sudo systemctl enable --now barkaart-autodeploy.timer
  systemctl list-timers barkaart-autodeploy.timer     # confirm it's scheduled
  journalctl -u barkaart-autodeploy.service -f         # watch a roll-out
  ```
  `auto-deploy.sh` deploys by the exact `:<git-sha>` tag, so rollbacks stay precise, and records the
  commit only after a clean deploy (a failed cycle retries next tick). Because the app is local-first, the brief
  API restart only pauses sync — clients keep working from cache. Nothing syncs today:
  `environment.prod.ts` sets `authEnabled: false` and `dataSource: 'static'`, so the SPA never calls
  this backend, and `CORS_ORIGIN` on the box is still `http://localhost:4200`. Accounts and sync
  need all three changed.
- **Manual / override:** pin or roll back a specific tag by hand — `auto-deploy.sh` won't fight you,
  it acts only when `main` moves to a new commit.
  ```bash
  ./deploy.sh <git-sha>            # pull both images, encrypted pre-deploy backup, roll out, migrate
  ./deploy.sh <git-sha> --api-only # pull and roll out only the api service
  ./deploy.sh --rollback           # redeploy the previous tag (kept in .deployed-previous), API + SPA
  ```
  Tags from before the web image existed have no `barkaart-web` image; roll those back with
  `--api-only`. Set `IMAGE_REPO` / `WEB_IMAGE_REPO` in `.env` if your GHCR packages differ from the
  defaults (`ghcr.io/aartpieterse/barkaart-{api,web}`). The box pulls **anonymously**, so both
  packages must be **public** — a package's first push can leave it private, so check `barkaart-web`
  on GitHub after its first release. The alternative is `docker login ghcr.io` once with a
  `read:packages` PAT.
- **Local build alternative:** `docker compose … up -d --build` builds both images on the box instead
  of pulling them (§4).
- **Catalog:** edit `iba-cocktails-seed.json`, rebuild the offline bundle
  (`npm run build:catalog`), and reseed (step 5). `db:seed` never touches `users` / user-data /
  `analytics`.
- **User-data schema:** versioned migrations via `migrate-mongo` run automatically by `deploy.sh`
  (after the pre-deploy encrypted backup) when a `migrate-mongo-config.js` is present. None is
  committed yet, so this step is currently inert — `deploy.sh` skips it until you add the config
  (and `migrate-mongo` is fetched on demand via `npx`, it is not a pinned dependency).

## 8. LAN admin dashboard (analytics + operational metrics)
The API serves a small owner-only dashboard at **`/api/admin/dashboard`** (JSON at
`/api/admin/metrics`) showing anonymous aggregate product stats and in-process operational metrics
(requests / errors / latency / uptime). It is protected two ways: **basic-auth**
(`ADMIN_USER`/`ADMIN_PASSWORD`, fail-closed) **and** a guard in `analytics/admin.guard.ts` that
rejects any request carrying a `CF-Connecting-IP` header.

**It is unreachable as the stack runs today** — the API publishes no host port and Caddy does not
proxy `/api`. To open it on the LAN, add the admin overlay:
```bash
cd deploy
docker compose -f docker-compose.yml -f docker-compose.lan.yml -f docker-compose.admin.yml up -d
#   http://<box-lan-ip>:8080/api/admin/dashboard
```
> That guard no longer proves anything. With no Cloudflare in the path the header never arrives, so
> the check always passes and basic-auth is the only thing left. Replace it with a source-address
> check before the box faces the internet — [`../docs/plans/public-access.md`](../docs/plans/public-access.md) §2.

## 9. Hardening checklist (before storing anyone's PII)
Done on this box:
- [x] Mongo and the API publish **no host port** (only the seed override binds `127.0.0.1`, briefly).
- [x] Two **distinct** high-entropy JWT secrets; strong `MONGO_PASSWORD` and `ADMIN_PASSWORD`.
- [x] Nightly **encrypted** backups with a restore drill that passed (§6).
- [x] UFW active, default deny incoming; SSH is key-only, from the LAN and WireGuard.
- [x] Unattended-upgrades active; Docker log caps + `live-restore` in `/etc/docker/daemon.json`.
- [x] A **privacy policy** exists (`../docs/privacy-policy.md`); `DELETE /api/me` erases account +
      data (GDPR).

Still open:
- [ ] Get the backups **off-box** on a schedule (§6) — the pull is manual and lagging.
- [ ] Replace the `admin.guard.ts` header check with a source-address check (§8).
- [ ] `CORS_ORIGIN` is still `http://localhost:4200`, not a real web origin.
- [ ] Link `/privacy` from the app — nothing in `frontend/src` points at it.
- [ ] Keep images fresh: `docker compose pull --ignore-buildable` refreshes `mongo:7`. The api and
      web images take fresh base images (`node:24-slim`, `caddy:2-alpine`) on every CI build, so
      they refresh with each release — and only then; `pull` cannot refresh them.
- [ ] A separate **VLAN** for the host; confirm the residential ISP allows hosting, and content
      licensing for bundled data/images.

> UFW does **not** cover Docker's published ports: Docker's DNAT rules run ahead of UFW's INPUT
> chain, so port 80 is reachable on the LAN whatever UFW says. Enforcing that needs `DOCKER-USER`
> rules (e.g. `chaifeng/ufw-docker`). Never set `{"iptables": false}` in `daemon.json`.
