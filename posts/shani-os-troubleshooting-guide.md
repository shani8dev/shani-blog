---
slug: shani-os-troubleshooting-guide
title: 'Shani OS Troubleshooting Guide — Boot, Updates, Audio, GPU, and More'
date: '2026-05-12'
tag: 'Guide'
excerpt: 'The consolidated troubleshooting reference for Shani OS — boot failures and slot recovery, update issues, audio problems, Bluetooth, Flatpak sandbox, NVIDIA detection, TPM2 unlock, Waydroid, and common journalctl commands for diagnosing anything else.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '10 min'
series: 'Shani OS Guides'
---

This is the consolidated troubleshooting reference for Shani OS. Each section covers a problem category with diagnostic commands and fixes. For deeper reference on a specific subsystem, links to the relevant guide are included throughout.

Full reference: [docs.shani.dev](https://docs.shani.dev).

---

## Boot Problems

### System Won't Boot — Automatic Fallback

If your system fails to reach the login prompt three times after an update, systemd-boot's boot counting activates and falls back to the previous slot automatically. On the next successful login, `shani-update` detects the fallback and offers to clean the failed slot.

To check what happened:

```bash
# Which slot are you actually running?
cat /proc/cmdline | grep -o 'subvol=@[a-z]*'

# What does the slot tracker say?
cat /data/current-slot

# Were there boot failures?
ls /data/boot_failure /data/boot_hard_failure 2>/dev/null

# Check the boot journal for errors
journalctl -b 0 -p err --no-pager | head -40
```

To restore the failed slot and make it bootable again:

```bash
sudo shani-deploy -r
sudo reboot
```

---

### Black Screen After Update (GPU / NVIDIA)

A black screen after a kernel or driver update almost always means the NVIDIA module failed to load, or Secure Boot is rejecting the new UKI.

```bash
# Switch to a TTY (Ctrl+Alt+F2 or F3) and log in

# Check if NVIDIA module loaded
lsmod | grep nvidia
dmesg | grep -i "nvidia\|NVRM" | tail -20

# Check Secure Boot status
mokutil --sb-state

# If the MOK key isn't enrolled:
sudo gen-efi enroll-mok
sudo reboot
# Accept the key in MokManager, then enable Secure Boot
```

If the display manager failed:

```bash
journalctl -u gdm -b 0 -n 50       # GNOME
journalctl -u sddm -b 0 -n 50      # KDE
```

---

### Drops to Emergency Shell at Boot

This is usually a filesystem mount failure. The most common cause after updating is a stale `/etc/fstab` or `/etc/crypttab` entry.

```bash
# From the emergency shell:
# Check which mount failed
journalctl -b 0 -p err | grep -i "mount\|fstab\|crypttab"

# Inspect the overlayfs and crypttab
cat /etc/crypttab
cat /etc/fstab

# If /etc/crypttab has a wrong UUID (e.g. after re-encryption):
# Get correct UUID
blkid | grep crypto_LUKS

# Fix the entry
sudo nano /etc/crypttab
```

If the issue is in the overlay layer and you can't fix it from the emergency shell, boot the previous slot from the systemd-boot menu, or boot from the live USB.

---

## Update Problems

### shani-deploy Fails Mid-Download

`shani-deploy` uses `aria2c` with resume support. If a download is interrupted, re-run the command — it resumes automatically.

```bash
# Simply re-run
sudo shani-deploy

# If the partial file is corrupted, clean it first
sudo shani-deploy -c
sudo shani-deploy
```

### "Not enough space" Error

```bash
# Check actual available space
df -h /
sudo btrfs filesystem usage /

# Check what's using space — backup snapshots and download cache are common culprits
sudo shani-deploy -c          # remove backup snapshots and cached downloads
sudo compsize /               # see compressed sizes
flatpak uninstall --unused    # remove unused Flatpak runtimes
podman system prune -af       # remove unused container images
nix-collect-garbage -d        # remove old Nix generations
```

### GPG Verification Fails

```bash
# Re-import the Shani OS signing key
gpg --keyserver keys.openpgp.org --recv-keys 7B927BFFD4A9EAAA8B666B77DE217F3DA8014792

# Retry the update
sudo shani-deploy
```

---

## Audio Problems

### No Audio at Boot

```bash
# Restart the full PipeWire stack
systemctl --user restart pipewire pipewire-pulse wireplumber

# Check that sinks exist
pactl list sinks short

# Check PipeWire status
systemctl --user status pipewire pipewire-pulse wireplumber
```

### Audio Works But Sounds Distorted

Usually a sample rate mismatch.

```bash
# Check current sample rate
pactl list sinks | grep "Sample Spec"

# Reset PipeWire config to defaults
rm ~/.config/pipewire/pipewire.conf 2>/dev/null
systemctl --user restart pipewire wireplumber
```

### Microphone Not Working in Flatpak Apps

Flatpak apps need explicit microphone permission:

```bash
# Grant permission to a specific app
flatpak override --user --device=all com.example.App

# Or use Flatseal (pre-installed) for graphical permission management
```

### No Audio on New Intel Laptop (SOF)

```bash
# Check if SOF firmware loaded
dmesg | grep -i "sof\|sound open"
cat /proc/asound/cards

# SOF firmware is pre-installed — if it's not loading, check for module errors
journalctl --user -u wireplumber -n 30
```

Full audio guide: [Audio on Shani OS](https://blog.shani.dev/post/shani-os-audio-pipewire)

---

## Bluetooth Problems

### Adapter Not Found

```bash
hciconfig -a
rfkill list bluetooth

# Unblock if soft-blocked
rfkill unblock bluetooth

# Restart Bluetooth
sudo systemctl restart bluetooth
```

### Device Pairs But Won't Connect

```bash
bluetoothctl remove XX:XX:XX:XX:XX:XX
bluetoothctl scan on
bluetoothctl pair XX:XX:XX:XX:XX:XX
bluetoothctl trust XX:XX:XX:XX:XX:XX

# Check logs for errors
journalctl -u bluetooth -n 30
```

### Headphones Connected But No Audio

```bash
# Check PipeWire sees the device
pactl list cards | grep -i bluetooth

# Restart audio stack
systemctl --user restart pipewire pipewire-pulse wireplumber

# Set as default output
pactl set-default-sink bluez_output.XX_XX_XX_XX_XX_XX.1
```

Full Bluetooth guide: [Bluetooth on Shani OS](https://blog.shani.dev/post/shani-os-bluetooth)

---

## Flatpak / App Problems

### App Can't Access Files

Flatpak apps are sandboxed. Open **Flatseal** (pre-installed) → select the app → check filesystem permissions. Common fix: add your home directory or the specific path the app needs.

```bash
# Grant access to home directory
flatpak override --user --filesystem=home com.example.App

# Grant access to a specific path
flatpak override --user --filesystem=/home/user/Documents com.example.App
```

### App Refuses to Launch (Sandbox Error)

```bash
# Run from terminal to see the error
flatpak run com.example.App

# Check for sandbox violations
flatpak run --log-session-bus com.example.App 2>&1 | grep -i "deny\|error"
```

### Flatpak Update Breaks an App

```bash
# Pin the app to its current version
flatpak mask com.example.App

# Check current version
flatpak info com.example.App

# Unpin when the issue is resolved
flatpak mask --remove com.example.App
```

---

## Encryption / TPM2 Problems

### TPM2 Won't Unlock After Firmware Update

PCR 0 changes when firmware is updated. The TPM will not release the key — you'll be prompted for your passphrase. After booting with the passphrase:

```bash
sudo gen-efi cleanup-tpm2
sudo gen-efi enroll-tpm2
```

### TPM2 Won't Unlock After Secure Boot Change

PCR 7 changes when Secure Boot settings change. Same fix:

```bash
sudo gen-efi cleanup-tpm2
sudo gen-efi enroll-tpm2
```

### Forgot LUKS Passphrase

If you have no backup passphrase, no keyfile, and no TPM2 enrollment, the data is **unrecoverable** — this is the intended LUKS2 security guarantee. Boot from the Shani OS USB, reinstall, and restore from backups.

If you have a backup keyfile:

```bash
# Boot from Shani OS USB
sudo cryptsetup open /dev/nvme0n1p2 shani_root --key-file /path/to/luks-keyfile
sudo mount -o subvol=@home /dev/mapper/shani_root /mnt/home
```

Full LUKS guide: [LUKS2 Encryption on Shani OS](https://blog.shani.dev/post/shani-os-luks-after-installation)

---

## Waydroid Problems

### Waydroid Session Fails to Start

```bash
# Check the container service
systemctl status waydroid-container.service
journalctl -u waydroid-container.service -n 50

# Check binder module
lsmod | grep binder

# Re-initialise
sudo waydroid init
```

### Play Store Says Device Not Certified

After installing GApps, Google requires device registration:

1. Get your Android ID: `adb shell settings get secure android_id`
2. Visit `google.com/android/uncertified` and register the ID
3. Wait 15 minutes, then retry the Play Store

### App Crashes Immediately (ARM Translation)

Most crashes are ARM translation failures. Check if an x86 version of the app exists in the Play Store. If not, the PWA version (web app) is often a practical alternative for common apps.

Full Waydroid guide: [Waydroid on Shani OS](https://blog.shani.dev/post/waydroid-android-on-shani-os)

---

## Display / GPU Problems

### NVIDIA GPU Not Detected

```bash
# Check if the driver loaded
nvidia-smi
lsmod | grep nvidia
dmesg | grep -i nvidia | head -20

# Verify Secure Boot MOK enrollment
mokutil --list-enrolled | grep -i shani

# If MOK not enrolled:
sudo gen-efi enroll-mok
sudo reboot
# Accept in MokManager, then enable Secure Boot
```

### Hybrid GPU (Optimus) — Wrong GPU Used

```bash
# Force discrete GPU for a specific application
prime-run application-name

# In Steam launch options:
# __NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia %command%

# Check which GPU is active
glxinfo | grep "OpenGL renderer"
```

---

## Network Problems

### Wi-Fi Connection Not Remembered After Update

Wi-Fi configurations persist in `/data/varlib/NetworkManager` — they survive updates normally. If they disappeared, check:

```bash
ls /data/varlib/NetworkManager/
nmcli connection show
```

If the directory is empty, the bind mount may not have activated correctly:

```bash
# Check bind mount
mount | grep NetworkManager

# Restart NetworkManager
sudo systemctl restart NetworkManager
```

### Tailscale Disconnects After Update

Tailscale state persists in `/data/varlib/tailscale` across OS updates. If it disconnects, re-authenticate:

```bash
sudo tailscale up
```

---

## General Diagnostics

### Reading the System Journal

```bash
# All errors from the current boot
journalctl -b 0 -p err --no-pager

# All errors from the previous boot (useful after a crash)
journalctl -b -1 -p err --no-pager

# Follow logs in real time
journalctl -f

# Logs for a specific service
journalctl -u service-name -b 0 -n 100

# Filter by time
journalctl --since "10 minutes ago"
```

### Checking What Changed

```bash
# What /etc files have you customised?
find /data/overlay/etc/upper/ -type f | sort

# What services are enabled?
systemctl list-unit-files --state=enabled | grep -v "systemd\|dbus\|getty"

# What Flatpak overrides are active?
flatpak override --user --show
```

### System Health Summary

```bash
# Full health check (introduced in 2026.04.15)
shani-health

# Verbose with all details
shani-health -v

# Storage summary
sudo shani-deploy --storage-info
```

---

## Getting More Help

If the problem isn't covered here, the Telegram community is the fastest path to a solution:

- [Telegram community](https://t.me/shani8dev) — post your `journalctl -b 0 -p err` output and describe what you were doing when the problem occurred

Before posting, collect:
```bash
# Useful diagnostic info to share
cat /etc/shani-version
cat /data/current-slot
shani-health --json
journalctl -b 0 -p err --no-pager | tail -30
```

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
