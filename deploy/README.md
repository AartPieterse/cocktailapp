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
| `.env.example` | Copy to `.env` and fill in secrets (gitignored). |
| `backup.sh` / `restore.sh` | Encrypted (`age`) `mongodump` + tested restore. |

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

## 7. Updating
- **Code:** `docker compose up -d --build` rebuilds the API image and restarts only what changed.
  Because the app is local-first, a brief API restart only pauses sync — clients keep working from
  cache. (Phase 11 adds GHCR image tags + a `deploy.sh` pull/rollback flow.)
- **Catalog:** edit `iba-cocktails-seed.json`, rebuild the offline bundle
  (`npm run build:catalog`), and reseed (step 5).

## 8. Hardening checklist (before storing anyone's PII)
- [ ] Put the host on a **separate VLAN**; keep OS + images patched (`docker compose pull`).
- [ ] Mongo is **never** published to the host (only the seed override binds `127.0.0.1`, briefly).
- [ ] Two **distinct** high-entropy JWT secrets; strong `MONGO_PASSWORD`.
- [ ] `CORS_ORIGIN` is the real web origin (no reflect-any in prod — enforced at boot).
- [ ] Nightly **encrypted** backups, stored **off-box**, with a **tested** restore.
- [ ] Publish a **privacy policy**; `DELETE /api/me` erases account + data (GDPR).
- [ ] Confirm the residential ISP allows hosting, and content licensing for bundled data/images.
- [ ] (Later, Phase 10) LAN admin dashboard bound to the LAN only and excluded from the tunnel.
