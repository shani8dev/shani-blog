---
slug: shani-os-kde-connect
title: 'KDE Connect and GSConnect on Shani OS — Your Phone and Desktop, Together'
date: '2026-05-04'
tag: 'Guide'
excerpt: 'KDE Connect (KDE edition) and GSConnect (GNOME edition) link your Android phone to your Shani OS desktop — notifications mirrored, files shared, clipboard synced, remote input, SMS from desktop, and media control. Firewall rules are pre-configured.'
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

KDE Connect is one of the most useful integrations available on Linux — it connects your Android phone to your desktop over your local Wi-Fi network, enabling a tight integration that rivals what you get with Apple's Handoff or Samsung's Link to Windows.

On Shani OS, the firewall rules required for KDE Connect are pre-configured at installation — ports 1714–1764 are open in the public zone. You never need to manually configure the firewall.

**KDE Plasma edition:** KDE Connect is pre-installed. Open it from the system tray or System Settings → KDE Connect.

**GNOME edition:** GSConnect (a GNOME Shell extension that implements the KDE Connect protocol) is pre-installed as a GNOME Shell extension. Enable it in Extension Manager (pre-installed) and it appears in the top bar.

Full reference: [docs.shani.dev — KDE Connect](https://docs.shani.dev/doc/networking/kdeconnect).

---

## Setting Up

### On Your Phone

Install the **KDE Connect** app from:
- [Google Play Store](https://play.google.com/store/apps/details?id=org.kde.kdeconnect_tp)
- [F-Droid](https://f-droid.org/packages/org.kde.kdeconnect_tp/)

Both phone and desktop must be on the **same Wi-Fi network**.

### On KDE Plasma

1. Open KDE Connect from the system tray (phone icon) or System Settings
2. Your phone should appear in the device list automatically
3. Click the phone name → "Pair"
4. Accept the pairing request on your phone

### On GNOME (GSConnect)

1. Open Extension Manager → enable GSConnect
2. A new icon appears in the top bar
3. Click it → your phone appears → click "Pair"
4. Accept on your phone

---

## Features

### Notification Mirroring

Phone notifications appear on your desktop as standard desktop notifications. Reply to messages directly from the desktop notification popup (for supported apps like WhatsApp, Messages, Gmail).

### Shared Clipboard

Copy something on your phone → paste it on your desktop. Copy on desktop → paste on phone. The clipboard syncs automatically in both directions.

### File Sharing

```
From desktop to phone:
- Right-click any file in Nautilus/Dolphin → "Send to Phone via KDE Connect"
- Or drag files into the KDE Connect device panel

From phone to desktop:
- Use the "Share" option on Android → KDE Connect
- Files arrive in ~/Downloads on desktop
```

### Remote Input

Use your phone as a touchpad or keyboard for your desktop — useful when your desktop is connected to a TV or when you want to control media from across the room.

### SMS / Messages from Desktop

Read and reply to SMS messages from your desktop keyboard. Supports most Android SMS apps.

### Media Control

Control media playback on your desktop from your phone — pause, skip, adjust volume. Also works in reverse: control phone audio from the desktop.

### Run Commands

Configure custom commands on your desktop that can be triggered from your phone. For example: lock the screen, run a script, open a specific application.

```
KDE Connect → Device settings → Run Commands → Add Command
Name: Lock Screen
Command: loginctl lock-session
```

### Remote Filesystem Access

Browse your phone's storage from the desktop file manager. On KDE, the phone appears as a location in Dolphin. On GNOME, it mounts via GSConnect.

### Battery Level

See your phone's battery percentage in the desktop status bar.

---

## Troubleshooting

### Phone Not Appearing

Both devices must be on the same Wi-Fi network. Check that:

```bash
# Verify the firewall rules are in place
sudo firewall-cmd --list-all | grep 1714

# If missing (should not be needed on Shani OS, but just in case):
sudo firewall-cmd --permanent --add-port=1714-1764/tcp
sudo firewall-cmd --permanent --add-port=1714-1764/udp
sudo firewall-cmd --reload
```

Also check the KDE Connect app on your phone is not blocked by Android's battery optimisation. In Android Settings → Battery → KDE Connect → "Don't optimise."

### Pairing Fails

```bash
# Restart KDE Connect daemon
systemctl --user restart kdeconnectd    # KDE
# or
systemctl --user restart gsconnect      # GNOME

# Check daemon status
systemctl --user status kdeconnectd
journalctl --user -u kdeconnectd -n 30
```

### Connection Drops Frequently

Android may kill the KDE Connect background process to save battery. Disable battery optimisation for the KDE Connect app:

Android Settings → Apps → KDE Connect → Battery → Unrestricted

---

## KDE Connect via Tailscale (Remote Access)

KDE Connect normally requires the same local Wi-Fi network. With Tailscale (pre-installed on Shani OS), you can use KDE Connect over the internet when you are away from home:

```bash
# On Shani OS desktop: start Tailscale
sudo tailscale up

# On your phone: install the Tailscale app and join your tailnet

# Add your phone's Tailscale IP to KDE Connect manually
# KDE Connect → Add Device → enter Tailscale IP
```

Full Tailscale guide: [Networking on Shani OS](https://blog.shani.dev/post/shani-os-networking-guide).

---

## Resources

- [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide) — when things go wrong
- [docs.shani.dev — KDE Connect](https://docs.shani.dev/doc/networking/kdeconnect) — full reference
- [kdeconnect.kde.org](https://kdeconnect.kde.org) — official documentation
- [Networking on Shani OS](https://blog.shani.dev/post/shani-os-networking-guide) — Tailscale for remote access
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
