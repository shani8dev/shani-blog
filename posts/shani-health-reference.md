---
slug: shani-health-reference
title: 'shani-health — System Health Monitoring for Shani OS'
date: '2026-05-12'
tag: 'Reference'
excerpt: 'shani-health is the CLI tool for checking the health of a running Shani OS system — boot state, security posture, storage, network, hardware, and a deep integrity check with machine-readable output. Introduced in the 2026.04.15 release.'
cover: /assets/images/blog/shani-health-reference.webp
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

`shani-health` is the system health and diagnostics CLI introduced in Shani OS 2026.04.15 — the standalone, read-mostly companion to `shani-deploy`. It covers everything about inspecting and hardening a running system: boot/slot state, security posture, storage, network, hardware, and packages.

Full reference: [docs.shani.dev — System Updates](https://docs.shani.dev/doc/updates/system).

---

## Basic Usage

```bash
# Full system status report (default — same as -i/--info)
shani-health

# Deep integrity check: UKI signatures, Btrfs scrub, immutability
shani-health --verify

# Same, plus a machine-readable JSON summary on stdout
shani-health --verify --json

# Individual report sections
shani-health --boot        # slots, entries, deployment, UKI
shani-health --security    # boot chain, encryption, LSMs, users
shani-health -s             # Btrfs storage analysis (or --storage-info)
shani-health --network     # NetworkManager, DNS, VPN, firewall, SSH
shani-health --hardware    # CPU, disk, SMART, temps, firmware
shani-health --packages    # flatpak, snap, nix, containers

# Verbose output
shani-health -v
```

---

## What shani-health Checks

### Boot Report

```bash
shani-health --boot
```

Reports slot state, boot entries, deployment status, and UKI signatures — everything about which slot is active, which is the candidate, and whether the boot chain is consistent.

### Deep Integrity Check

```bash
shani-health --verify
```

The one mode built for automation: it runs UKI signature checks (`sbverify` against the current MOK key), a Btrfs scrub of both slots, slot-marker consistency, boot-entry consistency, and immutability checks (root read-only, `/etc` OverlayFS active, critical subvolumes mounted) — then returns exit code `0` if everything passed, `1` if it found any issue. Add `--json` to also get a structured summary of exactly which check(s) failed — see Scripting below.

### Security Report

```bash
shani-health --security
```

Boot chain, encryption status, active Linux Security Modules, user accounts, and (where relevant) Kerberos state.

### Storage Analysis

```bash
shani-health -s
# or: shani-health --storage-info
```

Native Btrfs storage analysis — subvolume sizes, compression ratios, snapshot usage. This flag used to also exist on `shani-deploy`; it now lives only on `shani-health`.

### Network, Hardware, and Packages

```bash
shani-health --network      # NetworkManager, DNS, VPN, firewall, SSH, servers
shani-health --hardware     # CPU, disk, SMART, temperatures, firmware
shani-health --packages     # Flatpak, Snap, Nix, containers, virtualisation
```

### Other Useful Modes

```bash
shani-health --history [N]           # last N deploy/rollback events (default 50)
shani-health --journal [level]       # journal entries (crit/err/warning)
shani-health --clean-logs [DAYS]     # clean old app logs from /var/log
shani-health --clear-boot-failure    # clear a stale boot-failure marker
shani-health --export-logs [DIR]     # bundle logs + state for bug reports
```

---

## Reading the Output

Every check prints to stderr with a colored status marker as it runs — a full report is a scroll of these, grouped by section:

```
✓ UKI valid:   @blue
✓ UKI valid:   @green
✓ Btrfs clean: @blue
✓ Btrfs clean: @green
✓ Markers OK:  current=@blue  booted=@blue
✓ Boot entry OK: 'shanios-blue.conf' -> shanios-blue+3-0.conf
✓ Root (/): read-only
⚠ /var: not tmpfs (ext4) — volatile state may not be enforced
✓ /etc: overlay active

Verification passed — no integrity issues
```

If something's actually wrong, that line prints in red instead of green, and the exit code goes non-zero — see below.

---

## Scripting with shani-health

`--verify` is the mode built for automation. Everything else is formatted text for a human to read.

### Exit Codes

```
0 — success / no issues
1 — fatal error, or (for --verify) integrity issues found
```

```bash
# Cron-friendly health gate — non-zero exit means alert
if ! shani-health --verify >/tmp/verify.log 2>&1; then
    mail -s "shani-health --verify FAILED on $(hostname)" ops@example.com < /tmp/verify.log
fi
```

### JSON Output (`--verify --json` only)

For a structured summary of exactly which check(s) failed, add `--json` — it only has an effect combined with `--verify`:

```bash
shani-health --verify --json
```

```json
{
  "ok": false,
  "errors": 1,
  "checks": [
    { "name": "uki_signature_blue", "status": "pass", "message": "UKI valid:   @blue" },
    { "name": "immutability_var_tmpfs", "status": "warn", "message": "/var: not tmpfs (ext4) — volatile state may not be enforced" },
    { "name": "immutability_etc_overlay", "status": "fail", "message": "/etc: overlay NOT mounted (fstype: none) — /etc is from read-only root" }
  ]
}
```

`status` is one of `pass`, `warn`, or `fail`. Human-readable output still prints to stderr as usual — only the JSON summary goes to stdout, so piping stdout alone gives you a clean result to parse:

```bash
shani-health --verify --json | jq '.checks[] | select(.status == "fail")'
```

### Fleet Health Monitoring

For fleet deployments, run `shani-health --verify` on a schedule and alert on the exit code, or capture the JSON summary for a dashboard:

```bash
# /etc/systemd/system/shani-health-verify.service
[Unit]
Description=Shani OS Integrity Verification

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'shani-health --verify --json > /var/log/shani-health-verify-$(date +%Y%m%d).json'

# /etc/systemd/system/shani-health-verify.timer
[Unit]
Description=Daily Shani OS Integrity Verification

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

Every other mode (`--boot`, `--security`, `-s`/`--storage-info`, `--network`, `--hardware`, `--packages`) is formatted text only — there's no `--json` for those today, so pulling structured data out of them means parsing text.

---

## Resources

- [docs.shani.dev — System Updates](https://docs.shani.dev/doc/updates/system) — full update system reference
- [shani-os-updates](https://blog.shani.dev/post/shani-os-updates) — shani-deploy and shani-update reference
- [Shani OS for OEMs and IT Fleets](https://blog.shani.dev/post/shani-os-oem-and-fleet-deployment) — fleet monitoring integration
- [2026.04.15 Release Notes](https://blog.shani.dev/post/2026-04-15-release-notes) — release that introduced shani-health
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
