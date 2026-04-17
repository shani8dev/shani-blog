---
slug: shani-os-getting-started
title: 'Getting Started with Shani OS — From Download to Daily Use'
date: '2026-04-11'
tag: 'Guide'
excerpt: 'A complete walkthrough: download, verify, install, and configure Shani OS from scratch — including Flatpak apps, Nix packages, Distrobox containers, and TPM2 encryption setup.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
readTime: '12 min'
series: 'Shani OS Guides'
---

This guide walks through the complete process of getting Shani OS running — from choosing the right ISO to configuring your system for daily use. It assumes no prior knowledge of immutable Linux. The full technical reference lives at [docs.shani.dev](https://docs.shani.dev); this guide focuses on the practical steps.

---

## Choosing Your Edition

There are two editions. Both are free, open source, and include the same underlying architecture.

**GNOME Edition** (~5.4 GB) is the right choice for most people — Windows and macOS switchers, office work, students, and OEM deployments. Clean, focused interface. All essential apps pre-installed including Vivaldi Browser and OnlyOffice.

**KDE Plasma Edition** (~7.6 GB) is the right choice for gamers and power users. The complete gaming stack (Steam, Proton, Heroic Games Launcher, Lutris, MangoHud) is pre-installed and configured. Fully customisable desktop. Full KDE productivity suite including Okular, Kate, and Gwenview. virt-manager for virtual machines.

If you are unsure: start with GNOME. You can always install KDE apps on GNOME or switch later.

---

## Before You Download

**Check your system meets the requirements:**

- UEFI firmware (not legacy/CSM — this is most PCs made after 2012)
- 64-bit x86 CPU (Intel or AMD)
- Virtualisation enabled in BIOS (Intel VT-x or AMD-V — usually on by default)
- 4 GB RAM minimum, 8 GB recommended
- 32 GB storage minimum, 64 GB recommended
- 8 GB USB drive for installation

**Prepare your BIOS/UEFI** (access via F2, F10, Del, or Esc at startup):
1. Disable legacy/CSM mode — enable UEFI boot
2. Disable Fast Boot
3. Disable Secure Boot temporarily (re-enable after install)
4. Set SATA mode to AHCI
5. Enable Intel VT-x or AMD-V

Full pre-installation checklist: [docs.shani.dev — Pre-Installation](https://docs.shani.dev/doc/install/pre-install).

---

## Download and Verify

Download from [shani.dev](https://shani.dev) or directly:

- **GNOME Edition**: [Download ISO](https://sourceforge.net/projects/shanios/files/gnome/20260401/signed_shanios-gnome-2026.04.15-x86_64.iso/download)
- **KDE Plasma Edition**: [Download ISO](https://sourceforge.net/projects/shanios/files/plasma/20260401/signed_shanios-plasma-2026.04.15-x86_64.iso/download)

Always verify before writing. Place the `.iso`, `.sha256`, and `.asc` files in the same directory, then:

```bash
# Verify checksum
sha256sum -c signed_shanios-gnome-2026.04.15-x86_64.iso.sha256

# Import signing key (once)
gpg --keyserver keys.openpgp.org --recv-keys 7B927BFFD4A9EAAA8B666B77DE217F3DA8014792

# Verify signature
gpg --verify signed_shanios-gnome-2026.04.15-x86_64.iso.asc \
    signed_shanios-gnome-2026.04.15-x86_64.iso
```

Both should report OK / Good signature. If not, re-download.

---

## Write to USB

**Recommended for all platforms:** [Balena Etcher](https://etcher.balena.io) — select ISO, select USB, flash.

**Windows alternative:** [Rufus](https://rufus.ie) — select your USB, select the ISO, change the write mode to **DD Image** (not ISO), click Start.

**Linux with dd:**
```bash
# Find your USB device
lsblk

# Write (replace /dev/sdX with your USB device — double-check this!)
sudo dd bs=4M if=signed_shanios-gnome-2026.04.15-x86_64.iso \
    of=/dev/sdX status=progress oflag=sync
```

> **Do not use Ventoy.** Ventoy's ISO mounting method conflicts with the Shani OS bootloader.

---

## Install

Boot from the USB drive (press F12, F2, or Del at startup and select the USB). Select **"Install Shanios"** from the boot menu.

The installer walks you through:
1. Language and keyboard layout
2. Timezone
3. Disk selection (use automatic partitioning unless you need custom setup)
4. Encryption — **enable LUKS2 if this is a laptop** (highly recommended)
5. User account creation

Installation takes 10–15 minutes. The installer creates all Btrfs subvolumes, extracts the system image, builds both Unified Kernel Images, and registers the UEFI boot entry automatically.

When prompted, remove the USB drive and reboot.

---

## First Boot

The Plymouth boot screen appears. If you enabled encryption, you will be prompted for your passphrase — or, after enrolling TPM2 (see below), it unlocks silently.

The Initial Setup wizard runs on first login, covering user account confirmation, network, language, and appearance. After that, you are at the desktop.

Confirm your slot:

```bash
cat /data/current-slot
# Should print: blue
```

---

## First Steps: Recommended Setup

### 1. Add a Nix channel

Nix is pre-installed and the daemon is running. You need to add a channel once before installing any Nix packages:

```bash
nix-channel --add https://nixos.org/channels/nixpkgs-unstable nixpkgs
nix-channel --update
```

After this, `nix-env -i <package>` works for any package in Nixpkgs. Installed packages live in `@nix` and survive every OS update. Full guide: [docs.shani.dev — Nix Package Manager](https://docs.shani.dev/doc/software/nix).

### 2. Enroll TPM2 for encryption (if you enabled LUKS2)

This seals your LUKS key into the TPM2 chip so the disk unlocks automatically on your own hardware:

```bash
sudo gen-efi enroll-tpm2
```

Full instructions: [docs.shani.dev — TPM2 Enrollment](https://docs.shani.dev/doc/security/tpm2).

### 3. Update the system

```bash
sudo shani-deploy update
```

This downloads the latest OS image to the inactive slot, verifies it, builds a new UKI, and sets it as the next-boot default. Reboot when ready. If anything goes wrong:

```bash
sudo shani-deploy --rollback
# Then reboot
```

### 4. Install your apps

Flatpak is the primary way to install GUI applications. Both editions ship with Warehouse (the Flatpak manager) and Flatseal (Flatpak permissions editor) pre-installed. From the terminal:

```bash
# Install apps from Flathub
flatpak install flathub com.spotify.Client
flatpak install flathub com.visualstudio.code
flatpak install flathub org.gimp.GIMP
flatpak install flathub org.telegram.desktop
```

Apps install to `@flatpak` and auto-update every 12 hours. You can also manage permissions graphically with Flatseal. Full guide: [docs.shani.dev — Flatpak](https://docs.shani.dev/doc/software/flatpak).

### 5. Set up Waydroid for Android apps (optional)

Waydroid is pre-installed. Run the setup helper:

```bash
sudo waydroid-helper init
```

Firewall rules are already configured. Hardware acceleration works on Intel and AMD. ARM app compatibility via translation is included. Guide: [docs.shani.dev — Android (Waydroid)](https://docs.shani.dev/doc/software/waydroid).

---

## Installing Developer Tools

For a full mutable Linux environment, Distrobox creates a container with any distro's package manager intact. BoxBuddy (pre-installed on both editions) gives you a GUI for managing Distrobox containers:

```bash
# Create an Arch Linux container (full pacman + AUR)
distrobox create --name arch-dev --image archlinux:latest
distrobox enter arch-dev

# Or Ubuntu
distrobox create --name ubuntu-dev --image ubuntu:24.04
distrobox enter ubuntu-dev
```

The container's home directory is your home directory. Binaries exported from the container appear in your host launcher. Containers live in `@containers` and survive OS updates.

For CLI tools that do not need a full container, Nix covers most cases:

```bash
nix-env -i nodejs rustup python312 ripgrep fd bat htop
```

For containerised databases and services, Podman works with standard Docker commands. Pods (pre-installed on both editions) gives you a graphical interface for managing Podman containers:

```bash
podman run -d -p 5432:5432 -e POSTGRES_PASSWORD=secret postgres
```

---

## Managing Flatpak Permissions

Flatseal is pre-installed on both editions and lets you manage sandbox permissions for any Flatpak app without using the terminal. Open it from your app launcher to grant or restrict filesystem access, network permissions, device access, and more.

If an app cannot access a file you expect it to, open Flatseal, find the app, and check its filesystem permissions. Many apps default to sandbox-only access and need you to explicitly grant access to your home folder or specific directories.

---

## Daily Use

Once set up, a Shani OS system in daily use is quiet. Updates arrive as desktop notifications. You apply them when ready with `sudo shani-deploy`, then reboot when convenient. Your apps, containers, and home directory are never affected by OS updates.

The shell environment is set up out of the box: Zsh with syntax highlighting and autosuggestions, Starship prompt, McFly for smart command history, FZF for fuzzy search.

If something goes wrong after an update:

```bash
sudo shani-deploy --rollback
# Then reboot
```

---

## Common Questions

**Can I install packages with pacman?**
No — and you do not need to. The immutable root means `pacman -S` to the base system would be overwritten on the next update anyway. Use Flatpak for GUI apps, Nix for CLI tools, and Distrobox for anything that needs a full mutable package manager. The migration table at [docs.shani.dev](https://docs.shani.dev/doc/concepts) maps every traditional workflow to its Shani OS equivalent.

**What happens to my files if I roll back?**
Nothing. Your home directory is in `@home`, completely independent of the OS slots. Flatpak apps are in `@flatpak`. Nix packages are in `@nix`. An OS rollback does not touch any of them.

**Can I dual boot?**
It is possible but not recommended — other operating systems may overwrite the bootloader. If you need Windows alongside Shani OS, a virtual machine via KDE's virt-manager or GNOME Boxes is the more reliable setup.

**How do I find more apps?**
[Flathub.org](https://flathub.org) has the full catalogue. GNOME Software and KDE Discover let you browse from the desktop. Warehouse (pre-installed) gives you a unified view of all your installed Flatpaks with one-click updates and removal. For CLI tools, [search.nixos.org](https://search.nixos.org/packages) covers the Nix package set.

---

## Resources

- [docs.shani.dev](https://docs.shani.dev) — full technical documentation
- [shani.dev](https://shani.dev) — downloads and overview
- [github.com/shani8dev](https://github.com/shani8dev) — source code
- [Telegram community](https://t.me/shani8dev) — questions and support

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
