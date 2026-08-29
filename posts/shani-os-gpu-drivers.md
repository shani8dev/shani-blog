---
title: "NVIDIA, AMD, Intel GPUs on Shanios: How Drivers Work on an Immutable OS"
date: 2026-08-25
author: Shrinivas Kumbhar
author_bio: Creator of Shanios. Building immutable Linux distributions.
author_initials: SK
author_linkedin: shrinivaskumbhar
author_github: shrinivasvkumbhar
author_website: https://shani.dev
tag: Deep Dive
series: Shani OS Deep Dives
slug: shani-os-gpu-drivers
cover: /assets/images/blog/shani-os-gpu-drivers.webp
category: Engineering
readTime: "6 min"
---

Ask any long-time Linux desktop user about graphics drivers and you will hear war stories: the kernel update that landed before the NVIDIA module was ready, the DKMS build that silently failed at 2 AM, the `.run` installer that half-wrote into `/usr` and left the system unbootable after the next kernel bump.

On Shanios, those stories cannot happen. Not because we are careful — because the architecture makes them impossible. This post explains how GPU drivers work on an immutable, image-based OS, and why driver anxiety is one of the first things that dies when you switch.

Full reference: [GPU & Graphics Drivers](https://docs.shani.dev/doc/system/gpu).

---

## Everything Ships in the Signed Image

Every driver your hardware needs is inside the signed OS image: kernel modules, Mesa userspace, NVIDIA userland, and GPU firmware from `linux-firmware`. There is no driver installation step. There is nothing to download after setup, no AUR package to babysit, no DKMS hook waiting for your next kernel update.

The reason this works is simple: a kernel module must match the kernel it loads into, exactly. On a mutable distro, the kernel and the modules are separate packages updated by separate transactions — which is precisely where the classic breakage comes from. On Shanios they are built together, signed together, and deployed together:

```bash
# Kernel + drivers + firmware move as one unit
sudo shani-deploy

# And roll back as one unit too
sudo shani-deploy --rollback
```

A partial upgrade that leaves your NVIDIA module older than your kernel is not rare on Shanios. It is structurally impossible.

## The Driver Matrix

What ships in every image:

| Vendor | Kernel | Userspace |
|--------|--------|-----------|
| AMD | `amdgpu` | Mesa 25.x OpenGL, RADV Vulkan, VAAPI/VDPAU |
| Intel | `i915` / `xe` | Mesa 25.x OpenGL, ANV Vulkan, `intel-media-driver` (iHD), VAAPI/VDPAU |
| NVIDIA | proprietary open kernel module series | NVIDIA GLX/Vulkan/EGL userland, VAAPI shim |
| VMs / fallback | `virtio-gpu`, `simpledrm` | Mesa, llvmpipe software rendering |

Yes — NVIDIA drivers are included out of the box, using the open kernel module flavor, with `nvidia-prime` and `switcheroo-control` pre-configured for hybrid laptops. Firmware files ship split by vendor in the same image, so firmware can never drift from the drivers beside it.

Verify your stack in thirty seconds:

```bash
lspci -k | grep -A3 VGA     # which driver claimed your GPU
ls -l /dev/dri              # renderD128 present = acceleration active
nvidia-smi                  # NVIDIA: version, GPU, processes
journalctl -b | grep -iE 'nvidia|amdgpu|i915' | head
```

## Hybrid Graphics Without the Ritual

On a traditional setup, Optimus laptops involve wiki pages, config snippets, and hope. On Shanios it is a prefix:

```bash
# Run anything on the dGPU
prime-run blender

# Or without prime-run:
__NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia <app>
```

GNOME users do not even need the terminal: right-click any app icon and pick **Launch using dedicated GPU** — that is `switcheroo-control` doing its job. To confirm an app actually used the dGPU, run `nvidia-smi` while it is open; its process shows up in the list or it did not touch the NVIDIA GPU.

Wayland is the default session on every edition, and recent NVIDIA open-module drivers handle it well — explicit sync support removed the flicker-and-corruption class of bugs that used to force people back to X11. If something specific misbehaves, an X11 session is still selectable at the login screen, per login, with zero system changes.

## "I Need a Newer Driver Now"

This is the honest section.

Drivers arrive through images. When NVIDIA or Mesa release upstream, the new versions reach you with the next `shani-deploy` — tested against our kernel, signed, atomic. That pipeline takes days-to-weeks, not hours.

If the image ships a driver older than you need:

1. File an issue at [github.com/shani8dev](https://github.com/shani8dev). Requests directly shape what the next image pins.
2. Know what will not work: there is no DKMS path and no `.run` escape hatch, and that is deliberate. Both write outside the image contract, breaking signature verification and rollback guarantees for everyone. A kernel-side driver simply waits for the next image — I would rather tell you that plainly than sell you a workaround that bricks your boot.
3. Compute userspace is different: CUDA libraries live fine inside containers today, decoupled from the host driver version entirely. See [GPU compute containers](https://docs.shani.dev/doc/software/gpu-containers).

## Rollback Restores GPU Sanity

Last month a tester deployed an image on a hybrid laptop and hit a black screen at boot. On Arch, this begins an evening of chroots. Here, it went like this:

```text
Reboot -> systemd-boot menu -> previous slot -> working desktop
```

The previous slot contained the previous kernel *and* its matching driver pair, untouched. Back at the login screen, `shani-deploy --rollback` restored everything cleanly. Total downtime: one reboot. No nomodeset incantations — the kernel cmdline is immutable anyway, and the slot system makes it unnecessary.

That is the whole pitch in one anecdote: your GPU stack is never half-updated, so it never needs rescuing.

## Resources

- [GPU & Graphics Drivers — docs](https://docs.shani.dev/doc/system/gpu) — full driver reference, verification commands, troubleshooting table
- [GPU Compute on Shani OS](https://blog.shani.dev/post/gpu-compute-on-shani-os) — CUDA via Distrobox, ROCm, oneAPI
- [Gaming on Shani OS](https://blog.shani.dev/post/shani-os-gaming-deep-dive) — Proton, MangoHud, and the pre-installed gaming stack
- [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines) — VFIO GPU passthrough for dedicated VMs
