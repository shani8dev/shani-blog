---
slug: shani-os-2026-04-15-release
title: 'Shani OS 2026.04.15 — Release Notes'
excerpt: 'The April 2026 stable release: fixed UEFI installer, improved shani-deploy reliability, refreshed GNOME 50 and KDE Plasma 6 ISOs, and a full package manifest.'
date: 2026-04-15
tag: Release
readTime: 8 min
cover: /assets/images/shani-os-2026.04.15.png
series: Shani OS Releases
author: Shrinivas Vishnu Kumbhar
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS — focused on performance, simplicity, and open infrastructure.'
author_initials: SK
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
featured: true
draft: false
pinned: true
updated: 2026-04-15
keywords: 'shani os, immutable linux, arch linux, gnome 50, kde plasma 6, release notes, shani-deploy, btrfs, atomic update, uki'
---

Shani OS **2026.04.15** is now available — two refreshed ISO images, a fixed UEFI installer, and significantly improved `shani-deploy` reliability across interrupted downloads and edge-case boot sequences.

> 🗓️ **Release Date:** April 15, 2026
> 🧱 **Base:** Arch Linux (rolling) with a read-only root filesystem
> 🔁 **Update model:** Atomic blue/green updates via `shani-deploy`

New to Shani OS? Start with [Why Your OS Update Should Never Break Your Computer](/post/why-your-os-update-should-never-break-your-computer) for context on the design philosophy, then [The Architecture Behind Shani OS](/post/shani-os-architecture-deep-dive) for the technical detail. For everyday usage and use-case guidance, see [Shani OS for Everyone](/post/shani-os-for-everyone). Full documentation lives at [wiki.shani.dev](https://wiki.shani.dev).

---

## Available Images

| Edition | Size | Best for |
|---|---|---|
| 🟢 GNOME Edition | ~5.4 GB | Work, study, Windows/macOS switchers, OEM deployments |
| 🔵 KDE Plasma Edition | ~7.6 GB | Gaming, power users — full gaming stack pre-installed |

Both ISOs are SHA256 checksummed and GPG signed with key `7B927BFFD4A9EAAA8B666B77DE217F3DA8014792`. See the [installation instructions at wiki.shani.dev](https://wiki.shani.dev#installation) for the full verification walkthrough.

---

## What Changed in This Release

### Installer

The most significant fix in this release is a corrected UEFI installation flow. Previous releases had inconsistent behaviour on certain UEFI implementations — particularly around ESP partition detection and Shim enrollment on some OEM firmware. This release resolves those issues across the tested hardware matrix.

Installation time is now approximately 10–15 minutes from USB boot to first login. The installer creates all Btrfs subvolumes, extracts the system image into `@blue`, snapshots it to `@green`, builds both Unified Kernel Images via `gen-efi`, and registers the UEFI boot entry — all without requiring any post-install configuration.

### shani-deploy

Several reliability issues in the update and rollback pipeline have been resolved:

- Interrupted downloads now resume correctly via `aria2c` rather than restarting from zero
- The boot-count verification step — which confirms a new slot booted successfully before committing it as default — is more robust against edge-case timing
- `--rollback` path handles the case where the inactive slot has no prior snapshot more gracefully
- `shani-deploy --storage-info` now reports accurate compressed sizes using `compsize`
- `shani-update` background notification service (user-level systemd service) now more reliably detects new images and sends desktop notifications

### shani-health
- `shani-health` new cli for the check the health of shanios

### Hardware Support

Firmware packages updated to `20260309-1` (AMD and Intel microcode included). GPU compatibility improvements cover recent AMD RDNA 3 and Intel Arc cards. Bluetooth and audio handling improvements target common laptop hardware — specifically Intel DSP audio via updated `sof-firmware`.

---

## Core System Versions

### Base

| Component | Version |
|---|---|
| Linux Kernel | `6.19.11.arch1-1` |
| systemd | `260.1-1` |
| glibc | `2.43+r5+g856c426a7534-1` |
| Linux Firmware | `20260309-1` |
| AMD Microcode | `20260309-1` |
| Intel Microcode | `20260227-1` |

### GNOME Edition

| Component | Version |
|---|---|
| GNOME Shell | `50.1-1` |
| GTK 4 | `4.22.2-1` |
| libadwaita | `1.9.0-1` |
| Nautilus | `50.1-1` |
| GDM | `50.0-1` |

### KDE Plasma Edition

| Component | Version |
|---|---|
| KDE Plasma | `6.6.4-1` |
| KDE Frameworks | `6.25.0-1` |
| Qt 6 | `6.11.0-2` |
| KWin | `6.6.4-1` |
| Dolphin | `25.12.3-1` |

---

## Application Runtimes

Shani OS uses a multi-runtime model. Applications run entirely outside the base OS in dedicated Btrfs subvolumes, so they survive every update and rollback untouched. The `@nix` subvolume is shared between both OS slots — Nix packages installed while running `@blue` are equally available when running `@green`.

| Runtime | Version | Purpose |
|---|---|---|
| Flatpak | `1.16.6-1` | Primary GUI apps — auto-updates every 12 hours |
| Snap | `2.74.1-2` | Optional sandboxed apps |
| Nix | `2.34.6-1` | Reproducible dev environments (`@nix` subvolume, shared across slots) |
| Distrobox | `1.8.2.4-1` | Full mutable Linux containers (Ubuntu, Arch, Fedora) |
| Podman | `5.8.1-2` | Rootless containers — Docker-compatible |
| AppImage | - | Portable apps via Gear Lever |

---

## Shani OS Core Packages

| Package | Version | Role |
|---|---|---|
| shani-core | `1.2-13` | Core system integration layer |
| shani-deploy | `0.0.1-54` | Atomic update and rollback tool |
| shani-settings | `0.0.5-37` | System configuration helpers |
| shani-desktop-gnome | `1.2-23` | GNOME edition metapackage |
| shani-desktop-plasma | `1.0-25` | KDE Plasma edition metapackage |

---

## Pre-Installed Flatpaks

### GNOME Edition

The GNOME edition ships with a focused set of apps covering everyday computing needs:

**Productivity & Utilities:** Vivaldi Browser, OnlyOffice Desktop Editors, GNOME Text Editor, GNOME Calculator, GNOME Calendar, GNOME Clocks, GNOME Maps, GNOME Contacts, GNOME Notes (Gnote), Papers (PDF viewer), Loupe (image viewer), Snapshot (camera), Simple Scan, Sound Recorder, Font Viewer, Characters, Weather

**Media:** Decibels (audio player), Showtime (video player)

**System Tools:** Warehouse (Flatpak manager), Flatseal (Flatpak permissions), Pods (Podman GUI), BoxBuddy (Distrobox GUI), Gear Lever (AppImage manager), Impression (USB writer), Extension Manager, Seahorse (key manager), Secrets (password manager), GNOME Boxes (VM management), gSmartControl (disk health)

**Connectivity:** GNOME Connections (remote desktop client), Network Displays, Meld (diff tool)

**Games:** Nibbles, Mahjongg, Chess, Aisleriot, Quadrapassel, Sudoku

**Graphics:** Drawing (simple drawing app), Fragments (torrent client), Shortwave (internet radio)

### KDE Plasma Edition

The KDE Plasma edition ships the GNOME system tools (Warehouse, Flatseal, Pods, BoxBuddy, Gear Lever) plus a complete gaming and productivity stack:

**Gaming:** Steam, Heroic Games Launcher (Epic/GOG/Amazon), Lutris, RetroArch, Bottles (Windows apps), GOverlay (MangoHud configurator), Oversteer (racing wheel configuration), AntiMicroX (gamepad mapper), OpenRGB (RGB lighting), Piper (gaming mouse configuration)

**KDE Apps:** Okular (documents), Gwenview (images), Elisa (music), Haruna (video), Kate (text editor), KolourPaint, Kompare (diff tool), Kamoso (camera), KRDC (remote desktop), ISO Image Writer, KGet, KTorrent, KCalc, Skanlite (scanner)

**Games:** KPatience, Knights (chess), KBlocks, KSnakeDuel, KMahjongg, Kapman, KSudoku

**VM Tools:** virt-manager, QEMU extension

**Theming:** Kvantum style engine

**Vivaldi Browser and OnlyOffice Desktop Editors** are included on both editions.

---

## Security Stack

All of the following are active from first boot, by default:

- **Six simultaneous Linux Security Modules:** `landlock`, `lockdown`, `yama`, `integrity` (IMA/EVM), `apparmor`, `bpf`
- **LUKS2 full-disk encryption** with argon2id key derivation — opt-in at install
- **TPM2 auto-unlock** — enroll with `sudo gen-efi enroll-tpm2` on first boot
- **Secure Boot** via Shim + MOK-signed Unified Kernel Images, one per slot
- **Signed system images** — SHA256 + GPG verified before every deployment
- **Zero telemetry** — no usage data, crash reports, or analytics
- **Intel ME disabled** by default (`mei`, `mei_me` kernel modules blacklisted)
- **firewalld** active from first boot

---

## Atomic Update Model

Shani OS always maintains two complete, independently bootable system images:

```
shanios-blue  → @blue subvolume   (active slot)
shanios-green → @green subvolume  (standby slot)
```

Update flow: download to inactive slot → verify checksum + signature → snapshot old slot → extract new image → generate signed UKI → switch bootloader default → reboot → 15-second startup check confirms success. If the new slot fails to boot three times, systemd-boot automatically falls back.

---

## Download

- **GNOME Edition** (~5.4 GB): [Download from SourceForge](https://sourceforge.net/projects/shanios/files/gnome/20260401/signed_shanios-gnome-2026.04.15-x86_64.iso/download)
- **KDE Plasma Edition** (~7.6 GB): [Download from SourceForge](https://sourceforge.net/projects/shanios/files/plasma/20260401/signed_shanios-plasma-2026.04.15-x86_64.iso/download)

Or visit [shani.dev](https://shani.dev) for links, torrent files, and verification instructions.

---

## Verify

```bash
# 1. Verify checksum
sha256sum -c signed_shanios-gnome-2026.04.15-x86_64.iso.sha256

# 2. Import the Shani OS signing key (once)
gpg --keyserver keys.openpgp.org --recv-keys 7B927BFFD4A9EAAA8B666B77DE217F3DA8014792

# 3. Verify GPG signature
gpg --verify signed_shanios-gnome-2026.04.15-x86_64.iso.asc signed_shanios-gnome-2026.04.15-x86_64.iso
```

Write the ISO to a USB drive (minimum 8 GB) using **Balena Etcher** or **Rufus** (DD mode). Do not use Ventoy — it conflicts with the Shani OS bootloader.

---

## First Steps After Install

```bash
# Firmware updates (BIOS, Thunderbolt, storage peripherals)
fwupdmgr refresh && fwupdmgr update

# Add a Nix channel before installing any Nix packages (once, on fresh install)
nix-channel --add https://nixos.org/channels/nixpkgs-unstable nixpkgs
nix-channel --update

# Enroll TPM2 for automatic LUKS unlock (if you enabled encryption)
sudo gen-efi enroll-tpm2

# Update the system
sudo shani-deploy

# Check which slot you're running
cat /data/current-slot
```

---

## Documentation & Community

- [wiki.shani.dev](https://docs.shani.dev) — full technical documentation
- [shani.dev](https://shani.dev) — download, overview, and feature details
- [github.com/shani8dev](https://github.com/shani8dev) — source code
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
> *Shani OS 2026.04.15 — Reliable by design, consistent by default.*
