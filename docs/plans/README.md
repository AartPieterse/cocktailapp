# Plans

Working plans for this project and for the machine it runs on. Each file is a snapshot of a decision
made on a date, not a living spec — where a plan and the code disagree, the code is what is true, and
the plan tells you what someone intended and why.

| Plan | About | Status |
|---|---|---|
| [next-phase.md](next-phase.md) | What to build next in CocktailApp, ordered by dependency | Step 1 done; step 2 onward not started |
| [private-cloud.md](private-cloud.md) | Turning the same box into a private cloud — Immich and possibly Nextcloud, replacing Google Photos and Drive | Decided, nothing built |
| [private-cloud-backups.md](private-cloud-backups.md) | Backup subsystem for everything on the box, Barkast included | Research only |
| [private-cloud-coexistence.md](private-cloud-coexistence.md) | Reverse-proxy and day-2 host ops for running both stacks side by side | Stub — see the note below |
| [private-cloud-sovereignty.md](private-cloud-sovereignty.md) | Jurisdiction audit of every third party the design touches, and the EU replacements | Research done; four decisions folded back into `private-cloud.md` |

## Why the private-cloud plans live here

They are not about the cocktail app, and they say so themselves. They are here because they are about
**the same machine**: `aartfileserver` / `192.168.1.100`, the ASUS VivoBook Pro that Windows was wiped
off on 4 Sep 2026. Barkast's stack and the proposed Immich stack share that host's disk, RAM, ports,
backup window and reverse proxy, so the two sets of plans constrain each other and are worth reading
together. The conventions in [`deploy/`](../../deploy/) — age encryption, systemd timers, compose
overlays — are deliberately reused by the private-cloud design.

`private-cloud-coexistence.md` is a stub: the agent that produced it returned its design through a
structured channel rather than into the file, so only its verified version anchors survived. Treat it
as a citation list, not a plan.

## Where they contradict each other

Read these before acting on either set, because they were written for different end states:

- **Remote access.** `private-cloud.md` originally decided **Tailscale only, no open ports**. That was
  **reversed on 2026-09-05** by `private-cloud-sovereignty.md`: the owner added "ik doe dit ook om mijn
  data binnen europa te houden", and Tailscale's control plane (Delaware or Toronto entity, New York
  law) holds his home IP, device names and connection times. The line is now **plain WireGuard, two
  peers, one forwarded UDP port** — which is both more sovereign and simpler, because the home line has
  a public routable IP and never needed NAT traversal. If you read an older revision saying Tailscale,
  the sovereignty plan supersedes it.
- **Barkast's Cloudflare Tunnel is no longer safe to keep, for two independent reasons.**
  `next-phase.md` still assumes it. (1) The tunnel terminates TLS at Cloudflare's edge, so a Barkast
  login sends the e-mail address *and the password itself* through a US company — the only place in
  either plan where third parties' personal data is processed in plaintext. (2) It cannot survive the
  DNS move to deSEC: a tunnel hostname needs a CNAME to `<UUID>.cfargotunnel.com`, which only proxies
  for records in the same Cloudflare account; keeping external nameservers requires the Business plan.
  `private-cloud.md` phase 4 gives the two exits. Resolve this before building either stack.
- **Disk.** `private-cloud.md` rules out splitting a logical volume off the existing NVMe because
  `VFree = 0`. That is a direct consequence of extending the root LV to fill the volume group on
  4 Sep 2026 — the plan already accounts for it and buys a separate 2 TB SSD instead.
- **Order.** `private-cloud.md` will not let anything leave Google until a restore drill has passed.
  `next-phase.md` makes the same demand before real accounts land in Barkast. That is one drill
  serving both, not two.
- **Offsite backup target.** `private-cloud-backups.md` proposes Backblaze B2 EU Central as a second
  offsite tier. `private-cloud.md` now rules B2 out — partly jurisdiction (Delaware company, so the
  CLOUD Act follows it into Amsterdam), but mainly because restic works poorly with S3 Object Lock,
  while Hetzner Storage Box gives real immutability through read-only ZFS snapshots.
- **Library size.** `private-cloud-backups.md` does its arithmetic for a library up to ~290 GB and
  concludes an external disk is mandatory. The measured reality is **~30 GB**; `private-cloud.md` is
  the right-sized one. The external disk is still bought, but for the second medium, not for space.

## Where the plans stop and the record starts

- [`../../deploy/bare-metal-runbook.md`](../../deploy/bare-metal-runbook.md) — what was actually done
  to the box, phase by phase, including the traps the install hit.
- [`../../deploy/README.md`](../../deploy/README.md) — the operational reference for the Barkast stack.
- [`../data-model.md`](../data-model.md) — the living reference for the catalog's shape.
