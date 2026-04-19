---
slug: shani-os-update-notifications
title: 'shani-update — The Shani OS Update Manager'
date: '2026-05-11'
tag: 'Guide'
excerpt: 'shani-update is the user-facing update manager for Shani OS. It runs automatically via a systemd user timer and at login, detects boot failures, checks for staged updates awaiting a reboot, identifies newly deployed slots, and checks for new OS images — all with GUI dialogs, automatic terminal detection, and a deferred-reminder system.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '6 min'
series: 'Shani OS Guides'
---

> **Note:** This post has been superseded by [Updates on Shani OS](https://blog.shani.dev/post/shani-os-updates), which merges `shani-update` and `shani-deploy` into a single reference. The content below remains accurate.

`shani-update` is the user-facing update manager for Shani OS. It runs automatically in two ways: via a desktop autostart entry (`shani-update --startup`) that fires at login after a 15-second delay, and via a systemd user timer that runs 15 minutes after boot and then every 2 hours thereafter. It can also be invoked manually at any time. It handles the full update lifecycle on behalf of the user: detecting whether the last boot was a fallback, prompting to reboot into a staged update, noticing when you're on a freshly deployed slot and letting you roll back if needed, and checking for new OS images when everything is healthy.

`shani-deploy` is the lower-level tool that actually downloads, verifies, and stages OS images. `shani-update` is the front-end that decides when and whether to call it. Full reference: [docs.shani.dev — System Updates](https://docs.shani.dev/doc/updates/system).

---

## What shani-update Does on Each Run

When run with `--startup`, `shani-update` waits 15 seconds (to let the polkit agent and desktop shell initialise), then works through a fixed priority sequence. Each step can short-circuit the rest. The same sequence runs for every invocation — at login via the autostart entry, on the 2-hour timer, or when called manually.

### 1. Fallback boot detection

`shani-update` compares the booted subvolume (read from `/proc/cmdline`) against `/data/current-slot`. If they differ and a `/data/boot_failure` or `/data/boot_hard_failure` marker is present, it knows the newly deployed slot failed to boot and the system fell back to the previous one.

In that case it shows a GUI dialog:

> **Boot Failure Detected**
> Slot @green failed to boot. The system fell back to @blue.
> Roll back @green now so it boots correctly next time?

If confirmed, it opens a terminal window and runs `shani-deploy -r` with `pkexec` for privilege escalation, then shows a follow-up dialog offering to reboot immediately. If the failure was a hard failure (the slot failed to mount entirely), the dialog text makes this explicit.

### 2. Reboot-needed check

If `/run/shanios/reboot-needed` exists, a staged update is waiting. `shani-update` shows:

> **Restart Required**
> Shani OS has been updated to v2026.05.01.
> Restart now to boot into the updated system.

The user can restart immediately or dismiss and be reminded later. This file lives on a tmpfs and is cleared automatically on reboot, so the reminder never resurfaces after the reboot happens.

### 3. Candidate boot check

If the booted slot differs from `current-slot` but there's no failure marker, you're running the newly deployed slot for the first time. `shani-update` shows:

> **Running Updated System**
> You're running the newly updated system (@green).
> If everything looks good, no action needed. If something is broken, roll back to @blue now.

### 4. Update check

If none of the above apply, `shani-update` checks network connectivity, fetches the latest release metadata from the CDN (a small text file — no image download), and compares it to `/etc/shani-version` and `/etc/shani-profile`. If a newer version is available, it shows:

> **Update Available**
> Current: v2026.04.15-default
> Available: v2026.05.01-default
> The update will download and install in a terminal window.

If confirmed, `shani-update` detects the available terminal emulator (checking for `alacritty`, `kitty`, `wezterm`, `foot`, `gnome-terminal`, `kgx`, `konsole`, `xterm`, and others), constructs the right command-line arguments for that specific terminal, and launches `shani-deploy` inside it via `pkexec`.

If the user dismisses the dialog, a reminder is scheduled using `systemd-run --user --on-active=86400s` — the update check runs again in 24 hours without any user action.

---

## Usage

```bash
# Run at login (used by the autostart entry)
shani-update --startup

# Run interactively — same checks but no 15-second startup delay
shani-update

# Roll back the inactive slot immediately
shani-update --rollback
shani-update -r

# Force deploy even if version matches
shani-update --force
shani-update -f

# Use a specific update channel for this run
shani-update --channel latest
shani-update -t latest

# Verbose output from shani-deploy
shani-update --verbose
shani-update -v

# Dry-run — simulate without changes
shani-update --dry-run
shani-update -d
```

---

## How shani-update Runs

`shani-update` is triggered by two mechanisms:

**Desktop autostart entry** — `shani-update --startup` is called when you log in. The script waits 15 seconds to let the polkit agent and desktop shell initialise before acquiring its lock and running the check sequence.

**Systemd user timer** — `shani-update.timer` fires 15 minutes after boot, then every 2 hours. This ensures checks happen even during long sessions and even if the autostart entry was missed.

Both paths run the identical check sequence (fallback boot → reboot needed → candidate boot → update check). The lock file prevents two instances running simultaneously.

```bash
# View recent shani-update logs
cat ~/.cache/shani-update.log

# Or via journalctl (shani-update also writes to the system journal via systemd-cat)
journalctl -t shani-update -n 50

# Check the timer status
systemctl --user status shani-update.timer

# Run an immediate interactive check
shani-update
```

The log file at `~/.cache/shani-update.log` rotates automatically at 1 MB.

---

## GUI Support

`shani-update` supports three GUI backends, tried in order: `yad` (preferred — supports timeouts and button labels), `zenity`, and `kdialog`. All dialogs have a configurable timeout — if no response is given within the timeout, the dialog dismisses as if cancelled.

For fallback boot and reboot dialogs, the timeout is 5 minutes. For the update available dialog, it is 2 minutes before it auto-dismisses and defers.

When no GUI is available (headless or SSH session), `shani-update` falls back to `notify-send` for non-interactive contexts, or an interactive console prompt if running in a terminal (`stdin` and `stdout` are both TTYs).

---

## Terminal Detection

When `shani-update` needs to open a terminal to run `shani-deploy`, it detects the right terminal emulator using a layered strategy:

1. **Session-native hint:** checks `KONSOLE_VERSION` (set inside any Konsole window), `VTE_VERSION` (set inside any VTE-based terminal like `kgx`, `gnome-terminal`, `tilix`), and `XDG_CURRENT_DESKTOP` to prefer the terminal that matches the running desktop
2. **Environment variables:** checks `$TERMINAL`, `$TERMINAL_EMULATOR`, `$COLORTERM`, `$TERM_PROGRAM` against an allowlist
3. **PATH scan:** tries `alacritty`, `kitty`, `wezterm`, `foot`, `gnome-terminal`, `kgx`, `tilix`, `xfce4-terminal`, `konsole`, `lxterminal`, `mate-terminal`, `deepin-terminal`, `terminator`, `xterm`, `urxvt`, `st` in order

Each terminal gets its own command construction — for example, `konsole` is launched with `--noclose` so the window stays open after `shani-deploy` finishes; `kgx` does not support `--title` so the title argument is omitted.

---

## Update Channels

`shani-update` reads the same channel configuration as `shani-deploy`:

```bash
# Check current channel
cat /etc/shani-channel

# Switch channel (affects both shani-deploy and shani-update)
sudo shani-deploy --set-channel latest
sudo shani-deploy --set-channel stable
```

On the `stable` channel (default), new images arrive approximately monthly. On `latest`, checks may find something new more frequently.

---

## Applying the Update Manually

When you are ready to apply an available update without waiting for the dialog:

```bash
# Download, verify, and stage the update
sudo shani-deploy

# Simulate without changing anything
sudo shani-deploy -d
```

For the full update workflow, see [shani-deploy Reference](https://blog.shani.dev/post/shani-deploy-reference).

---

## Fleet and OEM Deployments

For fleet deployments using automated update scheduling, both the autostart entry and the user timer should be disabled in favour of a central update management approach:

```bash
# Disable the autostart entry system-wide
sudo rm /etc/xdg/autostart/shani-update.desktop

# Disable the user timer system-wide (mask the unit)
sudo systemctl --global disable shani-update.timer
sudo systemctl --global mask shani-update.timer
```

Updates can then be triggered on schedule via a systemd timer calling `shani-deploy` directly. See [Shani OS for OEMs and IT Fleets](https://blog.shani.dev/post/shani-os-oem-and-fleet-deployment) for the fleet deployment guide.

---

## Resources

- [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide) — when things go wrong
- [docs.shani.dev — System Updates](https://docs.shani.dev/doc/updates/system) — full update reference
- [shani-deploy Reference](https://blog.shani.dev/post/shani-deploy-reference) — every flag and workflow
- [Shani OS for OEMs and IT Fleets](https://blog.shani.dev/post/shani-os-oem-and-fleet-deployment) — fleet update management
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
