---
slug: shani-os-luks-after-installation
title: 'LUKS2 Encryption on Shani OS — Setup, Management, and Recovery'
date: '2026-05-09'
tag: 'Guide'
excerpt: 'Full-disk encryption must be enabled at install time on Shani OS. This guide covers what to do if you missed it, and the complete reference for managing LUKS2 on an already-encrypted system: keyslots, passphrases, keyfiles, header backup, TPM2, and emergency recovery.'
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

Full-disk encryption on Shani OS is a single checkbox in the installer. If you skipped it, the correct path is to reinstall — not to attempt to encrypt an existing installation in place.

This guide covers why that is the right call, how to reinstall cleanly, and then — for users who already have an encrypted system — a complete reference for everything you can do with LUKS2: managing keyslots and passphrases, adding keyfiles, backing up the LUKS header, enrolling TPM2 auto-unlock, and recovering from worst-case scenarios.

Full reference: [docs.shani.dev — LUKS](https://docs.shani.dev/doc/security/luks).

---

## If You Missed Encryption at Install: Reinstall

Encrypting an existing unencrypted Shani OS installation requires wiping the root partition entirely. There is no in-place conversion. Attempting it by hand means: backing up all data, booting from USB, repartitioning, creating a LUKS container, recreating the Btrfs subvolume layout, restoring data, regenerating UKIs, and re-enrolling TPM2. Each step is an opportunity for data loss. The Shani OS installer does all of this correctly in a few clicks.

**The right approach:**

1. Back up your home directory and any data you want to keep:
   ```bash
   # restic is pre-installed
   restic -r /media/external/backup init
   restic -r /media/external/backup backup ~/
   restic -r /media/external/backup backup /data/
   restic -r /media/external/backup check
   ```
2. Download the latest Shani OS ISO from [shani.dev](https://shani.dev) and write it to a USB drive
3. Boot from the USB and run the installer
4. On the disk setup screen, **enable full-disk encryption** — it is a single toggle
5. Complete installation, reboot, and restore your home directory from the backup

The installer creates the LUKS2 container with `argon2id` KDF, creates all Btrfs subvolumes, configures `/etc/crypttab`, and generates the UKIs with the correct LUKS UUID embedded. Everything is wired up correctly from the start.

After reinstalling, enroll TPM2 for passwordless unlock:

```bash
sudo gen-efi enroll-tpm2
```

That's it. The rest of this guide is for users who already have an encrypted system and want to manage it.

---

## Why LUKS2 with argon2id

Shani OS uses LUKS2 with the `argon2id` key derivation function:

- **argon2id** is memory-hard — it requires a large amount of RAM to compute, making GPU and ASIC brute-force attacks orders of magnitude more expensive than with older PBKDF2-based setups
- **LUKS2** supports multiple keyslots, allowing you to have a passphrase, a keyfile, and a TPM2-sealed key all active simultaneously
- The passphrase you choose still matters — argon2id slows attackers down but a weak passphrase is still a weak passphrase

Default encryption parameters used by the Shani OS installer:

```
Cipher:      aes-xts-plain64
Key size:    512 bits
PBKDF:       argon2id
Memory cost: 1048576 KB (1 GB)
Time cost:   4 iterations
Parallelism: 4 threads
```

---

## Checking Encryption Status

```bash
# Is the root partition encrypted?
lsblk -f | grep -E "crypt|luks"
# Should show crypto_LUKS under your root partition (e.g. nvme0n1p2)

# View the full LUKS header — version, cipher, KDF, all keyslots
sudo cryptsetup luksDump /dev/nvme0n1p2

# Confirm the active mapper device
cat /proc/mounts | grep mapper
```

Look for `Version: 2`, `cipher: aes-xts-plain64`, and `PBKDF: argon2id`. If you see `pbkdf2` instead of `argon2id`, your KDF is significantly weaker — you can convert it:

```bash
sudo cryptsetup luksConvertKey --pbkdf argon2id /dev/nvme0n1p2
```

---

## Managing Keyslots

LUKS2 supports up to 32 keyslots. Each keyslot holds an independent key that can decrypt the volume. You can have a primary passphrase, a backup passphrase, a keyfile, and a TPM2-sealed key all active at once.

### Adding a Second Passphrase (Recovery Key)

Adding a second passphrase gives you a backup if you forget the first, or a separate passphrase for a trusted person:

```bash
sudo cryptsetup luksAddKey /dev/nvme0n1p2
# Enter any existing passphrase when prompted, then set the new one
```

### Changing Your Passphrase

LUKS does not have a "change passphrase" operation — you add a new keyslot then remove the old one:

```bash
# Step 1: Add the new passphrase (creates a new keyslot)
sudo cryptsetup luksAddKey /dev/nvme0n1p2

# Step 2: Find the keyslot number of the old passphrase
sudo cryptsetup luksDump /dev/nvme0n1p2 | grep -A2 "Keyslot"

# Step 3: Remove the old keyslot
sudo cryptsetup luksKillSlot /dev/nvme0n1p2 <keyslot-number>
# You will be prompted to authenticate with any remaining valid key
```

### Adding a Keyfile

Keyfiles are useful for automated unlock scenarios or as a recovery key stored securely off-device:

```bash
# Generate a strong random keyfile
sudo dd if=/dev/urandom of=/root/luks-keyfile bs=512 count=8
sudo chmod 400 /root/luks-keyfile

# Add the keyfile as an additional LUKS keyslot
sudo cryptsetup luksAddKey /dev/nvme0n1p2 /root/luks-keyfile

# Verify all keyslots
sudo cryptsetup luksDump /dev/nvme0n1p2 | grep -E "Keyslot|Token"
```

Store the keyfile off-device. Losing it does not lock you out as long as you still have your passphrase.

### Removing a Keyslot

```bash
# Remove a specific keyslot by number
sudo cryptsetup luksKillSlot /dev/nvme0n1p2 <keyslot-number>

# Or remove by key (prompts for the key to remove)
sudo cryptsetup luksRemoveKey /dev/nvme0n1p2
```

Never remove all keyslots — leave at least your passphrase slot intact.

---

## Backing Up the LUKS Header

The LUKS header stores all keyslots. If it gets corrupted — by a disk failure, accidental overwrite, or filesystem error — the encrypted data is permanently and completely unrecoverable. Back up the header:

```bash
sudo cryptsetup luksHeaderBackup /dev/nvme0n1p2 \
  --header-backup-file ~/luks-header-backup-$(date +%Y%m%d).img

# Store this file off-device — external drive, encrypted cloud storage
# Verify it is readable
file ~/luks-header-backup-*.img
```

Restoring from a header backup:

```bash
# This restores the keyslots as they were at backup time
sudo cryptsetup luksHeaderRestore /dev/nvme0n1p2 \
  --header-backup-file luks-header-backup-20260401.img
```

Back up the header again any time you add or remove a keyslot.

---

## TPM2 Auto-Unlock

TPM2 auto-unlock seals your LUKS key into the TPM2 chip so the disk unlocks silently on boot — no passphrase prompt — as long as the boot chain is unmodified. Your passphrase always remains valid as a fallback.

### Enrolling

```bash
# gen-efi handles PCR policy selection and KDF validation automatically
sudo gen-efi enroll-tpm2
```

You will be prompted for your LUKS passphrase. The PCR policy is chosen based on your Secure Boot state:

- **Secure Boot enabled:** PCR 0 + PCR 7 — firmware measurements and Secure Boot certificate state
- **Secure Boot disabled:** PCR 0 only — firmware measurements only (weaker)

After enrolling, reboot and confirm the disk unlocks silently.

### After Firmware Updates

If `fwupdmgr update` updated your BIOS, PCR 0 changes. The TPM will not release the key, so you will be prompted for your passphrase on the next boot. This is expected behaviour.

```bash
# After booting with passphrase, clean up the stale slot and re-enroll
sudo gen-efi cleanup-tpm2
sudo gen-efi enroll-tpm2
```

### After Secure Boot Changes

When you enable, disable, or change enrolled Secure Boot keys, PCR 7 changes. Re-enroll:

```bash
sudo gen-efi cleanup-tpm2
sudo gen-efi enroll-tpm2
```

### Adding a TPM2 PIN (Second Factor)

For stronger protection, require a short PIN in addition to TPM2 binding. `gen-efi enroll-tpm2` prompts you to opt in during enrollment. Plymouth will ask for the PIN at boot — the disk only unlocks if both the TPM measurement matches and the PIN is correct.

### Verifying TPM2 State

```bash
# Confirm TPM2 enrollment is present
sudo cryptsetup luksDump /dev/nvme0n1p2 | grep systemd-tpm2

# List all keyslots and tokens
sudo cryptsetup luksDump /dev/nvme0n1p2 | grep -A5 "Token"

# List available TPM2 devices
sudo systemd-cryptenroll --tpm2-device=list
```

Full TPM2 reference: [docs.shani.dev — TPM2 Enrollment](https://docs.shani.dev/doc/security/tpm2).

---

## Verifying Encryption is Working

```bash
# Confirm the partition type
lsblk -o NAME,FSTYPE,SIZE,MOUNTPOINT
# nvme0n1p2 should show crypto_LUKS

# Check the mapper device is active
ls -la /dev/mapper/shani_root

# Full header dump
sudo cryptsetup luksDump /dev/nvme0n1p2
```

---

## Emergency Recovery

### Forgotten Passphrase, No Backup Key

If you have no backup passphrase, no keyfile, and no TPM2 enrollment — the data is **unrecoverable**. This is the intended security guarantee of LUKS2.

Boot from the Shani OS USB, reinstall, and restore from your data backups.

### Have a Backup Keyfile

```bash
# Boot from Shani OS USB
# Open the encrypted partition using the keyfile
sudo cryptsetup open /dev/nvme0n1p2 shani_root \
  --key-file /path/to/luks-keyfile

# Mount and access your data
sudo mount -o subvol=@home /dev/mapper/shani_root /mnt/home
sudo mount -o subvol=@data /dev/mapper/shani_root /mnt/data
```

### Have a Header Backup (Corrupted Header)

```bash
# Boot from Shani OS USB
# Restore the header backup first
sudo cryptsetup luksHeaderRestore /dev/nvme0n1p2 \
  --header-backup-file luks-header-backup.img

# Then open with your passphrase as normal
sudo cryptsetup open /dev/nvme0n1p2 shani_root
```

### TPM2 Won't Unlock (Firmware Changed)

```bash
# Boot and enter your passphrase when prompted
# Then re-enroll TPM2 with current PCR values
sudo gen-efi cleanup-tpm2
sudo gen-efi enroll-tpm2
```

---

## Resources

- [docs.shani.dev — LUKS](https://docs.shani.dev/doc/security/luks) — full reference
- [docs.shani.dev — TPM2 Enrollment](https://docs.shani.dev/doc/security/tpm2) — passwordless unlock setup
- [gen-efi and Secure Boot on Shani OS](https://blog.shani.dev/post/gen-efi-and-secure-boot) — UKI generation and TPM2
- [Security Without Configuration](https://blog.shani.dev/post/shani-os-security-deep-dive) — security model overview
- [Telegram community](https://t.me/shani8dev) — ask for help before attempting recovery procedures

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
