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

- **Remote access.** `private-cloud.md` decides **Tailscale only, no open ports**, partly because
  Cloudflare's Free/Pro/Business terms restrict non-HTML content, so routing photos through a free
  tunnel is not allowed. `next-phase.md` keeps a Cloudflare Tunnel for Barkast — which stays fine,
  because that tunnel carries only JSON on `api.<domain>`. The two coexist; do not let one talk you
  into pointing Immich at the tunnel.
- **Disk.** `private-cloud.md` rules out splitting a logical volume off the existing NVMe because
  `VFree = 0`. That is a direct consequence of extending the root LV to fill the volume group on
  4 Sep 2026 — the plan already accounts for it and buys a separate 2 TB SSD instead.
- **Order.** `private-cloud.md` will not let anything leave Google until a restore drill has passed.
  `next-phase.md` makes the same demand before real accounts land in Barkast. That is one drill
  serving both, not two.

## Where the plans stop and the record starts

- [`../../deploy/bare-metal-runbook.md`](../../deploy/bare-metal-runbook.md) — what was actually done
  to the box, phase by phase, including the traps the install hit.
- [`../../deploy/README.md`](../../deploy/README.md) — the operational reference for the Barkast stack.
- [`../data-model.md`](../data-model.md) — the living reference for the catalog's shape.
