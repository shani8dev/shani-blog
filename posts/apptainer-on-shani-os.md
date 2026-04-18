---
slug: apptainer-on-shani-os
title: 'Apptainer (Singularity) on Shani OS — HPC Containers for Workstation and Cluster'
date: '2026-05-07'
tag: 'Guide'
excerpt: 'Apptainer is the HPC standard for portable, reproducible containers — pre-installed on Shani OS, no root required, runs the same SIF image on your workstation and on any SLURM/PBS cluster. Build once, run anywhere, with full NVIDIA and AMD ROCm GPU support.'
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

Apptainer — formerly Singularity — is the container runtime built for HPC. Where Docker and Podman are designed for services and development workflows, Apptainer is designed for a specific problem: running a portable, self-contained environment on machines you do not control. Clusters. Shared login nodes. HPC systems where you cannot run a root daemon, cannot install packages, and cannot guarantee that the host OS matches your workstation.

Apptainer solves this by packaging your entire software environment — libraries, Python packages, tools, environment variables — into a single `.sif` (Singularity Image Format) file. That file runs identically on your Shani OS workstation and on any cluster that has Apptainer installed. No divergence. No "works on my machine."

On Shani OS, Apptainer is pre-installed. No configuration required. It runs as an unprivileged user out of the box.

Full reference: [docs.shani.dev — Containers](https://docs.shani.dev/doc/software/containers).

---

## Apptainer vs Podman vs Distrobox

| | Apptainer | Podman | Distrobox |
|---|---|---|---|
| Primary use case | HPC / cluster portability | Services, dev containers | Mutable dev environments |
| Image format | SIF (single file) | OCI layers | OCI layers |
| Root required | No | No | No |
| Home dir shared | Yes (by default) | No | Yes (by default) |
| GPU passthrough | `--nv` / `--rocm` flags | Manual device flags | Manual device flags |
| Cluster-compatible | Yes — runs anywhere Apptainer is installed | No | No |
| Mutable at runtime | No (images are read-only) | Yes | Yes |

**Use Apptainer when:**
- You need to run the same environment on your workstation and on a SLURM/PBS/LSF cluster
- You are working with collaborators who need to reproduce your exact environment
- You want a single portable file you can archive alongside your data and code
- The cluster you submit to has Apptainer/Singularity installed (most do)

---

## Basic Usage

```bash
# Pull an image from Docker Hub (converted to SIF automatically)
apptainer pull docker://ubuntu:22.04
apptainer pull docker://python:3.11-slim
apptainer pull docker://rocm/pytorch:latest

# Run the default runscript of a container
apptainer run ubuntu_22.04.sif

# Execute a specific command
apptainer exec ubuntu_22.04.sif python3 --version
apptainer exec ubuntu_22.04.sif bash -c "pip list"

# Open an interactive shell
apptainer shell ubuntu_22.04.sif

# Run with NVIDIA GPU support
apptainer exec --nv pytorch_latest.sif python3 -c "import torch; print(torch.cuda.is_available())"

# Run with AMD ROCm GPU support
apptainer exec --rocm rocm_pytorch.sif python3 -c "import torch; print(torch.cuda.is_available())"

# Bind mount a host directory into the container
apptainer exec --bind /home/$USER/data:/data myimage.sif python3 /data/analysis.py

# Multiple bind mounts
apptainer exec \
  --bind /home/$USER/data:/data \
  --bind /home/$USER/scripts:/scripts \
  myimage.sif python3 /scripts/run.py
```

By default, Apptainer automatically binds your home directory into the container. Your files are available at the same paths inside and outside.

---

## Pulling Images from Different Sources

```bash
# From Docker Hub
apptainer pull docker://ubuntu:22.04
apptainer pull docker://nvidia/cuda:12.3.0-devel-ubuntu22.04
apptainer pull docker://rocm/dev-ubuntu-22.04:latest

# From GitHub Container Registry
apptainer pull docker://ghcr.io/some-org/some-image:latest

# From Sylabs Cloud Library (Apptainer's native registry)
apptainer pull library://lolcow

# Save with a specific name
apptainer pull --name my-pytorch.sif docker://pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime

# Inspect an image before running it
apptainer inspect ubuntu_22.04.sif
apptainer inspect --runscript ubuntu_22.04.sif
apptainer inspect --labels ubuntu_22.04.sif
```

---

## Building Reproducible Images

The real power of Apptainer for research is the definition file (`.def`). It is a complete, text-based, version-controllable description of your environment. Anyone with Apptainer can build the identical image from the same `.def` file.

### A Basic Research Environment

```
# python-research.def
Bootstrap: docker
From: ubuntu:22.04

%post
    apt-get update -y && apt-get install -y \
        python3 python3-pip python3-dev \
        git wget curl build-essential

    pip3 install --no-cache-dir \
        numpy==1.26.4 \
        scipy==1.12.0 \
        pandas==2.2.1 \
        matplotlib==3.8.3 \
        scikit-learn==1.4.1 \
        jupyter==1.0.0

%environment
    export PATH=/usr/local/bin:$PATH
    export PYTHONPATH=/usr/local/lib/python3/dist-packages

%runscript
    exec python3 "$@"

%labels
    Author your.name@institution.edu
    Version 1.0
    Description Python 3.11 research environment — paper XYZ reproducibility
```

```bash
# Build it (--fakeroot avoids needing real root)
apptainer build --fakeroot python-research.sif python-research.def

# Verify
apptainer inspect --labels python-research.sif

# Test
apptainer exec python-research.sif python3 -c "import numpy; print(numpy.__version__)"

# Share — the .sif file is fully self-contained
# Collaborators run: apptainer exec python-research.sif python3 their_script.py
```

### A Bioinformatics Environment

```
# bioinformatics.def
Bootstrap: docker
From: ubuntu:22.04

%post
    apt-get update -y && apt-get install -y \
        python3 python3-pip \
        samtools bwa bowtie2 \
        bedtools fastqc trimmomatic \
        r-base r-cran-ggplot2 r-cran-dplyr

    pip3 install --no-cache-dir \
        biopython snakemake pysam

%environment
    export PATH=/usr/local/bin:$PATH

%labels
    Version 2.1
    Description Bioinformatics pipeline environment
```

### A PyTorch + CUDA Environment

```
# pytorch-cuda.def
Bootstrap: docker
From: nvidia/cuda:12.3.0-devel-ubuntu22.04

%post
    apt-get update -y && apt-get install -y python3 python3-pip

    pip3 install --no-cache-dir \
        torch==2.2.0+cu121 \
        torchvision torchaudio \
        --index-url https://download.pytorch.org/whl/cu121

    pip3 install --no-cache-dir \
        transformers datasets accelerate \
        wandb tensorboard

%environment
    export PATH=/usr/local/bin:$PATH

%runscript
    exec python3 "$@"
```

```bash
apptainer build --fakeroot pytorch-cuda.sif pytorch-cuda.def

# Run with GPU access
apptainer exec --nv pytorch-cuda.sif python3 train.py
```

---

## Submitting to HPC Clusters

The `.sif` file you build and test on your Shani OS workstation is exactly what you submit to the cluster. Copy the file to shared storage and reference it in your job script.

### SLURM

```bash
#!/bin/bash
#SBATCH --job-name=my_analysis
#SBATCH --nodes=1
#SBATCH --ntasks=8
#SBATCH --mem=32G
#SBATCH --gres=gpu:1
#SBATCH --time=04:00:00
#SBATCH --output=job_%j.log

# Load Apptainer module if needed (many clusters require this)
# module load apptainer   # uncomment if cluster uses modules

# Run with NVIDIA GPU
apptainer exec --nv \
  --bind /scratch/$USER/data:/data \
  /scratch/$USER/pytorch-cuda.sif \
  python3 /home/$USER/analysis/train.py --config config.yaml

# For AMD GPU clusters, swap --nv for --rocm
# apptainer exec --rocm ...
```

### PBS/Torque

```bash
#!/bin/bash
#PBS -N my_analysis
#PBS -l nodes=1:ppn=8:gpus=1
#PBS -l mem=32gb
#PBS -l walltime=04:00:00

cd $PBS_O_WORKDIR

apptainer exec --nv \
  --bind /scratch/$USER/data:/data \
  /scratch/$USER/pytorch-cuda.sif \
  python3 analysis/train.py
```

### Parallel Jobs with MPI

Apptainer supports MPI-enabled containers for multi-node jobs. The MPI on the host must match the MPI version inside the container (hybrid model):

```bash
# Launch an MPI job where mpirun is on the host
mpirun -np 32 apptainer exec --nv \
  /scratch/$USER/mpi-app.sif \
  /app/my_mpi_program
```

---

## GPU Support in Detail

Apptainer's `--nv` and `--rocm` flags automatically inject the host GPU runtime libraries into the container at runtime. You do not need to bundle drivers in the SIF image — the container stays driver-version agnostic and will work as long as the library ABI is compatible.

```bash
# NVIDIA — inject CUDA runtime from host
apptainer exec --nv myimage.sif nvidia-smi
apptainer exec --nv myimage.sif python3 -c "import torch; print(torch.cuda.device_count())"

# AMD ROCm — inject ROCm runtime from host
apptainer exec --rocm myimage.sif rocm-smi
apptainer exec --rocm myimage.sif python3 -c "import torch; print(torch.cuda.is_available())"

# Check what GPU libraries are being injected
apptainer exec --nv --debug myimage.sif true 2>&1 | grep -i nvidia
```

This means the same `.sif` file works across cluster generations as long as the container's CUDA/ROCm version is compatible with the host driver. No rebuilding per cluster.

---

## Persistent Overlays

By default, Apptainer images are read-only. If you need to install additional packages temporarily or persist data inside the container:

```bash
# Create a writable overlay (stored separately, layered over the read-only SIF)
apptainer overlay create --size 512 my-overlay.img

# Use it
apptainer exec --overlay my-overlay.img myimage.sif bash

# Inside: install extra packages — they persist in the overlay
pip install some-extra-package

# Next run with the same overlay: the package is still there
apptainer exec --overlay my-overlay.img myimage.sif python3 -c "import some_extra_package"
```

For a fully writable sandbox (useful during image development):

```bash
# Create a writable sandbox directory
apptainer build --sandbox my-sandbox/ docker://ubuntu:22.04

# Enter in writable mode
apptainer shell --writable my-sandbox/

# Inside: make changes, install packages, test your .def file
apt-get install -y some-tool

# Convert the tested sandbox back to a SIF
apptainer build final.sif my-sandbox/
```

---

## Caching and Storage

Apptainer caches pulled images in `~/.apptainer/cache` by default. On Shani OS, your home directory lives in the `@home` subvolume and persists across OS updates, so the cache survives updates naturally.

```bash
# See cache size
du -sh ~/.apptainer/cache

# Clear the cache
apptainer cache clean

# Change cache location (e.g. to a scratch disk)
export APPTAINER_CACHEDIR=/scratch/$USER/apptainer-cache
```

Pulled and built `.sif` files are standalone files — store them wherever makes sense for your workflow. On a cluster, typically on your scratch or project storage. Locally, wherever you keep project files.

---

## Practical Tips

**Pin your base image versions.** Use `From: ubuntu:22.04` not `From: ubuntu:latest`. This ensures your `.def` file builds the same image six months from now.

**Record package versions in your `.def` file.** Use `pip install package==X.Y.Z` not just `pip install package`. Your future self and collaborators will thank you.

**Keep the `.def` file in version control alongside your code.** The `.sif` file is a build artefact — the `.def` is the source. Commit the `.def`, not the binary.

**Test locally before submitting to cluster.** Run your full pipeline on a small dataset locally with `apptainer exec` before writing the job script. Cluster queue time is expensive.

**Use `--bind` explicitly for data directories.** Don't rely on automatic home binding for large datasets — be explicit about what goes where.

---

## Apptainer vs the Full Ecosystem

All of these are available on Shani OS simultaneously and serve distinct roles:

**Use Apptainer when** you need portable, reproducible containers for HPC and cluster workflows — a single `.sif` file that runs identically on your workstation and on any SLURM/PBS/LSF cluster. The right tool when cluster compatibility and long-term reproducibility are the primary requirements.

**Use Podman when** you want OCI containers for services, databases, and development workflows. Rootless, Docker-compatible, daemon-free. Not cluster-compatible, but the right tool for running PostgreSQL, Redis, self-hosted apps, and Compose stacks locally. Guide: [Podman on Shani OS](https://blog.shani.dev/post/podman-containers-on-shani-os).

**Use Distrobox when** you need `apt`, `pacman`, `dnf`, or `yay` — the full package manager of a specific distro — with your home directory shared into the container. Guide: [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os).

**Use LXC/LXD or systemd-nspawn when** you need a complete isolated Linux system with its own init system and network stack — lighter than a VM but more complete than a Distrobox container. Guides: [LXC and LXD on Shani OS](https://blog.shani.dev/post/lxc-lxd-on-shani-os) · [systemd-nspawn on Shani OS](https://blog.shani.dev/post/systemd-nspawn-on-shani-os).

**Use Nix when** you want CLI tools or development runtimes installed persistently without a container — multiple versions without conflict, reproducible per-project environments via `shell.nix`. Guide: [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os).

**Use Flatpak when** you want GUI desktop applications from Flathub. Guide: [Flatpak on Shani OS](https://blog.shani.dev/post/flatpak-on-shani-os).

**Use Virtual Machines when** you need full hardware-level isolation — a separate kernel, a Windows VM, or GPU passthrough. virt-manager is pre-installed on the KDE Plasma edition. Guide: [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines).

---

## Resources

- [docs.shani.dev — Containers](https://docs.shani.dev/doc/software/containers) — full Apptainer reference
- [Shani OS for Researchers and HPC](https://blog.shani.dev/post/shani-os-for-researchers-and-hpc) — full research computing stack: Nix, GPU compute, DVC, remote access
- [Apptainer documentation](https://apptainer.org/docs/user/latest/) — official upstream docs
- [Sylabs Cloud Library](https://cloud.sylabs.io/library) — ready-made HPC SIF images
- [Podman on Shani OS](https://blog.shani.dev/post/podman-containers-on-shani-os) — OCI containers and services
- [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os) — mutable dev containers with full distro package managers
- [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os) — CLI tools and dev environments
- [Virtual Machines on Shani OS](https://blog.shani.dev/post/shani-os-virtual-machines) — full VMs with hardware isolation
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
