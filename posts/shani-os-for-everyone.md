---
slug: shani-os-for-everyone
title: 'Shani OS for Everyone — Gamers, Developers, Switchers, and IT Teams'
date: '2026-04-13'
tag: 'Guide'
excerpt: 'A practical guide to who Shani OS is for and what it looks like in daily use — whether you are coming from Windows, running a game library, managing a fleet, or doing serious dev work.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
readTime: '11 min'
series: 'Shani OS Deep Dives'
---

Shani OS is one operating system. But it looks quite different depending on what you need from it. This post covers four audiences: switchers coming from Windows or macOS, developers, gamers, and IT administrators managing fleets. The underlying architecture — atomic blue-green updates, immutable root, instant rollback, zero telemetry — is the same in every case.

For the technical foundation, start with [Why Your OS Update Should Never Break Your Computer](https://blog.shani.dev/post/why-os-updates-should-never-break). For the full architecture: [The Architecture Behind Shani OS](https://blog.shani.dev/post/shani-os-architecture-deep-dive). Complete documentation: [docs.shani.dev](https://docs.shani.dev).

---

## Coming From Windows or macOS

### The one thing that changes

Software comes from Flatpak rather than `.exe` installers or `.dmg` files. Flathub — the primary Flatpak repository — has thousands of apps. The Warehouse app (pre-installed on both editions) gives you a graphical interface for browsing, installing, and managing all your Flatpak apps. Flatseal (also pre-installed) lets you manage sandbox permissions without the terminal.

Once you understand that `flatpak install flathub org.mozilla.firefox` is equivalent to running an installer, the rest is familiar. Full guide: [docs.shani.dev — Flatpak](https://docs.shani.dev/doc/software/flatpak).

### What is already waiting for you

Both GNOME and KDE editions ship with Vivaldi Browser and OnlyOffice Desktop Editors pre-installed. OnlyOffice opens `.docx`, `.xlsx`, and `.pptx` natively — your existing documents work on day one. VLC, image viewers, calendar, notes, media players — all included.

Windows applications run through Wine — a compatibility layer that translates Windows API calls so Windows `.exe` files run directly on Linux without needing Windows or a VM. Bottles (pre-installed on KDE Plasma, available on Flathub for GNOME) provides a clean interface for managing Wine environments. For games specifically, Proton (Valve's gaming-tuned distribution of Wine, bundled with Steam) handles the vast majority of Steam's Windows-only catalogue automatically.

Indian-language support — Devanagari, Tamil, Telugu, and more — is first-class, not an afterthought. IBus multi-language input is pre-configured. Indian scripts render correctly from first boot without installing additional packages.

### Coming from macOS specifically

The terminal is familiar. Bash and Zsh work exactly as expected. Homebrew can be installed and functions identically to macOS.

Nix is also pre-installed. For macOS developers, it is worth understanding: Nix is a declarative package manager that keeps environments isolated and reproducible. It is a different mental model from Homebrew — not a replacement, but something many developers eventually prefer for managing complex dependency chains. Guide: [docs.shani.dev — Nix Package Manager](https://docs.shani.dev/doc/software/nix).

What you lose: Final Cut Pro, Logic Pro, iCloud native integration, Apple Silicon battery life, and some professional creative apps. Check beforehand if these are essential to your workflow. What you gain: no Apple ID requirement, no iCloud push, no subscription for basic features, full root access, hardware freedom, and a bad update that is always reversible in one command. macOS has no equivalent to `sudo shani-deploy -r`.

### The update experience

`shani-update` runs automatically via a systemd timer and at login, showing a desktop notification when a new OS image is ready. When you are ready, run `sudo shani-deploy`, wait a few minutes, reboot when convenient. The previous OS copy stays on disk until the next update cycle, always ready for instant rollback with `sudo shani-deploy -r`.

---

## For Developers

### Your dev environment is separate from the OS

This is the key architectural benefit for developers. Your tools, runtimes, and environments live in dedicated Btrfs subvolumes that are completely independent of which OS copy is running. An OS update cannot break your dev setup. An OS rollback cannot remove packages you installed.

### How to install CLI tools and runtimes

**Nix** is the recommended path for most developer tooling. It comes pre-installed with the daemon running and the `@nix` subvolume shared between both OS slots. Add a channel once:

```bash
nix-channel --add https://nixos.org/channels/nixpkgs-unstable nixpkgs
nix-channel --update
```

Then install anything:

```bash
nix-env -i nodejs        # Latest Node
nix-env -i rustup        # Rust toolchain
nix-env -i python312     # Python 3.12
nix-env -i ripgrep fd bat
```

Nix handles multiple versions of the same tool cleanly. All Nix packages survive OS updates and rollbacks without re-downloading. Full guide: [docs.shani.dev — Nix Package Manager](https://docs.shani.dev/doc/software/nix).

**Distrobox** is the right choice when you need a full mutable environment — the AUR, `apt install`, or any distro's native toolchain. BoxBuddy (pre-installed on both editions) gives you a GUI for creating and managing containers:

```bash
distrobox create --name arch-dev --image archlinux:latest
distrobox enter arch-dev
# Full pacman, yay, everything
```

Your containers live in the `@containers` subvolume and survive OS updates. Home directory is shared by default. Guide: [docs.shani.dev — Distrobox](https://docs.shani.dev/doc/software/distrobox).

**Podman** for container-based workflows — rootless, Docker-compatible, daemon running at boot. The Pods app (pre-installed on both editions) gives you a graphical interface for managing containers and images. The usual `docker run` commands work via the `podman-docker` drop-in. Guide: [docs.shani.dev — Containers](https://docs.shani.dev/doc/software/containers).

**AppImages** for portable one-off tools — download, run, managed by Gear Lever (pre-installed on both editions), which integrates them into your app launcher. Guide: [docs.shani.dev — AppImage](https://docs.shani.dev/doc/software/appimage).

**Snap** is available as a complement when an app exists only on the Snap Store. `snapd.socket` is pre-configured and Snap packages live in the `@snapd` Btrfs subvolume, surviving every OS update and rollback. Guide: [docs.shani.dev — Snaps](https://docs.shani.dev/doc/software/snaps).

**LXC/LXD** for full Linux system containers — a complete OS environment (init system, services, network stack) without the overhead of a full VM. Pre-installed with dedicated `@lxc` and `@lxd` Btrfs subvolumes. Useful for isolated server environments, testing system services, or running multiple distro instances simultaneously. Guide: [LXC and LXD on Shani OS](https://blog.shani.dev/post/lxc-lxd-on-shani-os).

**systemd-nspawn** for the lightest full-system containers — pull a Linux root tarball, start the container in under a second, no daemon required. Containers live in `@machines`. The fastest way to spin up an isolated Linux environment for builds or testing. Guide: [systemd-nspawn on Shani OS](https://blog.shani.dev/post/systemd-nspawn-on-shani-os).

**Waydroid** for Android app development — run a full hardware-accelerated Android stack on your Linux desktop. Test APKs directly with `adb`, iterate without a physical device. Pre-installed on both editions. Guide: [docs.shani.dev — Android (Waydroid)](https://docs.shani.dev/doc/software/waydroid).

### The dev experience in practice

VS Code via Flatpak, your runtimes in Nix, your project containers in Distrobox, your databases in Podman — each layer independent, each surviving updates. If a bad OS update disrupts something, `sudo shani-deploy -r` restores the exact previous OS state while leaving your containers, Nix packages, and home directory completely untouched.

Waydroid is pre-installed for Android development — run `sudo waydroid init` once to download the Android image, then `waydroid session start` and `waydroid show-full-ui`. Hardware-accelerated on Intel and AMD, with ARM translation included. Guide: [docs.shani.dev — Android (Waydroid)](https://docs.shani.dev/doc/software/waydroid).

For HPC and research workflows, Apptainer (formerly Singularity) is pre-installed. Submit reproducible environments to clusters, share exact setups with collaborators, run isolated GPU workloads — all against an immutable, GPG-signed host OS that is itself a verifiable artefact.

The shell environment is set up properly out of the box: Zsh with syntax highlighting, autosuggestions, and history search; Starship prompt with git integration; McFly for smart neural-network command history; FZF for fuzzy file and history search. Profile Sync Daemon (PSD) runs browser profiles from RAM — reducing SSD writes and speeding up browser performance.

---

## For Gamers

### What is included on KDE Plasma

The KDE Plasma edition ships the complete gaming stack configured and ready at first boot — all as Flatpaks:

- Steam with Proton
- Heroic Games Launcher (Epic, GOG, Amazon)
- Lutris (everything else — scripts, emulators, itch.io, Humble)
- RetroArch with cores ready to download
- Bottles for Windows titles
- GOverlay for graphical MangoHud configuration (FPS, temps, VRAM, frame times)
- GameScope for frame pacing and adaptive sync
- vkBasalt for Vulkan post-processing (sharpening, FXAA, SMAA)
- GameMode running globally — switches CPU governor to performance on every game launch
- Oversteer for racing wheel force feedback configuration
- Piper for gaming mouse configuration
- OpenRGB for unified RGB lighting control
- AntiMicroX for gamepad remapping

NVIDIA drivers are configured at first boot. Intel and AMD GPUs use Mesa's open-source drivers (RADV, ANV) with full Vulkan support.

### Kernel tuning

The kernel is tuned for gaming: HPET and RTC timers at 3072 Hz (versus the default 64 Hz), custom CFS scheduler time slices for reduced input latency, expanded PID limits, and memory map settings for large game worlds. Ananicy-cpp runs in the background, automatically deprioritising background tasks the moment a game goes active.

### The gaming advantage of immutability

An OS update never costs you a gaming session. The update runs in the background on the inactive OS slot — your running system and your game library are never touched. If an update introduces a regression, `sudo shani-deploy -r` rolls back with one command and one reboot. Your Steam library, Heroic cache, and save files live in your home directory and the `@flatpak` subvolume — completely independent of the OS rollback.

---

## For IT Administrators and Enterprises

### Deployment without per-machine drift

Every machine in a fleet pulls from the same GPG-signed, SHA256-verified image. There is no per-device package drift. Every machine running the same release runs the identical, cryptographically verified OS.

The OEM Initial Setup wizard handles first-boot configuration of language, timezone, and accounts. Plymouth BGRT displays your organisation's logo automatically via UEFI firmware.

### Rollback without a dispatch

A bad update on a remote machine does not require reimaging or an on-site visit. Boot-counting detects a failing OS slot and reverts automatically before a user sees an error. For machines that reach the desktop with a problem, `sudo shani-deploy -r` restores the previous verified state in under a minute.

### Security posture that passes audits

The attack surface is reduced by architecture: immutable root, six simultaneous Linux Security Modules, LUKS2 with TPM2 auto-unlock, Secure Boot, Intel ME kernel modules blacklisted by default, firewalld active from first boot, and zero telemetry. All claims are independently verifiable — the full codebase and build scripts are public on [github.com/shani8dev](https://github.com/shani8dev).

### Indian enterprises specifically

Indian-language support is designed in from the start. For government, institutional, and public-sector procurement: zero telemetry, no foreign key escrow, fully auditable open-source codebase, and LUKS2 encryption where keys never leave the device.

---

## Choosing Your Edition

Shani OS includes an out-of-memory manager (earlyoom) that runs system-wide. Under memory pressure it quietly terminates low-priority background tasks — your active work keeps running. The system stays responsive instead of freezing solid, even on 4 GB RAM.

**GNOME Edition** (~5.4 GB) is the right choice for work, study, Windows/macOS switchers, and OEM deployments. Clean, focused, familiar. All everyday apps pre-installed. Waydroid and Android app support included.

**KDE Plasma Edition** (~7.6 GB) is the right choice for gamers and power users. Fully customisable desktop. Complete gaming stack pre-installed. Full KDE productivity suite. virt-manager for VMs.

Both editions include: the full immutable architecture, all security features, Flatpak/Snap/Nix/AppImage/Distrobox/Podman app ecosystems, Vivaldi Browser, OnlyOffice, Warehouse, Flatseal, Pods, BoxBuddy, Gear Lever, and zero telemetry.

---

## System Requirements

- UEFI firmware (legacy/CSM not supported)
- 64-bit x86 CPU with virtualisation (Intel VT-x or AMD-V)
- 4 GB RAM minimum, 8 GB recommended
- 32 GB storage minimum, 64 GB recommended
- NVIDIA, AMD, or Intel graphics — all work at first boot

[Download Shani OS at shani.dev →](https://shani.dev) · [Documentation at docs.shani.dev](https://docs.shani.dev) · [Community on Telegram](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
