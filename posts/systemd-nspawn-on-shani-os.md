---
slug: systemd-nspawn-on-shani-os
title: 'systemd-nspawn and machinectl on Shani OS — Lightweight System Containers'
date: '2026-05-07'
tag: 'Guide'
excerpt: 'systemd-nspawn is the lightest way to run a full Linux system environment on Shani OS — no image management, no daemon, no setup. Containers boot in under a second, live in the @machines Btrfs subvolume, and survive every OS update untouched.'
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

`systemd-nspawn` is a lightweight container mechanism built directly into systemd. It runs a full Linux distribution — complete with an init system and its own namespace — without any daemon, image format, or external tooling. You point it at a directory containing a Linux root filesystem and it boots it. That is the entire setup.

On Shani OS, `systemd-nspawn` is pre-installed with no configuration needed. Container root filesystems live in the `@machines` Btrfs subvolume at `/var/lib/machines`, completely independent of the OS slots. They survive every OS update and rollback untouched.

`machinectl` is the management tool for nspawn containers and other VMs managed by systemd. It handles pulling images, starting and stopping containers, logging in, and lifecycle management.

Full reference: [docs.shani.dev — Containers](https://docs.shani.dev/doc/software/containers).

---

## nspawn vs LXD vs Distrobox vs Podman vs VMs

Choosing the right container or isolation type:

| | systemd-nspawn | LXD | Distrobox | Podman | QEMU/KVM |
|---|---|---|---|---|---|
| Purpose | Lightweight system containers | Full system containers | Dev/app containers | OCI app containers | Full VMs |
| Daemon required | No | Yes (lxd.socket) | No | No (socket-activated) | Yes |
| Image management | Manual / machinectl pull | Built-in | Automatic | Built-in | Manual |
| Full init system | Yes | Yes | No | No | Yes |
| Startup time | ~1s | ~3s | ~1s | ~0.1s | ~30s |
| Networking | Basic (host network or private) | Full bridge + NAT | Host network | Full (netavark) | Full (bridged/NAT) |
| Isolation | High | High | Low–medium | Medium | Full |

**Use systemd-nspawn when:**
- You want a full Linux system environment with minimal overhead
- You need no additional tooling — just systemd, which is already running
- You want the fastest possible full-system container (quicker than LXD)
- You are doing system-level testing, chroots with networking, or service sandboxing
- You do not need LXD's image catalog, snapshot GUI, or port forwarding features

---

## Quick Start: Arch Linux Container

```bash
# Pull an Arch Linux base image
sudo machinectl pull-tar --verify=no \
  https://geo.mirror.pkgbuild.com/images/latest/Arch-Linux-x86_64-basic.tar.zst \
  archlinux

# Start the container
sudo machinectl start archlinux

# Log in
sudo machinectl login archlinux

# List running containers
machinectl list

# Stop the container
sudo machinectl stop archlinux
```

The container root lives at `/var/lib/machines/archlinux` — a plain directory in the `@machines` subvolume. You can inspect, modify, or back it up directly.

---

## Pulling and Creating Container Images

`machinectl` can pull images from three formats:

```bash
# Pull a tar archive (most common for Linux base images)
sudo machinectl pull-tar --verify=no \
  https://geo.mirror.pkgbuild.com/images/latest/Arch-Linux-x86_64-basic.tar.zst \
  archlinux

# Pull a raw disk image
sudo machinectl pull-raw --verify=no \
  https://cloud.centos.org/centos/9-stream/x86_64/images/CentOS-Stream-Container-Base-9-latest.x86_64.tar.xz \
  centos9

# List downloaded images
machinectl list-images

# Show image details
machinectl image-status archlinux
```

You can also create a container manually by bootstrapping into a directory:

```bash
# Debian container via debootstrap
sudo debootstrap stable /var/lib/machines/debian-stable
sudo systemd-nspawn -D /var/lib/machines/debian-stable

# Arch container via pacstrap (if pacman is available)
sudo mkdir /var/lib/machines/arch-custom
sudo pacstrap -c /var/lib/machines/arch-custom base
```

---

## Starting and Managing Containers

```bash
# Start a container (runs in background as a systemd service)
sudo machinectl start archlinux

# Log in interactively
sudo machinectl login archlinux

# Run a single command without logging in
sudo machinectl shell archlinux /bin/bash -c "pacman -Syu --noconfirm"

# Or use systemd-nspawn directly for a one-off shell
sudo systemd-nspawn -D /var/lib/machines/archlinux

# List all running containers
machinectl list

# Check status of a specific container
machinectl status archlinux

# Stop a container
sudo machinectl stop archlinux

# Reboot a container
sudo machinectl reboot archlinux

# Forcibly kill
sudo machinectl kill archlinux
```

---

## Auto-Start at Boot

Containers managed by `machinectl` integrate with systemd natively. To start a container at host boot:

```bash
# Enable auto-start
sudo machinectl enable archlinux

# Disable auto-start
sudo machinectl disable archlinux
```

This creates a symlink for `systemd-nspawn@archlinux.service`. You can manage it directly with systemctl:

```bash
sudo systemctl status systemd-nspawn@archlinux.service
sudo systemctl start systemd-nspawn@archlinux.service
journalctl -u systemd-nspawn@archlinux.service
```

---

## Networking

By default, nspawn containers use the host's network namespace — the container shares the host IP and can access the internet directly.

For isolated networking with its own IP, enable private networking:

```bash
# Start with private networking (systemd creates a veth pair)
sudo systemd-nspawn --network-veth -D /var/lib/machines/archlinux

# For machinectl-managed containers, set this persistently
sudo mkdir -p /etc/systemd/nspawn
cat << 'EOF' | sudo tee /etc/systemd/nspawn/archlinux.nspawn
[Network]
Private=yes
VirtualEthernet=yes
EOF

sudo machinectl start archlinux
```

With private networking, the container gets a `ve-archlinux` interface on the host and a corresponding `host0` inside the container. The host can reach the container and vice versa; internet access requires NAT (enable IP forwarding on the host and configure `systemd-networkd` or `nftables`).

For most use cases — testing, builds, development — the default host-network mode is simplest and sufficient.

---

## Persistent Storage and Bind Mounts

```bash
# Bind a host directory into a container at startup
sudo systemd-nspawn \
  --bind=/home/$USER/projects:/projects \
  -D /var/lib/machines/archlinux

# Add to an .nspawn config for machinectl-managed containers
cat << 'EOF' | sudo tee /etc/systemd/nspawn/archlinux.nspawn
[Files]
Bind=/home/username/projects:/projects
Bind=/home/username/data:/data
EOF
```

---

## Btrfs Snapshots for Containers

Because container roots live in the `@machines` subvolume, they participate in Btrfs snapshotting naturally:

```bash
# Snapshot a container before making changes
sudo btrfs subvolume snapshot \
  /var/lib/machines/archlinux \
  /var/lib/machines/archlinux-snap-$(date +%Y%m%d)

# List snapshots
ls /var/lib/machines/

# Restore: delete current, rename snapshot
sudo machinectl stop archlinux
sudo btrfs subvolume delete /var/lib/machines/archlinux
sudo mv /var/lib/machines/archlinux-snap-20260501 /var/lib/machines/archlinux
sudo machinectl start archlinux
```

`machinectl` also has a built-in clone command:

```bash
# Clone a container
sudo machinectl clone archlinux archlinux-test

# Remove a container image
sudo machinectl remove archlinux-test
```

---

## Practical Patterns

### Isolated Build Environment

```bash
sudo machinectl start archlinux
sudo machinectl shell archlinux /bin/bash -c "
  pacman -Sy --noconfirm base-devel git
  useradd -m builder
"

# Build something in isolation
sudo systemd-nspawn \
  --bind=/home/$USER/myproject:/build \
  -D /var/lib/machines/archlinux \
  su - builder -c "cd /build && makepkg -s"
```

### Testing a System Service

```bash
sudo machinectl start archlinux
sudo machinectl shell archlinux /bin/bash -c "
  pacman -Sy --noconfirm nginx
  systemctl enable --now nginx
"
sudo machinectl status archlinux
# Container runs nginx under systemd, fully isolated from host
```

### Disposable Test Container

```bash
# Clone a base, do what you need, throw it away
sudo machinectl clone archlinux arch-test
sudo machinectl start arch-test
sudo machinectl shell arch-test /bin/bash
# ... test things ...
sudo machinectl stop arch-test
sudo machinectl remove arch-test
```

---

## nspawn vs the Full Ecosystem

systemd-nspawn is the lightest path to a full Linux system container — no daemon, no setup, no image format beyond a plain directory. Use it for isolated builds, service sandboxing, and quick system environment tests. For richer operational tooling (image catalog, port forwarding devices, snapshots via GUI), LXD adds a feature layer. For GUI apps, Flatpak. For CLI tools, Nix. For mutable dev environments with home directory sharing, Distrobox. For full hardware isolation, VMs.

[The Shani OS Software Ecosystem](https://blog.shani.dev/post/shani-os-software-ecosystem) has the complete decision guide with a flowchart and comparison table.

---

## Resources

- [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide) — when things go wrong
- [docs.shani.dev — Containers](https://docs.shani.dev/doc/software/containers) — full container runtime reference
- [LXC and LXD on Shani OS](https://blog.shani.dev/post/lxc-lxd-on-shani-os) — full system containers with more features
- [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os) — dev containers with home directory sharing
- [Podman on Shani OS](https://blog.shani.dev/post/podman-containers-on-shani-os) — OCI containers and services
- [Apptainer on Shani OS](https://blog.shani.dev/post/apptainer-on-shani-os) — HPC and cluster containers
- [Flatpak on Shani OS](https://blog.shani.dev/post/flatpak-on-shani-os) — GUI applications
- [Snap on Shani OS](https://blog.shani.dev/post/snap-on-shani-os) — Snap Store apps
- [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os) — CLI tools and dev environments
- [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines) — full VMs with hardware isolation
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
