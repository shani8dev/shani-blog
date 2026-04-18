---
slug: shani-os-for-researchers-and-hpc
title: 'Shani OS for Researchers and HPC — Reproducible Environments from Desktop to Cluster'
date: '2026-04-16'
tag: 'Guide'
excerpt: 'How Shani OS makes scientific computing reproducible from the ground up — Apptainer for cluster workloads, Nix for pinned environments, AMD ROCm and NVIDIA CUDA for GPU compute, DVC for data versioning, and a GPG-signed host OS that is itself a verifiable artefact.'
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

The core idea: you build a single `.sif` file that captures your entire software environment — libraries, Python packages, tools, environment variables. That same file runs identically on your Shani OS workstation and on any SLURM/PBS/LSF cluster that has Apptainer installed. Full NVIDIA (`--nv`) and AMD ROCm (`--rocm`) GPU passthrough is built in — no driver bundling needed.

```bash
# Pull and run an image
apptainer pull docker://ubuntu:22.04
apptainer exec --nv pytorch.sif python3 train.py

# Build a reproducible environment from a .def file
apptainer build --fakeroot myresearch.sif myresearch.def
```

The `.def` definition file is your environment specification — version-controllable, reviewable, and shareable. Anyone with Apptainer can build the identical image from the same `.def`. Keep it in version control alongside your code; the `.sif` is just the build artefact.

Full guide including definition files, SLURM/PBS job scripts, MPI, persistent overlays, and GPU detail: [Apptainer on Shani OS →](https://blog.shani.dev/post/apptainer-on-shani-os)

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

GPU support on Shani OS works at first boot. NVIDIA drivers are configured during installation. AMD GPUs use the open-source AMDGPU kernel driver with full ROCm compute support. Intel GPUs use Mesa's open-source drivers with Vulkan and compute.

The typical research pattern: create a Distrobox container using the vendor's official base image (AMD's `rocm/dev-ubuntu-22.04`, NVIDIA's `nvidia/cuda:12.x-devel-ubuntu22.04`, or Intel's `oneapi-basekit`), install PyTorch or TensorFlow inside it, and run your workload. The container lives in `@containers` and survives every OS update. For cluster jobs, Apptainer's `--nv` and `--rocm` flags inject the host GPU runtime into your SIF image automatically — no driver bundling needed.

For pure-Nix ML environments without containers, `python311Packages.torchWithRocm` (AMD) and `python311Packages.torch-bin` (NVIDIA) are available in nixpkgs.

Full GPU compute guide — ROCm setup, CUDA via Distrobox, HIP cross-vendor portability, Jupyter with GPU access, and monitoring: [GPU Compute on Shani OS →](https://blog.shani.dev/post/gpu-compute-on-shani-os)

---

## Jupyter and Interactive Computing

Jupyter runs on Shani OS via Nix (`nix-env -iA nixpkgs.jupyter`), via Distrobox (recommended for GPU-accelerated notebooks — enter your CUDA or ROCm container and run `jupyter lab`), or via Flatpak (`flatpak install flathub org.jupyter.JupyterLab`). The GPU compute post covers each path in detail: [GPU Compute on Shani OS →](https://blog.shani.dev/post/gpu-compute-on-shani-os)

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
| GPU compute | ROCm version / CUDA version in SIF | Driver-independent runtime — see [GPU Compute on Shani OS](https://blog.shani.dev/post/gpu-compute-on-shani-os) |
| Data | DVC + restic | Dataset versions + encrypted backups |
| Code | Git | Source history |

Each layer is independently verifiable. The combination gives you a research stack that another group can, in principle, reproduce exactly — from the OS version to the training data to the analysis code — regardless of whether they run NVIDIA or AMD hardware.

---

## Resources

- [docs.shani.dev — Containers](https://docs.shani.dev/doc/software/containers) — Apptainer, Podman, Distrobox full reference
- [docs.shani.dev — Nix Package Manager](https://docs.shani.dev/doc/software/nix) — Nix setup and usage on Shani OS
- [docs.shani.dev — Virtual Machines](https://docs.shani.dev/doc/software/vms) — GPU passthrough via VFIO for ML workloads
- [docs.shani.dev — Backup](https://docs.shani.dev/doc/networking/backup) — rclone and restic configuration
- [GPU Compute on Shani OS](https://blog.shani.dev/post/gpu-compute-on-shani-os) — ROCm, CUDA, HIP, Intel oneAPI, Nix ML paths
- [Apptainer on Shani OS](https://blog.shani.dev/post/apptainer-on-shani-os) — full guide: definition files, SLURM/PBS scripts, MPI, overlays, GPU detail
- [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os) — detailed Nix guide
- [The Architecture Behind Shani OS](https://blog.shani.dev/post/shani-os-architecture-deep-dive) — how subvolumes and slots work

[Download Shani OS at shani.dev →](https://shani.dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
