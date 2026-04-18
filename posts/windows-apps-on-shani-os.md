---
slug: windows-apps-on-shani-os
title: 'Running Windows Apps on Shani OS — Wine, Bottles, and When to Use a VM'
date: '2026-05-08'
tag: 'Guide'
excerpt: 'You do not need Windows to run Windows software on Shani OS. Bottles (pre-installed on the KDE Plasma edition) manages Wine environments for productivity tools, creative software, and legacy apps. Here is how to get any Windows app running, and when a VM is the better answer.'
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

You do not need Windows to run Windows software on Shani OS. Wine — a compatibility layer that translates Windows API calls to Linux equivalents — lets you run Windows `.exe` files directly on your Linux desktop. No virtual machine, no Windows licence, no second OS to maintain.

For gaming, Proton (Valve's Wine distribution, built into Steam) handles this automatically — see [Gaming on Shani OS](https://blog.shani.dev/post/shani-os-gaming-deep-dive). This post covers everything else: productivity tools, creative software, business applications, utilities, and legacy software that has no Linux or Flatpak equivalent.

**Bottles** (`com.usebottles.bottles`) is pre-installed on the KDE Plasma edition and available on Flathub for the GNOME edition. It is the recommended tool for running non-gaming Windows software on Shani OS — it manages Wine environments, runtime dependencies, and application isolation without any terminal work.

For games specifically, use Steam + Proton or Heroic Games Launcher. Bottles is for everything else.

Full reference: [docs.shani.dev — Containers](https://docs.shani.dev/doc/software/containers).

---

## How Wine Works

Wine is not an emulator. It does not simulate x86 hardware or run a virtualised CPU. It reimplements the Windows API — the set of functions Windows applications call to draw windows, open files, make network connections, play audio, and so on — as native Linux calls. When a Windows `.exe` calls `CreateFile()`, Wine translates that to `open()`. When it calls `DirectX`, Wine routes it through DXVK (DirectX 9/10/11) or VKD3D (DirectX 12) to Vulkan.

The result: most Windows applications run at near-native speed, because they are running natively — just with their Windows API calls answered by Wine instead of the Windows kernel.

What Wine cannot do: applications that rely on Windows kernel drivers, hardware dongles tied to Windows, or anti-cheat systems that inspect the kernel will not work. For those cases, a Windows VM is the correct answer — see [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines).

---

## Bottles — Wine Without the Complexity

Bottles provides a clean graphical interface for creating and managing Wine environments. Each "bottle" is an isolated Wine prefix — it has its own Windows registry, its own `C:\` drive equivalent, its own installed applications and runtime libraries. Bottles from different applications cannot interfere with each other.

### Installing Bottles on the GNOME Edition

Bottles is pre-installed on the KDE Plasma edition. On the GNOME edition:

```bash
flatpak install flathub com.usebottles.bottles
```

### Creating a Bottle

Open Bottles from your application launcher. Click **Create a new bottle** and choose a template:

- **Application** — for productivity tools, utilities, and most Windows software. Uses a standard Wine environment.
- **Gaming** — pre-configured with DXVK and VKD3D for DirectX games. Use this for games not managed by Steam or Heroic.
- **Custom** — full manual control over runner version, DXVK version, and all settings.

Give the bottle a name, select the template, and click **Create**. Bottles downloads the Wine runner and sets up the prefix automatically.

### Installing a Windows Application

1. Open your bottle in Bottles
2. Click **Run Executable**
3. Select the `.exe` installer
4. The installer runs inside the bottle — click through it as you would on Windows
5. The installed application appears in Bottles under **Programs**
6. Click the program to launch it, or click the three-dot menu → **Add Desktop Entry** to add it to your Linux app launcher

The application runs inside the bottle's isolated Wine prefix. Your Linux home directory is accessible from inside Wine at `Z:\home\username`.

---

## Runtime Dependencies — Winetricks and the Bottles Dependency Manager

Many Windows applications require additional runtime libraries that are not included in a base Wine installation: Visual C++ redistributables, .NET Framework, DirectX components, media codecs. These are managed through **winetricks** — a script that downloads and installs Windows runtime components into a Wine prefix.

Bottles handles winetricks automatically through its Dependencies panel. You do not need to run winetricks from the terminal.

### Common Dependencies

In Bottles → select your bottle → **Dependencies** → search and install:

| Dependency | Required by |
|---|---|
| `vcredist2019` | Most modern Windows apps (Visual C++ 2019) |
| `vcredist2015` | Older apps (Visual C++ 2015) |
| `dotnet48` | .NET Framework 4.8 — business software, installers |
| `dotnet6` | .NET 6 — newer cross-platform apps |
| `d3dx9` | DirectX 9 components |
| `d3dcompiler_47` | DirectX shader compiler — many modern apps |
| `mfc140` | MFC runtime — some legacy Windows tools |
| `corefonts` | Microsoft Core Fonts — improves text rendering |
| `liberation` | Liberation fonts — metrically compatible with Times, Arial |

Install only what the application actually needs. Each dependency is downloaded and installed inside the bottle, not the host system.

---

## Choosing a Wine Runner

Bottles supports multiple Wine runners, each with different compatibility trade-offs:

**Wine-GE** — Valve's Wine, backported for non-Steam use. The same Proton patches (DXVK, VKD3D-Proton, esync, fsync) but usable outside Steam. Best general-purpose choice for most Windows software including games outside Steam.

**Wine Staging** — Wine with the Staging patchset. Good compatibility and stability for productivity apps and non-gaming software.

**Caffe** — Bottles' default curated runner. Well-tested, stable, good for most applications.

**Vaniglia** — upstream Wine with minimal patches. Use when an app behaves unexpectedly with patched runners.

To change the runner for a bottle: Bottles → select bottle → **Settings** → **Runner** → select from the dropdown. Bottles downloads the runner automatically.

For most productivity and business software, **Caffe** or **Wine Staging** works well. For games or media software using DirectX, use **Wine-GE**.

---

## Common Windows Software on Shani OS

### Microsoft Office

Microsoft Office itself is not supported well under Wine due to its deep system integration. The recommended alternatives:

- **OnlyOffice Desktop Editors** — pre-installed as a Flatpak on both editions. Opens `.docx`, `.xlsx`, `.pptx` with high compatibility. For most Office workflows, this is the right answer.
- **LibreOffice** — available on Flathub. Full office suite with strong `.docx`/`.xlsx` compatibility.
- **Microsoft 365 in a browser** — the web version of Word, Excel, and PowerPoint works fully in any browser on Shani OS.
- **Office in a Windows VM** — if you need the full desktop Office experience with macros and COM add-ins, a Windows VM via virt-manager is the most reliable path. See [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines).

### Creative and Design Tools

**Adobe Photoshop** — older versions (CS6 and earlier) run well in Bottles with `vcredist2019` and `d3dcompiler_47`. Recent Creative Cloud versions have mixed compatibility; check [WineHQ AppDB](https://appdb.winehq.org) for your specific version. For vector work, Inkscape (Flatpak) and Affinity Suite (available natively on Linux) cover most use cases.

**Adobe Illustrator** — CS6 runs in Bottles. CC versions have lower compatibility. Check WineHQ AppDB.

**Clip Studio Paint** — runs well in Bottles with Wine-GE. Add `vcredist2019`. A native Linux version is also available directly from Celsys.

**Krita** — native Linux app available on Flathub. No Wine needed.

**Affinity Photo, Designer, Publisher** — native Linux versions are available. No Wine needed.

### Engineering and CAD

**AutoCAD** — older versions (2018 and earlier) have good Wine compatibility. Newer versions are inconsistent. Check WineHQ AppDB for your version. For reliable AutoCAD access, a Windows VM is the most predictable approach.

**SolidWorks, CATIA, Siemens NX** — these have kernel-level drivers and hardware dongle dependencies that Wine cannot satisfy. Use a Windows VM.

**FreeCAD** — native Linux app available on Flathub.

**LibreCAD** — native Linux app, available on Flathub.

### Business and Productivity Tools

**Notepad++** — runs perfectly in Bottles. A lightweight alternative is any of the native Linux text editors (Kate, gedit, Zed).

**7-Zip** — runs well in Bottles, though native Linux equivalents (`p7zip`, Ark on KDE, File Roller on GNOME) handle the same formats natively.

**WinRAR** — runs in Bottles. Native tools handle `.rar` extraction on Linux without Wine.

**Total Commander** — runs well in Bottles with good compatibility.

**PDF tools (Adobe Acrobat Reader)** — runs in Bottles with `vcredist2019`. For most PDF work, Papers (GNOME, pre-installed) or Okular (KDE, pre-installed) cover reading, annotation, and form filling natively.

### Audio and Music Production

**FL Studio** — runs well in Bottles with Wine-GE. Add `vcredist2019`. Widely reported as working well for production workflows.

**Ableton Live** — mixed results depending on version. Check WineHQ AppDB. For reliable Ableton use, a Windows VM or dual boot may be more stable for professional production.

**REAPER** — has a native Linux version. No Wine needed.

**Plugins (VST/VST3)** — Windows VST plugins can run inside Wine-based DAWs via [yabridge](https://github.com/robbert-vdh/yabridge), which bridges Windows VST plugins into Linux DAWs. Advanced setup but widely used in production.

---

## Advanced Bottle Configuration

### DXVK and VKD3D

For applications that use DirectX (not just games — some creative tools and 3D software use DirectX too):

In Bottles → select bottle → **Settings**:
- Enable **DXVK** for DirectX 9/10/11 → Vulkan translation
- Enable **VKD3D** for DirectX 12 → Vulkan translation

These are enabled by default in the Gaming template and can be manually toggled in Application and Custom bottles.

### Environment Variables

Some applications need specific Wine environment variables. In Bottles → bottle **Settings** → **Environment Variables**:

```
WINE_LARGE_ADDRESS_AWARE=1    # allows 32-bit apps to use more than 2 GB RAM
WINEDEBUG=-all                # suppress debug output (speeds up some apps)
STAGING_SHARED_MEMORY=1       # improves performance with Wine Staging
```

### Virtual Desktop Mode

If an application does not render correctly in full-screen or has window management issues, try running it in a virtual desktop — Wine creates a fake Windows desktop at a fixed resolution inside a single Linux window:

In Bottles → bottle **Settings** → enable **Virtual Desktop** and set the resolution.

### DLL Overrides

Sometimes a specific Windows DLL needs to be overridden with a native version (downloaded via winetricks) or forced to use Wine's built-in implementation:

In Bottles → bottle **Settings** → **DLL Overrides**:
- `native,builtin` — try the native (winetricks-installed) DLL first
- `builtin,native` — try Wine's built-in implementation first
- `disabled` — disable the DLL entirely

Common override: if an app uses `d3d9` and has rendering issues, set `d3d9` to `native` after installing `d3dx9` via Dependencies.

---

## Proton-GE for Non-Steam Windows Apps

Proton-GE is a community-maintained fork of Proton with additional patches, codecs, and compatibility fixes that Valve has not yet merged upstream. It can be used outside Steam via Bottles:

In Bottles → **Preferences** → **Runners** → download a `GE-Proton` version. Then set the runner for a specific bottle to that version.

Proton-GE is particularly useful for:
- Applications that use media codecs (video players, apps with embedded video)
- Software that needs the additional WINE patches included in GE builds
- Games from GOG or itch.io that need Proton-level compatibility

---

## Checking Compatibility Before You Try

Before spending time configuring a bottle, check these resources:

**[WineHQ AppDB](https://appdb.winehq.org)** — the primary compatibility database for non-game Windows software. Each application entry includes user reports, ratings (Platinum/Gold/Silver/Bronze/Garbage), and configuration notes specific to the version you are running.

**[ProtonDB](https://www.protondb.com)** — for games. Community-maintained, with per-game launch flag recommendations.

**Bottles community** — the Bottles GitHub issues and community forum have compatibility reports for many applications.

A Platinum or Gold rating on WineHQ AppDB means the application runs well with little or no configuration. Bronze means it runs with workarounds. Garbage means expect significant issues — at that point, a Windows VM is worth considering.

---

## When to Use a Windows VM Instead

Wine covers a wide range of Windows software, but some applications genuinely require Windows. The honest signals that Wine is the wrong tool:

- The application requires a **kernel driver** (hardware dongles, some DRM systems, certain security software)
- The application uses **anti-cheat** that inspects the Windows kernel (most online competitive games)
- You need **the full Microsoft Office suite** with macros, COM add-ins, and corporate MDM integration
- The application is **enterprise software** with hardware-locked licensing
- You need **100% compatibility** and cannot tolerate any rendering differences or crashes

For these cases, a Windows VM via virt-manager (pre-installed on the KDE Plasma edition) gives you a complete Windows environment. VM disk images live in the `@libvirt` Btrfs subvolume — independent of the OS, surviving every update and rollback.

For gaming that requires anti-cheat, GPU passthrough to a Windows VM gives native GPU performance. See [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines) and [Gaming on Shani OS](https://blog.shani.dev/post/shani-os-gaming-deep-dive).

---

## Windows Apps vs the Full Ecosystem

Bottles and Wine are one option for running Windows software. Here is the full picture of what is available:

**Bottles + Wine** (this guide) — for Windows `.exe` applications that run well under Wine. Productivity tools, creative software, utilities, and legacy apps. Isolated per-app Wine prefixes managed via a graphical interface.

**Steam + Proton** — for Windows games in your Steam library. Proton is tuned specifically for gaming and handles DirectX, anti-tamper, and input mapping automatically. Guide: [Gaming on Shani OS](https://blog.shani.dev/post/shani-os-gaming-deep-dive).

**Heroic Games Launcher** — for Windows games from Epic Games Store, GOG, and Amazon Prime Gaming. Uses Wine-GE or Proton-GE runners. Guide: [Gaming on Shani OS](https://blog.shani.dev/post/shani-os-gaming-deep-dive).

**Flatpak** — the first place to check before Wine. Many apps that exist on Windows also have Linux-native Flatpak versions on Flathub — running the native version is always better than Wine. Guide: [Flatpak on Shani OS](https://blog.shani.dev/post/flatpak-on-shani-os).

**Distrobox** — for Windows tools that have Linux equivalents installable via `apt` or `pacman`, or for running Wine inside a full mutable Linux container for more complex setups. Guide: [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os).

**Virtual Machines** — for applications that require a real Windows kernel, kernel drivers, or full enterprise compatibility. virt-manager is pre-installed on the KDE Plasma edition. Guide: [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines).

---

## Resources

- [WineHQ AppDB](https://appdb.winehq.org) — compatibility database for Windows software under Wine
- [ProtonDB](https://www.protondb.com) — compatibility database for Windows games under Proton
- [Bottles documentation](https://docs.usebottles.com) — full Bottles reference
- [yabridge](https://github.com/robbert-vdh/yabridge) — Windows VST/VST3 plugins in Linux DAWs via Wine
- [Gaming on Shani OS](https://blog.shani.dev/post/shani-os-gaming-deep-dive) — Steam, Proton, Heroic, and the full gaming stack
- [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines) — full Windows VMs for apps that require a real Windows kernel
- [Flatpak on Shani OS](https://blog.shani.dev/post/flatpak-on-shani-os) — native Linux apps, the first stop before Wine
- [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os) — full mutable Linux environments
- [Telegram community](https://t.me/shani8dev) — questions and compatibility reports

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
