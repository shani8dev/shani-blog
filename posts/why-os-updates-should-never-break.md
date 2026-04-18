---
title: 'Why Your OS Update Should Never Break Your Computer — And How Shani OS Fixes This'
slug: why-your-os-update-should-never-break-your-computer
date: '2026-04-10'
tag: 'Engineering'
cover: ''
excerpt: 'Every server admin knows: you never update the live system. You update the standby, verify it, then switch. Desktops never got this lesson — until now.'
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
readTime: '7 min'
series: 'Shani OS Deep Dives'
---

Every system administrator knows a rule that desktop operating systems have ignored for decades: **you never touch the running system**.

When a server needs updating, you prepare the new version on a standby copy. You verify it. You test it. Then — and only then — you switch over. If something goes wrong, you switch back. The running server was never at risk.

Your laptop has never worked this way. Until Shani OS.

---

## The Problem Is Architectural, Not Accidental

When Windows Update bricks a machine, it is not a bug in the usual sense. It is the predictable result of an architecture that modifies the live operating system while you are running it. Patches are applied on top of patches. Libraries are replaced mid-session. Drivers are updated while the kernel is using them.

Linux distributions have largely inherited the same approach. `apt upgrade`, `pacman -Syu`, `dnf update` — all of them write directly into the running root filesystem. On a well-maintained system with careful package maintainers, this is usually fine. Usually.

The problem surfaces at the edges: a kernel update that needs a reboot you postponed, a driver that conflicts with a library version updated independently, a dependency chain that resolves differently on your specific combination of installed packages. These are not exotic failure modes. They are Tuesday.

The result is a class of problems with no good solution in the traditional model: the OS is in an indeterminate state, and the only reliable fix is to reinstall.

> This is exactly the failure mode Shani OS was designed to make structurally impossible — not harder to hit, not easier to recover from, but impossible by architecture.

---

## What the Blue-Green Model Actually Means

Shani OS keeps two complete, bootable copies of the operating system on disk at all times. They live in Btrfs subvolumes called `@blue` and `@green`. You boot from one. Updates are prepared on the other. The running copy is never touched.

Here is what happens when you run `sudo shani-deploy`:

1. The updater checks for a newer version of itself and re-executes if one is found, preserving all state.
2. The latest OS image is downloaded, verifying both SHA256 checksum and GPG signature before a single byte is written anywhere.
3. A timestamped Btrfs snapshot of the standby copy is taken — it exists before any changes begin.
4. The new, verified image is extracted into the standby copy via `btrfs receive`.
5. A new Unified Kernel Image (UKI) is generated and signed for the updated slot via `gen-efi configure` inside a chroot.
6. Only after successful extraction and UKI generation does the bootloader update to point to the new slot.
7. Your running system continues unchanged. The pending update waits until you reboot.

If power is cut mid-update, your running system is intact. If the new copy boots but does not work for you: `sudo shani-deploy -r`. One command. One reboot. You are back.

If the new copy cannot boot at all: systemd-boot's boot-counting mechanism detects the failure after three attempts and reverts automatically. You may not even notice.

The active slot is tracked in `/data/current-slot`. `shani-update` runs automatically via a systemd timer — 15 minutes after boot and every 2 hours thereafter — and detects whether the last boot was a fallback, whether a staged update is waiting for a reboot, or whether a new version is available — prompting appropriately for each case. For full details on the update pipeline: [The Architecture Behind Shani OS](/post/shani-os-architecture-deep-dive#the-update-pipeline-in-full).

---

## The Read-Only Root

The blue-green model handles updates. The immutable root handles everything else.

The Shani OS root filesystem is mounted read-only at runtime. Not "root can write to it" — actually, physically read-only, enforced by the kernel at the VFS layer. A process running as root cannot modify core system files during a live session. The system that passed build-time verification is the system that runs, byte for byte, until the next deliberate update.

This has a practical security consequence: malware that gains root access cannot write a persistent backdoor to `/usr/bin` or any other system path. Persistence requires compromising the update pipeline — bypassing GPG signature verification. That is a much harder target than overwriting a binary.

Your configuration still works. `/etc` is an OverlayFS mount — your changes live in a writable overlay stored in the `@data` subvolume, on top of the read-only base. When you run `systemctl enable`, that change persists across every update and rollback. Your network config, SSH keys, and custom services all survive, stored separately from the OS images themselves.

For a complete explanation of the OverlayFS setup, see [The Architecture Behind Shani OS](/post/shani-os-architecture-deep-dive#how-etc-stays-writable).

---

## Why Btrfs, and Why Send Streams

Most immutable Linux distributions use OSTree (Fedora Silverblue, Bazzite) or OCI container images (Vanilla OS) as their update mechanism. These are good approaches. Shani OS makes a different choice: native Btrfs send streams.

When `shani-deploy` applies an update, it pipes the verified image directly into `btrfs receive`. The result is an exact reconstitution of the subvolume that passed build-time QA — not a reconstruction from packages, not a layer applied on top of a previous state, but the exact filesystem that was signed and shipped. What was verified is what gets written.

Btrfs also gives Shani OS continuous block-level deduplication via `bees`, which runs as a background daemon. Content shared between `@blue` and `@green` is stored on disk exactly once. The dual-image architecture costs far less than double the space — in practice around 18% overhead — and Btrfs zstd compression typically cuts the OS image size by 30–50% on top of that.

---

## Security as Architecture, Not Configuration

Security in most operating systems is a layer applied on top of the system. You install antivirus. You configure a firewall. You enable a security module. Shani OS inverts this.

Six Linux Security Modules run simultaneously from first boot: AppArmor, Landlock, Lockdown, Yama, Integrity (IMA/EVM), and BPF LSM. Most Linux distributions enable one or two. The combination means an attacker who escapes one layer faces restrictions from the remaining five.

Full-disk encryption with LUKS2 and argon2id key derivation is available at install time. TPM2 auto-unlock seals the LUKS key to the hardware state — the PCR policy is chosen automatically based on Secure Boot state (PCR 0+7 with Secure Boot enabled, PCR 0 only without). The disk unlocks automatically on your own machine and is locked against physical removal. Secure Boot verifies the bootloader and kernel before the system starts. Intel ME kernel modules are blacklisted by default.

None of this requires post-install configuration. It is on by default, or available with a single step at install.

> If you install Shani OS on a laptop, enable LUKS2 encryption during setup and run `sudo gen-efi enroll-tpm2` on first boot. You get full-disk encryption that unlocks automatically on your own hardware — no passphrase at every boot.

For setup instructions: [docs.shani.dev — TPM2 Enrollment](https://docs.shani.dev/doc/security/tpm2). For the full security model: [Security Without Configuration](/post/shani-os-security-deep-dive).

---

## What Zero Telemetry Actually Means

"Zero telemetry" appears on many marketing pages. Shani OS is specific about what it means — and it is verifiable.

No background services report hardware, software usage, or system behaviour to any server. No identifiers are generated or transmitted. The update tool connects to download servers to fetch images — it sends only what any standard HTTP download requires, nothing more.

The entire codebase is public on [github.com/shani8dev](https://github.com/shani8dev). Every script that runs on your machine is readable. You can verify the full chain yourself, end to end, without trusting any claim in this post.

---

## Installing Software on an Immutable OS

The most common question when encountering an immutable OS: if the root filesystem is read-only, how do I install anything?

You install software into the right layer for it — outside the OS, in persistent Btrfs subvolumes that survive every update and rollback untouched.

**GUI applications** go through Flatpak. Flathub has thousands of apps. `flatpak install flathub app.name` and it lives in the `@flatpak` subvolume. The Warehouse app (pre-installed on both editions) gives you a graphical front-end for browsing and managing all your Flatpaks. Full Flatpak guidance: [docs.shani.dev — Flatpak](https://docs.shani.dev/doc/software/flatpak).

**CLI tools and dev environments** have several good options. Nix comes pre-installed, with the daemon running and the `@nix` subvolume shared across both slots. Add a channel once, then install anything: `nix-env -i ripgrep`, `nix-env -i nodejs`, `nix-env -i python312`. Nix handles multiple versions without conflict. Full guide: [docs.shani.dev — Nix Package Manager](https://docs.shani.dev/doc/software/nix).

Distrobox runs a full mutable container of any Linux distro — Arch, Ubuntu, Fedora — with `pacman`, `apt`, or `dnf` fully intact. Your home directory is shared by default, and containers live in `@containers`, surviving OS updates. BoxBuddy (pre-installed) provides a GUI for managing your containers. Full guide: [docs.shani.dev — Distrobox](https://docs.shani.dev/doc/software/distrobox).

AppImages are portable self-contained executables — download and run. Gear Lever (pre-installed) integrates them into your app launcher. Homebrew can also be installed and works exactly as it does on macOS. Guide: [docs.shani.dev — AppImage](https://docs.shani.dev/doc/software/appimage).

**Snap** is available as a complement when an app is on the Snap Store but not Flathub. Snap is pre-configured — `snapd.socket` is enabled and the `@snapd` subvolume persists across every OS update and rollback. `snap install <n>` and it is there. Guide: [docs.shani.dev — Snaps](https://docs.shani.dev/doc/software/snaps).

The design principle: the OS is infrastructure, not your workspace. An `apt install` to the base system would be overwritten the next time `shani-deploy` runs anyway — the right place for software is always outside the OS.

---

## The Practical Shape of a Day

A Shani OS system in daily use is quiet. `shani-update` runs automatically via a systemd timer — 15 minutes after boot and every 2 hours thereafter — and shows a notification when a new OS image is ready. When you are ready, you run `sudo shani-deploy`, which takes a few minutes. You reboot when convenient. If anything feels off, `sudo shani-deploy -r` rolls back with one command and one reboot.

Your apps — Flatpaks, Snaps, Nix packages, containers — live in their own subvolumes, completely independent of the OS. They update on their own schedules. `flatpak update` updates your apps. `shani-deploy` updates the OS. Neither affects the other.

The worst case is: reboot to undo it. That is a level of reliability that, until recently, was only available to server infrastructure. It runs on your laptop now.

---

## Getting Started

Shani OS ships two editions: GNOME for a clean, focused desktop suitable for work and switchers; KDE Plasma for power users and gaming, with Steam, Proton, Heroic, MangoHud, and a kernel tuned for low-latency gaming — all pre-installed.

Both are free. Both are open source. Both require no account.

**System requirements:** UEFI firmware, 64-bit x86 CPU, 4 GB RAM (8 GB recommended), 32 GB storage. NVIDIA, AMD, and Intel graphics all work at first boot.

Full documentation at [docs.shani.dev](https://docs.shani.dev). For a deeper look at every subvolume and the boot sequence: [The Architecture Behind Shani OS](/post/shani-os-architecture-deep-dive). For use-case specific guidance: [Shani OS for Everyone](/post/shani-os-for-everyone).

[Download Shani OS at shani.dev →](https://shani.dev)

---

> Your OS update should never break your computer. On Shani OS, it structurally cannot.
