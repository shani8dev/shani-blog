---
title: "Shanios as a Development Machine: Toolchains Without Breaking Immutability"
date: 2026-08-25
author: Shrinivas Kumbhar
author_bio: Creator of Shanios. Building immutable Linux distributions.
author_initials: SK
author_linkedin: shrinivaskumbhar
author_github: shrinivasvkumbhar
author_website: https://shani.dev
tag: Guide
series: Shani OS Guides
slug: shani-os-development-setup
cover: /assets/images/blog/shani-os-development-setup.webp
category: Guide
readTime: "8 min"
---

Every immutable distro gets the same question from developers: "So where do I install my toolchain?" On a traditional Linux box the answer is easy and terrible — `sudo apt install` everything into one global `/usr`, cross your fingers, and hope nothing conflicts. On Shanios, the answer is better because it has to be: the root filesystem is read-only, so toolchains live outside it, in layers that survive every update and rollback. Here is how I use it daily — which layer to pick for what, IDEs, per-project environments, dev databases that start themselves at login, and an honest section about what you cannot do.

---

## Four Layers, Four Jobs

Shanios gives you four runtime layers, and each has a clear job:

| Layer | Best for | Pattern |
|---|---|---|
| **Nix** | Reproducible CLI toolchains, per-project environments | `nix-env -iA nixpkgs.<pkg>`, `shell.nix` |
| **Distrobox** | Full mutable distro environments (apt/dnf/pacman inside) | `distrobox create && distrobox enter` |
| **Flatpak** | GUI apps and IDEs | `flatpak install flathub <app>` |
| **Podman** | Services, databases, stacks | `podman run`, quadlets |

The decision is mechanical once you frame it as questions. Need a compiler pinned per project? Nix shell. Need real system libraries from Ubuntu or Fedora repos? Distrobox. Need something with a GUI? Flatpak, which auto-updates every 12 hours in the background. Need something listening on port 5432? Rootless Podman, no contest. And because nothing touches the root, `sudo shani-deploy` (and its rollback, `sudo shani-deploy -r`) never disturbs a single byte of your development setup.

---

## The VS Code Flatpak Reality

VS Code is not pre-installed, and neither are the JetBrains IDEs. They install as Flatpaks:

```bash
flatpak install flathub org.visualstudio.code
flatpak search org.jetbrains
```

The Flatpak VS Code runs sandboxed, which surprises people coming from deb/rpm installs. Two things to know. First, extensions and settings persist under `~/.var/app/org.visualstudio.code/` — inside `@home` — so they ride through updates and rollbacks untouched. Second, host binaries are reachable but not on `$PATH` by magic; either wire up `flatpak-spawn --talk` helpers or configure the integrated terminal to open a host terminal.

If the sandbox genuinely does not fit, the escape is the distrobox-export trick worth memorizing:

```bash
distrobox enter ubuntu-dev
distrobox-export --app code
```

That puts an entry in GNOME Activities or the KDE menu that launches VS Code inside the container while looking and behaving like a native window. Unsandboxed filesystem access, containerized dependencies. (A plain `nix-env -iA nixpkgs.vscodium` works too when you just want a binary.)

---

## Per-Project Toolchains with shell.nix

For anything version-sensitive I keep a `shell.nix` next to the project:

```nix
# ~/projects/myapp/shell.nix
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_22
    python311
    postgresql_16
  ];

  shellHook = ''
    export PGDATA=$PWD/.pgdata
    echo "node $(node --version), python $(python3 --version)"
  '';
}
```

Then `cd ~/projects/myapp && nix-shell`, and I am in an environment with exactly those versions — regardless of what the OS ships, what I installed last week, or which slot I booted. Commit the file and anyone who clones the repo gets the same environment. This is the single biggest quality-of-life upgrade over traditional distro workflows.

Rust deserves a special mention: rustup just works, because `~/.cargo` and `~/.rustup` live in `@home`. Run the installer, forget about it.

---

## Dev Databases That Start Themselves

Databases never belong on a read-only root anyway, so Podman feels natural here rather than like a workaround:

```bash
podman run -d --name dev-postgres -e POSTGRES_PASSWORD=dev \
  -v dev-pgdata:/var/lib/postgresql/data -p 127.0.0.1:5432:5432 postgres:16
```

Named volumes keep data across container rebuilds, and multi-service stacks run with plain `podman-compose up -d` against any existing `docker-compose.yml`.

But the piece I actually love is quadlets — systemd units that turn a container into a first-class login service:

```ini
# ~/.config/containers/systemd/dev-postgres.container
[Container]
Image=docker.io/library/postgres:16
Environment=POSTGRES_PASSWORD=dev
Volume=dev-pgdata:/var/lib/postgresql/data
PublishPort=127.0.0.1:5432:5432

[Service]
Restart=always

[Install]
WantedBy=default.target
```

Drop that file in place, run `systemctl --user daemon-reload && systemctl --user start dev-postgres`, and Postgres starts at every login, restarts if it crashes, and lives completely outside the OS image. No daemon, no root, no config files scattered around.

---

## Dev Containers on Podman

VS Code's Dev Containers extension speaks Docker, but it happily speaks Podman too:

```bash
systemctl --user enable --now podman.socket
echo $XDG_RUNTIME_DIR/podman/podman.sock   # /run/user/1000/podman/podman.sock
```

Point the extension at Podman with `"dev.containers.dockerPath": "podman"` in `settings.json`, or export the socket for any Docker-API client: `DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock`. After that, "Reopen in Container" builds and runs entirely rootless — no Docker daemon, no root, no conflict with immutability at all.

---

## What You Cannot Do (Honesty Section)

Three things, stated plainly:

**No DKMS or out-of-tree kernel modules on the host.** Kernel modules must match the exact running kernel, and on Shanios the kernel only ever changes through signed image deploys. Letting ad-hoc module builds scribble over that would break both signature verification and rollback guarantees — the two properties the whole design exists to protect. If you need to test kernels or modules, do it in a VM; qemu-base and libvirt are pre-installed, and `virt-install` gets you running in minutes.

**No global pacman packages.** There is no pacman on the host, full stop. Package needs route through Nix, Flatpak, Distrobox, or Podman. After a week this stops feeling restrictive — it feels like having four well-organized drawers instead of one junk drawer.

**No installing system services directly.** Anything needing a boot-time systemd unit belongs in the image upstream, or runs as a user-level container or quadlet. In practice the quadlet path covers almost everything a developer actually wants.

---

## The Mental Model

Nothing you install as a developer ever touches the OS, and nothing the OS does ever touches what you installed. Updates become boring; rollbacks become boring; that boredom is the feature.

Full docs: [Development Environments](https://docs.shani.dev/doc/software/development).

## Resources

- [docs.shani.dev — Development Environments](https://docs.shani.dev/doc/software/development) — the complete reference for this workflow
- [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os) — mutable distro environments with home sharing
- [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os) — reproducible packages on an immutable base
- [Podman and Containers on Shani OS](https://blog.shani.dev/post/podman-containers-on-shani-os) — rootless services and compose
- [Windows Apps on Shani OS](https://blog.shani.dev/post/windows-apps-on-shani-os) — when your dev stack includes Windows tools
- [github.com/shani8dev/shanios](https://github.com/shani8dev/shanios) — source code, issues, releases
