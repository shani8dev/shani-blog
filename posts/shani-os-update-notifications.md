---
slug: shani-os-update-notifications
title: 'Update Notifications on Shani OS — How shani-update Works'
date: '2026-05-11'
tag: 'Guide'
excerpt: 'shani-update is a lightweight background service that watches for new Shani OS images and sends a desktop notification when one is ready — no polling every boot, no forced updates, just a quiet tap on the shoulder when something new is available.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '4 min'
series: 'Shani OS Guides'
---

`shani-update` is a user-level background service that monitors for new Shani OS images on your configured update channel and sends a desktop notification when one is available. It does not apply the update — you always decide when to run `sudo shani-deploy`. It just makes sure you know when something new is waiting.

The service is enabled by default at first boot. It runs as a systemd user service, not as root, and makes a lightweight metadata check against the CDN rather than downloading the full image.

Full reference: [docs.shani.dev — System Updates](https://docs.shani.dev/doc/updates/system).

---

## How It Works

`shani-update` runs on a systemd user timer. On each trigger:

1. Fetches the latest release metadata from the CDN (a small JSON file — no image download)
2. Compares the available version against the currently running slot's version
3. If a newer version exists on your channel: sends a desktop notification via `notify-send`
4. Does nothing if already current

The notification appears as a standard desktop notification:

> **Shani OS update available**
> Version 2026.05.01 is ready. Run `sudo shani-deploy` when convenient.

Clicking the notification (on GNOME) opens a terminal. On KDE, the notification action can be configured to open Konsole.

---

## Service Management

```bash
# Check status
systemctl --user status shani-update.service
systemctl --user status shani-update.timer

# See when the next check is scheduled
systemctl --user list-timers shani-update.timer

# Run an immediate check (without waiting for the timer)
systemctl --user start shani-update.service

# View recent check logs
journalctl --user -u shani-update.service -n 30

# Disable the notification service (if you prefer to check manually)
systemctl --user disable --now shani-update.timer

# Re-enable it
systemctl --user enable --now shani-update.timer
```

---

## Check Frequency

By default, `shani-update.timer` triggers once per day. The exact time is randomised within a 30-minute window to avoid all machines on a network hitting the CDN simultaneously.

To change the frequency, override the timer:

```bash
# Create a user override directory
mkdir -p ~/.config/systemd/user/shani-update.timer.d/

# Set a custom interval (e.g. every 6 hours)
cat > ~/.config/systemd/user/shani-update.timer.d/override.conf << 'EOF'
[Timer]
OnCalendar=
OnCalendar=*-*-* 00/6:00:00
RandomizedDelaySec=600
EOF

systemctl --user daemon-reload
systemctl --user restart shani-update.timer
```

---

## Update Channels

`shani-update` reads the same channel configuration as `shani-deploy`:

```bash
# Check current channel
cat /etc/shani-deploy/channel

# Switch channel (affects both shani-deploy and shani-update)
echo "latest" | sudo tee /etc/shani-deploy/channel
echo "stable" | sudo tee /etc/shani-deploy/channel
```

On the `stable` channel (default), new images arrive approximately monthly. On `latest`, checks may find something new more frequently.

---

## Applying the Update

When you are ready to apply an available update:

```bash
# Download, verify, and stage the update (reboot required to activate)
sudo shani-deploy

# Simulate without changing anything
sudo shani-deploy --dry-run

``

For the full update workflow, see [shani-deploy Reference](https://blog.shani.dev/post/shani-deploy-reference).

---

## Disabling Auto-Check

If you manage updates on a schedule and do not want background checks:

```bash
systemctl --user disable --now shani-update.timer
```

You can still check manually at any time:

```bash
sudo shani-deploy --dry-run
```

---

## Fleet and OEM Deployments

For fleet deployments using automated update scheduling, `shani-update.timer` should typically be disabled on managed machines in favour of the central update management approach described in [Shani OS for OEMs and IT Fleets](https://blog.shani.dev/post/shani-os-oem-and-fleet-deployment):

```bash
sudo systemctl disable --global shani-update.timer
```

The `--global` flag disables the timer for all users on the system.

---

## Resources

- [docs.shani.dev — System Updates](https://docs.shani.dev/doc/updates/system) — full update reference
- [shani-deploy Reference](https://blog.shani.dev/post/shani-deploy-reference) — every flag and workflow
- [Shani OS for OEMs and IT Fleets](https://blog.shani.dev/post/shani-os-oem-and-fleet-deployment) — fleet update management
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
