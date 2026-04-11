---
title: 'Why Your OS Update Should Never Break Your Computer — And How Shanios Fixes This'
date: '2026-04-10'
tag: 'Engineering'
excerpt: 'Every server admin knows: you never update the live system. You update the standby, verify it, then switch. Desktops never got this lesson — until now.'
readTime: '7 min'
cover: 'https://shani.dev/assets/images/saturn-x.png'
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shanios'
author_bio: Shrinivas is cloud expert, devops engineer, creator of shanios.
author_initials: SVK
author_linkedin: https://linkedin.com/in/shrinivasvkumbhar
author_github: https://github.com/shrinivasvkumbhar
author_website: https://shani.dev
paywalled: false
---

Every system administrator knows a rule that desktop operating systems have ignored for decades: **you never touch the running system**.

When a server needs updating, you prepare the new version on a standby copy. You verify it. You test it. Then — and only then — you switch over. If something goes wrong, you switch back. The running server was never at risk.

Your laptop has never worked this way. Until Shanios.

---

## The Problem Is Architectural, Not Accidental

When Windows Update bricks a machine, it isn't a bug in the usual sense. It is the predictable result of an architecture that modifies the live operating system while you're running it. Patches are applied on top of patches. Libraries are replaced mid-session. Drivers are updated while the kernel is using them. It is genuinely surprising this works as often as it does.

Linux distributions have largely inherited the same approach. `apt upgrade`, `pacman -Syu`, `dnf update` — all of them write directly into the running root filesystem. On a well-maintained system with careful package maintainers, this is usually fine. Usually.

The problem surfaces at the edges: a kernel update that needs a reboot you postponed, a driver that conflicts with a library version that was updated independently, a dependency chain that resolves differently on your specific combination of installed packages. These aren't exotic failure modes. They're Tuesday.

The result is a class of problems that has no good solution in the traditional model: the OS is in an indeterminate state, and the only reliable fix is to reinstall.

> [!NOTE]
> This is exactly the failure mode that Shanios was designed to make impossible — not harder to hit, not easier to recover from, but structurally impossible.

---

## What the Blue-Green Model Actually Means

Shanios keeps two complete, bootable copies of the operating system on disk at all times. Call them `@blue` and `@green` — Shanios's actual names for its Btrfs subvolumes.

You boot from one. Updates are prepared on the other. The running copy is never touched.

Here is what happens when you run `sudo shani-deploy`:

1. The updater downloads the latest OS image from Shanios's CDN, verifying both SHA256 checksum and GPG signature before a single byte is written anywhere.
2. A timestamped snapshot of the standby copy is taken. This is your fallback — it exists before any changes begin.
3. The new, verified image is extracted into the standby copy via `btrfs receive`.
4. Only after successful extraction does the new copy get registered as the next boot target.
5. Your running system continues unchanged. The pending update waits until you choose to reboot.

If power is cut mid-update, your running system is intact. The deployment-pending flag tells `shani-deploy` on next run that something went wrong, and it directs you to `--rollback`.

If the new copy boots but doesn't work for you: `sudo shani-deploy --rollback`. The previous copy is restored from its snapshot and you're back.

If the new copy can't boot at all: systemd-boot's boot-counting mechanism detects the failure and reverts automatically. You may not even notice.

---

## The Read-Only Core

The blue-green model handles updates. The immutable root handles everything else.

The Shanios root filesystem is mounted read-only at runtime. Not "root can write to it" — actually, physically read-only. A process running as root cannot modify core system files during a live session. The system that passed build-time verification is the system that runs, byte for byte, until the next deliberate update.

This has a practical consequence that goes beyond update safety: malware that manages to gain root access cannot persist across a reboot to the clean OS copy. The attack surface shrinks not because of more aggressive scanning but because there is simply nothing to write to.

Your configuration still works. `/etc` is an OverlayFS mount — your changes live in a writable overlay layer on top of the read-only base. When you run `systemctl enable`, that change persists across every update and rollback. Your network config, your SSH keys, your custom services — all of it survives, stored separately from the OS images themselves.

Your home directory is in its own Btrfs subvolume, completely independent of which OS copy is running. An OS rollback has no effect on your files.

---

## Why Btrfs, and Why Send Streams

Most immutable Linux distributions use OSTree (Fedora Silverblue, Bazzite) or OCI container images (Vanilla OS) as their update mechanism. These are good approaches. Shanios makes a different choice: native Btrfs send streams.

When `shani-deploy` applies an update, it pipes the verified image directly into `btrfs receive`. The result is an exact reconstitution of the subvolume that passed build-time QA — not a reconstruction from packages, not a layer applied on top of a previous state, but the exact filesystem that was signed and shipped. What was verified is what gets written.

Btrfs also gives Shanios continuous deduplication via `beesd`. Content shared between `@blue` and `@green` is stored on disk exactly once. The dual-image architecture costs far less than double the space — and Btrfs zstd compression typically cuts the OS image size by 30–50% on top of that.

---

## Security As Architecture, Not Configuration

Security in most operating systems is a layer applied on top of the system. You install an antivirus. You configure a firewall. You enable a security module. You hope the defaults are sane.

Shanios inverts this. Six Linux Security Modules run simultaneously from first boot: AppArmor, Landlock, Lockdown, Yama, Integrity, and BPF LSM. Most Linux distributions enable one or two. The combination limits what any process — including root — can do, regardless of how it got there.

Full-disk encryption with LUKS2 and argon2id key derivation is available at install time. TPM2 auto-unlock seals the LUKS key to the hardware state — the disk unlocks automatically on your own machine, and is locked against physical removal. Secure Boot verifies the bootloader and kernel before the system starts. Intel ME kernel modules are blacklisted by default, removing the OS-level communication channel to Intel's management engine.

None of this requires configuration. It is on by default, or available with a single flag at install.

> [!TIP]
> If you install Shanios on a laptop, enable LUKS2 encryption during setup and run `sudo gen-efi enroll-tpm2` on first boot. You get full-disk encryption that unlocks automatically on your own hardware — no password at every boot.

---

## What Zero Telemetry Actually Means

"Zero telemetry" appears on a lot of marketing pages. Shanios is specific about what it means and, importantly, verifiable.

No background services report hardware, software usage, or system behaviour to any server. No identifiers are generated or transmitted. The update tool connects to download servers to fetch images — it sends only what any standard HTTP download requires, nothing more.

The entire codebase is public on GitHub. Every script that runs on your machine is readable. The GPG signing key is on public keyservers. You can verify the full chain yourself, end to end, without trusting any claim in this post or anywhere else.

This is not a privacy setting. It is not an opt-out. It is the design.

---

## The Practical Shape of a Day

A Shanios system in daily use is quiet. You get a desktop notification when a new OS image is ready — you don't need to remember to check. When you're ready, you run `sudo shani-deploy`, which takes a few minutes on a typical connection. You reboot when convenient. If anything feels off, you roll back with one command and one reboot.

Your apps — Flatpaks from Flathub, Nix packages, containers — live in their own Btrfs subvolumes, completely independent of the OS. They update on their own schedules. `flatpak update` updates your apps. `shani-deploy` updates the OS. Neither affects the other.

The worst case is: reboot to undo it.

That's a level of reliability that, until recently, was only available to server infrastructure. It runs on your laptop now.

---

## Getting Started

Shanios ships two editions: GNOME for a clean, focused desktop suitable for work and switchers from Windows or macOS; KDE Plasma for power users and gaming, with the full stack — Steam, Proton, Heroic, MangoHud, and a kernel tuned for low-latency gaming — pre-installed.

Both are free. Both are open source. Both require no account.

**System requirements:** UEFI firmware, 64-bit x86 CPU, 4 GB RAM, 32 GB storage. NVIDIA, AMD, and Intel graphics all work at first boot.

[Download Shanios at shani.dev →](https://shani.dev)

Full documentation, including the installation guide, Secure Boot enrollment, TPM2 setup, and everything else, lives at [wiki.shani.dev](https://wiki.shani.dev).

---

The architecture described here is not experimental. It runs on real hardware today, shipped in verified images, updated monthly on the stable channel. The blue-green model, the immutable root, the cryptographic verification chain — these are not aspirational. They are the defaults.

Your OS update should never break your computer. On Shanios, it structurally cannot.
