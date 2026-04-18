---
slug: shani-deploy-reference
title: 'shani-deploy Reference — Every Flag, Every Workflow'
date: '2026-04-26'
tag: 'Guide'
excerpt: 'The complete reference for shani-deploy — the atomic update and rollback tool at the heart of Shani OS. Every flag, every use case, every edge case covered: update, rollback, dry-run, cleanup, optimize, channel management, and more.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '8 min'
series: 'Shani OS Guides'
---

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
sudo shani-deploy -v                     # verbose output
sudo shani-deploy --set-channel stable   # permanently set the update channel
sudo shani-deploy --set-channel latest
sudo shani-deploy --skip-self-update     # skip the self-update check
sudo shani-deploy --update-genefi        # pull latest gen-efi from upstream for this run
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
8. **Download** — streams the image with resume support; tries `aria2c`, then `wget`, then `curl`
9. **SHA256 verify** — verifies checksum after download
10. **GPG verify** — verifies signature against the Shani OS GPG key (`7B927BFFD4A9EAAA8B666B77DE217F3DA8014792`)
11. **Snapshot** — takes a timestamped Btrfs snapshot of the inactive slot before writing
12. **Extract** — pipes the verified image into `btrfs receive`
13. **UKI generation** — runs `gen-efi configure <inactive-slot>` inside a chroot of the new slot to build and sign a Unified Kernel Image
14. **Boot entry update** — updates systemd-boot entries; the new slot becomes next-boot default with `+3-0` boot count tries
15. **Reboot marker** — writes `/run/shanios/reboot-needed` (tmpfs, auto-cleared on reboot) so `shani-update` can show a restart dialog

Nothing in your running OS is touched at any point. The chroot bind-mounts `data`, `etc`, `var`, and `swap` from the live system so `gen-efi` has access to the MOK keys, vconsole config, and swap offset.

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
