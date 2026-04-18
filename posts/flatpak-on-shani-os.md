---
slug: flatpak-on-shani-os
title: 'Flatpak on Shani OS — Your Complete App Management Guide'
date: '2026-04-17'
tag: 'Guide'
excerpt: 'How Flatpak works on Shani OS, what apps are pre-installed, how to install more from Flathub, manage permissions with Flatseal, and why sandboxing is the right model for an immutable system.'
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

Flatpak is how you install and run GUI applications on Shani OS. Because the OS root is read-only, traditional package managers like `pacman` cannot add software to the base system — and they should not, since that software would be overwritten the next time `shani-deploy` updates the OS image. Flatpak solves this by storing applications in the `@flatpak` Btrfs subvolume, completely independent of the OS. Your apps survive every OS update and rollback untouched.

This guide covers everything you need to know about Flatpak on Shani OS: what is pre-installed, how to install more, how to manage permissions, and how to keep your apps healthy. Full reference: [docs.shani.dev — Flatpak](https://docs.shani.dev/doc/software/flatpak).

---

## Why Flatpak Fits an Immutable OS

Flatpak was designed with sandboxing and OS independence in mind. Each application runs in its own confined environment — it does not reach into system directories or assume a specific OS layout. This is exactly what an immutable system needs: apps that live outside the OS and make no assumptions about its internals.

The key properties:

**Isolation from the OS.** A Flatpak app runs against a bundled set of runtime libraries, not the host OS libraries. When Shani OS updates its system libraries, your Flatpak apps are unaffected — they use their own.

**Isolation from other apps.** Each Flatpak runs in a sandbox with access only to what it has been explicitly granted: specific filesystem paths, devices, network access, and portals. An app cannot read another app's data by default.

**Persistent across updates and rollbacks.** The `@flatpak` subvolume is separate from `@blue` and `@green`. Whether you are booting the old OS slot after a rollback or the new one after an update, the same `@flatpak` subvolume is mounted. Apps never need to be reinstalled after an OS change.

**Auto-updates.** Flatpak updates run on a 12-hour timer in the background. Your apps stay current without requiring manual intervention.

---

## Pre-Installed Apps

Both editions ship with these apps pre-installed and ready at first boot:

**Universal (GNOME and KDE):**
- **Vivaldi Browser** (`com.vivaldi.Vivaldi`) — featured browser with built-in ad blocking, tab groups, and reading mode
- **OnlyOffice Desktop Editors** (`org.onlyoffice.desktopeditors`) — opens `.docx`, `.xlsx`, `.pptx` with high compatibility
- **Warehouse** (`io.github.flattool.Warehouse`) — graphical Flatpak manager: install, remove, update, and inspect all your Flatpaks
- **Flatseal** (`com.github.tchx84.Flatseal`) — manage Flatpak sandbox permissions without the terminal
- **Pods** (`com.github.marhkb.Pods`) — graphical front-end for Podman container management
- **BoxBuddy** (`io.github.dvlv.boxbuddyrs`) — create and manage Distrobox containers with a GUI
- **Gear Lever** (`it.mijorus.gearlever`) — integrate AppImage files into your launcher

**GNOME Edition additionally includes:** GNOME's full suite of productivity and utility apps — Calculator, Calendar, Clocks, Maps, Weather, Text Editor, Loupe (image viewer), Papers (PDF viewer), Decibels (audio), Showtime (video), Snapshot (camera), Simple Scan, Sound Recorder, Font Viewer, Characters, Notes (Gnote), Seahorse (keys), Secrets (passwords), Connections (remote desktop), Network Displays, Extension Manager, Meld (diff), Impression (USB writer), Drawing, Fragments (torrents), Shortwave (internet radio), and a selection of games.

**KDE Plasma Edition additionally includes:** The complete gaming stack (Steam, Heroic, Lutris, RetroArch, Bottles, GOverlay, Oversteer, Piper, OpenRGB, AntiMicroX), KDE productivity apps (Okular, Gwenview, Elisa, Haruna, Kate, KolourPaint, Kompare, Kamoso, KRDC, ISO Image Writer, KGet, KTorrent, KCalc, Skanlite), a selection of KDE games, virt-manager with QEMU extension (the Flatpak bundles its own QEMU — there is no system QEMU package; see [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines)), and the Kvantum theme engine.

---

## Installing Apps from Flathub

Flathub is the main Flatpak app repository and is pre-configured on both editions. Browse it at [flathub.org](https://flathub.org) or install directly from the terminal:

```bash
# Install by app ID (most precise)
flatpak install flathub org.mozilla.firefox
flatpak install flathub com.spotify.Client
flatpak install flathub com.visualstudio.code
flatpak install flathub org.gimp.GIMP
flatpak install flathub org.telegram.desktop
flatpak install flathub com.discordapp.Discord
flatpak install flathub org.videolan.VLC
flatpak install flathub com.obsproject.Studio
flatpak install flathub org.inkscape.Inkscape
flatpak install flathub org.blender.Blender

# Search for apps
flatpak search firefox
flatpak search "video player"
```

You can also install apps from GNOME Software (GNOME edition) or KDE Discover (KDE edition) — both are configured to use Flathub as the default source.

---

## Running Flatpak Apps

Apps installed via Flatpak appear in your application launcher automatically. You can also launch them from the terminal:

```bash
# Run an app
flatpak run org.mozilla.firefox

# Run with specific arguments
flatpak run com.visualstudio.code /path/to/project

# List all installed apps
flatpak list --app

# List all installed (apps + runtimes)
flatpak list
```

---

## Managing Permissions with Flatseal

Flatseal is your graphical tool for managing what each Flatpak app can access. Open it from your app launcher.

Flatseal shows you every permission for every installed app — filesystem access, network access, device access, environment variables, and portal permissions. You can:

- Grant an app access to your entire home folder if it needs to open files from anywhere
- Restrict an app to only its own data directory for stronger privacy
- Enable or disable microphone, camera, and USB access per-app
- Review and revoke permissions that seem excessive

Common permission adjustments from the terminal:

```bash
# Grant an app access to your home directory
flatpak override --user --filesystem=home com.example.App

# Grant access to a specific path only
flatpak override --user --filesystem=/home/user/Documents com.example.App

# Revoke network access (for offline-only tools)
flatpak override --user --unshare=network com.example.App

# Grant access to all devices (use carefully)
flatpak override --user --device=all com.example.App

# Show all overrides for an app
flatpak override --user --show com.example.App

# Reset all overrides for an app
flatpak override --user --reset com.example.App
```

---

## Using Warehouse

Warehouse (pre-installed) is your graphical Flatpak manager. It provides capabilities beyond what GNOME Software or KDE Discover offer:

**Batch management.** Select multiple apps and update, remove, or inspect them all at once.

**Leftover data cleanup.** When you uninstall an app, Warehouse can find and remove leftover app data from your home directory that the standard uninstall leaves behind.

**Flatpak info.** See exactly which runtime an app uses, its installed size, when it was last updated, its app ID, and its current permission set.

**Pin versions.** If a Flatpak update breaks an app, Warehouse lets you pin the app to a specific version and mask future updates until the issue is resolved.

```bash
# CLI equivalent: pin an app at its current commit
flatpak mask com.example.App

# Unpin
flatpak mask --remove com.example.App
```

---

## Keeping Apps Updated

Flatpak apps auto-update every 12 hours via a systemd timer. To update manually:

```bash
# Update all installed Flatpaks
flatpak update

# Update a specific app
flatpak update org.mozilla.firefox

# Check what would be updated (dry run)
flatpak update --no-deploy
```

To see the history of recent updates:

```bash
flatpak history
```

---

## File Access and the Portal System

Flatpak apps use portals to access files outside their sandbox. When an app opens a file picker dialog, that dialog is a portal — a sandboxed, secure interface that lets you grant the app access to a specific file or folder without giving it blanket filesystem access.

This is why some apps in their sandboxed defaults can only access files you explicitly open through their file picker, not arbitrary paths. It is a feature, not a limitation — but it does mean that workflows that rely on drag-and-dropping files from the terminal into an app may behave differently.

If you regularly work with files in specific locations and an app constantly asks for permission, use Flatseal to add that path as a permanent filesystem grant for that app.

---

## Removing Apps and Cleaning Up

```bash
# Remove an app
flatpak remove com.example.App

# Remove an app and its data
flatpak remove --delete-data com.example.App

# Remove unused runtimes (saves significant disk space)
flatpak uninstall --unused

# Show disk usage by Flatpak
flatpak list --app --columns=application,size
du -sh /var/lib/flatpak ~/.local/share/flatpak
```

Running `flatpak uninstall --unused` periodically removes old runtime versions that apps no longer depend on. These can accumulate and consume several gigabytes over time.

---

## Adding Other Repositories

Flathub covers the vast majority of apps, but you can add other Flatpak repositories:

```bash
# Add a repository
flatpak remote-add --if-not-exists myrepo https://repo.example.com/repo.flatpakrepo

# List all configured repositories
flatpak remotes

# Remove a repository
flatpak remote-delete myrepo
```

For organisations deploying Shani OS at scale, a private Flatpak repository is the recommended way to distribute internal applications — without touching the OS image at all.

---

## The Full Software Ecosystem on Shani OS

Flatpak is one of several complementary app ecosystems. None of them conflict — you can use all of them simultaneously:

**Flatpak** (this guide) — GUI desktop applications. Self-contained, sandboxed, auto-updating. Primary recommendation for any app available on Flathub.

**Snap** — a secondary app store for cases where an app is on the Snap Store but not Flathub. Pre-configured with its own `@snapd` subvolume. Guide: [Snap on Shani OS](https://blog.shani.dev/post/snap-on-shani-os).

**AppImage** — portable self-contained executables. Download, make executable, run — no installation. Gear Lever (pre-installed) integrates them into your launcher. Guide: [AppImage on Shani OS](https://blog.shani.dev/post/appimage-on-shani-os).

**Nix** — CLI tools, development runtimes, and language toolchains. Handles multiple versions of the same tool without conflict and provides reproducible per-project environments. Guide: [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os).

**Distrobox** — full mutable Linux environment (any distro's `apt`, `pacman`, `yay`, etc.) inside a container with your home directory shared. For anything not available in Flatpak or Nix, or workflows requiring a traditional package manager. Guide: [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os).

**Podman** — OCI containers for services, databases, and development workflows. Docker-compatible, rootless, no daemon. Guide: [Podman on Shani OS](https://blog.shani.dev/post/podman-containers-on-shani-os).

**Homebrew** — works identically to macOS if that's your muscle memory. Installs to `/home/linuxbrew/.linuxbrew`, completely outside the read-only root. Guide: [Homebrew on Shani OS](https://blog.shani.dev/post/homebrew-on-shani-os).

---

## Resources

- [flathub.org](https://flathub.org) — browse the full app catalogue
- [docs.shani.dev — Flatpak](https://docs.shani.dev/doc/software/flatpak) — full reference including advanced configuration
- [Snap on Shani OS](https://blog.shani.dev/post/snap-on-shani-os) — when to use Snap vs Flatpak
- [AppImage on Shani OS](https://blog.shani.dev/post/appimage-on-shani-os) — portable apps with Gear Lever
- [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os) — CLI tools and development environments
- [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os) — full mutable Linux environments
- [Telegram community](https://t.me/shani8dev) — questions and app recommendations

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
