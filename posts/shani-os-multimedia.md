---
slug: shani-os-multimedia
title: 'Multimedia on Shani OS — Codecs, Media Players, Streaming, and Hardware Decoding'
date: '2026-05-10'
tag: 'Guide'
excerpt: 'Everything multimedia on Shani OS — hardware-accelerated video decode for Intel, AMD, and NVIDIA, codec support, streaming services with Widevine DRM, MPV and VLC, media servers, DLNA/Chromecast, and managing a media library with Jellyfin or Plex.'
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

Shani OS ships with the GStreamer and FFmpeg multimedia frameworks, full VA-API/VDPAU hardware video decode, and VLC pre-installed. This means virtually any video or audio format plays at first boot without installing extra codecs — including H.264, H.265/HEVC, VP9, AV1, and more. Hardware-accelerated decode is active on Intel, AMD, and NVIDIA GPUs, keeping CPU usage low during video playback and extending battery life on laptops.

This guide covers everyday media playback, streaming services with DRM, media server setup, and managing a home media library.

---

## Hardware Video Decoding

Hardware video decoding offloads video decode from the CPU to dedicated hardware on your GPU — dramatically reducing power consumption and enabling 4K/8K playback on modest hardware.

### How It Works on Shani OS

| Hardware | API | What it accelerates |
|---|---|---|
| Intel (8th gen+) | VA-API (i965 / iHD driver) | H.264, H.265, VP9, AV1, JPEG |
| AMD (RX 5000+) | VA-API (RADV/Mesa) | H.264, H.265, VP9, AV1 |
| NVIDIA | VA-API via `libva-nvidia-driver` | H.264, H.265, VP9, AV1 |
| All vendors | VDPAU (compatibility layer) | H.264, MPEG-2 (legacy) |

All three vendor stacks are pre-configured on Shani OS. No manual driver or codec installation is needed.

```bash
# Verify hardware decode is available
vainfo --display drm --device /dev/dri/renderD128

# Check which codecs are hardware-accelerated
vainfo 2>&1 | grep -i "VAProfile"

# Test hardware decode with FFmpeg
ffmpeg -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 \
    -i video.mkv -f null -
```

### Checking VA-API in Practice

```bash
# Check available DRI devices
ls /dev/dri/

# Intel — check the correct VA-API driver
LIBVA_DRIVER_NAME=iHD vainfo      # Intel Gen 9+ (preferred)
LIBVA_DRIVER_NAME=i965 vainfo     # Intel older

# AMD — RADV/Mesa VA-API
vainfo

# NVIDIA — libva-nvidia-driver (pre-installed)
LIBVA_DRIVER_NAME=nvidia vainfo
```

---

## VLC — Pre-Installed

VLC is pre-installed on both editions and handles hardware-accelerated playback automatically:

- Play any `.mkv`, `.mp4`, `.avi`, `.mov`, `.flv`, `.webm`, `.ts`, `.m2ts` file
- Streaming URLs, RTSP streams, and online video
- DVDs and Blu-rays (with appropriate decryption library — see below)
- DLNA network media browsing

VLC uses VA-API for hardware decode when available. Check: Tools → Preferences → Input/Codecs → Hardware-accelerated decoding → VA-API via DRM.

### DVD Playback

Standard DVD playback requires libdvdcss for decrypting CSS-encrypted discs. Since this library cannot be pre-installed for legal reasons, install it via Nix:

```bash
nix-env -i libdvdcss
```

Then restart VLC — it picks up the library automatically.

### Blu-ray Playback

Blu-ray decryption on Linux requires `libbluray` (handles menus and navigation) and `libaacs` (handles AACS encryption via a keys database). Install via Nix and configure the keys database — the KEYDB.cfg file from vlc-bluray.whoknowsmy.name covers most commercial Blu-rays.

---

## MPV — Lightweight and Scriptable

MPV is a lightweight but extremely capable video player preferred by power users for its hardware decode support, scripting, and shader pipeline:

```bash
flatpak install flathub io.mpv.Mpv
# or via Nix:
nix-env -i mpv
```

MPV uses VA-API hardware decode by default. Common usage:

```bash
# Play with hardware decoding (auto-detect)
mpv --hwdec=auto video.mkv

# Play with specific hardware decode method
mpv --hwdec=vaapi video.mkv

# Play a network stream
mpv https://stream.url/playlist.m3u8

# Play with subtitles from a specific file
mpv --sub-file=subtitles.srt video.mkv

# High quality upscaling for SD/HD content on a 4K display
mpv --profile=gpu-hq video.mkv

# Screenshot during playback
# Press 's' during playback
```

### MPV Scripts and Shaders

MPV's Lua scripting API enables a rich extension ecosystem:

```bash
# Install mpv scripts to ~/.config/mpv/scripts/

# Popular scripts:
# uosc — modern UI overlay for MPV
# mpv-seek-dict — chapter navigation
# autoload — automatically load next file in directory
# sponsorblock — skip YouTube sponsorblock segments (with yt-dlp)

# Anime4K shaders — real-time anime upscaling
# Download from: https://github.com/bloc97/Anime4K
# Place in ~/.config/mpv/shaders/
```

---

## Streaming Services and Widevine DRM

Netflix, Disney+, Amazon Prime Video, YouTube Premium, Spotify, and other DRM-protected streaming services require Widevine — Google's DRM content decryption module.

### Vivaldi (Pre-Installed)

Vivaldi ships with Widevine included. Netflix, Disney+, and Amazon Prime Video work at HD quality immediately in Vivaldi. No setup required.

### Firefox

Firefox supports Widevine but needs it enabled:

1. Firefox → Settings → General → Digital Rights Management (DRM) Content → ensure "Play DRM-controlled content" is enabled
2. Firefox will automatically download the Widevine CDM on first use on a DRM-protected site

```bash
# Verify Widevine is installed in Firefox
# About:addons → Plugins → Widevine Content Decryption Module
```

Firefox's Widevine implementation currently supports up to 1080p on Netflix (not 4K, which requires the Edge/Chrome implementation).

### Chromium and Other Browsers

The open-source Chromium flatpak does not include Widevine by default. Brave browser (Chromium-based) includes Widevine and works identically to Vivaldi for streaming:

```bash
flatpak install flathub com.brave.Browser
```

### Streaming Quality Comparison

| Service | Vivaldi | Firefox | Brave | Chrome |
|---|---|---|---|---|
| Netflix | HD (1080p) | HD (1080p) | HD (1080p) | 4K |
| Disney+ | HD | HD | HD | HD |
| Amazon Prime | 4K | HD | 4K | 4K |
| YouTube | 4K (no DRM needed) | 4K | 4K | 4K |
| Spotify Web | ✓ | ✓ | ✓ | ✓ |

For Netflix 4K, the most reliable path is the Android app in Waydroid (see [Waydroid on Shani OS](https://blog.shani.dev/post/waydroid-android-on-shani-os)) or a Windows VM.

---

## Music Playback

### Local Music Library

```bash
# Amberol — clean, simple player for local music
flatpak install flathub io.bassi.Amberol

# Rhythmbox — full-featured library manager with Last.fm scrobbling
flatpak install flathub org.gnome.Rhythmbox3

# Elisa — KDE music player
flatpak install flathub org.kde.elisa

# Lollypop — GNOME music player with album art focus
flatpak install flathub org.gnome.Lollypop
```

### Streaming Music

```bash
# Spotify
flatpak install flathub com.spotify.Client

# Spotube — open-source Spotify client (no Premium required for most features)
flatpak install flathub com.github.KRTirtho.Spotube

# YouTube Music
# Use music.youtube.com in Vivaldi, or:
flatpak install flathub dev.aunetx.deezer   # Deezer
```

### Audio Format Conversion

```bash
# Convert FLAC to MP3
ffmpeg -i input.flac -c:a libmp3lame -q:a 2 output.mp3

# Batch convert a folder of FLAC files to MP3
for f in *.flac; do
  ffmpeg -i "$f" -c:a libmp3lame -q:a 2 "${f%.flac}.mp3"
done

# Convert WAV to FLAC (lossless)
ffmpeg -i input.wav -c:a flac output.flac

# Normalise audio loudness to -16 LUFS (podcast/streaming standard)
ffmpeg -i input.mp3 -af loudnorm=I=-16:LRA=11:TP=-1.5 output.mp3
```

---

## Media Server — Jellyfin, Plex, and Kodi

### Jellyfin (Recommended — Fully Free and Open-Source)

Jellyfin is a self-hosted media server — it organises your local video, music, and photo library and streams it to any device on your network (smart TVs, phones, tablets, browsers):

```bash
# Run Jellyfin via Podman (pre-installed)
podman run -d \
  --name jellyfin \
  --user 1000:1000 \
  -p 8096:8096 \
  -v ~/jellyfin/config:/config \
  -v ~/media:/media:ro \
  --device /dev/dri:/dev/dri \
  jellyfin/jellyfin:latest
```

Access Jellyfin at `http://localhost:8096`. The `--device /dev/dri` flag enables hardware transcoding via VA-API — Jellyfin will use your GPU for transcoding when streaming to devices that need a different format.

For automatic startup, create a systemd user service:

```bash
# Enable Podman socket for user services
systemctl --user enable --now podman.socket

# Jellyfin will restart on login via podman auto-restart
podman generate systemd --new --files --name jellyfin
mkdir -p ~/.config/systemd/user/
mv container-jellyfin.service ~/.config/systemd/user/
systemctl --user enable --now container-jellyfin.service
```

### Plex

Plex has a free tier with local streaming and a Premium (PlexPass) subscription for additional features:

```bash
# Plex via Flatpak (desktop player)
flatpak install flathub tv.plex.PlexDesktop

# Plex Media Server via Podman
podman run -d \
  --name plex \
  -p 32400:32400 \
  -e PLEX_CLAIM="your-claim-token" \
  -v ~/plex/config:/config \
  -v ~/media:/data/media:ro \
  plexinc/pms-docker:latest
```

### Kodi — Local Playback Media Centre

Kodi is the classic media centre application for local playback on a TV-connected PC:

```bash
flatpak install flathub tv.kodi.Kodi
```

Kodi supports VA-API hardware decode and has a 10-foot UI suitable for TV use with a remote control.

---

## Network Streaming and DLNA

### Casting to Chromecast and Smart TVs

```bash
# castnow — cast local files to Chromecast from the terminal
nix-env -i castnow

# Cast a local file
castnow video.mp4

# Or use mkchromecast for a GUI approach
nix-env -i mkchromecast
mkchromecast
```

Gnome Network Displays (for Miracast/WiDi wireless display — requires compatible hardware):

```bash
flatpak install flathub org.gnome.NetworkDisplays
```

### DLNA/UPnP

Shani OS includes `gupnp-tools` for browsing DLNA servers on your network. For running a DLNA server to stream your local library to smart TVs:

```bash
# MiniDLNA / ReadyMedia via Podman
podman run -d \
  --name minidlna \
  --network=host \
  -v ~/media:/media:ro \
  -v ~/minidlna/config:/etc/minidlna \
  vladgh/minidlna:latest
```

### Streaming from the Terminal

MPV can play network streams directly:

```bash
# Play a YouTube video (requires yt-dlp)
mpv "https://www.youtube.com/watch?v=..."

# Play a Twitch stream
streamlink "https://twitch.tv/channelname" best | mpv -

# Install streamlink
nix-env -i streamlink
```

---

## Image Viewing and Management

VLP and GNOME Image Viewer (Loupe) come pre-installed. For more features:

```bash
# Shotwell — photo import and basic editing (GNOME)
flatpak install flathub org.gnome.Shotwell

# digiKam — full photo library management
flatpak install flathub org.kde.digikam

# gThumb — image viewer with basic editing
flatpak install flathub org.gnome.gThumb

# ImageMagick — powerful command-line image manipulation
nix-env -i imagemagick

# Resize an image
convert input.jpg -resize 1920x1080 output.jpg

# Convert image formats
convert input.png output.webp
convert input.tiff output.jpg -quality 90

# Create a GIF from images
convert -delay 10 -loop 0 frame*.png animation.gif
```

---

## E-books and Digital Reading

```bash
# Calibre — e-book library management and format conversion
flatpak install flathub com.calibre_ebook.calibre

# Foliate — clean e-book reader (EPUB, MOBI, PDF)
flatpak install flathub com.github.johnfactotum.Foliate

# Komikku — manga and comics reader
flatpak install flathub info.febvre.Komikku
```

Calibre handles format conversion between EPUB, MOBI, AZW3, PDF, and dozens of other formats, and manages your library with metadata, covers, and device sync (Kindle, Kobo).

---

## Codec Summary

All of the following play without any additional installation on Shani OS:

**Video:** H.264 (AVC), H.265 (HEVC), VP8, VP9, AV1, MPEG-2, MPEG-4, Theora, WMV, FLV, DivX, XviD, ProRes (software), DNxHD/DNxHR

**Audio:** MP3, AAC, FLAC, Opus, Vorbis, WAV, AIFF, AC3, DTS (passthrough), TrueHD (passthrough), WMA

**Containers:** MKV, MP4, MOV, AVI, WebM, TS, M2TS, FLV, 3GP, OGV

**Subtitles:** SRT, SSA/ASS, VTT, SUB, IDX+SUB (DVD)

---

## Resources

- [Audio on Shani OS](https://blog.shani.dev/post/shani-os-audio-pipewire) — PipeWire, audio hardware, Bluetooth audio
- [Bluetooth on Shani OS](https://blog.shani.dev/post/shani-os-bluetooth) — wireless headphones and speakers
- [Waydroid on Shani OS](https://blog.shani.dev/post/waydroid-android-on-shani-os) — Netflix 4K, Android streaming apps
- [Shani OS for Video Creators](https://blog.shani.dev/post/shani-os-for-video-creators) — video editing, OBS, encoding
- [GPU Compute on Shani OS](https://blog.shani.dev/post/gpu-compute-on-shani-os) — GPU acceleration deep dive
- [docs.shani.dev](https://docs.shani.dev) — full documentation
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
