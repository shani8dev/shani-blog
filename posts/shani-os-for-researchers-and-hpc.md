---
slug: shani-os-for-researchers-and-hpc
title: 'Shani OS for Researchers and HPC — Reproducible Environments from Desktop to Cluster'
date: '2026-04-16'
tag: 'Guide'
excerpt: 'How Shani OS makes scientific computing reproducible from the ground up — Apptainer for cluster workloads, Nix for pinned environments, GPU passthrough for ML, AMD ROCm for open-source GPU compute, and a GPG-signed host OS that is itself a verifiable artefact.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '12 min'
series: 'Shani OS Deep Dives'
---

Reproducibility is the central challenge of modern scientific computing. You produce a result on your workstation. A collaborator cannot replicate it. A cluster job produces different output six months later because the software environment drifted. A reviewer asks for the exact environment used — and it no longer exists.

Shani OS approaches this problem at every layer. The host OS is a cryptographically signed, immutable artefact — it is itself reproducible and verifiable. Apptainer, the HPC standard for container portability, is pre-installed and configured. Nix provides declarative, pinned environments for local work. GPU workloads run with full hardware acceleration across NVIDIA CUDA, AMD ROCm, and Intel compute stacks. The full stack — from kernel to container to workload — can be described, versioned, and reproduced.

This post covers the tools and workflows that make Shani OS well-suited for research computing. Full reference documentation lives at [docs.shani.dev](https://docs.shani.dev).

---

## The Host OS as a Reproducible Artefact

Most discussions of research reproducibility focus on the software environment inside a container. But containers run on top of a host OS, and the host matters — kernel version, security policy, driver behaviour, glibc version. If the host is a traditional mutable Linux system, it drifts. Package upgrades accumulate. The host on your workstation diverges from the host on the cluster login node.

Shani OS fixes this at the architecture level. Every release is a GPG-signed, SHA256-verified image deployed atomically via `shani-deploy`. The host OS you run today is the identical, byte-for-byte verified image that came out of the build pipeline. It does not drift. Two machines on the same release channel run the same kernel, the same glibc, the same systemd — verified by the same cryptographic signature.

When you submit a container to a cluster, the Apptainer image captures the software layer. The host below it is the Shani OS release version — a documented, versioned, immutable artefact. The full stack is describable: "Apptainer image `sha256:...` on Shani OS `2026.04.15`."

For the full architecture: [The Architecture Behind Shani OS](https://blog.shani.dev/post/shani-os-architecture-deep-dive).

---

## Apptainer (Singularity) for HPC

Apptainer — formerly Singularity, the de facto standard for HPC container portability — is pre-installed on Shani OS. No configuration required. It runs as an unprivileged user, which is what most clusters require.

### Basic Usage

```bash
# Pull an image from Docker Hub (converted to SIF format automatically)
apptainer pull docker://ubuntu:22.04

# Run a container
apptainer run ubuntu_22.04.sif

# Execute a specific command
apptainer exec ubuntu_22.04.sif python3 --version

# Open a shell in the container
apptainer shell ubuntu_22.04.sif

# Run with NVIDIA GPU support
apptainer exec --nv ubuntu_22.04.sif python3 -c "import torch; print(torch.cuda.is_available())"

# Run with AMD ROCm GPU support
apptainer exec --rocm ubuntu_22.04.sif python3 -c "import torch; print(torch.cuda.is_available())"

# Bind mount a host directory into the container
apptainer exec --bind /home/$USER/data:/data myimage.sif python3 /data/analysis.py
```

### Building a Reproducible Research Image

Create a definition file that describes your environment completely:

```
# myresearch.def
Bootstrap: docker
From: ubuntu:22.04

%post
    apt-get update -y
    apt-get install -y python3 python3-pip git
    pip3 install numpy scipy pandas matplotlib scikit-learn jupyter

%environment
    export PATH=/usr/local/bin:$PATH

%runscript
    exec python3 "$@"

%labels
    Author your.name@institution.edu
    Version 1.0
    Description Python 3 research environment for paper XYZ
```

```bash
# Build the image (requires root or --fakeroot)
apptainer build --fakeroot myresearch.sif myresearch.def

# Verify the image
apptainer inspect myresearch.sif

# Share the image with collaborators (the .sif file is self-contained)
# They can run identical results with the same SIF file
```

The `.def` file is your environment specification. It is version-controllable, reviewable, and reproducible. Anyone with Apptainer can build the same image from the same definition file.

### Submitting to a Cluster

Most HPC clusters (SLURM, PBS, LSF) support Apptainer natively:

```bash
#!/bin/bash
#SBATCH --job-name=my_analysis
#SBATCH --nodes=1
#SBATCH --ntasks=8
#SBATCH --gres=gpu:1
#SBATCH --time=04:00:00

# Your SIF file lives on shared storage or is copied at job submission
apptainer exec --nv /scratch/$USER/myresearch.sif \
    python3 /home/$USER/analysis/run_experiment.py --config config.yaml
```

For AMD GPU clusters, swap `--nv` for `--rocm`:

```bash
apptainer exec --rocm /scratch/$USER/myresearch.sif \
    python3 /home/$USER/analysis/run_experiment.py --config config.yaml
```

The same `.sif` file you tested on your Shani OS workstation is what runs on the cluster. No "works on my machine" — because the container is the same machine.

Full Apptainer documentation: [docs.shani.dev — Apptainer](https://docs.shani.dev/doc/software/containers).

---

## Nix for Pinned Local Environments

For local development and analysis work, Nix provides something Apptainer does not: precise, declarative package specifications with cryptographic pinning, without container overhead.

Nix is pre-installed on Shani OS. The `@nix` Btrfs subvolume is shared between both OS slots, so your Nix environments survive every OS update and rollback untouched. Add a channel once:

```bash
nix-channel --add https://nixos.org/channels/nixpkgs-unstable nixpkgs
nix-channel --update
```

### Pinned Environments with shell.nix

A `shell.nix` file is a precise description of your environment — every package, every version, determined by the Nixpkgs commit you pin to:

```nix
# shell.nix for a bioinformatics analysis
{ pkgs ? import (fetchTarball {
    # Pin to a specific Nixpkgs commit for full reproducibility
    url = "https://github.com/NixOS/nixpkgs/archive/6adf48f53d819a7b6e15672817fa069e5f8f8c42.tar.gz";
    sha256 = "0hg612fmfzmb5k9rk1f2b5cwb1bhlh8l3d4a9qn8m9r1c5q3g0j";
  }) {}
}:

pkgs.mkShell {
  buildInputs = with pkgs; [
    python311
    python311Packages.numpy
    python311Packages.scipy
    python311Packages.pandas
    python311Packages.matplotlib
    python311Packages.biopython
    r
    rPackages.ggplot2
    rPackages.dplyr
    blast
    samtools
    bwa
  ];
}
```

```bash
# Enter the environment
nix-shell

# Anyone running this shell.nix gets byte-identical packages
# The sha256 hash pins the exact Nixpkgs snapshot
```

For a simpler but less strictly pinned approach, `nix-env -iA` installs packages into your profile:

```bash
# Install common scientific tools
nix-env -iA nixpkgs.python311
nix-env -iA nixpkgs.julia
nix-env -iA nixpkgs.octave
nix-env -iA nixpkgs.gnuplot
nix-env -iA nixpkgs.texlive.combined.scheme-full  # Full LaTeX
nix-env -iA nixpkgs.pandoc
nix-env -iA nixpkgs.zotero
```

Full Nix guide: [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os).

---

## GPU Workloads — NVIDIA CUDA and AMD ROCm

GPU support on Shani OS works at first boot. NVIDIA drivers are configured during installation (KDE edition) or available immediately after (GNOME edition). AMD GPUs use the open-source AMDGPU kernel driver with full ROCm compute support. Intel GPUs use Mesa's open-source drivers with Vulkan and compute.

### AMD ROCm

ROCm is AMD's open-source GPU compute stack — the AMD equivalent of CUDA. Shani OS ships with the AMDGPU kernel driver and ROCm userspace pre-configured. Most Radeon RX 6000, RX 7000, and Instinct series cards are supported.

**Check ROCm status:**

```bash
# Verify ROCm installation and GPU visibility
rocminfo

# List detected GPUs and their utilisation
rocm-smi

# Check ROCm runtime version
/opt/rocm/bin/rocminfo | grep -i "ROCm Runtime"
```

**ROCm Workflows via Distrobox:**

```bash
# Create a ROCm-capable container using AMD's official image
distrobox create --name rocm-dev \
  --image rocm/dev-ubuntu-22.04:latest \
  --additional-flags "--device=/dev/kfd --device=/dev/dri --group-add video --group-add render"
distrobox enter rocm-dev

# Inside the container: install PyTorch for ROCm
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm6.0

# Verify GPU access
python3 -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"

# Install TensorFlow for ROCm
pip install tensorflow-rocm
```

**ROCm environment variables** — useful for tuning and debugging:

```bash
# Target a specific GPU by index (multi-GPU systems)
export ROCR_VISIBLE_DEVICES=0

# Force ROCm to use a specific architecture (e.g. gfx1100 for RX 7900 XT)
export HSA_OVERRIDE_GFX_VERSION=11.0.0

# Enable HIP kernel timing / verbose logging
export AMD_LOG_LEVEL=3
```

**HIP — ROCm's CUDA-compatible programming model:**

ROCm's HIP layer lets you write GPU kernels that compile for both AMD and NVIDIA hardware. Existing CUDA code can often be ported with `hipify`:

```bash
# Install hipify tool
nix-env -iA nixpkgs.rocmPackages.hipify

# Convert a CUDA source file to HIP
hipify-perl my_kernel.cu > my_kernel.hip.cpp

# Compile for AMD GPU
hipcc my_kernel.hip.cpp -o my_kernel
```

**ROCm via Apptainer:**

```bash
# Run ROCm container on cluster
apptainer exec --rocm rocm_pytorch.sif python3 train.py

# Build a ROCm-capable SIF from AMD's Docker image
apptainer build --fakeroot rocm_pytorch.sif docker://rocm/pytorch:latest
```

### NVIDIA CUDA Workflows via Distrobox

```bash
# Create a CUDA-capable Ubuntu container
distrobox create --name ml-dev --image nvidia/cuda:12.3.0-devel-ubuntu22.04
distrobox enter ml-dev

# Install PyTorch with CUDA
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install tensorflow transformers datasets accelerate

# Verify GPU access
python3 -c "import torch; print(torch.cuda.device_count(), torch.cuda.get_device_name(0))"
```

The container lives in the `@containers` Btrfs subvolume and survives every OS update. Your CUDA or ROCm installation is independent of the host OS.

### GPU Access in Apptainer

```bash
# NVIDIA
apptainer exec --nv pytorch_latest.sif python3 train.py

# AMD ROCm
apptainer exec --rocm pytorch_rocm.sif python3 train.py
```

With Apptainer's `--nv` / `--rocm` flags, the respective runtime libraries from the host are automatically injected into the container — no driver bundling required in the SIF image.

### PyTorch / JAX / TensorFlow via Nix

For pure-Nix ML workflows without containers:

```bash
# NVIDIA path
nix-shell -p python311 python311Packages.torch-bin python311Packages.jaxlib-bin

# AMD ROCm path (uses ROCm-enabled builds from nixpkgs)
nix-shell -p python311 python311Packages.torchWithRocm
```

### Choosing Your GPU Compute Stack

| GPU | Driver | Compute API | Distrobox image |
|---|---|---|---|
| NVIDIA (RTX/Tesla/H-series) | proprietary | CUDA | `nvidia/cuda:12.x-devel-ubuntu22.04` |
| AMD (RX 6000/7000, Instinct) | open AMDGPU | ROCm / HIP | `rocm/dev-ubuntu-22.04:latest` |
| Intel (Arc, Xe) | open i915/Xe | oneAPI / SYCL | `intel/oneapi-basekit` |
| Any (portability) | any above | OpenCL | available in all three stacks |

---

## Jupyter and Interactive Computing

Jupyter runs well on Shani OS via multiple paths:

**Via Nix (recommended for reproducibility):**

```bash
nix-env -iA nixpkgs.jupyter nixpkgs.python311 nixpkgs.python311Packages.ipykernel

# Or a project-specific environment
nix-shell -p jupyter python311 python311Packages.numpy python311Packages.matplotlib
jupyter lab
```

**Via Distrobox — for conda-based workflows, or GPU-accelerated notebooks:**

```bash
# CUDA notebooks
distrobox enter ml-dev
conda create -n research python=3.11 jupyter scipy numpy pandas
conda activate research
jupyter lab --ip=0.0.0.0 --no-browser

# ROCm notebooks — same pattern, different container
distrobox enter rocm-dev
pip install jupyter
jupyter lab --ip=0.0.0.0 --no-browser
```

**Via Flatpak:**

```bash
flatpak install flathub org.jupyter.JupyterLab
```

---

## Version Control and Data Management

### Git and Data Versioning

```bash
git config --global user.name "Your Name"
git config --global user.email "you@institution.edu"

# DVC (Data Version Control) for large datasets — via Nix
nix-env -iA nixpkgs.dvc

dvc init
dvc add data/raw_dataset.csv
dvc remote add -d myremote s3://my-research-bucket
dvc push
```

### Backup with restic

Your research data warrants encrypted, versioned backups. `restic` is pre-installed:

```bash
# Initialise a backup repository (S3, local, SFTP, or Backblaze)
restic -r s3:s3.amazonaws.com/my-research-bucket init

# Backup your data and analysis directories
restic -r s3:s3.amazonaws.com/my-research-bucket backup \
    ~/data ~/analysis ~/notebooks

# Verify backup integrity
restic -r s3:s3.amazonaws.com/my-research-bucket check

# Restore a specific snapshot
restic -r s3:s3.amazonaws.com/my-research-bucket restore latest --target ~/restored
```

`restic`'s configuration lives in `/data/varlib/restic` and survives OS updates. Full guide: [docs.shani.dev — Backup](https://docs.shani.dev/doc/networking/backup).

---

## Remote Access for Cluster Workflows

### SSH to Cluster Login Nodes

```bash
# Enable SSH agent for key forwarding to cluster
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Connect to cluster with agent forwarding (for git, etc.)
ssh -A username@cluster.institution.edu

# Transfer files efficiently
rsync -avz --progress ~/analysis/ cluster:~/analysis/
```

### Tailscale for Institution VPN

For institutions using standard VPN setups, Tailscale provides a simpler alternative where your Shani OS workstation joins a mesh network with your cluster:

```bash
sudo tailscale up
# Your machine gets a stable Tailscale IP reachable from the cluster and vice versa
```

Tailscale state persists across OS updates at `/data/varlib/tailscale`. Full guide: [docs.shani.dev — Tailscale](https://docs.shani.dev/doc/networking/tailscale).

---

## The Reproducibility Stack, Summarised

| Layer | Tool | What it pins |
|---|---|---|
| Host OS | Shani OS release + GPG key | Kernel, drivers, system libraries |
| Local environment | `shell.nix` with commit hash | Exact package versions + dependencies |
| Container | Apptainer `.sif` + `.def` | Full userspace environment |
| GPU compute | ROCm version / CUDA version in SIF | Driver-independent runtime |
| Data | DVC + restic | Dataset versions + encrypted backups |
| Code | Git | Source history |

Each layer is independently verifiable. The combination gives you a research stack that another group can, in principle, reproduce exactly — from the OS version to the training data to the analysis code — regardless of whether they run NVIDIA or AMD hardware.

---

## Resources

- [docs.shani.dev — Containers](https://docs.shani.dev/doc/software/containers) — Apptainer, Podman, Distrobox full reference
- [docs.shani.dev — Nix Package Manager](https://docs.shani.dev/doc/software/nix) — Nix setup and usage on Shani OS
- [docs.shani.dev — Virtual Machines](https://docs.shani.dev/doc/software/vms) — GPU passthrough via VFIO for ML workloads
- [docs.shani.dev — Backup](https://docs.shani.dev/doc/networking/backup) — rclone and restic configuration
- [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os) — detailed Nix guide
- [The Architecture Behind Shani OS](https://blog.shani.dev/post/shani-os-architecture-deep-dive) — how subvolumes and slots work
- [ROCm documentation](https://rocm.docs.amd.com) — AMD's official compute stack reference
- [HIP porting guide](https://rocm.docs.amd.com/projects/HIP/en/latest/porting_guide.html) — migrating CUDA code to HIP/ROCm

[Download Shani OS at shani.dev →](https://shani.dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
