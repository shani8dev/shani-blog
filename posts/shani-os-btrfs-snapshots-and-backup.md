---
slug: shani-os-btrfs-snapshots-and-backup
title: 'Btrfs Snapshots and Backup on Shani OS — Protecting Your Data the Right Way'
date: '2026-04-27'
tag: 'Guide'
excerpt: 'How to use Btrfs snapshots for instant point-in-time copies of your home directory, and how to set up real off-device backups with restic and rclone — both pre-installed on Shani OS. Snapshots are not backups. Here is the difference and how to do both.'
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

Shani OS handles OS updates with atomic snapshots that let you roll back the entire system in one command. But OS rollback is not the same as protecting your personal data. Your `@home` subvolume, your projects, your documents — these need their own protection strategy.

This guide covers two complementary layers: Btrfs snapshots for fast, on-disk point-in-time copies, and encrypted off-device backups via `restic` and `rclone` (both pre-installed). The combination gives you fast local recovery and durable off-site protection.

Full reference: [docs.shani.dev — Backup](https://docs.shani.dev/doc/networking/backup).

---

## Snapshots vs Backups: The Critical Distinction

A Btrfs snapshot is a point-in-time copy of a subvolume stored on the **same disk**. If your disk fails, you lose both the data and its snapshots. Snapshots protect you against accidental deletion and file corruption — not hardware failure.

A backup is a copy stored **somewhere else** — an external drive, a NAS, a cloud service. Backups protect against hardware failure, theft, fire, and anything that destroys the primary disk.

You need both. Snapshots for quick local recovery; off-device backups for disaster recovery.

---

## Btrfs Snapshots

### Snapshotting Your Home Directory

```bash
# Create a directory for snapshots (you can put this anywhere in @data)
sudo mkdir -p /data/snapshots/home

# Create a read-only snapshot (best for backups — immutable reference point)
sudo btrfs subvolume snapshot -r /home /data/snapshots/home/home-$(date +%Y%m%d-%H%M)

# Create a writable snapshot (for testing changes)
sudo btrfs subvolume snapshot /home /data/snapshots/home/home-writable-$(date +%Y%m%d)
```

Read-only snapshots are preferred for backup purposes because they cannot be accidentally modified. Writable snapshots are useful for testing — make a snapshot, experiment, delete it if things go wrong.

### Listing and Inspecting Snapshots

```bash
# List all subvolumes and snapshots
sudo btrfs subvolume list /

# Show details of a specific snapshot
sudo btrfs subvolume show /data/snapshots/home/home-20260427-1430

# Check how much space snapshots use
sudo compsize /data/snapshots/
du -sh /data/snapshots/home/
```

A fresh snapshot of a 50 GB home directory takes milliseconds and uses almost no additional space — only files that change after the snapshot consume new space.

### Restoring from a Snapshot

**Restoring a specific file:**

```bash
# Mount the snapshot
sudo mount -o subvol=@data /dev/nvme0n1p2 /mnt/data 2>/dev/null || true
# Navigate to the snapshot and copy files
ls /data/snapshots/home/home-20260427-1430/
cp /data/snapshots/home/home-20260427-1430/Documents/importantfile.pdf ~/Documents/
```

**Restoring the entire home directory (from a live USB or the other OS slot):**

```bash
# Boot from the other slot or a USB, then:
sudo btrfs subvolume delete /home
sudo btrfs subvolume snapshot /data/snapshots/home/home-20260427-1430 /home
```

### Deleting Old Snapshots

```bash
# Delete a specific snapshot
sudo btrfs subvolume delete /data/snapshots/home/home-20260420-0900

# Delete all snapshots older than a specific date (manual)
sudo btrfs subvolume list / | grep "home-202604" | \
  awk '{print $NF}' | xargs -I{} sudo btrfs subvolume delete /{}
```

### Automating Snapshots with a Systemd Timer

Create a timer to automatically snapshot your home directory daily:

```bash
# /etc/systemd/system/home-snapshot.service
sudo tee /etc/systemd/system/home-snapshot.service << 'EOF'
[Unit]
Description=Daily home directory snapshot

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'mkdir -p /data/snapshots/home && btrfs subvolume snapshot -r /home /data/snapshots/home/home-$(date +%Y%m%d-%H%M)'
ExecStart=/bin/bash -c 'find /data/snapshots/home -name "home-*" -mtime +30 -exec btrfs subvolume delete {} \;'
EOF

# /etc/systemd/system/home-snapshot.timer
sudo tee /etc/systemd/system/home-snapshot.timer << 'EOF'
[Unit]
Description=Daily home snapshot timer

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl enable --now home-snapshot.timer
```

This creates a daily snapshot and deletes snapshots older than 30 days.

---

## Off-Device Backups with restic

`restic` is pre-installed on Shani OS. It creates encrypted, deduplicated, versioned backups. restic configuration lives in `/data/varlib/restic` — your backup repository connections survive OS updates.

### Initial Setup

```bash
# Create a repository (example: on an external drive)
restic -r /media/backup/myrestic init

# Or on S3-compatible storage
restic -r s3:s3.amazonaws.com/my-backup-bucket init

# Or on Backblaze B2
restic -r b2:mybucket:restic init

# Or on an SFTP server
restic -r sftp:user@server:/backup/restic init
```

You will be prompted for a repository password. Store this safely — without it, you cannot restore your backups.

### Running Backups

```bash
# Backup your home directory
restic -r /media/backup/myrestic backup ~/

# Backup specific directories
restic -r s3:s3.amazonaws.com/my-bucket backup \
    ~/Documents ~/Projects ~/Pictures ~/Videos

# Backup with exclusions
restic -r /media/backup/myrestic backup ~/ \
    --exclude ~/Downloads \
    --exclude ~/.cache \
    --exclude ~/.local/share/containers

# Check what would be backed up without doing it
restic -r /media/backup/myrestic backup ~/ --dry-run
```

### Verifying Backups

```bash
# List all backup snapshots
restic -r /media/backup/myrestic snapshots

# Verify backup integrity
restic -r /media/backup/myrestic check

# Deep verify (reads all data — slower but thorough)
restic -r /media/backup/myrestic check --read-data
```

Always verify your backups periodically. A backup you have never restored from is a backup you do not know works.

### Restoring from restic

```bash
# Restore latest snapshot to original location
restic -r /media/backup/myrestic restore latest --target ~/

# Restore to a different location
restic -r /media/backup/myrestic restore latest --target /tmp/restore/

# Restore a specific snapshot
restic -r /media/backup/myrestic restore abc12345 --target ~/

# Restore only specific files
restic -r /media/backup/myrestic restore latest \
    --target /tmp/restore/ \
    --include "Documents/important.pdf"

# Browse backup contents interactively
restic -r /media/backup/myrestic mount /mnt/restic-backup
ls /mnt/restic-backup/
# Ctrl+C to unmount
```

### Automating restic Backups

```bash
# Create a backup script
cat > ~/.local/bin/backup.sh << 'EOF'
#!/bin/bash
export RESTIC_REPOSITORY="s3:s3.amazonaws.com/my-bucket"
export RESTIC_PASSWORD_FILE="$HOME/.config/restic-password"
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"

restic backup ~/Documents ~/Projects ~/Pictures \
    --exclude ~/.cache \
    --exclude ~/.local/share/containers

# Keep last 7 daily, 4 weekly, 12 monthly snapshots
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune
EOF
chmod +x ~/.local/bin/backup.sh

# Run manually
~/.local/bin/backup.sh

# Or add to cron
crontab -e
# 0 2 * * * ~/.local/bin/backup.sh
```

Store your restic password in `~/.config/restic-password` (mode 600) rather than in the script.

---

## Cloud Sync with rclone

`rclone` is pre-installed alongside restic. While restic is for encrypted versioned backups, rclone is for syncing files to cloud storage — Google Drive, OneDrive, Dropbox, S3, Backblaze, and 70+ other providers.

rclone configuration persists in `/data/varlib/rclone`.

### Setting Up a Remote

```bash
# Interactive configuration wizard
rclone config
# Follow the prompts to add Google Drive, S3, etc.

# List configured remotes
rclone listremotes
```

### Syncing Directories

```bash
# Sync Documents to Google Drive (one-way, makes remote match local)
rclone sync ~/Documents gdrive:Backup/Documents

# Copy (one-way, only adds/updates — never deletes on remote)
rclone copy ~/Pictures gdrive:Backup/Pictures

# Two-way sync
rclone bisync ~/Projects gdrive:Projects --create-empty-src-dirs

# Check what would be synced
rclone sync ~/Documents gdrive:Backup/Documents --dry-run

# Sync with progress
rclone sync ~/Documents gdrive:Backup/Documents --progress
```

### Mounting Cloud Storage

```bash
# Mount Google Drive as a local directory
mkdir -p ~/gdrive
rclone mount gdrive: ~/gdrive --daemon

# Unmount
fusermount -u ~/gdrive
```

---

## The Complete Strategy

For reliable data protection, use all three layers:

**Layer 1 — Daily Btrfs snapshots** of `@home` to `/data/snapshots/home/`. Fast local recovery from accidental deletion. Takes seconds. Uses minimal space (only changed files grow the snapshot).

**Layer 2 — Weekly restic backups** to an external drive or NAS. Off-disk protection against hardware failure. Encrypted and versioned. Can restore individual files or entire directories.

**Layer 3 — Monthly rclone sync** to cloud storage (Google Drive, S3, Backblaze). Off-site protection against fire, theft, or local disaster. Long-term archive.

The OS itself does not need to be backed up — `shani-deploy` downloads a fresh verified image when you need to update, and the previous slot is always available for rollback.

---

## Resources

- [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide) — when things go wrong
- [Updates on Shani OS](https://blog.shani.dev/post/shani-os-updates) — update and rollback reference
- [docs.shani.dev — Backup (rclone/restic)](https://docs.shani.dev/doc/networking/backup) — full reference
- [restic documentation](https://restic.readthedocs.io)
- [rclone documentation](https://rclone.org/docs/)
- [Shani OS for Researchers and HPC](https://blog.shani.dev/post/shani-os-for-researchers-and-hpc) — DVC for research data
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
