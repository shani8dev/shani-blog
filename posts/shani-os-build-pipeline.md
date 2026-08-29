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

Every Shanios release starts as a list of package names and ends as a GPG-signed, Secure Boot-ready ISO. The build pipeline that bridges those two endpoints is fully automated, runs inside a Docker container, and produces reproducible Btrfs images across four desktop profiles. This post walks through how it works.

---

## The Entry Point

Everything starts with `build.sh` in the [shani-install-media](https://github.com/shani8dev/shani-install-media) repository. It is a dispatcher — it parses a command and profile, then calls the appropriate sub-script:

```bash
./build.sh full -p plasma    # build everything for KDE Plasma
./build.sh image -p gnome    # just the base image
./build.sh iso-only -p cosmic # download from R2, build ISO, upload
```

The compound commands chain stages together: `full` runs image → flatpak → snap → iso → repack → release → upload in sequence. `iso-only` skips local image building entirely and downloads the base image from Cloudflare R2 instead.

---

## Stage 1: The Base Image

`build-base-image.sh` is where the real work happens. It:

1. Creates a Btrfs subvolume in a chroot directory
2. Runs `pacstrap` with the profile's package list from `image_profiles/<profile>/package-list.txt`
3. Applies the shared overlay — base configs, systemd units, environment files
4. Runs the profile-specific customization script (e.g., `gnome-customization.sh` enables GNOME services, installs GNOME Flatpaks)
5. Takes a Btrfs snapshot and compresses it with Zstandard

The output is a `.zst` file — a Btrfs send-stream that can be received onto any Btrfs filesystem with the exact same byte-level layout.

Each profile has its own package list:

| Profile | Packages | Desktop |
|---|---|---|
| `gnome` | ~25 base packages + Flatpaks | GNOME |
| `plasma` | ~25 base packages + Flatpaks | KDE Plasma |
| `cosmic` | ~25 base packages + Flatpaks | COSMIC |
| `server` | ~30 explicit packages | None (headless) |

The server profile is notably different — it deliberately excludes the desktop metapackages and instead installs `shani-tools-network` plus cloud-init, systemd-networkd, and container tooling.

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

- **SourceForge** — primary download server, accessed via `lftp`
- **Cloudflare R2** — build cache and CDN, accessed via `rclone`

`release.sh` creates channel manifest files (`latest.txt` or `stable.txt`) that `shani-deploy` reads to determine what's available for update.

---

## The Docker Environment

None of this runs on your host machine. The entire pipeline executes inside `shrinivasvkumbhar/shani-builder` — a privileged Docker container based on `archlinux:base-devel` that pre-installs `pacman`, `btrfs-progs`, `zstd`, `squashfs-tools`, `archiso`, `dracut`, `systemd-ukify`, `sbsigntools`, and the Shanios signing key.

The container runs as privileged because image assembly requires Btrfs operations, loop mounts, and chroot — all of which need host-level access. The host's source tree is bind-mounted read-only, and output artifacts are written to a cache directory.

---

## CI/CD

Two GitHub Actions workflows in [shani-builder](https://github.com/shani8dev/shani-builder) automate the pipeline:

- **`build-image.yml`** — triggered on push to `main` or manual dispatch, builds the OS image
- **`promote-stable.yml`** — promotes the current `latest` build to `stable` after verification

Both use AWS OIDC for authentication — no long-lived credentials are stored in GitHub secrets for the core build path.

---

## Testing

`build.sh test` provides three test modes:

- `test disk` — creates loop-mounted disks, installs the image, boots it, runs health checks
- `test bootstrap -p <profile>` — installs and configures a profile from scratch
- `test cycle -p <profile>` — full lifecycle: install → update → rollback → verify

Tests run inside the same Docker container as the build, using `systemd-nspawn` for boot simulation.

---

## Why This Matters

The build pipeline is not a side project — it is the mechanism that makes Shanios reproducible. Every release is produced by the same code path, in the same container, with the same package versions. There is no "build it on my machine" step. An OEM can fork the repo, change a package list, and get an identical pipeline producing their custom image.

If you are building a custom Linux distribution or managing fleet images, the Shanios build pipeline is a reference implementation of how to do atomic, reproducible image builds on top of Arch Linux.
