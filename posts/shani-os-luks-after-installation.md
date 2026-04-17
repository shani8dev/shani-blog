---
slug: shani-os-luks-after-installation
title: 'Adding LUKS2 Encryption After Installation on Shani OS'
date: '2026-05-09'
tag: 'Guide'
excerpt: 'Did not enable LUKS2 encryption during installation? This guide walks through adding full-disk encryption to an existing unencrypted Shani OS installation — backing up data, repartitioning with LUKS2, restoring, and enrolling TPM2 for passwordless unlock.'
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

The recommended time to enable LUKS2 full-disk encryption is during the Shani OS installer — it is a single checkbox. If you skipped it and want to add encryption to an existing installation, this guide covers the process.

**Warning:** Adding encryption after installation requires wiping the existing root partition and restoring from backup. This is a destructive operation. Back up everything important before starting. If you have a second machine available, test the process there first.

Full reference: [docs.shani.dev — LUKS After Installation](https://docs.shani.dev/doc/security/luks).

---

## Why LUKS2 with argon2id

Shani OS uses LUKS2 with the argon2id key derivation function. Compared to older LUKS1 with PBKDF2:

- **argon2id** is memory-hard — it requires a large amount of RAM to compute, making GPU and ASIC brute-force attacks much more expensive
- **LUKS2** supports multiple keyslots including TPM2-sealed keys, allowing passwordless unlock on trusted hardware
- The passphrase you choose needs to be strong — argon2id slows down attackers but a weak passphrase is still a weak passphrase

---

## Overview of the Process

1. Back up all your data to an external drive with `restic` or `btrfs send`
2. Boot from the Shani OS live USB
3. Wipe and re-create the root partition with LUKS2
4. Create the Btrfs filesystem inside LUKS2
5. Restore data from backup
6. Regenerate the UKIs with the LUKS UUID embedded
7. Reboot and verify encryption
8. Optionally enroll TPM2 for passwordless unlock

---

## Step 1: Back Up Everything

Before doing anything, back up completely. `restic` is pre-installed:

```bash
# Initialize a restic repository on an external drive
restic -r /media/external/backup init

# Back up your home directory
restic -r /media/external/backup backup ~/

# Also back up /data (contains /etc overlay, service state)
restic -r /media/external/backup backup /data/

# Verify the backup
restic -r /media/external/backup check
restic -r /media/external/backup snapshots

# Or use btrfs send for a full filesystem backup
sudo btrfs send /home | sudo btrfs receive /media/external/home-backup
sudo btrfs send /data | sudo btrfs receive /media/external/data-backup
```

Do not proceed until you have verified the backup is complete and readable.

---

## Step 2: Note Your Partition Layout

```bash
# Note your disk and partition layout before rebooting to the live USB
lsblk -f
# Note the device name (e.g. /dev/nvme0n1), EFI partition, and root partition

cat /etc/fstab
# Note all UUIDs
```

---

## Step 3: Boot from Live USB

Reboot with the Shani OS USB inserted. At the boot menu, select "Try Shani OS" (or the live session option) rather than install.

---

## Step 4: Re-Create Root Partition with LUKS2

From the live session:

```bash
# Identify your disk
lsblk
# e.g. /dev/nvme0n1 with partitions:
# /dev/nvme0n1p1  EFI
# /dev/nvme0n1p2  root (this is what we are encrypting)

# Wipe the root partition and create LUKS2
sudo cryptsetup luksFormat --type luks2 \
    --cipher aes-xts-plain64 \
    --key-size 512 \
    --hash sha256 \
    --pbkdf argon2id \
    /dev/nvme0n1p2

# Open the encrypted partition
sudo cryptsetup open /dev/nvme0n1p2 shani_root

# Create Btrfs filesystem inside LUKS
sudo mkfs.btrfs -L shani_root /dev/mapper/shani_root

# Mount it
sudo mount /dev/mapper/shani_root /mnt/root
```

---

## Step 5: Create Btrfs Subvolumes

```bash
# Create all required subvolumes
cd /mnt/root
sudo btrfs subvolume create @blue
sudo btrfs subvolume create @green
sudo btrfs subvolume create @data
sudo btrfs subvolume create @home
sudo btrfs subvolume create @root
sudo btrfs subvolume create @log
sudo btrfs subvolume create @cache
sudo btrfs subvolume create @flatpak
sudo btrfs subvolume create @nix
sudo btrfs subvolume create @containers
sudo btrfs subvolume create @snapd
sudo btrfs subvolume create @waydroid
sudo btrfs subvolume create @machines
sudo btrfs subvolume create @lxc
sudo btrfs subvolume create @lxd
sudo btrfs subvolume create @libvirt
sudo btrfs subvolume create @qemu
sudo btrfs subvolume create @swap
```

---

## Step 6: Restore Data from Backup

```bash
# Mount the @home subvolume
sudo mount -o subvol=@home /dev/mapper/shani_root /mnt/home

# Restore home from restic
restic -r /media/external/backup restore latest --target /mnt/ \
    --include home/

# Restore @data from restic
sudo mount -o subvol=@data /dev/mapper/shani_root /mnt/data
restic -r /media/external/backup restore latest --target /mnt/ \
    --include data/

# Or if you used btrfs send:
sudo btrfs receive /mnt/root < /media/external/home-backup
sudo btrfs receive /mnt/root < /media/external/data-backup
```

For `@blue` and `@green` (the OS images), you can either restore from backup or simply re-run a fresh `shani-deploy update` after rebooting into the new encrypted system — the update will download a fresh verified image.

The simplest approach for the OS slots is to install Shani OS fresh into the new LUKS partition using the installer (which handles all of this), and then just restore your home and data subvolumes.

---

## Step 7: Update /etc/crypttab and /etc/fstab

After restoring, update the configuration to reference the new LUKS UUID:

```bash
# Get the new LUKS UUID
sudo cryptsetup luksUUID /dev/nvme0n1p2

# Update /etc/crypttab (in the @data overlay)
# Mount @data first
sudo mount -o subvol=@data /dev/mapper/shani_root /mnt/data

# Edit crypttab
sudo nano /mnt/data/overlay/etc/upper/crypttab
# Add: shani_root UUID=<new-uuid> none luks,discard

# Update fstab if it references the root UUID directly
sudo nano /mnt/data/overlay/etc/upper/fstab
```

---

## Step 8: Regenerate UKIs with New LUKS UUID

After restoring and rebooting into the encrypted system, the UKIs need to be regenerated with the new LUKS UUID embedded in the kernel command line:

```bash
# Regenerate both UKIs
sudo gen-efi generate --slot blue
sudo gen-efi generate --slot green

# Verify the LUKS UUID is embedded
sudo objcopy -O binary --only-section=.cmdline \
    /boot/efi/EFI/shanios/shanios-blue.efi /dev/stdout | strings | grep luks
```

---

## Step 9: Enroll TPM2 (Recommended)

Once encryption is working and you can boot with your passphrase, enroll TPM2 to eliminate the passphrase prompt:

```bash
sudo gen-efi enroll-tpm2
```

After enrolling, reboot. The disk should unlock silently without any passphrase prompt. Full guide: [gen-efi and Secure Boot on Shani OS](https://blog.shani.dev/post/gen-efi-and-secure-boot).

---

## Adding an Extra Passphrase or Keyfile

LUKS2 supports multiple keyslots — you can add a secondary passphrase (for recovery) or a keyfile:

```bash
# Add a secondary passphrase
sudo cryptsetup luksAddKey /dev/nvme0n1p2

# Add a keyfile
sudo dd if=/dev/urandom of=/root/luks-keyfile bs=512 count=8
sudo chmod 400 /root/luks-keyfile
sudo cryptsetup luksAddKey /dev/nvme0n1p2 /root/luks-keyfile

# List all keyslots
sudo cryptsetup luksDump /dev/nvme0n1p2 | grep -E "Keyslot|Token"
```

---

## Verifying Encryption

```bash
# Confirm the root partition is encrypted
lsblk -o NAME,FSTYPE,SIZE,MOUNTPOINT
# Should show: crypto_LUKS under nvme0n1p2

# Check LUKS header
sudo cryptsetup luksDump /dev/nvme0n1p2

# Verify encryption is working
cat /proc/mounts | grep mapper
```

---

## Resources

- [docs.shani.dev — LUKS After Installation](https://docs.shani.dev/doc/security/luks) — full reference
- [docs.shani.dev — TPM2 Enrollment](https://docs.shani.dev/doc/security/tpm2) — passwordless unlock setup
- [Security Without Configuration](https://blog.shani.dev/post/shani-os-security-deep-dive) — LUKS2 security model
- [Btrfs Snapshots and Backup on Shani OS](https://blog.shani.dev/post/shani-os-btrfs-snapshots-and-backup) — backup strategy
- [Telegram community](https://t.me/shani8dev) — ask for help before attempting this

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
