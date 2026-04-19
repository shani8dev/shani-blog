---
slug: shani-os-indian-language-support
title: 'Indian Language Support on Shani OS — Devanagari, Tamil, Telugu, and More'
date: '2026-05-03'
tag: 'Guide'
excerpt: 'Indian language support on Shani OS is designed in from the start — not bolted on. Devanagari, Tamil, Telugu, Kannada, Malayalam, Gujarati, Punjabi, Bengali, and more: correct font rendering, IBus multilingual input, and Indian-English locale all configured at first boot.'
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

Indian language support on Shani OS is not an afterthought or an optional add-on — it is a first-class feature built in from the start. This reflects the project's origins: Shani OS is built in India, for users who should not have to do extra work to use their native scripts on their operating system.

Every script in the list below renders correctly at first boot without installing any additional packages: Devanagari (Hindi, Marathi, Sanskrit, Nepali), Tamil, Telugu, Kannada, Malayalam, Gujarati, Punjabi (Gurmukhi), Bengali (Bangla), Odia, Assamese, Urdu (Nastaliq), and Sindhi. The fontconfig pre-configuration at `90-indian-fonts.conf` ensures scripts render properly across all GTK, Qt, and web applications.

---

## What Is Pre-Configured

**Fonts:** The Noto fonts family covers every major Indian script with consistent rendering quality. `noto-fonts` (Latin, Greek, Cyrillic), `noto-fonts-cjk` (CJK), and `noto-fonts-emoji` are all installed. Fontconfig is tuned with `90-indian-fonts.conf` which sets Noto as the preferred font family for each Indic script and configures correct rendering (ligature support, consonant clusters, vowel marks).

**Input method:** IBus (Intelligent Input Bus) is the default input method framework, configured at first boot. It handles switching between scripts while typing without affecting the system locale.

**IBus engines pre-installed:**
- `ibus-typing-booster` — predictive, context-aware input with support for multiple languages simultaneously
- `ibus-libpinyin` — Chinese (Simplified and Traditional)
- `ibus-anthy` — Japanese
- `ibus-hangul` — Korean
- `ibus-unikey` — Vietnamese
- `m17n-lib` + `m17n-db` — transliteration for Arabic, Thai, and Indic scripts

**Locale:** `glibc-locales` with all locale data is installed. Indian regional locales (`hi_IN`, `ta_IN`, `te_IN`, `kn_IN`, `ml_IN`, `mr_IN`, `gu_IN`, `pa_IN`, `bn_IN`, etc.) are available without any additional packages.

---

## Setting the System Locale

During installation, you select your language and region. To change after installation:

**GNOME:** Settings → Region & Language → Language / Formats

**KDE:** System Settings → Regional Settings → Language / Formats

**From the terminal:**

```bash
# List available locales
locale -a | grep -i "_IN"

# Set system locale (Hindi)
sudo localectl set-locale LANG=hi_IN.UTF-8

# Set locale for your user session only
echo "export LANG=hi_IN.UTF-8" >> ~/.zshrc
source ~/.zshrc

# Check current locale
locale
```

Common Indian locale identifiers:
- `hi_IN.UTF-8` — Hindi
- `ta_IN.UTF-8` — Tamil
- `te_IN.UTF-8` — Telugu
- `kn_IN.UTF-8` — Kannada
- `ml_IN.UTF-8` — Malayalam
- `mr_IN.UTF-8` — Marathi
- `gu_IN.UTF-8` — Gujarati
- `pa_IN.UTF-8` — Punjabi
- `bn_IN.UTF-8` — Bengali
- `en_IN.UTF-8` — Indian English (dates in DD/MM/YYYY, correct currency symbol)

---

## IBus Input Setup

IBus runs automatically in both GNOME and KDE sessions. To add Indian language input:

**GNOME:**

Settings → Keyboard → Input Sources → click `+` → Other → select your language → choose the input method

For Hindi: `Hindi (Devanagari)` — choose between `Phonetic` (type Roman, get Devanagari) or `Inscript` (standard Indian keyboard layout).

**KDE:**

System Settings → Input Method → Add IBus engine

Switch between input methods: `Super+Space` (GNOME) or configured shortcut (KDE).

### IBus Typing Booster

`ibus-typing-booster` is particularly powerful for Indian language input. It provides:
- Predictive word completion as you type
- Support for typing in multiple languages simultaneously (e.g., mixing Hindi and English)
- Emoji input
- Clipboard history integration

Configure it via the IBus preferences: right-click the IBus icon in the system tray → Preferences → Typing Booster.

### Transliteration Input (m17n)

`m17n-lib` provides transliteration-based input for Indic scripts — type in Roman characters and get the corresponding Indic script output.

```
Type: na-ma-s-te   →  नमस्ते  (Hindi, using ibus-m17n hi-itrans)
Type: vanakkam     →  வணக்கம்  (Tamil, using ibus-m17n ta-itrans)
```

To use m17n transliteration, add the relevant m17n engine in your IBus input sources:
- `hi (itrans)` for Hindi transliteration
- `ta (itrans)` for Tamil transliteration
- `te (itrans)` for Telugu transliteration

---

## Font Rendering

All Indian scripts require complex text shaping — consonant clusters, vowel marks (matras), half-forms, and ligatures must be rendered correctly. Shani OS uses HarfBuzz for text shaping, which correctly handles all these features for all supported scripts.

If you find that a specific application renders Indian scripts incorrectly (usually older applications that use their own text rendering), try:

```bash
# Force HarfBuzz for GTK apps
export GTK_USE_GLYPH_CACHE=1

# For Qt apps
export QT_ENABLE_HIGHDPI_SCALING=1
```

Web browsers (Vivaldi, Firefox) use their own text rendering and handle Indian scripts correctly without any configuration.

### Checking Font Coverage

```bash
# Check which font is used for a specific character (requires fc-match)
fc-match :lang=hi      # font for Hindi
fc-match :lang=ta      # font for Tamil
fc-match :lang=te      # font for Telugu

# List all fonts that support a specific language
fc-list :lang=hi | head -10
```

---

## Indian Calendar and Date Formats

Setting your locale to an Indian regional locale (`hi_IN`, `en_IN`, etc.) automatically configures:
- Date format: DD/MM/YYYY
- Currency: ₹ (Indian Rupee)
- Number format: Indian numbering system (lakhs, crores) in supported applications
- First day of the week: Monday (standard in India)

For Indian calendar systems (Vikram Samvat, Saka calendar), LibreOffice and some other applications support Indian calendar display. These are niche needs not covered by the OS locale system.

---

## Indian Language TTS (espeak-ng)

`espeak-ng` (pre-installed as part of the accessibility stack) includes voices for Indian languages:

```bash
# Hindi TTS
espeak-ng -v hi "नमस्ते, यह शानि ओएस है"

# Tamil TTS
espeak-ng -v ta "வணக்கம்"

# Telugu TTS
espeak-ng -v te "నమస్కారం"

# Bengali TTS
espeak-ng -v bn "নমস্কার"

# Gujarati TTS
espeak-ng -v gu "નમસ્તે"

# List all Indian voices
espeak-ng --voices | grep -E " hi| ta| te| kn| ml| mr| gu| pa| bn"
```

---

## For Government and Institutional Use

For government, public sector, and educational deployments requiring Indian language support:

- All official Indian language scripts are fully supported out of the box
- No proprietary fonts or third-party packages required
- The entire font stack (Noto) is open source and freely distributable
- IBus and m17n libraries are open source
- No foreign telemetry — Shani OS collects zero usage data
- LUKS2 encryption with keys that never leave the device — no foreign key escrow

For OEM and fleet deployments with Indian language requirements, contact [shani.dev — Enterprise](https://shani.dev#enterprise).

---

## Resources

- [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide) — when things go wrong
- [Shani OS FAQ](https://blog.shani.dev/post/shani-os-faq) — common questions answered
- [docs.shani.dev — Shell & Environment](https://docs.shani.dev/doc/updates/shell) — locale configuration reference
- [IBus documentation](https://github.com/ibus/ibus/wiki)
- [Noto Fonts](https://fonts.google.com/noto) — the font family covering all Indian scripts
- [Accessibility on Shani OS](https://blog.shani.dev/post/shani-os-accessibility) — espeak-ng Indian TTS, braille support
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
> *भारत में बना — Indian languages, first class.*
