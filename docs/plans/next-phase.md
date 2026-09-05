<!-- Written 2026-09-04. Produced by a 26-agent audit of the repo against the running box,
     with every finding adversarially verified before it was written down. -->

# CocktailApp — one merged plan

## Where this actually stands

The box works and the software is further along than the docs say. `http://192.168.1.100:8080/api/catalog` serves 156/156 at version `4f96b3dc18b4`, Docker/Node/SSH are in, sleep is properly masked, Wi-Fi power-save is fixed and persistent, and the LV is extended to 466 GB. What is *not* true is anything about unattended behaviour: the containers were hand-started 18 minutes after boot, so nothing has ever proven the stack comes back, and there is not one backup in existence anywhere — `age` isn't installed, `AGE_RECIPIENT` is still the example key, and `deploy/restore.sh` as written restores over the *live* database, so the first time you run it will also be the first time you test it. Meanwhile the product itself is shipping a wrong answer on its most important screen: I re-verified that `pineapple-gingerale-smoothie` is "makeable" with a completely empty bar, because the mocktail importer stamped `role: garnish` from ingredient category rather than recipe use, and `npm run validate:seed` prints green over it. And one correction to the brief you were handed: **the GHCR image job already exists** (`.github/workflows/ci.yml:60-99` builds and pushes `ghcr.io/<owner>/barkast-api:<sha>`) — Phase 13 is smaller than it looks, though still not next.

**The conflict, named:** the ship lens wants accounts on this week; the resilience lens wants nothing turned on until a restore has succeeded. I'm siding with resilience, but only on the *narrow* point, and here's why the tension mostly dissolves: the ship lens found that flipping `authEnabled` on the Netlify build **cannot work at all** — HTTPS page, plain-HTTP LAN API, blocked mixed content, and because `apiBaseUrl` is relative `/api/` and `_redirects` is `/* /index.html 200`, every auth call would return a 200 with an HTML body and look like an app bug. So the internet-facing ship is off the table this phase regardless. What's left is a LAN same-origin deploy, which is cheap and safe. Build it early; the gate is not "deploy it", it's **"invite anyone other than yourself to register"** — that waits for a proven restore. Losing your own test account costs nothing; losing your household's cabinets costs everything.

---

## Amendment — the hosting decision this plan predates

This plan was written while the working assumption was still "Netlify stays public, the box adds
accounts and sync". On 4 Sep 2026 Aart decided otherwise, and two of the plan's own open questions are
answered by that decision rather than by further analysis.

**The box becomes production.** Caddy on the box serves the SPA at `/` *and* proxies `/api/*` to the
NestJS container, behind a Cloudflare Tunnel. Netlify is retired. Stated goal: maximum independence —
own hardware, own data, no vendor lock-in. The tunnel is kept only because it is the one dependency
that gives something back (it hides the home IP and absorbs abuse) and it stays reversible: point DNS
at the home IP and Cloudflare is out of the path. The line has a public routable IP and no CGNAT, so
running without any tunnel is technically possible; it was declined to keep the home address private.

> **Amended 2026-09-05 — the tunnel rationale above is now contested, on a ground it did not consider.**
> [`private-cloud-sovereignty.md`](private-cloud-sovereignty.md) found that a Cloudflare Tunnel
> **terminates TLS at the edge** — inherent to how WAF, Access and caching work. A Barkast login
> therefore sends the e-mail address *and the password itself* (POST body, not the hash) through a US
> company. That is the only place in either plan where **other people's** personal data is processed by
> a third party in plaintext, which makes it a GDPR responsibility rather than a preference. Two further
> points: the tunnel is *less* reversible than assumed — it cannot coexist with moving DNS off
> Cloudflare, because a tunnel hostname needs a CNAME to `<UUID>.cfargotunnel.com` that only proxies
> inside the same Cloudflare account — and the "hides the home IP" benefit disappears anyway the moment
> a WireGuard port is forwarded, which the private-cloud plan now does.
>
> This does not settle it; it adds a cost that was not on the scale. The two exits are in
> [`private-cloud.md`](private-cloud.md) phase 4: publish `api.<domain>` straight from Caddy (free, home
> IP becomes public), or put an EU VPS in front as a pure TCP/SNI forwarder that never terminates TLS
> (~€60/yr, strictly better than the tunnel on both privacy and jurisdiction). Decide once, because
> `admin.guard.ts` and the header hygiene below assume Cloudflare is in the path.

What that changes here:

- **Decision 1 ("Netlify's fate") is settled** — it is retired, not kept as a shop window. The plan's
  recommendation to leave it alone no longer applies.
- **Decision 2 ("PWA now or ship now?") dissolves.** The plan correctly found that a same-origin LAN
  deploy over plain HTTP is not a secure context, so the service worker silently no-ops and you lose
  install-to-homescreen and offline. A tunnel terminates TLS, so step 8 ships **with** the PWA intact.
  This is strictly better than either option the plan weighed.
- **Step 8 should use Caddy, not nginx.** Same shape, but Caddy obtains and renews certificates on its
  own, which matters on the day the tunnel comes off and the box faces the internet directly. The
  header hygiene the plan specifies still applies verbatim: replace `X-Forwarded-For` rather than
  appending it, and strip client-supplied `CF-Connecting-IP`.
- **`admin.guard.ts`'s inverted LAN check moves from "later" to blocking.** The plan parks it as
  harmless while LAN-only. Once a tunnel is in front, every legitimate request carries
  `CF-Connecting-IP`, so a guard that rejects on its *presence* locks you out of your own dashboard —
  while the header remains client-settable. It has to be fixed as part of step 8, not after it.

What does **not** change: steps 1 through 5 are untouched by any of this. The hero-feature bug, the
reboot drill, and above all the backup-and-restore drill are prerequisites regardless of where the app
ends up being served from. Nothing below step 5 should start before step 5 is green.

---

## do-now

### 1. Fix the hero feature's wrong answers, and make the validator able to see them
One editing pass, one commit. Verified: 57 lines carry a role, exactly 1 cocktail has zero required lines, and 8 IBA cocktails have no `baseSpirit`.

- Root cause is `scripts/import-mocktails.mjs:74-75` applying `ROLE_BY_CATEGORY` from `base.category`. The importer is spent — fix the data in `iba-cocktails-seed.json` directly.
- Enumerate: `node -e "const c=require('./frontend/public/catalog.json');for(const ck of c.cocktails)for(const l of ck.ingredients)if(l.role)console.log(ck.id,l.ingredientId,l.amount,l.unit,l.role)"`
- De-role unambiguously: `aloha-fruit-punch`/pineapple 360 ml, `spiced-peach-punch`/brown-sugar 120 ml, `cranberry-punch`/almond-flavoring 1 tbsp, plus the `piece` lines on `pineapple-gingerale-smoothie`, `lemouroudji`, `kill-the-cold-smoothie`, `grape-lemon-pineapple-smoothie`, `fruit-cooler`, `mango-orange-smoothie`, `masala-chai`, `castillian-hot-chocolate`. Keep the 11 `dash`/`pinch`/`drop` lines and the genuine garnishes (`apello`/maraschino-cherry, `limeade`/lime-peel, the lassi salt).
- Same pass: set `baseSpirit` on `americano, bellini, fernandito, garibaldi, grasshopper, kir, mimosa, spritz`.
- Same commit, `scripts/validate-seed.mjs`: (9) fail on zero non-optional/non-garnish/non-seasoning lines; (10) fail on a garnish/seasoning line with a volume unit (`isVolumeUnit` from `shared/src/measure-convert.ts`, plus `tablespoon`); (11) require `baseSpirit` and `difficulty`; (12) warn on garnish+`piece`+`amount>=1`. Run `npm run validate:seed` before the fix (must fail) and after (must pass).
- `npm run build:catalog`, commit both bundles — CI diffs them.

### 2. Cap Docker's logs and enable live-restore (5 minutes, before the reboot drill)
`/etc/docker/daemon.json` doesn't exist and both containers have an empty log-opts map; mongo wrote 640 KB in nine minutes. Unattended-upgrades is on, so dockerd *will* restart at some random hour.

```bash
sudo tee /etc/docker/daemon.json >/dev/null <<'JSON'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" }, "live-restore": true }
JSON
sudo systemctl restart docker
cd /home/aart/cocktailapp/deploy
docker compose -f docker-compose.yml -f docker-compose.admin.yml up -d --force-recreate api mongo
```
Log opts only apply to containers created after, hence `--force-recreate`. Always name the services — a bare `up -d` starts cloudflared, which crash-loops on the placeholder token (Appendix D).

### 3. Reboot drill, twice, with a measured number
This is the single biggest untested assumption, and it gates steps 9, 11 and 14.

```bash
ssh -i /c/Users/a.pieterse/.ssh/id_ed25519_barkast aart@192.168.1.100 'sudo systemctl reboot'
time (until curl -sf -m 5 -o /dev/null http://192.168.1.100:8080/api/catalog; do sleep 5; done)
```
Prove it was automatic: `docker inspect -f '{{.Name}} {{.State.StartedAt}}' $(docker ps -q)` within a minute of `uptime -s`. Second run with the lid closed and no SSH session. Note the trap: `unless-stopped` deliberately does *not* restart a container you had explicitly stopped, which is exactly the state after any manual `docker compose stop`. If it fails, add `/etc/systemd/system/barkast-stack.service` (`Type=oneshot`, `RemainAfterExit=yes`, `After=docker.service network-online.target`) with the full `-f ... -f ... up -d api mongo` invocation baked in — that also permanently kills the cloudflared footgun.

### 4. age keypair + backup on a systemd timer (not crontab)
`deploy/backup.sh` is correct and has simply never been able to run. Use a timer, not the runbook's `crontab -e`: cron silently skips runs the box was powered off for, and this box *will* be off during outages.

```bash
sudo apt install -y age && age-keygen -o /tmp/age-key.txt
```
Public key → `AGE_RECIPIENT` in `deploy/.env`. Then `scp` the private key to the laptop **and** paste it into the password manager, verify both, then `shred -u /tmp/age-key.txt`. A private key living only on the machine it protects is not a backup key. Add `barkast-backup.service` (oneshot, `User=aart`, `WorkingDirectory=/home/aart/cocktailapp/deploy`) + `barkast-backup.timer` (`OnCalendar=*-*-* 03:00:00`, `Persistent=true`). Force one run and confirm a real `.age` file exists. Then get it off the single NVMe — pull from the laptop so the box holds no outbound credentials:

```bash
rsync -av --ignore-existing -e "ssh -i /c/Users/a.pieterse/.ssh/id_ed25519_barkast" \
  aart@192.168.1.100:/home/aart/cocktailapp/deploy/backups/ /c/Users/a.pieterse/barkast-backups/
```

### 5. Restore drill — the step everything else is waiting on
Non-destructive, using namespace remap so the live DB is never touched:

```bash
age -d -i <key> backups/barkast-<stamp>.archive.gz.age | docker compose exec -T mongo \
  mongorestore -u "$MONGO_USER" -p "$MONGO_PASSWORD" --authenticationDatabase admin \
  --archive --gzip --nsFrom 'barkast.*' --nsTo 'restoretest.*'
```
Strongest single assertion: rebuild the catalog version hash from the restored data and confirm it's still `4f96b3dc18b4` — `CatalogService` derives it from the documents, so a match proves byte-equivalence, not just non-emptiness. Then decrypt one archive **on the laptop** with the box's copy of the key already shredded. Finally add a `--to-scratch` flag to `deploy/restore.sh` so the `--drop` path has to be asked for explicitly.

---

## do-next

### 6. Pin the address, then turn on mDNS
`192.168.1.100` is a DHCP lease, not a reservation; Phase 3 promises a static IP in Phase 4 that Phase 4 never sets. Bind MAC `a0:51:0b:d1:c4:91` to `.100` on the router — router-side, because a bad netplan on a Wi-Fi-only box locks you out. If you must do it in netplan, `sudo netplan try` (auto-reverts after 120 s), never `apply`. Then `sudo apt install -y avahi-daemon` — it's currently inactive, so `aartfileserver.local`, which `deploy/README`, `docker-compose.admin.yml` and Phase 11 all tell you to open, resolves nowhere today.

### 7. Firewall — and the Docker bypass that makes ufw alone useless
```bash
sudo ufw default deny incoming && sudo ufw default allow outgoing
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp
sudo ufw --force enable
```
Docker's published ports write their own DNAT rules ahead of ufw's INPUT chain, so **ufw will not protect 8080**. The reliable fix is in `docker-compose.admin.yml`: change `"8080:3000"` to `"192.168.1.100:8080:3000"`. Verify by curling from another LAN host. Same pass: gate `backend/src/common/client-ip.ts` behind `TRUST_CF_HEADER=true` (default false) — today any client can rotate a `CF-Connecting-IP` header and evade both the global 120/min throttle and the login throttle in front of a cost-12 bcrypt; and set `TRUST_PROXY=0` while the port is published directly. Note but do not fix `admin.guard.ts`, which proves "LAN-only" by the *absence* of a CF header — that must be fixed before any public exposure ever happens.

### 8. Serve the SPA same-origin from the box
The actual ship moment, and same-origin dissolves mixed content, CORS and certs at once. Add `deploy/docker-compose.selfhost.yml` with `nginx:1.27-alpine` on :80 serving the built SPA and proxying `/api/` → `api:3000`. In the nginx config use `proxy_set_header X-Forwarded-For $remote_addr;` (**replace**, not `$proxy_add_x_forwarded_for`, which appends and reopens the spoofing hole) and `proxy_set_header CF-Connecting-IP "";`. With nginx a genuine single hop, `TRUST_PROXY=1` becomes correct. Add `environment.selfhost.ts` (`authEnabled: true`, `apiBaseUrl: '/api/'` — genuinely correct *here*) and a `selfhost` config in `angular.json`. Set `CORS_ORIGIN=http://aartfileserver.local` — unused same-origin, but `main.ts:26` throws at boot if it's empty in production and it's still `http://localhost:4200`. Ship the `/privacy` route in the same build: `docs/privacy-policy.md` exists and nothing in `frontend/src` links it, and you're about to store emails and bcrypt hashes. **Accepted cost:** service workers need a secure context, so the PWA silently no-ops on LAN HTTP (`main.ts:20-22`'s `.catch(() => undefined)` hides it). That's the Tailscale decision below.

### 9. `/api/health` + a monitor that runs off the box
Nothing watches this box; `MetricsService` is in-process and resets on restart, and a monitor running *on* the box can't tell you the box is down. Add a `HealthController` (`GET /api/health` → `{ ok, mongo, catalogVersion, uptimeSeconds }`, unauthenticated, outside `AdminGuard`) and wire it as the `api` healthcheck in compose — only mongo has one today. Until it exists, the conditional-GET probe is unusually good: `curl -H 'If-None-Match: "4f96b3dc18b4"' .../api/catalog` returns 304 in 31 ms, and because `CatalogService` has no cache and rebuilds+rehashes on every request, a 304 proves API→Mongo→catalog end to end for zero bytes. Run it from the laptop every 60 s. Alert on: non-200/304 twice consecutively; ETag changing with no deploy; newest `.age` older than 36 h **in either location**; `df /` over 80%; `BAT0` discharging over 5 min; `uptime -s` outside the patch window. Deliver via `mcp__claude_ai_Ratho_DEV__send_bot_notification`, not email.

### 10. Curate the 54 imported mocktails
Sets the size of all remaining NL work, so it comes before translating. All 54 have empty `description` and no `difficulty`; 9 batch recipes claim `servings: 1` for up to 3785 ml, which the detail page's `glasses(n)` scaler happily multiplies; 7 near-duplicate pairs by Jaccard; and 4 ingredients (`fruit`, `fruit-juice`, `berries`, `carbonated-soft-drink`) are unstockable abstractions making their cocktails permanently unmakeable. Drop/merge duplicates, resolve the abstractions to concrete bases or mark them optional, set `servings` truthfully, backfill `difficulty` (rule 11 forces it). Record every deleted id in `docs/data-model.md` — favourites are stored by id, and tombstones are already listed there as an open item.

### 11. Stop `build:translations` from eating hand-written Dutch — before writing any more of it
Verified by running it: a clean regeneration used to **delete** caipirinha's hand-authored Dutch variation description, because the generator had no `variations` support and CI never ran the script. **Done** — but not the way this step prescribed, and the prescription was wrong: moving the text into `scripts/translations-nl-cocktails.json` would have *deleted the very string it was meant to save*, because `caipirinha` is in the curated `scripts/seed-data.mjs` set and the supplement loop skipped the whole entry for any id the curated loop already produced. What shipped instead: variation overlays are keyed by `CocktailVariation.key` (never by array index), both merge loops carry `variations`, the supplement loop merges per FIELD so it can still contribute variations to a curated cocktail, the Dutch text lives in `seed-data.mjs`, an unknown variation key now FAILS the run instead of being silently dropped, and `--check` runs in CI as its own step. The pipeline is genuinely circular, so `build:catalog` must run first — see `scripts/build-translations-nl.mjs:27-32` (the earlier `README.md:215` citation was wrong; that line is the MONGODB_URI password warning).

### 12. Translate the 52 missing ingredient names
**Done — and the count was already stale when this was written.** The 104/156 and 102/156 figures were measured against the 156-entry catalog; the curated seed this branch builds from is 115 bases / 126 cocktails, and the overlay covered **115/115 and 126/126** before any name was typed. What was genuinely missing is now in:

- **The assertion this step asked for** — `validate-seed.mjs` rule 17 fails the build when a base has no Dutch name (verified both ways: removing one entry exits 1, restoring it exits 0). It counts *entries*, never differences, because a brand or loanword (Campari, gin, grenadine, falernum) legitimately repeats the English name.
- The map moved out of the harvester into `scripts/translations-nl-ingredients.mjs` so both scripts can read it, and three dead entries (`coriander`, `vanilla`, `milk` — bases the seed no longer has) were dropped; the same rule warns about those.
- Two genuine mistranslations fixed: `chili-pepper` read "Rode peper" (which is also a bell pepper) → "Chilipeper", and `orange-bitters` read "Orange bitters" while every other generic type was translated → "Sinaasappelbitters".
- Four IBA cocktails (`bloody-mary`, `mimosa`, `pina-colada`, `whiskey-sour`) showed their English `notes` under the Dutch "Tips" heading, because the curated `seed-data.mjs` entry wins per entry and carried none. Dutch notes authored.
- One hard-coded Dutch string in `bar/bar.ts` ("Anonieme statistieken delen") shipped to English users too; it is an i18n key now.

**Also done — the cocktail-text gate.** `validate-seed.mjs` rule 18: whatever the English catalog carries for a cocktail (description, instructions, notes, garnish, and each variation by key), the Dutch overlay has to carry too; fields the canonical doesn't have are never demanded out of nothing. Writing it found the last real gap — **7 variations across `bellini`, `kir` and `spritz`** whose Dutch text did not exist, so the detail page rendered English variation names and descriptions under Dutch headings. Authored. To keep the gate honest it resolves the text through the new `scripts/translations-nl-text.mjs`, the same merge `build-translations-nl.mjs` emits from, so the two cannot drift. Negative-tested three ways (a dropped description, a dropped variation, an invented variation key): each exits 1, and the restored tree exits 0.

### 13. Two-device acceptance test with real accounts (Aart only until step 5 is green)
Anonymous cabinet → register (exercises the fresh-adopt union in `sync.service.ts reconcile()`); change on A, reload B (adopt-server branch, keyed on `lastServerUpdatedAt` in the `barkast.sync` localStorage key); logout/login keeps local data; `DELETE /api/me` wipes data and a lingering access token can't resurrect the doc (`me.controller.ts putData` guards this — verify it); 11 wrong passwords → 429. Watch `docker compose logs -f api` throughout.

### 14. Power: battery guard, BIOS, and a chosen patch window
Measured 24.89 Wh of 48.105 Wh design = 51.7% health, roughly 30 minutes — not the runbook's "mini-UPS". Nothing reacts to going on battery. Add `/usr/local/bin/barkast-battery-guard.sh` (reads `/sys/class/power_supply/BAT0/{status,capacity}`; at Discharging and ≤25% it `docker compose stop api mongo` for a clean Mongo checkpoint, then `systemctl poweroff`) on a 1-minute timer, and **test it** by temporarily raising the threshold and unplugging. The 4 GB swapfile can't hibernate 15 GB anyway. Separately, check the BIOS for Restore-on-AC-Power-Loss and test it honestly (`poweroff`, pull mains, restore) — if the VivoBook doesn't expose it, that's a documented limitation and the only fix is a real UPS. Then, only now that step 3 has proven recovery, set `Unattended-Upgrade::Automatic-Reboot-Time "04:30"` — after the 03:00 backup — and have the monitor alert on `uptime -s` outside that window.

### 15. Fold every measured number back into `deploy/bare-metal-runbook.md`
This is the file you rebuild from when the NVMe dies, so wrong steps cost you the hours you have least of. Corrections: line 29's battery claim → the measured 51.7%; Phase 3 → the LVM installer silently allocated 100 GB of 476.9 GB and needed `lvextend -l +100%FREE` + `resize2fs`; Phase 3's promised static IP resolved against step 6; Phase 4 → masking `sleep/suspend/hibernate/hybrid-sleep.target`, not just `HandleLidSwitch`; Phase 4 → the missing Wi-Fi power-save section including the trap that Ubuntu Server runs systemd-networkd + wpa_supplicant so the NetworkManager recipe doesn't apply; Phase 4 → the installer's OpenSSH checkbox didn't leave ssh enabled; Phase 5 → `daemon.json`; Phase 12 → systemd timer instead of crontab, plus the `--to-scratch` drill with the hash assertion; Appendix D → why HTTP + Netlify cannot work. Add a dated "Phase 15 — Prove it" section with the actual numbers. Same pass, fix the stale counts in `docs/data-model.md:139-141` and `README.md:185` — and **name the authority, not a number**: "the frozen source is `iba-cocktails-seed.json`; `npm run validate:seed` prints current counts". Replacing 104/102 with 156/156 just schedules this again.

---

## later

- **Tailscale** (`tailscale serve --bg --https=443 http://127.0.0.1:8080`) for off-LAN access and to get the PWA back with a real cert, without any public exposure. Do this once accounts are proven on the LAN.
- **Catalog/overlay version parity**: the API payload omits `locale` and `schemaVersion` that `Catalog` declares required; `applyCatalogTranslations` silently reverts the whole Dutch UI to English on mismatch. Low risk while the selfhost SPA reads its bundled catalog; fix before ever pointing `dataSource: 'api'` at the box.
- **Dutch text for the surviving mocktails** — size set by step 10, safety set by step 11.
- **The substitutes graph.** "Vervangers meetellen" currently changes the makeable count by exactly 0: 1 `parentId`, 2 `substitutes`, 4 of 631 lines with `alternativeIds` across 156 ingredients. Add the dairy/whiskey/citrus/sweetener families in the seed (no code change needed), re-measure, and if the delta is still near zero, remove the toggle rather than ship a placebo.
- **Phase 13 auto-deploy.** Smaller than believed — the GHCR job exists; only the poller is missing. Still last: automated change delivery into a box is only an asset once monitoring and backups are real.
- **Wi-Fi drop test.** Test before building a watchdog; it may already be fine, and that measurement belongs in the runbook. A €15 USB Ethernet adapter deletes the entire failure class on a box that hasn't moved since install.
- **The "Welke Cocktail" rebrand** (`origin/claude/project-hosting-plan-nwznl8`). Naming only, and it churns Mongo user/db, image tags, systemd units and backup filenames. After sync is proven, never during.
- **`admin.guard.ts`'s inverted LAN check.** Harmless while LAN-only; a hard blocker before any public exposure.

---

- ~~**New staples never reach an existing cabinet.**~~ **Done** — the migration option, not the
  prompt. `frontend/src/app/core/staple-top-up.service.ts` records the staple set it last applied
  (`barkast.staplesApplied`) and unions anything added since into a *non-empty* cabinet on load; an
  empty one is left to the wizard's own pre-tick. A cabinet with no marker (every cabinet built before
  this shipped, Aart's included) is back-filled once with every staple it lacks. It writes through the
  silent `setAll`, so a catalog change never lands in the anonymous most-added-ingredient tally. The
  accepted cost is the one the prompt would have avoided: a staple deliberately unticked comes back on
  the single run after that staple joins the catalog — and never again.

## The one thing most likely to bite

**There is no backup of any kind, and `deploy/restore.sh` restores over the live database — so the first time you need it will also be the first time it has ever run.** Today that costs a re-seed. The moment anyone other than you registers an account, it becomes unrecoverable loss of other people's data on a single NVMe with a 30-minute battery and an unproven power-on path. Steps 4 and 5 are an hour and a half combined. Do not let step 8 tempt you past them.

(Runner-up, because it's the one that's biting *right now* rather than someday: an empty bar reports a makeable cocktail, and `validate:seed` prints green over it.)

---

## Decisions only Aart can make

1. **Netlify's fate.** Recommended: leave it exactly as it is — anonymous, static, `authEnabled: false`, zero auth attack surface — as the public shop window, with accounts living only on the LAN/tailnet. The alternative (point it at the box over Tailscale) means only tailnet devices can log in, so everyone else sees a broken account screen. It also needs the Netlify production URL, which is recorded **nowhere in the repo** (only `NETLIFY_SITE_ID abff2bf1-…` in CI) — you'd have to look it up.
2. **PWA now or ship now?** Step 8 works this week but kills install-to-homescreen and offline. Tailscale restores both but adds a day. Swap their order if the PWA matters more than the calendar.
3. **The 43 ambiguous `piece`/`teaspoon` roled lines.** I've named the clear ones; the rest need your taste, not an agent's. The asymmetry that proves the rule: mint in `mojito` has no role and correctly blocks; mint in `lassi` is roled.
4. **`'other'` vs `'none'` for the 8 base-spirit-less IBA drinks** — they all contain alcohol, so `'none'` (which the 54 mocktails use) is wrong; `'other'` is honest. Confirm and write it into `docs/data-model.md` next to the enum.
5. **Which near-duplicate mocktails die**, and whether removed ids get tombstones now or later — favourites are stored by id, so deletions are user-visible breaks.
6. **Money, twice:** a real UPS versus the battery-guard workaround, and a €15 USB Ethernet adapter versus a Wi-Fi watchdog. Both are budget calls, not engineering ones.
7. **`half-and-half` has no Dutch equivalent** — "Koffiemelk" or "Halfvolle room"? And: English `description` is empty for all 156 while Dutch has 25, which inverts the "English is canonical" rule. Decide deliberately whether to drop those 25 or start writing English.