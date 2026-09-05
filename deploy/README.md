# Barkast self-hosting (Part C)

Run the Barkast API from home on a dedicated laptop: Docker Compose runs the **API + MongoDB +
Cloudflare Tunnel**. TLS terminates at Cloudflare's edge; the tunnel dials **outbound**, so there
are **no inbound ports** and the home IP stays hidden. Mongo is never exposed to the host/LAN.

> **The tunnel is optional, and the box in service does without it.** `aartfileserver`
> (Ubuntu Server 24.04.4) runs **LAN-only**: no `cloudflared`, `TUNNEL_TOKEN` left at `change-me`,
> the API published on the LAN at `:8080` via `docker-compose.admin.yml`, Mongo publishing nothing.
> On that path, skip §2 and **name the services** in every `docker compose` command
> (`… up -d --build api mongo`) — a bare `up -d` starts `cloudflared`, which crash-loops on the
> placeholder token. Full procedure: Appendix D of [`bare-metal-runbook.md`](bare-metal-runbook.md).
>
> **Not done yet (4 Sep 2026):** encrypted backups (§6 — `age` is not installed on the box and
> `AGE_RECIPIENT` is still a placeholder), the auto-deploy timer (§7 — no `barkast-autodeploy` units
> installed), and the hardening pass (§9). Reboot survival is untested too; §4 says how to check it.

```
iba-cocktails-seed.json ──db:seed──▶ MongoDB ◀──▶ API (:3000, internal only)
                                                     │
                                          cloudflared (outbound tunnel)
                                                     │
                                        https://<your-host>  ← Cloudflare edge (TLS) ← clients
```

## Files
| File | Purpose |
|---|---|
| `../backend/Dockerfile` | Multi-stage API image (build context = repo root). |
| `docker-compose.yml` | `api` + `mongo` (locked down) + `cloudflared`. |
| `docker-compose.seed.yml` | One-time override: bind Mongo to `127.0.0.1` for seeding. |
| `docker-compose.admin.yml` | Overlay: publish the API on the LAN (`:8080`) for the admin dashboard. |
| `.env.example` | Copy to `.env` and fill in secrets (gitignored). |
| `backup.sh` / `restore.sh` | Encrypted (`age`) `mongodump` + tested restore. |
| `deploy.sh` | Pull a GHCR image tag, back up, migrate, roll out; `--rollback`. |
| `auto-deploy.sh` | Poll GHCR for a new digest on the watched tag, then hand off to `deploy.sh`. |
| `systemd/barkast-autodeploy.{service,timer}` | Units for the §7 auto-deploy poller. |
| `bare-metal-runbook.md` | Phase-by-phase install this box was built from; **Appendix D = the LAN-only path**. |

## 1. Host setup (dedicated ASUS VivoBook Pro laptop)
Ubuntu Server / Debian + Docker Engine. Laptop-as-server tweaks:
- **Don't sleep, ever:** `HandleLidSwitch=ignore` in `/etc/systemd/logind.conf` (then
  `systemctl restart systemd-logind`) covers only the lid. Also mask the sleep targets — that is
  what actually holds this box awake:
  `sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target`.
- **Battery:** the ASUS charge limit (60–80%) lives in MyASUS, a **Windows** app — once Windows is
  wiped only a BIOS setting (if your firmware has one) can cap charging. Measure what the pack is
  still worth before calling it a UPS:
  `cat /sys/class/power_supply/BAT0/energy_full{,_design}`. On this box that is 24.89 Wh of
  48.1 Wh — **51.7% of design**. Measured draw on battery here was 13.65 W, so a full charge is
  roughly **1 h 50**, not the ~4 h a healthy 48 Wh pack would give. Treat it as a clean-shutdown
  window, not outage tolerance — and note the box will run flat and die **without a shutdown entry
  in the journal**, which looks exactly like a suspend bug. Check `AC0/online` before theorising.
- **Network:** wired (a USB-Ethernet adapter) is best. This box runs **Wi-Fi** (`wlo1`), which needs
  one fix: Wi-Fi power saving is on by default and cost ~250 ms of latency here (227–299 ms →
  3–54 ms with it off). Ubuntu Server uses systemd-networkd + wpa_supplicant, **not**
  NetworkManager, so the usual `wifi.powersave=2` recipe does not apply — install a oneshot unit
  instead (here `/etc/systemd/system/wifi-powersave-off.service`, running
  `/usr/sbin/iw dev wlo1 set power_save off`) and `systemctl enable --now` it.
- **Storage:** keep Docker volumes + Mongo data on the internal **NVMe**. Ensure airflow.
- Idle draw ~10–20 W (≈ €30–60/yr).

## 2. Cloudflare Tunnel
1. Buy/manage a domain in Cloudflare (~€10/yr) for a stable hostname.
2. Zero Trust dashboard → **Networks → Tunnels → Create tunnel** (choose *Cloudflared*, connector
   run via Docker). Copy the **tunnel token** into `TUNNEL_TOKEN` in `.env`.
3. Add a **Public Hostname**: `api.<your-domain>` → `HTTP` → `http://api:3000`.
   Map **only** this hostname. (The future LAN admin dashboard is intentionally never added here.)

## 3. Configure secrets
```bash
cd deploy
cp .env.example .env
# generate strong secrets:
openssl rand -hex 32      # MONGO_PASSWORD (hex — base64 breaks the Mongo URI)
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET (must DIFFER from JWT_SECRET)
# set CORS_ORIGIN to the deployed web origin, TUNNEL_TOKEN from step 2, AGE_RECIPIENT from step 6.
```
`MONGO_PASSWORD` is a **one-shot** decision: Mongo creates the root user only on the first start of
an empty data volume, so changing it afterwards needs `docker compose down -v` (which drops that
volume). Settle it before you seed — the full warning is under Phase 8 of
[`bare-metal-runbook.md`](bare-metal-runbook.md). Leave `AGE_RECIPIENT` **empty** until §6 is really
done: a placeholder value makes `deploy.sh` abort (see §7).

## 4. Bring up
```bash
cd deploy
# With a Cloudflare Tunnel configured (§2):
docker compose up -d --build
# LAN-only (no tunnel): NAME the services, or `cloudflared` starts and crash-loops on the
# placeholder TUNNEL_TOKEN. Add the admin overlay to publish the API on the LAN at :8080.
docker compose -f docker-compose.yml -f docker-compose.admin.yml up -d --build api mongo
docker compose ps
docker compose logs -f api        # expect "Barkast API listening on http://localhost:3000/api"
```
The API requires `CORS_ORIGIN` in production and refuses to boot without it (and refuses if the two
JWT secrets are equal).

**Verify end-to-end** once the catalog is seeded (§5). Don't assert a fixed catalog size — it grows;
check instead that the API serves the same content as the committed bundle:
```bash
# from any machine on the home network (LAN-only path):
curl -sS -o /dev/null -w '%{http_code}\n' http://<box-lan-ip>:8080/api/catalog   # expect 200
curl -s http://<box-lan-ip>:8080/api/catalog | head -c 120                       # version + counts
# from the repo root — both must match what the API just printed:
node -p "require('./frontend/public/catalog.json').version"
node -p "const s=require('./iba-cocktails-seed.json'); s.ingredients.length+' ingredients, '+s.cocktails.length+' cocktails'"
```

**Survive a reboot.** `api` and `mongo` are `restart: unless-stopped` and `docker.service` is
enabled (`systemctl is-enabled docker`), so the stack should come back on its own after a power cut
— verify it rather than assume: `sudo reboot`, then re-run `docker compose ps` and the catalog check
above once the box answers SSH again.

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

## 6. Encrypted backups
Install [`age`](https://github.com/FiloSottile/age) on the host and generate a keypair:
```bash
age-keygen -o age-key.txt      # PUBLIC key is printed; keep age-key.txt OFF the box (gitignored anyway)
```
Put the **public** key in `AGE_RECIPIENT` (`.env`). Then schedule nightly:
```bash
# crontab -e
0 3 * * *  /path/to/repo/deploy/backup.sh >> "$HOME/barkast-backup.log" 2>&1
```
> Do **not** log to `/var/log/…` from a *user* crontab: that directory is `root:syslog` 775, the
> redirect fails before `backup.sh` ever runs, and the backup silently never happens. Either log
> under `$HOME` as above, or install it as a root cron / systemd timer.
`backup.sh` encrypts the dump with `age` **before it hits disk** (dumps contain emails + password
hashes), keeps the newest `BACKUP_KEEP`, and reminds you to copy the file **off-box**.
**Restore drill** (do this regularly — an untested backup isn't a backup):
```bash
AGE_KEY_FILE=/secure/age-key.txt ./restore.sh backups/barkast-<stamp>.archive.gz.age
```
`restore.sh` runs `mongorestore --drop`, so it replaces the **whole** database from the archive
(catalog **and** `users`/`analytics`) — unlike `db:seed`, which only reseeds the catalog collections.

## 7. Updating

CI builds + tests every push to `main` and pushes a version-tagged image to GHCR
(`ghcr.io/<owner>/barkast-api:<git-sha>` + `:latest`, with the git SHA stamped as the
`org.opencontainers.image.revision` label). The box **pulls** by tag — no inbound access needed.

**A release is two artifacts, and only one of them is an image.** The API ships as that GHCR image;
the SPA does not — CI publishes it to Netlify, and the box builds it from source. `auto-deploy.sh`
therefore watches both, independently: the image digest, and `origin/main`'s HEAD. A commit that
touches only the frontend produces no new image, and one that touches only the backend needs no
rebuild, so each side records its own state and a failure on one retries without redoing the other.

The SPA path does `git reset --hard` onto the release branch, deliberately: the box is a deploy
target, never a place work is authored, so a dirty tree there is drift to discard rather than a merge
to resolve at three in the morning. It then runs `npm ci` (the lockfile *is* the release) and reloads
Caddy rather than restarting it, so the app keeps serving throughout. A failed build leaves the
previous bundle in place and retries next cycle.

**Why the trigger lives on the box and not in CI.** With no inbound ports, a release cannot be pushed
here — it has to be pulled. A self-hosted GitHub Actions runner would invert that without opening a
port, but this repository is **public**, and a self-hosted runner on a public repo lets a fork's pull
request execute code on your hardware. Polling is the cheap, boring answer.

- **Automatic (recommended):** a systemd timer polls **hourly** and rolls out with **no manual step**.
  It hands off to `deploy.sh`, so an automatic roll-out still does the pre-deploy encrypted backup,
  migrations, and rollback history — unlike plain Watchtower, which would pull-and-restart with none
  of that. Hourly rather than every few minutes because `main` is the stable branch and merges into
  it are rare; a cycle that finds nothing costs a fetch and a digest check, so the interval governs
  only how long a release sits unnoticed. `OnUnitActiveSec` in the timer is the one line to change.
  > **Finish §6 before you enable this.** `deploy.sh` runs `backup.sh` whenever `AGE_RECIPIENT` is
  > **non-empty** — a placeholder counts — and aborts the whole deploy if that backup fails, which
  > it does when `age` isn't installed. Until §6 is done, leave `AGE_RECIPIENT` **empty** so the
  > deploy logs "Skipping backup" instead of failing. Migrations stay inert until a
  > `migrate-mongo-config.js` exists (none is committed).
  ```bash
  cd deploy
  sudo cp systemd/barkast-autodeploy.{service,timer} /etc/systemd/system/
  # The unit ships with the reference host's paths (user `aart`, checkout at ~/cocktailapp).
  # Edit User + WorkingDirectory/ExecStart only if yours differ.
  sudo systemctl daemon-reload
  sudo systemctl enable --now barkast-autodeploy.timer
  systemctl list-timers barkast-autodeploy.timer     # confirm it's scheduled
  journalctl -u barkast-autodeploy.service -f         # watch a roll-out
  ```
  `auto-deploy.sh` follows `:latest` by default (override with `WATCH_TAG`), maps it back to the
  exact `:<git-sha>` via the revision label so rollbacks stay precise, and only records success
  after a clean deploy (a failed cycle retries next tick). Because the app is local-first, the brief
  API restart only pauses sync — clients keep working from cache. (Today nothing syncs at all:
  `frontend/src/environments/environment.prod.ts` sets `authEnabled: false` and
  `dataSource: 'static'`, so the deployed SPA never calls this backend. Accounts/sync go live only
  once that is flipped, the frontend is redeployed, and `CORS_ORIGIN` on the box is set to the real
  web origin — it is still the placeholder `http://localhost:4200`.)
- **Manual / override:** pin or roll back a specific tag by hand — `auto-deploy.sh` won't fight you,
  it redeploys only when the watched tag's digest actually changes.
  ```bash
  ./deploy.sh <git-sha>            # pull, encrypted pre-deploy backup, migrate, roll out full stack
  ./deploy.sh <git-sha> --api-only # roll out only the api service
  ./deploy.sh --rollback           # redeploy the previous tag (kept in .deployed-previous)
  ```
  Set `IMAGE_REPO` in `.env` to your GHCR package. If the package is private, `docker login ghcr.io`
  once with a `read:packages` PAT (outbound-only, fine behind the tunnel).
- **Local build alternative:** `docker compose up -d --build` builds the image on the box instead of
  pulling (LAN-only: name the services, per §4).
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
(`ADMIN_USER`/`ADMIN_PASSWORD`) **and** a guard that rejects any request arriving through the tunnel
(so it is invisible on the public hostname even if the ingress were misconfigured).

The base stack publishes no host ports, so reach it over the LAN with the overlay:
```bash
cd deploy
# Name the services: a bare `up -d` also starts cloudflared, which crash-loops without a real
# TUNNEL_TOKEN. ADMIN_USER/ADMIN_PASSWORD must be set in .env — the guard fails closed.
docker compose -f docker-compose.yml -f docker-compose.admin.yml up -d --build api mongo
# then, on the home network (optionally publish aartfileserver.local via avahi/mDNS):
#   http://<box-lan-ip>:8080/api/admin/dashboard
```
Never add `/api/admin` to the Cloudflare Tunnel ingress.

## 9. Hardening checklist (before storing anyone's PII)
- [ ] Put the host on a **separate VLAN**; keep the OS patched
      (`sudo apt update && sudo apt full-upgrade`) and images fresh
      (`docker compose pull --ignore-buildable`). Note `docker compose pull` cannot refresh a
      locally-built `barkast-api:latest` — rebuild with `--build`, or roll out via `deploy.sh`.
- [ ] Mongo is **never** published to the host (only the seed override binds `127.0.0.1`, briefly).
- [ ] Two **distinct** high-entropy JWT secrets; strong `MONGO_PASSWORD`.
- [ ] `CORS_ORIGIN` is the real web origin (no reflect-any in prod — enforced at boot).
- [ ] Nightly **encrypted** backups, stored **off-box**, with a **tested** restore.
- [ ] Publish a **privacy policy** (`docs/privacy-policy.md`); `DELETE /api/me` erases account + data (GDPR).
- [ ] Confirm the residential ISP allows hosting, and content licensing for bundled data/images.
- [ ] Set a strong `ADMIN_PASSWORD`; the LAN admin dashboard is bound to the LAN only and excluded
      from the tunnel (basic-auth + CF-header rejection).

## 10. Alternative host: Windows via WSL2

> Not the path in service. The box that runs today is **native Ubuntu Server 24.04.4**
> (`aartfileserver`) — see [`bare-metal-runbook.md`](bare-metal-runbook.md). This section is only
> for hosting on a machine that has to stay on Windows.

Everything above is Linux-native (systemd, `deploy.sh`, `auto-deploy.sh`). To host on a **Windows**
machine, run it inside a **WSL2 Ubuntu** distro with systemd — then the units and scripts work
**unchanged**, and moving to a real Linux box later is a copy-paste of the same files. Install
Docker Engine *inside* the distro (not Docker Desktop integration) so the box is self-contained and
byte-identical to native Linux.

```powershell
# 1. In Windows PowerShell — install the distro, then create your Linux user on first launch:
wsl --install -d Ubuntu-24.04
```
```bash
# 2. Inside Ubuntu — enable systemd so docker.service and the timer run:
printf '[boot]\nsystemd=true\n' | sudo tee /etc/wsl.conf
```
```powershell
# 3. Back in PowerShell — restart the distro so systemd takes effect:
wsl --shutdown
```
```bash
# 4. Inside Ubuntu — Docker Engine (CE), managed by systemd (NO Docker Desktop needed):
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"           # then `exit` + `wsl --shutdown` + reopen for the group to apply
sudo systemctl enable --now docker
systemctl is-system-running               # expect "running" (or "degraded" — fine)

# 5. Clone under the LINUX filesystem (~/, NOT /mnt/c — far faster + correct file perms):
git clone https://github.com/AartPieterse/cocktailapp.git ~/cocktailapp
cd ~/cocktailapp/deploy
cp .env.example .env                       # fill secrets per §3, then bring up per §4–5

# 6. Install the auto-deploy timer exactly as §7, but point the .service at the WSL checkout, e.g.:
#     User=<you>
#     WorkingDirectory=/home/<you>/cocktailapp/deploy
#     ExecStart=/bin/bash /home/<you>/cocktailapp/deploy/auto-deploy.sh
```

**Survive Windows reboots.** WSL does not auto-start a distro at boot, so systemd (and the whole
stack + the 5-min timer) won't run until the distro is first touched. Create a **Task Scheduler**
task: trigger **At startup**, action `wsl.exe -d Ubuntu-24.04 -u root -e true`, and check *"Run
whether user is logged on or not."* That boots the distro at machine startup — systemd then brings up
docker, the `api`/`mongo`/`cloudflared` containers, and the auto-deploy timer, with no interactive
login. (`Persistent=true` on the timer also catches up any run missed while the machine slept.)

**Moving off WSL onto bare metal:** no WSL-specific state leaks into the deploy tooling — it's the
same `deploy.sh` / `auto-deploy.sh` / systemd files. Build the native box from
[`bare-metal-runbook.md`](bare-metal-runbook.md), then `git clone` + copy your `.env` across.
