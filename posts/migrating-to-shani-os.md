---
slug: migrating-to-shani-os
title: 'Migrating to Shani OS from Ubuntu, Fedora, or Arch — A Practical Guide'
date: '2026-04-19'
tag: 'Guide'
excerpt: 'A workflow-by-workflow migration guide for users coming from traditional mutable Linux distributions. Every pacman, apt, and dnf habit has a clean equivalent on Shani OS — here is the full map.'
cover: '/'
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
keywords: 'shani os, migrate linux, ubuntu to shani, fedora to shani, arch linux migration, nix, distrobox'
readTime: '9 min'
series: 'Shani OS Guides'
---

The most common question from experienced Linux users considering Shani OS is: "I know how to manage a system with pacman/apt/dnf. What do I actually do differently here?"

The honest answer is: not much changes in daily use. You still install apps, manage services, configure your system, and run development tools. The difference is that each category of software has a specific layer it belongs to — and once you understand the three-layer model, the new habits are straightforward.

This guide is a direct translation guide. Every traditional workflow maps to a Shani OS equivalent. Full reference: [docs.shani.dev](https://docs.shani.dev/doc/concepts).

---

## The Mental Model Shift

On a traditional Linux distribution, software installation means writing files into the OS root. The package manager is the single source of truth for what is installed. You manage everything — system libraries, GUI apps, CLI tools, development runtimes — through the same tool.

On Shani OS, the OS root is frozen. It is a verified, signed image. You do not write into it because doing so would undermine the entire reliability guarantee: if you can add arbitrary packages to the OS, the OS is no longer the reproducible artefact that the update pipeline verified.

Instead, three persistent layers sit alongside the OS:

1. **`@flatpak`** — for GUI desktop applications (browsers, office, media, etc.)
2. **`@nix`** — for CLI tools, development runtimes, and language toolchains
3. **`@containers`** — for full mutable Linux environments when you need them

All three survive every OS update and rollback. They are never touched by `shani-deploy`. They have their own update paths. They do not conflict with each other.

---

## Package Installation: The Full Translation Table

### GUI Applications

| Traditional | Shani OS |
|---|---|
| `sudo apt install firefox` | `flatpak install flathub org.mozilla.firefox` |
| `sudo dnf install gimp` | `flatpak install flathub org.gimp.GIMP` |
| `sudo pacman -S vlc` | `flatpak install flathub org.videolan.VLC` |
| `yay -S spotify` | `flatpak install flathub com.spotify.Client` |
| `sudo apt install code` | `flatpak install flathub com.visualstudio.code` |

Search for the Flatpak app ID at [flathub.org](https://flathub.org) or via `flatpak search <name>`. Most major GUI applications are on Flathub.

### CLI Tools and Development Runtimes

| Traditional | Shani OS |
|---|---|
| `sudo apt install nodejs` | `nix-env -iA nixpkgs.nodejs` |
| `sudo pacman -S python` | `nix-env -iA nixpkgs.python312` |
| `sudo dnf install rustup` | `nix-env -iA nixpkgs.rustup` |
| `sudo apt install ripgrep` | `nix-env -iA nixpkgs.ripgrep` |
| `sudo pacman -S kubectl` | `nix-env -iA nixpkgs.kubectl` |
| `brew install bat` | `nix-env -iA nixpkgs.bat` |
| `sudo apt install golang` | `nix-env -iA nixpkgs.go` |
| `sudo pacman -S neovim` | `nix-env -iA nixpkgs.neovim` |

Before using Nix, add a channel once:

```bash
nix-channel --add https://nixos.org/channels/nixpkgs-unstable nixpkgs
nix-channel --update
```

Then install anything from the 100,000+ packages at [search.nixos.org](https://search.nixos.org/packages):

```bash
nix-env -iA nixpkgs.package-name
```

### System-Level Software (Not Available)

Some categories of software cannot be installed into the OS root and must use alternatives:

| Traditional | Shani OS Alternative |
|---|---|
| `sudo pacman -S nvidia` | Drivers are part of the OS image; already configured at install |
| `sudo apt install linux-headers` | Kernel headers are in the OS image |
| Kernel modules via DKMS | Custom modules are not supported; use upstream drivers |
| `sudo apt install docker` | Use Podman (pre-installed, Docker-compatible) |

This is a short list. Most software that experienced Linux users install falls into the GUI apps or CLI tools categories above, both of which have direct equivalents.

---

## System Management

### System Updates

| Traditional | Shani OS |
|---|---|
| `sudo apt upgrade` | `sudo shani-deploy update` |
| `sudo pacman -Syu` | `sudo shani-deploy update` |
| `sudo dnf upgrade` | `sudo shani-deploy update` |
| Reboot to apply kernel | Reboot after `shani-deploy` |
| Roll back to previous packages | `sudo shani-deploy --rollback` (entire OS, instant) |

The critical difference: `shani-deploy update` replaces the entire OS image, not individual packages. There is no "partial update" state. Either the update applies fully and cleanly, or it does not apply at all. And if the new image causes problems, rollback takes you back to the previous complete OS state — not a partial undo.

### Service Management

Service management with `systemctl` works identically:

```bash
# All standard systemctl commands work
sudo systemctl enable sshd
sudo systemctl start nginx
sudo systemctl status nginx
sudo systemctl restart NetworkManager

# Enabling services persists via the /etc OverlayFS
# Your enabled services survive OS updates
```

### Configuration Files

Editing `/etc` files works exactly as expected. Changes are stored in the OverlayFS upper layer (`@data`) and persist across every OS update and rollback:

```bash
# Edit any /etc file normally
sudo nano /etc/ssh/sshd_config
sudo nano /etc/hostname
sudo nano /etc/hosts

# Changes to /etc persist — they are yours across updates
```

To see what you have customised (what differs from the OS defaults):

```bash
ls /data/overlay/etc/upper/
```

If an `/etc` change causes a problem, you can revert a specific file to the OS default:

```bash
sudo rm /data/overlay/etc/upper/path/to/file
# The OS default (lower OverlayFS layer) becomes active again
```

---

## Development Workflows

### Multiple Versions of the Same Tool

One of the most common pain points on traditional distributions: needing Node 18 for one project and Node 22 for another. Package managers typically only have one version of a tool installed at a time.

Nix solves this cleanly:

```bash
# Install both versions simultaneously — no conflict
nix-env -iA nixpkgs.nodejs_18
nix-env -iA nixpkgs.nodejs_22

# Per-project shell with a specific version (does not install globally)
nix-shell -p nodejs_18  # enters a shell with Node 18 on PATH
nix-shell -p nodejs_22  # separate shell with Node 22

# Reproducible project environment via shell.nix
# Place in project root — everyone running nix-shell gets identical tools
```

Full Nix guide: [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os).

### AUR Packages (Arch Users)

The AUR is not directly available on Shani OS — but the full Arch Linux experience, including `yay` and the AUR, is one command away via Distrobox:

```bash
# Create a full Arch Linux container with AUR access
distrobox create --name arch --image archlinux:latest
distrobox enter arch

# Inside: full pacman, yay, makepkg — everything works
yay -S some-aur-package

# Export a binary to your host desktop
distrobox-export --bin /usr/bin/some-tool
```

Exported binaries from Distrobox containers appear in your host PATH and app launcher. BoxBuddy (pre-installed) gives you a graphical interface for creating and entering containers.

### PPAs and Third-Party Repos (Ubuntu Users)

Third-party APT repos and PPAs are not available for the host OS, but the same approach works inside a Distrobox Ubuntu container:

```bash
distrobox create --name ubuntu-dev --image ubuntu:24.04
distrobox enter ubuntu-dev

# Inside: standard apt, add-apt-repository, PPAs — all work
sudo add-apt-repository ppa:some/ppa
sudo apt install some-package
distrobox-export --bin /usr/bin/some-package
```

---

## Filesystem Layout: What Changed

The parts of the filesystem you regularly interact with are the same. The OS root directories have different behaviour:

| Directory | Behaviour |
|---|---|
| `/home` | Fully writable, stored in `@home` — unchanged from any Linux distro |
| `/etc` | Writable via OverlayFS — your changes persist |
| `/tmp` | Writable tmpfs — cleared on reboot as usual |
| `/usr` | **Read-only** — OS files live here, you cannot modify them |
| `/bin`, `/lib`, `/sbin` | Symlinks into `/usr` — effectively read-only |
| `/var` | tmpfs — cleared on reboot; persistent state bind-mounted from `@data` |
| `/nix` | Writable by Nix — your Nix packages live here |
| `/var/lib/flatpak` | Flatpak apps — writable via `@flatpak` |

The read-only nature of `/usr` is the main thing to internalise. Anything that tries to write to `/usr/local/bin` or install files into `/usr/share` will fail. Use Nix, Flatpak, or Distrobox instead.

---

## Shell and Terminal Experience

The shell environment is configured out of the box with the tools experienced Linux users expect:

```bash
# Already installed and configured
echo $SHELL         # /usr/bin/zsh
which starship      # /usr/bin/starship (prompt)
which fzf           # /usr/bin/fzf (fuzzy finder)
which bat           # already in PATH (Nix or system)
which eza           # modern ls replacement

# McFly for smart command history (replaces Ctrl+R)
# Already integrated into the shell config
```

Your `.zshrc` and `.bashrc` in `$HOME` work exactly as expected. Shell configuration is in your home directory (`@home`), completely independent of the OS.

---

## Backup and Data Management

Before migrating, back up your existing system's data. After migrating, your home directory is your primary concern — the OS can always be reinstalled or rolled back, but your data lives in `@home`.

```bash
# restic is pre-installed — encrypted, versioned backups
restic -r s3:s3.amazonaws.com/mybucket init
restic -r s3:s3.amazonaws.com/mybucket backup ~/Documents ~/Projects ~/Pictures

# rclone is pre-installed — sync to cloud storage
rclone config  # set up Google Drive, S3, Backblaze, etc.
rclone sync ~/Documents gdrive:Backup/Documents
```

Both `restic` and `rclone` configurations persist in `/data/varlib/` and survive OS updates.

---

## The Things That Just Work

These do not require any migration thought — they work on Shani OS exactly as they do on any Linux distribution:

- SSH, GPG keys, and credential management (stored in `~/.ssh` and `~/.gnupg`)
- Docker Compose workflows (use `podman compose` or `podman-docker` drop-in)
- Git repositories and configuration
- Terminal emulators, Tmux, and screen sessions
- Python virtual environments in `~/.venv` or project directories
- Node projects in `~/projects` with `node_modules`
- Dotfiles managed by `stow`, `chezmoi`, or a bare git repo
- Any tool or script that lives in your home directory

---

## Resources

- [docs.shani.dev](https://docs.shani.dev/doc/concepts) — migration reference and key concepts
- [docs.shani.dev — Nix Package Manager](https://docs.shani.dev/doc/software/nix) — complete Nix setup guide
- [docs.shani.dev — Flatpak](https://docs.shani.dev/doc/software/flatpak) — Flatpak configuration
- [docs.shani.dev — Distrobox](https://docs.shani.dev/doc/software/distrobox) — mutable containers guide
- [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os) — detailed Nix workflow guide
- [Flatpak on Shani OS](https://blog.shani.dev/post/flatpak-on-shani-os) — full Flatpak guide
- [Telegram community](https://t.me/shani8dev) — ask migration questions

[Download Shani OS at shani.dev →](https://shani.dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
