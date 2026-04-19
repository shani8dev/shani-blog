---
slug: shani-os-first-week
title: 'Your First Week with Shani OS — From Install to Fully Set Up'
date: '2026-05-12'
tag: 'Guide'
excerpt: 'A day-by-day walkthrough for new Shani OS users: getting encryption and updates sorted on day one, then systematically setting up email, cloud sync, printing, dev tools, backups, and daily habits through the first week.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '9 min'
series: 'Shani OS Guides'
---

`shani-os-getting-started` covers installation and first boot. This guide covers the week after: what to do each day to go from "freshly installed" to "fully set up and comfortable." It is written for general users — not developers, not gamers specifically — though developers will find the Day 4 section useful.

Most steps are 5–15 minutes. None require the terminal unless you want to use it.

---

## Day 1 — The Foundations

### Step 1: Secure your encryption (if you enabled LUKS2)

If you enabled full-disk encryption during installation (strongly recommended for laptops), run this once:

```bash
sudo gen-efi enroll-tpm2
```

This seals your LUKS decryption key into your laptop's TPM2 chip. From now on, the disk unlocks automatically when you boot on your own machine — no passphrase prompt on every startup. Your passphrase remains valid as a backup.

If the command completes without errors, reboot and confirm the disk unlocks silently.

If you didn't enable encryption during install and want it: reinstall with the encryption checkbox ticked. There is no safe in-place conversion path. Back up your files first with `restic` or `rclone` (both are pre-installed).

### Step 2: Run your first OS update

```bash
sudo shani-deploy
```

This downloads the latest OS image to the inactive slot, verifies it, and stages it for the next reboot. It takes 5–15 minutes depending on your connection. You can keep using the system while it runs. Reboot when convenient.

After rebooting, `shani-update` will confirm you're on the new system and ask if everything looks good. If anything seems wrong, `sudo shani-deploy -r` and a reboot returns you to the previous state in under a minute.

### Step 3: Add a Nix channel (one-time)

Nix is pre-installed but needs one setup command before you can use it:

```bash
nix-channel --add https://nixos.org/channels/nixpkgs-unstable nixpkgs
nix-channel --update
```

After this, `nix-env -iA nixpkgs.packagename` installs any of 100,000+ CLI tools. You won't need this today unless you want a specific tool — it's there when you need it.

### Step 4: Check your firmware

```bash
fwupdmgr refresh && fwupdmgr update
```

This updates your BIOS, Thunderbolt firmware, and storage peripheral firmware. If a firmware update installs, reboot and then re-enroll TPM2 (firmware changes reset the PCR values the TPM uses):

```bash
sudo gen-efi cleanup-tpm2
sudo gen-efi enroll-tpm2
```

---

## Day 2 — Communication and Cloud

### Email

Install Thunderbird for a full desktop email client:

```bash
flatpak install flathub org.mozilla.Thunderbird
```

Open Thunderbird → Account Settings → Add Mail Account. It auto-configures server settings for Gmail, Outlook, Fastmail, ProtonMail (via Bridge), and most IMAP providers.

For Microsoft Exchange (corporate email), Thunderbird handles it natively via its EWS support, or install GNOME Evolution which has built-in Exchange:

```bash
flatpak install flathub org.gnome.Evolution
```

### Cloud Storage

**GNOME Online Accounts** (Settings → Online Accounts) integrates Google Drive, Nextcloud, and Microsoft 365 directly into your file manager with no extra app:
- Add your Google account → Google Drive appears in Nautilus file manager
- Add a Nextcloud account → files sync automatically via the Nextcloud client

For Nextcloud with full sync:

```bash
flatpak install flathub com.nextcloud.desktopclient.nextcloud
```

For Dropbox:

```bash
flatpak install flathub com.dropbox.Client
```

### Calendar and Contacts

**GNOME Calendar** is pre-installed. Connect it to your Google Calendar or Nextcloud via GNOME Online Accounts (Settings → Online Accounts → add your account → enable Calendar).

For a task manager that syncs with Google Tasks or Nextcloud:

```bash
flatpak install flathub org.gnome.Tasks
```

---

## Day 3 — Peripherals and Phone

### Set Up Your Printer

Most modern printers (post-2016, Wi-Fi or USB) work automatically. Open Settings → Printers. Your printer should appear. If it doesn't:

1. For HP printers: run `hp-setup` in a terminal
2. For Epson/Brother/Canon: check Settings → Printers → Add → your model should be in the list
3. Full guide: [Printing and Scanning on Shani OS](https://blog.shani.dev/post/shani-os-printing-and-scanning)

### Pair Your Bluetooth Devices

GNOME: Settings → Bluetooth → put your device in pairing mode → click it.

KDE: System tray Bluetooth icon → pair.

Bluetooth headphones, keyboards, mice, speakers, and gaming controllers all work at first boot. Paired devices persist across every OS update and rollback — pair once, stay paired.

### Connect Your Phone (KDE Connect / GSConnect)

For Android users: install the **KDE Connect** app from the Play Store. Both phone and laptop need to be on the same Wi-Fi network.

- **GNOME edition:** Open Extension Manager (pre-installed) → enable GSConnect → the phone icon appears in your top bar
- **KDE Plasma edition:** KDE Connect is already in the system tray

Accept the pairing request on your phone. From then on: phone notifications appear on your desktop, clipboard syncs both ways, you can send files between phone and desktop, and your phone battery level shows in the status bar.

Guide: [KDE Connect and GSConnect on Shani OS](https://blog.shani.dev/post/shani-os-kde-connect)

### Set Your Language and Input Method

If you need to type in an Indian language: Settings → Keyboard → Input Sources → click `+` → Other → select your language (Hindi, Tamil, Telugu, etc.) → choose Phonetic or InScript layout.

Switch between English and your language with `Super+Space`.

Guide: [Indian Language Support on Shani OS](https://blog.shani.dev/post/shani-os-indian-language-support)

---

## Day 4 — Apps and Software

By now the system is set up. Day 4 is about installing the software you actually use.

### Install Apps via Flatpak (GUI method)

Open **Warehouse** (pre-installed) → it shows everything installed and lets you browse Flathub. Or use GNOME Software / KDE Discover — both are pre-configured with Flathub.

Common installs:

```bash
flatpak install flathub org.mozilla.firefox          # Firefox
flatpak install flathub com.spotify.Client           # Spotify
flatpak install flathub org.telegram.desktop         # Telegram
flatpak install flathub org.signal.Signal            # Signal
flatpak install flathub com.bitwarden.desktop        # Bitwarden (password manager)
flatpak install flathub md.obsidian.Obsidian         # Obsidian (notes)
flatpak install flathub org.gimp.GIMP                # GIMP (image editing)
flatpak install flathub us.zoom.Zoom                 # Zoom
```

### For Developers

Set up a Distrobox container for your main development work:

```bash
# Arch Linux (for AUR access)
distrobox create --name dev --image archlinux:latest
distrobox enter dev

# Or Ubuntu (for apt and PPAs)
distrobox create --name ubuntu-dev --image ubuntu:24.04
distrobox enter ubuntu-dev
```

Your home directory (`~/projects`, etc.) is the same inside and outside the container.

Then install your language runtime via Nix (outside any container):

```bash
nix-env -iA nixpkgs.nodejs_22    # Node.js
nix-env -iA nixpkgs.rustup       # Rust
nix-env -iA nixpkgs.python312    # Python
nix-env -iA nixpkgs.go           # Go
```

Guide: [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os)

### AppImages

For apps that are only available as AppImages (some creative tools, nightly builds): download the `.AppImage` file, open **Gear Lever** (pre-installed), and drag the file in. It integrates the app into your launcher and tracks updates automatically.

---

## Day 5 — Backups

The OS backs itself up via atomic snapshots — you can always roll back the OS. But your files in `@home` need their own backup. Set this up now, before you forget.

### Quick Local Backup with restic

`restic` is pre-installed. Set it up against an external drive or cloud storage:

```bash
# External drive backup
restic -r /media/yourname/backup/restic init
restic -r /media/yourname/backup/restic backup ~/Documents ~/Pictures ~/Projects

# Verify it worked
restic -r /media/yourname/backup/restic snapshots
restic -r /media/yourname/backup/restic check
```

For cloud backups (S3, Backblaze B2, SFTP):

```bash
restic -r s3:s3.amazonaws.com/your-bucket init
restic -r s3:s3.amazonaws.com/your-bucket backup ~/Documents ~/Pictures
```

Store the password in `~/.config/restic-password` (mode 600).

### Automate It

```bash
crontab -e
# Add: 0 2 * * * restic -r /media/backup/restic --password-file ~/.config/restic-password backup ~/Documents ~/Pictures ~/Projects
```

Guide: [Btrfs Snapshots and Backup on Shani OS](https://blog.shani.dev/post/shani-os-btrfs-snapshots-and-backup)

---

## Day 6 — Shell and Terminal

If you use the terminal at all, spend 15 minutes learning what's already set up.

**McFly** replaces `Ctrl+R` for command history — it's context-aware and learns from your usage. Press `Ctrl+R` and start typing any fragment of a command you've run before.

**FZF** is bound to `Ctrl+T` (insert file path fuzzy search) and `Alt+C` (fuzzy cd). Try `Alt+C` and type part of any directory name.

**bat** replaces `cat` with syntax highlighting: `bat file.py`

**eza** replaces `ls`: `eza -la --git` shows a directory listing with git status per file

**Starship prompt** shows your git branch and status as you navigate project directories.

The shell is Zsh by default, configured with syntax highlighting (commands turn green when valid) and autosuggestions (press right arrow to accept a suggestion from history).

Guide: [The Shell Experience on Shani OS](https://blog.shani.dev/post/shani-os-shell-and-terminal)

---

## Day 7 — Know Your System

By the end of your first week, it's worth spending a few minutes understanding the configuration you've made and how to check on things.

### See What You've Customised

```bash
# What /etc files have you changed from OS defaults?
find /data/overlay/etc/upper/ -type f | sort

# What services have you enabled?
systemctl list-unit-files --state=enabled | grep -v "systemd\|dbus\|getty"
```

### Check System Health

```bash
shani-health
```

This shows slot state, storage usage, service health, and filesystem status in one place.

### Know How Updates Work

`shani-update` runs automatically. When a new OS image is available, a notification appears. You apply it with `sudo shani-deploy`, reboot when ready, and if anything is wrong, `sudo shani-deploy -r` undoes it.

Your apps (Flatpak, Nix, containers) update independently on their own schedules and are never affected by OS updates.

### Keep a Note of Your Setup

Write down which Flatpak apps you installed, any Nix packages, and any Distrobox containers you created. If you ever reinstall, this list gets you back to a working setup in 30 minutes. Your actual files in `@home` always survive, but knowing what tools you had is useful.

---

## What's Next

Once you're comfortable with daily use, these guides go deeper on specific areas:

- [Shani OS for General Desktop Users](https://blog.shani.dev/post/shani-os-for-general-desktop-users) — full productivity stack coverage
- [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os) — full mutable Linux environments
- [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os) — developer toolchain management
- [Security Without Configuration](https://blog.shani.dev/post/shani-os-security-deep-dive) — understanding the security model
- [System Configuration on Shani OS](https://blog.shani.dev/post/shani-os-system-configuration) — /etc, services, what persists

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
