---
title: "Shanios Gets a Third Desktop: The COSMIC Edition"
date: 2026-08-25
author: Shrinivas Kumbhar
author_bio: Creator of Shanios. Building immutable Linux distributions.
author_initials: SK
author_linkedin: shrinivaskumbhar
author_github: shrinivasvkumbhar
author_website: https://shani.dev
tag: Release
series: Shani OS Releases
slug: shani-os-cosmic-edition
cover: /assets/images/blog/shani-os-cosmic-edition.webp
category: News
readTime: "5 min"
---

Shanios is adding a COSMIC desktop edition alongside the existing GNOME and KDE Plasma options. COSMIC is System76's new desktop environment, built from scratch in Rust with Wayland-native design, tiling window management, and a focus on keyboard-driven workflows.

---

## What is COSMIC?

COSMIC (Computer System for Man-Machine Interaction and Communication) is a desktop environment developed by System76, the Colorado-based Linux hardware vendor. It is written primarily in Rust, uses Wayland exclusively, and is designed around three principles:

- **Keyboard-first:** Every action has a keyboard shortcut. The tiling window manager is not an add-on — it is the default layout.
- **Composable:** Panels, docks, and workspaces are modular applets that can be rearranged or replaced.
- **Fast:** Rust-native rendering with minimal dependencies means low memory usage and fast startup.

COSMIC is not a GNOME fork, not a KDE clone, and not a tiling WM wrapper. It is a ground-up desktop environment with its own file manager, text editor, terminal, settings panel, and system tray.

---

## What Ships in the COSMIC Edition

The COSMIC edition includes:

**COSMIC Core:**
- COSMIC Panel (taskbar with workspace switcher, system tray, clock)
- COSMIC Launcher (application launcher with fuzzy search)
- COSMIC Files (file manager)
- COSMIC Text Editor (syntax-highlighted, Git-aware)
- COSMIC Terminal (GPU-accelerated, tiling support)
- COSMIC Settings (system configuration)
- COSMIC Applets (notification daemon, power manager, Bluetooth, audio, network)

**Shared with all editions:**
- Vivaldi browser, OnlyOffice, Gear Lever, Warehouse, Flatseal, Pods, BoxBuddy
- PipeWire audio, firewalld, fail2ban, OpenSSH, Tailscale
- Full multimedia codecs, printing/scanning, Bluetooth
- Zsh + Starship + McFly shell experience
- All Shanios core packages (shani-deploy, shani-health, gen-efi)

**Not included (compared to GNOME/KDE):**
- No Waydroid (COSMIC does not support Android app compatibility yet)
- No snapd (COSMIC edition omits Snap support — use Flatpak or Distrobox instead)

---

## When to Choose COSMIC

COSMIC is a good fit if you:

- Prefer keyboard-driven workflows and tiling window management
- Want a modern, fast desktop with low resource usage
- Like the idea of a Rust-native desktop with Wayland from day one
- Use System76 hardware (COSMIC is optimized for their machines)
- Want something different from the GNOME/KDE duopoly

COSMIC may not be for you if you:

- Rely on GNOME or KDE-specific extensions and applets
- Need Waydroid for Android app compatibility
- Prefer a traditional floating window layout (COSMIC's tiling is the default, not optional)

---

## Building the COSMIC Image

The COSMIC edition uses the same build pipeline as GNOME and Plasma:

```bash
./build.sh full -p cosmic
```

The `image_profiles/cosmic/` directory contains:

- `package-list.txt` — base packages (same as other desktops, plus `shani-desktop-cosmic`)
- `flatpak-packages.txt` — COSMIC-specific Flatpaks
- `cosmic-customization.sh` — enables COSMIC systemd services
- `overlay/` — COSMIC-specific filesystem overlay
- `pacman.conf` — pacman configuration for the build

The `shani-desktop-cosmic` metapackage pulls in the COSMIC desktop components from the `[shani]` repository.

---

## Try It

The COSMIC edition is a full installable ISO built by the same blue-green update mechanism as the other editions — but it is not yet published for download. As of now, only the GNOME and KDE Plasma editions ship from [shani.dev](https://shani.dev); the COSMIC ISO is buildable from source (`./build.sh full -p cosmic`) but has not yet been released to the download server. If you are already running Shanios and want to switch desktops, the recommended path is a fresh install — desktop environments are deeply integrated and switching at runtime is not supported.

For the full technical breakdown: [What's Included](https://docs.shani.dev/doc/intro/whats-included).

---

## Resources

- [What's Included](https://shani.dev/post/shani-os-software-ecosystem) — full software stack across all editions
- [Shanios vs Other Distros](https://shani.dev/post/shani-os-vs-alternatives) — how editions and distros compare
- [Getting Started](https://shani.dev/post/shani-os-getting-started) — first steps after install
- [Build Pipeline Deep Dive](https://shani.dev/post/shani-os-build-pipeline) — how images are produced
- [COSMIC upstream](https://system76.com/cosmic) — System76's COSMIC project page
