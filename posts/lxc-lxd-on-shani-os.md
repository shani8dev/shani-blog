---
slug: lxc-lxd-on-shani-os
title: 'LXC and LXD on Shani OS — Full System Containers'
date: '2026-05-07'
tag: 'Guide'
excerpt: 'LXC and LXD run full Linux system containers on Shani OS — complete OS environments sharing the host kernel, stored in dedicated @lxc and @lxd Btrfs subvolumes that survive every OS update. Lighter than VMs, more complete than Distrobox.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '7 min'
series: 'Shani OS Guides'
---

LXC and LXD provide full Linux system containers — they run a complete operating system (init system, services, network stack) inside an isolated environment that shares the host kernel. This sits between application containers (Podman/Docker) and full virtual machines (QEMU/KVM) in terms of isolation and overhead.

On Shani OS, LXC and LXD are pre-installed with dedicated Btrfs subvolumes (`@lxc` and `@lxd`). `lxd.socket` is socket-activated. Containers survive every OS update and rollback untouched.

Full reference: [docs.shani.dev — Containers](https://docs.shani.dev/doc/software/containers).

---

## LXC vs LXD vs Distrobox vs Podman vs nspawn vs VMs

Choosing the right container or isolation type:

| | Distrobox | Podman | systemd-nspawn | LXD | QEMU/KVM |
|---|---|---|---|---|---|
| Purpose | Dev/app containers | OCI app containers | Lightweight system containers | Full system containers | Full VMs |
| Shares home dir | Yes (by default) | No | No | No | No |
| Full init system | No | No | Yes | Yes | Yes |
| Kernel | Host | Host | Host | Host | Own kernel |
| Startup time | ~1s | ~0.1s | ~1s | ~3s | ~30s |
| Daemon required | No | No | No | Yes (socket) | Yes |
| Isolation | Low–medium | Medium | High | High | Full |

For GUI apps and portable tools, see: **Flatpak** ([guide](https://blog.shani.dev/post/flatpak-on-shani-os)), **Snap** ([guide](https://blog.shani.dev/post/snap-on-shani-os)), **AppImage** ([guide](https://blog.shani.dev/post/appimage-on-shani-os)). For CLI tools and runtimes, see **Nix** ([guide](https://blog.shani.dev/post/nix-on-shani-os)).

**Use LXD when:**
- You need a complete isolated server environment (web server, database, multiple services)
- You want strong isolation but not the overhead of a full VM
- You are testing system configurations, init systems, or system-level software
- You want multiple isolated "machines" that boot quickly
- You need LXD's image catalog, built-in port forwarding devices, or remote container management

**Use systemd-nspawn when** you want the same full-system isolation as LXD with less setup — no init wizard, no daemon, no image format. Pull a tar and start. See [systemd-nspawn on Shani OS](https://blog.shani.dev/post/systemd-nspawn-on-shani-os).

---

## LXD Setup

`lxd.socket` is socket-activated on Shani OS. `lxcfs.service` is also enabled — it provides filesystem virtualisation for containers so that `/proc/cpuinfo`, `/proc/meminfo`, and related files report per-container values rather than host totals. Initialize LXD on first use:

```bash
# Initialize LXD (interactive wizard)
sudo lxd init

# Or use defaults (good for most cases)
sudo lxd init --auto
```

The wizard asks about storage backend (use `btrfs` — it integrates with the host Btrfs), network bridge, and remote access. The Btrfs storage pool maps into the `@lxd` subvolume.

```bash
# Add yourself to the lxd group (Shani OS does this automatically for new users)
groups | grep lxd

# If missing:
sudo usermod -aG lxd $USER
# Log out and back in
```

---

## Creating and Managing Containers with LXD

```bash
# List available images
lxc image list images: | grep -i ubuntu
lxc image list images: | grep -i alpine
lxc image list images: | grep -i debian

# Launch a container (downloads image if needed)
lxc launch ubuntu:24.04 myubuntu
lxc launch debian:bookworm mydebian
lxc launch alpine:3.19 myalpine
lxc launch archlinux:current myarch

# List running containers
lxc list

# Open a shell in a container
lxc exec myubuntu -- bash
lxc exec myubuntu -- /bin/bash

# Run a specific command
lxc exec myubuntu -- apt update
lxc exec myubuntu -- systemctl status nginx

# Stop and start containers
lxc stop myubuntu
lxc start myubuntu
lxc restart myubuntu

# Delete a container
lxc delete myubuntu
lxc delete myubuntu --force    # force-delete running container
```

---

## Networking in LXD Containers

By default, LXD creates a `lxdbr0` bridge and gives each container a private IP address on that bridge. Containers can reach the internet through NAT.

```bash
# Get container IP address
lxc list
# Or from inside: ip addr

# Access a web service running in a container from the host
lxc exec myubuntu -- ip addr show eth0   # get container IP, e.g. 10.0.0.123
curl http://10.0.0.123:8080

# Forward a port from host to container
lxc config device add myubuntu webport proxy \
  listen=tcp:0.0.0.0:8080 \
  connect=tcp:127.0.0.1:8080
# Now http://localhost:8080 on the host reaches port 8080 in the container
```

---

## Persistent Storage in Containers

```bash
# Mount a host directory into a container
lxc config device add myubuntu mydata disk \
  source=/home/$USER/projects \
  path=/home/ubuntu/projects

# Or share an entire directory
lxc config device add myubuntu sharedfolder disk \
  source=/home/$USER/shared \
  path=/shared
```

---

## LXD Snapshots

LXD supports fast Btrfs-backed container snapshots:

```bash
# Create a snapshot
lxc snapshot myubuntu snap0
lxc snapshot myubuntu before-update

# List snapshots
lxc info myubuntu | grep -A 10 Snapshots

# Restore a snapshot
lxc restore myubuntu snap0

# Delete a snapshot
lxc delete myubuntu/snap0
```

---

## Useful LXD Patterns

### Running a Web Server in Isolation

```bash
lxc launch ubuntu:24.04 webserver
lxc exec webserver -- apt update
lxc exec webserver -- apt install -y nginx
lxc exec webserver -- systemctl enable --now nginx

# Forward port 80 to host port 8080
lxc config device add webserver http proxy \
  listen=tcp:0.0.0.0:8080 \
  connect=tcp:127.0.0.1:80

# Access from host
curl http://localhost:8080
```

### Testing a New Arch Configuration

```bash
lxc launch archlinux:current testarch
lxc exec testarch -- bash

# Inside: full Arch Linux with pacman
pacman -Syu
pacman -S some-package
# Test whatever you need
exit

lxc delete testarch --force
```

### Running Multiple Database Versions

```bash
# PostgreSQL 14 in one container
lxc launch ubuntu:22.04 pg14
lxc exec pg14 -- apt install -y postgresql-14

# PostgreSQL 16 in another
lxc launch ubuntu:24.04 pg16
lxc exec pg16 -- apt install -y postgresql-16

# Both run simultaneously, fully isolated
```

---

## Resources

- [docs.shani.dev — Containers](https://docs.shani.dev/doc/software/containers) — LXC/LXD and all container runtimes reference
- [LXD documentation](https://documentation.ubuntu.com/lxd/)
- [systemd-nspawn on Shani OS](https://blog.shani.dev/post/systemd-nspawn-on-shani-os) — lighter system containers with no daemon or setup
- [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os) — dev containers with home directory sharing
- [Podman on Shani OS](https://blog.shani.dev/post/podman-containers-on-shani-os) — OCI containers and services
- [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines) — full VMs for hardware-level isolation
- [Flatpak on Shani OS](https://blog.shani.dev/post/flatpak-on-shani-os) — GUI applications
- [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os) — CLI tools and dev runtimes
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
