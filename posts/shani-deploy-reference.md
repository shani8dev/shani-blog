---
slug: shani-deploy-reference
title: 'shani-deploy Reference — Every Flag, Every Workflow'
date: '2026-04-26'
tag: 'Guide'
excerpt: 'The complete reference for shani-deploy — the atomic update and rollback tool at the heart of Shani OS. Every flag, every use case, every edge case covered: update, rollback, dry-run, storage-info, cleanup, optimize, and more.'
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

`shani-deploy` is the tool that makes Shani OS's atomic update and rollback model work. It downloads, verifies, and deploys OS images to the inactive Btrfs slot — never touching the running system — and handles rollback, storage analysis, and cleanup.

This post is the complete reference. For the conceptual explanation of why the blue-green model exists, start with [Why Your OS Update Should Never Break Your Computer](https://blog.shani.dev/post/why-os-updates-should-never-break). For the full architectural detail, see [The Architecture Behind Shani OS](https://blog.shani.dev/post/shani-os-architecture-deep-dive). Full reference: [docs.shani.dev — System Updates](https://docs.shani.dev/doc/updates/system).

---

## Quick Reference

```bash
sudo shani-deploy                       # update (stable channel)
sudo shani-deploy update                # same as above
sudo shani-deploy --rollback            # roll back to previous slot
sudo shani-deploy --dry-run             # simulate update without changes
sudo shani-deploy --status              # check current state
sudo shani-deploy --storage-info        # disk usage report
sudo shani-deploy --cleanup             # remove old backups and cache
sudo shani-deploy --optimize            # run on-demand block deduplication
sudo shani-deploy --version             # show version
sudo shani-deploy -t latest             # use latest channel for this run
sudo shani-deploy --force               # redeploy even if already current
sudo shani-deploy --no-reboot           # prepare update, skip reboot prompt
```

---

## Update Notifications

A separate background service, `shani-update`, runs as a user-level systemd service and monitors for new OS images. When a new image is available on your configured channel, it sends a desktop notification — you can then choose when to run `sudo shani-deploy update`. There is no automatic update; the notification is informational only.

```bash
# Check the notification service status
systemctl --user status shani-update.service
systemctl --user status shani-update.timer

# View notification logs
journalctl --user -u shani-update.service -n 20
```

---

## How shani-deploy Updates Itself

Before doing anything else, `shani-deploy` checks GitHub for a newer version of itself. If a newer version is found, it downloads it and re-executes — so you always run the current deployment logic regardless of when you installed. This is intentional: improvements to the update pipeline reach you before the OS image update does.

---

## Core Operations

### `sudo shani-deploy` / `sudo shani-deploy update`

The primary update command. Steps performed in order:

1. **Self-update check** — downloads newer version of itself if available
2. **Slot detection** — confirms which slot is active (`/data/current-slot`)
3. **Pending check** — if a previous update was interrupted, reports the state and stops
4. **Lock** — blocks sleep, shutdown, and lid-close for the duration
5. **Fetch metadata** — downloads the latest release manifest from the CDN
6. **Already current check** — if the active slot is already the latest version, reports this and exits (unless `--force` is used)
7. **Download** — streams the image with resume support via `aria2c`
8. **SHA256 verify** — verifies checksum inline during download
9. **GPG verify** — verifies signature against the Shani OS public key
10. **Snapshot** — takes a timestamped Btrfs snapshot of the inactive slot before writing
11. **Extract** — pipes the verified image into `btrfs receive`
12. **UKI generation** — runs `gen-efi generate --slot <inactive>` to build and sign a new Unified Kernel Image
13. **Boot entry update** — updates systemd-boot entries; inactive slot becomes next-boot default with `+3-0` boot count
14. **Notification** — desktop notification and terminal prompt to reboot

Nothing in your running OS is touched at any point.

### `sudo shani-deploy --rollback`

Restores the inactive slot from its most recent timestamped snapshot and sets it as the next-boot default.

**Important:** Run this from the OS copy you want to **keep**. If you are running `@blue` and want to revert to the previous `@green`, run rollback from `@blue`.

Steps performed:
1. Detects active slot
2. Finds the most recent backup snapshot of the inactive slot
3. Restores the inactive slot from that snapshot
4. Regenerates the UKI for the restored slot
5. Updates systemd-boot entries

Then reboot. Your running system is never touched.

```bash
# Check which slot you are on before rollback
cat /data/current-slot

# Roll back
sudo shani-deploy --rollback

# Reboot
sudo reboot
```

### `sudo shani-deploy --dry-run`

Simulates the entire update process without making any changes. Downloads metadata, checks versions, shows what would happen — but does not download the image, does not write anything, does not change the bootloader.

Use this when:
- You want to know if an update is available without applying it
- You are bandwidth-conscious and want to plan the download
- You are in a testing environment and want to verify the pipeline

```bash
sudo shani-deploy --dry-run
# Output shows: current slot, target version, what would be downloaded, what would change
```

---

## Status and Information

### `sudo shani-deploy --status`

Shows the current state of both slots:

```
Current slot: blue
@blue version: 2026.04.15
@green version: 2026.04.01 (previous update target)
Boot entry: shanios-blue (Active), shanios-green (Candidate)
Update available: yes — 2026.04.22
```

### `sudo shani-deploy --storage-info`

Reports accurate compressed and deduplicated disk usage across the Btrfs filesystem:

```
Btrfs storage report:
  @blue (active):  3.2 GB (compressed: 2.1 GB)
  @green:          3.2 GB (compressed: 1.8 GB, shared with blue: 1.7 GB)
  @home:           45 GB
  @flatpak:        8.3 GB
  @nix:            4.1 GB
  @containers:     2.8 GB
  Total filesystem: 72.4 GB (compressed effective: 48.1 GB)
```

Uses `compsize` internally for accurate Btrfs-aware disk accounting — `df` alone underreports due to compression and deduplication.

### `sudo shani-deploy --version`

Shows the installed version of `shani-deploy` itself and the current OS image versions.

---

## Cleanup and Maintenance

### `sudo shani-deploy --cleanup`

Removes timestamped slot backup snapshots and cached download files. Safe to run at any time — it does not remove the active slot, the inactive slot, or any user data.

Run this when:
- You are running low on disk space
- You have successfully applied and tested an update and no longer need the previous backup
- A failed update left a partial download in the cache

```bash
# Check what cleanup would remove
sudo shani-deploy --storage-info

# Run cleanup
sudo shani-deploy --cleanup
```

### `sudo shani-deploy --optimize`

Runs an on-demand `duperemove` block-level deduplication pass across the entire Btrfs root. This is in addition to the continuous background deduplication performed by `bees`.

Run after a large update or when you notice the filesystem has grown more than expected:

```bash
sudo shani-deploy --optimize
```

This can take several minutes on large filesystems. It is safe to run while the system is in normal use.

---

## Update Channels

Shani OS supports two update channels:

**`stable`** (default): Monthly validated builds. These images have gone through QA before release. Recommended for all users.

**`latest`**: More frequent releases. Closer to cutting-edge but released before the full stable QA cycle. Use for testing or if you want the newest packages quickly.

```bash
# Use latest channel for one update
sudo shani-deploy -t latest

# Switch default channel permanently
echo "latest" | sudo tee /etc/shani-deploy/channel

# Switch back to stable
echo "stable" | sudo tee /etc/shani-deploy/channel

# Check current channel
cat /etc/shani-deploy/channel
```

---

## Advanced Flags

### `--force`

Forces a redeploy even if the active slot is already running the latest available version. Useful for repairing a corrupted slot without waiting for a new release.

```bash
sudo shani-deploy --force
```

### `--no-reboot`

Prepares the update fully (downloads, verifies, extracts, generates UKI, updates bootloader) but does not prompt for a reboot. The update is staged and will take effect on the next reboot you initiate.

Useful for:
- Automated updates scheduled during a maintenance window
- Fleet deployments where reboot timing is managed separately

```bash
sudo shani-deploy --no-reboot
# ... update is prepared ...
# Reboot at any time to apply
sudo reboot
```

### `--repair-boot`

Regenerates the bootloader entries and UKIs for both slots without downloading or extracting anything. Use when boot entries have become corrupted or are pointing to the wrong slot.

```bash
sudo shani-deploy --repair-boot
```

---

## Automated Updates (Fleet / Unattended)

For fleet deployments where updates should apply automatically during a maintenance window:

```bash
# /etc/systemd/system/shani-autoupdate.service
[Unit]
Description=Shani OS Automatic Update

[Service]
Type=oneshot
ExecStart=/usr/bin/shani-deploy update --no-reboot
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

The `--no-reboot` flag means the update is staged but not applied until the next scheduled reboot in your maintenance window.

---

## Boot Counting and Automatic Rollback

After an update, `shani-deploy` registers the new slot in systemd-boot with `+3-0` boot-count tries. This means:

- If the new slot boots successfully and reaches `multi-user.target`, the boot count is marked successful and the slot becomes the permanent default.
- If the new slot fails to boot (kernel panic, filesystem error, init failure), systemd-boot decrements the boot count. After three failed attempts, systemd-boot automatically falls back to the previous slot.

This fallback requires no user action and works even when the system cannot reach a login prompt.

The startup check script (`startup-check.sh`) runs 15 seconds after login. If it detects a boot failure (booted slot differs from expected), it offers a GUI prompt to run `shani-deploy --rollback` and reboot.

---

## Understanding the Slot Files

```bash
# Which slot is currently active
cat /data/current-slot

# Boot outcome tracking
ls /data/
# boot-ok        — written on successful boot
# boot_failure   — written if a failure was detected

# Slot backup snapshots
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
