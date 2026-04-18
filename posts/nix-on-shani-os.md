---
slug: nix-on-shani-os
title: 'Nix on Shani OS — The Best Package Manager for an Immutable System'
date: '2026-04-09'
tag: 'Guide'
excerpt: 'Why Nix and immutable Linux are a natural match, how to set it up on Shani OS in five minutes, and practical workflows for developers, researchers, and power users.'
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

Nix and immutable Linux were made for each other. Nix's core property — packages are identified by a cryptographic hash of everything that went into building them, stored in an append-only content-addressed store, never modified in place — is exactly what an immutable OS wants in a package manager. Nothing in `/nix/store` is ever overwritten. Multiple versions of the same package coexist without conflict. A package installed yesterday is still there, byte for byte, regardless of what else you install or remove.

On Shani OS, this works especially well because the `@nix` Btrfs subvolume is shared between both OS slots. Packages installed while running `@blue` are equally available when you boot `@green` after an update. Nix packages survive OS updates and rollbacks completely untouched.

This post covers the practical setup and day-to-day use of Nix on Shani OS. Full reference: [docs.shani.dev — Nix Package Manager](https://docs.shani.dev/doc/software/nix).

---

## Setup (Five Minutes)

Nix is pre-installed on Shani OS. The `nix-daemon.socket` is enabled at boot and the `@nix` subvolume is ready. The only step required before installing packages is adding a channel:

```bash
nix-channel --add https://nixos.org/channels/nixpkgs-unstable nixpkgs
nix-channel --update
```

That is it. After this, `nix-env -i <package>` installs any package from [Nixpkgs](https://search.nixos.org/packages) — currently over 100,000 packages.

---

## Installing Packages

```bash
# Search for packages
nix-env -qaP | grep nodejs

# Install by attribute path (more precise)
nix-env -iA nixpkgs.nodejs_22
nix-env -iA nixpkgs.rustup
nix-env -iA nixpkgs.python312

# Install by name (less precise, installs first match)
nix-env -i ripgrep
nix-env -i fd
nix-env -i bat
nix-env -i htop
nix-env -i gh       # GitHub CLI

# Install multiple at once
nix-env -i ripgrep fd bat eza fzf
```

Installed packages are added to `~/.nix-profile/bin` which is on your `$PATH`. They are available immediately after installation in a new shell.

---

## Why Multiple Versions Work

Nix does not install packages to `/usr/local/bin`. It installs them to `/nix/store/<hash>-<name>-<version>/` — where `<hash>` is a cryptographic hash of the entire build closure (all inputs, dependencies, build flags, patches). Two different versions of Node.js have different hashes and live in different directories. They can coexist without any path conflict.

Your active profile (`~/.nix-profile`) is a symlink tree pointing to whichever versions you have selected. Switching between versions is changing which symlinks the profile contains.

```bash
# Install Node 18 and Node 22 simultaneously
nix-env -iA nixpkgs.nodejs_18
nix-env -iA nixpkgs.nodejs_22

# See all installed packages and which version is active
nix-env -q
```

For per-project version management, `nix-shell` is the right tool — see below.

---

## Per-Project Environments with nix-shell

`nix-shell` starts a shell with exactly the packages you specify, without installing them to your profile. When you exit the shell, your environment is unchanged.

```bash
# A shell with Node 18 and yarn — for one project
nix-shell -p nodejs_18 yarn

# A Python 3.11 data science environment
nix-shell -p python311 python311Packages.numpy python311Packages.pandas jupyter

# Rust development environment
nix-shell -p rustup gcc
```

For reproducible project environments, create a `shell.nix` in your project directory:

```nix
# shell.nix
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_22
    yarn
    typescript
    nodePackages.eslint
  ];

  shellHook = ''
    echo "Node $(node --version), Yarn $(yarn --version)"
  '';
}
```

Then run `nix-shell` from the project directory. Anyone with Nix installed gets the exact same environment, regardless of what they have globally installed.

---

## Rollback

Every `nix-env` operation creates a new profile generation. You can roll back any operation:

```bash
# List all generations
nix-env --list-generations

# Roll back one step
nix-env --rollback

# Roll back to a specific generation
nix-env --switch-generation 12

# Undo the last install (same as rollback)
nix-env -e <package>  # just uninstall it
```

This rollback is independent of Shani OS's `shani-deploy --rollback`. OS rollback and Nix rollback are separate concerns: OS rollback switches the entire system image; Nix rollback changes which packages are in your profile. Neither affects the other.

---

## Nix and the @nix Subvolume

On Shani OS, `/nix` is mounted from the `@nix` Btrfs subvolume, which is shared between `@blue` and `@green`. This has an important consequence: the Nix store is the same regardless of which OS slot you are running.

When you perform an OS update with `shani-deploy`, the active slot changes. The `@nix` subvolume does not change. Your installed packages are immediately available in the new slot without reinstalling anything.

When you perform an OS rollback with `shani-deploy --rollback`, same thing — `@nix` is untouched.

Btrfs deduplication via `bees` also benefits the Nix store. The Nix store intentionally shares build outputs across packages via hardlinks; `bees` additionally deduplicates at the block level. The result is an efficient store even with many packages and versions installed.

```bash
# Check Nix store size
sudo compsize /nix

# Check disk usage
du -sh ~/.nix-profile /nix/store
nix-store --optimise  # run manual store optimisation
```

---

## Keeping Nix Packages Updated

```bash
# Update the channel index
nix-channel --update

# Upgrade all installed packages to latest versions
nix-env -u '*'

# Upgrade a specific package
nix-env -u nodejs_22

# See what would be upgraded without doing it
nix-env -u '*' --dry-run
```

Unlike `pacman -Syu` on a traditional system, `nix-env -u` does not touch the OS. It only updates packages in your profile. If an update breaks something, `nix-env --rollback` undoes it.

---

## Garbage Collection

Nix never deletes a package until you explicitly run the garbage collector. Old generations and unreferenced packages accumulate in `/nix/store`.

```bash
# Delete all old generations (keeps current)
nix-env --delete-generations old

# Delete generations older than 30 days
nix-env --delete-generations 30d

# Run the garbage collector (removes anything not referenced by a live generation)
nix-store --gc

# Combined: clean up old generations and collect garbage
nix-collect-garbage -d
```

A periodic `nix-collect-garbage -d` in a cron job or systemd timer keeps the store size manageable.

---

## Practical Examples

### Setting up a Go development environment

```bash
nix-env -iA nixpkgs.go nixpkgs.gopls nixpkgs.golangci-lint
# go, gofmt, gopls, and the linter are available immediately
```

### Setting up Rust

```bash
nix-env -iA nixpkgs.rustup
rustup toolchain install stable
rustup component add rust-analyzer
```

### Data science and ML

```bash
nix-shell -p python312 python312Packages.numpy python312Packages.pandas \
    python312Packages.scikit-learn python312Packages.matplotlib jupyter
```

### DevOps tools

```bash
nix-env -iA nixpkgs.kubectl nixpkgs.helm nixpkgs.terraform \
    nixpkgs.awscli2 nixpkgs.google-cloud-sdk
```

### The Full Ecosystem

For packages not in Nixpkgs, or for specific workflows, the other layers on Shani OS fill the gaps:

**Distrobox** — for anything requiring a full mutable Linux environment (building AUR packages, running tools that expect a traditional `/usr` layout, legacy software with complex system deps):

```bash
distrobox create --name dev --image archlinux:latest
distrobox enter dev
# Full pacman, yay, anything
```

Distrobox containers live in `@containers` and survive OS updates. Guide: [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os).

**Flatpak** — for GUI desktop applications. Flathub has thousands of apps, auto-updates, and sandbox permission management via Flatseal. Guide: [Flatpak on Shani OS](https://blog.shani.dev/post/flatpak-on-shani-os).

**Snap** — when an app is only on the Snap Store and not Flathub or Nixpkgs. Pre-configured with its own `@snapd` subvolume. Guide: [Snap on Shani OS](https://blog.shani.dev/post/snap-on-shani-os).

**AppImage** — portable self-contained executables for one-off tools or latest beta versions. Gear Lever (pre-installed) integrates them into your launcher. Guide: [AppImage on Shani OS](https://blog.shani.dev/post/appimage-on-shani-os).

**Podman** — OCI containers for services and databases. Docker-compatible, rootless. Guide: [Podman on Shani OS](https://blog.shani.dev/post/podman-containers-on-shani-os).

**Homebrew** — if you are coming from macOS and `brew install` is muscle memory, it works identically on Shani OS, installing to `/home/linuxbrew/.linuxbrew` outside the read-only root. See [Homebrew on Shani OS](https://blog.shani.dev/post/homebrew-on-shani-os).

---

## Resources

- [Nixpkgs search](https://search.nixos.org/packages) — search all 100,000+ packages
- [Nix Pills](https://nixos.org/guides/nix-pills/) — the canonical learning resource for Nix fundamentals
- [docs.shani.dev — Nix Package Manager](https://docs.shani.dev/doc/software/nix) — Shani OS-specific setup and configuration
- [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os) — when you need a full distro package manager
- [Flatpak on Shani OS](https://blog.shani.dev/post/flatpak-on-shani-os) — GUI applications
- [Snap on Shani OS](https://blog.shani.dev/post/snap-on-shani-os) — Snap Store apps
- [AppImage on Shani OS](https://blog.shani.dev/post/appimage-on-shani-os) — portable apps
- [Homebrew on Shani OS](https://blog.shani.dev/post/homebrew-on-shani-os) — brew for macOS switchers

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
