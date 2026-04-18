---
slug: shani-os-for-designers-and-visual-creators
title: 'Shani OS for Designers and Visual Creators — Photo Editing, Vector, UI Design, and 3D'
date: '2026-05-10'
tag: 'Guide'
excerpt: 'A complete guide for photographers, illustrators, UI/UX designers, 3D artists, and visual creators on Shani OS — GIMP, Inkscape, Krita, Blender, Darktable, RawTherapee, Figma via browser, colour management, display calibration, and tablet support. Everything works at first boot.'
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

Shani OS runs an excellent creative workstation. The Linux creative software ecosystem has matured significantly — Blender is industry-standard, Krita is used by professional illustrators, Darktable handles RAW processing that rivals Lightroom, and Inkscape covers most vector design workflows. For tools that only exist on macOS or Windows (Figma natively, Affinity suite, Adobe CC), the practical paths are covered here too.

This guide covers the full creative stack: raster editing, vector illustration, RAW photography, UI/UX design, 3D, and display/colour management. GPU acceleration works on all vendors via OpenCL or CUDA inside Distrobox containers where needed. Graphics tablets are supported out of the box.

Full reference: [docs.shani.dev](https://docs.shani.dev).

---

## Raster Editing — GIMP

GIMP is the primary open-source raster image editor. The Flatpak version on Flathub is always the most current:

```bash
flatpak install flathub org.gimp.GIMP
```

GIMP supports layers, masks, non-destructive adjustments via GEGL, scripting via Script-Fu and Python-Fu, and a plugin ecosystem. For Photoshop-like layout, the **PhotoGIMP** patch reorganises the interface and keybindings to match Photoshop muscle memory.

### Useful GIMP Plugins and Extensions

```bash
# G'MIC — hundreds of image processing filters
flatpak install flathub org.gimp.GIMP.Plugin.GMic

# Resynthesizer — content-aware fill (similar to Photoshop's Heal Selection)
# Install via GIMP's Script-Fu console or plugin manager

# BIMP — batch image processing
# Available via GIMP Plugin Registry or compiled from source
```

For **Photoshop** users: GIMP covers most photo editing, compositing, and retouching workflows. The tools that genuinely require Photoshop (Camera Raw with full lens profiles, Generative Fill, some 3D workflows) have alternatives — Darktable for RAW, GIMP's Heal for retouching. If your work is production-critical and Photoshop-specific, see the Windows Apps section for running Photoshop via Bottles/Wine or in a Windows VM.

---

## Photography and RAW Processing

### Darktable

Darktable is a non-destructive RAW processor and digital darkroom. It supports virtually every camera RAW format via LibRaw, including recent Sony, Canon, Nikon, and Fujifilm bodies. Its processing pipeline uses floating-point colour science comparable to what serious photographers need.

```bash
flatpak install flathub org.darktable.Darktable
```

Key Darktable features for serious photographers:
- Scene-referred colour pipeline with exposure and colour balance modules
- Tone equaliser, filmic RGB, and sigmoid tone curves
- Lens correction via lensfun database
- Noise reduction (non-local means, wavelets)
- Colour calibration with built-in colour checker workflow
- Tethered shooting via gPhoto2 (most DSLRs and mirrorless cameras)
- Export to TIFF, JPEG, WebP, and AVIF

### RawTherapee

RawTherapee is an alternative RAW processor with a different approach to tone curves and colour management. Some photographers prefer its handling of highlights and shadows.

```bash
flatpak install flathub com.rawtherapee.RawTherapee
```

### digiKam

For managing large photo libraries with metadata, face recognition, geotagging, and organisation:

```bash
flatpak install flathub org.kde.digikam
```

digiKam integrates with Darktable and RawTherapee for editing and provides a full photo asset management workflow.

### Tethered Shooting

Most DSLRs and mirrorless cameras work tethered over USB via gPhoto2, which is pre-installed on Shani OS:

```bash
# List connected cameras
gphoto2 --list-cameras | grep -i "your camera model"

# Check what's connected
gphoto2 --auto-detect

# Capture to disk
gphoto2 --capture-image-and-download

# Continuous tethered shooting
gphoto2 --capture-tethered
```

Darktable also supports tethered shooting natively — connect your camera, open Darktable, and use the tethering view.

---

## Vector Illustration — Inkscape

Inkscape is the mature open-source vector illustration application. It handles SVG natively and exports to PDF, PNG, EPS, and DXF. The Flatpak is the recommended install:

```bash
flatpak install flathub org.inkscape.Inkscape
```

Inkscape covers logo design, icon creation, technical illustration, and print-ready artwork. The Inkscape 1.x releases significantly improved performance, typography handling, and the overall interface.

For **Illustrator** users: Inkscape opens AI files (via PDF compatibility layer) and handles most Illustrator workflows. Complex brush strokes and some effects may not transfer perfectly. For production work that requires precise Illustrator compatibility, Affinity Designer via Wine (see below) or a Windows VM is the most reliable path.

---

## Digital Painting and Illustration — Krita

Krita is purpose-built for digital painting and illustration. It is used by professional concept artists and illustrators and ships with one of the best brush engines available on any platform.

```bash
flatpak install flathub org.kde.krita
```

Krita features:
- Advanced brush engine with stabilisers, lazy mouse, and texture brushes
- HDR painting support
- Non-destructive layers with blend modes
- Vector layers alongside raster layers
- Animation support (frame-by-frame and tweening)
- Python scripting API
- Built-in colour management via LittleCMS

For digital artists: Krita is the right choice over GIMP for illustration and concept art. GIMP is better for photo editing and compositing; Krita is better for painting from scratch.

---

## UI/UX Design

### Figma — Browser

Figma works fully in Vivaldi or Firefox via browser — no native app required. Performance in the browser is identical to the native Electron app. Use Figma at `figma.com` in your browser.

For offline work or plugin-heavy workflows, the Figma Linux desktop app can be installed as an AppImage or via a community-maintained Flatpak:

```bash
# Figma via AppImage (manage with Gear Lever, pre-installed)
# Download from figma.com/downloads or community builds

# Or via unofficial Flatpak
flatpak install flathub io.github.Figma_Linux.figma_linux
```

### Penpot — Open Source Figma Alternative

Penpot is an open-source design tool that closely mirrors Figma's interface and workflow. It runs as a web application:

```bash
# Self-hosted Penpot via Podman (pre-installed)
podman run -d --name penpot \
  -p 3449:3449 \
  penpotapp/frontend:latest

# Or use the hosted version at penpot.app (free account available)
```

### GNOME Builder / Cambalache for GTK App Design

For designing GNOME/GTK application interfaces:

```bash
# Cambalache — GTK UI designer
flatpak install flathub ar.xjuan.Cambalache

# GNOME Builder — full IDE with UI design
flatpak install flathub org.gnome.Builder
```

---

## 3D Modelling and Animation — Blender

Blender is pre-installed on neither edition but is the obvious first install for 3D work:

```bash
flatpak install flathub org.blender.Blender
```

Blender on Shani OS benefits from GPU acceleration. For NVIDIA, Cycles render uses CUDA via the CUDA Distrobox container (set up CUDA as described in [GPU Compute on Shani OS](https://blog.shani.dev/post/gpu-compute-on-shani-os)). For AMD, Cycles uses HIP/ROCm. For CPU-only rendering, no additional setup is needed.

```bash
# NVIDIA CUDA rendering with Blender:
# 1. Set up CUDA container: distrobox create --name cuda-dev --image nvidia/cuda:12.3.0-devel-ubuntu22.04
# 2. Run Blender from inside the CUDA container
# OR set CYCLES_CUDA in the Flatpak override

# AMD ROCm rendering:
# Edit → Preferences → System → Cycles Render Devices → HIP
# Select your AMD GPU
```

For heavy rendering workloads, running Blender inside the ROCm or CUDA Distrobox container gives access to the full compute stack. See [GPU Compute on Shani OS](https://blog.shani.dev/post/gpu-compute-on-shani-os) for the full container setup.

---

## Colour Management and Display Calibration

Colour accuracy matters for photography, design, and print work. Shani OS uses colord for system-wide colour management — it is pre-installed and active.

### Checking Colour Profiles

```bash
# List installed ICC profiles
colormgr get-profiles

# Check currently assigned profiles per display
colormgr get-devices

# Assign an ICC profile to a display
colormgr device-add-profile "xrandr-display-name" "/path/to/profile.icc"
```

### Display Calibration with DisplayCAL

DisplayCAL is the standard open-source calibration application. It works with colourimeters (X-Rite i1Display, Datacolor Spyder, etc.):

```bash
# Install DisplayCAL
flatpak install flathub net.displaycal.DisplayCAL
```

DisplayCAL generates ICC profiles that are loaded by colord and applied system-wide — affecting all colour-managed applications (GIMP, Darktable, Inkscape, Krita).

### Colour-Managed Applications

Applications that respect ICC profiles via colord or LittleCMS:
- GIMP — enable in Edit → Preferences → Color Management
- Darktable — full colour management built in; assign your display profile in Preferences
- Krita — Settings → Color Management → assign display profile
- Inkscape — enable in File → Document Properties → Color

---

## Graphics Tablet Support

Graphics tablets (Wacom, Huion, XP-Pen, Gaomon) are supported out of the box on Shani OS via the `libwacom` and `xf86-input-wacom` / `libinput` stack.

```bash
# Check if your tablet is detected
libwacom-list-local-tablets

# Detailed tablet info
libwacom-show-stylus

# Check input devices
libinput list-devices | grep -A5 -i "wacom\|huion\|xp-pen"
```

### Tablet Configuration

**GNOME:** Settings → Wacom Tablet (appears automatically when a tablet is connected)
- Button mapping
- Pressure curve
- Tablet orientation (portrait/landscape)
- Stylus button assignment

**KDE:** System Settings → Input Devices → Drawing Tablet

**For Huion and XP-Pen tablets** that are not in libwacom's database yet, the `OpenTabletDriver` project provides broader support:

```bash
# Install OpenTabletDriver via AppImage (managed by Gear Lever)
# Download from: https://github.com/OpenTabletDriver/OpenTabletDriver/releases
```

OpenTabletDriver is userspace-only and supports a much wider range of newer Huion, XP-Pen, and Gaomon tablets.

---

## Font Management

Designers need good font management. Fonts installed to `~/.local/share/fonts/` are immediately available to all applications:

```bash
# Install fonts for your user
mkdir -p ~/.local/share/fonts/
cp ~/Downloads/*.ttf ~/.local/share/fonts/
fc-cache -fv ~/.local/share/fonts/

# Search for installed fonts
fc-list | grep -i "FontName"

# Install Google Fonts (entire library)
# Clone or download to ~/.local/share/fonts/
```

**Font Manager** (graphical font manager):

```bash
flatpak install flathub org.gnome.FontManager
```

Font Manager lets you browse, preview, install, and organise fonts without touching the terminal.

---

## Screen Capture and Asset Export

```bash
# Screenshot tools
# GNOME: PrtSc key or gnome-screenshot
# KDE: Spectacle (pre-installed on KDE)

# Flameshot — annotated screenshots
flatpak install flathub org.flameshot.Flameshot

# Export at multiple resolutions from Inkscape (SVG → PNG)
inkscape --export-filename=icon-1x.png --export-width=64 icon.svg
inkscape --export-filename=icon-2x.png --export-width=128 icon.svg
inkscape --export-filename=icon-3x.png --export-width=192 icon.svg

# Batch export from Inkscape (scripted)
for size in 16 32 48 64 128 256; do
  inkscape --export-filename="icon-${size}.png" --export-width=$size icon.svg
done
```

---

## Running Affinity Suite and Adobe CC

### Affinity Designer / Photo / Publisher via Bottles

Affinity Designer 1.x and Affinity Photo 1.x run well under Wine via Bottles (pre-installed on KDE Plasma, available on Flathub for GNOME):

```bash
# Install Bottles if on GNOME
flatpak install flathub com.usebottles.bottles
```

Inside Bottles, create a new bottle using the "Application" preset and install the Affinity app's Windows installer. Affinity Designer 2.x and Photo 2.x have mixed results — check [WineHQ AppDB](https://appdb.winehq.org) and the Bottles community for current compatibility.

### Adobe Creative Cloud

Adobe CC apps do not have official Linux support and do not run reliably under Wine. The realistic options:

- **Photoshop alternatives:** GIMP + RawTherapee + Darktable covers most workflows
- **Illustrator alternative:** Inkscape + Affinity Designer via Bottles
- **Premiere Pro alternative:** Kdenlive, DaVinci Resolve (see the [Video Creators guide](https://blog.shani.dev/post/shani-os-for-video-creators))
- **After Effects alternative:** Natron, Kdenlive effects
- **If Adobe CC is non-negotiable:** A Windows VM via virt-manager (KDE Plasma, pre-installed) with GPU passthrough gives you a full Windows environment with native Adobe performance

Guide: [Windows Apps on Shani OS](https://blog.shani.dev/post/windows-apps-on-shani-os) · [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines).

---

## Print Workflow

For designers working with print output, colour-accurate proof printing requires ICC profile support in both the application and the printer driver. CUPS on Shani OS supports ICC profiles:

```bash
# Assign an ICC profile to a printer for colour-accurate output
lpadmin -p "PrinterName" -o ColorModel=RGB -o cupsICCProfile=/path/to/profile.icc

# Soft proofing in GIMP: View → Proof Colors → select printer profile
# Soft proofing in Darktable: soft-proof module in darkroom
```

Guide: [Printing and Scanning on Shani OS](https://blog.shani.dev/post/shani-os-printing-and-scanning).

---

## Summary: Creative Stack at a Glance

| Workflow | Tool | Install |
|---|---|---|
| RAW photography | Darktable | `flatpak install flathub org.darktable.Darktable` |
| RAW alternative | RawTherapee | `flatpak install flathub com.rawtherapee.RawTherapee` |
| Photo library | digiKam | `flatpak install flathub org.kde.digikam` |
| Raster editing | GIMP + G'MIC | `flatpak install flathub org.gimp.GIMP` |
| Digital painting | Krita | `flatpak install flathub org.kde.krita` |
| Vector illustration | Inkscape | `flatpak install flathub org.inkscape.Inkscape` |
| UI/UX design | Figma (browser) or Penpot | figma.com or penpot.app |
| 3D modelling | Blender | `flatpak install flathub org.blender.Blender` |
| Font management | Font Manager | `flatpak install flathub org.gnome.FontManager` |
| Screenshots | Flameshot | `flatpak install flathub org.flameshot.Flameshot` |
| Display calibration | DisplayCAL | `flatpak install flathub net.displaycal.DisplayCAL` |

---

## Resources

- [GPU Compute on Shani OS](https://blog.shani.dev/post/gpu-compute-on-shani-os) — GPU acceleration for Blender cycles
- [Windows Apps on Shani OS](https://blog.shani.dev/post/windows-apps-on-shani-os) — Affinity, Adobe via Wine or VM
- [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines) — full Windows VM for Adobe CC
- [Printing and Scanning on Shani OS](https://blog.shani.dev/post/shani-os-printing-and-scanning) — colour printing
- [Shani OS for Video Creators](https://blog.shani.dev/post/shani-os-for-video-creators) — video editing, colour grading, streaming
- [docs.shani.dev](https://docs.shani.dev) — full reference
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
