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

Both are signed with the same MOK key. `gen-efi configure` regenerates them during every `shani-deploy` update and on manual request.

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
- DER-encoded public key: `/etc/secureboot/keys/MOK.der` (also copied to `/boot/efi/EFI/BOOT/MOK.der` for MokManager enrollment)

If the MOK keypair is missing when `gen-efi` runs, it automatically generates a fresh 2048-bit RSA keypair, re-signs all existing EFI binaries on the ESP, and stages MOK enrollment. If `MOK.key` and `MOK.crt` exist but are a mismatched keypair, `gen-efi` detects this before attempting to sign and regenerates the full pair rather than failing with an opaque OpenSSL error deep inside dracut.

---

## gen-efi Quick Reference

```bash
# Generate UKI for a specific slot (must match the currently booted slot when run directly)
sudo gen-efi configure blue
sudo gen-efi configure green

# Enroll MOK key into UEFI firmware (re-signs EFI binaries, stages mokutil enrollment)
sudo gen-efi enroll-mok

# Clean up stale MOK keys from previous installations
sudo gen-efi cleanup-mok

# Enroll LUKS key into TPM2 (for passwordless disk unlock)
sudo gen-efi enroll-tpm2

# Remove stale TPM2 LUKS keyslots after re-enrollment
sudo gen-efi cleanup-tpm2
```

> **Important:** `gen-efi configure` enforces that the target slot matches the currently booted slot when run directly on the live system. Running it for the inactive slot is only permitted inside a chroot, which `shani-deploy` does automatically. This prevents a common mistake: generating a UKI for `@green` while booted into `@blue` would embed `@blue`'s kernel in `@green`'s boot entry.

---

## Generating UKIs

`gen-efi configure <slot>` rebuilds the UKI for a slot by:

1. Validating that `<slot>` matches the currently booted subvolume (unless running inside a chroot)
2. Ensuring the MOK keypair exists — generating a new one if missing, and validating that `MOK.key` and `MOK.crt` are a matching keypair before attempting to sign anything
3. Mounting the ESP at `/boot/efi` temporarily if not already mounted
4. Updating shim (`BOOTX64.EFI`) and systemd-boot (`grubx64.efi`) on the ESP if the source binaries in `/usr` are newer than what's on the ESP
5. Reading the current kernel version from `/usr/lib/modules/`
6. Detecting the LUKS UUID from the live mapper device, with a fallback to the existing `/etc/crypttab` entry for chroot environments where the device path is not accessible
7. Updating `/etc/crypttab` and the dracut crypt config (`/etc/dracut.conf.d/99-crypt-key.conf`) to keep them consistent
8. Generating the complete kernel command line — including `rootflags=subvol=@<slot>`, `rd.luks.*` parameters, `rd.vconsole.keymap=` from `/etc/vconsole.conf`, and `resume=`/`resume_offset=` from the Btrfs swapfile if present — and writing it atomically to `/etc/kernel/install_cmdline_<slot>`
9. Running `dracut --force --uefi` to build the UKI
10. Signing the binary with `sbsign` and verifying it with `sbverify`
11. Staging MOK enrollment automatically if the current key is not yet enrolled in firmware (silent when already enrolled)

```bash
# Rebuild the UKI for the currently booted slot
sudo gen-efi configure blue   # if booted into @blue
sudo gen-efi configure green  # if booted into @green

# Verify signatures
sbverify --cert /etc/secureboot/keys/MOK.crt /boot/efi/EFI/shanios/shanios-blue.efi
sbverify --cert /etc/secureboot/keys/MOK.crt /boot/efi/EFI/shanios/shanios-green.efi
```

When would you manually run `gen-efi configure`?
- After enabling or changing full-disk encryption
- When troubleshooting a boot issue caused by a stale or corrupt UKI
- After a LUKS UUID change (e.g. re-encryption)
- When `shani-deploy` calls it automatically via chroot during a normal update

---

## Secure Boot: MOK Enrollment

After installation, Secure Boot is disabled (you disabled it before installing per the pre-installation checklist). To re-enable it, you need to enroll your MOK key into the UEFI firmware.

### Method 1: From the Live USB (Recommended)

On the first boot from the Shani OS USB, MokManager (`mmx64.efi`) launches automatically and offers to enroll a key from disk:

1. Select "Enroll key from disk"
2. Navigate to the EFI partition and select `EFI/BOOT/MOK.der`
3. Confirm enrollment
4. Reboot and enable Secure Boot in BIOS

### Method 2: From the Installed System

If you missed the MokManager prompt:

```bash
# Re-signs all EFI binaries, copies MOK.der to ESP, stages enrollment via mokutil
sudo gen-efi enroll-mok

# Reboot — MokManager appears automatically
# Confirm with password: shanios
sudo reboot
```

`enroll-mok` must run on the live booted system — it talks to real UEFI firmware via `mokutil` and cannot run inside a chroot. After MokManager completes, enable Secure Boot in BIOS.

```bash
# After confirming the new key is enrolled, remove stale keys from previous installations
sudo gen-efi cleanup-mok

# Verify the key is enrolled
mokutil --list-enrolled | grep -i shani
mokutil --sb-state
```

`cleanup-mok` compares the fingerprint of each enrolled key against the current `MOK.der`. Keys that do not match are staged for deletion via `mokutil --delete`, confirmed in MokManager on the next reboot. Run it only after confirming the new key is enrolled.

---

## TPM2 Auto-Unlock

TPM2 auto-unlock seals your LUKS decryption key into the TPM2 chip. The PCR policy is chosen automatically:

- **Secure Boot enabled:** PCR 0 + PCR 7 — firmware measurements and Secure Boot state (UEFI db/dbx/pk)
- **Secure Boot disabled:** PCR 0 only — firmware measurements only (weaker: an attacker with physical access could replace the bootloader)

The disk unlocks silently on boot when PCR values match. Your LUKS passphrase always remains valid as a fallback.

During enrollment, `gen-efi enroll-tpm2` also checks the LUKS KDF and warns if it is `pbkdf2` instead of `argon2id` — `pbkdf2` is orders of magnitude weaker against GPU brute-force attacks. You can convert with `cryptsetup luksConvertKey --pbkdf argon2id <device>`.

### Setup

```bash
# Enroll LUKS key into TPM2 (one-time setup after fresh install)
# You will be prompted for your LUKS passphrase
# You can also opt in to a TPM2 PIN for a second factor
sudo gen-efi enroll-tpm2

# Reboot and confirm silent unlock
sudo reboot
```

### After Firmware Updates

If `fwupdmgr update` updated your BIOS or platform firmware, PCR 0 changes. The TPM will not release the key with the old binding, so you will be prompted for your LUKS passphrase on the next boot. This is expected.

```bash
# After booting with passphrase, clean up the stale TPM2 slot
sudo gen-efi cleanup-tpm2

# Re-enroll with the current PCR values
sudo gen-efi enroll-tpm2
```

`cleanup-tpm2` collects all TPM2-type keyslots from the LUKS header, keeps the highest-numbered (most recently written), and wipes the rest using `systemd-cryptenroll --wipe-slot`. It prompts for your LUKS passphrase to authorise each removal.

### After Secure Boot Changes

When you change Secure Boot settings (enable, disable, or change enrolled keys), PCR 7 changes. Re-enroll:

```bash
sudo gen-efi cleanup-tpm2
sudo gen-efi enroll-tpm2
```

### Verifying TPM2 State

```bash
# List LUKS keyslots and tokens including TPM2 entries
sudo cryptsetup luksDump /dev/nvme0n1p2 | grep -A 5 "Token"

# Confirm TPM2 enrollment
sudo cryptsetup luksDump /dev/nvme0n1p2 | grep systemd-tpm2

# List available TPM2 devices
sudo systemd-cryptenroll --tpm2-device=list
```

---

## Inspecting the Kernel Command Line

The kernel command line is embedded in the UKI at build time. `gen-efi` always regenerates it from live system state — it never reuses a cached file. The generated line is stored at `/etc/kernel/install_cmdline_<slot>` (overwritten on every run). To read the cmdline embedded in an existing UKI:

```bash
# Extract and display the command line from a UKI
sudo objcopy -O binary --only-section=.cmdline \
    /boot/efi/EFI/shanios/shanios-blue.efi /dev/stdout | strings

# Or use ukify (if available)
sudo ukify inspect /boot/efi/EFI/shanios/shanios-blue.efi
```

The generated command line looks like:

```
quiet splash systemd.volatile=state ro lsm=landlock,lockdown,yama,integrity,apparmor,bpf
rootfstype=btrfs rootflags=subvol=@blue,ro,noatime,compress=zstd,space_cache=v2,autodefrag
rd.luks.uuid=<uuid> rd.luks.name=<uuid>=shani_root rd.luks.options=<uuid>=tpm2-device=auto
root=/dev/mapper/shani_root rd.vconsole.keymap=us
resume=UUID=<uuid> resume_offset=<offset>
```

Parameters are added or omitted based on system state: `rd.luks.*` only on encrypted systems, `rd.vconsole.keymap=` only if `/etc/vconsole.conf` defines a keymap, `resume=` only if `/swap/swapfile` exists.

---

## Troubleshooting

### MOK.key and MOK.crt Do Not Match

`gen-efi` detects keypair mismatches before attempting to sign anything and regenerates the full pair automatically. After regeneration, run `enroll-mok` to stage enrollment of the new key, then reboot to confirm in MokManager.

### UKI Signature Verification Fails

```bash
# Verify the UKI against the local MOK cert
sbverify --cert /etc/secureboot/keys/MOK.crt /boot/efi/EFI/shanios/shanios-blue.efi

# If it fails, rebuild the UKI for the current slot
sudo gen-efi configure blue

# If the MOK key changed, re-enroll it
sudo gen-efi enroll-mok
```

### Secure Boot Rejects the Kernel After Update

```bash
# Check signature on the new slot's UKI
sbverify --cert /etc/secureboot/keys/MOK.crt /boot/efi/EFI/shanios/shanios-green.efi

# Regenerate if needed (run from the currently booted slot)
sudo gen-efi configure blue

# Confirm the MOK key is enrolled
mokutil --list-enrolled | grep -i shani
```

### TPM2 Fails After Secure Boot Change

When you change Secure Boot settings, PCR 7 changes. Re-enroll:

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
