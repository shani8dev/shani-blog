---
slug: shani-os-accessibility
title: 'Accessibility on Shani OS — Screen Reader, Braille, Magnification, and More'
date: '2026-04-29'
tag: 'Guide'
excerpt: 'Shani OS ships a complete accessibility stack at first boot — Orca screen reader with espeak-ng TTS, braille display support via brltty, display magnification, high-contrast themes, keyboard navigation, and assistive technology infrastructure. Nothing to install.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '6 min'
series: 'Shani OS Guides'
---

Shani OS ships a complete accessibility stack under `shani-accessibility` — pre-installed and available from the moment you log in. This covers screen reading for blind and low-vision users, braille display output, display magnification, high-contrast visual themes, keyboard-only navigation, and speech synthesis.

All accessibility tools survive every OS update and rollback. Your accessibility preferences are stored in your home directory and the `@data` configuration overlay.

---

## The Accessibility Stack

The following are pre-installed on all editions:

- **Orca** — the primary screen reader for GNOME; works with all AT-SPI2-accessible applications
- **espeak-ng** — text-to-speech engine; Orca's default TTS voice; supports 100+ languages including Indian languages
- **espeakup** — connects espeak-ng to the console for speech at the login prompt and in the terminal (no graphical desktop required)
- **speech-dispatcher** — unified speech abstraction layer; applications request TTS through this without needing to know which TTS engine is installed
- **brltty** — braille display driver and translator; supports 150+ braille display models; available after boot (not in initramfs)
- **liblouis** — braille translation tables for 200+ languages including contracted (grade 2) braille
- **at-spi2-core** — accessibility infrastructure that all accessible applications use to expose their UI to Orca and other AT tools
- **ddcutil** — controls monitor brightness and contrast via DDC/CI (Display Data Channel), useful for low-vision users who need specific screen settings

---

## Screen Reader (Orca)

Orca is the standard Linux screen reader. It reads the desktop, application menus, dialog boxes, web content, and text aloud using espeak-ng.

### Enabling Orca

**GNOME:**

- Settings → Accessibility → Screen Reader → toggle on
- Or press `Super+Alt+S` to toggle immediately

**KDE Plasma:**

- System Settings → Accessibility → Screen Reader → enable Orca

**From the terminal:**

```bash
# Start Orca
orca

# Start Orca with verbose mode
orca --debug

# Check Orca preferences
orca --setup
```

### Key Orca Commands

Orca uses the Orca key (by default: `Insert` on desktop, `Caps Lock` on laptop). Common shortcuts:

```
Orca+F1           — Orca help
Orca+Space        — toggle flat review mode
Orca+H            — read current window title
Orca+T            — read current time
Orca+F            — read current focus
Orca+Up Arrow     — read current line
Orca+Right Arrow  — read next word
Tab               — move between interactive elements
```

Full key binding reference in Orca's preferences (`orca --setup`).

---

## Text-to-Speech (espeak-ng)

espeak-ng provides TTS voices for Orca and can be used independently:

```bash
# Speak text from the terminal
espeak-ng "Hello, this is Shani OS"

# Speak a file
espeak-ng -f document.txt

# List available voices (includes Indian languages)
espeak-ng --voices

# Use a specific voice
espeak-ng -v hi "नमस्ते"          # Hindi
espeak-ng -v ta "வணக்கம்"         # Tamil
espeak-ng -v en-us "Hello"        # US English
espeak-ng -v en-in "Hello"        # Indian English

# Control speed and pitch
espeak-ng -s 150 -p 60 "Slower, lower pitch"

# Write to a WAV file
espeak-ng "Text to save" -w output.wav
```

### speech-dispatcher

For applications that use speech-dispatcher (rather than espeak-ng directly):

```bash
# Test speech-dispatcher
spd-say "Testing speech output"

# Check which TTS module is active
spd-conf -D

# List available voices
spd-say -L
```

---

## Braille Display Support (brltty)

brltty provides braille display support. It is pre-installed but starts on-demand when a braille display is connected.

```bash
# Check brltty status
systemctl status brltty

# Start brltty manually
sudo systemctl start brltty

# List supported braille display models
brltty --list-devices

# Configure your display model
sudo nano /etc/brltty.conf
# Set: braille-driver <your-driver>
# Set: braille-device <your-device>  e.g. usb: or bluetooth:
```

Common display driver codes: `al` (Alva), `bm` (Baum), `eu` (EuroBraille), `fs` (FreedomScientific), `ht` (Handy Tech), `hw` (HumanWare), `ninepoint`, `vs` (VisioBraille).

`liblouis` provides the translation tables for contracting and expanding braille in 200+ languages including Bharati (unified Indian language braille), Tamil braille, and Hindi/Devanagari braille.

---

## Visual Accessibility

### Display Magnification

**GNOME:**
- Settings → Accessibility → Zoom → toggle on
- Magnification factor, colour effects, and crosshair are configurable
- Or press `Super+Alt+8` to toggle zoom

**KDE Plasma:**
- System Settings → Accessibility → Desktop Zoom

```bash
# GNOME: control zoom from terminal
gsettings set org.gnome.accessibility.magnifier magnifier-active true
gsettings set org.gnome.accessibility.magnifier mag-factor 2.0

# Quick zoom in/out (keyboard)
# Super+= or Super+scroll to zoom in
# Super-- to zoom out
```

### High Contrast Themes

**GNOME:**
- Settings → Accessibility → High Contrast → toggle on
- Alternatively, the Papirus icon theme (pre-installed) has good contrast

**KDE Plasma:**
- System Settings → Colors → choose "High Contrast" scheme
- System Settings → Accessibility → toggle various contrast options

### Cursor Size

**GNOME:** Settings → Accessibility → Cursor Size

**KDE:** System Settings → Input Devices → Mouse → Cursor Size

```bash
# Set cursor size via gsettings (GNOME)
gsettings set org.gnome.desktop.interface cursor-size 48
```

### Colour Blindness Filters

**GNOME:** Settings → Accessibility → Colour Filters — choose from Deuteranopia, Protanopia, Tritanopia, or Greyscale

---

## Keyboard and Input Accessibility

### Sticky Keys

Hold a modifier key (Ctrl, Alt, Shift) and it stays active until you press the next key. For users who cannot hold multiple keys simultaneously.

**GNOME:** Settings → Accessibility → Typing → Sticky Keys

**KDE:** System Settings → Accessibility → Sticky Keys

### Slow Keys

Introduces a delay before a keypress is accepted. Prevents accidental key presses.

**GNOME:** Settings → Accessibility → Typing → Slow Keys

### Bounce Keys

Ignores rapid repeated keypresses. For users with tremors.

**GNOME:** Settings → Accessibility → Typing → Bounce Keys

### On-Screen Keyboard

**GNOME:** the on-screen keyboard activates automatically when a text field is focused and no physical keyboard is detected. It can be forced on in Settings → Accessibility → Typing → Screen Keyboard.

**KDE:** Virtual keyboard is available via Input Method settings.

---

## Monitor Brightness via DDC/CI

`ddcutil` controls monitor brightness and contrast through the DDC/CI standard without requiring proprietary software:

```bash
# List detected monitors
ddcutil detect

# Get current brightness (feature 0x10)
ddcutil getvcp 10

# Set brightness to 40%
ddcutil setvcp 10 40

# Get contrast
ddcutil getvcp 12

# Get all adjustable features
ddcutil capabilities
```

This works on most external monitors and some laptop panels. Useful for users with photosensitivity or specific contrast requirements.

---

## Accessibility on the Login Screen

`espeakup` connects espeak-ng to the console speech bridge — this means speech is available at the TTY login prompt before the graphical desktop loads. This is particularly useful for headless or fallback access.

GDM (GNOME's login manager) and SDDM (KDE's login manager) both support Orca at the graphical login screen — Orca auto-starts when the login screen detects an accessibility request.

---

## Resources

- [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide) — when things go wrong
- [Shani OS FAQ](https://blog.shani.dev/post/shani-os-faq) — common questions answered
- GNOME Accessibility: [Settings → Accessibility]
- KDE Accessibility: [System Settings → Accessibility]
- Orca documentation: [gnome.org/orca](https://help.gnome.org/users/orca/stable/)
- brltty documentation: [brltty.app](https://brltty.app)
- [Telegram community](https://t.me/shani8dev) — questions and support

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
