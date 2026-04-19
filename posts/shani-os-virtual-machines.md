---
slug: shani-os-virtual-machines
title: 'Virtual Machines on Shani OS — QEMU/KVM, virt-manager, GPU Passthrough, and Windows VMs'
date: '2026-04-16'
tag: 'Guide'
excerpt: 'How to run fast, hardware-accelerated VMs on Shani OS — setting up KVM with virt-manager, running Windows with VirtIO drivers, GPU passthrough for gaming or ML, and why the @libvirt subvolume keeps your VMs safe across every OS update.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
keywords: 'shani os virtual machines, kvm qemu linux, virt-manager, gpu passthrough linux, windows vm linux'
readTime: '9 min'
series: 'Shani OS Guides'
---

QEMU/KVM on Shani OS runs VMs with near-native performance. The virtualisation stack is delivered via Flatpak on both editions: the KDE Plasma edition ships `org.virt_manager.virt-manager` and `org.virt_manager.virt_manager.Extension.Qemu` pre-installed; the GNOME edition ships GNOME Boxes (`org.gnome.Boxes`) pre-installed as a Flatpak. OVMF (UEFI for VMs), VirtIO drivers, Spice, and looking-glass are available via Flatpak on both. There is no system QEMU package — all VM tooling runs through the Flatpak stack, which bundles its own QEMU.

VM disk images live in the `@libvirt` and `@qemu` Btrfs subvolumes, which use the `nodatacow` mount option — CoW is disabled for VM disks to avoid write amplification and improve I/O performance. These subvolumes are completely independent of the OS slots; your VMs survive every OS update and rollback untouched.

Full reference: [docs.shani.dev — Virtual Machines](https://docs.shani.dev/doc/software/vms). Troubleshooting: [docs.shani.dev — VM Issues](https://docs.shani.dev/doc/troubleshooting).

---

## Prerequisites

Virtualisation must be enabled in BIOS/UEFI. Check that Intel VT-x or AMD-V is active:

```bash
# Check if KVM is available
lscpu | grep -E "Virtualization|VT"
ls /dev/kvm  # should exist

# Check CPU supports virtualisation
grep -E "vmx|svm" /proc/cpuinfo | head -1
# vmx = Intel, svm = AMD
```

If `/dev/kvm` does not exist, enable Intel VT-x or AMD-V in BIOS and reboot.

For GPU passthrough, IOMMU must also be enabled. The Shani OS kernel is built with `intel_iommu=on` and `amd_iommu=on` already set as defaults — you just need to enable the feature in BIOS:

```bash
# Verify IOMMU is active
dmesg | grep -i iommu | head -5
# Should show: "IOMMU enabled" or "Adding to iommu group"
```

---

## Setting Up virt-manager

virt-manager is the GUI frontend for libvirt and QEMU/KVM. On the KDE Plasma edition it is pre-installed as a Flatpak. On the GNOME edition, GNOME Boxes is pre-installed instead — see the GNOME Boxes section below. To install virt-manager on the GNOME edition:

```bash
flatpak install flathub org.virt_manager.virt-manager
flatpak install flathub org.virt_manager.virt_manager.Extension.Qemu
```

Launch virt-manager:

```bash
flatpak run org.virt_manager.virt-manager
```

---

## GNOME Boxes (GNOME Edition)

GNOME Boxes is pre-installed on the GNOME edition as a Flatpak (`org.gnome.Boxes`) and provides a simple interface for creating and running VMs. It handles QEMU/KVM automatically without manual libvirt configuration.

To create a VM in GNOME Boxes: open Boxes → click **+** → **Create a Virtual Machine** → select your ISO. Boxes configures sensible defaults automatically.

For advanced VM configuration (CPU pinning, GPU passthrough, custom XML), use virt-manager instead — install it via Flatpak:

```bash
flatpak install flathub org.virt_manager.virt-manager
flatpak install flathub org.virt_manager.virt_manager.Extension.Qemu
flatpak run org.virt_manager.virt-manager
```

---

## Creating a Windows VM

Windows VMs with VirtIO drivers run with near-native disk and network performance. Download two ISOs before starting:

1. **Windows ISO** — from Microsoft's official media creation tool
2. **VirtIO drivers ISO** — from [fedorapeople.org/groups/virt/virtio-win/direct-downloads/](https://fedorapeople.org/groups/virt/virtio-win/direct-downloads/) (latest stable)

### In virt-manager:

1. **New VM** → Local install media → select your Windows ISO
2. **Memory:** 8 GB+ recommended; **CPUs:** half your physical cores
3. **Storage:** Use the default `/var/lib/libvirt/images/` path, which maps to `@libvirt`
4. **Before finishing:** check "Customize configuration before install"

### Customise for performance:

In the VM configuration before starting:

- **Firmware:** Set to UEFI (OVMF) — required for Secure Boot and TPM
- **Disk bus:** Change from IDE to **VirtIO**
- **NIC model:** Change to **VirtIO**
- **Video:** Change to **VirtIO** (if not doing GPU passthrough)
- **Add hardware:** Add a second CDROM pointing to the VirtIO drivers ISO

### During Windows installation:

When Windows setup asks "Where do you want to install Windows?" and shows no drives, you need to load the VirtIO disk driver:

1. Click "Load driver"
2. Browse to the VirtIO CD → `amd64\w11\` (or `w10\`)
3. Select the VirtIO SCSI driver
4. Complete installation normally

After Windows installs, open the VirtIO CD in Windows Explorer and run `virtio-win-guest-tools.exe` to install all remaining drivers (network, balloon, Spice agent).

---

## Performance Tuning

### CPU Pinning

For VMs that need consistent performance, pin virtual CPUs to specific physical cores. Check your NUMA topology first:

```bash
lscpu --all --extended
# or
lstopo  # if installed
```

In virt-manager → CPU → Manually set CPU topology, then under XML edit:

```xml
<vcpupin vcpu='0' cpuset='2'/>
<vcpupin vcpu='1' cpuset='3'/>
<vcpupin vcpu='2' cpuset='4'/>
<vcpupin vcpu='3' cpuset='5'/>
```

For gaming VMs, pin cores from the same NUMA node and avoid core 0 (used by the host kernel).

### Memory Ballooning and Hugepages

```xml
<!-- Memory balloon for dynamic memory -->
<memballoon model='virtio'>
  <alias name='balloon0'/>
</memballoon>
```

For high-performance VMs (gaming, ML), static hugepages eliminate TLB pressure:

```bash
# Check available hugepages
cat /proc/meminfo | grep Huge

# Allocate hugepages at boot (edit /etc/sysctl.d/99-hugepages.conf)
echo "vm.nr_hugepages = 4096" | sudo tee /etc/sysctl.d/99-hugepages.conf
```

```xml
<!-- In VM XML, use hugepages -->
<memoryBacking>
  <hugepages/>
</memoryBacking>
```

### VirtIO-FS for Shared Directories

VirtIO-FS is faster than Samba or NFS for sharing directories between host and VM:

```xml
<filesystem type='mount' accessmode='passthrough'>
  <driver type='virtiofs'/>
  <source dir='/home/username/shared'/>
  <target dir='shared'/>
</filesystem>
```

In Windows VM:
```
Mount via WinFsp + VirtIO-FS driver (from virtio-win-guest-tools)
```

In Linux VM:
```bash
mount -t virtiofs shared /mnt/host-shared
```

---

## GPU Passthrough

GPU passthrough dedicates a physical GPU to a VM — the VM gets direct, unmediated hardware access and achieves native GPU performance. This is used for gaming VMs (running Windows games with native GPU speed) and ML workloads.

You need at least two GPUs: one for the host desktop (typically integrated Intel/AMD) and one to pass through to the VM (typically a discrete NVIDIA or AMD card).

### Isolate the GPU

Find the GPU's PCI IDs:

```bash
lspci -nnk | grep -A 3 "NVIDIA\|AMD/ATI"
# Note the [XXXX:XXXX] IDs for the GPU and its audio function
```

Bind the GPU to the `vfio-pci` driver at boot. Add to `/etc/modprobe.d/vfio.conf`:

```
options vfio-pci ids=XXXX:XXXX,XXXX:XXXX
softdep nvidia pre: vfio-pci
softdep amdgpu pre: vfio-pci
```

Add `vfio_pci vfio vfio_iommu_type1` to your initramfs modules and regenerate:

```bash
sudo gen-efi generate --slot $(cat /data/current-slot)
```

After reboot:

```bash
# Verify GPU is bound to vfio-pci
lspci -k | grep -A 3 "NVIDIA\|AMD"
# Should show: Kernel driver in use: vfio-pci
```

### Add GPU to VM

In virt-manager → Add Hardware → PCI Host Device → select your GPU (and its audio function). Set the VM firmware to UEFI.

For Looking Glass (render the VM display at near-zero latency on the host):

```bash
# Install Looking Glass client
nix-env -iA nixpkgs.looking-glass-client

# Run (after VM starts)
looking-glass-client
```

Full GPU passthrough guide: [docs.shani.dev — Virtual Machines](https://docs.shani.dev/doc/software/vms). For gaming-specific passthrough setup (single-GPU, Looking Glass, Proton integration): [Gaming on Shani OS](https://blog.shani.dev/post/shani-os-gaming-deep-dive).

---

## macOS VMs

Running macOS in a VM on Shani OS is possible via OSX-KVM:

```bash
# Clone the OSX-KVM project
git clone --depth 1 https://github.com/kholia/OSX-KVM.git
cd OSX-KVM

# Follow the setup instructions for your macOS version
# The project handles the OpenCore bootloader and image download
```

macOS VMs are useful for iOS development, cross-platform testing, and running macOS-only software without owning Apple hardware.

---

## VM Snapshots and Backup

Snapshots are managed through virt-manager's GUI: right-click a VM → **Manage Snapshots** → **+** to create, or select a snapshot and click **Revert** to restore.

VM disk images are qcow2 files stored in the `@libvirt` subvolume. To back one up, shut down the VM first then copy the image:

```bash
# Find your VM disk image location in virt-manager:
# VM details → Storage → note the image path (e.g. /var/lib/libvirt/images/vmname.qcow2)

# Back up the disk image (VM must be shut down)
rsync -avz /var/lib/libvirt/images/vmname.qcow2 /path/to/backup/
```

Note: `qemu-img` is bundled inside the virt-manager Flatpak and is not on your system PATH. For image conversion or compression, use the Btrfs snapshot approach below — it is faster, space-efficient, and covers all VMs at once.

Btrfs snapshots of the `@libvirt` subvolume provide instant, space-efficient backups of all VMs at once:

```bash
# Snapshot all VM disks at once (VMs should be shut down for consistency)
sudo btrfs subvolume snapshot /var/lib/libvirt /snapshots/libvirt-$(date +%Y%m%d)
```

---

## Networking VMs

virt-manager's Flatpak uses QEMU's user-mode networking (slirp) by default — VMs can access the internet and the host can reach the VM via its local IP, but the VM is not directly visible on your LAN.

To find the VM's IP address, check inside the guest:

```bash
# Inside a Linux VM
ip addr show
```

For a Windows VM, check Settings → Network or run `ipconfig` in cmd.

For VMs that need to be accessible from other machines on your LAN, a macvtap interface is the practical option without a system libvirt installation. In virt-manager → VM details → NIC → change Source to **macvtap** and mode to **Bridge**.

Full networking guide: [Networking on Shani OS](https://blog.shani.dev/post/shani-os-networking-guide).

---

## Running Shani OS as a Guest VM

If you are running Shani OS inside a hypervisor (VirtualBox, VMware, QEMU/KVM), the appropriate guest tools are pre-installed and grouped under `shani-video-guest.target`:

- **QEMU/KVM guests:** `spice-vdagent` (clipboard, display resize) and `qemu-guest-agent` (host-initiated snapshots, graceful shutdown) start automatically
- **VirtualBox guests:** `virtualbox-guest-utils` provides shared folders, seamless mode, and display scaling
- **VMware guests:** `open-vm-tools` provides VMware-specific integration

These activate automatically when the relevant hypervisor is detected. No manual configuration required.

---

## Resources

- [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide) — when things go wrong
- [Shani OS FAQ](https://blog.shani.dev/post/shani-os-faq) — common questions answered
- [The Shani OS Software Ecosystem](https://blog.shani.dev/post/shani-os-software-ecosystem) — what to use for each type of software
- [docs.shani.dev — Virtual Machines](https://docs.shani.dev/doc/software/vms) — full KVM/libvirt reference
- [docs.shani.dev — VM Issues](https://docs.shani.dev/doc/troubleshooting) — troubleshooting
- [systemd-nspawn on Shani OS](https://blog.shani.dev/post/systemd-nspawn-on-shani-os) — lightweight system containers without a daemon
- [LXC and LXD on Shani OS](https://blog.shani.dev/post/lxc-lxd-on-shani-os) — full system containers lighter than VMs
- [Distrobox on Shani OS](https://docs.shani.dev/doc/software/distrobox) — lighter-weight containers with full distro package managers
- [Gaming on Shani OS — GPU Passthrough](https://blog.shani.dev/post/shani-os-gaming-deep-dive) — gaming-focused GPU passthrough details

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
