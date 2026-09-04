# Barkast — bare-metal self-host runbook (ASUS VivoBook Pro)

A concrete, start-to-finish walkthrough for wiping Windows off the VivoBook Pro and running the
Barkast backend on native Linux. This is the hands-on companion to [`README.md`](README.md) — where
this file says "see README §N", that section has the authoritative detail.

## What this achieves

The frontend stays a **static SPA on Netlify**. This box runs the **backend only**: the API +
MongoDB + a Cloudflare Tunnel, reachable at `https://api.<yourdomain>` with **no inbound ports**
opened (the tunnel dials outbound; the home IP stays hidden).

```
iba-cocktails-seed.json ──db:seed──▶ MongoDB ◀──▶ API (:3000, internal only)
                                                     │
                                          cloudflared (outbound tunnel)
                                                     │
                                   https://api.<domain>  ← Cloudflare edge (TLS) ← clients
```

## Your hardware — verdict: green light

| Component | This box | Notes |
|---|---|---|
| CPU | Intel Core i7 8th-gen (Coffee Lake) | Has **AVX/AVX2** → `mongo:7` runs as-is (no fallback) |
| RAM | 16 GB | Plenty (stack idles well under 2 GB) |
| Disk | SSD (in RAID mode) | **Switch BIOS to AHCI first** — see Phase 2 |
| GPU | NVIDIA GTX 1050 | Unused headless; skip the driver — see Appendix A |
| Power | i7 laptop | ~10–25 W idle (≈ €30–50/yr); battery doubles as a mini-UPS |

## Before you start — gather these

- [ ] A **Cloudflare account** and a **domain** managed in Cloudflare (~€10/yr) — needed for the tunnel hostname.
- [ ] The web origin the frontend is served from (your **Netlify URL**) — becomes `CORS_ORIGIN`.
- [ ] A spare **USB stick ≥ 4 GB** (it gets erased).
- [ ] This dev laptop (to make the USB and to SSH into the box).
- [ ] ~1.5–2 hours; a wired ethernet connection for the box if possible (USB-Ethernet adapter is fine).
- [ ] Decide the box's **hostname** (this runbook uses `barkast`) and your **Linux username**.

## Phase map

0. Prep the old box (back up, count the SSDs)
1. Make the Ubuntu Server installer USB (on the dev laptop)
2. BIOS: RAID → AHCI, disable Secure Boot, boot the USB
3. Install Ubuntu Server 24.04 LTS
4. Headless base setup over SSH
5. Install Docker Engine
6. Install Node 24 (for seeding / catalog maintenance only)
7. Create the Cloudflare Tunnel
8. Clone the repo + fill in secrets
9. Bring up the stack
10. Seed the catalog
11. Point the frontend at the API + verify end-to-end
12. Encrypted backups
13. Auto-deploy timer
14. Hardening pass

---

## Phase 0 — Prep the old box (still on Windows)

1. **Back up anything you want to keep.** The install wipes the whole disk.
2. **Count the physical disks:** Task Manager → *Performance* tab → left column lists *Disk 0*, *Disk 1*, …
   - **One disk** → simplest; the installer uses the whole SSD.
   - **Two disks** → we install on the first and keep the second for Docker/Mongo volumes + local
     backup staging (see Appendix B). We will **not** recreate the RAID.
3. Note whether it's NVMe or SATA (Task Manager shows the model; either is fine).

**Checkpoint:** you know how many SSDs there are and your data is backed up.

## Phase 1 — Make the installer USB (on the dev laptop)

1. Download **Ubuntu Server 24.04 LTS** (`.iso`) from ubuntu.com/download/server.
2. Flash it to the USB stick with **[Rufus](https://rufus.ie)** or **[Ventoy](https://ventoy.net)**.
   - Rufus: select the ISO, GPT / UEFI target, *Start*, accept the defaults.

**Checkpoint:** a bootable Ubuntu Server USB.

## Phase 2 — BIOS: RAID → AHCI, and boot the USB

1. Plug the USB into the VivoBook. Power on and tap **F2** (or **Del**) repeatedly to enter BIOS/UEFI.
2. Storage mode (may be under *Advanced*): find **SATA Mode / VMD Controller / Intel RST / Intel
   Optane** and set it to **AHCI** (disable VMD/RAID). This is what lets Linux see the SSD(s).
   - *Safe here* — it would break a Windows boot, but Windows is being wiped.
3. **Secure Boot:** Ubuntu is signed and usually boots with it on. If the USB refuses, disable Secure
   Boot (*Security* / *Boot*).
4. Boot the USB: save & exit, then tap **Esc** (VivoBook one-time boot menu) and pick the USB
   (`UEFI: <stick name>`).

**Checkpoint:** you reach the Ubuntu Server installer.
*If you get a black screen instead of the installer, see Appendix A (add `nomodeset`).*

## Phase 3 — Install Ubuntu Server 24.04 LTS

Follow the text installer:

1. Language → keyboard layout.
2. Install type: **Ubuntu Server** (not minimized).
3. Network: accept **DHCP** for now (we pin a static IP in Phase 4).
4. Proxy / mirror: leave blank / default.
5. **Storage:**
   - **One SSD:** *Use an entire disk* → select the SSD → default LVM layout is fine → *Done*.
   - **Two SSDs:** *Use an entire disk* → select **Disk 0** only. Leave Disk 1 untouched (mounted
     later, Appendix B).
   - Confirm the destructive write when prompted.
6. **Profile:** your name; server name `barkast`; pick a **username** and a strong password.
7. **✅ Install OpenSSH server** (tick it). Import SSH keys from GitHub if you want key-only login.
8. Skip all the featured snaps.
9. Let it install, then **Reboot Now** and pull the USB when told.

**Checkpoint:** the box boots to a login prompt showing its IP (or find it on your router).

## Phase 4 — Headless base setup (from the dev laptop over SSH)

From now on you can unplug the box's monitor/keyboard and work over SSH.

```bash
ssh <username>@<box-ip>          # e.g. ssh barkast@192.168.1.50

# Update everything
sudo apt update && sudo apt full-upgrade -y

# Don't suspend when the lid closes (it's a server now)
sudo sed -i 's/^#\?HandleLidSwitch=.*/HandleLidSwitch=ignore/' /etc/systemd/logind.conf
sudo sed -i 's/^#\?HandleLidSwitchExternalPower=.*/HandleLidSwitchExternalPower=ignore/' /etc/systemd/logind.conf
sudo systemctl restart systemd-logind

# Automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -f noninteractive unattended-upgrades
```

Then:
- **Give it a stable address:** set a **DHCP reservation** on your router for the box's MAC (easiest),
  or configure a static IP via netplan.
- **(Optional) GTX 1050 power:** keep the idle dGPU asleep — see Appendix A.
- **(Optional) Second SSD:** mount it — see Appendix B.
- **(Optional) ASUS battery:** if MyASUS/BIOS offers a charge limit (60–80%), enable it — 24/7 mains
  power otherwise degrades the battery.

**Checkpoint:** `ssh` works, the box is patched, and it won't sleep on lid close.

## Phase 5 — Install Docker Engine

Docker Engine (CE) — **not** Docker Desktop.

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```
Log out and back in (`exit`, then `ssh` again) so the `docker` group applies, then:
```bash
docker run --rm hello-world       # should print "Hello from Docker!"
sudo systemctl enable --now docker
```

**Checkpoint:** `docker run hello-world` succeeds without `sudo`.

## Phase 6 — Install Node 24 (maintenance only)

The API runs entirely in Docker, but **seeding the catalog and rebuilding it** run on the host
(`npm run db:seed`, `build:catalog`), so install Node 24:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node -v                           # expect v24.x
```

**Checkpoint:** `node -v` shows v24.

## Phase 7 — Create the Cloudflare Tunnel

(Full detail: README §2.)

1. Add your domain to Cloudflare (if not already) and let DNS propagate.
2. Zero Trust dashboard → **Networks → Tunnels → Create a tunnel** → connector **Cloudflared** →
   name it `barkast`. Copy the **tunnel token** (a long string) — it goes in `.env` next.
3. Add a **Public Hostname**: `api.<yourdomain>` → service **HTTP** → `http://api:3000`.
   Map **only** this hostname. Never add `/api/admin` or any LAN service to the tunnel.

**Checkpoint:** you have a tunnel token and `api.<yourdomain>` is mapped to `http://api:3000`.

## Phase 8 — Clone the repo + fill in secrets

```bash
cd ~
git clone https://github.com/AartPieterse/cocktailapp.git
cd cocktailapp/deploy
cp .env.example .env
```

Generate strong secrets and edit `.env` (`nano .env`):
```bash
openssl rand -base64 24     # → MONGO_PASSWORD
openssl rand -base64 48     # → JWT_SECRET
openssl rand -base64 48     # → JWT_REFRESH_SECRET  (MUST differ from JWT_SECRET)
openssl rand -base64 24     # → ADMIN_PASSWORD
```
Set in `.env`:
- `MONGO_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_PASSWORD` — the values above.
- `CORS_ORIGIN` — your Netlify web origin, e.g. `https://barkast.netlify.app` (no trailing slash).
- `TUNNEL_TOKEN` — from Phase 7.
- `IMAGE_REPO` — your GHCR package (for auto-deploy later); leave default if unsure.
- `AGE_RECIPIENT` — fill in Phase 12 (backups); a placeholder is fine until then.

> `.env` is gitignored — never commit it. The API **refuses to boot** in production if `CORS_ORIGIN`
> is unset or if the two JWT secrets are equal.

**Checkpoint:** `deploy/.env` has real secrets, `CORS_ORIGIN`, and `TUNNEL_TOKEN`.

## Phase 9 — Bring up the stack

```bash
cd ~/cocktailapp/deploy
docker compose up -d --build
docker compose ps                 # api, mongo, cloudflared all "Up" (mongo healthy)
docker compose logs -f api        # expect: Barkast API listening on http://localhost:3000/api
```
First build takes a few minutes (it builds the API image from source). `Ctrl-C` stops following logs
(containers keep running).

**Checkpoint:** all three containers are up and the API log shows it's listening.

## Phase 10 — Seed the catalog

Mongo isn't exposed to the host, so bind it to localhost briefly, seed, then unbind (README §5):

```bash
cd ~/cocktailapp

# 0. one-time: install workspace deps so the seed script has the mongodb driver
npm install

# 1. bind mongo to 127.0.0.1
cd deploy
docker compose -f docker-compose.yml -f docker-compose.seed.yml up -d mongo

# 2. seed (run from repo root; use YOUR MONGO_USER/PASSWORD/DB from .env)
cd ~/cocktailapp
MONGODB_URI="mongodb://barkast:<MONGO_PASSWORD>@127.0.0.1:27017/barkast?authSource=admin" \
  npm run db:seed

# 3. remove the localhost binding again
cd deploy
docker compose -f docker-compose.yml up -d mongo
```
`db:seed` reseeds **only** the catalog (`ingredients`, `cocktails`) — it never touches
`users`/analytics.

**Checkpoint:** `npm run db:count` (same `MONGODB_URI`, with the seed binding up) reports 104
ingredients + 102 cocktails.

## Phase 11 — Point the frontend at the API + verify end-to-end

1. From anywhere: `curl https://api.<yourdomain>/api/catalog` → returns JSON with a `version`.
   That proves DNS → Cloudflare edge → tunnel → API → Mongo all work.
2. To have the deployed frontend actually **use** this backend, its production build needs
   `authEnabled: true` and `apiBaseUrl`/`apiUrl` pointing at `https://api.<yourdomain>/api/`
   (see `frontend/src/environments/environment.prod.ts`). By default the static build is fully local
   (`authEnabled: false`) and never calls the API — accounts/sync stay off until you flip that and
   redeploy the frontend. Leave it off if you only wanted the box ready.

**Checkpoint:** the public API URL returns the catalog over HTTPS.

## Phase 12 — Encrypted backups (README §6)

Dumps contain emails + password hashes, so they're encrypted with [`age`](https://github.com/FiloSottile/age) before hitting disk.

```bash
sudo apt install -y age
age-keygen -o ~/age-key.txt       # prints the PUBLIC key; keep age-key.txt OFF the box
```
Put the **public** key in `AGE_RECIPIENT` in `.env`. Schedule nightly:
```bash
crontab -e
# 0 3 * * *  /home/<you>/cocktailapp/deploy/backup.sh >> /var/log/barkast-backup.log 2>&1
```
**Then do a restore drill** (an untested backup isn't a backup):
```bash
cd ~/cocktailapp/deploy
AGE_KEY_FILE=/secure/age-key.txt ./restore.sh backups/barkast-<stamp>.archive.gz.age
```
Copy the encrypted dumps **off-box** (another machine / cloud) regularly.

**Checkpoint:** a backup file exists, a test restore succeeds, and a copy lives off-box.

## Phase 13 — Auto-deploy timer (README §7)

CI publishes a version-tagged image to GHCR on every push to `main`; a systemd timer polls and rolls
out new images (with pre-deploy encrypted backup + rollback) — no manual step, no inbound access.

```bash
cd ~/cocktailapp/deploy
sudo cp systemd/barkast-autodeploy.{service,timer} /etc/systemd/system/
sudoedit /etc/systemd/system/barkast-autodeploy.service   # set User + WorkingDirectory + ExecStart to your checkout
sudo systemctl daemon-reload
sudo systemctl enable --now barkast-autodeploy.timer
systemctl list-timers barkast-autodeploy.timer            # confirm it's scheduled
```
If your GHCR package is private: `docker login ghcr.io` once with a `read:packages` PAT.

**Checkpoint:** the timer is listed and scheduled.

## Phase 14 — Hardening pass (README §9)

- [ ] Host on a separate **VLAN** if you can; keep OS + images patched.
- [ ] Mongo is **never** published to the host (only the brief seed override binds `127.0.0.1`).
- [ ] Two **distinct** high-entropy JWT secrets; strong `MONGO_PASSWORD` + `ADMIN_PASSWORD`.
- [ ] `CORS_ORIGIN` is the real web origin (enforced at boot).
- [ ] Nightly **encrypted** backups, **off-box**, with a **tested** restore.
- [ ] Privacy policy published (`docs/privacy-policy.md`); `DELETE /api/me` gives a GDPR wipe.
- [ ] Confirm your ISP allows home hosting.
- [ ] LAN admin dashboard stays LAN-only (basic-auth + tunnel-header rejection) and is never added to
      the tunnel ingress. Reach it with the admin overlay (README §8).

---

## Appendix A — GTX 1050 on a headless server

Headless = no display workload, so **install no NVIDIA driver**. Two situations:

**Installer/boot black screen.** At the GRUB menu press `e`, find the line starting `linux`, append
` nomodeset` at the end, press `Ctrl-X` to boot. To make it permanent after install:
```bash
sudo sed -i 's/GRUB_CMDLINE_LINUX_DEFAULT="\(.*\)"/GRUB_CMDLINE_LINUX_DEFAULT="\1 nomodeset"/' /etc/default/grub
sudo update-grub
```

**Keep the idle dGPU powered down (optional, saves a few watts 24/7).** Blacklist nouveau — safe
because the VivoBook drives its panel from the Intel iGPU:
```bash
printf 'blacklist nouveau\noptions nouveau modeset=0\n' | sudo tee /etc/modprobe.d/blacklist-nouveau.conf
sudo update-initramfs -u
sudo reboot
```

## Appendix B — Using the second SSD (two-disk configs)

Give Docker + Mongo data and backups the second SSD. Example, mounting it at `/srv`:
```bash
lsblk                                   # identify the 2nd disk, e.g. /dev/nvme1n1
sudo mkfs.ext4 /dev/nvme1n1             # ⚠️ erases that disk
sudo mkdir -p /srv
echo "/dev/nvme1n1  /srv  ext4  defaults  0  2" | sudo tee -a /etc/fstab
sudo mount -a
```
Then either point Docker's data-root at it (`/etc/docker/daemon.json` → `{"data-root":"/srv/docker"}`,
`sudo systemctl restart docker`), or set `BACKUP_DIR=/srv/backups` in `.env`. **Skip RAID** — the
project's data-safety answer is the nightly off-box encrypted backup, and RAID is not a backup.

## Appendix C — Troubleshooting

| Symptom | Fix |
|---|---|
| Installer can't see the SSD | BIOS still in RAID/VMD mode → set **AHCI** (Phase 2) |
| Black screen booting the installer | Add `nomodeset` (Appendix A) |
| `docker` needs sudo | Log out/in after `usermod -aG docker` (Phase 5) |
| `mongo` container unhealthy | `docker compose logs mongo`; check `MONGO_*` in `.env` |
| API container restarts / exits | Usually `CORS_ORIGIN` unset or JWT secrets equal — `docker compose logs api` |
| `curl https://api.<domain>` fails | Check `docker compose logs cloudflared`; confirm the public hostname maps to `http://api:3000` |
| Seed can't connect | The seed override must be up (`docker-compose.seed.yml`) and `MONGODB_URI` must match `.env` creds |

## Appendix D — LAN-only first (no Cloudflare Tunnel yet)

If you want the box running on the home network before committing to a domain, skip Phase 7 and
adjust three phases. Everything else is unchanged.

**Phase 8 (secrets).** Leave `TUNNEL_TOKEN=change-me` — nothing reads it. `CORS_ORIGIN` is still
**required**: the API refuses to boot in production without it. Set it to whatever origin will call
the API (your Netlify URL, or `http://localhost:4200` while developing).

**Phase 9 (bring up).** Name the services explicitly so `cloudflared` never starts — it would
crash-loop on an invalid token — and add the admin overlay to publish the API on the LAN:

```bash
cd ~/cocktailapp/deploy
docker compose -f docker-compose.yml -f docker-compose.admin.yml up -d --build api mongo
docker compose ps                 # api + mongo Up, mongo healthy
```

**Phase 11 (verify).** From any machine on the home network:

```bash
curl http://<box-lan-ip>:8080/api/catalog     # JSON with a `version`
```

The admin dashboard lives at `http://<box-lan-ip>:8080/api/admin/dashboard` (basic-auth via
`ADMIN_USER`/`ADMIN_PASSWORD`).

> `:8080` binds to **all** interfaces. That is fine on a trusted home LAN; do not port-forward it
> from the router. Publishing the API to the internet is what the tunnel is for.

**Adding the tunnel later.** Do Phase 7, put the real `TUNNEL_TOKEN` in `.env`, then bring the full
stack up without service names so `cloudflared` joins:

```bash
docker compose up -d
```

Drop the `-f docker-compose.admin.yml` overlay at that point unless you still want LAN admin access;
the admin routes reject anything arriving through the tunnel either way.
