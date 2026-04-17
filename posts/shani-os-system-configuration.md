---
slug: shani-os-system-configuration
title: 'System Configuration on Shani OS — /etc, Services, and What Persists'
date: '2026-05-06'
tag: 'Guide'
excerpt: 'The /etc OverlayFS on Shani OS means all your configuration changes persist normally across every OS update and rollback. This guide covers editing config files, managing systemd services, enabling services, kernel parameters, and inspecting what you have customised.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '7 min'
series: 'Shani OS Guides'
---

The most common question about configuring an immutable OS is: "If the root is read-only, how do I change things?" The answer on Shani OS is: exactly the same way you would on any Linux distribution.

The `/etc` directory is writable via an OverlayFS mount. Your changes are stored in `/data/overlay/etc/upper/` — separate from the OS image — and layered on top of the read-only OS defaults at boot. When the OS updates, your customisations in the overlay are untouched. When you rollback, same story. Your configuration is always yours.

Full reference: [docs.shani.dev — System Configuration](https://docs.shani.dev/doc/updates/config) and [docs.shani.dev — Overlay Filesystem](https://docs.shani.dev/doc/arch/overlay).

---

## Editing Configuration Files

Nothing special is required. Edit files in `/etc` exactly as you would on any Linux system:

```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config

# Edit hostname
sudo nano /etc/hostname

# Edit hosts file
sudo nano /etc/hosts

# Edit fstab (careful — errors here prevent boot)
sudo nano /etc/fstab

# Edit locale
sudo nano /etc/locale.conf

# Edit environment variables
sudo nano /etc/environment
```

Changes take effect immediately (or after service restart for daemon config). They survive every OS update and rollback.

---

## Understanding the /etc Overlay

The OverlayFS mechanism is worth understanding because it explains some subtle behaviours:

```
Lower layer (read-only): /etc from the active @blue or @green slot
Upper layer (writable):  /data/overlay/etc/upper/
Merged view:             /etc (what you see and interact with)
```

When you read `/etc/ssh/sshd_config`, the kernel checks the upper layer first. If your modified version is there, you see it. If not, you see the OS default from the lower layer.

When you write to `/etc/ssh/sshd_config`, the kernel performs a "copy-up": it copies the file from the lower layer to the upper layer, then applies your changes. From then on, your version is in the upper layer.

When the OS updates (new lower layer), your upper-layer files are untouched. You see your modified version. Files you have never touched automatically reflect the new OS defaults from the new lower layer.

### Inspecting Your Customisations

```bash
# See everything you have changed from OS defaults
find /data/overlay/etc/upper/ -type f | sort

# Compare a modified file to the OS default
diff /data/overlay/etc/upper/ssh/sshd_config \
     /etc/ssh/sshd_config

# List just the filenames
ls -la /data/overlay/etc/upper/
```

### Reverting a Specific File to OS Default

```bash
# Remove the upper-layer version — the OS default becomes active again
sudo rm /data/overlay/etc/upper/ssh/sshd_config

# For a directory
sudo rm -rf /data/overlay/etc/upper/some/directory/
```

### Resetting All /etc Customisations

```bash
# Nuclear option — removes ALL your /etc customisations
# Use with extreme caution — you will lose custom SSH config, hostname, etc.
sudo rm -rf /data/overlay/etc/upper/*
sudo reboot
```

---

## systemd Services

`systemctl` works exactly as you would expect on any Linux distribution. Service state (enabled/disabled) persists via the overlay.

```bash
# Enable and start a service
sudo systemctl enable --now sshd
sudo systemctl enable --now nginx

# Disable a service
sudo systemctl disable sshd

# Start/stop/restart
sudo systemctl start sshd
sudo systemctl stop sshd
sudo systemctl restart sshd

# Reload config without restart (for services that support it)
sudo systemctl reload nginx

# Check status
systemctl status sshd

# View logs for a service
journalctl -u sshd -f
journalctl -u sshd --since today

# List all enabled services
systemctl list-unit-files --state=enabled

# List all failed services
systemctl --failed
```

Service enablement (`systemctl enable`) creates symlinks in `/etc/systemd/system/`. These go into the overlay upper layer and persist across OS updates.

### User Services

Per-user services run in your user session and do not require root:

```bash
# Enable a user service
systemctl --user enable --now my-service.service

# Check user service status
systemctl --user status my-service.service

# View user service logs
journalctl --user -u my-service.service -f

# List enabled user services
systemctl --user list-unit-files --state=enabled
```

User service unit files can be placed in `~/.config/systemd/user/`.

---

## Creating Custom Service Units

Place custom `.service` files in `/etc/systemd/system/` (they go into the overlay):

```bash
# Create a custom service
sudo nano /etc/systemd/system/myapp.service
```

Example unit for a simple application:

```ini
[Unit]
Description=My Application
After=network.target

[Service]
Type=simple
User=username
WorkingDirectory=/home/username/myapp
ExecStart=/home/username/myapp/start.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Reload systemd to see the new unit
sudo systemctl daemon-reload

# Enable and start
sudo systemctl enable --now myapp.service
```

---

## Network Configuration

NetworkManager handles all network configuration. Your Wi-Fi passwords, VPN profiles, and static IP configurations are stored in `/data/varlib/NetworkManager` (bind-mounted to `/var/lib/NetworkManager`) — they persist across all updates and rollbacks.

```bash
# List connections
nmcli connection show

# Add a Wi-Fi connection
nmcli device wifi connect "SSID" password "password"

# Add a static IP connection
nmcli connection add type ethernet con-name "static-eth" \
  ipv4.method manual ipv4.addresses "192.168.1.100/24" \
  ipv4.gateway "192.168.1.1" ipv4.dns "8.8.8.8"

# Modify a connection
nmcli connection modify "My Connection" ipv4.dns "1.1.1.1,8.8.8.8"

# Delete a connection
nmcli connection delete "My Connection"

# Check current network status
nmcli device status
```

---

## Kernel Parameters (sysctl)

`sysctl` settings are configured via files in `/etc/sysctl.d/`. Changes go into the overlay and persist:

```bash
# Check a current value
sysctl vm.swappiness

# Apply a setting immediately (lost on reboot unless also in file)
sudo sysctl -w vm.swappiness=10

# Make it permanent
echo "vm.swappiness=10" | sudo tee /etc/sysctl.d/99-custom.conf
sudo sysctl --system   # apply all sysctl.d files immediately
```

Common customisations:

```bash
# In /etc/sysctl.d/99-custom.conf

# Lower swappiness (use swap less aggressively)
vm.swappiness=10

# Increase inotify watches (for IDEs, webpack, etc.)
fs.inotify.max_user_watches=524288

# Increase open file limit
fs.file-max=2097152

# Disable IPv6 if not needed
net.ipv6.conf.all.disable_ipv6=1
```

---

## Hostname and DNS

```bash
# Set hostname
sudo hostnamectl set-hostname myhostname

# View full status
hostnamectl status

# Check /etc/hosts
cat /etc/hosts
# Edit as needed
sudo nano /etc/hosts
```

Hostname changes persist via the overlay. Your machine is reachable as `hostname.local` on the local network via Avahi (mDNS), which is active by default.

---

## Environment Variables

System-wide environment variables are set in `/etc/environment`:

```bash
sudo nano /etc/environment

# Example contents
EDITOR=vim
VISUAL=vim
JAVA_HOME=/home/user/.nix-profile/lib/jvm/java-21
```

For shell-specific variables (Zsh, Bash), use `~/.zshrc` or `~/.profile` — these are in your home directory and are always writable.

---

## Reviewing All Changes Before an Update

Before applying an OS update, you can see exactly what configuration changes you have made relative to the OS defaults:

```bash
# All customised /etc files
find /data/overlay/etc/upper/ -type f -printf "%P\n" | sort

# What systemd services you have enabled
systemctl list-unit-files --state=enabled | grep -v "systemd\|dbus\|getty"

# What's in your user systemd directory
ls ~/.config/systemd/user/
```

This is useful for auditing your configuration before a major update and for documenting what you would need to reconfigure if you ever reinstalled from scratch.

---

## Resources

- [docs.shani.dev — System Configuration](https://docs.shani.dev/doc/updates/config) — full reference
- [docs.shani.dev — Overlay Filesystem](https://docs.shani.dev/doc/arch/overlay) — OverlayFS technical details
- [The Architecture Behind Shani OS](https://blog.shani.dev/post/shani-os-architecture-deep-dive) — how /etc stays writable
- [Networking on Shani OS](https://blog.shani.dev/post/shani-os-networking-guide) — full networking configuration
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
