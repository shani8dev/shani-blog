---
slug: distrobox-on-shani-os
title: 'Distrobox on Shani OS — A Full Mutable Linux Inside an Immutable One'
date: '2026-04-20'
tag: 'Guide'
excerpt: 'How to use Distrobox to run any Linux distribution inside Shani OS — full pacman, apt, dnf, AUR helpers, and GUI apps — without touching the immutable host OS. With BoxBuddy for graphical management.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '9 min'
series: 'Shani OS Guides'
---

Distrobox is the answer to the question every experienced Linux user asks when they encounter an immutable OS: "But what if I need `apt install`, `pacman -S`, or a tool that only exists in the AUR?"

Distrobox creates a container running any Linux distribution — Arch, Ubuntu, Fedora, Debian, openSUSE — with that distro's full package manager intact. Your home directory is shared by default. Binaries you install inside can be exported to your host desktop and launcher. The container lives in the `@containers` Btrfs subvolume, completely independent of the OS. It survives every OS update and rollback untouched.

The result: you have an immutable, reliable, atomic OS as your base, and a full mutable Linux environment available whenever you need one — without any contradiction between the two.

BoxBuddy (pre-installed on both GNOME and KDE editions) provides a clean graphical interface for creating and managing containers without the terminal. Full reference documentation: [docs.shani.dev — Distrobox](https://docs.shani.dev/doc/software/distrobox).

---

## How Distrobox Works

Distrobox is not a virtual machine. It does not emulate hardware or run a separate kernel. It creates a container using Podman (pre-installed on Shani OS) that shares the host kernel and your home directory. The container has its own package manager, its own `/usr`, its own installed packages — but your `/home/username` is the same directory inside and outside the container.

The practical effects:
- Tools installed inside a container can read and write your project files immediately
- You never need to copy files between host and container
- The container starts in under a second
- Multiple containers of different distros coexist without conflict
- Containers persist across reboots in `@containers`

---

## BoxBuddy — Graphical Container Management

BoxBuddy is pre-installed on both GNOME and KDE editions. Open it from your application launcher.

BoxBuddy lets you:
- Create new containers from any distro image with a few clicks
- Enter containers with a single click
- See which apps are installed in each container
- Export apps and binaries to your host launcher
- Delete containers cleanly

For users who prefer the terminal, everything BoxBuddy does maps directly to `distrobox` commands — both approaches are shown below.

---

## Creating Containers

```bash
# Create an Arch Linux container (full pacman + AUR)
distrobox create --name arch-dev --image archlinux:latest

# Create an Ubuntu 24.04 container
distrobox create --name ubuntu-dev --image ubuntu:24.04

# Create a Fedora container
distrobox create --name fedora-dev --image fedora:latest

# Create a Debian container
distrobox create --name debian-stable --image debian:stable

# Create an openSUSE Tumbleweed container
distrobox create --name suse-dev --image opensuse/tumbleweed:latest

# List all containers
distrobox list
```

The container image is downloaded the first time. Subsequent container creations from the same base image are instant — Podman reuses cached layers.

---

## Entering Containers

```bash
# Enter a container by name
distrobox enter arch-dev
distrobox enter ubuntu-dev

# Once inside, you are in a full shell of that distro
# Your home directory is the same — /home/username
# You can use the full package manager

# Arch Linux container — full pacman + yay for AUR
sudo pacman -Syu
sudo pacman -S some-package
yay -S some-aur-package    # yay is available after install (see below)

# Ubuntu container — full apt
sudo apt update && sudo apt upgrade
sudo apt install some-package
sudo add-apt-repository ppa:some/ppa
sudo apt install ppa-package

# Fedora container — full dnf
sudo dnf upgrade
sudo dnf install some-package

# Exit the container
exit
```

---

## Setting Up an Arch Container with AUR Access

The AUR (Arch User Repository) is one of the most common reasons experienced Linux users want a full Arch environment on an immutable OS.

```bash
# Create and enter an Arch container
distrobox create --name arch-aur --image archlinux:latest
distrobox enter arch-aur

# Inside: update and install base tools
sudo pacman -Syu
sudo pacman -S --needed base-devel git

# Install yay (AUR helper)
git clone https://aur.archlinux.org/yay.git
cd yay && makepkg -si && cd .. && rm -rf yay

# Now use the full AUR
yay -S some-aur-package
yay -S another-tool

# Export a binary to your host
distrobox-export --bin /usr/bin/some-tool
# Now 'some-tool' is available on your host PATH

# Exit
exit
```

---

## Exporting Apps to Your Host Desktop

Distrobox can export installed applications so they appear in your host application launcher and work like native apps — even though they are running inside a container.

```bash
# Export a desktop application (creates a .desktop file in ~/.local/share/applications)
distrobox enter ubuntu-dev
distrobox-export --app some-gui-app

# Export a binary to your host PATH
distrobox-export --bin /usr/bin/some-tool

# Export a systemd service (runs inside the container at host boot)
distrobox-export --service some.service
```

Exported apps appear in GNOME's app grid or KDE's application menu with the container's icon. They launch transparently — you click the icon, the container starts if it is not already running, and the app appears on your screen.

To remove an export:

```bash
distrobox-export --app some-gui-app --delete
distrobox-export --bin /usr/bin/some-tool --delete
```

---

## Practical Use Cases

### Development Tools That Require `make install`

Many development tools publish instructions like `./configure && make && sudo make install`. On Shani OS, `/usr` is read-only and this does not work on the host. Inside a Distrobox container, it works exactly as expected:

```bash
distrobox enter ubuntu-dev
git clone https://github.com/some/tool.git
cd tool && ./configure && make && sudo make install
# Installed to /usr/local/bin inside the container
distrobox-export --bin /usr/local/bin/tool
# Now available on host
```

### Building and Testing Software for Multiple Distros

```bash
# Test a build on Ubuntu
distrobox enter ubuntu-dev
cd ~/projects/myapp
./build.sh

# Test the same build on Fedora
exit
distrobox enter fedora-dev
cd ~/projects/myapp
./build.sh
```

Your project files are in your home directory — the same path in both containers.

### PPAs and Third-Party Repositories

```bash
distrobox enter ubuntu-dev

# Add any Ubuntu PPA
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install python3.11

distrobox-export --bin /usr/bin/python3.11
```

### Legacy Software

Some software has not been packaged as a Flatpak and has complex system dependencies. If it has a `.deb` or is in an APT repo:

```bash
distrobox enter ubuntu-dev
sudo dpkg -i legacy-app.deb
# or
sudo apt install legacy-app
distrobox-export --app legacy-app
```

---

## Running GUI Apps from Containers

GUI apps run inside Distrobox containers display on your host Wayland or X11 desktop natively — there is no separate X server or VNC involved. They appear as regular windows on your desktop.

```bash
distrobox enter ubuntu-dev
# Install a GUI app that is not in Flathub
sudo apt install some-gui-app
some-gui-app  # launches on your host desktop

# Or export it so it appears in your launcher
distrobox-export --app some-gui-app
exit
# From now on, launch from your app menu
```

---

## Managing Multiple Containers

```bash
# List all containers and their status
distrobox list

# Stop a running container
distrobox stop arch-dev

# Remove a container (data in your home directory is untouched)
distrobox rm arch-dev

# Remove and delete all data
distrobox rm arch-dev --force

# Upgrade all packages in a container
distrobox enter ubuntu-dev -- sudo apt upgrade -y
distrobox enter arch-dev -- sudo pacman -Syu --noconfirm
```

### Running Commands Without Entering

You can run a single command in a container without entering an interactive shell:

```bash
# Run a command in a container
distrobox enter ubuntu-dev -- python3 --version
distrobox enter arch-dev -- yay -Qs some-package
```

---

## Distrobox vs the Full Ecosystem

All of these are available on Shani OS simultaneously and serve distinct roles:

**Use Distrobox when:**
- You need `apt`, `pacman`, `dnf`, or `yay` — the full package manager of a specific distro
- A tool requires `make install` or `./configure` into system paths
- You need a specific distro environment for compatibility testing
- You want to use PPAs, COPR repos, or the AUR
- A tool is not in Flathub, the Snap Store, or Nixpkgs

**Use Flatpak when:**
- You want a GUI desktop application available on Flathub
- You want sandboxed permissions management via Flatseal
- Guide: [Flatpak on Shani OS](https://blog.shani.dev/post/flatpak-on-shani-os)

**Use Snap when:**
- An app is only on the Snap Store and not Flathub
- Guide: [Snap on Shani OS](https://blog.shani.dev/post/snap-on-shani-os)

**Use AppImage when:**
- An app ships only as an AppImage or you want a specific portable version
- Guide: [AppImage on Shani OS](https://blog.shani.dev/post/appimage-on-shani-os)

**Use Nix when:**
- You want CLI tools or development runtimes installed persistently without a full container
- You need multiple versions of the same tool without conflict
- You want reproducible per-project environments via `shell.nix`
- Guide: [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os)

**Use Podman when:**
- You want OCI containers for services, databases, or development — rootless and Docker-compatible
- Guide: [Podman on Shani OS](https://blog.shani.dev/post/podman-containers-on-shani-os)

**Use LXC/LXD or systemd-nspawn when:**
- You need a full isolated Linux system with its own init, services, and network stack — lighter than a VM but more complete than Distrobox
- Guide: [LXC and LXD on Shani OS](https://blog.shani.dev/post/lxc-lxd-on-shani-os) · [systemd-nspawn on Shani OS](https://blog.shani.dev/post/systemd-nspawn-on-shani-os)

**Use Homebrew when:**
- You are coming from macOS and `brew install` is muscle memory
- Guide: [Homebrew on Shani OS](https://blog.shani.dev/post/homebrew-on-shani-os)

The layers do not conflict. You can have apps from all ecosystems running simultaneously — each in its own Btrfs subvolume, each surviving OS updates.

---

## Storage and Performance

Distrobox containers live in the `@containers` Btrfs subvolume mounted at `/var/lib/containers`. Podman manages the OCI image layers there.

Btrfs zstd compression applies to `@containers`, so container storage is compressed automatically. The `bees` background deduplication daemon also runs across all subvolumes — layers shared between containers (common base images) are deduplicated at the block level.

To see how much storage your containers use:

```bash
# Container sizes
podman system df
distrobox list

# Btrfs compressed size
sudo compsize /var/lib/containers
```

To clean up unused container images:

```bash
podman system prune -af
```

---

## Troubleshooting

**Container fails to start:**
```bash
# Check Podman logs
podman ps -a
podman logs <container-id>

# Reinitialise a broken container
distrobox rm arch-dev --force
distrobox create --name arch-dev --image archlinux:latest
```

**Exported app does not appear in launcher:**
```bash
# Force a desktop database update
update-desktop-database ~/.local/share/applications

# Check the exported .desktop file
ls ~/.local/share/applications/ | grep -i appname
cat ~/.local/share/applications/appname.desktop
```

**Home directory permissions issue inside container:**

The container shares your host home directory and user ID. Permissions should always match. If something is wrong:
```bash
# Check UID inside vs outside
distrobox enter mycontainer -- id
id  # on host — both should show the same UID
```

Full troubleshooting reference: [docs.shani.dev — Distrobox](https://docs.shani.dev/doc/software/distrobox).

---

## Resources

- [docs.shani.dev — Distrobox](https://docs.shani.dev/doc/software/distrobox) — full reference
- [docs.shani.dev — Containers](https://docs.shani.dev/doc/software/containers) — Podman and all container runtimes
- [Flatpak on Shani OS](https://blog.shani.dev/post/flatpak-on-shani-os) — GUI applications
- [Snap on Shani OS](https://blog.shani.dev/post/snap-on-shani-os) — Snap Store apps
- [AppImage on Shani OS](https://blog.shani.dev/post/appimage-on-shani-os) — portable apps with Gear Lever
- [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os) — CLI tools and dev environments
- [Podman on Shani OS](https://blog.shani.dev/post/podman-containers-on-shani-os) — OCI containers and services
- [LXC and LXD on Shani OS](https://blog.shani.dev/post/lxc-lxd-on-shani-os) — full system containers
- [systemd-nspawn on Shani OS](https://blog.shani.dev/post/systemd-nspawn-on-shani-os) — lightweight system containers
- [Homebrew on Shani OS](https://blog.shani.dev/post/homebrew-on-shani-os) — brew for macOS switchers
- [Telegram community](https://t.me/shani8dev) — questions and support

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
