# Subsystem plan: BACKUPS for aartfileserver (Immich + Nextcloud + Barkast)

Research-only subsystem design. No changes made to the system.

## Verified facts (2026)

| Thing | Version / price | Source seen |
|---|---|---|
| restic | 0.19.1, 2026-07-05 (0.19.0 2026-06-09) | restic.net/blog, GitHub releases |
| Kopia | 0.23.1, 2026-06-16 — bugfix for a race that could cause DATA LOSS | GitHub releases |
| BorgBackup | 1.4.5 stable, 2026-07-19; 2.0 still beta (2.0.0b24, 2026-09-02) | borgbackup.org/releases |
| Duplicati | 2.4.0 stable, ~2026-09-03 (adds parity module) | freedom.tech, GitHub |
| Immich | v2.0.0 = first stable (Oct 2025); now v3.x, v3.2.0-rc.1 2026-08-27 | GitHub discussions |
| ntfy | server 2.27.0 (2026-08-04), Android 1.25.2, iOS 1.7.0 | docs.ntfy.sh/releases |
| Healthchecks | 4.3.20260824 self-hosted; hosted free tier = 20 checks | Docker Hub, healthchecks.io |
| Ubuntu 24.04 restic apt | 0.16.4-2ubuntu0.24.04.3 — TOO OLD, install binary | Launchpad |

## Storage arithmetic (hard constraint)

437 GB free, ONE disk, LVM VG fully allocated (no LVM snapshots possible).

Budget: OS/docker 25 + Barkast 5 + dumps 5 + 10% headroom 47 = 82 GB fixed.
Library L costs L (originals) + 0.20L (thumbs/transcodes) + 0.02L (restic cache) = 1.22L.

    1.22L <= 355  ->  L <= ~290 GB max live library

With a local restic repo also on the internal disk: 2.27L <= 355 -> L <= 156 GB, AND it
would not be a backup (same disk). => external disk is MANDATORY.

## Decisions

1. Engine: **restic 0.19.1** (BSD-2). Not Kopia (younger, June-2026 data-loss race).
   Not Borg (1.x cannot write object storage; 2.0 beta). AVOID Duplicati (restore
   without local SQLite requires DB recreate — documented multi-day rebuilds).
2. rclone for tier-2 repo copy only.
3. Offsite tier 1: **Hetzner Storage Box BX11** 1 TB €3.20/mo excl VAT. Unlimited
   traffic, native restic/Borg/rclone, ZFS snapshots at /.zfs/snapshot that are
   READ-ONLY over SSH -> real immutability the box cannot destroy. DE/FI jurisdiction.
4. Offsite tier 2 (crown jewels only, <10 GB): **Backblaze B2 EU Central** — free
   under the 10 GB free tier. Different provider, different jurisdiction.
5. Local fast-recovery: external 4 TB USB HDD (~€110), btrfs for checksums.
6. Reject Scaleway Glacier for a restic repo (restic reads index/snapshot objects
   constantly; cold storage breaks that).

## Key non-obvious findings

- Immich docs CHANGED in v2.5.0. Current documented command is `pg_dump --clean
  --if-exists --dbname= --username=`, NOT `pg_dumpall`. Restore needs a `sed`
  search_path rewrite + `psql --single-transaction --set ON_ERROR_STOP=on`.
- Do NOT gzip/age the SQL dumps before restic: it destroys dedup between daily
  dumps (14 x 2 GB -> 28 GB instead of ~2.2 GB). restic already encrypts AES-256.
- The repo's existing deploy/backup.sh age flow stays correct for hand-carried
  copies, but is redundant (and dedup-hostile) inside the restic path.
- Self-hosting the dead-man's switch on the same box is useless. Use hosted
  healthchecks.io free tier.
- Keep paying Google until restore drill T4 (bare-metal from offsite only) passes.

## Ordering

External disk -> local repo -> Hetzner repo -> dump scripts -> timers ->
monitoring -> key escrow -> restore drill -> only then cancel Google One.
