---
slug: shani-os-for-general-desktop-users
title: 'Shani OS for General Desktop Users — Productivity, Office, Web, and Everyday Use'
date: '2026-05-10'
tag: 'Guide'
excerpt: 'Shani OS for everyday desktop use — office suite and document compatibility, web browsing, email, video calls, cloud storage, calendar, notes, PDF tools, and everything a student, office worker, or home user needs. Most of it works from first boot.'
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

Not everyone needs a gaming rig or a research cluster. Many people just need a computer that works reliably for daily tasks — writing documents, browsing the web, attending video calls, managing email, storing files, and not breaking when it updates. Shani OS is well-suited to this. The GNOME edition ships with most everyday apps already installed, and the update model means your system never breaks overnight.

This guide covers the practical everyday stack for home users, students, and office workers — office software, browsers, email, video calls, cloud storage, and the tools that make daily computing straightforward.

Full reference: [docs.shani.dev](https://docs.shani.dev).

---

## What Is Pre-Installed

Both GNOME and KDE editions include the following on first boot, with no additional installation needed:

- **Vivaldi Browser** — feature-rich Chromium-based browser
- **OnlyOffice Desktop Editors** — opens and saves `.docx`, `.xlsx`, `.pptx` natively
- **VLC** — plays virtually any video or audio format
- **Files (Nautilus / Dolphin)** — file manager
- **Calendar** — GNOME Calendar / KDE Kontact
- **Image Viewer** — GNOME Loupe / KDE Gwenview
- **GNOME Text Editor / Kate** — plain text editing
- **Archive Manager** — ZIP, TAR, 7-Zip support
- **Warehouse** — Flatpak app manager
- **Flatseal** — Flatpak sandbox permissions editor

---

## Office Suite

### OnlyOffice (Pre-Installed)

OnlyOffice Desktop Editors is pre-installed on both editions and handles `.docx`, `.xlsx`, and `.pptx` files with excellent compatibility. It is the recommended choice for anyone who exchanges files with Windows or macOS users, since it preserves formatting, fonts, and comments better than most alternatives.

OnlyOffice also has a cloud-connected mode — you can connect it to Nextcloud, OnlyOffice Cloud, or Seafile for collaborative editing.

### LibreOffice

LibreOffice is the other major open-source office suite — more mature and with a broader feature set than OnlyOffice, though slightly less polished in `.docx` round-trip compatibility:

```bash
flatpak install flathub org.libreoffice.LibreOffice
```

LibreOffice includes:
- **Writer** — word processor (`.odt`, `.docx`, `.rtf`)
- **Calc** — spreadsheets (`.ods`, `.xlsx`, `.csv`)
- **Impress** — presentations (`.odp`, `.pptx`)
- **Draw** — diagrams and vector drawing
- **Base** — simple database front-end
- **Math** — equation editor

### Microsoft 365 — Browser

Microsoft 365 (Word, Excel, PowerPoint, Outlook, Teams) works fully in Vivaldi and Firefox via the browser:

- Word Online: `office.com`
- Excel Online: `office.com`
- Outlook: `outlook.com` or `outlook.office365.com`
- Teams: `teams.microsoft.com`

Teams also has a PWA (Progressive Web App) that installs to your app launcher from the browser for a more desktop-like experience.

### Google Workspace — Browser

Google Docs, Sheets, Slides, and Gmail all work identically in Vivaldi and Firefox. No setup required — open the browser and sign in.

---

## Web Browsers

Vivaldi comes pre-installed. Additional browser options:

```bash
# Firefox
flatpak install flathub org.mozilla.firefox

# Brave (privacy-focused Chromium)
flatpak install flathub com.brave.Browser

# Chromium (open-source base)
flatpak install flathub org.chromium.Chromium

# Tor Browser (anonymity)
flatpak install flathub com.github.micahflee.torbrowser-launcher
```

### Browser Sync

Vivaldi and Firefox both support account-based sync (bookmarks, history, passwords, open tabs) across devices. Log in with your account in the browser — no additional setup.

For password management, **Bitwarden** is available as a browser extension and a standalone app:

```bash
flatpak install flathub com.bitwarden.desktop
```

---

## Email

### Thunderbird

Mozilla Thunderbird is the recommended desktop email client — it supports IMAP/POP3, Microsoft Exchange (via DavMail or TB's native EWS support), CalDAV/CardDAV for calendar and contacts sync, and PGP encryption:

```bash
flatpak install flathub org.mozilla.Thunderbird
```

Thunderbird works with Gmail, Outlook, Yahoo, Fastmail, ProtonMail (via Bridge), and any standard IMAP/SMTP provider. Add your email account via Account Settings → Add Mail Account — it auto-configures the server settings for major providers.

### GNOME Evolution

Evolution is the full GNOME personal information manager — email, calendar, contacts, and tasks in one app. It has native Microsoft Exchange support:

```bash
flatpak install flathub org.gnome.Evolution
```

### Geary

Geary is a lightweight, clean email client suited for users who just need email without the full Thunderbird feature set:

```bash
flatpak install flathub org.gnome.Geary
```

---

## Video Calling

### Browser-Based Video Calls (Recommended)

Google Meet, Zoom (web), Microsoft Teams, Jitsi Meet, and WhatsApp Web all work in Vivaldi and Firefox. For most users this is the simplest approach — no app to install.

### Zoom Desktop App

```bash
flatpak install flathub us.zoom.Zoom
```

Grant microphone and camera permissions via Flatseal (pre-installed) if the app does not detect them automatically.

### Microsoft Teams

```bash
# Teams PWA via browser (recommended)
# Open teams.microsoft.com → install as app when prompted

# Or native desktop app
flatpak install flathub com.microsoft.Teams
```

### Signal, WhatsApp, Telegram

```bash
# Signal Desktop
flatpak install flathub org.signal.Signal

# Telegram Desktop
flatpak install flathub org.telegram.desktop

# WhatsApp via browser: web.whatsapp.com
# Or via unofficial desktop client:
flatpak install flathub io.github.mimbrero.WhatsAppDesktop
```

---

## Cloud Storage

### Nextcloud

Nextcloud is the recommended self-hosted or cloud storage solution — it provides file sync, calendar, contacts, video calls, and notes in one open-source platform:

```bash
flatpak install flathub com.nextcloud.desktopclient.nextcloud
```

The Nextcloud desktop client syncs a local folder to your Nextcloud server (or a hosted Nextcloud account). Calendar and contacts sync via CalDAV/CardDAV, configured in Thunderbird or GNOME Calendar.

### Google Drive

```bash
# Rclone (pre-installed) — mount Google Drive as a local directory
rclone config   # follow prompts to add Google Drive
rclone mount gdrive: ~/GoogleDrive --daemon

# Or via Gnome Online Accounts (GNOME) — Settings → Online Accounts → Google
# This integrates Google Drive into Nautilus file manager
```

**GNOME Online Accounts** (Settings → Online Accounts) integrates Google Drive, Nextcloud, Microsoft 365, and other cloud accounts directly into GNOME Files (Nautilus) without any third-party app.

### OneDrive

```bash
# rclone for OneDrive
rclone config   # add OneDrive

# Or via GNOME Online Accounts → Microsoft account
```

### Dropbox

```bash
flatpak install flathub com.dropbox.Client
```

---

## Calendar and Tasks

**GNOME Calendar** is pre-installed on the GNOME edition and connects to CalDAV accounts (Google Calendar, Nextcloud, iCloud) via GNOME Online Accounts.

**GNOME Tasks** (for to-do lists) syncs with GNOME Online Accounts:

```bash
flatpak install flathub org.gnome.Tasks
```

**KOrganizer** on KDE Plasma covers calendar, tasks, and contacts with Exchange and Google integration.

For standalone task management:

```bash
# Planner — elegant project and task manager
flatpak install flathub io.github.alainm23.planner

# Todoist (if you use Todoist)
flatpak install flathub com.todoist.Todoist
```

---

## Notes

```bash
# GNOME Notes (Sticky Notes)
flatpak install flathub org.gnome.Notes

# Obsidian — markdown-based knowledge management
flatpak install flathub md.obsidian.Obsidian

# Joplin — encrypted notes with sync (Nextcloud, Dropbox, OneDrive)
flatpak install flathub net.cozic.joplin_desktop

# Standard Notes — end-to-end encrypted notes
flatpak install flathub org.standardnotes.standardnotes
```

---

## PDF Tools

### Viewing PDFs

**GNOME:** Evince (Document Viewer) is pre-installed and handles PDFs, EPUB, and comic book formats.

**KDE:** Okular is pre-installed and handles PDFs with annotation support.

### PDF Editing and Annotation

```bash
# Okular — PDF annotation (highlight, notes, stamps)
# Pre-installed on KDE; available on GNOME:
flatpak install flathub org.kde.okular

# Xournal++ — full PDF annotation, form filling, handwriting
flatpak install flathub com.github.xournalpp.xournalpp

# LibreOffice Draw — edit PDF content (open PDF in LibreOffice Draw)
flatpak install flathub org.libreoffice.LibreOffice
```

### PDF Conversion and Processing

```bash
# Convert images to PDF
convert image1.jpg image2.jpg output.pdf   # ImageMagick (nix-env -i imagemagick)

# Merge PDFs
pdfunite doc1.pdf doc2.pdf merged.pdf      # poppler-utils

# Extract pages
pdfseparate input.pdf page-%d.pdf

# Word/LibreOffice to PDF
libreoffice --headless --convert-to pdf document.docx

# Or via Nix
nix-env -i poppler_utils
```

---

## Media Playback

**VLC** is pre-installed and handles virtually every video and audio format, including MKV, MP4, AVI, WebM, FLAC, MP3, and streaming URLs.

```bash
# Play a stream
vlc https://stream.url/

# Play with specific audio track
vlc --audio-track 1 video.mkv
```

For music, additional players:

```bash
# Amberol — clean, simple music player
flatpak install flathub io.bassi.Amberol

# Rhythmbox — library-based music player (GNOME)
flatpak install flathub org.gnome.Rhythmbox3

# Elisa — KDE music player
flatpak install flathub org.kde.elisa

# Spotify
flatpak install flathub com.spotify.Client

# YouTube Music via browser (music.youtube.com) or
flatpak install flathub th.angry.PhotoMosh   # YT Music PWA
```

### Streaming Services

Netflix, YouTube, Disney+, Amazon Prime Video, and JioSaavn all work in Vivaldi and Firefox. For Netflix and Disney+ HD/4K, Widevine DRM is included in Vivaldi. Firefox requires installing the Widevine CDM:

- In Firefox: Settings → Digital Rights Management (DRM) Content → ensure it is enabled
- Netflix will then play at standard definition to HD depending on your subscription

---

## File Management and Cloud

**Files (Nautilus / Dolphin)** is the desktop file manager and handles local files, remote servers via SFTP, Samba shares (Windows network shares), and cloud accounts via GNOME Online Accounts.

```bash
# Connect to a Windows network share (Samba) from the file manager:
# GNOME Files: Ctrl+L → smb://server/share
# KDE Dolphin: address bar → smb://server/share

# Or mount via terminal
sudo mount -t cifs //192.168.1.100/share ~/mnt/share \
    -o username=user,password=pass
```

---

## System Utilities

### Archive Manager

**GNOME Archive Manager (file-roller)** is pre-installed and handles ZIP, TAR, 7-Zip, RAR, and most archive formats. Double-click an archive to extract it.

```bash
# Command-line archiving
zip -r archive.zip folder/
tar -czf archive.tar.gz folder/
7z a archive.7z folder/     # nix-env -i p7zip
```

### Calculator

**GNOME Calculator** is pre-installed with basic, scientific, programmer, and unit converter modes. KDE ships **KCalc**.

### System Monitor

**GNOME System Monitor** shows running processes, CPU, memory, and network graphs. For terminal monitoring:

```bash
htop    # interactive process viewer (pre-installed)
btop    # rich terminal resource monitor
nix-env -i btop  # if not present
```

---

## Setting Up Your Printer

Most modern printers work without driver installation on Shani OS. Plug in your printer via USB or connect it to your Wi-Fi network — it should appear in Settings → Printers automatically.

For detailed printer setup, including HP, Epson, Brother, and Canon drivers: [Printing and Scanning on Shani OS](https://blog.shani.dev/post/shani-os-printing-and-scanning).

---

## Keeping Your System Updated

`shani-update` checks for OS updates automatically and shows a desktop notification when one is ready. When you're ready, run `sudo shani-deploy` and reboot. If anything feels wrong after the reboot, `sudo shani-deploy -r` instantly restores the previous OS version — your personal files are never affected either way.

Flatpak apps update automatically every 12 hours. Warehouse (pre-installed) lets you manage updates manually.

For the full update workflow, channels, and rollback reference: [Updates on Shani OS](https://blog.shani.dev/post/shani-os-updates).

---

## Summary: Everyday App Recommendations

| Task | Recommended app | Install |
|---|---|---|
| Office suite | OnlyOffice (pre-installed) or LibreOffice | pre-installed / `flatpak install flathub org.libreoffice.LibreOffice` |
| Web browser | Vivaldi (pre-installed) | pre-installed |
| Email | Thunderbird | `flatpak install flathub org.mozilla.Thunderbird` |
| Video calls | Browser (Meet/Teams/Zoom web) or Zoom app | browser / `flatpak install flathub us.zoom.Zoom` |
| Cloud storage | GNOME Online Accounts + Nextcloud | built-in + `flatpak install flathub com.nextcloud.desktopclient.nextcloud` |
| Notes | Obsidian or Joplin | `flatpak install flathub md.obsidian.Obsidian` |
| PDF tools | Okular or Xournal++ | pre-installed (KDE) / Flathub |
| Messaging | Telegram + Signal | `flatpak install flathub org.telegram.desktop` |
| Music | Spotify or Amberol | `flatpak install flathub com.spotify.Client` |
| Video | VLC (pre-installed) | pre-installed |
| Password manager | Bitwarden | `flatpak install flathub com.bitwarden.desktop` |

---

## Resources

- [Getting Started with Shani OS](https://blog.shani.dev/post/shani-os-getting-started) — installation and first boot
- [Your First Week with Shani OS](https://blog.shani.dev/post/shani-os-first-week) — day-by-day setup guide
- [Migrating to Shani OS](https://blog.shani.dev/post/migrating-to-shani-os) — coming from Ubuntu, Fedora, or Arch
- [Shani OS FAQ](https://blog.shani.dev/post/shani-os-faq) — common questions answered
- [Updates on Shani OS](https://blog.shani.dev/post/shani-os-updates) — update and rollback reference
- [KDE Connect on Shani OS](https://blog.shani.dev/post/shani-os-kde-connect) — phone + desktop integration
- [Printing and Scanning on Shani OS](https://blog.shani.dev/post/shani-os-printing-and-scanning) — printer setup
- [Audio on Shani OS](https://blog.shani.dev/post/shani-os-audio-pipewire) — speakers, headphones, Bluetooth audio
- [Bluetooth on Shani OS](https://blog.shani.dev/post/shani-os-bluetooth) — wireless devices
- [docs.shani.dev](https://docs.shani.dev) — full technical documentation
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
