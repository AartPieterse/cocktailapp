# Barkaart — bare-metal self-host runbook (ASUS VivoBook Pro)

A concrete, start-to-finish walkthrough for wiping Windows off the VivoBook Pro and running the
Barkaart backend on native Linux. This is the hands-on companion to [`README.md`](README.md) — where
this file says "see README §N", that section has the authoritative detail.

## What this achieves

This box runs **the whole application** — the API + MongoDB, and Caddy serving the SPA. There is no
third-party host: CI builds each release into two images (API, and Caddy with the SPA baked in) and
this box pulls and serves them (`deploy/auto-deploy.sh`, `frontend/Dockerfile`).

The box is reachable over the **home LAN and WireGuard only**. **Skip Phase 7** — there is no
Cloudflare Tunnel — and follow [Appendix D](#appendix-d--the-lan-only-path)
for Phases 8/9/11. Giving the app a public `https://` address is
[`../docs/plans/public-access.md`](../docs/plans/public-access.md).

```
iba-cocktails-seed.json ──db:seed──▶ MongoDB ◀──▶ API (:3000, internal only)
                                                       │
                                     Caddy `web` ──▶ SPA on :80 (LAN + WireGuard)
```

## Your hardware — verdict: green light

| Component | This box | Notes |
|---|---|---|
| CPU | Intel Core i7 8th-gen (Coffee Lake) | Has **AVX/AVX2** → `mongo:7` runs as-is (no fallback) |
| RAM | 16 GB | Plenty (stack idles well under 2 GB) |
| Disk | Single **477 GB NVMe** SSD (in RAID mode) | **Switch BIOS to AHCI first** — see Phase 2. One disk, so Appendix B does not apply. ⚠️ The installer only allocates **100 GB** of it — see Phase 3 |
| GPU | NVIDIA GTX 1050 | Unused headless; skip the driver — see Appendix A |
| Power | i7 laptop | ~10–25 W idle (≈ €30–50/yr); the battery is at **55.6% of design** (26.7 of 48.1 Wh) — roughly 1 h 55, a clean-shutdown window, not outage tolerance |

## Before you start — gather these

- [ ] The web origin the frontend is served from — becomes `CORS_ORIGIN`. Serving the SPA and the
      API from the same origin makes this a formality, but the API still refuses to boot without it.
- [ ] A spare **USB stick ≥ 4 GB** (it gets erased).
- [ ] This dev laptop (to make the USB and to SSH into the box).
- [ ] ~1.5–2 hours; a wired ethernet connection for the box if possible (USB-Ethernet adapter is fine).
- [ ] Decide the box's **hostname** (this runbook uses `aartfileserver`) and your **Linux username**.

## Phase map

0. Prep the old box (back up, count the SSDs)
1. Make the Ubuntu Server installer USB (on the dev laptop)
2. BIOS: RAID → AHCI, disable Secure Boot, boot the USB
3. Install Ubuntu Server 24.04 LTS
4. Headless base setup over SSH
5. Install Docker Engine
6. Install Node 24 (for seeding / catalog maintenance only)
7. *(skipped — no Cloudflare Tunnel)*
8. Clone the repo + fill in secrets
9. Bring up the stack
10. Seed the catalog
11. Verify end-to-end
12. Encrypted backups
13. Auto-deploy timer
14. Hardening pass

## State of this box

This runbook has been walked on the real hardware. Where it stands today:

| Phases | State |
|---|---|
| 0–6 — install, base setup, Docker, Node | Done |
| 7 — Cloudflare Tunnel | **Skipped, permanently** — no tunnel; see [Appendix D](#appendix-d--the-lan-only-path) |
| 8–11 — secrets, stack, seed, verify | Done in their Appendix D form. The catalog in Mongo is older than the committed bundle and needs a re-seed (README §5) |
| 12 — encrypted backups | Done — nightly `barkaart-backup.timer`, archives in `deploy/backups/`, restore drill passed. The off-box copy is manual and lagging |
| 13 — auto-deploy timer | Done — `barkaart-autodeploy.timer`, hourly |
| 14 — hardening pass | Partly — UFW active, key-only SSH, unattended-upgrades, Docker log caps. Open items in README §9 |

One local deviation: the deploy user has passwordless `sudo` via `/etc/sudoers.d/90-aart-nopasswd`.
That was a convenience choice on this box, not a step of this runbook — nothing here needs `NOPASSWD`,
so don't copy it onto a box you care about.

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
3. Network: accept **DHCP**. The address is pinned router-side with a DHCP reservation, not in
   netplan — a bad netplan on a Wi-Fi-only box locks you out.
4. Proxy / mirror: leave blank / default.
5. **Storage:**
   - **One SSD:** *Use an entire disk* → select the SSD → *Done*.
     > ⚠️ **The default LVM layout is NOT fine.** The installer sizes the `ubuntu-lv` logical volume at
     > only **100 GB** however big the disk is, and leaves the rest of the volume group unallocated.
     > On the storage-summary screen select `ubuntu-lv` → *Edit* and raise **Size** to the maximum
     > before confirming. Already installed? Fix it afterwards (safe, online, no data loss):
     > ```bash
     > sudo vgs                                         # VFree shows what the installer left behind
     > sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv
     > sudo resize2fs /dev/ubuntu-vg/ubuntu-lv          # ext4; use xfs_growfs on xfs
     > df -h /                                          # this box: 100 GB → 466 GB
     > ```
   - **Two SSDs:** *Use an entire disk* → select **Disk 0** only. Leave Disk 1 untouched (mounted
     later, Appendix B).
   - Confirm the destructive write when prompted.
6. **Profile:** your name; server name `aartfileserver`; pick a **username** and a strong password.
7. **✅ Install OpenSSH server** (tick it). Import SSH keys from GitHub if you want key-only login.
   - **Verify it actually came up.** On this box the checkbox installed the package but left the
     service *disabled*, so the first `ssh` from the laptop hit a closed port with nothing in the
     journal to explain it. On the console, before you unplug the monitor:
     `systemctl is-active ssh` — if that is not `active`, run `sudo systemctl enable --now ssh`.
8. Skip all the featured snaps.
9. Let it install, then **Reboot Now** and pull the USB when told.

**Checkpoint:** the box boots to a login prompt showing its IP (or find it on your router).

## Phase 4 — Headless base setup (from the dev laptop over SSH)

From now on you can unplug the box's monitor/keyboard and work over SSH.

```bash
ssh <username>@<box-ip>          # e.g. ssh aart@192.168.1.100

# Update everything
sudo apt update && sudo apt full-upgrade -y

# Don't suspend when the lid closes (it's a server now)
sudo sed -i 's/^#\?HandleLidSwitch=.*/HandleLidSwitch=ignore/' /etc/systemd/logind.conf
sudo sed -i 's/^#\?HandleLidSwitchExternalPower=.*/HandleLidSwitchExternalPower=ignore/' /etc/systemd/logind.conf
sudo sed -i 's/^#\?HandleLidSwitchDocked=.*/HandleLidSwitchDocked=ignore/' /etc/systemd/logind.conf
sudo systemctl restart systemd-logind

# Belt and braces: logind only governs the LID. Mask the sleep targets so nothing at all can
# suspend a headless box (idle policy, ACPI events, an accidental `systemctl suspend`).
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

# Automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -f noninteractive unattended-upgrades
```

Then:
- **Give it a stable address:** set a **DHCP reservation** on your router for the box's MAC (easiest),
  or configure a static IP via netplan.
- **On Wi-Fi? Turn off power saving.** It is on by default and adds ~250 ms to every request (this
  box: 227–299 ms → 3–54 ms after disabling). Ubuntu Server uses **systemd-networkd +
  wpa_supplicant**, *not* NetworkManager, so the usual `wifi.powersave=2` recipe does not apply —
  make it stick with a unit (replace `wlo1` with your interface from `ip -br link`):

```bash
iw dev wlo1 get power_save                       # "Power save: on" = the problem
sudo tee /etc/systemd/system/wifi-powersave-off.service >/dev/null <<'EOF'
[Unit]
Description=Disable Wi-Fi power saving on wlo1 (server, not a laptop)
After=sys-subsystem-net-devices-wlo1.device
Wants=sys-subsystem-net-devices-wlo1.device

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/sbin/iw dev wlo1 set power_save off

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now wifi-powersave-off.service
```

- **(Optional) GTX 1050 power:** keep the idle dGPU asleep — see Appendix A.
- **(Optional) Second SSD:** mount it — see Appendix B.
- **(Optional) ASUS battery:** if MyASUS/BIOS offers a charge limit (60–80%), enable it — 24/7 mains
  power otherwise degrades the battery.

**Checkpoint:** `ssh` works, the box is patched, and it cannot sleep at all —
`systemctl status sleep.target suspend.target hibernate.target hybrid-sleep.target` reports
`Loaded: masked` for all four, and `/etc/systemd/logind.conf` has the three `HandleLidSwitch*=ignore`
lines.

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

## Phase 7 — Skipped: there is no Cloudflare Tunnel

Off-LAN access is **WireGuard** (README §2). A public `https://` address is
[`../docs/plans/public-access.md`](../docs/plans/public-access.md) — Caddy on 443, no third party in
the TLS path.

## Phase 8 — Clone the repo + fill in secrets

```bash
cd ~
git clone https://github.com/AartPieterse/cocktailapp.git
cd cocktailapp/deploy
cp .env.example .env
```

Generate strong secrets and edit `.env` (`nano .env`):
```bash
openssl rand -hex 32        # → MONGO_PASSWORD  (hex, NOT base64 — see the warning below)
openssl rand -base64 48     # → JWT_SECRET
openssl rand -base64 48     # → JWT_REFRESH_SECRET  (MUST differ from JWT_SECRET)
openssl rand -base64 24     # → ADMIN_PASSWORD
```
Set in `.env`:
- `MONGO_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_PASSWORD` — the values above.
- `CORS_ORIGIN` — the web origin that will call this API, no trailing slash. The repo hard-codes no
  such origin: take it from your own deploy. Leave a placeholder if nothing calls the API yet — the
  API refuses to boot with it unset, but any syntactically valid origin will do until then.
- `IMAGE_REPO` / `WEB_IMAGE_REPO` — your two GHCR packages (for auto-deploy later); leave the
  defaults if unsure.
- `AGE_RECIPIENT` — fill in Phase 12 (backups); a placeholder is fine until then.

> **`MONGO_PASSWORD` must be URI-safe.** `docker-compose.yml` interpolates it straight into
> `mongodb://USER:PASSWORD@mongo:27017/…`, so base64's `+`, `/` and `=` make the driver fail at boot
> with `MongoParseError: Password contains unescaped characters`. Hex has no such characters.
> If you hit this after Mongo already initialised, changing `.env` is not enough — the root user was
> created on first start, so you must `docker compose down -v` (drops the data volume) and come back
> up. Do that before seeding and it costs nothing.

> `.env` is gitignored — never commit it. The API **refuses to boot** in production if `CORS_ORIGIN`
> is unset or if the two JWT secrets are equal.

**Checkpoint:** `deploy/.env` has real secrets and a `CORS_ORIGIN`.

## Phase 9 — Bring up the stack

```bash
cd ~/cocktailapp/deploy
docker compose -f docker-compose.yml -f docker-compose.lan.yml up -d --build
docker compose ps                 # api, mongo, web all "Up" (mongo healthy)
docker compose logs -f api        # expect: Barkaart API listening on http://localhost:3000/api
```
First build takes a few minutes: it builds both images from source, and the web image runs the
whole Angular build. Nothing needs building on the host first. From Phase 13 on, the box pulls
CI's images instead. `Ctrl-C` stops following logs (containers keep running).

**Reboot drill — do it now, not the first time the power blips.** `docker.service` is enabled and both
containers are `restart: unless-stopped`, so the stack *should* come back on its own; nothing proves it
until you try:

```bash
sudo reboot                                   # wait ~30 s, then reconnect
ssh <username>@<box-ip>
cd ~/cocktailapp/deploy && docker compose ps  # api + mongo Up again — without you typing a compose command
docker compose logs --tail 5 api              # listening again
```

Once the catalog is seeded (Phase 10), repeat the drill and finish it with the Phase 11 requests —
`http://<box-lan-ip>/` for the SPA and the in-container call for the API.

**Checkpoint:** all three containers are up and the API log shows it's listening.

> **This box has passed the drill:** after a reboot, dockerd restored and started the stack on its
> own within seconds of `docker.service` coming up, and the nightly backups on the days that followed
> ran unattended against a live Mongo. What has *not* been measured is how long boot-to-serving takes.

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
MONGODB_URI="mongodb://barkaart:<MONGO_PASSWORD>@127.0.0.1:27017/barkaart?authSource=admin" \
  npm run db:seed

# 3. remove the localhost binding again
cd deploy
docker compose -f docker-compose.yml up -d mongo
```
`db:seed` reseeds **only** the catalog (`ingredients`, `cocktails`) — it never touches
`users`/analytics.

**Checkpoint:** `npm run db:count` (same `MONGODB_URI`, with the seed binding up) reports the same
counts as the seed file — `node -e "const d=require('./iba-cocktails-seed.json');console.log(d.ingredients.length,d.cocktails.length)"`.
Do not hard-code a number here: the catalog grows.

## Phase 11 — Verify end-to-end

```bash
curl -o /dev/null -w '%{http_code}\n' http://<box-lan-ip>/                    # the SPA, expect 200
docker compose exec web wget -qO- http://api:3000/api/catalog | head -c 120   # the API
```

The SPA is self-contained: `environment.prod.ts` has `authEnabled: false` and
`dataSource: 'static'`, so it reads its bundled catalog and never calls the API. Accounts and sync
need that flipped, `/api` proxied by Caddy, and a real `CORS_ORIGIN`.

**Checkpoint:** the SPA answers on the LAN and the API returns a catalog `version`.

## Phase 12 — Encrypted backups (README §6)

Dumps contain emails + password hashes, so they're encrypted with [`age`](https://github.com/FiloSottile/age) before hitting disk.

```bash
sudo apt install -y age
age-keygen -o ~/age-key.txt       # prints the PUBLIC key; keep age-key.txt OFF the box
```
Put the **public** key in `AGE_RECIPIENT` in `.env`. Schedule nightly with a **systemd timer, not
cron** — cron silently skips every run the box was powered off for, and a laptop is off during
exactly the outages you are insuring against. `barkaart-backup.service` (oneshot, `User=aart`,
`WorkingDirectory=…/deploy`, `ExecStart=… backup.sh`) plus `barkaart-backup.timer`
(`OnCalendar=*-*-* 03:00:00`, `Persistent=true`) — the full unit bodies are in README §6. They live
on the box only; no repo carries them.
**Then do a restore drill** (an untested backup isn't a backup):
```bash
cd ~/cocktailapp/deploy
AGE_KEY_FILE=/secure/age-key.txt ./restore.sh backups/barkaart-<stamp>.archive.gz.age
```
Copy the encrypted dumps **off-box** (another machine / cloud) regularly.

**Checkpoint:** a backup file exists, a test restore succeeds, and a copy lives off-box.

## Phase 13 — Auto-deploy timer (README §7)

CI publishes two images to GHCR for every push to `main` — `barkaart-api` and `barkaart-web`, both
tagged with the commit SHA; a systemd timer polls `main` and, once both images for a new commit
exist, rolls them out (with pre-deploy encrypted backup + rollback) — no manual step, no inbound
access.

```bash
cd ~/cocktailapp/deploy
sudo cp systemd/barkaart-autodeploy.{service,timer} /etc/systemd/system/
sudoedit /etc/systemd/system/barkaart-autodeploy.service   # set User + WorkingDirectory + ExecStart to your checkout
sudo systemctl daemon-reload
sudo systemctl enable --now barkaart-autodeploy.timer
systemctl list-timers barkaart-autodeploy.timer            # confirm it's scheduled
```
The box pulls anonymously, so both GHCR packages must be **public**; a package's first push can
leave it private. Otherwise: `docker login ghcr.io` once with a `read:packages` PAT.

`deploy.sh` adds `-f docker-compose.lan.yml` when that file is present, so a roll-out drives the
same stack that is running — `web` included, pulled and rolled out with the API.

**Checkpoint:** the timer is listed and scheduled.

## Phase 14 — Hardening pass (README §9)

- [ ] Host on a separate **VLAN** if you can; keep OS + images patched.
- [ ] Mongo is **never** published to the host (only the brief seed override binds `127.0.0.1`).
- [ ] Two **distinct** high-entropy JWT secrets; strong `MONGO_PASSWORD` + `ADMIN_PASSWORD`.
- [ ] `CORS_ORIGIN` is the real web origin (enforced at boot).
- [ ] Nightly **encrypted** backups, **off-box**, with a **tested** restore.
- [ ] Privacy policy published (`docs/privacy-policy.md`); `DELETE /api/me` gives a GDPR wipe.
- [ ] Confirm your ISP allows home hosting.
- [ ] The admin dashboard stays LAN-only. Its header check no longer proves that — replace it with a
      source-address check (README §8). Reach the dashboard with the admin overlay.

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
| Seed can't connect | The seed override must be up (`docker-compose.seed.yml`) and `MONGODB_URI` must match `.env` creds |
| Root filesystem is only ~100 GB on a much bigger SSD | The installer sized `ubuntu-lv` at 100 GB — grow it with `lvextend` + `resize2fs` (Phase 3) |
| 200–300 ms latency to the API across the LAN | Wi-Fi power saving is on — turn it off and make it persistent (Phase 4) |
| Auto-deploy keeps logging `barkaart-web:<sha> is not on the registry yet` | CI's image job failed, or the `barkaart-web` package is private — make it public (README §7) |
| `/api/…` returns HTML with HTTP 200 | Expected: Caddy has no `/api` proxy and its `try_files` fallback catches the path |
| `MongoParseError: Password contains unescaped characters` | `MONGO_PASSWORD` is base64 — regenerate with `openssl rand -hex 32`, then `docker compose down -v` (Phase 8) |

## Appendix D — the LAN-only path

This is how the box runs: no Cloudflare Tunnel, Phase 7 skipped, three phases adjusted. Everything
else is unchanged.

**Phase 8 (secrets).** `CORS_ORIGIN` is still **required**: the API refuses to boot in production without it. Set it to whatever origin will call
the API (the box's own origin once Caddy proxies `/api`, or `http://localhost:4200` while
developing).

**Phase 9 (bring up).** Include the LAN overlay — it adds the Caddy `web` service on `:80`:

```bash
cd ~/cocktailapp/deploy
docker compose -f docker-compose.yml -f docker-compose.lan.yml up -d --build
docker compose ps                 # api + mongo + web Up, mongo healthy
```

**Phase 11 (verify).** From any machine on the home network, or over WireGuard:

```bash
curl -o /dev/null -w '%{http_code}\n' http://<box-lan-ip>/                    # the SPA
docker compose exec web wget -qO- http://api:3000/api/catalog | head -c 120   # the API
```

`/api/…` on port 80 returns the SPA shell with HTTP 200, not the API — Caddy has no `/api` proxy and
its `try_files` fallback catches the path. The API publishes no host port at all, so the admin
dashboard needs the extra `-f docker-compose.admin.yml` overlay (README §8).

> **A remotely hosted frontend cannot use a LAN-only backend** — which is one of the reasons there
> is no longer a remotely hosted frontend. An HTTPS page calling `http://<lan-ip>` is active
> mixed content and is blocked by the browser, and `CORS_ORIGIN` here is still the placeholder
> `http://localhost:4200`, so the API would refuse that origin anyway. Same-origin via Caddy answers
> both, and is what [`../docs/plans/public-access.md`](../docs/plans/public-access.md) step 1 builds.
> Until then the box is verified with `curl` (and a LAN-served build), and accounts/sync stay off —
> `authEnabled: false` in `frontend/src/environments/environment.prod.ts`.

> Port 80 binds to **all** interfaces, and UFW does not filter it: Docker's DNAT rules run ahead of
> UFW's INPUT chain. That is fine on a trusted home LAN; do not port-forward it from the router.
> Publishing to the internet is [`../docs/plans/public-access.md`](../docs/plans/public-access.md).
