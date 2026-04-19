---
slug: shani-os-updates
title: 'Updates on Shani OS — shani-update, shani-deploy, and the Full Reference'
date: '2026-05-12'
tag: 'Guide'
excerpt: 'The complete guide to Shani OS updates: how shani-update detects and surfaces updates automatically, and the full shani-deploy flag reference for every scenario — update, rollback, dry-run, cleanup, channel management, and automated fleet deployments.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '12 min'
series: 'Shani OS Reference'
---

Shani OS has two tools in its update pipeline. `shani-update` is the user-facing manager — it runs automatically, detects what state the system is in, and presents appropriate dialogs. `shani-deploy` is the underlying engine that downloads, verifies, and applies OS images. Understanding both is understanding the full update system.

For the architecture behind atomic updates — how blue/green slots, Btrfs, and boot counting work — see [The Architecture Behind Shani OS](https://blog.shani.dev/post/shani-os-architecture-deep-dive). For the philosophy: [Why Your OS Update Should Never Break Your Computer](https://blog.shani.dev/post/why-os-updates-should-never-break). Full reference: [docs.shani.dev — System Updates](https://docs.shani.dev/doc/updates/system).

---

## shani-deploy Quick Reference

```bash
sudo shani-deploy                        # update (stable channel)
sudo shani-deploy -r                     # roll back to previous slot
sudo shani-deploy -d                     # dry-run — simulate without changes
sudo shani-deploy -c                     # cleanup old backups and cached downloads
sudo shani-deploy -o                     # on-demand block deduplication
sudo shani-deploy -t latest              # use latest channel for this run
sudo shani-deploy -f                     # force redeploy even if already current
sudo shani-deploy -v                     # verbose output
sudo shani-deploy --set-channel stable   # permanently set update channel
sudo shani-deploy --set-channel latest
sudo shani-deploy --skip-self-update     # skip self-update check
sudo shani-deploy --update-genefi        # pull latest gen-efi for this run
```

---

## Part 1 — shani-update: The User-Facing Manager

`shani-update` runs automatically in two ways: via a desktop autostart entry (`shani-update --startup`) that fires at login after a 15-second delay, and via a systemd user timer that triggers 15 minutes after boot and every 2 hours thereafter. It can also be run manually at any time.

### What shani-update Does on Each Run

Every invocation works through a fixed priority sequence. Each step can short-circuit the rest.

**1. Fallback boot detection**

`shani-update` compares the booted subvolume (from `/proc/cmdline`) against `/data/current-slot`. If they differ and a `/data/boot_failure` marker is present, the newly deployed slot failed to boot and the system fell back automatically.

A dialog appears offering to run `shani-deploy -r` to clean the failed slot. If confirmed, `shani-deploy -r` runs in a terminal via `pkexec`, then a follow-up dialog offers an immediate reboot.

**2. Reboot-needed check**

If `/run/shanios/reboot-needed` exists, a staged update is waiting. A dialog offers to restart now or later. This file is on a tmpfs and clears automatically on reboot.

**3. Candidate boot check**

If the booted slot differs from `current-slot` but there's no failure marker, you're running the newly deployed slot for the first time. A dialog confirms this and offers rollback if anything seems wrong.

**4. Update check**

If the system is in a clean steady state, `shani-update` checks network connectivity, fetches the latest release metadata from the CDN, and compares it against `/etc/shani-version`. If a newer version is available, a dialog asks whether to install now or defer. Deferring schedules a reminder in 24 hours via `systemd-run --user`.

When the user confirms, `shani-update` detects the running terminal emulator and launches `shani-deploy` inside it via `pkexec`.

### shani-update Usage

```bash
# Run at login (used by the autostart entry — 15s delay)
shani-update --startup

# Run interactively — same checks, no startup delay
shani-update

# Roll back the inactive slot immediately
shani-update --rollback
shani-update -r

# Force deploy even if already current
shani-update --force
shani-update -f

# Use a specific channel for this run
shani-update --channel latest
shani-update -t latest

# Verbose output
shani-update --verbose
shani-update -v

# Dry-run — simulate without changes
shani-update --dry-run
shani-update -d
```

### Logs and Status

```bash
# View recent shani-update activity
cat ~/.cache/shani-update.log

# Via journalctl
journalctl -t shani-update -n 50

# Check the timer status
systemctl --user status shani-update.timer

# Run an immediate interactive check
shani-update
```

### GUI Support

`shani-update` supports `yad` (preferred), `zenity`, and `kdialog`, tried in order. All dialogs have configurable timeouts — fallback/reboot dialogs: 5 minutes; update dialogs: 2 minutes before auto-dismissal and deferral. When no GUI is available (SSH, headless), it falls back to `notify-send` or an interactive console prompt.

---

## Part 2 — shani-deploy: The Update Engine

### How shani-deploy Updates Itself

Before doing anything else, `shani-deploy` checks GitHub for a newer version of itself. If found, it re-executes with all current state preserved — so you always run the latest deployment logic. Use `--skip-self-update` to bypass this in network-restricted environments.

### Core Operations

#### `sudo shani-deploy` — Update

Steps performed in order:

1. Self-update check (re-execs if newer version found)
2. Slot detection — determines active and candidate slots
3. System inhibit — blocks sleep, shutdown, lid-close for the duration
4. Boot validation — confirms the boot environment is consistent
5. Space check — requires at least 10 GB free on the Btrfs filesystem
6. Fetch metadata — downloads release manifest from CDN (R2 primary, SourceForge fallback)
7. Already current check — exits cleanly if already on latest (unless `-f` is used)
8. Download — streams the image with resume support via `aria2c`, then `wget`, then `curl`
9. SHA256 verify — verifies checksum after download
10. GPG verify — verifies signature against the Shani OS key (`7B927BFFD4A9EAAA8B666B77DE217F3DA8014792`)
11. Snapshot — takes a timestamped Btrfs snapshot of the inactive slot before writing
12. Extract — pipes the verified image into `btrfs receive`
13. UKI generation — runs `gen-efi configure <inactive-slot>` inside a chroot of the new slot
14. Boot entry update — new slot becomes next-boot default with `+3-0` boot count tries
15. Reboot marker — writes `/run/shanios/reboot-needed` so `shani-update` can show a restart dialog

Nothing in your running OS is touched at any point. The chroot bind-mounts `data`, `etc`, `var`, and `swap` from the live system so `gen-efi` has access to MOK keys, vconsole config, and swap offset.

#### `sudo shani-deploy -r` — Rollback

Restores the inactive slot from its most recent timestamped Btrfs snapshot and sets it as the next-boot default. Run this from the OS copy you want to **keep**. The running system is never touched.

```bash
# Check which slot you are on
cat /data/current-slot

# Roll back
sudo shani-deploy -r

# Reboot
sudo reboot
```

#### `sudo shani-deploy -d` — Dry-Run

Simulates the entire update process without making any changes. Downloads metadata and shows what would happen — no image download, no writes.

### Cleanup and Maintenance

**`sudo shani-deploy -c`** — Removes timestamped slot backup snapshots and cached download files. Safe to run at any time; does not remove the active or inactive slot or any user data.

**`sudo shani-deploy -o`** — Runs an on-demand `duperemove` block deduplication pass across the entire Btrfs root. Takes several minutes on large filesystems, safe during normal use.

---

## Update Channels

Two channels are available:

**`stable`** (default) — Monthly validated builds, full QA cycle. Recommended for all users.

**`latest`** — More frequent releases, closer to cutting-edge, less QA time.

```bash
# Use latest for one update only
sudo shani-deploy -t latest

# Switch permanently
sudo shani-deploy --set-channel latest
sudo shani-deploy --set-channel stable

# Check current channel
cat /etc/shani-channel
```

Both `shani-deploy` and `shani-update` read from `/etc/shani-channel`.

---

## Boot Counting and Automatic Rollback

After an update, the new slot is registered with `+3-0` boot-count tries:

- **Successful boot:** `bless-boot` calls `bootctl set-good`, the slot becomes the permanent default.
- **Failed boot:** systemd-boot decrements the count on each attempt. After three failures it falls back to the previous slot automatically — no user action required, works even if the system can't reach the login prompt.

On the next successful login, `shani-update` detects the fallback and offers to clean the failed slot.

---

## Understanding Slot State Files

```bash
# Active slot
cat /data/current-slot

# Reboot-needed marker (tmpfs, cleared on reboot)
cat /run/shanios/reboot-needed

# Boot state markers in /data/
# boot-ok           — written on successful boot
# boot_failure      — fallback was detected
# boot_hard_failure — slot failed to mount entirely
# boot_failure.acked — shani-update acknowledged the failure

# Slot backup snapshots (root Btrfs volume)
sudo btrfs subvolume list / | grep backup
# @blue_backup_YYYYMMDD-HHMMSS
# @green_backup_YYYYMMDD-HHMMSS
```

---

## Advanced Flags

**`-f` / `--force`** — Force redeploy even if already on the latest version. Useful for repairing a corrupted slot.

**`-v` / `--verbose`** — Debug-level logging showing every command and detailed progress.

**`--skip-self-update`** — Skip the GitHub self-update check. Use in network-restricted environments or when testing a specific version.

**`--update-genefi`** — Downloads the latest `gen-efi` from GitHub and uses it for this deployment without installing it to the host. Useful when a `gen-efi` fix is available before the next OS image.

---

## Automated Updates (Fleet / Unattended)

For fleet deployments, disable the user-facing autostart and timer, and drive updates directly:

```bash
# Disable autostart system-wide
sudo rm /etc/xdg/autostart/shani-update.desktop

# Disable and mask the user timer system-wide
sudo systemctl --global disable shani-update.timer
sudo systemctl --global mask shani-update.timer
```

Then drive updates on your schedule:

```bash
# /etc/systemd/system/shani-autoupdate.service
[Unit]
Description=Shani OS Automatic Update

[Service]
Type=oneshot
ExecStart=/usr/local/bin/shani-deploy

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

`shani-deploy` writes `/run/shanios/reboot-needed` after staging. Check for this marker in your maintenance window logic and schedule the reboot separately.

See [Shani OS for OEMs and IT Fleets](https://blog.shani.dev/post/shani-os-oem-and-fleet-deployment) for the full fleet deployment guide.

---

## Resources

- [docs.shani.dev — System Updates](https://docs.shani.dev/doc/updates/system) — full configuration reference
- [The Architecture Behind Shani OS](https://blog.shani.dev/post/shani-os-architecture-deep-dive) — how slots and the update pipeline work
- [Shani OS for OEMs and IT Fleets](https://blog.shani.dev/post/shani-os-oem-and-fleet-deployment) — fleet deployment guide
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
