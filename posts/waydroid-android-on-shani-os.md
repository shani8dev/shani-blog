---
slug: waydroid-android-on-shani-os
title: 'Running Android Apps on Shani OS with Waydroid'
date: '2026-04-18'
tag: 'Guide'
excerpt: 'Waydroid runs a full hardware-accelerated Android stack inside a lightweight container on Shani OS — full Play Store access, ARM app compatibility, and native GPU performance. Here is how to set it up and get the most out of it.'
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

Waydroid runs a complete Android operating system in a lightweight Linux container, giving you access to the full Android app ecosystem on your Shani OS desktop. Unlike emulators that virtualise the entire hardware stack, Waydroid runs Android using your actual Linux kernel — specifically via the `binder` and `ashmem` kernel modules. The result is near-native performance, not the sluggishness of QEMU-based Android emulation.

On Shani OS, Waydroid is pre-installed and pre-configured. The `@waydroid` Btrfs subvolume stores your Android environment independently of the OS — an OS update or rollback never touches your installed Android apps, their data, or your Google account login.

Full reference: [docs.shani.dev — Android (Waydroid)](https://docs.shani.dev/doc/software/waydroid).

---

## How Waydroid Works

Waydroid uses Android 11 (AOSP) as its base, running inside a Linux container managed by LXC. It communicates with the host Wayland compositor directly — Android apps render as native Wayland surfaces, which means GPU acceleration without an additional translation layer.

The key components:

- **`waydroid` daemon** — manages the Android container lifecycle
- **`binder` kernel module** — provides Android's IPC mechanism
- **LXC container** — isolates the Android userspace from the host Linux userspace
- **Hardware acceleration** — Android's graphics pipeline talks directly to your GPU via the host's Mesa or NVIDIA driver

ARM app compatibility is handled by `libhoudini` (Intel's ARM-to-x86 binary translation), included in the Shani OS Waydroid setup. Most ARM-compiled Android apps run transparently.

---

## First-Time Setup

Waydroid is pre-installed but needs one-time initialisation to download the Android image:

```bash
sudo waydroid-helper init
```

This downloads the Android 11 image (around 800 MB), configures the container, and sets up the `@waydroid` subvolume. The helper also handles the `binder` kernel module and firewall rules — both are already configured in Shani OS, so the process is fully automated.

After initialisation completes:

```bash
# Start the Waydroid session
waydroid session start

# Launch the full Android UI
waydroid show-full-ui
```

The Android home screen appears in a window. On first launch, it takes 30–60 seconds for the Android environment to fully start.

---

## Running Apps

Waydroid supports two display modes:

**Full UI mode** opens the complete Android home screen in a window. You navigate it exactly like an Android tablet.

**App mode** launches a specific Android app directly as a standalone window on your Linux desktop, without showing the Android home screen. Installed Android apps appear in your Linux app launcher automatically and can be launched in app mode.

```bash
# Launch the full Android environment
waydroid show-full-ui

# Install an APK
waydroid app install /path/to/app.apk

# Launch a specific installed app by package name
waydroid app launch com.example.app

# List installed Android apps
waydroid app list
```

---

## Google Play Store and GApps

The default Waydroid image is AOSP without Google services. For apps that require the Play Store or Google Play Services, you need to install GApps (Google Apps). The recommended method on Shani OS:

```bash
# Install the Waydroid script tool
pip install waydroid-script --break-system-packages

# Install GApps (MindTheGapps is the most compatible option)
sudo waydroid-script install gapps

# After installation, restart Waydroid
waydroid session stop
waydroid session start
```

After GApps installation, open the Waydroid full UI, open the Play Store, and sign in with your Google account. Once signed in, the Play Store works identically to a physical Android device.

**Important:** Google's device certification requirement means you need to register your Waydroid device ID with Google before the Play Store allows app downloads. After signing in:

1. Open a browser inside Waydroid and navigate to `google.com/android/uncertified`
2. Enter the Android ID from `adb shell settings get secure android_id`
3. Wait 10–15 minutes, then retry the Play Store

---

## ARM App Compatibility

Most Android apps in the Play Store are compiled for ARM processors, not x86. Waydroid handles this transparently via `libhoudini`, Intel's ARM-to-x86 binary translation layer, which is included in the `waydroid-helper init` setup.

Apps that work without issues under translation: most social media apps, streaming apps, productivity tools, casual games, and the vast majority of the Play Store catalogue.

Apps that may have issues: apps with native ARM libraries that do heavy compute work (some games, augmented reality apps), apps that detect and block binary translation (usually DRM-heavy games).

For x86-native Android apps, Waydroid runs them directly without any translation overhead.

---

## Performance Tuning

**GPU acceleration** is enabled by default on Intel and AMD GPUs. Verify it is working:

```bash
# Check GPU info inside the Android container
adb shell dumpsys SurfaceFlinger | grep "GLES"
# Should show your actual GPU, not a software renderer
```

On NVIDIA GPUs, hardware acceleration requires additional configuration. See [docs.shani.dev — Waydroid NVIDIA](https://docs.shani.dev/doc/software/waydroid) for the specific steps.

**Resolution and DPI:** If Android apps look too large or too small:

```bash
# Set display density (default is 96 for a 1080p display)
waydroid prop set persist.waydroid.width 1920
waydroid prop set persist.waydroid.height 1080
waydroid prop set persist.waydroid.dpi 240
waydroid session stop && waydroid session start
```

**Multi-touch and input:** Touch events from a touchscreen, stylus events, and gamepad input all pass through to the Android environment. For devices without a touchscreen, mouse input is translated to touch events.

---

## File Sharing Between Shani OS and Android

Waydroid exposes a shared folder at `~/waydroid/data/media/0/` on the host. Files placed here appear in Android's file manager. Files saved by Android apps to shared storage appear in this directory on the host.

```bash
# Copy a file into Android's storage
cp ~/Downloads/file.pdf ~/waydroid/data/media/0/Documents/

# Access files Android apps saved
ls ~/waydroid/data/media/0/Download/
```

You can also use `adb` for file transfer and debugging:

```bash
# Connect adb to Waydroid (get the IP first)
adb connect $(waydroid status | grep IP | awk '{print $NF}')

# Push a file
adb push file.pdf /sdcard/Documents/

# Pull a file
adb pull /sdcard/Download/app-output.txt ~/Downloads/

# Open a shell inside Android
adb shell
```

---

## Managing the Android Environment

```bash
# Check Waydroid status
waydroid status

# Stop the Waydroid session
waydroid session stop

# Check the Waydroid service
systemctl status waydroid-container.service

# View Waydroid logs
journalctl -u waydroid-container.service -f

# Restart from scratch (keeps your apps and data)
waydroid session stop
waydroid session start
```

The Android environment persists in the `@waydroid` Btrfs subvolume. Even after an OS update or rollback, your installed apps, account logins, and app data are intact.

To fully reset Waydroid (wipes all Android apps and data):

```bash
sudo waydroid-helper init --reinstall
```

---

## Use Cases on Shani OS

**Indian apps that have no Linux equivalent.** BHIM, PhonePe, Paytm, DigiLocker, IRCTC, and many government apps are Android-only. Waydroid lets you run them natively on your Shani OS desktop without a separate phone.

**Streaming apps with DRM.** Netflix, Disney+, and Amazon Prime Video work in Waydroid with Widevine DRM support (included in GApps), enabling HD playback that some Linux browsers cannot achieve.

**Android development testing.** Run your APK directly in Waydroid alongside your development tools on the host. Use `adb` for device communication exactly as you would with a physical device.

**Games.** Casual and mid-tier Android games run well under Waydroid with hardware acceleration. For ARM-heavy 3D games, performance depends on how well `libhoudini` translates the specific game's native libraries.

---

## Troubleshooting

**Waydroid session fails to start:**
```bash
# Check the service status
systemctl status waydroid-container.service
journalctl -u waydroid-container.service -n 50

# Check binder module
lsmod | grep binder

# Re-initialise if needed
sudo waydroid-helper init
```

**Play Store says device is not certified:**
Follow the device registration steps described in the GApps section above. After registering, wait at least 15 minutes before trying the Play Store again.

**Android UI is very slow:**
Confirm hardware acceleration is active by checking the GLES output as described in the Performance Tuning section. If using software rendering, check your GPU driver status on the host.

**Apps crash immediately:**
Most crashes are ARM translation failures. Check if an x86 version of the app is available in the Play Store (some apps publish both). For essential apps without an x86 build, the Distrobox approach (running a full Android SDK in a container for development) may be more reliable.

Full troubleshooting guide: [docs.shani.dev — Android (Waydroid)](https://docs.shani.dev/doc/software/waydroid).

---

## Resources

- [docs.shani.dev — Android (Waydroid)](https://docs.shani.dev/doc/software/waydroid) — full setup and configuration reference
- [Waydroid documentation](https://docs.waydro.id) — upstream project documentation
- [Telegram community](https://t.me/shani8dev) — Waydroid questions and support

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
