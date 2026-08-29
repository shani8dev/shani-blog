---
slug: shani-deploy-reference
title: 'shani-deploy Reference — Every Flag, Every Workflow'
date: '2026-04-26'
tag: 'Reference'
excerpt: 'The complete reference for shani-deploy — the atomic update and rollback tool at the heart of Shani OS. Every flag, every use case, every edge case covered: update, rollback, dry-run, cleanup, optimize, channel management, and more.'
cover: /assets/images/blog/shani-deploy-reference.webp
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '8 min'
series: 'Shani OS Reference'
---

> **Note:** This post has been superseded by [Updates on Shani OS](https://blog.shani.dev/post/shani-os-updates), which merges `shani-deploy` and `shani-update` into a single reference. The content below remains accurate.


`shani-deploy` is the tool that makes Shani OS's atomic update and rollback model work. It downloads, verifies, and deploys OS images to the inactive Btrfs slot — never touching the running system — and handles rollback, storage cleanup, and deduplication.

This post is the complete reference. For the conceptual explanation of why the blue-green model exists, start with [Why Your OS Update Should Never Break Your Computer](https://blog.shani.dev/post/why-os-updates-should-never-break). For the full architectural detail, see [The Architecture Behind Shani OS](https://blog.shani.dev/post/shani-os-architecture-deep-dive). Full reference: [docs.shani.dev — System Updates](https://docs.shani.dev/doc/updates/system).

---

## Quick Reference

```bash
sudo shani-deploy                        # update (stable channel)
sudo shani-deploy -r                     # roll back to previous slot
sudo shani-deploy -d                     # simulate update without changes (dry-run)
sudo shani-deploy -c                     # remove old backups and cached downloads
sudo shani-deploy -o                     # run on-demand block deduplication
sudo shani-deploy -t latest              # use latest channel for this run
sudo shani-deploy -f                     # redeploy even if already current
sudo shani-deploy --download-only        # fetch and verify the update image, don't deploy it
sudo shani-deploy -v                     # verbose output
sudo shani-deploy --set-channel stable   # permanently set the update channel
sudo shani-deploy --set-channel latest
sudo shani-deploy --skip-self-update     # skip the self-update check
sudo shani-deploy --update-genefi        # pull latest gen-efi from upstream for this run
sudo shani-deploy --verify-existing      # verify current deployment integrity without updating
sudo shani-deploy --list-backups         # list available rollback backups with timestamps
sudo shani-deploy --channel-status       # show latest/stable versions available remotely
```

---

## Update Notifications

`shani-update` is the user-facing update manager that runs at login and handles the full update lifecycle: it detects boot failures, checks if a staged update needs a reboot, checks if you're running a newly deployed slot, and looks for available OS updates. When an update is found, it shows a GUI dialog asking whether to install now or later. See [shani-update Reference](https://blog.shani.dev/post/shani-os-update-notifications) for the full details.

`shani-deploy` is the lower-level tool that does the actual work: download, verify, extract, and stage the new image. You can run it directly at any time:

```bash
sudo shani-deploy
```

---

## How shani-deploy Updates Itself

Before doing anything else, `shani-deploy` checks GitHub for a newer version of itself. If found, it downloads the new version, persists all current state to a temp file under `/run`, and re-executes — so you always run the latest deployment logic regardless of when you installed. State persistence covers all flags, channel selection, download progress, and slot tracking, so the re-executed process picks up exactly where the parent left off.

Use `--skip-self-update` to bypass this check in environments where the network is restricted or you want a specific version.

---

## Core Operations

### `sudo shani-deploy` (update)

The primary update command. Steps performed in order:

1. **Self-update check** — downloads newer version of itself if available and re-execs
2. **Slot detection** — determines the active and candidate slots
3. **System inhibit** — blocks sleep, shutdown, and lid-close for the duration
4. **Boot validation** — confirms the boot environment is consistent
5. **Space check** — verifies at least 10 GB free on the Btrfs filesystem
6. **Fetch metadata** — downloads the latest release manifest from the CDN (R2 primary, SourceForge fallback)
7. **Already current check** — exits cleanly if the active slot is already the latest version (unless `-f` is used), running backup cleanup and download cleanup as maintenance
8. **Download** — tries a `zsync2` differential fetch first (only if `zsync2` is installed and a previous image is still cached in `/data/downloads/`), falling back to a full download via `aria2c`, then `wget`, then `curl`
9. **SHA256 verify** — verifies checksum after download, regardless of which download path produced the file
10. **GPG verify** — verifies signature against the Shani OS GPG key (`7B927BFFD4A9EAAA8B666B77DE217F3DA8014792`)
11. **Snapshot** — takes a timestamped Btrfs snapshot of the inactive slot before writing
12. **Extract** — pipes the verified image into `btrfs receive`
13. **UKI generation** — runs `gen-efi configure <inactive-slot>` inside a chroot of the new slot to build and sign a Unified Kernel Image
14. **Boot entry update** — updates systemd-boot entries; the new slot becomes next-boot default with `+3-0` boot count tries
15. **Reboot marker** — writes `/run/shanios/reboot-needed` (tmpfs, auto-cleared on reboot) so `shani-update` can show a restart dialog
16. **Auto-reboot** — opt-in only; the new slot is ready to boot into immediately, so no reboot happens on its own unless `AUTO_REBOOT=yes` was set (see [Auto-Reboot After Update](#auto-reboot-after-update) below)

Nothing in your running OS is touched at any point. The chroot bind-mounts `data`, `etc`, `var`, and `swap` from the live system so `gen-efi` has access to the MOK keys, vconsole config, and swap offset.

### `sudo shani-deploy --download-only`

Runs the fetch, checksum, and GPG-verify steps (1–10 above) and then exits — the image is cached in `/data/downloads/` but never extracted or deployed. Useful for pre-fetching an update over a metered or slow connection before deploying it later, or for splitting "download" and "deploy" into separate maintenance-window steps.

```bash
sudo shani-deploy --download-only
# ... later, once the window opens:
sudo shani-deploy   # deploys the already-downloaded, already-verified image
```

Cannot be combined with `-r`, `-c`, `-o`, or `--set-channel`.

### `sudo shani-deploy -r` (rollback)

Restores the inactive slot from its most recent timestamped Btrfs snapshot and sets it as the next-boot default.

**Important:** Run this from the OS copy you want to **keep**. If you are running `@blue` and want to revert `@green` to its previous state, run rollback from `@blue`.

Steps performed:
1. Detects the active (booted) slot
2. Finds the most recent backup snapshot of the inactive slot
3. Restores the inactive slot from that snapshot
4. Regenerates the UKI for the restored slot via a chroot
5. Updates systemd-boot entries

Then reboot. Your running system is never touched.

```bash
# Check which slot you are on before rollback
cat /data/current-slot

# Roll back
sudo shani-deploy -r

# Reboot
sudo reboot
```

### `sudo shani-deploy -d` (dry-run)

Simulates the entire update process without making any changes. Downloads metadata, checks versions, shows what would happen — but does not download the image or write anything.

```bash
sudo shani-deploy -d
# Output shows: current slot, target version, what would be downloaded, what would change
```

---

## Auto-Reboot After Update

By default, a successful `sudo shani-deploy` does **not** reboot the machine — the new slot is fully deployed and bootable the moment the script finishes, so the log prints "Please reboot to switch to the updated slot" and leaves the actual reboot up to you, whenever it's convenient.

```bash
# Opt in to an automatic reboot 60 seconds after deployment
sudo AUTO_REBOOT=yes shani-deploy

# Change the delay (in seconds)
sudo AUTO_REBOOT=yes AUTO_REBOOT_DELAY=300 shani-deploy

# Cancel a pending auto-reboot (if AUTO_REBOOT=yes armed one, within the delay window)
sudo systemctl stop shanios-auto-reboot.timer
```

When enabled, the timer runs as its own systemd unit outside `shani-deploy`'s process, so it fires even if you close the terminal — it only doesn't fire if you stop it first. Auto-reboot is skipped entirely in `--dry-run`, and does not apply to `-r`/rollback, `-c`/`--cleanup`, `-o`/`--optimize`, or `--download-only`, none of which change the next-boot slot.

---

## Differential Downloads (zsync2)

Every release image ships with a `.zsync` control file alongside it. If `zsync2` is installed and a previous image is still sitting in `/data/downloads/` — normally left there by the last update cycle, since cleanup only ever removes everything *except* the most recent image — `shani-deploy` tries a differential fetch first: only the blocks that changed since that cached image, instead of the full file.

This is purely an optimization, not a shortcut around verification. `zsync2` is an actively developing, upstream-experimental tool, so any hiccup (not installed, no local image to diff against, timeout, bad exit code) falls straight through to the ordinary full download. Whichever path produced the file, it still goes through the same SHA256 and GPG checks afterward — nothing about a differential download is trusted until it passes those, same as a full download.

Nothing to configure here — it only kicks in against R2 (the `.zsync` file's embedded target URL always points there) and only when there's actually something local to diff against.

---

## Cleanup and Maintenance

### `sudo shani-deploy -c` (cleanup)

Removes timestamped slot backup snapshots and cached download files. Safe to run at any time — it does not remove the active slot, the inactive slot, or any user data. Backup cleanup requires mounting the root Btrfs volume at subvolid=5.

Run this when:
- You are running low on disk space
- You have successfully applied and tested an update and no longer need the rollback snapshots
- A failed update left a partial download in `/data/downloads/`

### `sudo shani-deploy -o` (optimize)

Runs an on-demand `duperemove` block-level deduplication pass across the entire Btrfs root. This complements the continuous background deduplication performed by `bees`.

```bash
sudo shani-deploy -o
```

This can take several minutes on large filesystems. It is safe to run while the system is in normal use.

---

## Update Channels

Shani OS supports two update channels:

**`stable`** (default): Monthly validated builds. These images have gone through QA before release. Recommended for all users.

**`latest`**: More frequent releases. Closer to cutting-edge but released before the full stable QA cycle.

```bash
# Use latest channel for one update only
sudo shani-deploy -t latest

# Switch default channel permanently (writes to /etc/shani-channel)
sudo shani-deploy --set-channel latest

# Switch back to stable
sudo shani-deploy --set-channel stable

# Check current channel
cat /etc/shani-channel
```

The channel file is `/etc/shani-channel`. Both `shani-deploy` and `shani-update` read from this file.

---

## Advanced Flags

### `-f` / `--force`

Forces a redeploy even if the active slot is already running the latest available version. Useful for repairing a corrupted slot without waiting for a new release.

```bash
sudo shani-deploy -f
```

### `-v` / `--verbose`

Enables debug-level logging, showing every command executed and detailed progress for download, extraction, and UKI generation.

```bash
sudo shani-deploy -v
```

### `--skip-self-update`

Skips the self-update check at startup. Useful when testing a specific version of `shani-deploy` or when network access to GitHub is restricted.

### `--update-genefi`

Downloads the latest `gen-efi` from the upstream GitHub repository and uses it inside the chroot for this deployment, without installing it to the host system. Useful when a `gen-efi` fix is available but you haven't yet received it through an OS update.

---

## Automated Updates (Fleet / Unattended)

For fleet deployments where updates should apply automatically during a maintenance window:

```bash
# /etc/systemd/system/shani-autoupdate.service
[Unit]
Description=Shani OS Automatic Update

[Service]
Type=oneshot
ExecStart=/usr/local/bin/shani-deploy
```

```bash
# /etc/systemd/system/shani-autoupdate.timer
[Unit]
Description=Weekly Shani OS Update

[Timer]
OnCalendar=Sunday 02:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable --now shani-autoupdate.timer
```

After the update stages, `shani-deploy` writes `/run/shanios/reboot-needed`. You can check for this marker in your maintenance window logic and schedule the reboot separately.

**Pre-staging the download separately:** if you'd rather fetch and verify the image ahead of the maintenance window (over a slow or metered link, or just to shrink the window itself) instead of a full `shani-deploy` run, use the ready-made timer that ships with `shani-deploy` — disabled by default:

```bash
sudo systemctl enable --now shani-download-only.timer
```

It runs `shani-deploy --download-only` 30 minutes after boot and once a day after that (randomized by up to 2 hours), and is a no-op if the current image is already cached and verified. Your maintenance-window `shani-autoupdate.timer` above then deploys an already-downloaded image instead of fetching it live.

---

## Boot Counting and Automatic Rollback

After an update, `shani-deploy` registers the new slot in systemd-boot with `+3-0` boot-count tries. This means:

- If the new slot boots successfully and the boot-ok marker is written, the boot count is marked successful and the slot becomes the permanent default.
- If the new slot fails to boot, systemd-boot decrements the boot count on each attempt. After three failed attempts, systemd-boot automatically falls back to the previous slot.

This fallback requires no user action and works even when the system cannot reach a login prompt.

On first login after a fallback, `shani-update` detects the mismatch between the booted slot and `/data/current-slot` and shows a GUI dialog offering to roll back the failed slot so it is clean for the next deployment.

---

## Understanding the Slot Files

```bash
# Which slot is currently active (written by shani-deploy after a successful update)
cat /data/current-slot

# Reboot-needed marker (tmpfs — cleared automatically on reboot)
# Written by shani-deploy after staging an update
cat /run/shanios/reboot-needed

# Boot state tracking
ls /data/
# boot-ok           — written on successful boot
# boot_failure      — written by check-boot-failure.sh if fallback is detected
# boot_hard_failure — written by the dracut hook if a slot fails to mount
# boot_failure.acked — written by shani-update when it acknowledges the failure

# Slot backup snapshots (on the root Btrfs volume)
sudo btrfs subvolume list / | grep backup
# @blue_backup_YYYYMMDD-HHMMSS
# @green_backup_YYYYMMDD-HHMMSS
```

---

## Resources

- [docs.shani.dev — System Updates](https://docs.shani.dev/doc/updates/system) — full update configuration reference
- [The Architecture Behind Shani OS](https://blog.shani.dev/post/shani-os-architecture-deep-dive) — how slots and the update pipeline work
- [Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide) — update failure recovery
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
