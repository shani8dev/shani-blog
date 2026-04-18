---
slug: shani-os-gaming-deep-dive
title: 'Gaming on Shani OS — The Full Stack, Explained'
date: '2026-04-16'
tag: 'Gaming'
excerpt: 'Everything pre-installed on the KDE Plasma edition and why it matters: Steam + Proton, MangoHud, GameScope, Ananicy, kernel tuning, NVIDIA setup, peripheral support, and why immutability makes Shani OS the most reliable gaming OS on Linux.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '10 min'
series: 'Shani OS Deep Dives'
---

The KDE Plasma edition of Shani OS ships a complete, pre-configured gaming stack. Not a collection of packages you need to configure — a stack that works at first boot, tuned for low-latency gaming, with every major launcher ready, NVIDIA drivers configured, and peripherals detected automatically.

This post explains what is included, what each component does, and why an immutable OS is actually an advantage for gaming. Gaming troubleshooting: [docs.shani.dev — Gaming Issues](https://docs.shani.dev/doc/troubleshooting). Full hardware list: [docs.shani.dev — Gaming Hardware & Performance](https://docs.shani.dev/doc/intro/whats-included).

---

## The Pre-Installed Gaming Stack

The KDE Plasma edition ships the following gaming tools as Flatpaks, all pre-installed and ready at first boot:

**Steam** (`com.valvesoftware.Steam`) — Steam is pre-installed and Proton (Valve's Windows game compatibility layer) is enabled. Most Windows-only games in your Steam library run on Linux through Proton. The [ProtonDB](https://www.protondb.com) community database shows compatibility ratings for tens of thousands of games.

**Heroic Games Launcher** (`com.heroicgameslauncher.hgl`) — the open-source launcher for Epic Games Store, GOG, and Amazon Prime Gaming libraries. Log in with your accounts and access your entire library outside Steam.

**Lutris** (`net.lutris.Lutris`) — a gaming platform that handles everything else: emulators, itch.io, Humble Bundle, GOG, and community-written install scripts for games that need custom setup.

**Bottles** (`com.usebottles.bottles`) — for Windows applications that need a more controlled Wine environment. Useful for games or tools that Proton handles poorly, or for Windows software you need alongside games.

**RetroArch** (`org.libretro.RetroArch`) — multi-system emulator frontend, pre-installed with the RetroArch core library ready to download. Covers everything from NES to PlayStation 2 and beyond.

---

## Performance Overlay and Post-Processing

**GOverlay** (`io.github.benjamimgois.goverlay`) is the graphical configuration tool for MangoHud, pre-installed on the KDE Plasma edition. It provides an easy interface for setting up your performance overlay without editing config files manually.

MangoHud itself overlays real-time performance information on any Vulkan or OpenGL game — FPS, CPU and GPU utilisation, temperatures, VRAM usage, frame times. To enable it in Steam, add `MANGOHUD=1 %command%` to a game's launch options. GOverlay lets you configure exactly which metrics appear and where.

**vkBasalt** applies post-processing effects to any Vulkan game without modifying the game itself. Effects available: CAS sharpening (reduces blur from upscaling), FXAA, SMAA, and LUT colour grading.

```bash
# Enable sharpening for a game (Steam launch options)
ENABLE_VKBASALT=1 %command%

# Configuration
nano ~/.config/vkBasalt.conf
```

**GameScope** is a Wayland compositor designed for games. It handles frame pacing, manages refresh rate, and provides a contained rendering environment. Particularly useful for frame limiting with better pacing than vsync and for games that do not respect Wayland natively.

```bash
# In Steam launch options
gamescope -f -W 1920 -H 1080 -- %command%
```

**GameMode** is a daemon that applies CPU governor switching and process priority tuning when a game starts. It is configured to run globally on Shani OS — every game benefits automatically without per-game configuration.

---

## Peripheral Configuration

**Oversteer** (`io.github.berarma.Oversteer`) is pre-installed for racing wheel configuration. Supported wheels include:

- **Logitech:** G25, G27, G29, G923 — including force feedback
- **Thrustmaster:** T150, T300, T500, TS-PC, TX
- **Fanatec:** CSL, Podium series

**Piper** (`org.freedesktop.Piper`) provides a graphical interface for configuring gaming mice — DPI, buttons, and profiles. Works with Logitech, Razer, Steelseries, Corsair, and more via libratbag.

**OpenRGB** (`org.openrgb.OpenRGB`) controls RGB lighting for motherboards, RAM, fans, peripherals, and GPUs from multiple vendors — a unified interface across brands that would otherwise require separate Windows software.

**AntiMicroX** (`io.github.antimicrox.antimicrox`) maps gamepad buttons to keyboard/mouse actions, useful for games with poor controller support or for accessibility remapping.

Xbox controllers (wired and Bluetooth), PlayStation DualShock 4, DualSense 5, Nintendo Switch Pro, and 8BitDo controllers all work without configuration via the Steam Input system and kernel gamepad drivers.

---

## Kernel Tuning for Gaming

The kernel parameters embedded in Shani OS's Unified Kernel Images are tuned for low-latency interactive workloads:

**High-resolution timers:** HPET and RTC timer sources run at 3072 Hz (versus the kernel default of 64 Hz). This improves input responsiveness and frame scheduling precision.

**CFS scheduler tuning:** Custom time slice values for the Completely Fair Scheduler reduce scheduling latency for game threads competing with background processes.

**Memory map limits:** `vm.max_map_count` is set to 2147483642 — required by some large open-world games that map thousands of memory regions.

**Ananicy-cpp:** A background daemon that monitors running processes and adjusts CPU and I/O priorities based on a database of known applications. When a game goes active, background tasks (browser tabs, update daemons, file indexers) are automatically deprioritised.

---

## GPU Support

**AMD (RDNA 1, RDNA 2, RDNA 3):** AMD GPUs use the open-source RADV Vulkan driver and amdgpu kernel driver, both included in the kernel and Mesa stack. No additional installation required.

```bash
# Check AMD GPU status
glxinfo | grep "OpenGL renderer"
vulkaninfo --summary
radeontop  # real-time GPU stats
```

**Intel (Arc and integrated):** Intel Arc discrete GPUs use the ANV Vulkan driver and xe kernel driver. Intel integrated graphics work for lighter gaming and emulation.

**NVIDIA:** Drivers are configured at first boot on the KDE Plasma edition. The proprietary `nvidia-open` kernel module is installed and available in the initramfs.

**Hybrid Graphics (Optimus laptops):** `switcheroo-control` and `nvidia-prime` are pre-installed and handle automatic GPU selection. For forcing discrete GPU:

```bash
prime-run game-binary
# or in Steam launch options:
# __NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia %command%
```

If NVIDIA drivers do not load on first boot, check Secure Boot configuration: [docs.shani.dev — NVIDIA Setup](https://docs.shani.dev/doc/troubleshooting).

For GPU passthrough — dedicating a discrete GPU entirely to a Windows VM for native gaming performance — see the full VFIO setup in [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines).

---

## VR Headsets

udev rules for supported VR headsets are pre-configured. Supported hardware includes HTC Vive and Vive Pro (via SteamVR + OpenVR), Valve Index (native Linux support via SteamVR), and PSVR (PS4, PS5) via PSVRFramework + SteamVR. Plug in and launch SteamVR.

---

## Android Games via Waydroid

Waydroid runs a full Android stack in a lightweight container — hardware-accelerated on Intel and AMD GPUs, with ARM binary translation for apps compiled for ARM. It is pre-configured on the KDE Plasma edition.

```bash
# First-time setup
sudo waydroid init

# Launch Android environment
waydroid session start
waydroid show-full-ui

# Install an APK
waydroid app install game.apk
```

Guide: [docs.shani.dev — Android (Waydroid)](https://docs.shani.dev/doc/software/waydroid).

---

## Why Immutability Is an Advantage for Gaming

The common objection to immutable Linux for gaming is: "I can't install packages directly — what about mod tools and game-specific utilities?" The immutable model is actually better for gaming stability.

**An OS update never breaks your gaming session.** `shani-deploy` prepares the new OS in the background on the inactive slot. Your running system — including Steam, your game library, active downloads — is never touched. When you decide to reboot, the new OS is ready.

**Your game library survives everything.** Steam's library lives in your home directory (`@home`). The `@flatpak` subvolume holds Flatpak-installed launchers. Neither is affected by OS updates or rollbacks.

**No dependency conflicts.** Gaming tools (Steam, MangoHud, GameScope, Proton) run as Flatpaks or are part of the verified OS image. They do not conflict with dev tools, system tools, or anything you install via Nix or Distrobox — because those live in separate Btrfs subvolumes.

**Regression recovery.** If a Proton update breaks a specific game, use Steam's own Proton version selector to pin a specific Proton version per game. If an OS update breaks something at the kernel or driver level, `sudo shani-deploy --rollback` takes you back to the verified previous state in under a minute.

---

## Common Gaming Commands

```bash
# Check Vulkan is working
vulkaninfo --summary

# Useful Steam launch options:
# PROTON_LOG=1 %command%           — enable Proton debug logging
# DXVK_ASYNC=1 %command%           — async shader compilation (reduces stutters)
# MANGOHUD=1 %command%              — enable performance overlay
# ENABLE_VKBASALT=1 %command%       — enable post-processing
# MANGOHUD_DLSYM=1 MANGOHUD=1 %command%  — for OpenGL games

# Force a specific Proton version for a Steam game
# Steam → Game Properties → Compatibility → Force specific Proton version

# Check GameMode is active
gamemoded -s
```

Full gaming troubleshooting: [docs.shani.dev — Gaming Issues](https://docs.shani.dev/doc/troubleshooting).

---

## Resources

- [docs.shani.dev — Gaming Hardware & Performance](https://docs.shani.dev/doc/intro/whats-included) — full hardware compatibility list
- [docs.shani.dev — Gaming Issues](https://docs.shani.dev/doc/troubleshooting) — troubleshooting
- [docs.shani.dev — Android (Waydroid)](https://docs.shani.dev/doc/software/waydroid) — Android gaming setup
- [ProtonDB](https://www.protondb.com) — community compatibility database
- [Telegram community](https://t.me/shani8dev) — gaming discussions and support

[Download Shani OS KDE Plasma Edition at shani.dev →](https://shani.dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
