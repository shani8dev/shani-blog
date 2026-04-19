---
slug: shani-os-audio-pipewire
title: 'Audio on Shani OS — PipeWire, WirePlumber, JACK, and Professional Audio'
date: '2026-05-05'
tag: 'Guide'
excerpt: 'Shani OS uses PipeWire 1.4.x as its audio stack — simultaneously compatible with ALSA, PulseAudio, and JACK. This guide covers everyday audio management, Bluetooth codec selection, fixing common issues, and setting up low-latency professional audio workflows.'
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

PipeWire is the audio and video routing daemon on Shani OS. It replaces PulseAudio for desktop audio while simultaneously providing JACK-compatible low-latency audio for professional workflows — using the same daemon. ALSA applications, PulseAudio applications, JACK applications, and video capture all work through PipeWire without any configuration.

WirePlumber is the session manager that sits on top of PipeWire — it makes routing decisions: which microphone goes to which app, which speaker gets output from which process, how Bluetooth devices connect, and how JACK clients are managed.

Full reference: [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide).

---

## Everyday Audio Management

### Checking Audio Status

```bash
# Overall PipeWire status
systemctl --user status pipewire pipewire-pulse wireplumber

# List all audio sinks (output devices)
pactl list sinks short

# List all audio sources (input devices)
pactl list sources short

# Detailed sink info (sample rate, codec, etc.)
pactl list sinks

# WirePlumber device view
wpctl status
```

### Setting Default Output and Input

```bash
# Set default sink (output) by name
pactl set-default-sink alsa_output.pci-0000_00_1f.3.analog-stereo

# Set default source (input) by name
pactl set-default-source alsa_input.pci-0000_00_1f.3.analog-stereo

# Using wpctl (simpler)
wpctl status                    # get device IDs
wpctl set-default 50            # set default sink to device 50
wpctl set-default 60            # set default source to device 60
```

**GNOME:** click the volume icon in the top bar → select output/input device

**KDE:** click the volume icon in the system tray → select output/input

### Volume Control

```bash
# Set volume (0–150%, above 100% applies digital amplification)
wpctl set-volume @DEFAULT_AUDIO_SINK@ 80%
wpctl set-volume @DEFAULT_AUDIO_SINK@ 100%

# Mute/unmute
wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle
wpctl set-mute @DEFAULT_AUDIO_SOURCE@ 1    # mute mic
wpctl set-mute @DEFAULT_AUDIO_SOURCE@ 0    # unmute mic

# Per-application volume
pactl list sink-inputs short       # get sink-input index
pactl set-sink-input-volume 42 70% # set volume for specific app
```

---

## Restarting the Audio Stack

If audio stops working or becomes glitchy:

```bash
# Restart all PipeWire components
systemctl --user restart pipewire pipewire-pulse wireplumber

# Or restart just WirePlumber (routing decisions) without dropping audio
systemctl --user restart wireplumber
```

This takes about one second and restores audio without a reboot.

---

## Sample Rate and Bit Depth

PipeWire automatically negotiates the best sample rate for your hardware. To check and configure:

```bash
# Check current sample rate
pw-cli info all | grep -i "rate\|format"

# Or via pactl
pactl list sinks | grep -i "sample spec\|format"
```

To set a fixed sample rate (useful for professional audio or when you need exactly 192 kHz):

```bash
# Create user PipeWire config directory
mkdir -p ~/.config/pipewire

# Copy default config
cp /usr/share/pipewire/pipewire.conf ~/.config/pipewire/

# Edit and set default sample rate
nano ~/.config/pipewire/pipewire.conf
# Find and modify:
# default.clock.rate = 48000    # change to 44100, 96000, 192000, etc.
# default.clock.quantum = 1024  # buffer size (lower = lower latency)

# Restart
systemctl --user restart pipewire wireplumber
```

---

## JACK-Compatible Low-Latency Audio

PipeWire includes a JACK server emulation layer (`pipewire-jack`), pre-installed on Shani OS. JACK applications work without any separate JACK daemon:

```bash
# Verify JACK compatibility
jack_lsp              # list JACK ports (works via pipewire-jack)
jack_connect ...      # connect JACK ports

# Check JACK latency
jack_latency

# Run a JACK application (e.g. Ardour, Carla)
# These apps connect to PipeWire's JACK interface automatically
```

For professional audio with Ardour, Carla, or other DAW software:

```bash
# Install Ardour via Flatpak
flatpak install flathub org.ardour.Ardour

# Install Carla (plugin host)
flatpak install flathub studio.kx.carla
```

Both connect to PipeWire's JACK interface automatically.

### Lowering Latency for Professional Audio

For recording or live processing, lower the buffer size:

```bash
# In ~/.config/pipewire/pipewire.conf
# default.clock.quantum = 256    # ~5ms at 48kHz
# default.clock.quantum = 128    # ~2.7ms at 48kHz
# default.clock.min-quantum = 64 # allow minimum 64 samples

# Restart
systemctl --user restart pipewire wireplumber
```

Users in the `realtime` group (all Shani OS users are added automatically) can use real-time scheduling, which is required for stable low-latency audio:

```bash
# Verify realtime group membership
groups | grep realtime

# HPET and RTC are accessible for the realtime group
ls -la /dev/hpet /dev/rtc0
```

---

## Bluetooth Audio Codecs

PipeWire handles Bluetooth audio. Codec selection and management:

```bash
# List Bluetooth audio profiles for a device
pactl list cards | grep -A 30 "bluez_card"

# Switch to LDAC (best quality)
pactl set-card-profile bluez_card.XX_XX_XX_XX_XX_XX a2dp-sink-ldac

# Switch to AAC
pactl set-card-profile bluez_card.XX_XX_XX_XX_XX_XX a2dp-sink-aac

# Switch to headset profile (for calls with microphone)
pactl set-card-profile bluez_card.XX_XX_XX_XX_XX_XX headset-head-unit-msbc

# Check what is active
pactl list cards | grep "Active Profile"
```

Supported codecs: SBC, AAC, aptX, aptX HD, LDAC (990 kbps), LC3 (Bluetooth LE Audio). The best available codec is negotiated automatically.

---

## EasyEffects — System-Wide Audio Processing

EasyEffects is not pre-installed but is available on Flathub. It provides system-wide audio processing (equaliser, compressor, limiter, reverb, noise cancellation) for all applications:

```bash
flatpak install flathub com.github.wwmm.easyeffects
```

EasyEffects integrates with PipeWire and processes audio from any source or to any sink, including microphone noise cancellation for video calls.

---

## Audio Over HDMI / DisplayPort

HDMI and DisplayPort audio appears as a separate audio output device. Switch to it in the volume control or:

```bash
# List outputs including HDMI
pactl list sinks short | grep -i hdmi

# Set HDMI as default
pactl set-default-sink alsa_output.pci-0000_01_00.1.hdmi-stereo
```

---

## Intel DSP Audio (SOF Firmware)

Some Intel laptops (ThinkPads, HP laptops from 2019 onwards) use Intel Sound Open Firmware for their audio DSP. `sof-firmware` is pre-installed on Shani OS. If audio is not working on a newer Intel laptop:

```bash
# Check if SOF firmware is loading
dmesg | grep -i "sof\|sound open"

# Check available sound cards
cat /proc/asound/cards

# Check WirePlumber for device detection
wpctl status
journalctl --user -u wireplumber -n 50
```

Full audio troubleshooting: [docs.shani.dev — Audio Issues](https://docs.shani.dev/doc/troubleshooting).

---

## Troubleshooting

### No Audio at Boot

```bash
systemctl --user restart pipewire pipewire-pulse wireplumber
pactl list sinks short     # verify sinks exist
```

### Audio Works But Sounds Distorted

```bash
# Check sample rate mismatch
pactl list sinks | grep "Sample Spec"
# If showing unusual format, reset PipeWire config
rm ~/.config/pipewire/pipewire.conf 2>/dev/null
systemctl --user restart pipewire wireplumber
```

### Microphone Not Working in Flatpak Apps

Flatpak apps need explicit microphone permission:

```bash
# Grant microphone to a specific app
flatpak override --user --device=all com.example.App
# Or use Flatseal (pre-installed) for graphical permission management
```

### No Sound from Specific Application

```bash
# Check if the app is sending audio
pactl list sink-inputs     # shows playing apps

# If the app is missing, check if it's muted in the volume mixer
pavucontrol &              # install via flatpak if needed
```

---

## Resources

- [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide) — when things go wrong
- [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide) — audio troubleshooting
- [PipeWire documentation](https://pipewire.pages.freedesktop.org/pipewire/)
- [Bluetooth on Shani OS](https://blog.shani.dev/post/shani-os-bluetooth) — Bluetooth audio codec guide
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
