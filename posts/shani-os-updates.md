---
slug: shani-os-updates
title: 'Updates on Shani OS — Notifications, Cassini, and the Full shani-deploy Reference'
date: '2026-05-12'
tag: 'Reference'
excerpt: 'The complete guide to Shani OS updates: the Shani Cassini notification agent that tells you when an update is ready, and the full shani-deploy flag reference for every scenario — update, rollback, dry-run, cleanup, channel management, and automated fleet deployments.'
cover: /assets/images/blog/shani-os-updates.webp
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

Shani OS has two halves to its update pipeline, and they do different jobs. **Shani Cassini's notification agent** is the part that talks to you: a small background process that runs shortly after login and every two hours after that, reads the system's real state, and sends a desktop notification when an update is available, when a restart finishes an installed one, or when the last update failed to boot. **`shani-deploy`** is the engine that does the work: it downloads, verifies, and applies OS images. Cassini's **Updates & Rollback** page drives that engine, with `pkexec`, when you decide you want an update. Nothing is ever applied without you asking for it.

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
sudo shani-deploy --verify-existing      # verify current deployment integrity without updating
sudo shani-deploy --list-backups         # list available rollback backups with timestamps
sudo shani-deploy --channel-status       # show latest/stable versions available remotely
```

---

## Part 1 — Telling You About Updates

Notifications come from `/usr/bin/shani-cassini --agent`, a systemd **user** service (`shani-cassini-agent.service`) driven by `shani-cassini-agent.timer`. The timer fires two minutes after your user manager starts, then two hours after each run. The agent is a plain background process: no GTK, no libadwaita, no display of its own, and no dialogs. It gets its state from one read-only command:

```bash
shani-deploy --status --check --json
```

### What It Reports

**An update is available** — release metadata shows a newer image on your channel. The notification names the version and tells you to install it from Shani Cassini. If you ignore it, the same version is mentioned again after 24 hours, and not before.

**A restart finishes an installed update** — the `/run/shanios/reboot-needed` marker exists. The notification carries a **Restart Now** action, so the reboot is one click away. The marker lives on a tmpfs and clears itself on reboot, so it cannot resurface afterwards.

**The last update did not boot** — a boot failure was recorded. The notification says the updated slot failed and Shanios started the previous one, and that your files are safe. If the automatic recovery also failed, it says that instead and points you at Cassini to roll back. The fallback itself usually happened without you, through boot counting.

There is nothing else. No install-or-defer prompt, no reminder countdown, no "your update worked, isn't that nice" message. The agent never claims a system booted successfully, because it cannot know that.

### Running the Agent by Hand

```bash
# Run one check right now, exactly as the timer would
shani-cassini --agent

# Is the timer scheduled for this user?
systemctl --user status shani-cassini-agent.timer

# What did it do, and when?
journalctl --user -u shani-cassini-agent.service -n 50
```

It remembers what it has already told you in `~/.local/state/shani-cassini/agent.json`, so each event is reported once rather than every two hours. The agent needs your desktop session's notification bus, so on a headless or SSH-only login it stays quiet and you check with `shani-deploy --status --check` instead.

For the notification side in more depth, see [Update Notifications on Shani OS](https://blog.shani.dev/post/shani-os-update-notifications).

---

## Part 2 — shani-deploy: The Update Engine

Everything below is what actually moves the system. On a desktop, you reach it through Shani Cassini's **Updates & Rollback** page, which runs the same `shani-deploy` invocations through `pkexec` and streams the output back to you inside the page, wrapped in `systemd-inhibit` so the machine does not suspend mid-deployment. On a server or a headless box there is no page to click, so you run the commands yourself with `sudo`. The engine does not care which door you came through.

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
15. Reboot marker — writes `/run/shanios/reboot-needed` so Shani Cassini's agent can offer the restart

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

Both `shani-deploy` and Shani Cassini's agent read from `/etc/shani-channel`.

---

## Boot Counting and Automatic Rollback

After an update, the new slot is registered with `+3-0` boot-count tries:

- **Successful boot:** `bless-boot` calls `bootctl set-good`, the slot becomes the permanent default.
- **Failed boot:** systemd-boot decrements the count on each attempt. After three failures it falls back to the previous slot automatically — no user action required, works even if the system can't reach the login prompt.

On the next successful login, Shani Cassini's agent notices the recorded failure and sends a notification telling you the updated slot did not start. Cleaning the failed slot up is then a rollback from the **Updates & Rollback** page, or `sudo shani-deploy -r`.

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
# boot_failure.acked — the recorded failure has been acknowledged by the boot-state check

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

For fleet deployments, silence the per-user notification agent and drive updates directly:

```bash
# Disable and mask the user timer system-wide
sudo systemctl --global disable shani-cassini-agent.timer
sudo systemctl --global mask shani-cassini-agent.timer
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
