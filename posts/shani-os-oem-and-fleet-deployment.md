---
slug: shani-os-oem-and-fleet-deployment
title: 'Shani OS for OEMs and IT Fleets — Deploy Once, Maintain Never'
date: '2026-04-16'
tag: 'Enterprise'
excerpt: 'How Shani OS eliminates per-device drift, enables one-command remote rollback, automates firmware updates, and makes fleet management genuinely simple — whether you are an OEM shipping hardware or an IT team managing hundreds of machines.'
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

Managing a fleet of Linux desktops with traditional distributions is a problem of accumulation. Each machine starts identical. Over months, updates apply differently across different hardware. Local configuration changes accumulate. A package on machine A conflicts with a library on machine B. The fleet that was uniform on day one is a collection of unique, unmaintainable snowflakes by year two.

Shani OS is designed to make this problem go away by architecture, not by tooling. Every machine pulls from the same GPG-verified, SHA256-checked image. Updates are atomic and all-or-nothing. Rollback requires no reimaging. The fleet stays uniform because the OS itself is replaced wholesale on each update — never patched in place.

This post covers deployment, customisation, fleet management, and the security posture that matters for enterprise and OEM scenarios. Enterprise contact and OEM enquiries: [shani.dev — Enterprise & Vendors](https://shani.dev#enterprise).

---

## Why Immutability Solves Fleet Management

Traditional fleet management tooling (Ansible, Puppet, Chef, Salt) solves a problem Shani OS makes unnecessary: reconciling the actual state of a mutable system with the desired state. You write playbooks to install packages, configure files, enable services, and fix drift. You run them on a schedule to keep machines in line. When something goes wrong, you debug why the machine diverged.

On Shani OS, the root filesystem is physically read-only. A machine cannot drift from the OS image it booted. The only way the OS changes is through `shani-deploy`, which replaces it atomically. Configuration lives in the `/etc` OverlayFS overlay (in `@data`) — your managed configuration is tracked separately from the OS image and survives every update.

The result is a fleet model that looks more like container orchestration than traditional desktop management: the OS is an image, deployments are image swaps, and per-machine state is limited and explicit.

---

## OEM Deployment

### Pre-installation Customisation

Shani OS ISOs can be used as-is for standard deployments, or customised before shipping:

**Plymouth branding:** The Plymouth boot theme uses BGRT — it reads the OEM logo directly from UEFI firmware. A machine from a manufacturer whose logo is in the UEFI BGRT table automatically displays that logo during boot without any image customisation. For custom logos beyond BGRT, the Plymouth theme configuration lives in `/usr/share/plymouth/themes/`.

**OEM First-Run Wizard:** Shani OS includes an OEM initial setup wizard that handles first-boot configuration — language, timezone, account creation, network setup. This is the same wizard used in the public ISOs. It can be pre-configured or extended for custom first-boot flows.

**Pre-installed Flatpaks:** To ship machines with specific applications pre-installed, add Flatpak refs to the OEM configuration layer. Flatpaks install to `@flatpak` and are fully independent of the OS image.

**Custom Flatpak remotes:** Organisations can run private Flatpak repositories for internal applications. Register the remote once and it is available across all deployments:

```bash
# Add a private Flatpak repository
flatpak remote-add --if-not-exists myorg https://flatpak.myorg.com/repo

# Install an internal app
flatpak install myorg com.myorg.InternalApp
```

### Image Signing

Every Shani OS release is signed with key `7B927BFFD4A9EAAA8B666B77DE217F3DA8014792`. For organisations deploying a custom build, the signing key is configurable in `shani-deploy`. Machines enrolled with your key only accept images signed by your key — a tampered or unofficial image fails verification before it is written.

---

## Fleet Update Management

### Centralised Update Delivery

Shani OS update images are served via HTTPS from a CDN. For fleet deployments, you can:

**Mirror the update CDN internally.** Point machines at your internal mirror by configuring the update URL in `shani-deploy`'s configuration. Updates are downloaded from your network, not the public CDN. This controls bandwidth and allows offline or air-gapped deployments.

### Staged Rollouts

`shani-deploy` supports two release channels: `stable` (default, monthly) and `latest` (more frequent). For staged rollouts, run a canary group on `latest` before pushing to the full fleet on `stable`:

```bash
# Check current channel
cat /etc/shani-channel

# Switch to a specific release channel (persisted to /etc/shani-channel)
sudo shani-deploy --set-channel stable
sudo shani-deploy --set-channel latest

# Or use a channel for a single run without changing the default
sudo shani-deploy -t latest
```

### Automated Updates

For unattended fleet updates, a systemd timer can trigger `shani-deploy` on a schedule. The update stages the new image and writes `/run/shanios/reboot-needed`; the reboot can be scheduled separately in a maintenance window:

```bash
# /etc/systemd/system/shani-autoupdate.timer
[Unit]
Description=Automatic Shani OS update check

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# /etc/systemd/system/shani-autoupdate.service
[Unit]
Description=Automatic Shani OS update

[Service]
Type=oneshot
ExecStart=/usr/local/bin/shani-deploy
```

```bash
sudo systemctl enable shani-autoupdate.timer
```

After `shani-deploy` stages an update, check `/run/shanios/reboot-needed` in your maintenance window logic to trigger the reboot at the right time.

For managed fleets you should also disable the `shani-update` autostart entry so it does not prompt users interactively:

```bash
sudo rm /etc/xdg/autostart/shani-update.desktop
```

---

## Remote Rollback Without Reimaging

The most operationally significant property of Shani OS for fleet management is the rollback model. On a traditional mutable system, a bad update on a remote machine requires remote investigation, possible reimaging, or an on-site visit. On Shani OS:

**Automatic rollback (no intervention required):** systemd-boot's boot-counting mechanism detects a slot that fails to reach `multi-user.target` within three boot attempts and automatically falls back to the previous slot. The user may not even notice.

**Manual rollback (one command):** If a machine boots but has a problem, one command reverts it:

```bash
sudo shani-deploy -r
# Then reboot — via SSH, MDM, or remote management console
```

This is possible remotely via SSH, Tailscale, or any remote management tool. No reimaging cycle. No USB drive. No on-site visit.

**The rollback guarantee:** The previous OS slot is always kept on disk until the next update cycle. There is always a known-good state to return to.

---

## Configuration Management

For configuration that must be consistent across a fleet — SSH hardening, service enablement, custom `/etc` settings — use the OverlayFS upper layer in `@data`:

```bash
# Copy a managed configuration to the persistent overlay
sudo cp /path/to/managed/sshd_config /data/overlay/etc/upper/ssh/sshd_config

# Enable a managed service
sudo systemctl enable --now myservice
# The symlink persists in the OverlayFS overlay
```

Changes to `/etc` via OverlayFS survive every OS update and rollback. When the OS updates, new defaults in the lower layer are visible to files you have not customised. Files you have customised in the upper layer retain your version. This is the merge behaviour: defaults for untouched files, your version for customised files.

For fleet-wide configuration deployment, push changes to the `@data` subvolume via your remote management solution. The OS image itself does not need to be customised.

### Audit What Has Been Customised

```bash
# See all files in the /etc overlay (all machine-specific customisations)
find /data/overlay/etc/upper -type f | sort

# Compare a customised file to the OS default
diff /data/overlay/etc/upper/ssh/sshd_config /etc/ssh/sshd_config
```

---

## Security Posture for Enterprise Compliance

Shani OS's default security configuration is designed to pass enterprise security audits without additional hardening steps.

### What is Active by Default

- **Six simultaneous Linux Security Modules:** AppArmor, Landlock, Lockdown, Yama, Integrity (IMA/EVM), BPF LSM — most distributions enable one or two
- **Immutable root filesystem:** even root cannot write to system paths at runtime; persistence requires compromising the update pipeline
- **LUKS2 argon2id full-disk encryption:** opt-in at install, recommended for all laptops and portable devices
- **TPM2 auto-unlock:** disk unlocks on verified hardware, locked against physical removal
- **Secure Boot via Shim + MOK-signed UKIs:** bootloader and kernel verified before the system starts; bootloader editor disabled
- **Signed OS images:** SHA256 + GPG verified before every deployment; tampered images are rejected
- **Intel ME kernel modules blacklisted:** `mei`, `mei_me` blacklisted by default
- **firewalld active from first boot:** default-deny inbound; pre-configured rules for KDE Connect and Waydroid only
- **fail2ban active:** automated banning of repeated authentication failures
- **Zero telemetry:** no usage data, crash reports, or analytics; the complete codebase is public and auditable

### Authentication

Pre-installed and working at first boot without driver installation:

- Fingerprint (fprintd with libfprint for supported hardware)
- Smart card / PIV (opensc, pcscd, pcsc-tools)
- YubiKey and FIDO2 hardware tokens (libfido2, pam-u2f, yubikey-manager)
- NFC authentication (libnfc, pcsc-lite)
- TOTP/HOTP two-factor authentication (oath-toolkit)

### Encryption Key Management

LUKS2 keys never leave the device. TPM2 sealing binds to PCRs 0 and 7 — the firmware state and the Secure Boot policy (or PCR 0 only when Secure Boot is disabled). For government and institutional deployments that require no foreign key escrow: the encryption key is on the device, sealed in the TPM2 chip, verifiable via the public `gen-efi` source code.

For the complete security architecture: [Security Without Configuration](https://blog.shani.dev/post/shani-os-security-deep-dive).

---

## School Labs and Shared Computing

Shani OS is particularly well-suited to environments where users cannot be trusted to preserve the OS — school labs, library terminals, shared workstations, kiosks.

**The core property:** A user cannot persistently corrupt the immutable root. Changes to system files are impossible. Changes to `/etc` via OverlayFS are per-machine and auditable.

**Reset between sessions:** For kiosk or lab scenarios where each session should start fresh, the per-user `/home` directory can be reset via a logout script or on reboot:

```bash
# Example: reset a lab user's home directory on logout
# /etc/gdm/PostSession/Default (GNOME) or similar
rsync -a --delete /etc/skel/ /home/labuser/
```

**OS reset between terms:** `shani-reset` is pre-installed and wipes all persistent system state stored in `/data` (the `/etc` overlay, service state, enabled units, etc.) without touching the OS image or user home directories. At the end of a term:

```bash
# Preview what would be wiped (dry run)
sudo shani-reset --dry-run

# Wipe all /data state and reboot (system starts fresh from the same OS image)
sudo shani-reset

# Wipe /data AND /home if you want to reset user files too
sudo shani-reset --home
```

No reimaging cycle needed between semesters. The OS image is untouched.

**Indian language support:** Devanagari, Tamil, Telugu, and other Indian scripts are configured from first boot. IBus multi-language input is pre-configured. For government schools and institutions: the software is free, the codebase is auditable, and there is no subscription, licence fee, or vendor lock-in.

---

## Monitoring and Observability

### System Health

`shani-health` is the diagnostic tool for fleet monitoring. It covers boot state, security configuration, storage, hardware, and package status:

```bash
# Full system status report
shani-health

# Boot report: slots, UKI state, deployment status
shani-health --boot

# Security report: boot chain, encryption, LSM, users
shani-health --security

# Btrfs storage analysis
shani-health --storage-info

# Deep integrity check: UKI signatures + Btrfs scrub
shani-health --verify

# Last 50 deploy/rollback events
shani-health --history

# systemd journal entries at error level and above
shani-health --journal err
```

### Remote Monitoring via Tailscale or SSH

For fleet-wide health monitoring, each machine is accessible via SSH over Tailscale without requiring a VPN server or port forwarding:

```bash
# Check a remote machine's active slot and boot state
ssh admin@machine-name.tailnet.ts.net 'cat /data/current-slot && shani-health --boot'

# Remote rollback
ssh admin@machine-name.tailnet.ts.net 'sudo shani-deploy -r && sudo reboot'
```

Tailscale state persists across OS updates at `/data/varlib/tailscale`. Tailscale SSH does not require a separate SSH daemon — it uses Tailscale's identity system for authentication.

---

## Summary: What Enterprise Gets

| Concern | Traditional Mutable Linux | Shani OS |
|---|---|---|
| Fleet uniformity | Drifts over time; requires reconciliation tools | Every machine on same channel runs identical verified image |
| Bad update recovery | Reimage or manual rollback; often on-site | One SSH command (`shani-deploy -r`); automatic if unattended |
| Security audit | Hardening guide + configuration management | Secure by default; auditable public codebase |
| Software inventory | `dpkg -l`, `rpm -qa` varies per machine | OS image version + Flatpak list — identical across fleet |
| Remote management | MDM + SSH + configuration management stack | SSH or Tailscale; no drift to manage |
| Encryption | Configure LUKS separately; key escrow options vary | LUKS2 + TPM2 at install; no foreign key escrow |

---

## Resources and Contact

- [shani.dev — Enterprise & Vendors](https://shani.dev#enterprise) — OEM partnerships and enterprise contact
- [docs.shani.dev — Security](https://docs.shani.dev/doc/security) — full security documentation
- [docs.shani.dev — System Updates](https://docs.shani.dev/doc/updates/system) — update configuration reference
- [github.com/shani8dev](https://github.com/shani8dev) — source code, fully auditable
- [Telegram community](https://t.me/shani8dev) — technical questions and support

[Download Shani OS at shani.dev →](https://shani.dev)

---

## Resources

- [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide) — when things go wrong
- [Shani OS FAQ](https://blog.shani.dev/post/shani-os-faq) — common questions answered
- [Updates on Shani OS](https://blog.shani.dev/post/shani-os-updates) — update and rollback reference

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**  
> *Enterprise-grade update reliability. No per-device licence. No vendor lock-in.*
