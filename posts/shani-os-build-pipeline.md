---
title: "Inside the Shanios Build Pipeline: From Package List to Bootable Image"
date: 2026-08-25
author: Shrinivas Kumbhar
author_bio: Creator of Shanios. Building immutable Linux distributions.
author_initials: SK
author_linkedin: shrinivaskumbhar
author_github: shrinivasvkumbhar
author_website: https://shani.dev
tag: Deep Dive
series: Shani OS Deep Dives
slug: shani-os-build-pipeline
cover: /assets/images/blog/shani-os-build-pipeline.webp
category: Engineering
readTime: "10 min"
---

Every Shanios release starts as a list of package names and ends as a GPG-signed, Secure Boot-ready ISO. The build pipeline that bridges those two endpoints is fully automated, runs inside a Docker container, and produces reproducible Btrfs images across six image profiles — three of which (GNOME, Plasma, COSMIC) are ISO-capable desktop profiles. This post walks through how it works.

---

## The Entry Point

Everything starts with `build.sh` in the [shani-install-media](https://github.com/shani8dev/shani-install-media) repository. It is a dispatcher — it parses a command and profile, then calls the appropriate sub-script:

```bash
./build.sh full -p plasma    # build everything for KDE Plasma
./build.sh image -p gnome    # just the base image
./build.sh iso-only -p cosmic # download from R2, build ISO, upload
```

The compound commands chain stages together: `full` runs image → flatpak → snap → iso → repack → release latest → upload all in sequence. `iso-only` skips local image building entirely and downloads the base image from Cloudflare R2 instead.

---

## Stage 1: The Base Image

`build-base-image.sh` is where the real work happens. It:

1. Creates a Btrfs subvolume in a chroot directory
2. Runs `pacstrap` with the profile's package list from `image_profiles/<profile>/package-list.txt`
3. Applies the shared overlay — base configs, systemd units, environment files
4. Runs the profile-specific customization script (e.g., `gnome-customization.sh`) — note these per-profile scripts are currently empty placeholders; profile differences are handled by each profile's package list, its `overlay/`, and whether it ships `flatpak-packages.txt`/`snap-packages.txt`
5. Takes a Btrfs snapshot and compresses it with Zstandard

The output is a `.zst` file — a Btrfs send-stream that can be received onto any Btrfs filesystem with the exact same byte-level layout.

Each profile has its own package list:

| Profile | Packages | Desktop | ISO |
|---|---|---|---|
| `gnome` | ~25 base packages + Flatpaks | GNOME | ✅ published |
| `plasma` | ~25 base packages + Flatpaks | KDE Plasma | ✅ published |
| `cosmic` | ~25 base packages + Flatpaks | COSMIC | ✅ capable, not yet published |
| `kiosk` | minimal (Cage + labwc + Firefox) | Cage/LabWC (full-screen Firefox) | ❌ image-only |
| `server` | ~120 explicit packages | None (headless) | ❌ image-only |
| `shared` | — | — (overlay-only base) | ❌ |

The three desktop profiles (gnome, plasma, cosmic) each have an `iso_profiles/<profile>/` counterpart that mkarchiso turns into a Secure Boot-ready ISO — so all three are **ISO-capable**. GNOME and Plasma ISOs are currently published on the download server; COSMIC's ISO is buildable but has not yet been released. The kiosk and server profiles are **image-only** — they build a base image but deliberately have no ISO counterpart (kiosk is a full-screen Cage/LabWC kiosk; server is headless and masks all `plymouth-*.service` units). The `shared` profile holds the base overlay (configs, systemd units, environment files) that every other profile starts from.

The server profile is notably different from the desktops — it deliberately excludes the desktop metapackages and instead installs `shani-tools-network` plus cloud-init, systemd-networkd, and container tooling.

---

## Stage 2: Flatpak and Snap Images

If `flatpak-packages.txt` exists for the profile (it does for all desktop editions), `build-flatpak-image.sh` creates a separate Btrfs subvolume, installs every Flatpak listed, and produces a `flatpakfs.zst`. Same pattern for snaps via `build-snap-image.sh`.

These separate images are bundled into the ISO — they are not part of the base image because Flatpak and Snap runtimes are large and change independently of the base system.

---

## Stage 3: ISO Assembly

`build-iso.sh` runs `mkarchiso` (the standard Arch Linux ISO builder) with the base image and optional Flatpak/Snap images as source. The `--from-r2` flag allows building without the base image locally — it downloads from Cloudflare R2, verifies the SHA256 and GPG signature, then feeds it to mkarchiso.

---

## Stage 4: Repack and Sign

`repack-iso.sh` takes the unsigned ISO and:

1. Signs it with `sbsign` using the Secure Boot key
2. Generates `.sha256` and `.asc` (GPG signature) files
3. Creates a BitTorrent file for peer-assisted distribution

The output is a `signed_<os>-<date>-<profile>.iso` ready for distribution.

---

## Stage 5: Upload and Release

`upload.sh` pushes artifacts to two destinations:

- **SourceForge** — the build's landing pad, accessed via `lftp`; holds the base-image `.zst` rootfs streams (no signed ISOs)
- **Cloudflare R2** — the primary download host for signed ISOs (`downloads.shani.dev`), mirrored from every SourceForge upload via `rclone`

`release.sh` creates channel manifest files (`latest.txt` or `stable.txt`) that `shani-deploy` reads to determine what's available for update.

---

## The Docker Environment

None of this runs on your host machine. The entire pipeline executes inside `shrinivasvkumbhar/shani-builder` — a privileged Docker container based on `archlinux:base-devel` that pre-installs `archiso`, `btrfs-progs`, `arch-install-scripts`, `shim-signed`, `sbsigntools`, `mokutil`, `zsync`, `rsync`, `rclone`, `mktorrent`, `flatpak`, `systemd`, `snapd`, and the Shanios signing key.

The container runs as privileged because image assembly requires Btrfs operations, loop mounts, and chroot — all of which need host-level access. The host's source tree is bind-mounted read-only, and output artifacts are written to a cache directory.

---

## CI/CD

Four GitHub Actions workflows in [shani-builder](https://github.com/shani8dev/shani-builder) automate the pipeline:

- **`build-docker.yaml`** — builds and pushes the `shrinivasvkumbhar/shani-builder` build container itself
- **`build-image.yml`** — triggered on push to `main` or manual dispatch, builds the OS image
- **`build.yaml`** — orchestrates the full build/release run within the container
- **`promote-stable.yml`** — promotes the current `latest` build to `stable` after verification

Both build workflows use AWS OIDC for authentication — no long-lived credentials are stored in GitHub secrets for the core build path.

---

## Testing

`build.sh test` wraps a full test environment (`test-env/`) with many subcommands — `disk`, `ca`, `bootstrap`, `enter`, `upgrade`, `reboot`, `rollback`, `install`, `configure`, `pacstrap`, `qemu`, and `clean`. A few common ones:

- `test disk` — creates loop-mounted disks, installs the image, boots it, runs health checks
- `test bootstrap -p <profile>` — installs and configures a profile from scratch
- `test cycle -p <profile>` — full lifecycle: install → update → rollback → verify

Tests run inside the same Docker container as the build, using `systemd-nspawn` for boot simulation.

---

## Why This Matters

The build pipeline is not a side project — it is the mechanism that makes Shanios reproducible. Every release is produced by the same code path, in the same container, with the same package versions. There is no "build it on my machine" step. An OEM can fork the repo, change a package list, and get an identical pipeline producing their custom image.

If you are building a custom Linux distribution or managing fleet images, the Shanios build pipeline is a reference implementation of how to do atomic, reproducible image builds on top of Arch Linux.
