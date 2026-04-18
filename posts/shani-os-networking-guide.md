---
slug: shani-os-networking-guide
title: 'Networking on Shani OS — VPNs, Tailscale, SSH, Caddy, and More'
date: '2026-04-08'
tag: 'Guide'
excerpt: 'A practical guide to every network capability built into Shani OS — from WireGuard and Tailscale mesh VPNs to Caddy web server, SSH hardening, remote desktop, and NFS file sharing.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '10 min'
series: 'Shani OS Guides'
---

Shani OS ships with a comprehensive networking stack that covers everything from basic Wi-Fi to zero-trust mesh VPNs, local web servers, remote desktop, and enterprise file sharing. Most of it works out of the box. This post covers the most useful capabilities and how to get them configured.

Full networking documentation: [docs.shani.dev — Networking](https://docs.shani.dev/doc/servers).

---

## What Is Pre-Installed

Every Shani OS system ships with:

- **NetworkManager** — wired, wireless, mobile broadband (3G/4G/5G), all configured via GUI
- **All VPN protocols** — OpenVPN, WireGuard, L2TP, PPTP, strongSwan/IKEv2, Cisco AnyConnect, SSTP, Fortinet SSL, VPNC — all configurable without installing anything
- **Tailscale** — WireGuard-based zero-config mesh VPN, pre-installed, state persisted across updates
- **Cloudflared** — Cloudflare Zero Trust tunnels and WARP, pre-installed
- **firewalld** — active from first boot, default-deny inbound
- **fail2ban** — automated banning of repeated authentication failures
- **OpenSSH** — pre-installed, not enabled by default
- **Caddy** — modern web server with automatic HTTPS via Let's Encrypt
- **Samba/NFS** — Windows file sharing and Linux/macOS file sharing
- **KDE Connect / GSConnect** — phone integration (firewall rules pre-configured)

---

## VPN Configuration

All VPN protocols are configured via the NetworkManager GUI — no manual installation required.

In GNOME: Settings → Network → + → VPN
In KDE: System Settings → Connections → + → VPN

The available protocols are: OpenVPN, WireGuard, L2TP/IPsec, PPTP, IKEv2/strongSwan, Cisco AnyConnect, SSTP, Fortinet SSL VPN, Cisco VPNC. Import `.ovpn` files directly for OpenVPN.

For detailed setup including certificate configuration: [docs.shani.dev — VPN Protocols](https://docs.shani.dev/doc/networking/networkmanager-vpn).

### Self-Hosted VPN Servers

Beyond client VPN connections, you can run your own VPN server on Shani OS using Podman. Options include:

- **WG-Easy** — WireGuard with a web UI for managing peers and QR codes
- **Headscale + Headplane** — fully self-hosted Tailscale-compatible control server with dashboard
- **Pritunl** — enterprise-grade WireGuard/OpenVPN server with SSO and audit logging
- **Firezone** — zero-trust WireGuard access with OIDC/SAML integration
- **Cloudflared** — expose services through Cloudflare's network without opening any inbound ports
- **Nebula, ZeroTier, NetBird** — decentralized mesh networking alternatives

Full guide with ready-to-run Podman commands for all of these: [docs.shani.dev/servers/vpn-tunnels](https://docs.shani.dev/servers/vpn-tunnels).

---

## Tailscale

Tailscale is a WireGuard-based mesh VPN that connects all your devices on a private network without any port forwarding, firewall rules, or router configuration. It is pre-installed on Shani OS with state persisted in `/data/varlib/tailscale` — your Tailscale connection survives OS updates and rollbacks.

### Setup

```bash
# Start and authenticate (opens browser for login)
sudo tailscale up

# Check status and your Tailscale IP
tailscale status
tailscale ip

# Enable SSH access via Tailscale (most secure way to access remotely)
sudo tailscale up --ssh

# Enable exit node for routing all traffic through another device
sudo tailscale up --advertise-exit-node
```

### Useful Tailscale commands

```bash
# List all devices on your tailnet
tailscale status

# Ping another device by Tailscale hostname
tailscale ping <device-name>

# Check connection health
tailscale netcheck

# Disable Tailscale temporarily
sudo tailscale down
```

Once connected, access your Shani OS machine from any other device on your tailnet using its Tailscale hostname. No port forwarding. No dynamic DNS. Full guide: [docs.shani.dev — Tailscale VPN](https://docs.shani.dev/doc/networking/tailscale).

---

## SSH

OpenSSH is pre-installed but the server is not enabled by default. To enable remote SSH access:

```bash
# Enable and start SSH server
sudo systemctl enable --now sshd

# Check the status
systemctl status sshd
```

SSH host keys live in `/data/varlib/sshd` (bind-mounted to `/var/lib/sshd`) — they persist across OS updates and rollbacks, so your `known_hosts` fingerprints remain valid.

### Hardening recommendations

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config
```

Recommended settings for remote access:

```
# Disable password authentication (use keys only)
PasswordAuthentication no
PubkeyAuthentication yes

# Disable root login
PermitRootLogin no

# Use only modern algorithms
KexAlgorithms curve25519-sha256,diffie-hellman-group14-sha256
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com

# Limit login attempts
MaxAuthTries 3
```

For most use cases, accessing via Tailscale SSH (`tailscale up --ssh`) is simpler and more secure than opening a public SSH port — it requires no changes to your firewall and authenticates via Tailscale's identity system.

Full guide: [docs.shani.dev — OpenSSH](https://docs.shani.dev/doc/networking/openssh).

---

## Caddy Web Server

Caddy is pre-installed with automatic HTTPS via Let's Encrypt. It is the simplest way to serve a web application or host a local service with a valid TLS certificate.

The configuration file is `/etc/caddy/Caddyfile`. Changes persist via the `/etc` OverlayFS. TLS certificates and ACME state are stored in `/var/lib/caddy/.local/share/caddy/` and survive OS updates and rollbacks automatically.

### Basic configuration examples

```caddyfile
# Serve a static site with automatic HTTPS
yourdomain.com {
    root * /srv/www
    file_server
}

# Reverse proxy to a local application
app.yourdomain.com {
    reverse_proxy localhost:3000
}

# Local-only service with internal TLS (no public domain needed)
myapp.lan {
    tls internal
    reverse_proxy localhost:8080
}

# Load balance across replicas
lb.example.com {
    reverse_proxy localhost:3001 localhost:3002 localhost:3003 {
        lb_policy round_robin
        health_uri /health
        health_interval 10s
    }
}
```

> 💡 **Tip**: Always bind container ports to `127.0.0.1` (e.g., `-p 127.0.0.1:3000:3000`) and proxy them through Caddy. This ensures services are only accessible via HTTPS.

```bash
# Enable and start Caddy
sudo systemctl enable --now caddy

# Reload configuration without downtime
sudo systemctl reload caddy

# Validate syntax before reloading
caddy validate --config /etc/caddy/Caddyfile

# Check status and certificate info
systemctl status caddy
sudo caddy certificates
```

### Caddy + Authelia (SSO for self-hosted services)

Caddy pairs well with Authelia to add two-factor authentication in front of any self-hosted service:

```caddyfile
service.example.com {
    forward_auth localhost:9091 {
        uri /api/verify?rd=https://auth.example.com
    }
    reverse_proxy localhost:8080
}
```

For Cloudflare DNS validation (needed for internal/private domains), internal CA trust setup, and advanced auth configuration: [docs.shani.dev/servers/caddy](https://docs.shani.dev/servers/caddy).

---

## Cloudflare Tunnels

Cloudflared enables you to expose local services to the internet through Cloudflare's network without any inbound ports or firewall rules. The tunnel connects outbound to Cloudflare; traffic flows in through that connection.

State is persisted in `/data/varlib/cloudflared` — tunnel credentials survive OS updates.

```bash
# Authenticate with Cloudflare
cloudflared login

# Create a tunnel
cloudflared tunnel create my-tunnel

# Create a config file
cat > ~/.cloudflared/config.yml << EOF
tunnel: <tunnel-id>
credentials-file: /home/<user>/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: app.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# Run the tunnel
cloudflared tunnel run my-tunnel

# Or install as a system service
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Full guide: [docs.shani.dev — Cloudflared Tunnels](https://docs.shani.dev/doc/networking/cloudflared).

---

## File Sharing

### Samba (Windows file sharing)

Samba is pre-installed. Samba state persists in `/data/varlib/samba`.

```bash
# Install GUI configuration (optional, on GNOME)
flatpak install flathub org.gnome.Nautilus  # already installed
# Right-click a folder in Nautilus → Properties → Share

# Or configure manually
sudo nano /etc/samba/smb.conf
sudo systemctl enable --now smb nmb
```

For sharing a folder named `Documents`:

```ini
[Documents]
   path = /home/username/Documents
   browseable = yes
   read only = no
   valid users = username
```

```bash
# Set Samba password for user
sudo smbpasswd -a username

# Reload Samba
sudo systemctl reload smb
```

Full guide: [docs.shani.dev — Samba (Windows)](https://docs.shani.dev/doc/networking/samba).

### NFS (Linux/macOS file sharing)

```bash
# Enable NFS server
sudo systemctl enable --now nfs-server

# Export a directory (edit /etc/exports)
echo "/home/username/shared *(rw,sync,no_subtree_check)" | sudo tee -a /etc/exports
sudo exportfs -ra

# On a client, mount the share
sudo mount <server-ip>:/home/username/shared /mnt/remote
```

Full guide: [docs.shani.dev — NFS File Sharing](https://docs.shani.dev/doc/networking/nfs).

---

## Remote Desktop

### Connecting to other machines

FreeRDP is pre-installed for connecting to Windows Remote Desktop:

```bash
# Connect to a Windows machine
xfreerdp /v:192.168.1.100 /u:username /p:password /dynamic-resolution
```

GNOME Connections and KRDC (KDE) provide GUI frontends.

### Allowing others to connect to your Shani OS machine

**GNOME:** Settings → Sharing → Remote Desktop — enable and set credentials.

**KDE:** System Settings → Remote Desktop (kRDP) — built-in RDP server. Or use kRFB for VNC.

Full guide: [docs.shani.dev — Remote Desktop](https://docs.shani.dev/doc/networking/remote-desktop).

---

## Firewall

`firewalld` is active from first boot. The default zone denies all inbound connections except what you explicitly allow.

```bash
# Check current status
sudo firewall-cmd --state
sudo firewall-cmd --list-all

# Open a port permanently
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# Open a service by name
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload

# Allow an app in a specific zone
sudo firewall-cmd --permanent --zone=public --add-service=http
sudo firewall-cmd --permanent --zone=public --add-service=https

# Block an IP
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="1.2.3.4" reject'
sudo firewall-cmd --reload
```

KDE Plasma includes a Plasma Firewall applet for GUI management. GNOME users can install `firewall-config` via Flatpak.

Full guide: [docs.shani.dev — Firewall (firewalld)](https://docs.shani.dev/doc/networking/firewalld).

---

## Mobile Broadband (3G/4G/5G)

`ModemManager` is pre-installed and handles USB and built-in mobile modems via `libmbim` and `libqmi`. Most 4G/LTE modems and SIM cards are detected automatically. `usb_modeswitch` handles devices that ship as USB storage and need switching to modem mode. Configure via NetworkManager's GUI — a "Mobile Broadband" connection type is available.

```bash
# Check detected modems
mmcli -L

# Get modem details
mmcli -m 0
```

---

## DNS: openresolv

`openresolv` manages `/etc/resolv.conf` — when multiple services (NetworkManager, VPN, Tailscale) want to configure DNS simultaneously, openresolv arbitrates and merges their requests without conflicts. You normally do not need to touch this directly.

```bash
# See current DNS resolution state
resolvectl status

# Check which subscribers have registered DNS config
resolvectl dns
```

---

## Local Service Discovery (Avahi / mDNS)

`Avahi` provides mDNS/DNS-SD (Bonjour-compatible) — your machine is reachable as `hostname.local` on the local network without any DNS server configuration. Printers, Samba shares, and other services also advertise themselves via Avahi.

```bash
# Browse all advertised services on the local network
avahi-browse -a

# Find printers
avahi-browse -r _ipp._tcp

# Find SSH hosts
avahi-browse -r _ssh._tcp
```

---

## SSHFS — Mount Remote Filesystems

`sshfs` mounts a remote directory over SSH as a local filesystem. Pre-installed on Shani OS.

```bash
# Mount a remote directory
mkdir -p ~/remote
sshfs user@server:/path/to/remote ~/remote

# Mount with options (reconnect on drop, follow symlinks)
sshfs -o reconnect,follow_symlinks user@server:/home/user ~/remote

# Unmount
fusermount -u ~/remote
```

---

## dnsmasq for Local DNS

dnsmasq is pre-installed for local DNS resolution and DHCP. Useful for development environments, home labs, and multi-machine setups.

```bash
# Edit configuration
sudo nano /etc/dnsmasq.conf

# Example: add local DNS entries
# address=/dev.local/192.168.1.100
# address=/api.local/192.168.1.100

# Enable and start
sudo systemctl enable --now dnsmasq
```

Full guide: [docs.shani.dev — dnsmasq (Local DNS)](https://docs.shani.dev/doc/networking/dnsmasq).

---

## Backup with rclone and restic

Both `rclone` and `restic` are pre-installed. Their configurations persist in `/data/varlib/rclone` and `/data/varlib/restic`.

```bash
# Configure rclone for a remote (interactive)
rclone config

# Sync a directory to Google Drive
rclone sync ~/Documents gdrive:Backup/Documents

# Create an encrypted backup with restic
restic -r s3:s3.amazonaws.com/mybucket init
restic -r s3:s3.amazonaws.com/mybucket backup ~/Documents ~/Projects
restic -r s3:s3.amazonaws.com/mybucket snapshots
```

For self-hosted backup targets, MinIO provides an S3-compatible object storage server you can run locally via Podman — making it possible to keep backups entirely on-premises with no third-party cloud involved. For Restic, Borgmatic, Duplicati, Rclone, and MinIO with full container commands: [docs.shani.dev/servers/backups-sync](https://docs.shani.dev/servers/backups-sync).

Full host-level guide: [docs.shani.dev — Backup (rclone/restic)](https://docs.shani.dev/doc/networking/backup).

---

## Network Services via Podman

Any network service can also run as a rootless Podman container on Shani OS — surviving every OS update untouched. The self-hosting wiki at [docs.shani.dev/servers](https://docs.shani.dev/servers) covers ready-to-run commands for:

- **[VPN & Tunnels](https://docs.shani.dev/servers/vpn-tunnels)** — WireGuard/WG-Easy, Headscale + Headplane (self-hosted Tailscale), Cloudflared, Pritunl, Firezone, Nebula, ZeroTier, NetBird
- **[Network & Analytics](https://docs.shani.dev/servers/networking)** — Pi-hole, AdGuard Home, Nginx Proxy Manager, Traefik, SearXNG, Plausible, Umami, Unbound, Homepage dashboard, Speedtest Tracker
- **[Caddy](https://docs.shani.dev/servers/caddy)** — reverse proxy reference with auth, load balancing, and TLS configuration
- **[Mail Servers](https://docs.shani.dev/servers/mail)** — Mailcow, Mailu, Stalwart, Roundcube, SnappyMail
- **[Backups & Sync](https://docs.shani.dev/servers/backups-sync)** — Restic, Rclone, MinIO, Duplicati, Borgmatic

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
