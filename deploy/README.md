# Barkast self-hosting (Part C)

Run the Barkast API from home on a dedicated laptop: Docker Compose runs the **API + MongoDB +
Cloudflare Tunnel**. TLS terminates at Cloudflare's edge; the tunnel dials **outbound**, so there
are **no inbound ports** and the home IP stays hidden. Mongo is never exposed to the host/LAN.

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

## 1. Host setup (dedicated ASUS VivoBook Pro laptop)
Ubuntu Server / Debian + Docker Engine. Laptop-as-server tweaks:
- **Don't sleep on lid close:** set `HandleLidSwitch=ignore` in `/etc/systemd/logind.conf`, then
  `systemctl restart systemd-logind`.
- **Battery longevity:** enable the ASUS charge limit (60–80%) in MyASUS/BIOS — 24/7 mains power
  otherwise degrades the battery (which still doubles as a mini-UPS for brief outages).
- **Wired network:** add a USB-Ethernet adapter (no built-in RJ45); keep Docker volumes + Mongo
  data on the internal **NVMe**. Ensure airflow.
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
openssl rand -base64 24   # MONGO_PASSWORD
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET (must DIFFER from JWT_SECRET)
# set CORS_ORIGIN to the deployed web origin, TUNNEL_TOKEN from step 2, AGE_RECIPIENT from step 6.
```

## 4. Bring up
```bash
cd deploy
docker compose up -d --build
docker compose ps
docker compose logs -f api        # expect "Barkast API listening on http://localhost:3000/api"
```
The API requires `CORS_ORIGIN` in production and refuses to boot without it (and refuses if the two
JWT secrets are equal).

## 5. Seed the catalog (first bring-up, and after catalog changes)
Mongo isn't published to the host, so seed via the localhost-only override:
```bash
cd deploy
docker compose -f docker-compose.yml -f docker-compose.seed.yml up -d mongo
# from the repo root:
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
0 3 * * *  /path/to/repo/deploy/backup.sh >> /var/log/barkast-backup.log 2>&1
```
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

- **Automatic (recommended):** a systemd timer polls GHCR and rolls out new images with **no manual
  step**. It hands off to `deploy.sh`, so an automatic roll-out still does the pre-deploy encrypted
  backup, migrations, and rollback history — unlike plain Watchtower, which would pull-and-restart
  with none of that.
  ```bash
  cd deploy
  sudo cp systemd/barkast-autodeploy.{service,timer} /etc/systemd/system/
  # edit the User + WorkingDirectory/ExecStart paths in the .service to match your checkout
  sudo systemctl daemon-reload
  sudo systemctl enable --now barkast-autodeploy.timer
  systemctl list-timers barkast-autodeploy.timer     # confirm it's scheduled
  journalctl -u barkast-autodeploy.service -f         # watch a roll-out
  ```
  `auto-deploy.sh` follows `:latest` by default (override with `WATCH_TAG`), maps it back to the
  exact `:<git-sha>` via the revision label so rollbacks stay precise, and only records success
  after a clean deploy (a failed cycle retries next tick). Because the app is local-first, the brief
  API restart only pauses sync — clients keep working from cache.
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
  pulling.
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
docker compose -f docker-compose.yml -f docker-compose.admin.yml up -d
# then, on the home network (optionally publish barkast.local via avahi/mDNS):
#   http://<box-lan-ip>:8080/api/admin/dashboard
```
Never add `/api/admin` to the Cloudflare Tunnel ingress.

## 9. Hardening checklist (before storing anyone's PII)
- [ ] Put the host on a **separate VLAN**; keep OS + images patched (`docker compose pull`).
- [ ] Mongo is **never** published to the host (only the seed override binds `127.0.0.1`, briefly).
- [ ] Two **distinct** high-entropy JWT secrets; strong `MONGO_PASSWORD`.
- [ ] `CORS_ORIGIN` is the real web origin (no reflect-any in prod — enforced at boot).
- [ ] Nightly **encrypted** backups, stored **off-box**, with a **tested** restore.
- [ ] Publish a **privacy policy** (`docs/privacy-policy.md`); `DELETE /api/me` erases account + data (GDPR).
- [ ] Confirm the residential ISP allows hosting, and content licensing for bundled data/images.
- [ ] Set a strong `ADMIN_PASSWORD`; the LAN admin dashboard is bound to the LAN only and excluded
      from the tunnel (basic-auth + CF-header rejection).

## 10. Running the box on Windows via WSL2 (now) → native Linux (later)

Everything above is Linux-native (systemd, `deploy.sh`, `auto-deploy.sh`). To host on a **Windows**
machine, run it inside a **WSL2 Ubuntu** distro with systemd — then the units and scripts work
**unchanged**, and migrating to a real Linux box later is a copy-paste of the same files. Install
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

**Migrating to native Linux later:** provision the box per §1, `git clone` + copy your `.env`, and
install the same units per §7. No WSL-specific state leaks into the deploy tooling — it's the same
`deploy.sh` / `auto-deploy.sh` / systemd files.
