---
slug: shani-os-bluetooth
title: 'Bluetooth on Shani OS — Headphones, Controllers, File Transfer, and Pairing'
date: '2026-04-25'
tag: 'Guide'
excerpt: 'Bluetooth on Shani OS works at first boot for audio, gaming controllers, keyboards, mice, file transfer, and tethering. Paired devices persist across every OS update and rollback. Here is everything you need to know.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '5 min'
series: 'Shani OS Guides'
---

Shani OS ships the full BlueZ 5.x Bluetooth stack with support for audio (including high-quality codecs), gaming controllers, keyboards, mice, file transfer, and mobile tethering. Everything works at first boot.

Bluetooth pairing data lives in `/var/lib/bluetooth`, which is bind-mounted from `/data/varlib/bluetooth` — your paired devices survive every OS update and rollback. You pair a device once and it stays paired.

Full reference: [docs.shani.dev — Bluetooth](https://docs.shani.dev/doc/troubleshooting).

---

## What Works at First Boot

- **Headphones and speakers** — SBC, AAC, aptX, LDAC, and LC3 codecs all supported via PipeWire
- **Gaming controllers** — PlayStation DualShock 4, DualSense 5, Xbox controllers (via xpadneo or kernel driver), Nintendo Switch Pro, 8BitDo controllers, Steam Controller
- **Keyboards and mice** — standard HID Bluetooth profile
- **File transfer** — OBEX via GNOME Files (Nautilus) or KDE's Bluetooth settings
- **Phone tethering** — personal hotspot sharing from an Android or iOS phone
- **Bluetooth printing** — via `bluez-cups` (pre-installed)

---

## Pairing Devices

### GNOME

GNOME Settings → Bluetooth → enable Bluetooth → put your device in pairing mode → click the device name → confirm the pairing code if prompted.

Bluedevil widget (GNOME): click the Bluetooth icon in the top bar.

### KDE Plasma

System Settings → Bluetooth, or click the Bluetooth icon in the system tray. KDE's Bluedevil is pre-installed and handles pairing from the taskbar.

### Command Line

```bash
# Start the Bluetooth controller
bluetoothctl

# Inside bluetoothctl interactive shell:
power on
agent on
default-agent
scan on

# Wait for your device to appear, then:
pair XX:XX:XX:XX:XX:XX
trust XX:XX:XX:XX:XX:XX
connect XX:XX:XX:XX:XX:XX

scan off
exit
```

```bash
# One-liner alternatives (non-interactive)
bluetoothctl power on
bluetoothctl scan on &
bluetoothctl pair XX:XX:XX:XX:XX:XX
bluetoothctl trust XX:XX:XX:XX:XX:XX
bluetoothctl connect XX:XX:XX:XX:XX:XX

# List paired devices
bluetoothctl devices

# Disconnect a device
bluetoothctl disconnect XX:XX:XX:XX:XX:XX

# Remove a pairing
bluetoothctl remove XX:XX:XX:XX:XX:XX
```

---

## Audio Codecs

PipeWire handles Bluetooth audio on Shani OS. The following codecs are supported and negotiated automatically based on what your headphones support:

- **SBC** — universal baseline codec
- **AAC** — better quality than SBC; supported by most headphones
- **aptX / aptX HD** — Qualcomm codec; wide support on mid-range headphones
- **LDAC** — Sony's high-resolution codec for Bluetooth audio up to 990 kbps
- **LC3** — Bluetooth LE Audio codec; used by the newest headphones

Codec negotiation is automatic. If your headphones support LDAC, PipeWire will use it. No configuration required.

To check which codec is in use:

```bash
# Check the active audio codec for a Bluetooth device
pactl list cards | grep -A 20 "Name: bluez"
# Look for 'Active Profile' — e.g. 'a2dp-sink-ldac'

# Switch profiles if needed
pactl set-card-profile bluez_card.XX_XX_XX_XX_XX_XX a2dp-sink-ldac
pactl set-card-profile bluez_card.XX_XX_XX_XX_XX_XX headset-head-unit
```

---

## Gaming Controllers

Xbox, PlayStation, Nintendo Switch, and 8BitDo controllers all work via Bluetooth. No drivers to install — the kernel drivers and game-devices-udev rules are pre-configured.

```bash
# Pair a PlayStation DualSense (PS5 controller)
# Hold PS + Create buttons until the light bar flashes
bluetoothctl
> scan on
> pair XX:XX:XX:XX:XX:XX
> trust XX:XX:XX:XX:XX:XX
> connect XX:XX:XX:XX:XX:XX

# Pair an Xbox controller
# Hold Xbox button until it flashes rapidly
bluetoothctl
> scan on
> pair XX:XX:XX:XX:XX:XX

# Check controller is detected
ls /dev/input/js*
cat /proc/bus/input/devices | grep -A 5 "DualSense\|Xbox\|Switch"
```

In Steam, controllers are recognised automatically through Steam Input. For non-Steam games, `AntiMicroX` (Flatpak) handles button remapping.

---

## File Transfer

Sending files to a phone or another computer over Bluetooth:

**GNOME:** Open Nautilus → right-click a file → Send To → Bluetooth. Or open the Bluetooth settings and use the "Send File" option for a paired device.

**KDE:** Open Dolphin → right-click a file → Send via Bluetooth.

**Command line:**
```bash
# Send a file to a Bluetooth device
bluetooth-sendto --device=XX:XX:XX:XX:XX:XX file.pdf
```

Receiving files — GNOME and KDE both show a notification when another device sends a file. Accept it to save to `~/Downloads`.

---

## Phone Tethering

Android and iPhone personal hotspot tethering over Bluetooth (Bluetooth PAN) works with NetworkManager:

```bash
# Pair your phone first (see above)
# Then in NetworkManager, use the phone as a network device
nmcli connection show  # check for bluetooth connection
nmcli device connect XX:XX:XX:XX:XX:XX  # connect via BT
```

In GNOME Settings → Network → Bluetooth, your paired phone should appear as a network source when its hotspot is active.

---

## Troubleshooting

### Bluetooth Adapter Not Found

```bash
# Check if adapter is detected
hciconfig -a
rfkill list bluetooth

# Unblock if soft-blocked
rfkill unblock bluetooth

# Restart Bluetooth service
sudo systemctl restart bluetooth
```

### Device Pairs But Won't Connect

```bash
# Remove and re-pair
bluetoothctl remove XX:XX:XX:XX:XX:XX
bluetoothctl scan on
bluetoothctl pair XX:XX:XX:XX:XX:XX
bluetoothctl trust XX:XX:XX:XX:XX:XX

# Check logs for errors
journalctl -u bluetooth -n 50
```

### Headphones Connect But No Audio

```bash
# Check PipeWire sees the device
pactl list cards | grep -i bluetooth

# Restart PipeWire audio stack
systemctl --user restart pipewire pipewire-pulse wireplumber

# Manually set audio output to Bluetooth headphones
pactl set-default-sink bluez_output.XX_XX_XX_XX_XX_XX.1
```

### Audio Quality Is Poor (Stuck on SBC)

Some headphones need a nudge to negotiate a better codec:

```bash
# Check available profiles
pactl list cards | grep -A 30 "bluez_card"

# Force a higher-quality profile
pactl set-card-profile bluez_card.XX_XX_XX_XX_XX_XX a2dp-sink-ldac
# or
pactl set-card-profile bluez_card.XX_XX_XX_XX_XX_XX a2dp-sink-aac
```

Full Bluetooth troubleshooting: [docs.shani.dev — Bluetooth](https://docs.shani.dev/doc/troubleshooting).

---

## Resources

- [docs.shani.dev — Bluetooth](https://docs.shani.dev/doc/troubleshooting) — troubleshooting reference
- [Gaming on Shani OS](https://blog.shani.dev/post/shani-os-gaming-deep-dive) — gaming controller configuration
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
