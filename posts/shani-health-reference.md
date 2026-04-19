---
slug: shani-health-reference
title: 'shani-health — System Health Monitoring for Shani OS'
date: '2026-05-12'
tag: 'Guide'
excerpt: 'shani-health is the CLI tool for checking the health of a running Shani OS system — filesystem integrity, slot state, subvolume sizes, service status, and more. Introduced in the 2026.04.15 release.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '5 min'
series: 'Shani OS Reference'
---

`shani-health` is the system health CLI introduced in Shani OS 2026.04.15. It provides a single command for checking the state of the Shani OS-specific components of a running system: slot integrity, Btrfs subvolume health, storage usage, and core service status. It complements `shani-deploy --storage-info`, which reports compressed disk usage, by adding live system health data.

Full reference: [docs.shani.dev — System Updates](https://docs.shani.dev/doc/updates/system).

---

## Basic Usage

```bash
# Run a full health check
shani-health

# Check a specific component
shani-health --slots
shani-health --storage
shani-health --services
shani-health --filesystem

# Output in JSON (for scripts and monitoring)
shani-health --json

# Verbose output
shani-health -v

# Exit with non-zero status if any check fails (for scripting/CI)
shani-health --strict
```

---

## What shani-health Checks

### Slot State

```bash
shani-health --slots
```

Reports:
- **Active slot** — which subvolume (`@blue` or `@green`) is currently booted
- **Candidate slot** — the standby slot and its state (ready, updating, failed, empty)
- **Current slot file** — whether `/data/current-slot` matches the booted subvolume
- **Boot markers** — presence and age of `boot-ok`, `boot_failure`, `boot_hard_failure`
- **Pending reboot** — whether `/run/shanios/reboot-needed` is set
- **Slot versions** — OS version in each slot (read from the slot's `/etc/shani-version`)
- **UKI signatures** — whether the signed UKIs on the ESP match the current MOK key
- **Backup snapshots** — count and age of backup snapshots for each slot

### Storage

```bash
shani-health --storage
```

Reports:
- **Filesystem free space** — usable space remaining on the Btrfs volume (warns below 10 GB)
- **Per-subvolume usage** — actual (uncompressed) and compressed size of each subvolume
- **Deduplication savings** — estimated savings from `bees` deduplication
- **Download cache** — size of cached images in `/data/downloads/`
- **Backup snapshot size** — total space used by slot backup snapshots

This is more detailed than `shani-deploy --storage-info`, which only reports the compressed OS slot sizes.

### Services

```bash
shani-health --services
```

Checks that core Shani OS system services are running and healthy:
- `shani-update.timer` — user-session update check timer
- `beesd@.service` — background Btrfs deduplication daemon
- `tailscaled.service` — Tailscale (if enrolled)
- `firewalld.service` — firewall (warns if inactive)
- `nix-daemon.service` — Nix daemon (warns if inactive)
- `podman.socket` — Podman socket activation

### Filesystem

```bash
shani-health --filesystem
```

Checks:
- **Btrfs consistency** — runs a lightweight `btrfs check --readonly` on the root volume
- **OverlayFS** — confirms `/etc` is correctly mounted as OverlayFS
- **Bind mounts** — verifies that expected bind mounts (`/var/lib/NetworkManager`, `/var/lib/bluetooth`, etc.) are active
- **ESP** — confirms the EFI System Partition is mounted and both UKI files are present

---

## Reading the Output

A passing health check prints a green summary:

```
shani-health 1.0
✓ Slot state       Active: @blue (2026.04.15) | Candidate: @green (2026.04.15) | Clean
✓ Storage          42.3 GB used / 234 GB free (Btrfs compressed) | No snapshot bloat
✓ Services         All core services healthy
✓ Filesystem       OverlayFS, bind mounts, ESP — all OK
```

A warning (yellow) indicates a degraded but functional state:

```
⚠ Storage          Downloads cache: 4.2 GB — run 'sudo shani-deploy -c' to clean up
⚠ Services         beesd not running — deduplication paused
```

An error (red) requires attention:

```
✗ Slot state       boot_failure marker present — last update failed to boot
                   Run 'sudo shani-deploy -r' to restore the candidate slot
✗ Filesystem       /etc OverlayFS not mounted — system configuration may be inconsistent
```

---

## Scripting with shani-health

### JSON Output

For integration with monitoring tools, dashboards, or automated checks:

```bash
shani-health --json
```

Output structure:

```json
{
  "version": "1.0",
  "timestamp": "2026-05-12T14:32:00Z",
  "overall": "healthy",
  "checks": {
    "slots": {
      "status": "ok",
      "active_slot": "blue",
      "active_version": "2026.04.15",
      "candidate_slot": "green",
      "candidate_version": "2026.04.15",
      "boot_failure": false,
      "pending_reboot": false
    },
    "storage": {
      "status": "warning",
      "free_gb": 234.1,
      "download_cache_gb": 4.2,
      "message": "Download cache is large — run shani-deploy -c"
    },
    "services": { "status": "ok" },
    "filesystem": { "status": "ok" }
  }
}
```

### Exit Codes

```
0 — all checks passed (healthy)
1 — one or more warnings (degraded but functional)
2 — one or more errors (action required)
```

Use `--strict` to treat warnings as errors (exit code 2).

### Fleet Health Monitoring

For fleet deployments, run `shani-health --json --strict` on a schedule and forward the output to your monitoring stack:

```bash
# /etc/systemd/system/shani-health-report.service
[Unit]
Description=Shani OS Health Report

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'shani-health --json > /var/log/shani-health-$(date +%Y%m%d).json'

# /etc/systemd/system/shani-health-report.timer
[Unit]
Description=Daily Shani OS Health Report

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

Alternatively, integrate with a Prometheus/Grafana stack by wrapping `shani-health --json` in a custom exporter, or use `shani-health --strict` as a Nagios/Zabbix check script — non-zero exit triggers an alert.

---

## Relationship to shani-deploy --storage-info

`shani-deploy --storage-info` reports Btrfs-compressed sizes of the OS slots specifically. `shani-health --storage` covers the full picture: all subvolumes, the download cache, backup snapshots, and a low-space warning threshold. Use both for different purposes:

```bash
# Quick storage summary focused on OS slots
sudo shani-deploy --storage-info

# Full system storage picture
shani-health --storage

# Everything at once
shani-health -v
```

---

## Resources

- [docs.shani.dev — System Updates](https://docs.shani.dev/doc/updates/system) — full update system reference
- [shani-os-updates](https://blog.shani.dev/post/shani-os-updates) — shani-deploy and shani-update reference
- [Shani OS for OEMs and IT Fleets](https://blog.shani.dev/post/shani-os-oem-and-fleet-deployment) — fleet monitoring integration
- [2026.04.15 Release Notes](https://blog.shani.dev/post/shani-os-2026-04-15-release) — release that introduced shani-health
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
