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

QEMU/KVM on Shani OS runs VMs with near-native performance. The virtualisation stack — QEMU, libvirt, virt-manager, OVMF (UEFI for VMs), VirtIO drivers, Spice, and looking-glass — is pre-installed on the KDE Plasma edition and available via Flatpak on GNOME.

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

virt-manager is the GUI frontend for libvirt and QEMU/KVM. On KDE Plasma, it is pre-installed. On GNOME:

```bash
# Install via Flatpak on GNOME
flatpak install flathub org.virt_manager.virt-manager
```

Enable the libvirt daemon:

```bash
sudo systemctl enable --now libvirtd
sudo usermod -aG libvirt $USER
# Log out and back in for the group change to take effect
```

Launch virt-manager from the applications menu or:

```bash
virt-manager
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

Full GPU passthrough guide: [docs.shani.dev — Virtual Machines](https://docs.shani.dev/doc/software/vms).

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

## systemd-nspawn Containers

For lighter-weight isolation — closer to containers than VMs — `systemd-nspawn` provides OS-level virtualisation using the host kernel. It is pre-installed and state lives in `@machines`:

```bash
# Create an Arch Linux container
sudo machinectl pull-tar --verify=no \
    https://geo.mirror.pkgbuild.com/images/latest/Arch-Linux-x86_64-basic.tar.zst \
    archlinux

# Start the container
sudo machinectl start archlinux

# Log in
sudo machinectl login archlinux

# List running containers
machinectl list
```

nspawn containers are faster to start than full VMs and share the host kernel, but provide less isolation. Use Distrobox for development containers with full home directory integration, and nspawn for system-level isolation.

---

## VM Snapshots and Backup

```bash
# Create a VM snapshot via virsh
virsh snapshot-create-as --domain vmname \
    --name "before-update-$(date +%Y%m%d)" \
    --description "Pre-update snapshot"

# List snapshots
virsh snapshot-list vmname

# Revert to a snapshot
virsh snapshot-revert vmname snapshot-name

# Delete a snapshot
virsh snapshot-delete vmname snapshot-name

# Backup a VM disk image
rsync -avz /var/lib/libvirt/images/vmname.qcow2 backup-destination/
```

VM disk images live in `/var/lib/libvirt/images/`, which maps to the `@libvirt` subvolume. Btrfs snapshots of this subvolume provide instant, space-efficient backups:

```bash
# Snapshot the entire @libvirt subvolume
sudo btrfs subvolume snapshot /var/lib/libvirt /snapshots/libvirt-$(date +%Y%m%d)
```

---

## Networking VMs

By default, libvirt creates a NAT network (`virbr0`) — VMs can access the internet but are not accessible from outside the host. For VMs that need to be directly accessible on your LAN, use a bridge:

```bash
# Create a bridge via NetworkManager
nmcli connection add type bridge con-name br0 ifname br0
nmcli connection add type bridge-slave con-name br0-eth ifname eth0 master br0
nmcli connection up br0

# Use br0 in virt-manager: VM → Add Hardware → NIC → Source: br0
```

For a simpler setup where only the host needs to access the VM, the default NAT network works fine. Access the VM via its local IP:

```bash
# List VMs and their IP addresses
virsh net-dhcp-leases default
```

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

- [docs.shani.dev — Virtual Machines](https://docs.shani.dev/doc/software/vms) — full KVM/libvirt reference
- [docs.shani.dev — VM Issues](https://docs.shani.dev/doc/troubleshooting) — troubleshooting
- [Distrobox on Shani OS](https://docs.shani.dev/doc/software/distrobox) — lighter-weight containers with full distro package managers
- [Gaming on Shani OS — GPU Passthrough](https://blog.shani.dev/post/shani-os-gaming-deep-dive) — gaming-focused GPU passthrough details

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
