---
slug: shani-os-power-management
title: 'Power Management on Shani OS — Hibernation, Suspend, Battery Life, and Profiles'
date: '2026-04-23'
tag: 'Guide'
excerpt: 'Shani OS configures hibernation automatically at install, manages power profiles out of the box, and handles TPM2-sealed LUKS so the disk unlocks silently on your own hardware. Everything a laptop user needs — with nothing to configure.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '7 min'
series: 'Shani OS Guides'
---

Laptops have specific requirements from an OS that desktops do not: hibernation that works reliably, battery optimisation, fast suspend/resume, and on encrypted systems, a way to unlock the disk at boot without typing a passphrase every time. Shani OS addresses all of these by default — without requiring post-install configuration.

This guide explains what is set up and how to use and customise it. Full reference: [docs.shani.dev — Power & Suspend](https://docs.shani.dev/doc/troubleshooting).

---

## Hibernation: Auto-Configured at Install

Hibernation saves your running session to disk and powers the machine completely off. On resume, you pick up exactly where you left off — open applications, documents, browser tabs.

On most Linux distributions, setting up hibernation requires manually calculating a swap offset, editing kernel parameters, and regenerating the initramfs. On Shani OS, all of this is handled during installation.

The installer:
1. Creates a dedicated `@swap` Btrfs subvolume with Copy-on-Write disabled (required for swap on Btrfs)
2. Creates a swapfile sized to match your installed RAM
3. Calculates the correct swap offset using `btrfs inspect-internal map-swapfile`
4. Embeds `resume=UUID=... resume_offset=...` into the Unified Kernel Image for each slot

When you hibernate (from the power menu or `systemctl hibernate`), the kernel writes RAM to the swapfile and powers off. On next boot, it reads from the swapfile and resumes your session.

### Enabling Hibernate in the Power Menu

GNOME and KDE hide the hibernate option by default. To enable it:

**GNOME:**
```bash
# Check that hibernate is available
systemctl hibernate --no-pager --dry-run

# Enable hibernate in the power menu
# Install the Hibernate Status Button GNOME extension
flatpak install flathub org.gnome.Shell.Extensions
# Then search for "Hibernate Status Button" in Extension Manager (pre-installed)
```

**KDE Plasma:**
KDE Plasma shows hibernate in the leave screen automatically when the swapfile is detected. If it is not showing:

```bash
# Check hibernate status
systemctl hibernate --dry-run
```

### Manual Hibernate

```bash
# Hibernate immediately
systemctl hibernate

# Suspend-then-hibernate (suspend first, hibernate after a delay)
systemctl hybrid-sleep
```

---

## Suspend and Suspend-Then-Hibernate

Standard suspend (sleep) keeps RAM powered and suspends everything else. It is instant and uses very little battery. Shani OS uses the `s2idle` suspend state by default on most hardware, which is the modern, efficient option.

```bash
# Suspend immediately
systemctl suspend

# Suspend-then-hibernate (suspend now, hibernate after delay)
systemctl hybrid-sleep
```

To configure the delay before hibernate kicks in during hybrid sleep:

```bash
# Edit sleep configuration
sudo nano /etc/systemd/sleep.conf

# Add or modify:
[Sleep]
HibernateDelaySec=1800    # 30 minutes in suspend before hibernating
```

---

## Power Profiles

`power-profiles-daemon` is pre-installed and active. It provides three profiles that adjust CPU governor, platform power settings, and GPU power limits:

- **Balanced** — default; appropriate for everyday use
- **Power Saver** — extends battery life significantly; reduces CPU performance
- **Performance** — maximises CPU and GPU performance; increases power draw

Switch profiles from the desktop:

**GNOME:** Top-right menu → Power → Performance / Balanced / Power Saver

**KDE:** System Settings → Power Management → Energy Saving → choose profile, or use the battery widget in the system tray

From the terminal:

```bash
# Check current profile
powerprofilesctl get

# List available profiles
powerprofilesctl list

# Switch profiles
powerprofilesctl set power-saver
powerprofilesctl set balanced
powerprofilesctl set performance
```

---

## LUKS2 Encryption and TPM2 Auto-Unlock on Laptops

If you enabled LUKS2 encryption during installation (recommended for all laptops), you are prompted for a passphrase at every boot by default. TPM2 auto-unlock eliminates this prompt while maintaining full encryption security.

### How It Works

TPM2 auto-unlock seals the LUKS key into the TPM2 chip, bound to PCR (Platform Configuration Register) values 0 and 7:
- **PCR 0**: Firmware state — changes if the BIOS firmware is modified
- **PCR 7**: Secure Boot policy — changes if Secure Boot settings change or an unsigned bootloader is loaded

When you boot your own laptop with unmodified firmware and the correct Secure Boot state, the TPM releases the key and the disk unlocks silently. If the laptop is physically stolen and the disk moved to another machine, or if the firmware is tampered with, the TPM does not release the key.

### Setting Up TPM2 Auto-Unlock

```bash
# One-time setup (run after fresh install)
sudo gen-efi enroll-tpm2

# Verify enrollment
sudo systemd-cryptenroll --tpm2-device=auto --print-pcrs

# Test — reboot and confirm the disk unlocks without a passphrase prompt
sudo reboot
```

### Re-enrolling After Firmware Updates

If you update your laptop's firmware (via `fwupdmgr update`), the PCR 0 value changes and the TPM will no longer release the key — you will be prompted for your passphrase on the next boot. This is correct security behaviour. After a successful boot with the passphrase:

```bash
# Remove old TPM2 enrollment and re-enroll with new PCR values
sudo gen-efi cleanup-tpm2
sudo gen-efi enroll-tpm2
```

---

## Battery and Screen Management

Screen brightness, auto-suspend timeouts, and lid-close behaviour are configured through the standard desktop power settings.

**GNOME:** Settings → Power
- Screen blank timeout
- Automatic suspend when idle (on battery / plugged in)
- Lid close action (suspend / hibernate / nothing)

**KDE:** System Settings → Power Management → Energy Saving
- Separate profiles for battery and AC power
- Screen dimming delay
- Suspend/hibernate trigger
- Lid close action

### From the Terminal

```bash
# Get current battery status
upower -i /org/freedesktop/UPower/devices/battery_BAT0

# Watch battery status in real time
upower --monitor

# Set screen blank timeout (GNOME)
gsettings set org.gnome.desktop.session idle-delay 300

# Disable auto-suspend (GNOME)
gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type 'nothing'
gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-battery-type 'nothing'
```

---

## Backlight and Display Power

```bash
# Check available backlight devices
ls /sys/class/backlight/

# Set brightness directly (replace intel_backlight with your device)
echo 500 | sudo tee /sys/class/backlight/intel_backlight/brightness

# DDC/CI monitor brightness (external monitors)
# ddcutil is pre-installed
ddcutil getvcp 10          # get current brightness
ddcutil setvcp 10 50       # set to 50%
```

---

## Troubleshooting Power Issues

### Suspend Does Not Work / Machine Wakes Immediately

```bash
# Check what woke the machine
journalctl -b 0 -k | grep -i "wake\|acpi\|pm"

# List wake sources
cat /proc/acpi/wakeup

# Disable a wake source (e.g. USB keyboard waking from suspend)
echo XHCI | sudo tee /proc/acpi/wakeup
```

### Hibernate Fails or Causes Boot Loop

```bash
# Verify swap is active
swapon --show

# Check the swapfile in @swap
ls -lh /swap/swapfile

# Verify the resume= parameter is in the UKI
sudo objcopy -O binary --only-section=.cmdline \
    /boot/efi/EFI/shanios/shanios-blue.efi /dev/stdout | strings | grep resume
```

If the resume offset is missing, regenerate the UKI:

```bash
sudo gen-efi generate --slot $(cat /data/current-slot)
```

### TPM2 Unlock Fails After OS Update

The OS update regenerates both UKIs via `gen-efi`. This does not change PCR values for the running slot. However, if something changed in the Secure Boot chain:

```bash
# Manually unlock with passphrase, then re-enroll
sudo gen-efi cleanup-tpm2
sudo gen-efi enroll-tpm2
```

Full power troubleshooting: [docs.shani.dev — Power & Suspend](https://docs.shani.dev/doc/troubleshooting).

---

## Summary for Laptop Users

After installing Shani OS on a laptop:

1. **Enable LUKS2 encryption** during the installer (strongly recommended)
2. **Enroll TPM2** on first boot: `sudo gen-efi enroll-tpm2` — eliminates passphrase at every boot
3. **Hibernate works immediately** — swapfile is already sized and configured
4. **Power profiles** are available in the system menu — no setup required
5. **Firmware updates** via `fwupdmgr update` keep your BIOS and hardware secure
6. After any firmware update, **re-enroll TPM2**: `sudo gen-efi cleanup-tpm2 && sudo gen-efi enroll-tpm2`

---

## Resources

- [docs.shani.dev — Power & Suspend](https://docs.shani.dev/doc/troubleshooting) — troubleshooting reference
- [docs.shani.dev — TPM2 Enrollment](https://docs.shani.dev/doc/security/tpm2) — full TPM2 setup guide
- [Security Without Configuration](https://blog.shani.dev/post/shani-os-security-deep-dive) — LUKS2 and security deep dive
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
