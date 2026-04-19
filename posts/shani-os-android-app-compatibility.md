---
slug: shani-os-android-app-compatibility
title: 'Android App Compatibility on Shani OS — What Works, What Doesn't, and Workarounds'
date: '2026-05-12'
tag: 'Guide'
excerpt: 'Which Android apps work in Waydroid on Shani OS — Indian banking and government apps, streaming services, DRM status, and practical workarounds for apps that are blocked. Includes a tested compatibility list for common Indian apps.'
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

Waydroid runs Android 11 (AOSP) in a hardware-accelerated container. Most apps work. Some don't — primarily those that use Play Integrity / SafetyNet checks, kernel-level anti-cheat, or heavy ARM JIT that doesn't translate well on x86. This guide covers the practical compatibility picture for common Indian and international apps.

For Waydroid setup, see [Waydroid on Shani OS](https://blog.shani.dev/post/waydroid-android-on-shani-os). For the GApps installation needed to use the Play Store, see that guide's GApps section.

---

## How Compatibility Works

Waydroid runs on your host Linux kernel using Android's `binder` IPC. The x86 translation (libhoudini) handles ARM-compiled apps. Most app issues fall into one of three categories:

**Passes Play Integrity / SafetyNet check → works fine.** The majority of utility apps, productivity tools, social media, and general apps.

**Fails Play Integrity (banking, DRM apps) → blocked.** Apps that perform root/integrity checks will refuse to run or will crash at startup. This is a policy decision by the app developer, not a Waydroid limitation.

**ARM-heavy compute (games, AR) → may be slow or crash.** Apps with native ARM libraries that do intensive computation — complex 3D games, augmented reality — may perform poorly or fail under translation. x86-native apps run at full speed.

---

## Indian Government and Utility Apps

| App | Status | Notes |
|---|---|---|
| **DigiLocker** | ✓ Works | Requires GApps |
| **UMANG** | ✓ Works | Requires GApps |
| **mAadhaar** | ⚠ Limited | Opens but biometric features unavailable |
| **Aarogya Setu** | ✓ Works | Health tracking features functional |
| **MyGov** | ✓ Works | |
| **ePathshala** | ✓ Works | |
| **DIKSHA** | ✓ Works | Educational content plays correctly |
| **NPS (National Pension System)** | ✓ Works | |

---

## Transport and Travel

| App | Status | Notes |
|---|---|---|
| **IRCTC Rail Connect** | ✓ Works | Full booking and PNR status |
| **IRCTC Air** | ✓ Works | |
| **Ola** | ✓ Works | Requires GApps for Maps |
| **Uber** | ✓ Works | Requires GApps |
| **Rapido** | ✓ Works | |
| **RedBus** | ✓ Works | |
| **MakeMyTrip** | ✓ Works | |
| **Yatra** | ✓ Works | |
| **Google Maps** | ✓ Works | Requires GApps |

---

## Payments and Banking

Banking apps are the most commonly asked-about category. Most major Indian banking apps fail Play Integrity checks and will not work in Waydroid. This is a deliberate security policy by the banks, not a Waydroid bug.

| App | Status | Notes |
|---|---|---|
| **BHIM** | ⚠ Limited | Opens, basic UPI may work; biometric blocked |
| **PhonePe** | ✗ Blocked | Play Integrity check fails |
| **Google Pay** | ✗ Blocked | Requires device certification |
| **Paytm** | ⚠ Limited | Wallet features work; UPI blocked |
| **Amazon Pay** | ⚠ Limited | Shopping payments work; UPI blocked |
| **SBI Yono** | ✗ Blocked | Root/integrity check at launch |
| **HDFC Mobile Banking** | ✗ Blocked | |
| **ICICI iMobile** | ✗ Blocked | |
| **Axis Mobile** | ✗ Blocked | |
| **Kotak Mobile Banking** | ✗ Blocked | |

**Workaround for banking apps:** Use the bank's website in Vivaldi or Firefox. Most major Indian banks have full-featured mobile web apps that work without any Play Integrity requirement. For OTP receipt, your physical phone handles SMS — you can use KDE Connect to read SMS messages on your Shani OS desktop while completing a transaction in the browser.

---

## Streaming and Entertainment

| App | Status | Notes |
|---|---|---|
| **JioCinema** | ✓ Works | HD playback; sports events require GApps |
| **Hotstar / Disney+** | ✓ Works | Requires GApps; up to HD |
| **SonyLIV** | ✓ Works | Requires GApps |
| **ZEE5** | ✓ Works | |
| **MX Player** | ✓ Works | |
| **Netflix** | ⚠ Limited | GApps required; limited to 480p (Widevine L3 only) |
| **Amazon Prime Video** | ⚠ Limited | GApps required; limited to 480p |
| **YouTube** | ✓ Works | Full quality; GApps or Vanced/ReVanced recommended |
| **Spotify** | ✓ Works | Requires GApps |
| **JioSaavn** | ✓ Works | |
| **Gaana** | ✓ Works | |
| **Wynk Music** | ✓ Works | |

**Note on Netflix/Amazon streaming quality:** Waydroid provides Widevine L3 certification only. L1 (required for HD/4K in apps) is not available. For HD Netflix and Amazon Prime Video, use the browser — Vivaldi has Widevine built in, and both services work at HD quality in Vivaldi or Firefox on the desktop.

---

## Communication

| App | Status | Notes |
|---|---|---|
| **WhatsApp** | ✓ Works | Requires GApps; needs phone number for initial setup |
| **Telegram** | ✓ Works | Also available as a native Flatpak — prefer that |
| **Signal** | ✓ Works | Also available as a native Flatpak — prefer that |
| **Instagram** | ✓ Works | Requires GApps |
| **Twitter / X** | ✓ Works | Requires GApps |
| **Snapchat** | ⚠ Limited | Opens but camera features unreliable |
| **Google Meet** | ✓ Works | Requires GApps; use browser version for reliability |
| **Zoom** | ✓ Works | Native Flatpak available — prefer that for video calls |
| **Microsoft Teams** | ✓ Works | Browser version is more reliable |

For messaging apps with native Flatpak alternatives (Telegram, Signal, WhatsApp via web), the native app is always the better choice — better performance, better desktop integration, no ARM translation overhead.

---

## Shopping

| App | Status | Notes |
|---|---|---|
| **Amazon India** | ✓ Works | Requires GApps |
| **Flipkart** | ✓ Works | Requires GApps |
| **Meesho** | ✓ Works | |
| **Myntra** | ✓ Works | |
| **Zepto / Blinkit / Swiggy Instamart** | ✓ Works | Location permissions required |
| **Swiggy** | ✓ Works | |
| **Zomato** | ✓ Works | |

---

## Games

| Category | Status | Notes |
|---|---|---|
| Casual games (2D, puzzle, word) | ✓ Works | Generally excellent |
| Mid-tier 3D games (BGMI, Free Fire) | ⚠ Limited | BGMI has anti-cheat block; Free Fire works |
| **BGMI / PUBG Mobile** | ✗ Blocked | Kernel-level anti-cheat |
| Gacha / RPG games | ✓ Usually works | Most work; some with heavy anti-cheat don't |
| **Genshin Impact** | ✓ Works | Full gameplay; some performance variation |
| Emulated retro games | ✓ Works | Excellent on x86 |

For blocked games with kernel-level anti-cheat: there is no workaround within Waydroid. Use a physical device or a dedicated Windows VM.

---

## Workarounds Summary

**For blocked banking apps:** Use the bank's mobile website in Vivaldi or Firefox. Bookmark it to your browser home screen for quick access.

**For limited DRM streaming:** Use Vivaldi or Firefox for Netflix and Amazon Prime Video (HD quality). Hotstar and JioCinema have better Waydroid compatibility.

**For apps that need Play Certification:** After installing GApps, register your device ID at `google.com/android/uncertified` and wait 15 minutes. This resolves the Play Store "device not certified" warning and improves Play Protect pass rates for some apps.

**For messaging apps that have native Linux alternatives:** Use the Flatpak version. Telegram, Signal, and WhatsApp Web are all better experiences as native desktop apps than via Waydroid.

**For games with ARM-only builds:** Check if an x86 version exists in the Play Store — some games publish both.

---

## Checking App Compatibility

If an app isn't in the table above:

1. Install it and try it — the failure mode is usually immediate (app crashes on launch = Play Integrity block; or poor performance = ARM translation issue)
2. Check [github.com/waydroid](https://github.com/waydroid/waydroid/issues) for reports
3. Ask in the [Telegram community](https://t.me/shani8dev) — someone else has probably tried it

For apps that fail Play Integrity, there is generally no fix within Waydroid. The recommended workaround is the bank/service's mobile website.

---

## Resources

- [Waydroid on Shani OS](https://blog.shani.dev/post/waydroid-android-on-shani-os) — full setup guide
- [Waydroid documentation](https://docs.waydro.id) — upstream project
- [Telegram community](https://t.me/shani8dev) — app compatibility questions
- [docs.shani.dev — Android (Waydroid)](https://docs.shani.dev/doc/software/waydroid)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
