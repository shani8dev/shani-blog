---
slug: snap-on-shani-os
title: 'Snap on Shani OS — The Optional App Ecosystem'
date: '2026-05-01'
tag: 'Guide'
excerpt: 'Snap is pre-configured on Shani OS with its own @snapd Btrfs subvolume. When to use Snap versus Flatpak, how to install from the Snap Store, and how the two ecosystems coexist.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '5 min'
series: 'Shani OS Guides'
---

Snap is an optional app ecosystem on Shani OS. It is pre-configured — `snapd.socket` is enabled at boot, the `@snapd` Btrfs subvolume stores all Snap data, and snap packages survive every OS update and rollback untouched.

Flatpak is the recommended primary choice for GUI applications on Shani OS. Snap is available as a complement when an app you need is only on the Snap Store, or when you have a specific reason to prefer it.

Full reference: [docs.shani.dev — Snaps](https://docs.shani.dev/doc/software/snaps).

---

## How Snap Is Set Up

Snap data lives in the `@snapd` Btrfs subvolume, mounted at `/var/lib/snapd`. This is completely independent of both OS slots. Whether you boot `@blue` or `@green` after an update or rollback, the same Snap installs are there.

`snapd.socket` is socket-activated — the daemon starts on-demand when first accessed, not at every boot.

```bash
# Verify snapd is available
snap version

# Check snapd service status
systemctl status snapd.socket
```

---

## Installing and Managing Snaps

```bash
# Search the Snap Store
snap find "video player"
snap find firefox

# Install a snap
snap install vlc
snap install firefox
snap install code --classic    # classic confinement (broader access)
snap install slack --classic

# List installed snaps
snap list

# Update all snaps
snap refresh

# Update a specific snap
snap refresh vlc

# Remove a snap
snap remove vlc

# See snap info (version, confinement, publisher)
snap info vlc
```

Snaps appear in your application launcher automatically after installation, just like Flatpak apps.

---

## Classic vs Strict Confinement

Most snaps use **strict confinement** — they run in a sandbox with explicit access controls, similar to Flatpak's sandbox.

Some snaps use **classic confinement** — they run with the same access level as a traditionally installed application. Classic confinement is required for developer tools like VS Code, because they need to access arbitrary project files, run compilers, and interact with the host system extensively.

```bash
# Strict confinement (sandboxed)
snap install vlc

# Classic confinement (less restricted — you will be prompted to confirm)
snap install code --classic
snap install go --classic
snap install node --classic
```

---

## Snap vs Flatpak: When to Use Each

On Shani OS, Flatpak is the primary recommendation. Here is when to reach for Snap instead:

**Use Snap when:**
- An app is available on the Snap Store but not on Flathub (this is increasingly rare)
- You need a tool that only ships as a snap (some enterprise software, Canonical products)
- You are already managing a Snap-heavy workflow and prefer consistency

**Use Flatpak for everything else:**
- Flathub has a larger catalogue than the Snap Store for desktop GUI apps
- Flatpak's permission model is more granular and manageable via Flatseal
- Flatpak is fully open-source end-to-end; the Snap Store backend is operated by Canonical and is not open-source
- Flatpak auto-updates on a 12-hour timer; snaps auto-refresh on their own schedule

Both coexist without conflict — you can have apps from both ecosystems installed simultaneously.

---

## Storage Efficiency

Snap packages are stored in `/var/lib/snapd/snaps/` as squashfs images — each version of each snap is a separate file. This means upgrading a snap adds a new version file alongside the old one, which is only removed after a few revisions.

To clean up old snap revisions:

```bash
# See snap disk usage
du -sh /var/lib/snapd/snaps/

# Remove old revisions manually
snap list --all
# Note the revision numbers of old versions, then:
snap remove vlc --revision=1234

# Automatic cleanup (remove all but 2 most recent revisions)
snap set system refresh.retain=2
```

---

## Resources

- [docs.shani.dev — Snaps](https://docs.shani.dev/doc/software/snaps) — full reference
- [snapcraft.io](https://snapcraft.io) — Snap Store catalogue
- [Flatpak on Shani OS](https://blog.shani.dev/post/flatpak-on-shani-os) — the primary app ecosystem

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
