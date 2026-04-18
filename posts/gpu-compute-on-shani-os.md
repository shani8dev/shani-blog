---
slug: gpu-compute-on-shani-os
title: 'GPU Compute on Shani OS — NVIDIA CUDA, AMD ROCm, and Intel oneAPI'
date: '2026-05-07'
tag: 'Guide'
excerpt: 'How to run GPU compute workloads on Shani OS — AMD ROCm with PyTorch and TensorFlow, NVIDIA CUDA via Distrobox, Intel oneAPI, HIP for cross-vendor portability, and Nix for pure ML environments. Works for ML, simulation, data science, and scientific computing.'
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

GPU compute on Shani OS works at first boot. AMD GPUs have the open-source AMDGPU kernel driver and full ROCm compute stack pre-configured. NVIDIA drivers are set up during installation. Intel GPUs use Mesa's open-source Vulkan and compute drivers. This post covers how to actually use them — from verifying hardware, to running PyTorch or TensorFlow, to writing portable GPU code that runs on any vendor.

For GPU passthrough to VMs (dedicating a GPU to a Windows VM for gaming or isolated ML), see [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines). For using GPU compute inside Apptainer containers for HPC clusters, see [Apptainer on Shani OS](https://blog.shani.dev/post/apptainer-on-shani-os).

Full reference: [docs.shani.dev — Containers](https://docs.shani.dev/doc/software/containers).

---

## Choosing Your GPU Compute Stack

| GPU | Driver | Compute API | Recommended path |
|---|---|---|---|
| NVIDIA (RTX / Tesla / H-series) | proprietary nvidia-open | CUDA | Distrobox with `nvidia/cuda` image |
| AMD (RX 6000 / RX 7000 / Instinct) | open AMDGPU | ROCm / HIP | Host ROCm stack or Distrobox |
| Intel (Arc, Xe, integrated) | open i915 / Xe | oneAPI / SYCL | Distrobox with `intel/oneapi-basekit` |
| Any (portability) | any above | OpenCL | Available in all three stacks |

---

## AMD ROCm

ROCm is AMD's open-source GPU compute stack — the equivalent of CUDA for AMD hardware. Shani OS ships with the AMDGPU kernel driver and ROCm userspace pre-configured. Most Radeon RX 6000, RX 7000, and Instinct series cards are supported.

### Verify ROCm

```bash
# Verify ROCm installation and GPU visibility
rocminfo

# List detected GPUs and utilisation
rocm-smi

# Check ROCm runtime version
/opt/rocm/bin/rocminfo | grep -i "ROCm Runtime"
```

### PyTorch and TensorFlow via Distrobox

The cleanest way to run ROCm ML workloads is inside a Distrobox container using AMD's official image. The container has the correct ROCm libraries pre-installed and device access configured:

```bash
# Create a ROCm-capable container
distrobox create --name rocm-dev \
  --image rocm/dev-ubuntu-22.04:latest \
  --additional-flags "--device=/dev/kfd --device=/dev/dri --group-add video --group-add render"

distrobox enter rocm-dev

# Install PyTorch for ROCm
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm6.0

# Verify GPU access
python3 -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"

# Install TensorFlow for ROCm
pip install tensorflow-rocm
```

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

## NVIDIA CUDA

NVIDIA drivers are configured at installation time on the KDE Plasma edition. The proprietary `nvidia-open` kernel module is in the initramfs.

### Verify NVIDIA

```bash
# Check driver and GPU visibility
nvidia-smi

# Check CUDA version available
nvidia-smi | grep "CUDA Version"
```

### PyTorch and TensorFlow via Distrobox

CUDA libraries live in the NVIDIA driver stack, but the development toolchain (nvcc, cuDNN, etc.) is most cleanly managed inside a container using NVIDIA's official CUDA base images:

```bash
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

## Intel oneAPI

Intel Arc discrete GPUs and Intel integrated graphics (Xe architecture) support GPU compute via Intel's oneAPI toolkit.

```bash
# Create an Intel compute container
distrobox create --name intel-dev --image intel/oneapi-basekit:latest
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
# Install hipify tool via Nix
nix-env -iA nixpkgs.rocmPackages.hipify

# Convert a CUDA source file to HIP
hipify-perl my_kernel.cu > my_kernel.hip.cpp

# Compile for AMD GPU (inside ROCm Distrobox container or with ROCm installed)
hipcc my_kernel.hip.cpp -o my_kernel

# The same source compiles for NVIDIA with nvcc after hipify
```

HIP code uses `hip::` namespaces and `hipMalloc`/`hipMemcpy` APIs which map directly to the underlying vendor runtime at compile time.

---

## PyTorch / JAX / TensorFlow via Nix

For pure-Nix ML workflows without containers — useful for quick experimentation or when you want everything managed declaratively:

```bash
# NVIDIA path — uses pre-built binaries
nix-shell -p python311 python311Packages.torch-bin python311Packages.jaxlib-bin

# AMD ROCm path — uses ROCm-enabled builds from nixpkgs
nix-shell -p python311 python311Packages.torchWithRocm

# Project-specific environment — create a shell.nix
```

```nix
# shell.nix for a PyTorch project (ROCm)
{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  buildInputs = with pkgs; [
    python311
    python311Packages.torchWithRocm
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

The Nix approach is lighter than a full Distrobox container but gives you less control over the exact CUDA/ROCm library versions. For production ML training, the Distrobox container approach is more reliable.

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

**Via Nix:**

```bash
nix-env -iA nixpkgs.jupyter nixpkgs.python311 nixpkgs.python311Packages.ipykernel
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
# AMD
rocm-smi                    # ROCm's GPU monitor
radeontop                   # real-time AMD GPU stats

# NVIDIA
nvidia-smi                  # NVIDIA GPU monitor
nvidia-smi dmon             # continuous monitoring

# Intel
sudo intel_gpu_top          # Intel GPU utilisation

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
