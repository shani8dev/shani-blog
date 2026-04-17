---
slug: shani-os-architecture-deep-dive
title: 'The Architecture Behind Shani OS — Subvolumes, Slots, and the Update Pipeline'
date: '2026-04-12'
tag: 'Engineering'
excerpt: 'A detailed walkthrough of how Shani OS is structured on disk — every Btrfs subvolume, every mount, every step from image signing to your running desktop.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
readTime: '10 min'
series: 'Shani OS Deep Dives'
---

The [previous post in this series](https://blog.shani.dev/post/why-os-updates-should-never-break) explained *why* the traditional OS update model is broken and what Shani OS does differently at a conceptual level. This post goes one layer deeper: exactly how everything is structured on disk, why each decision was made, and how the pieces connect.

The full reference documentation — every subvolume, every mount option, every bind mount, the complete boot sequence — lives at [docs.shani.dev](https://docs.shani.dev). This post is the guided tour; the wiki is the reference manual.

---

## The Btrfs Layout

Shani OS's entire persistence model is built on Btrfs subvolumes. There are two partitions on disk: a 1 GB FAT32 EFI System Partition (ESP) for the bootloader and Unified Kernel Images, and one Btrfs partition that holds everything else.

```
/dev/sdX
├── EFI System Partition (FAT32, 1 GB)
│   └── shanios-blue.efi, shanios-green.efi (UKIs, MOK-signed)
└── Btrfs filesystem
    ├── @blue          ← OS slot A (read-only root)
    ├── @green         ← OS slot B (read-only root)
    ├── @data          ← /etc overlay, service state, slot tracking
    ├── @home          ← /home (user data)
    ├── @log           ← /var/log (persistent logs)
    ├── @cache         ← /var/cache
    ├── @flatpak       ← /var/lib/flatpak
    ├── @nix           ← /nix (shared across both slots)
    ├── @containers    ← /var/lib/containers (Podman)
    ├── @snapd         ← /var/lib/snapd
    ├── @waydroid      ← /var/lib/waydroid
    ├── @libvirt       ← /var/lib/libvirt (nodatacow — VM disks)
    ├── @qemu          ← /var/lib/qemu  (nodatacow — VM disks)
    ├── @machines      ← /var/lib/machines (systemd-nspawn)
    ├── @lxc / @lxd    ← LXC and LXD containers
    └── @swap          ← /swap (nodatacow — required for swapfile)
```

Image integrity is underpinned by `ostree` and `composefs`, which verify the OS subvolume contents. `squashfuse` enables read-only squashfs mounts where needed during the boot and recovery sequence.

Only `@blue` and `@green` are OS images. Every other subvolume holds data that is independent of which OS slot is running. This is the core guarantee: **an OS update or rollback touches exactly two subvolumes and nothing else**. Your home directory, your Flatpak apps, your Nix packages, your containers, and your configuration all survive every update unchanged.

---

## The Two Slots

`@blue` and `@green` are complete, independently bootable operating systems. At any given moment, exactly one is the active slot. The other is either an older version (your rollback target) or a freshly prepared update (your next boot).

The active slot is recorded in `/data/current-slot`. `shani-deploy` reads this to determine which slot to write the next update into.

Both slots are mounted read-only at runtime. The kernel enforces this — it is not a file permission or an ACL. If a process running as root attempts to write to `/usr`, the kernel refuses. The filesystem is physically read-only.

The boot entries in systemd-boot are labelled clearly:

- `shanios-blue (Active)` — the currently running slot
- `shanios-green (Candidate)` — the standby slot

After each deployment, `shani-deploy` rewrites both entries. The newly updated slot is labelled Active with `+3-0` boot-count tries set. If it fails to reach multi-user.target within three attempts, systemd-boot automatically falls back to the Candidate slot.

---

## How /etc Stays Writable

A fully read-only root creates an obvious problem: `/etc` needs to be writable. You need to configure things, enable services, manage SSH keys, and edit network settings.

Shani OS solves this with OverlayFS. At boot, three layers are assembled:

- **Lower layer**: the read-only `/etc` from the active OS slot
- **Upper layer**: a writable directory in `@data/overlay/etc/upper`
- **Work directory**: `@data/overlay/etc/work` (required by the kernel for atomic copy-up operations)

The result is mounted at `/etc`. Reads see both layers merged. Writes go to the upper layer in `@data`.

```
overlay /etc overlay rw,lowerdir=/etc,upperdir=/data/overlay/etc/upper,\
workdir=/data/overlay/etc/work,index=off,metacopy=off,\
x-systemd.requires-mounts-for=/data 0 0
```

This has an important property: when you update to a new OS slot, the lower layer changes (new OS defaults), but the upper layer in `@data` is untouched. Your customisations survive. Configuration you have never touched automatically gets the new default. Configuration you have touched is yours, until you explicitly change it.

To see what you have customised:
```bash
ls -la /data/overlay/etc/upper
```

---

## Why /var Is tmpfs

`/var` is mounted as a volatile tmpfs — it is cleared on every reboot. This is set via the `systemd.volatile=state` kernel parameter embedded in the Unified Kernel Image.

The traditional Linux assumption is that `/var` accumulates state over time: package databases, service state files, caches, lock files, runtime sockets. On an immutable OS, this creates a problem: after an OS update, the service state in `/var` may be inconsistent with the new software version's expectations.

The solution is to make `/var` transient. Critical service state that needs to survive reboots is stored in `@data` and bind-mounted back into the appropriate `/var` paths at boot. Everything else starts clean.

The bind-mounted paths include everything you would expect to persist: Wi-Fi passwords and VPN configs (`/var/lib/NetworkManager`), Bluetooth pairings, printer configuration, Tailscale keys, SSH host keys, fingerprint enrollment, TPM2 sealed objects, and more. The full list is in [Persistent Bind Mounts at docs.shani.dev](https://docs.shani.dev/doc/arch/filesystem).

This eliminates an entire class of bugs caused by accumulated cruft in `/var` across OS versions.

---

## The Update Pipeline in Full

Here is every step `shani-deploy update` runs, in order.

### 1. Fetch and Verify

```bash
# Download metadata from CDN
curl -fsSL https://cdn.shani.dev/stable/latest.json

# Download image — streamed with resume support via aria2c
# SHA256 verified inline during download
# GPG signature verified against known public key
```

Nothing is written to the OS subvolumes until both the checksum and signature verify. A corrupted or tampered image never touches your system. If the download is interrupted, it resumes from where it stopped.

### 2. Snapshot the Inactive Slot

```bash
btrfs subvolume snapshot @green @green.$(date +%Y%m%d-%H%M%S)
```

This snapshot is created before any changes to the inactive slot. If the update partially writes and something goes wrong, this snapshot is your recovery point.

### 3. Receive the New Image

```bash
btrfs receive --stream @green < verified_image.btrfs
```

`btrfs receive` reconstructs the subvolume from the send stream. The result is byte-for-byte identical to the subvolume that was snapshotted, signed, and shipped. This is not package application or a diff — it is a complete, verified reconstitution of exactly what passed build QA.

### 4. Generate the UKI

A Unified Kernel Image bundles the kernel, initramfs, and kernel command line into a single signed EFI binary. `gen-efi` generates and signs a new UKI for the updated slot:

```bash
gen-efi generate --slot green --sign-key /etc/shani/signing.key
```

The cmdline embedded in the UKI is regenerated from the live disk state — current LUKS UUID, swap offset, keyboard layout. The UKI is placed in the ESP and the bootloader is updated to set it as the next-boot default.

### 5. Boot Counting

The new entry is registered with systemd-boot's boot counting. On the first boot of the new slot, the boot count starts at 3. Each failed boot attempt decrements it. If it reaches zero, systemd-boot automatically falls back to the previous slot's UKI.

If the new slot boots successfully and a 15-second startup check passes, the boot count is marked successful and the slot becomes the permanent default.

---

## Application Isolation

**`passim`** is pre-installed and enabled. It broadcasts available firmware payloads and OS update metadata via mDNS — machines on the same LAN can fetch from each other rather than the public CDN, eliminating repeated downloads of the same image across a subnet. This is particularly useful for fleet deployments.

The `@flatpak`, `@nix`, and `@containers` subvolumes exist entirely outside the OS slots.

Updates are independent. `flatpak update` and `shani-deploy` do not interact. You can update your apps without touching the OS. An OS rollback does not roll back your applications.

Both slots share the same application data. When you boot from `@blue` or `@green`, both mount the same `@flatpak` subvolume. An app updated while running `@blue` is also updated when running `@green`. There is no duplication, no per-slot application state, and no re-downloading apps after a slot switch.

Nix is particularly well-suited to this model. Nix's store is content-addressed and immutable by design — a path in `/nix/store` always refers to exactly one thing, and it is never modified in place. The `@nix` subvolume shared between both slots is internally consistent regardless of which OS slot accesses it.

---

## The Security Stack

Shani OS enables six Linux Security Modules simultaneously at boot. Most distributions enable one (typically AppArmor or SELinux):

| Module | Function |
|---|---|
| AppArmor | Per-process capability profiles |
| Landlock | Filesystem access control for unprivileged processes |
| Lockdown | Restricts kernel features that could bypass security (integrity mode) |
| Yama | Restricts ptrace scope across process trees |
| Integrity (IMA/EVM) | Measures and enforces file integrity at runtime |
| BPF LSM | Programmable security hooks for custom eBPF policy |

The read-only root is itself a security primitive. An attacker who achieves root access during a session cannot write a persistent backdoor into `/usr/bin` — the OS is physically read-only. Persistence requires compromising the update pipeline, which requires bypassing GPG signature verification.

For the full security model: [docs.shani.dev — Security](https://docs.shani.dev/doc/security).

---

## What You Can and Cannot Customise

**You can:**
- Install any Flatpak, Snap, AppImage, or Nix package — these live outside the OS
- Run any container via Podman, Distrobox, LXC, or LXD — also outside the OS
- Edit any file in `/etc` — changes persist via OverlayFS in `@data`
- Enable/disable systemd services — changes persist via OverlayFS
- Modify `/home` freely — completely independent of the OS
- Use `virt-manager` and `libvirt` for full VMs — stored in `@libvirt`
- Run Android apps via Waydroid — state in `@waydroid`

**You cannot:**
- Install packages directly to the OS root (the root is read-only; use Flatpak, Nix, or Distrobox instead)
- Modify files in `/usr` at runtime
- Build a custom OS image without going through the `shani-deploy` pipeline

For the migration guide mapping every traditional Linux workflow to its Shani OS equivalent: [docs.shani.dev](https://docs.shani.dev/doc/concepts).

---

## Storage Efficiency

The dual-slot architecture sounds expensive on disk, but is not in practice. Btrfs Copy-on-Write shares unchanged data blocks between `@blue` and `@green`. Only changed files consume additional space — typically around 18% overhead compared to a single-image system.

On top of that, `bees` (the background deduplication daemon) continuously deduplicates shared content across all subvolumes. `shani-deploy --storage-info` and `sudo compsize /` show accurate compressed and deduplicated sizes.

Btrfs zstd compression, applied to all subvolumes except VM disk images and swap, typically reduces the OS image footprint by 30–50%.

---

## Practical Outcomes

All of this machinery produces a simple end state: updates never break a running system, rollback is always available in one command, and the security posture is strong by default.

The [2026.04.15 release](https://blog.shani.dev/post/shani-os-2026-04-15-release) is the current stable image. Full documentation: [docs.shani.dev](https://docs.shani.dev).

[Download Shani OS at shani.dev →](https://shani.dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
