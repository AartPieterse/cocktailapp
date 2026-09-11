# Plans

Working plans for CocktailApp. Each file is a snapshot of a decision made on a date, not a living
spec — where a plan and the code disagree, the code is what is true, and the plan tells you what
someone intended and why.

| Plan | About | Status |
|---|---|---|
| [next-phase.md](next-phase.md) | What to build next in CocktailApp, ordered by dependency | Steps 1 and 11 done; step 2 onward not started |
| [variations.md](variations.md) | How variations are stored, and the contract for adding or removing catalog entries | Built, except the four promotions and runtime id remapping |

## The private-cloud plans moved out

Turning the same box into a private cloud — Immich for photos, Nextcloud for files, replacing Google
Photos and Drive — used to be planned here, in `private-cloud*.md`. Those files now live in their own
repository: **`~/source/repos/FileServer`**. They were never about this application; they were here
only because they concern the same machine.

That machine link is real, though, and two things still bind the two repositories together:

- **They share a host.** `aartfileserver` / `192.168.1.100` runs Barkast's stack today and the Immich
  stack later. Disk, RAM, ports, the backup window and the reverse proxy are shared, so the two sets
  of plans constrain each other. The conventions in [`deploy/`](../../deploy/) — age encryption,
  systemd timers, compose overlays — are deliberately reused by the private-cloud design.
- **One finding lands squarely on this project**, and it is the reason to read the other repo at all:

> **Barkast's Cloudflare Tunnel is no longer safe to keep, for two independent reasons, and
> `next-phase.md` still assumes it.**
>
> 1. The tunnel terminates TLS at Cloudflare's edge, so a Barkast login sends the e-mail address *and
>    the password itself* through a US company. That is the only place in either plan where third
>    parties' personal data is processed in plaintext by a third party — a GDPR responsibility, not a
>    preference.
> 2. It cannot survive the planned DNS move to deSEC: a tunnel hostname needs a CNAME to
>    `<UUID>.cfargotunnel.com`, which only proxies for records in the same Cloudflare account, and
>    keeping external nameservers requires the Business plan.
>
> The two exits are in `plan.md` phase 4 in the FileServer repo. Resolve this before building either
> stack. `next-phase.md` carries the same note inline, next to the reasoning it amends.

One more shared prerequisite: `plan.md` will not let anything leave Google until a restore drill has
passed, and `next-phase.md` makes the same demand before real accounts land in Barkast. That is **one
drill serving both**, not two.

## Where the plans stop and the record starts

- [`../../deploy/bare-metal-runbook.md`](../../deploy/bare-metal-runbook.md) — what was actually done
  to the box, phase by phase, including the traps the install hit.
- [`../../deploy/README.md`](../../deploy/README.md) — the operational reference for the Barkast stack.
- [`../data-model.md`](../data-model.md) — the living reference for the catalog's shape.
