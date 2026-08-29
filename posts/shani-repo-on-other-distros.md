---
title: "Use Shanios Tools on Any Arch-Based Distro"
date: 2026-08-25
author: Shrinivas Kumbhar
author_bio: Creator of Shanios. Building immutable Linux distributions.
author_initials: SK
author_linkedin: shrinivaskumbhar
author_github: shrinivasvkumbhar
author_website: https://shani.dev
tag: Guide
series: Shani OS Guides
slug: shani-repo-on-other-distros
cover: /assets/images/blog/shani-repo-on-other-distros.webp
category: Guide
readTime: "4 min"
---

Shanios builds tools that are useful beyond its own filesystem layout. `gen-efi` generates Secure Boot UKIs for any Arch system. `shani-health` audits any running machine. `shani-tools` manages Btrfs snapshots and deduplication. These packages live in the `[shani]` pacman repository — and any Arch-based distro can use them.

---

## Adding the Repository

Edit `/etc/pacman.conf` and add:

```ini
[shani]
Server = https://repo.shani.dev/$arch
```

## Trusting the Key

Packages are signed with the Shanios GPG key. Import and trust it:

```bash
sudo pacman-key --recv-key 7B927BFFD4A9EAAA8B666B77DE217F3DA8014792 --keyserver keys.openpgp.org
sudo pacman-key --lsign-key 7B927BFFD4A9EAAA8B666B77DE217F3DA8014792
```

## Installing

```bash
sudo pacman -S shani-keyring   # required first — provides trust chain
sudo pacman -S gen-efi          # Secure Boot UKI generation
sudo pacman -S shani-health     # system diagnostics
sudo pacman -S shani-tools      # maintenance utilities
```

---

## What Each Package Does

### `gen-efi`

Generates Unified Kernel Images (UKIs) for UEFI Secure Boot. Works on any Arch-based system with a Btrfs root:

```bash
sudo gen-efi configure    # auto-detect and configure Secure Boot
sudo gen-efi enroll-mok   # enroll Machine Owner Key
```

If your system uses dracut and systemd-boot, `gen-efi` replaces the manual `objcopy` + `sb-sign` workflow with a single command.

### `shani-health`

Read-only system diagnostics — no side effects, no configuration changes:

```bash
shani-health              # full report
shani-health --security   # security audit only
shani-health --boot       # boot chain analysis
shani-health --verify     # deep integrity check
shani-health --json       # machine-readable output
```

Covers boot slots, Btrfs health, filesystem integrity, firewall status, failed services, kernel logs, and more.

### `shani-tools`

System maintenance utilities:

- Btrfs snapshot management
- Transparent deduplication via `duperemove`
- Disk usage analysis
- Snapshot cleanup and rotation

### `shani-keyring`

The signing trust root — required to install any other `[shani]` package. Ships the GPG key, trust level, and revocation files to `/usr/share/pacman/keyrings/`.

---

## What Will NOT Work

Packages like `shani-deploy` and `shani-core` depend on the Shanios filesystem layout (Btrfs blue-green slots, `/usr/abin` safety wrappers, specific systemd units). They will install on a standard Arch system but will not function correctly.

The packages that work on any Arch-based distro are: `gen-efi`, `shani-health`, `shani-tools`, `shani-keyring`, and `shim-signed`.

---

## Repository Details

- **URL:** `https://repo.shani.dev/$arch`
- **Signing:** GPG key `7B927BFFD4A9EAAA8B666B77DE217F3DA8014792`
- **Channels:** `latest` (rolling) and `stable` (pinned)
- **Source:** [github.com/shani8dev/shani-repo](https://github.com/shani8dev/shani-repo)

See the [full documentation](https://docs.shani.dev/doc/software/shani-repo) for repository structure and enterprise integration.

---

## Resources

- [shani-health Reference](https://shani.dev/post/shani-health-reference) — every flag explained
- [gen-efi and Secure Boot](https://shani.dev/post/gen-efi-and-secure-boot) — complete UKI setup guide
- [Btrfs Snapshots and Backup](https://shani.dev/post/shani-os-btrfs-snapshots-and-backup) — snapshot strategy guide
- [Keyring & Signing](https://docs.shani.dev/doc/security/keyring) — trust model documentation
- [shani-repo source](https://github.com/shani8dev/shani-repo) — repository hosting
