---
slug: shani-os-faq
title: 'Shani OS FAQ — Frequently Asked Questions'
date: '2026-05-12'
tag: 'Guide'
excerpt: 'Answers to the most common questions about Shani OS: software installation, what happens to your files after rollback, hardware compatibility, dual boot, gaming, security, and the immutable model in plain terms.'
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

Questions that come up repeatedly across the Telegram community and documentation, answered in one place.

---

## Installation & Requirements

**Does Shani OS require UEFI?**

Yes. Legacy/CSM BIOS boot is not supported. Most PCs made after 2012 have UEFI. Check your BIOS settings — if you see options like Secure Boot and UEFI boot mode, you're fine.

**Does it work on my hardware?**

Shani OS runs on any 64-bit x86 CPU (Intel or AMD) with UEFI firmware. NVIDIA, AMD, and Intel graphics all work at first boot — no post-install driver setup. The minimum is 4 GB RAM and 32 GB storage; 8 GB RAM and 64 GB are recommended. ARM (Apple Silicon, Raspberry Pi) is not supported.

**Do I need to disable Secure Boot to install?**

Yes, temporarily. Disable Secure Boot before installing, then re-enable it after installation and enroll your MOK key. Full instructions: [gen-efi and Secure Boot on Shani OS](https://blog.shani.dev/post/gen-efi-and-secure-boot).

**Can I dual boot with Windows?**

It is technically possible but not recommended — Windows may overwrite the bootloader on updates. The cleaner setup is to run Windows in a virtual machine via virt-manager (pre-installed on KDE Plasma). Your Windows install lives in the `@libvirt` subvolume and is unaffected by OS updates. Guide: [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines).

**Can I install it on a VM to try it out?**

Yes. Shani OS includes guest tools for QEMU/KVM, VirtualBox, and VMware and they activate automatically. Give the VM at least 4 GB RAM and 40 GB disk.

---

## Updates & Rollback

**How do updates work?**

Updates are applied atomically. `shani-deploy` downloads and verifies a new OS image, extracts it to the inactive slot, and sets it as the next-boot default. Your running system is never touched. If the new system has a problem, `sudo shani-deploy -r` rolls back. Full guide: [shani-os-updates](https://blog.shani.dev/post/shani-os-updates).

**How often do updates come out?**

The `stable` channel releases approximately monthly. The `latest` channel is more frequent. Check your channel: `cat /etc/shani-channel`.

**What happens to my files if I roll back?**

Nothing. Your home directory (`@home`), Flatpak apps (`@flatpak`), Nix packages (`@nix`), containers (`@containers`), and all other user data live in separate Btrfs subvolumes that are never touched by `shani-deploy`. Rolling back only changes which OS image is active — not your data.

**Can I roll back multiple times?**

Yes. Each update creates a timestamped Btrfs snapshot of the slot it replaces. `shani-deploy -r` restores from the most recent snapshot. To go further back, use `btrfs subvolume list /` to see older backup snapshots and restore manually.

**Does updating require a reboot?**

Yes. The update is staged in the background — you can continue working normally. Reboot when convenient. `shani-update` shows a notification when a reboot is ready.

**Can updates happen automatically?**

Yes. See the "Automated Updates" section in [shani-os-updates](https://blog.shani.dev/post/shani-os-updates) for systemd timer setup. This is the recommended approach for fleet deployments.

---

## Software Installation

**Can I use pacman to install packages?**

No — and you don't need to. The OS root is read-only; a `pacman -S` to the base system would be overwritten by the next OS update anyway. Software belongs in the layers designed for it. See [The Shani OS Software Ecosystem](https://blog.shani.dev/post/shani-os-software-ecosystem) for the full decision guide.

The short version: GUI apps → Flatpak. CLI tools → Nix. Anything that needs `apt`/`pacman`/`yay` → Distrobox. Services → Podman.

**Can I install from the AUR?**

Yes, via Distrobox. Create an Arch container, install yay, use the full AUR — everything works inside the container and exported binaries/apps appear on your host:

```bash
distrobox create --name arch --image archlinux:latest
distrobox enter arch
sudo pacman -S --needed base-devel git && git clone https://aur.archlinux.org/yay.git && cd yay && makepkg -si
yay -S some-aur-package
distrobox-export --bin /usr/bin/some-tool
```

**Can I add Flatpak repos other than Flathub?**

Yes. `flatpak remote-add` works normally. Flathub is pre-configured and covers the vast majority of apps.

**What if an app is only available as a .deb or .rpm?**

Install it inside a Distrobox container of the appropriate distro:

```bash
distrobox enter ubuntu-dev
sudo dpkg -i some-app.deb
distrobox-export --app some-app
```

**Does Homebrew work?**

Yes, identically to macOS. It installs to `/home/linuxbrew/.linuxbrew`, completely outside the read-only root. Guide: [Homebrew on Shani OS](https://blog.shani.dev/post/homebrew-on-shani-os).

---

## File Safety & Data

**Is my data safe during an OS update?**

Yes. `shani-deploy` only writes to the inactive OS slot (`@blue` or `@green`). It never touches `@home`, `@flatpak`, `@nix`, `@containers`, or any other user data subvolume.

**Does encryption work with the immutable model?**

Yes, and it's well-integrated. Enable LUKS2 full-disk encryption during installation (one checkbox). For passwordless unlock, enroll TPM2 with `sudo gen-efi enroll-tpm2` on first boot — the disk then unlocks silently on your own hardware. Guide: [LUKS2 Encryption on Shani OS](https://blog.shani.dev/post/shani-os-luks-after-installation).

**What if I run out of disk space?**

```bash
sudo shani-deploy -c          # remove slot backup snapshots and download cache
flatpak uninstall --unused    # remove unused Flatpak runtimes (can reclaim several GB)
podman system prune -af       # remove unused container images
nix-collect-garbage -d        # remove old Nix generations
```

---

## Security

**What is "zero telemetry"?**

No background services report hardware, software, or usage data to any server. No identifiers are generated or transmitted. `shani-deploy` makes outbound HTTP downloads to get update images — nothing more. The full codebase is at [github.com/shani8dev](https://github.com/shani8dev) for independent verification.

**Is the immutable root actually secure?**

Yes, in a meaningful way. The OS root is physically read-only at the kernel VFS layer — not a permission, not a policy. Root processes cannot write persistent backdoors to `/usr/bin` or any other system path. Malware that gains a root session has that session — it does not have persistence across reboots. Combined with six simultaneous Linux Security Modules active from first boot, the security posture is significantly stronger than a traditional mutable Linux system. Full explanation: [Security Without Configuration](https://blog.shani.dev/post/shani-os-security-deep-dive).

**Does Secure Boot actually work?**

Yes. The full Secure Boot chain is: UEFI firmware → Shim (Microsoft-signed) → systemd-boot (MOK-signed) → Unified Kernel Image (MOK-signed, contains kernel + initramfs + cmdline). The bootloader editor is disabled and the kernel cmdline is embedded in the UKI — it cannot be modified from the boot menu. Guide: [gen-efi and Secure Boot](https://blog.shani.dev/post/gen-efi-and-secure-boot).

---

## Gaming

**Does Steam work?**

Yes. The KDE Plasma edition ships Steam pre-installed and ready at first boot, with Proton enabled. Most Windows-only games in your Steam library run via Proton. Full guide: [Gaming on Shani OS](https://blog.shani.dev/post/shani-os-gaming-deep-dive).

**Does my existing Steam library survive OS updates?**

Yes. Your Steam library lives in your home directory (`@home`). It is never touched by `shani-deploy`.

**Can I run non-Steam Windows games?**

Yes. Heroic Games Launcher handles Epic Games Store and GOG. Lutris handles everything else. Bottles handles Windows apps that need more control over the Wine environment. All are pre-installed on the KDE Plasma edition.

**Does NVIDIA work for gaming?**

Yes, on both editions. NVIDIA drivers (`nvidia-open`) are pre-installed and configured. On Optimus laptops, `prime-run` and `nvidia-prime` handle GPU selection.

---

## Desktop & Daily Use

**Can I change system settings?**

Yes. `/etc` is writable via OverlayFS — your configuration changes persist in the `@data` overlay across every OS update and rollback. Run `systemctl enable`, edit `/etc/ssh/sshd_config`, modify `/etc/hosts` — everything works exactly as on any Linux system.

**Does it work offline?**

Yes. Shani OS works fully offline. The only thing that requires network access is downloading OS updates and checking for new Flatpak versions. All installed software continues to work without internet.

**Can I use multiple desktops?**

The GNOME edition ships GNOME and the KDE Plasma edition ships KDE Plasma. Both can have additional desktop environments installed via Flatpak or Distrobox for testing, though running two full DEs on the same system is generally not recommended. Switching editions is done by reinstalling.

**Does it work on a laptop?**

Yes, with specific laptop features well-supported: hibernation configured automatically at install (swapfile sized to RAM, correct offset embedded in UKI), TPM2 auto-unlock for LUKS, `power-profiles-daemon` for battery/performance profiles, SOF firmware for Intel DSP audio on newer Intel laptops. Guide: [Power Management on Shani OS](https://blog.shani.dev/post/shani-os-power-management).

---

## Community & Support

**Is Shani OS free?**

Yes, fully free and open source. No accounts, no subscriptions, no paid tiers.

**Where do I get help?**

- [Telegram community](https://t.me/shani8dev) — fastest for questions and support
- [docs.shani.dev](https://docs.shani.dev) — full technical reference
- [github.com/shani8dev](https://github.com/shani8dev) — source code and issue tracker

**Can I contribute?**

Yes. Source code, build scripts, and documentation are all public at [github.com/shani8dev](https://github.com/shani8dev). Pull requests and issue reports are welcome.

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
