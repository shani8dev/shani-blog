---
slug: shani-os-software-ecosystem
title: 'The Shani OS Software Ecosystem — What to Use, When, and Why'
date: '2026-05-12'
tag: 'Guide'
excerpt: 'One canonical reference for every software installation option on Shani OS: Flatpak, Snap, AppImage, Nix, Distrobox, Podman, LXC/LXD, systemd-nspawn, Apptainer, Homebrew, and VMs. Includes a decision flowchart, full comparison table, and the subvolume each ecosystem lives in.'
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

Shani OS's root filesystem is read-only. You cannot write to `/usr`, `/bin`, or `/lib` at runtime — the OS is a verified, immutable image. So how do you install software?

The answer is that software belongs in one of several persistent layers, each in its own Btrfs subvolume alongside the OS. Every one of these layers survives OS updates and rollbacks completely untouched. None of them conflict.

This post is the single reference for all of them.

---

## Decision Flowchart

Start here when you need to install something:

```
What do you need?
│
├─ A GUI desktop application
│   └─ Is it on Flathub?
│       ├─ Yes → Flatpak (flatpak install flathub ...)
│       └─ No → Is it on the Snap Store?
│               ├─ Yes → Snap (snap install ...)
│               └─ No → Is it an AppImage?
│                       ├─ Yes → AppImage + Gear Lever
│                       └─ No → Distrobox (install inside a container, export to launcher)
│
├─ A CLI tool or development runtime
│   └─ Is it in Nixpkgs? (search.nixos.org)
│       ├─ Yes → Nix (nix-env -iA nixpkgs.toolname)
│       └─ No → Distrobox (install via apt/pacman/yay inside a container)
│
├─ A Windows application (.exe)
│   └─ Does it work under Wine?
│       ├─ Likely yes → Bottles (Wine environment manager, pre-installed on KDE)
│       └─ Needs real Windows kernel → Virtual Machine (virt-manager / GNOME Boxes)
│
├─ A database, service, or backend
│   └─ Podman (rootless OCI containers, Docker-compatible)
│
├─ A containerised HPC/research environment for cluster use
│   └─ Apptainer (single .sif file, runs identically on any SLURM/PBS cluster)
│
├─ A full mutable Linux environment (need apt/pacman/yay/AUR)
│   └─ Distrobox (full distro package manager, home dir shared)
│
├─ A full isolated Linux system (own init, services, network)
│   ├─ Need rich tooling (image catalog, port forwarding) → LXC/LXD
│   └─ Need minimal overhead, no daemon → systemd-nspawn
│
└─ An Android app
    └─ Waydroid (full hardware-accelerated Android in a container)
```

---

## The Full Comparison Table

| Ecosystem | Best for | Isolation | GUI apps | CLI tools | Root required | Survives updates |
|---|---|---|---|---|---|---|
| **Flatpak** | GUI desktop apps | Sandboxed | ✓ primary | — | No | ✓ `@flatpak` |
| **Snap** | GUI apps not on Flathub | Strict/Classic | ✓ | Some | No | ✓ `@snapd` |
| **AppImage** | Portable/beta apps | None (user perms) | ✓ | — | No | ✓ `@home` |
| **Nix** | CLI tools, dev runtimes | None (profile) | Some | ✓ primary | No | ✓ `@nix` |
| **Homebrew** | macOS muscle memory | None (user dir) | Some | ✓ | No | ✓ `@home` |
| **Distrobox** | Full distro env, AUR | Low–medium | ✓ (export) | ✓ (export) | No | ✓ `@containers` |
| **Podman** | Services, databases | OCI container | — | ✓ | No (rootless) | ✓ `@containers` |
| **LXC/LXD** | Full system containers | High | — | ✓ | Yes (lxd group) | ✓ `@lxc`/`@lxd` |
| **systemd-nspawn** | Lightweight system containers | High | — | ✓ | Yes | ✓ `@machines` |
| **Apptainer** | HPC / cluster workloads | Read-only SIF | — | ✓ | No | ✓ `~/.apptainer` |
| **Bottles/Wine** | Windows apps | Wine prefix | ✓ | ✓ | No | ✓ `@home` |
| **Virtual Machines** | Full hardware isolation | Complete (own kernel) | ✓ | ✓ | KVM group | ✓ `@libvirt` |
| **Waydroid** | Android apps | LXC container | ✓ | — | Init only | ✓ `@waydroid` |

---

## Where Each Ecosystem Lives on Disk

Every ecosystem has its own Btrfs subvolume. None overlap. All survive OS updates and rollbacks because `shani-deploy` only writes to `@blue` or `@green` — never to these subvolumes.

```
Btrfs filesystem
├── @blue / @green     ← OS slots (only these change during shani-deploy)
├── @home              ← /home — your files, AppImages, Homebrew, Nix profile
├── @flatpak           ← /var/lib/flatpak
├── @snapd             ← /var/lib/snapd
├── @nix               ← /nix (shared across both OS slots)
├── @containers        ← /var/lib/containers (Distrobox + Podman)
├── @machines          ← /var/lib/machines (systemd-nspawn)
├── @lxc / @lxd        ← LXC and LXD containers
├── @libvirt / @qemu   ← VM disk images
└── @waydroid          ← /var/lib/waydroid
```

---

## When to Use Each One

### Flatpak — GUI applications (primary)

Flatpak is the right choice for almost every GUI desktop application. Flathub has thousands of apps — browsers, office suites, media players, creative tools, IDEs. Apps are sandboxed, auto-update every 12 hours, and their permissions are manageable via Flatseal (pre-installed).

```bash
flatpak install flathub org.mozilla.firefox
flatpak install flathub org.gimp.GIMP
flatpak install flathub com.spotify.Client
flatpak search "video editor"
```

Guide: [Flatpak on Shani OS](https://blog.shani.dev/post/flatpak-on-shani-os)

---

### Snap — GUI apps not on Flathub

Snap is pre-configured as a fallback when an app exists only on the Snap Store. `snapd.socket` is socket-activated — the daemon starts on demand. Snap packages live in `@snapd`.

```bash
snap install some-app
snap install code --classic
snap list
```

Guide: [Snap on Shani OS](https://blog.shani.dev/post/snap-on-shani-os)

---

### AppImage — portable / beta apps

AppImages are self-contained executables. Download, `chmod +x`, run. No installation, no system writes. Gear Lever (pre-installed on both editions) integrates them into your launcher and tracks updates.

```bash
chmod +x AppName.AppImage
./AppName.AppImage
# Or drag onto Gear Lever for launcher integration
```

Guide: [AppImage on Shani OS](https://blog.shani.dev/post/appimage-on-shani-os)

---

### Nix — CLI tools and dev runtimes (primary)

Nix is pre-installed and the daemon is running. The `@nix` subvolume is shared between both OS slots — packages survive updates and rollbacks and are immediately available in the new slot. Over 100,000 packages. Multiple versions of the same tool coexist cleanly.

```bash
# Add a channel once (fresh install)
nix-channel --add https://nixos.org/channels/nixpkgs-unstable nixpkgs
nix-channel --update

# Install anything
nix-env -iA nixpkgs.nodejs_22
nix-env -iA nixpkgs.rustup
nix-env -iA nixpkgs.ripgrep
```

Guide: [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os)

---

### Homebrew — if brew is muscle memory

Homebrew installs to `/home/linuxbrew/.linuxbrew` — completely outside the read-only OS root. Works identically to macOS. A reasonable choice for macOS switchers; Nix is more powerful for complex environments.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
brew install ripgrep node jq
```

Guide: [Homebrew on Shani OS](https://blog.shani.dev/post/homebrew-on-shani-os)

---

### Distrobox — full mutable Linux environment

Distrobox creates a container of any Linux distribution — Arch, Ubuntu, Fedora — with that distro's full package manager intact. Your home directory is shared by default. Binaries and GUI apps can be exported to your host launcher. Containers live in `@containers`.

```bash
# Arch with AUR access
distrobox create --name arch-dev --image archlinux:latest
distrobox enter arch-dev
yay -S some-aur-package
distrobox-export --bin /usr/bin/some-tool

# Ubuntu with PPAs
distrobox create --name ubuntu-dev --image ubuntu:24.04
distrobox enter ubuntu-dev
sudo add-apt-repository ppa:some/ppa && sudo apt install some-package
```

Guide: [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os)

---

### Podman — services and databases

Podman is rootless, Docker-compatible, and daemon-free. Use it for persistent services: databases, web servers, self-hosted tools. The Pods app (pre-installed) gives you a graphical interface. `podman-docker` is pre-installed — existing `docker` commands work as-is.

```bash
podman run -d -p 5432:5432 -e POSTGRES_PASSWORD=secret postgres:16
podman run -d -p 6379:6379 redis:7-alpine
podman-compose up -d   # or docker compose up -d
```

Guide: [Podman on Shani OS](https://blog.shani.dev/post/podman-containers-on-shani-os)

---

### Apptainer — HPC and cluster workloads

Apptainer (formerly Singularity) packages your entire environment into a single `.sif` file that runs identically on your Shani OS workstation and on any SLURM/PBS/LSF cluster. No root required. `--nv` and `--rocm` flags for GPU passthrough.

```bash
apptainer pull docker://pytorch/pytorch:latest
apptainer exec --nv pytorch_latest.sif python3 train.py
apptainer build --fakeroot myenv.sif myenv.def
```

Guide: [Apptainer on Shani OS](https://blog.shani.dev/post/apptainer-on-shani-os)

---

### LXC/LXD — full system containers

LXD runs complete Linux OS environments — init system, services, network stack — sharing the host kernel but fully isolated. Lighter than a VM, more complete than Distrobox. `lxd.socket` is socket-activated.

```bash
sudo lxd init --auto
lxc launch ubuntu:24.04 myserver
lxc exec myserver -- bash
lxc config device add myserver webport proxy listen=tcp:0.0.0.0:8080 connect=tcp:127.0.0.1:80
```

Guide: [LXC and LXD on Shani OS](https://blog.shani.dev/post/lxc-lxd-on-shani-os)

---

### systemd-nspawn — lightweight system containers

systemd-nspawn is the lightest full-system container option. No daemon, no setup. Pull a tarball and boot it. Container filesystems live in `@machines`.

```bash
sudo machinectl pull-tar --verify=no \
  https://geo.mirror.pkgbuild.com/images/latest/Arch-Linux-x86_64-basic.tar.zst archlinux
sudo machinectl start archlinux
sudo machinectl login archlinux
```

Guide: [systemd-nspawn on Shani OS](https://blog.shani.dev/post/systemd-nspawn-on-shani-os)

---

### Bottles/Wine — Windows applications

Bottles manages isolated Wine environments for running Windows `.exe` software directly on Linux. No Windows licence or VM required for most applications. Pre-installed on KDE Plasma, available on Flathub for GNOME.

```bash
flatpak install flathub com.usebottles.bottles
# Then: Bottles → Create bottle → Run Executable → select your .exe
```

Guide: [Windows Apps on Shani OS](https://blog.shani.dev/post/windows-apps-on-shani-os)

---

### Virtual Machines — full hardware isolation

For software requiring a real Windows kernel, GPU passthrough, or a completely separate OS environment. virt-manager (pre-installed on KDE Plasma, `org.virt_manager.virt-manager` Flatpak on GNOME) uses QEMU/KVM for near-native performance. VM disks live in `@libvirt`.

Guide: [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines)

---

### Waydroid — Android apps

Waydroid runs a full hardware-accelerated Android stack in a container. Indian apps (BHIM, DigiLocker, IRCTC), streaming apps, and Android development testing all work natively on your desktop.

```bash
sudo waydroid init   # one-time setup
waydroid session start
waydroid show-full-ui
waydroid app install myapp.apk
```

Guide: [Waydroid on Shani OS](https://blog.shani.dev/post/waydroid-android-on-shani-os)

---

## Ecosystem Auto-Update Summary

| Ecosystem | Auto-updates? | How to manually update |
|---|---|---|
| Flatpak | Every 12 hours (systemd timer) | `flatpak update` |
| Snap | Automatic (snapd daemon) | `snap refresh` |
| AppImage | Via Gear Lever (app-specific) | Open Gear Lever |
| Nix | Manual | `nix-channel --update && nix-env -u '*'` |
| Homebrew | Manual | `brew update && brew upgrade` |
| Distrobox | Manual per-container | `distrobox enter name -- sudo apt upgrade` |
| Podman images | Manual | `podman pull image:latest` |
| Waydroid | Via OTA in Android UI | Settings → System → Software Update |

The OS itself updates separately via `shani-deploy` and never interferes with any of the above.

---

## Resources

- [docs.shani.dev](https://docs.shani.dev) — full documentation for every ecosystem
- [flathub.org](https://flathub.org) — Flatpak app catalogue
- [search.nixos.org/packages](https://search.nixos.org/packages) — Nix package search
- [snapcraft.io](https://snapcraft.io) — Snap Store catalogue
- [appimagehub.com](https://www.appimagehub.com) — AppImage catalogue
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
