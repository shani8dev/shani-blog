---
slug: gpu-compute-on-shani-os
title: 'GPU Compute on Shani OS — NVIDIA CUDA, AMD ROCm, and Intel oneAPI'
date: '2026-05-07'
tag: 'Guide'
excerpt: 'How to run GPU compute workloads on Shani OS — setting up AMD ROCm with PyTorch and TensorFlow via Distrobox, NVIDIA CUDA via Distrobox, Intel oneAPI, HIP for cross-vendor portability, and Nix for pure ML environments. Works for ML, simulation, data science, and scientific computing.'
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

Shani OS ships with GPU drivers pre-installed — Mesa's open-source stack for AMD and Intel, and the proprietary `nvidia-open` stack for NVIDIA. The GPU compute toolchains (ROCm, CUDA development libraries, oneAPI) are **not** pre-installed on the host; the recommended approach is to run them inside Distrobox containers using the vendor's official images. This keeps the host OS clean and immutable while giving you fully-configured compute environments that survive every OS update.

This post covers how to set up and use GPU compute — from verifying hardware, to running PyTorch or TensorFlow, to writing portable GPU code that runs on any vendor.

For GPU passthrough to VMs (dedicating a GPU to a Windows VM for gaming or isolated ML), see [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines). For using GPU compute inside Apptainer containers for HPC clusters, see [Apptainer on Shani OS](https://blog.shani.dev/post/apptainer-on-shani-os).

Full reference: [docs.shani.dev — Containers](https://docs.shani.dev/doc/software/containers).

---

## What Ships on the Host

Shani OS includes GPU drivers, not compute toolchains. Here is what is pre-installed:

| Vendor | What's included on the host |
|---|---|
| AMD | `vulkan-radeon` (Mesa RADV), `AMDGPU` kernel driver |
| NVIDIA | `nvidia-open`, `nvidia-utils`, `nvidia-prime`, `libva-nvidia-driver` |
| Intel | `vulkan-intel`, `libva-intel-driver`, `intel-media-driver`, `vpl-gpu-rt` |
| All | `mesa`, `vulkan-mesa-layers`, `libvdpau-va-gl` |

For compute workloads (ML training, GPGPU, scientific simulation), you need the vendor compute stack — ROCm for AMD, CUDA libraries for NVIDIA, oneAPI for Intel. These live inside Distrobox containers, not on the host.

---

## Choosing Your GPU Compute Stack

| GPU | Driver (host) | Compute API | Recommended path |
|---|---|---|---|
| NVIDIA (RTX / Tesla / H-series) | `nvidia-open` | CUDA | Distrobox with `nvidia/cuda` image |
| AMD (RX 6000 / RX 7000 / Instinct) | `vulkan-radeon` / AMDGPU | ROCm / HIP | Distrobox with `rocm/dev-ubuntu` image |
| Intel (Arc, Xe, integrated) | `vulkan-intel` | oneAPI / SYCL | Distrobox with `intel/oneapi-basekit` |
| Any (portability) | any above | OpenCL | Available in all three vendor images |

---

## Verify Your GPU

Before setting up a compute container, confirm your GPU is visible to the host.

```bash
# All vendors — check kernel-detected GPUs
lspci | grep -E "VGA|3D|Display"

# NVIDIA — check driver and GPU visibility
nvidia-smi

# AMD — check kernel driver is loaded
lsmod | grep amdgpu
ls /dev/dri/

# Intel — check device nodes
ls /dev/dri/
```

---

## AMD ROCm via Distrobox

ROCm is AMD's open-source GPU compute stack — the equivalent of CUDA for AMD hardware. The host has the AMDGPU kernel driver and Vulkan driver installed; the ROCm userspace compute libraries live inside a Distrobox container.

```bash
# Create a ROCm-capable container using AMD's official image
distrobox create --name rocm-dev \
  --image rocm/dev-ubuntu-22.04:latest \
  --additional-flags "--device=/dev/kfd --device=/dev/dri --group-add video --group-add render"

distrobox enter rocm-dev

# Verify ROCm can see your GPU
rocminfo
rocm-smi

# Install PyTorch for ROCm
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm6.0

# Verify GPU access
python3 -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"

# Install TensorFlow for ROCm
pip install tensorflow-rocm
```

The `--device=/dev/kfd --device=/dev/dri` flags give the container access to the GPU compute and render devices from the host. The `--group-add video --group-add render` flags ensure the container user has the right group permissions.

The container lives in the `@containers` Btrfs subvolume and survives every OS update. Your entire ROCm ML environment is independent of the host OS.

### ROCm Environment Variables

```bash
# Target a specific GPU by index (multi-GPU systems)
export ROCR_VISIBLE_DEVICES=0

# Force ROCm to use a specific architecture (e.g. gfx1100 for RX 7900 XT)
export HSA_OVERRIDE_GFX_VERSION=11.0.0

# Enable HIP kernel timing / verbose logging
export AMD_LOG_LEVEL=3
```

### ROCm via Apptainer (HPC clusters)

If you are running workloads on a cluster, Apptainer's `--rocm` flag injects the host ROCm runtime into the container automatically:

```bash
apptainer exec --rocm rocm_pytorch.sif python3 train.py

# Build a ROCm-capable SIF from AMD's Docker image
apptainer build --fakeroot rocm_pytorch.sif docker://rocm/pytorch:latest
```

See [Apptainer on Shani OS](https://blog.shani.dev/post/apptainer-on-shani-os) for full cluster workflow details.

---

## NVIDIA CUDA via Distrobox

The host has `nvidia-open` and `nvidia-utils` installed. The CUDA development toolchain (nvcc, cuDNN, etc.) lives inside a Distrobox container using NVIDIA's official CUDA base images.

```bash
# Verify the host driver is working
nvidia-smi

# Create a CUDA-capable container
distrobox create --name cuda-dev --image nvidia/cuda:12.3.0-devel-ubuntu22.04
distrobox enter cuda-dev

# Install PyTorch with CUDA 12.1
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install common ML stack
pip install tensorflow transformers datasets accelerate wandb

# Verify GPU access
python3 -c "import torch; print(torch.cuda.device_count(), torch.cuda.get_device_name(0))"
```

### CUDA via Apptainer

```bash
apptainer exec --nv pytorch_latest.sif python3 train.py
```

With `--nv`, Apptainer injects the host NVIDIA runtime into the container — no driver bundling required in the SIF image.

---

## Intel oneAPI via Distrobox

Intel Arc discrete GPUs and Intel integrated graphics (Xe architecture) support GPU compute via Intel's oneAPI toolkit. The host has `vulkan-intel` and the Intel media drivers; oneAPI itself runs in a container.

```bash
# Create an Intel compute container
distrobox create --name intel-dev \
  --image intel/oneapi-basekit:latest \
  --additional-flags "--device=/dev/dri"

distrobox enter intel-dev

# Verify Intel GPU visibility
sycl-ls

# Run a SYCL sample
cd /opt/intel/oneapi/samples && icpx -fsycl vector_add.cpp -o vector_add && ./vector_add
```

---

## HIP — Write Once, Run on AMD and NVIDIA

ROCm's HIP layer provides a CUDA-compatible programming model that compiles for both AMD and NVIDIA hardware. If you are writing new GPU code or porting existing CUDA code, HIP gives you cross-vendor portability.

```bash
# Inside your ROCm Distrobox container:

# Convert a CUDA source file to HIP
hipify-perl my_kernel.cu > my_kernel.hip.cpp

# Compile for AMD GPU
hipcc my_kernel.hip.cpp -o my_kernel

# The same source compiles for NVIDIA with nvcc after hipify
```

HIP code uses `hip::` namespaces and `hipMalloc`/`hipMemcpy` APIs which map directly to the underlying vendor runtime at compile time.

---

## PyTorch / JAX / TensorFlow via Nix

For pure-Nix ML workflows without containers — useful for quick CPU-based experimentation or when you want everything managed declaratively. Note that GPU-accelerated Nix ML paths require matching the Nix-packaged ROCm or CUDA version against your hardware and host driver, which is more involved than the Distrobox approach. For most GPU work, Distrobox containers are more reliable.

```bash
# NVIDIA path — uses pre-built CPU binaries (GPU requires matching CUDA version)
nix-shell -p python311 python311Packages.torch-bin

# Project-specific environment — create a shell.nix
```

```nix
# shell.nix for a CPU-based PyTorch project
{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  buildInputs = with pkgs; [
    python311
    python311Packages.torch-bin
    python311Packages.numpy
    python311Packages.pandas
    python311Packages.matplotlib
    jupyter
  ];
}
```

```bash
nix-shell  # enter the environment
jupyter lab
```

For GPU-accelerated Nix environments, the Distrobox container approach using vendor images is recommended — it handles library versioning against the installed driver automatically.

---

## Jupyter with GPU Access

**Via Distrobox (recommended for GPU-accelerated notebooks):**

```bash
# CUDA notebooks
distrobox enter cuda-dev
pip install jupyter
jupyter lab --ip=0.0.0.0 --no-browser
# Access at http://localhost:8888

# ROCm notebooks — same pattern
distrobox enter rocm-dev
pip install jupyter
jupyter lab --ip=0.0.0.0 --no-browser
```

**Via Nix (CPU / no GPU acceleration without additional setup):**

```bash
nix-shell -p jupyter python311 python311Packages.numpy python311Packages.matplotlib
jupyter lab
```

**Via Flatpak:**

```bash
flatpak install flathub org.jupyter.JupyterLab
```

---

## Monitoring GPU Utilisation

```bash
# AMD — requires entering the ROCm container, or using host kernel tools
radeontop                   # real-time AMD GPU stats (host)
# rocm-smi is available inside the rocm-dev Distrobox container

# NVIDIA
nvidia-smi                  # NVIDIA GPU monitor (host)
nvidia-smi dmon             # continuous monitoring

# Intel
sudo intel_gpu_top          # Intel GPU utilisation (host)

# MangoHud (gaming + compute) — overlays GPU stats on screen
MANGOHUD=1 python3 train.py
```

---

## Resources

- [Shani OS for Researchers and HPC](https://blog.shani.dev/post/shani-os-for-researchers-and-hpc) — reproducibility stack: Apptainer, Nix, DVC, cluster workflows
- [Apptainer on Shani OS](https://blog.shani.dev/post/apptainer-on-shani-os) — HPC containers with `--nv` and `--rocm` GPU passthrough
- [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines) — GPU passthrough via VFIO for dedicated VM compute
- [Gaming on Shani OS](https://blog.shani.dev/post/shani-os-gaming-deep-dive) — GPU setup, drivers, and gaming-oriented GPU configuration
- [ROCm documentation](https://rocm.docs.amd.com) — AMD's official compute stack reference
- [HIP porting guide](https://rocm.docs.amd.com/projects/HIP/en/latest/porting_guide.html) — migrating CUDA code to HIP/ROCm
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
