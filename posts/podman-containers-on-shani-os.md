---
slug: podman-containers-on-shani-os
title: 'Podman and Containers on Shani OS — Rootless, Docker-Compatible, Ready at Boot'
date: '2026-04-21'
tag: 'Guide'
excerpt: 'How to use Podman on Shani OS for rootless containers, Docker Compose workflows, and containerised services — with the Pods GUI, persistent storage in @containers, and full compatibility with the Docker ecosystem.'
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

Podman is a container engine that is fully compatible with Docker's CLI and image ecosystem but does not require a root-privileged daemon. On Shani OS, `podman.socket` is enabled at first boot — containers are ready to run immediately without any setup.

Because Shani OS's root filesystem is read-only, Podman is the natural home for any service or database that needs to run persistently: databases, development servers, web services, self-hosted tools. Containers live in the `@containers` Btrfs subvolume, completely independent of the OS, surviving every update and rollback untouched.

The **Pods** app (pre-installed on both editions) gives you a graphical interface for managing containers, images, volumes, and networks. The `podman-docker` drop-in package (pre-installed) means existing `docker` commands work as-is.

Full reference: [docs.shani.dev — Containers](https://docs.shani.dev/doc/software/containers).

---

## Why Rootless Containers Matter

The key difference between Podman and Docker's traditional setup: Podman runs containers as your normal user by default. No root daemon listening on a socket. No `sudo docker`. No potential for a container breakout to compromise the host as root.

On an immutable OS, this fits naturally. Your running containers do not need root to exist. If a container is compromised, the blast radius is limited to your user session — not the entire system.

For operations that need elevated access (binding to ports below 1024, accessing hardware devices), Podman supports rootful mode as well.

---

## Basic Usage

Podman's CLI is identical to Docker's for all common operations:

```bash
# Pull an image
podman pull nginx
podman pull postgres:16
podman pull redis:latest

# Run a container
podman run -d --name webserver -p 8080:80 nginx

# List running containers
podman ps

# List all containers (including stopped)
podman ps -a

# View logs
podman logs webserver
podman logs -f webserver   # follow

# Stop and remove
podman stop webserver
podman rm webserver

# Execute a command in a running container
podman exec -it webserver bash

# View images
podman images

# Remove an image
podman rmi nginx
```

---

## Using the docker Drop-In

The `podman-docker` package is pre-installed. It provides a `/usr/bin/docker` wrapper that calls Podman. Existing scripts and tools that call `docker` work without modification:

```bash
docker run -d nginx
docker ps
docker compose up -d    # podman-compose handles this
```

`DOCKER_HOST` and Docker socket emulation are also available for tools that use the Docker API directly:

```bash
# Enable the Podman socket for Docker API compatibility
systemctl --user start podman.socket

# Set DOCKER_HOST for tools that need it
export DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock
```

---

## Common Services

### PostgreSQL

```bash
# Create a persistent volume for data
podman volume create postgres-data

# Run PostgreSQL
podman run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=mydb \
  -v postgres-data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:16

# Connect with psql
podman exec -it postgres psql -U postgres -d mydb

# Auto-start on login (systemd user service)
podman generate systemd --name postgres --new --files
mkdir -p ~/.config/systemd/user
mv container-postgres.service ~/.config/systemd/user/
systemctl --user enable --now container-postgres.service
```

### Redis

```bash
podman run -d \
  --name redis \
  -p 6379:6379 \
  redis:latest

# Test it
podman exec -it redis redis-cli ping
```

### A Self-Hosted Service (e.g. Gitea)

```bash
podman volume create gitea-data

podman run -d \
  --name gitea \
  -p 3000:3000 \
  -p 222:22 \
  -v gitea-data:/data \
  gitea/gitea:latest

# Access at http://localhost:3000
```

---

## Docker Compose Workflows

`podman-compose` is pre-installed and handles standard `docker-compose.yml` files:

```bash
# Use an existing Docker Compose file
podman-compose up -d
podman-compose down
podman-compose logs -f

# Or use the docker compose drop-in
docker compose up -d
```

Example `docker-compose.yml` for a typical web stack:

```yaml
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: appdb
    volumes:
      - db-data:/var/lib/postgresql/data

  cache:
    image: redis:7-alpine

volumes:
  db-data:
```

```bash
podman-compose up -d
podman-compose ps
```

---

## Persistent Storage with Volumes

Podman volumes are stored in `~/.local/share/containers/storage/volumes/` (rootless) and survive container removal:

```bash
# Create a named volume
podman volume create mydata

# Inspect it
podman volume inspect mydata

# Use it in a container
podman run -v mydata:/app/data myimage

# List all volumes
podman volume ls

# Remove a volume
podman volume rm mydata

# Remove all unused volumes
podman volume prune
```

Bind mounts also work for sharing specific host directories:

```bash
# Mount a host directory
podman run -v ~/projects/myapp:/app -p 3000:3000 node:22 node server.js
```

---

## Auto-Starting Containers at Login

Podman integrates with systemd's user session for per-user auto-start. Generate a systemd unit from a running container:

```bash
# Generate systemd unit for a container
podman generate systemd --name mycontainer --new --files

# Move to user systemd directory
mkdir -p ~/.config/systemd/user
mv container-mycontainer.service ~/.config/systemd/user/

# Enable and start
systemctl --user enable --now container-mycontainer.service

# Check status
systemctl --user status container-mycontainer.service
```

The `--new` flag means the container is created fresh each time the service starts (from the image), rather than restarting a stopped container. Remove `--new` to restart an existing named container instead.

For system-wide auto-start (all users), use the root Podman socket:

```bash
sudo podman run ...
sudo podman generate systemd --name mycontainer --new --files
sudo mv container-mycontainer.service /etc/systemd/system/
sudo systemctl enable --now container-mycontainer.service
```

---

## Building Container Images

`buildah` is pre-installed alongside Podman for building OCI images without a daemon. `skopeo` is also pre-installed for inspecting and copying images between registries without pulling them. `catatonit` serves as the init process inside containers (PID 1 reaping). Networking uses `netavark` + `aardvark-dns` — Podman's modern network stack replacing the older CNI plugins.

```bash
# Build from a Dockerfile
podman build -t myapp:latest .
# or with buildah directly
buildah build -t myapp:latest .

# Multi-stage build
podman build --target production -t myapp:prod .

# Push to a registry
podman login registry.example.com
podman push myapp:latest registry.example.com/myapp:latest
```

```bash
# Inspect an image without pulling
skopeo inspect docker://nginx:latest

# Copy an image between registries
skopeo copy docker://docker.io/nginx:latest docker://myregistry.example.com/nginx:latest
```

---

## The Pods GUI

Pods is pre-installed on both editions. Open it from your application launcher.

Pods shows you:
- All running and stopped containers with their status
- Image library with size information
- Volume management
- Per-container logs, stats, and terminal access
- Start, stop, pause, and remove containers with a click
- Pull new images from any registry

For most container management tasks, Pods removes the need to open a terminal.

---

## Podman vs Docker: What Changes

If you are migrating from Docker workflows:

| Docker | Podman |
|---|---|
| `docker run` | `podman run` (identical syntax) |
| `docker compose up` | `podman-compose up` or `docker compose up` |
| `docker build` | `podman build` or `buildah build` |
| Daemon required | No daemon — socket activated |
| Root by default | Rootless by default |
| `/var/run/docker.sock` | `/run/user/$UID/podman/podman.sock` |
| `docker.io` default registry | `docker.io` default registry |

The main workflow difference is that Podman does not keep a persistent daemon. Containers start as direct child processes of your shell or systemd. For persistent services, use systemd user units (see above).

---

## Storage Efficiency

Container images and layers live in `@containers`. Podman uses content-addressed storage, so layers shared between images are stored only once. Btrfs zstd compression and the `bees` deduplication daemon apply at the block level on top of Podman's own layer sharing.

To see disk usage:

```bash
# Podman's view
podman system df

# Btrfs compressed view
sudo compsize /var/lib/containers

# Clean up everything unused
podman system prune -af --volumes
```

---

## Podman vs the Full Container and App Ecosystem

Podman is one of several container and app options on Shani OS. Here is where each one fits:

**Podman** (this guide) — OCI containers for services, databases, and development workflows. Rootless, Docker-compatible, daemon-free. Persistent data lives in `@containers`.

**Distrobox** — a layer on top of Podman that provides a mutable Linux environment with home directory sharing. For `apt install`, `pacman -S`, AUR access, and tools that need a traditional filesystem layout. Guide: [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os).

**LXC/LXD** — full Linux system containers with their own init system and network stack. For isolated server environments and multi-service setups lighter than a full VM. Guide: [LXC and LXD on Shani OS](https://blog.shani.dev/post/lxc-lxd-on-shani-os).

**systemd-nspawn** — the lightest full-system containers. No daemon, no setup — pull a tarball and boot it. Best for isolated builds and quick system environment tests. Guide: [systemd-nspawn on Shani OS](https://blog.shani.dev/post/systemd-nspawn-on-shani-os).

**Flatpak / Snap / AppImage** — for GUI desktop applications and portable tools. Not containers in the traditional sense, but each lives in its own persistent Btrfs subvolume. Guides: [Flatpak](https://blog.shani.dev/post/flatpak-on-shani-os) · [Snap](https://blog.shani.dev/post/snap-on-shani-os) · [AppImage](https://blog.shani.dev/post/appimage-on-shani-os).

**Virtual Machines** — when you need full hardware-level isolation: a separate kernel, a Windows VM, or GPU passthrough. Heavier than any container option but provides complete isolation. virt-manager is pre-installed on the KDE Plasma edition. Guide: [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines).

---

## Resources

- [docs.shani.dev — Containers](https://docs.shani.dev/doc/software/containers) — full Podman and container reference
- [docs.shani.dev — Distrobox](https://docs.shani.dev/doc/software/distrobox) — mutable dev containers with full distro package managers
- [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os) — using apt, pacman, yay inside Shani OS
- [LXC and LXD on Shani OS](https://blog.shani.dev/post/lxc-lxd-on-shani-os) — full system containers
- [systemd-nspawn on Shani OS](https://blog.shani.dev/post/systemd-nspawn-on-shani-os) — lightweight system containers
- [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines) — full VMs with hardware isolation
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
