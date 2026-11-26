# CocktailApp — one merged plan

## Where this stands

Steps 1–5 are done: the hero-feature seed bug is fixed and `validate-seed.mjs` now catches its
class, Docker's logs are capped with `live-restore` on, the box returns unattended after a reboot,
nightly encrypted backups run on a systemd timer, and the restore drill passed. Steps 11 and 12 are
done too. **Step 8 is superseded by [public-access.md](public-access.md)** — that plan is the route
to a public address, and it owns the hardening that has to land first.

Open: 6, 7 (partly), 9, 10, 13, 14, 15.

---

## Done

1. **Hero feature.** Roles fixed in `iba-cocktails-seed.json`, `baseSpirit` backfilled, and rules 9–12
   added to `scripts/validate-seed.mjs` so an empty bar can no longer report a makeable cocktail.
2. **Docker.** `/etc/docker/daemon.json` caps logs at 10 MB × 3 and enables `live-restore`; every
   container carries it.
3. **Reboot.** dockerd restores and starts the stack on its own; the nightly backups on the days
   after a reboot ran unattended against a live Mongo. Boot-to-serving time is still unmeasured.
4. **Backups.** `age` keypair in place, `barkaart-backup.timer` nightly at 03:00 with
   `Persistent=true`, archives in `deploy/backups/`. The pull to the workstation is manual and
   lagging — that is the open half.
5. **Restore drill.** Passed: 312 documents, 18 indexes, byte-identical, live untouched.
   `deploy/restore.sh` still has no `--to-scratch` flag, so the drill needs the namespace remap by
   hand.

---

## do-next

### 6. mDNS
The address is reserved router-side, so `192.168.1.100` is stable. What is missing is `avahi-daemon`: `aartfileserver.local`, which `deploy/README` and `docker-compose.admin.yml` tell you to open, resolves nowhere. If you ever pin the address in netplan instead, use `sudo netplan try` (auto-reverts after 120 s), never `apply` — a bad config on a Wi-Fi-only box locks you out.

### 7. The two header checks that are now backwards
UFW is up and the API publishes no port, so the firewall half of this step is done. What is left is code, and it is blocking for [public-access.md](public-access.md): `backend/src/common/client-ip.ts` still trusts a client-supplied `CF-Connecting-IP`, so anyone can rotate it and evade both the 120/min throttle and the login throttle in front of a cost-12 bcrypt; and `backend/src/analytics/admin.guard.ts:31` still proves "LAN-only" by *rejecting* that header, which with no Cloudflare in the path means the check always passes. Both need a real source-address check.

### 8. Superseded
Serving the SPA same-origin, with TLS and an `/api` proxy, is [public-access.md](public-access.md). Caddy already serves the SPA; the proxy and the certificate are steps 1 and 4 there.

### 9. `/api/health` + a monitor that runs off the box
Nothing watches this box; `MetricsService` is in-process and resets on restart, and a monitor running *on* the box can't tell you the box is down. Add a `HealthController` (`GET /api/health` → `{ ok, mongo, catalogVersion, uptimeSeconds }`, unauthenticated, outside `AdminGuard`) and wire it as the `api` healthcheck in compose — only mongo has one today. Until it exists, the conditional-GET probe is unusually good: `curl -H 'If-None-Match: "<current version>"' .../api/catalog` returns 304 in tens of milliseconds, and because `CatalogService` has no cache and rebuilds+rehashes on every request, a 304 proves API→Mongo→catalog end to end for zero bytes. Run it from the laptop every 60 s. Alert on: non-200/304 twice consecutively; ETag changing with no deploy; newest `.age` older than 36 h **in either location**; `df /` over 80%; `BAT0` discharging over 5 min; `uptime -s` outside the patch window. Deliver via `mcp__claude_ai_Ratho_DEV__send_bot_notification`, not email.

### 10. Curate the 54 imported mocktails
Sets the size of all remaining NL work, so it comes before translating. All 54 have empty `description` and no `difficulty`; 9 batch recipes claim `servings: 1` for up to 3785 ml, which the detail page's `glasses(n)` scaler happily multiplies; 7 near-duplicate pairs by Jaccard; and 4 ingredients (`fruit`, `fruit-juice`, `berries`, `carbonated-soft-drink`) are unstockable abstractions making their cocktails permanently unmakeable. Drop/merge duplicates, resolve the abstractions to concrete bases or mark them optional, set `servings` truthfully, backfill `difficulty` (rule 11 forces it). Record every deleted id in `docs/data-model.md` — favourites are stored by id, and tombstones are already listed there as an open item.

### 11–12. Dutch overlay — done
The overlay covers every base and every cocktail, and the validator holds it there: rule 17 fails
the build when a base has no Dutch name, rule 18 when a cocktail's Dutch text is missing any field
the English catalog carries (description, instructions, notes, garnish, and each variation **by
key**). `build:translations` can no longer silently eat hand-written Dutch, and `--check` runs in
CI. The pipeline is circular: `build:catalog` must run before `build:translations`, then again
after.

### 13. Two-device acceptance test with real accounts (Aart only until step 5 is green)
Anonymous cabinet → register (exercises the fresh-adopt union in `sync.service.ts reconcile()`); change on A, reload B (adopt-server branch, keyed on `lastServerUpdatedAt` in the `barkaart.sync` localStorage key); logout/login keeps local data; `DELETE /api/me` wipes data and a lingering access token can't resurrect the doc (`me.controller.ts putData` guards this — verify it); 11 wrong passwords → 429. Watch `docker compose logs -f api` throughout.

### 14. Power: battery guard, BIOS, and a chosen patch window
The pack holds 26.7 Wh of 48.1 Wh design = 55.6% health, roughly 1 h 55 at the measured draw — a clean-shutdown window, not a UPS. Nothing reacts to going on battery. Add `/usr/local/bin/barkaart-battery-guard.sh` (reads `/sys/class/power_supply/BAT0/{status,capacity}`; at Discharging and ≤25% it `docker compose stop api mongo` for a clean Mongo checkpoint, then `systemctl poweroff`) on a 1-minute timer, and **test it** by temporarily raising the threshold and unplugging. The 4 GB swapfile can't hibernate 15 GB anyway. Separately, check the BIOS for Restore-on-AC-Power-Loss and test it honestly (`poweroff`, pull mains, restore) — if the VivoBook doesn't expose it, that's a documented limitation and the only fix is a real UPS. Then, only now that step 3 has proven recovery, set `Unattended-Upgrade::Automatic-Reboot-Time "04:30"` — after the 03:00 backup — and have the monitor alert on `uptime -s` outside that window.

### 15. Keep `deploy/bare-metal-runbook.md` true
This is the file you rebuild from when the NVMe dies, so a wrong step costs the hours you have least of. The measured numbers are folded in — battery health, the LVM installer's 100 GB of 476.9 GB, the masked sleep targets, the Wi-Fi power-save unit, the OpenSSH checkbox that leaves ssh disabled, `daemon.json`, the backup timer. What is left is the habit: after any change to the box, correct the phase that describes it. **Never write a catalog count into a doc** — the frozen source is `iba-cocktails-seed.json` and `npm run validate:seed` prints the current counts; a hard-coded number just schedules this step again.

---

## later

- **Catalog/overlay version parity**: the API payload omits `locale` and `schemaVersion` that `Catalog` declares required; `applyCatalogTranslations` silently reverts the whole Dutch UI to English on mismatch. Low risk while the selfhost SPA reads its bundled catalog; fix before ever pointing `dataSource: 'api'` at the box.
- **Dutch text for the surviving mocktails** — size set by step 10, safety set by step 11.
- **The substitutes graph.** "Vervangers meetellen" currently changes the makeable count by exactly 0: 1 `parentId`, 2 `substitutes`, 4 of 631 lines with `alternativeIds` across 156 ingredients. Add the dairy/whiskey/citrus/sweetener families in the seed (no code change needed), re-measure, and if the delta is still near zero, remove the toggle rather than ship a placebo.
- **Wi-Fi drop test.** Test before building a watchdog; it may already be fine, and that measurement belongs in the runbook. A €15 USB Ethernet adapter deletes the entire failure class on a box that hasn't moved since install (`eno2` is DOWN for want of a cable).

---

- ~~**New staples never reach an existing cabinet.**~~ **Done** — the migration option, not the
  prompt. `frontend/src/app/core/staple-top-up.service.ts` records the staple set it last applied
  (`barkaart.staplesApplied`) and unions anything added since into a *non-empty* cabinet on load; an
  empty one is left to the wizard's own pre-tick. A cabinet with no marker (every cabinet built before
  this shipped, Aart's included) is back-filled once with every staple it lacks. It writes through the
  silent `setAll`, so a catalog change never lands in the anonymous most-added-ingredient tally. The
  accepted cost is the one the prompt would have avoided: a staple deliberately unticked comes back on
  the single run after that staple joins the catalog — and never again.

## The one thing most likely to bite

**Every recent backup lives only on the box it is a backup of.** The nightly archives are real,
encrypted and restore-tested, but the copy to the workstation is a manual `rsync` and it is behind.
One NVMe failure takes the box and its backups together. Catching that pull up is minutes of work;
scheduling it is the real fix.

(Runner-up: the API serves an older catalog than the committed bundle, because Mongo has not been
re-seeded. Invisible today — the SPA reads its bundle — and a wrong answer the moment `/api` is
proxied.)

---

## Decisions only Aart can make

1. **The 43 ambiguous `piece`/`teaspoon` roled lines.** I've named the clear ones; the rest need your taste, not an agent's. The asymmetry that proves the rule: mint in `mojito` has no role and correctly blocks; mint in `lassi` is roled.
2. **`'other'` vs `'none'` for the 8 base-spirit-less IBA drinks** — they all contain alcohol, so `'none'` (which the 54 mocktails use) is wrong; `'other'` is honest. Confirm and write it into `docs/data-model.md` next to the enum.
3. **Which near-duplicate mocktails die**, and whether removed ids get tombstones now or later — favourites are stored by id, so deletions are user-visible breaks.
4. **Money, twice:** a real UPS versus the battery-guard workaround, and a €15 USB Ethernet adapter versus a Wi-Fi watchdog. Both are budget calls, not engineering ones.
5. **`half-and-half` has no Dutch equivalent** — "Koffiemelk" or "Halfvolle room"? And: the English `description` is empty for every cocktail while Dutch has 25, which inverts the "English is canonical" rule. Decide deliberately whether to drop those 25 or start writing English.