---
slug: shani-os-update-notifications
title: 'Update Notifications on Shani OS — What Tells You, and When'
date: '2026-05-11'
tag: 'Reference'
excerpt: 'Shanios tells you when an update is ready, when a restart finishes it, and when the last update did not start — as a desktop notification, nothing more. The notification agent is part of Shani Cassini, and it never applies an update by itself.'
cover: /assets/images/blog/shani-os-update-notifications.webp
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '6 min'
series: 'Shani OS Reference'
---

> **Note:** For the full picture — the notification agent *and* every `shani-deploy` flag for update, rollback, dry-run, cleanup, and channel management — see [Updates on Shani OS](https://blog.shani.dev/post/shani-os-updates). This post covers only the part that speaks to you without being asked: the notification agent.

Shanios does not interrupt you to talk about updates. There is no dialog at login, no countdown, no "install now or remind me later" prompt. What ships is a background notification agent, part of **Shani Cassini** (`/usr/bin/shani-cassini --agent`), that runs as a systemd **user** service and stays quiet unless there is genuinely something to report.

It sends a desktop notification through `notify-send` when one of three things is true:

- an update is available,
- an update is already installed and a restart finishes it,
- the last boot of an updated system failed.

That is the whole list. If your system is healthy and current, you hear nothing.

---

## The Notification Agent

The agent is a plain background process. It is **GTK-free** — it loads no `libgtk-4`, no `libadwaita`, no `girepository` — and needs no display of its own, because it is not a GUI. It runs a few seconds after you log in, then again every two hours, and it does one thing: read the system's real state and decide whether that state is worth a sentence.

It gets that state from a single read-only command:

```bash
shani-deploy --status --check --json
```

No root, no writes, no network image download. `--check` asks the CDN for release metadata, so it can tell you an update exists without fetching it. `shani-deploy` is the tool that actually downloads, verifies, and stages OS images; the agent is only the part that decides whether to mention it. Full reference: [docs.shani.dev — System Updates](https://docs.shani.dev/doc/updates/system).

---

## What the Agent Reports

### An update is available

> **Shanios 2026.09.20 is available**
> Install it from Shani Cassini — it goes into the other system slot, your running system is not touched.

If you ignore it, the agent mentions that same version again after 24 hours. It does not nag faster than that, and it does not queue anything.

### A restart finishes an installed update

> **Restart to finish the update**
> Shanios 2026.09.20 is installed and starts after a restart.

This one carries a **Restart Now** action, so the restart is one click from the notification itself. Underneath, it is the `/run/shanios/reboot-needed` marker that `shani-deploy` writes after staging — a tmpfs file, so it clears itself on the next reboot and the notification cannot resurface afterwards.

### The last update did not start

> **The update did not start**
> The updated system (@green) failed to boot, so Shanios started the previous one. Your files are safe.

Or, if the switch back also failed:

> **Shanios could not recover automatically**
> The updated system (@green) did not start and switching back failed. Open Shani Cassini to roll back.

Both mean the same thing to you: your files are intact and you can fix this from **Updates & Rollback**. The fallback to the previous slot usually happened on its own, via boot counting — see [The Architecture Behind Shani OS](https://blog.shani.dev/post/shani-os-architecture-deep-dive) for how that works.

### What it deliberately does not say

The agent never claims your system booted successfully. A newly deployed slot is not proof that the update was good, and no notification is going to pretend otherwise. It has no "everything looks fine, right?" first-boot dialog, because it has no way to know the answer. Silence after a successful update is the correct output, not a missing feature.

---

## Applying an Update

Applying is always an explicit action you take. There are two ways.

**On a desktop**, open Shani Cassini and go to **Updates & Rollback**. The page shows the same live status the agent reads, and its buttons run the real `shani-deploy` engine through `pkexec` for privilege escalation, streaming output into the page. The deployment is wrapped in `systemd-inhibit` so your machine does not suspend halfway through, and your running system is never touched — everything lands in the other slot.

**On a server or a headless box**, there is no desktop to click. Run the engine directly:

```bash
# Download, verify, and stage the update
sudo shani-deploy

# Simulate without changing anything
sudo shani-deploy -d

# Fetch and verify the image, then exit without deploying
sudo shani-deploy --download-only
```

The agent never applies an update, never rolls one back, and never reboots your machine on its own. It is a heads-up mechanism; the decision is yours.

---

## Running the Agent by Hand

```bash
# Run one check right now, exactly as the timer would
shani-cassini --agent

# Is the timer scheduled for this user?
systemctl --user status shani-cassini-agent.timer

# What did the agent do, and when?
journalctl --user -u shani-cassini-agent.service -n 50
```

The timer fires `OnStartupSec=2min` after your user manager starts, then `OnUnitInactiveSec=2h` after each run, with up to five minutes of randomized delay so a fleet of machines does not all wake at the same instant.

The agent keeps a small state file at `~/.local/state/shani-cassini/agent.json` (honouring `XDG_STATE_HOME`) so it says each thing once per event rather than every two hours. Everything else it does goes to the system journal.

> **Note:** it needs your desktop session's notification bus, so on a headless or SSH-only login there is nothing to show a notification on and it stays quiet. That is expected — on those machines, check directly with `shani-deploy --status --check`.

---

## Update Channels

The agent reports what your channel offers. The channel file is `/etc/shani-channel`, the same one `shani-deploy` reads:

```bash
# Check current channel
cat /etc/shani-channel

# Switch channel
sudo shani-deploy --set-channel latest
sudo shani-deploy --set-channel stable
```

On the `stable` channel (default), new images arrive approximately monthly. On `latest`, checks may find something new more frequently.

---

## Fleet and OEM Deployments

For managed fleets you drive the schedule centrally, so silence the per-user agent system-wide:

```bash
# Disable and mask the user timer system-wide
sudo systemctl --global disable shani-cassini-agent.timer
sudo systemctl --global mask shani-cassini-agent.timer
```

Then trigger updates on your own schedule with a systemd timer calling `shani-deploy` directly. See [Shani OS for OEMs and IT Fleets](https://blog.shani.dev/post/shani-os-oem-and-fleet-deployment) for the fleet deployment guide.

---

## Resources

- [Updates on Shani OS](https://blog.shani.dev/post/shani-os-updates) — the notification agent plus every `shani-deploy` flag
- [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide) — when things go wrong
- [docs.shani.dev — System Updates](https://docs.shani.dev/doc/updates/system) — full update reference
- [shani-deploy Reference](https://blog.shani.dev/post/shani-deploy-reference) — every flag and workflow
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
