---
slug: gen-efi-and-secure-boot
title: 'gen-efi and Secure Boot on Shani OS — UKI Generation, MOK Enrollment, and TPM2'
date: '2026-04-30'
tag: 'Engineering'
excerpt: 'gen-efi is the tool that builds and signs Unified Kernel Images, manages MOK keys for Secure Boot, and enrolls LUKS keys into TPM2. This is the complete reference for every gen-efi operation and the Secure Boot chain on Shani OS.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '8 min'
series: 'Shani OS Deep Dives'
---

`gen-efi` is the tool Shani OS uses to build Unified Kernel Images (UKIs), manage MOK (Machine Owner Key) Secure Boot keys, and enroll LUKS2 decryption keys into the TPM2 chip. It runs automatically as part of every `shani-deploy` update cycle and is also available for manual use.

Understanding `gen-efi` is not required for everyday use — `shani-deploy` calls it automatically. This guide is for users who want to understand the boot security chain, manually re-enroll Secure Boot or TPM2 after firmware changes, or diagnose boot issues.

Full reference: [docs.shani.dev — Secure Boot](https://docs.shani.dev/doc/security/secure-boot) and [docs.shani.dev — gen-efi](https://docs.shani.dev/doc/security/gen-efi).

---

## What is a Unified Kernel Image (UKI)?

A UKI is a single EFI binary that bundles:
- The Linux kernel
- The initramfs
- The kernel command line (including root device, LUKS UUID, LSM list, swap offset)

Because all three are packaged together and the whole file is signed with the MOK key, nothing can be changed at boot time without invalidating the signature. This is stronger than a traditionally signed kernel — even the kernel command line is immutable once the UKI is signed.

Shani OS maintains two UKIs, one per slot:
- `/boot/efi/EFI/shanios/shanios-blue.efi`
- `/boot/efi/EFI/shanios/shanios-green.efi`

Both are signed with the same MOK key. `gen-efi` regenerates them during every `shani-deploy` update and on manual request.

---

## The Secure Boot Chain

```
UEFI Firmware
  └─ verifies BOOTX64.EFI (Shim, signed by Microsoft CA)
       └─ Shim verifies systemd-boot (grubx64.efi, signed by MOK)
            └─ systemd-boot verifies and loads the UKI (shanios-blue.efi, signed by MOK)
                 └─ UKI contains: kernel + initramfs + cmdline (all signed together)
```

The MOK (Machine Owner Key) is a keypair generated on your machine during installation:
- Private key: `/etc/secureboot/keys/MOK.key` (never leaves the device)
- Certificate: `/etc/secureboot/keys/MOK.crt`
- DER-encoded public key: `/boot/efi/EFI/BOOT/MOK.der` (enrolled into UEFI firmware)

---

## gen-efi Quick Reference

```bash
# Generate UKI for the current active slot
sudo gen-efi generate

# Generate UKI for a specific slot
sudo gen-efi generate --slot blue
sudo gen-efi generate --slot green

# Enroll MOK key into UEFI firmware (for Secure Boot)
sudo gen-efi enroll-mok

# Clean up stale MOK keys from previous installations
sudo gen-efi cleanup-mok

# Enroll LUKS key into TPM2 (for passwordless disk unlock)
sudo gen-efi enroll-tpm2

# Remove TPM2 enrollment (before firmware updates, etc.)
sudo gen-efi cleanup-tpm2

# Configure key generation and UKI build (run on custom images)
sudo gen-efi configure <slot>

# List both UKI entries and their versions
sudo gen-efi list

# Verify MOK enrollment status
sudo gen-efi verify
```

---

## Generating UKIs

`gen-efi generate` rebuilds the UKI for a slot by:

1. Reading the current kernel from the slot's `/usr/lib/modules/` directory
2. Regenerating the initramfs via `dracut`
3. Reading the kernel command line from `/etc/kernel/install_cmdline_<slot>`, updating it with the live LUKS UUID, swap offset, and keyboard layout
4. Bundling kernel + initramfs + cmdline into a single EFI binary via `dracut --force --uefi`
5. Signing the resulting binary with the MOK private key

```bash
# Rebuild the UKI for the active slot
sudo gen-efi generate

# Rebuild the UKI for a specific slot
sudo gen-efi generate --slot green

# List the resulting UKIs and verify signatures
sudo gen-efi list
sbctl verify /boot/efi/EFI/shanios/shanios-blue.efi
sbctl verify /boot/efi/EFI/shanios/shanios-green.efi
```

When would you manually run `gen-efi generate`?
- After editing a kernel parameter in `/etc/kernel/install_cmdline_<slot>`
- After enabling or changing full-disk encryption
- When troubleshooting a boot issue caused by a stale UKI
- When `shani-deploy --repair-boot` calls it automatically

---

## Secure Boot: MOK Enrollment

After installation, Secure Boot is disabled (you disabled it before installing per the pre-installation checklist). To re-enable it, you need to enroll your MOK key into the UEFI firmware.

### Method 1: From the Live USB (Recommended)

On the first boot from the Shani OS USB, MokManager (`mmx64.efi`) launches automatically and offers to enroll a key from disk:

1. Select "Enroll key from disk"
2. Navigate to the EFI partition root
3. Select `MOK.der`
4. Confirm enrollment
5. Reboot and enable Secure Boot in BIOS

### Method 2: From the Installed System

If you missed the MokManager prompt:

```bash
# Re-signs all EFI binaries, copies MOK.der to ESP, stages enrollment via mokutil
sudo gen-efi enroll-mok

# Reboot — MokManager appears automatically
# Confirm with password: shanios
sudo reboot
```

After MokManager completes, go into BIOS and enable Secure Boot.

```bash
# Remove any stale keys from the ISO (after installation is complete)
sudo gen-efi cleanup-mok

# Verify the key is enrolled
mokutil --list-enrolled | grep -i shani
sbctl status
```

---

## TPM2 Auto-Unlock

TPM2 auto-unlock seals your LUKS decryption key into the TPM2 chip, bound to PCR values 0 (firmware state) and 7 (Secure Boot policy). The disk unlocks silently on trusted hardware and remains locked on any other hardware or with tampered firmware.

### Setup

```bash
# Enroll LUKS key into TPM2 (one-time setup after fresh install)
sudo gen-efi enroll-tpm2

# Test — reboot and confirm silent unlock
sudo reboot
```

### After Firmware Updates

If `fwupdmgr update` updated your BIOS or platform firmware, PCR 0 changes. The TPM will not release the key with the old PCR binding. You will be prompted for your LUKS passphrase on the next boot — this is correct security behaviour.

```bash
# After booting with passphrase, remove stale TPM2 enrollment
sudo gen-efi cleanup-tpm2

# Re-enroll with current PCR values
sudo gen-efi enroll-tpm2
```

### Verifying TPM2 State

```bash
# List current TPM2 LUKS keyslots
sudo cryptsetup luksDump /dev/nvme0n1p2 | grep -A 5 "Token"

# Check PCR values
sudo systemd-cryptenroll --tpm2-device=auto --print-pcrs

# Check which PCRs the key is bound to
sudo tpm2_nvread ...  # or use systemd-cryptenroll output
```

---

## Inspecting the Kernel Command Line

The kernel command line is embedded in the UKI at build time. To read it from an existing UKI:

```bash
# Extract and display the command line from the active slot's UKI
sudo objcopy -O binary --only-section=.cmdline \
    /boot/efi/EFI/shanios/shanios-blue.efi /dev/stdout | strings

# Or use ukify (if available)
sudo ukify inspect /boot/efi/EFI/shanios/shanios-blue.efi
```

The command line includes: `quiet splash systemd.volatile=state ro lsm=landlock,lockdown,yama,integrity,apparmor,bpf rootfstype=btrfs rootflags=subvol=@blue,ro,...` plus LUKS UUID parameters (if encrypted) and `resume=` (if hibernation is configured).

---

## Editing Kernel Parameters

To add or change a kernel parameter:

```bash
# The stored cmdline template (gen-efi reads this and adds live values)
sudo nano /etc/kernel/install_cmdline_blue
sudo nano /etc/kernel/install_cmdline_green

# After editing, regenerate the UKI
sudo gen-efi generate --slot blue
sudo gen-efi generate --slot green
```

Common parameters users add:
```
# Disable the NMI watchdog (slightly faster boot)
nmi_watchdog=0

# Force a specific GPU driver
amdgpu.ppfeaturemask=0xffffffff

# Verbose boot (remove 'quiet splash')
# Remove 'quiet splash' from the cmdline file
```

---

## Troubleshooting

### UKI Signature Verification Fails

```bash
# Check MOK enrollment
mokutil --list-enrolled

# Re-sign the UKIs
sudo gen-efi generate --slot blue
sudo gen-efi generate --slot green

# Verify
sbctl verify /boot/efi/EFI/shanios/shanios-blue.efi
```

### Secure Boot Rejects the Kernel After Update

```bash
# Check if the new UKI was signed
sbctl verify /boot/efi/EFI/shanios/shanios-green.efi

# Regenerate if needed
sudo gen-efi generate --slot green

# Verify the MOK key is still enrolled
mokutil --list-enrolled | grep -i shani
```

### TPM2 Fails After Secure Boot Change

When you change Secure Boot settings (enable, disable, modify enrolled keys), PCR 7 changes. Re-enroll:

```bash
sudo gen-efi cleanup-tpm2
sudo gen-efi enroll-tpm2
```

Full boot and security troubleshooting: [docs.shani.dev — Boot Issues](https://docs.shani.dev/doc/troubleshootingboot) and [docs.shani.dev — Encryption Issues](https://docs.shani.dev/doc/security/luks).

---

## Resources

- [docs.shani.dev — Secure Boot](https://docs.shani.dev/doc/security/secure-boot) — full Secure Boot reference
- [docs.shani.dev — gen-efi Reference](https://docs.shani.dev/doc/security/gen-efi) — complete gen-efi documentation
- [docs.shani.dev — TPM2 Enrollment](https://docs.shani.dev/doc/security/tpm2) — TPM2 setup guide
- [Security Without Configuration](https://blog.shani.dev/post/shani-os-security-deep-dive) — security model overview
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
