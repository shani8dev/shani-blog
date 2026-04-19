---
slug: shani-os-security-deep-dive
title: 'Security Without Configuration — How Shani OS Protects You by Default'
date: '2026-04-14'
tag: 'Security'
excerpt: 'Six Linux Security Modules running simultaneously, an immutable root that survives root access, TPM2-sealed encryption, and zero telemetry. Here is exactly how each layer works and why it is on by default.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '9 min'
series: 'Shani OS Deep Dives'
---

Most operating systems treat security as a layer applied on top of the system. You install antivirus. You configure a firewall. You enable a security module. You read a hardening guide and spend a weekend implementing it.

Shani OS takes the opposite approach. The security posture is the architecture — it comes from how the system is built, not from what you configure on top of it. Most of it is active from first boot without requiring you to do anything.

This post explains precisely what is running and why. For setup instructions, the full reference is at [docs.shani.dev — Security](https://docs.shani.dev/doc/security).

---

## The Read-Only Root as a Security Primitive

The most fundamental security property of Shani OS is one that most security tools try to replicate and fail: the OS root filesystem is physically read-only.

This is not AppArmor. It is not a file permission. It is not a DAC/MAC policy. The kernel mounts the root filesystem with the read-only flag, enforced at the VFS layer. A process running as root — whether a user who ran `sudo bash` or malware that successfully escalated privileges — cannot write to `/usr/bin`, `/lib`, `/etc/systemd/system`, or any other system path.

The practical consequence is significant. Most persistent malware works by writing a backdoor to a system path that survives reboot. On Shani OS, there is nowhere to write it. The system that passed build-time GPG verification is the system that runs, byte for byte, until the next deliberate update via `shani-deploy`. An attacker who compromises a running session has a session — they do not have persistence.

The `/etc` OverlayFS (your configuration changes) and the `@data` subvolume (service state, bind mounts) are writable, but they are user-visible and auditable. The OS binaries are not.

---

## Six Linux Security Modules

The kernel parameter `lsm=landlock,lockdown,yama,integrity,apparmor,bpf` is embedded in every Shani OS Unified Kernel Image. Most Linux distributions enable one or two LSMs. Shani OS enables all six simultaneously.

**AppArmor** provides per-process capability profiles. The kernel enforces what each process is allowed to do — which files it can read or write, which capabilities it can use, which network operations it can perform — based on a policy profile. Snap packages are automatically confined via `snapd.apparmor.service`. Custom AppArmor profiles for system services are loaded at boot.

**Landlock** is filesystem access control for unprivileged processes. Unlike AppArmor (which requires a privileged administrator to write and load profiles), Landlock allows processes to restrict their own filesystem access. Applications that use the Landlock API voluntarily can limit what parts of the filesystem they can reach — without requiring root to write a policy for them. Combined with AppArmor, this gives layered filesystem sandboxing that works both top-down and bottom-up.

**Lockdown** restricts kernel features that would allow even a root process to bypass security. In integrity mode, it blocks: loading unsigned kernel modules, direct memory access via `/dev/mem` and `/dev/kmem`, PCI BAR access, and other operations that would let a compromised root process tamper with the kernel itself. Lockdown is what prevents a root process from using low-level hardware access to escape the other LSMs.

**Yama** restricts ptrace scope. By default, any process can attach a debugger to any other process owned by the same user. Yama narrows this: a process can only be ptraced by its own children or explicitly permitted processes. This blocks a class of attacks where malware injects into another process in the same user session to steal credentials or escalate privileges.

**Integrity (IMA/EVM)** measures file integrity at runtime. IMA (Integrity Measurement Architecture) computes and records cryptographic hashes of files as they are executed or opened. EVM (Extended Verification Module) protects file metadata (ownership, permissions, xattrs) using HMAC. Together, they provide a runtime audit trail and policy enforcement that can detect tampered files even in the writable parts of the filesystem.

**BPF LSM** allows custom eBPF programs to implement security policy hooks at the kernel level. It is the programmable layer in the stack — security decisions that cannot be expressed as static AppArmor profiles can be implemented as eBPF programs attached to LSM hooks. Podman and other container runtimes use BPF LSM hooks for container isolation.

**Audit daemon** (`auditd`) logs kernel security events — system calls, file access, authentication events — to a persistent audit trail. Useful for compliance requirements and forensic investigation.

**verdict** handles network and policy decision logging and enforcement, complementing the LSM stack for network-level policy decisions.

The combination of all six means that even if an attacker escapes one layer, they face restrictions from the remaining five. Defence in depth at the kernel level.

---

## Full-Disk Encryption with LUKS2 and TPM2

LUKS2 full-disk encryption is available at install time with a single toggle. The Btrfs root partition is wrapped in a LUKS2 container with argon2id key derivation — a memory-hard KDF that makes brute-force attacks significantly more expensive than with older PBKDF2-based setups.

The real-world setup that Shani OS makes easy is TPM2 auto-unlock. After enabling encryption at install, a single command on first boot seals the LUKS key into the TPM2 chip. The PCR policy is chosen automatically based on Secure Boot state: PCR 0+7 when Secure Boot is enabled (firmware measurements + Secure Boot certificate state), or PCR 0 only when disabled. The disk unlocks silently on your own hardware. Move the disk to another machine, tamper with the firmware, or change the kernel signature — the TPM won't release the key.

The result is full-disk encryption that is genuinely transparent to you and genuinely opaque to an attacker with physical access. Re-enrollment is required after firmware updates or Secure Boot changes. Full setup and re-enrollment commands: [gen-efi and Secure Boot on Shani OS](https://blog.shani.dev/post/gen-efi-and-secure-boot) · [LUKS2 Encryption on Shani OS](https://blog.shani.dev/post/shani-os-luks-after-installation).

---

## Secure Boot

Shani OS uses Shim for Secure Boot — the same mechanism used by most mainstream Linux distributions. The boot chain is:

```
UEFI Firmware (verifies Shim via Microsoft CA)
  → Shim (verifies systemd-boot via MOK)
    → systemd-boot (verifies the UKI via MOK)
      → Unified Kernel Image (kernel + initramfs + cmdline)
```

Every element in the chain is verified before the next one executes. The MOK (Machine Owner Key) is generated during installation and enrolled into the UEFI firmware. Every UKI that `gen-efi` generates is signed with this key. An attacker who modifies the kernel or bootloader will produce a binary that fails Secure Boot verification before the system starts.

The bootloader editor is disabled. The kernel command line is embedded in the UKI at build time and cannot be modified from the boot menu. This prevents the attack of adding `init=/bin/bash` or `single` to the kernel cmdline to bypass authentication.

For Secure Boot enrollment and MOK management: [docs.shani.dev — Secure Boot](https://docs.shani.dev/doc/secure-boot).

---

## Signed OS Images

Every Shani OS release is SHA256 checksummed and GPG signed with key `7B927BFFD4A9EAAA8B666B77DE217F3DA8014792`. The key is on public keyservers at `keys.openpgp.org`.

`shani-deploy` verifies both the checksum and the GPG signature before writing a single byte to the inactive OS slot. A corrupted download or a tampered image fails verification and the update is aborted. The system is never put in a state where an unverified image has been partially written.

This is not just download verification — it is a continuous chain. The image that was verified at download time is the image that `btrfs receive` writes to the slot. The result is byte-for-byte identical to the subvolume that passed build-time QA and was signed by the Shani OS key.

---

## Intel ME Disabled

The Intel Management Engine — a separate processor with persistent access to system memory, the network interface, and the ability to run code independently of the main CPU — has its kernel modules blacklisted by default:

```
blacklist mei
blacklist mei_me
```

This does not remove ME from the hardware (that is not possible in software), but it removes the kernel's interface to it, reducing the attack surface from the OS side. Full blacklist configuration: [docs.shani.dev — Kernel Hardening](https://docs.shani.dev/doc/security/features).

---

## Firewall Active from First Boot

`firewalld` is running from first boot with a default-deny inbound policy. Pre-configured rules are applied at install time for KDE Connect/GSConnect (device pairing, file transfer, notifications) and Waydroid (DNS, packet forwarding). No inbound connections are permitted beyond what is explicitly configured. `fail2ban` runs to ban repeated authentication failures.

All VPN protocols are pre-installed and configurable via the GUI — OpenVPN, WireGuard, L2TP, PPTP, strongSwan/IKEv2, Cisco AnyConnect, SSTP, Fortinet SSL, VPNC. Tailscale (WireGuard-based mesh VPN) is pre-installed with state persisted in `/data/varlib/tailscale` so it survives OS updates. Cloudflare Zero Trust tunnels via `cloudflared` are also pre-installed. Full networking documentation: [docs.shani.dev — Networking](https://docs.shani.dev/doc/servers).

---

## Zero Telemetry — Precisely What It Means

No background services report hardware, software usage, or system behaviour to any external server. No identifiers are generated or transmitted. No crash reports are collected. No analytics run.

`shani-deploy` connects to the CDN to download updates and to the GPG keyserver to verify signatures. These are standard HTTP downloads — they send only what any HTTP client sends (your IP address, from your own network, to fetch a file you explicitly requested). Nothing else leaves the machine.

The entire codebase is public at [github.com/shani8dev](https://github.com/shani8dev). Every service, every script, every systemd unit is readable. Every claim in this post is independently verifiable. You do not have to trust any of it — you can read the source.

---

## What This Means Together

These layers are not independent features. They compose:

- The read-only root means attackers cannot persist to system paths
- Secure Boot means attackers cannot inject a modified kernel
- TPM2-sealed LUKS means the disk is useless on a different machine or with a modified firmware
- Six LSMs mean even a root compromise is bounded in what it can do
- Signed images mean the update path cannot be poisoned
- Zero telemetry means there is no data exfiltration channel built into the OS

The attack surface is reduced by design, not by configuration. The security model is auditable, open source, and independently verifiable.

For setup instructions, configuration details, and troubleshooting: [docs.shani.dev — Security](https://docs.shani.dev/doc/security).

[Download Shani OS at shani.dev →](https://shani.dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
