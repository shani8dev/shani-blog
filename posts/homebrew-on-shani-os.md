---
slug: homebrew-on-shani-os
title: 'Homebrew on Shani OS — For macOS Switchers and Those Who Prefer It'
date: '2026-04-28'
tag: 'Guide'
excerpt: 'Homebrew works on Shani OS exactly as it does on macOS — install it once, use brew install for any of the thousands of formulae. A comparison with Nix to help you choose, and how both coexist.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '5 min'
series: 'Shani OS Guides'
---

If you are coming from macOS and `brew install` is muscle memory, you do not need to abandon it on Shani OS. Homebrew installs to `/home/linuxbrew/.linuxbrew` — completely outside the read-only OS root — and works exactly as it does on macOS.

That said, Shani OS also comes with Nix pre-installed, which solves the same problem in a different and, for many workflows, more powerful way. This guide covers setting up Homebrew, explains when to use it versus Nix, and shows how both coexist without conflict.

Full reference: [docs.shani.dev — Homebrew](https://docs.shani.dev/doc/software/homebrew).

---

## Installing Homebrew

```bash
# Install Homebrew (the standard install script)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add to your PATH (Homebrew will show you the exact commands at the end of install)
# For Zsh — add to ~/.zshrc:
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"

# Reload shell
source ~/.zshrc

# Verify
brew --version
```

Homebrew installs to `/home/linuxbrew/.linuxbrew` on Linux, which is inside the `@home` subvolume. This means:
- Homebrew packages survive every OS update and rollback untouched
- Homebrew itself survives every OS update and rollback untouched
- No root required for any Homebrew operation

---

## Basic Usage

```bash
# Install a formula
brew install ripgrep
brew install node
brew install python
brew install git
brew install jq

# Install a cask (GUI apps — limited on Linux, most are macOS-only)
# brew install --cask firefox  # not available on Linux; use Flatpak instead

# Search for packages
brew search "some-tool"

# Get info about a package
brew info node

# Update Homebrew itself
brew update

# Upgrade all installed packages
brew upgrade

# Upgrade a specific package
brew upgrade node

# Uninstall a package
brew uninstall ripgrep

# List installed packages
brew list

# Check for issues
brew doctor
```

---

## Homebrew vs the Full Ecosystem

Homebrew coexists with everything else on Shani OS without conflict. Here is how they all fit together:

**Homebrew** (this guide) — familiar `brew install` for macOS switchers. Installs to `/home/linuxbrew/.linuxbrew`, completely outside the read-only root. Great for users who know the Homebrew catalogue and want continuity.

**Nix** — the recommended alternative for complex dev environments. Handles multiple versions of the same tool, per-project `shell.nix` environments, and cryptographic package pinning. More powerful than Homebrew for serious development workflows. Guide: [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os).

**Flatpak** — GUI desktop applications. Primary recommendation for any app available on Flathub. Guide: [Flatpak on Shani OS](https://blog.shani.dev/post/flatpak-on-shani-os).

**Snap** — fallback for apps only on the Snap Store. Guide: [Snap on Shani OS](https://blog.shani.dev/post/snap-on-shani-os).

**AppImage** — portable self-contained executables. Download and run; Gear Lever integrates them into your launcher. Guide: [AppImage on Shani OS](https://blog.shani.dev/post/appimage-on-shani-os).

**Distrobox** — when you need a full mutable Linux environment with `apt`, `pacman`, or `yay`. Guide: [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os).

Many macOS switchers start with Homebrew because it is familiar, then migrate specific workflows to Nix as they discover its advantages. Both can coexist indefinitely.

---

## Package Overlap with Nix

Many tools are available in both Homebrew and Nixpkgs. If you have installed the same tool in both, the one earlier in your `$PATH` takes precedence. This is usually fine, but check if you ever see unexpected behaviour:

```bash
# See which version of a tool you are using
which node
which python3
which git
```

To keep things clean, pick one tool manager for each package and stick with it.

---

## Homebrew and the Immutable Root

Homebrew on macOS writes to `/usr/local` or `/opt/homebrew`. On Linux, it writes to `/home/linuxbrew/.linuxbrew`. This is intentional — Homebrew Linux adopted a home-directory prefix precisely because many Linux systems (including immutable ones) do not allow writes to `/usr/local`.

This means `brew install` works on Shani OS exactly as it does on macOS, with no workarounds or special configuration.

---

## Keeping Homebrew Updated

```bash
# Update Homebrew's package database
brew update

# Upgrade all packages
brew upgrade

# See what is outdated
brew outdated

# Remove old versions of packages (saves disk space)
brew cleanup

# Remove all cached downloads
brew cleanup --prune=all
```

Homebrew does not have automatic updates by default. Consider adding a cron job or alias:

```bash
# Add to ~/.zshrc for a reminder
alias brewup='brew update && brew upgrade && brew cleanup'
```

---

## Resources

- [docs.shani.dev — Homebrew](https://docs.shani.dev/doc/software/homebrew) — full reference
- [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os) — the recommended alternative for complex dev environments
- [Flatpak on Shani OS](https://blog.shani.dev/post/flatpak-on-shani-os) — GUI applications
- [Snap on Shani OS](https://blog.shani.dev/post/snap-on-shani-os) — Snap Store apps
- [AppImage on Shani OS](https://blog.shani.dev/post/appimage-on-shani-os) — portable apps
- [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os) — full mutable Linux environments
- [Migrating to Shani OS](https://blog.shani.dev/post/migrating-to-shani-os) — full workflow translation guide
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
