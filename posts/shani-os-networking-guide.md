---
slug: shani-os-networking-guide
title: 'Networking on Shani OS — VPNs, Tailscale, SSH, Caddy, and More'
date: '2026-04-22'
tag: 'Guide'
excerpt: 'A practical guide to every network capability built into Shani OS — from WireGuard and Tailscale mesh VPNs to Caddy reverse proxy, SSH hardening, Cloudflare tunnels, LAN file sharing, brute-force protection, and enterprise services.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud infrastructure engineer, DevOps practitioner, and the creator of Shani OS — an immutable, atomic Linux built for reliability and self-sovereignty.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '18 min'
series: 'Shani OS Guides'
---

Shani OS ships a comprehensive networking stack — from basic Wi-Fi management to zero-trust mesh VPNs, automatic HTTPS, brute-force protection, LAN file sharing, remote desktop, and enterprise directory services. Most of it is active from first boot. This guide covers every component, what it does, and how to configure it.

Full networking documentation: [docs.shani.dev — Networking](https://docs.shani.dev/doc/networking).

---

## What's Pre-Installed

Every Shani OS system ships with:

- **NetworkManager** — wired, wireless, and mobile broadband (3G/4G/5G), active by default, handles DHCP and DNS from your router
- **All VPN protocols** — OpenVPN, WireGuard, L2TP/IPsec, PPTP, strongSwan/IKEv2, Cisco AnyConnect, GlobalProtect, SSTP, Fortinet SSL, VPNC — all usable without installing anything
- **openresolv** — DNS broker that keeps NetworkManager, VPNs, Tailscale, and dnsmasq from overwriting each other's DNS config
- **Tailscale** — WireGuard-based zero-config mesh VPN, pre-installed, state persisted across updates
- **Cloudflared** — Cloudflare Zero Trust tunnels for public HTTPS without port forwarding
- **WireGuard** — kernel-native VPN, tools pre-installed for raw peer-to-peer tunnels
- **firewalld** — active from first boot with a default-deny inbound policy
- **fail2ban** — automated banning of repeated authentication failures, integrates with firewalld
- **OpenSSH** — pre-installed, not enabled by default
- **Caddy** — modern reverse proxy with automatic HTTPS via Let's Encrypt and a built-in CA for private addresses
- **Samba / NFS** — SMB file sharing for Windows and macOS; NFS for Linux-to-Linux
- **rsyncd** — rsync daemon for efficient network file synchronisation
- **SSHFS** — mount remote directories over SSH as local filesystems
- **NBD** — network block device for exposing raw block storage over the network
- **KDE Connect / GSConnect** — phone integration with firewall rules pre-configured
- **Avahi** — mDNS/DNS-SD (Bonjour) for `hostname.local` discovery on the LAN
- **dnsmasq** — local DNS caching, custom hostnames, and DHCP (not active by default)
- **ModemManager** — 3G/4G/5G modem management, integrates with NetworkManager
- **snmpd** — SNMP daemon for external monitoring systems (Zabbix, Nagios, LibreNMS)
- **slapd** — OpenLDAP server for centralised directory and authentication services
- **Kerberos 5** — enterprise mutual authentication and Active Directory integration

---

## NetworkManager & DNS

**NetworkManager is active by default** on Shani OS and manages all connections — wired, Wi-Fi, mobile broadband, and VPN. It handles DHCP automatically: when you connect to a network, NetworkManager obtains an IP address and the router's DNS servers and writes them to `/etc/resolv.conf` via **openresolv**.

openresolv is the broker between all DNS-aware programs. Rather than any single program owning `/etc/resolv.conf`, every interface registers its nameservers via the `resolvconf` command, and openresolv merges them into one consistent file. When you connect a VPN, switch Wi-Fi networks, or bring up Tailscale, DNS updates automatically — no manual editing needed.

> **Note:** Shani OS does **not** use `systemd-resolved`. Commands like `resolvectl status` will not work. Use `resolvconf -l` and `cat /etc/resolv.conf` instead.

```bash
# Show all connections and their state
nmcli device status

# Connect to a Wi-Fi network
nmcli device wifi connect "SSID" password "yourpassword"

# Set a static IP on a wired connection
nmcli connection modify "Wired connection 1" \
  ipv4.method manual \
  ipv4.addresses 192.168.1.50/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "1.1.1.1,8.8.8.8"
nmcli connection up "Wired connection 1"

# Interactive terminal UI (useful over SSH)
nmtui

# Inspect the current DNS resolvers
resolvconf -l          # one block per registered interface
cat /etc/resolv.conf   # final merged output

# Force regeneration after a manual config change
sudo resolvconf -u
```

Full guides: [NetworkManager & VPN](https://docs.shani.dev/doc/networking/networkmanager-vpn) · [openresolv](https://docs.shani.dev/doc/networking/openresolv).

---

## Firewall

`firewalld` is active from first boot. The default zone denies all inbound connections except what you explicitly allow. It uses a zone-based model — different interfaces can have different trust levels — and manages nftables under the hood.

```bash
# Confirm the firewall is running
sudo firewall-cmd --state

# Show all active rules
sudo firewall-cmd --list-all

# Open a named service
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Open a specific port
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# Block a specific IP
sudo firewall-cmd --permanent \
  --add-rich-rule='rule family="ipv4" source address="1.2.3.4" reject'
sudo firewall-cmd --reload

# Allow SSH only from your LAN
sudo firewall-cmd --permanent \
  --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" service name="ssh" accept'
sudo firewall-cmd --reload
```

KDE Plasma includes a Firewall applet for GUI management. `firewall-config` is also available.

Full guide: [docs.shani.dev — Firewall (firewalld)](https://docs.shani.dev/doc/networking/firewalld).

---

## Fail2ban — Brute-Force Protection

fail2ban monitors log files for repeated authentication failures and temporarily bans offending IPs via firewalld. **Not enabled by default** — enable it on any machine running public-facing services.

```bash
sudo systemctl enable --now fail2ban

# Overall status — all active jails and ban counts
sudo fail2ban-client status

# SSH jail status
sudo fail2ban-client status sshd

# Manually ban / unban an IP
sudo fail2ban-client set sshd banip 1.2.3.4
sudo fail2ban-client set sshd unbanip 1.2.3.4
```

Tune the SSH jail — create `/etc/fail2ban/jail.d/sshd-local.conf`:

```ini
[sshd]
enabled  = true
port     = ssh
maxretry = 5
bantime  = 1h
findtime = 10m
```

Whitelist your own IP ranges so you can never accidentally lock yourself out — create `/etc/fail2ban/jail.d/local.conf`:

```ini
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1 192.168.1.0/24 100.64.0.0/10
```

`100.64.0.0/10` covers the entire Tailscale CGNAT address range.

Full guide: [docs.shani.dev — Fail2ban](https://docs.shani.dev/doc/networking/fail2ban).

---

## Tailscale — Private Mesh Network

Tailscale builds a WireGuard-encrypted mesh across all your devices. Every device gets a stable Tailscale IP (`100.x.x.x`) and a DNS hostname. Devices reach each other directly regardless of NAT, firewall, or network — no port forwarding, no dynamic DNS, no router configuration.

Tailscale is pre-installed with state persisted in `/data/varlib/tailscale`. You stay authenticated across every OS update, rollback, and reboot.

```bash
# Start the daemon and authenticate (opens a browser)
sudo systemctl enable --now tailscaled
sudo tailscale up

# Enable Tailscale SSH — eliminates sshd, authorized_keys, and open firewall ports
sudo tailscale up --ssh

# Check your Tailscale IP and peer status
tailscale ip
tailscale status

# Diagnose connectivity
tailscale netcheck
tailscale ping <device-name>

# Expose your home LAN to all tailnet devices (subnet router)
sudo tailscale up --advertise-routes=192.168.1.0/24

# Route travelling devices' internet traffic through your home connection (exit node)
sudo tailscale up --advertise-exit-node
```

Disable key expiry in the [admin console](https://login.tailscale.com/admin/machines) for server machines so the device stays connected indefinitely.

Full guide: [docs.shani.dev — Tailscale VPN](https://docs.shani.dev/doc/networking/tailscale).

---

## WireGuard (Manual)

WireGuard kernel support and tools are pre-installed. Use raw WireGuard when you control both endpoints and want a static tunnel to a VPS or router without a coordination server.

```bash
# Generate a key pair on each peer
sudo install -d -m 700 /etc/wireguard
wg genkey | sudo tee /etc/wireguard/privatekey | wg pubkey | sudo tee /etc/wireguard/publickey
sudo chmod 600 /etc/wireguard/privatekey
```

Peer-to-peer tunnel — `/etc/wireguard/wg0.conf`:

```ini
[Interface]
Address    = 10.0.0.1/24
PrivateKey = <this-peer-private-key>
ListenPort = 51820

[Peer]
PublicKey           = <other-peer-public-key>
Endpoint            = 203.0.113.10:51820
AllowedIPs          = 10.0.0.2/32
PersistentKeepalive = 25
```

```bash
sudo wg-quick up wg0
sudo systemctl enable --now wg-quick@wg0    # start at boot
sudo wg show                                 # status, handshake, traffic counters

sudo firewall-cmd --permanent --add-port=51820/udp
sudo firewall-cmd --reload
```

Full guide: [docs.shani.dev — WireGuard (Manual)](https://docs.shani.dev/doc/networking/wireguard).

---

## SSH

OpenSSH is pre-installed but `sshd` is not enabled by default. Use **Tailscale SSH** for access between your own devices — no open ports, no key management. Enable `sshd` for machines that need access from non-Tailscale clients.

```bash
sudo systemctl enable --now sshd
ss -tlnp | grep 22    # confirm it's listening
```

SSH host keys persist across OS updates and rollbacks — your `known_hosts` fingerprints stay valid after every system update.

### Hardening (`/etc/ssh/sshd_config`)

```text
Port 2222
PasswordAuthentication no
PermitRootLogin no
AllowUsers youruser
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com
MACs hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com
ClientAliveInterval 900
ClientAliveCountMax 0
UseDNS no
```

```bash
sudo sshd -t                        # validate config before applying
sudo systemctl restart sshd
sudo firewall-cmd --permanent --add-port=2222/tcp
sudo firewall-cmd --reload
```

### Tunnels

```bash
ssh -L 8096:localhost:8096 user@shani-server   # local forward: remote Jellyfin at localhost:8096
ssh -R 3000:localhost:3000 user@shani-server   # remote forward: expose local port on server
ssh -D 1080 user@shani-server                  # dynamic SOCKS proxy
ssh -N -f -L 5432:localhost:5432 user@shani-server   # background tunnel to remote Postgres
```

Full guide: [docs.shani.dev — OpenSSH](https://docs.shani.dev/doc/networking/openssh).

### SSHFS — Mount Remote Directories

SSHFS mounts any SSH-accessible directory as a local folder using FUSE. No server-side software needed beyond a working SSH connection.

```bash
mkdir -p ~/remote
sshfs user@shani-server:/path/to/data ~/remote \
  -o reconnect,ServerAliveInterval=15,ServerAliveCountMax=3
fusermount -u ~/remote    # unmount
```

Full guide: [docs.shani.dev — SSHFS](https://docs.shani.dev/doc/networking/sshfs).

---

## Caddy — Automatic HTTPS Reverse Proxy

Caddy provisions and renews TLS certificates automatically — via Let's Encrypt for public domains, and via its built-in CA for private `.home.local` addresses. Always bind container ports to `127.0.0.1` and proxy through Caddy so services are never directly exposed to the network.

Config file: `/etc/caddy/Caddyfile`. Changes persist across OS updates.

```bash
sudo systemctl enable --now caddy
caddy validate --config /etc/caddy/Caddyfile    # validate before reloading
sudo systemctl reload caddy                      # zero-downtime reload
```

```caddyfile
# Public domain — HTTPS via Let's Encrypt
app.example.com {
    reverse_proxy localhost:8080
}

# Private domain — HTTPS via Caddy's internal CA
jellyfin.home.local {
    tls internal
    reverse_proxy localhost:8096
}

# SSO via Authelia
service.example.com {
    forward_auth localhost:9091 {
        uri /api/verify?rd=https://auth.example.com
        copy_headers Remote-User Remote-Groups Remote-Name Remote-Email
    }
    reverse_proxy localhost:8080
}
```

Trust the internal CA once on your Shani OS machine so browsers accept `.home.local` certificates:

```bash
sudo trust anchor \
  /var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt
sudo update-ca-trust
```

Full guide: [docs.shani.dev — Caddy](https://docs.shani.dev/doc/networking/caddy).

---

## Cloudflare Tunnels — Public HTTPS Without Port Forwarding

Cloudflared exposes local services at a real public HTTPS URL with no static IP, no port forwarding, and no open inbound firewall ports. Use it to share services with others over the internet; use Tailscale for private access between your own devices.

```bash
cloudflared login
cloudflared tunnel create my-home-server

cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: <YOUR-TUNNEL-UUID>
credentials-file: /home/user/.cloudflared/<UUID>.json

ingress:
  - hostname: media.example.com
    service: http://localhost:8096
  - hostname: vault.example.com
    service: http://localhost:8180
  - service: http_status:404
EOF

cloudflared tunnel route dns my-home-server media.example.com
cloudflared tunnel route dns my-home-server vault.example.com

sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Protect services with **Cloudflare Access** (Zero Trust dashboard → Access → Applications) — require login via email OTP, Google, or GitHub with no code changes on your side.

Full guide: [docs.shani.dev — Cloudflared Tunnels](https://docs.shani.dev/doc/networking/cloudflared).

---

## VPN Client Configuration

All VPN protocol plugins ship pre-installed — nothing to install.

**GUI:** GNOME → Settings → Network → + → VPN / KDE → System Settings → Connections → + → VPN

```bash
# OpenVPN
nmcli connection import type openvpn file /path/to/client.ovpn
nmcli connection up client

# WireGuard
nmcli connection import type wireguard file /etc/wireguard/wg0.conf
nmcli connection up wg0

# Cisco AnyConnect / GlobalProtect
openconnect --protocol=anyconnect vpn.example.com
openconnect --protocol=gp vpn.example.com

# Fortinet SSL VPN
openfortivpn vpn.example.com:443 --username=youruser
```

Split DNS — sending `.corp` queries to the VPN while everything else uses your regular DNS — works automatically via openresolv. When a VPN connects and pushes a domain-specific nameserver, openresolv routes matching queries to it with no manual configuration.

Full guide: [docs.shani.dev — NetworkManager & VPN](https://docs.shani.dev/doc/networking/networkmanager-vpn).

---

## dnsmasq — Local DNS & DHCP

dnsmasq is pre-installed but **not active by default**. Enable it when you want local domain names (`.home`), a DNS cache, or DHCP control on your LAN.

```bash
sudo systemctl enable --now dnsmasq
```

`/etc/dnsmasq.conf`:

```ini
server=1.1.1.1
server=8.8.8.8
domain-needed
bogus-priv

# Custom local hostnames
address=/nas.home/192.168.1.10
address=/printer.home/192.168.1.20

# DNS cache
cache-size=1000

# DHCP (uncomment to activate)
# dhcp-range=192.168.1.100,192.168.1.200,12h
# dhcp-option=3,192.168.1.1
```

To route all DNS through dnsmasq (adding caching and custom `.home` domains), tell openresolv to use it:

```bash
echo 'name_servers=127.0.0.1' | sudo tee -a /etc/resolvconf.conf
sudo resolvconf -u
```

Full guide: [docs.shani.dev — dnsmasq](https://docs.shani.dev/doc/networking/dnsmasq).

---

## File Sharing

### Samba — Windows & macOS

```bash
sudo systemctl enable --now smb nmb
```

Add a share to `/etc/samba/smb.conf`:

```ini
[SharedFiles]
    path = /home/youruser/shared
    browseable = yes
    read only = no
    valid users = youruser
```

```bash
sudo smbpasswd -a youruser
testparm
sudo systemctl restart smb nmb
sudo firewall-cmd --permanent --add-service=samba && sudo firewall-cmd --reload
```

Connect from Windows: `\\192.168.1.100\SharedFiles` · macOS: `smb://192.168.1.100/SharedFiles`.

Full guide: [docs.shani.dev — Samba](https://docs.shani.dev/doc/networking/samba).

### NFS — Linux-to-Linux

```bash
sudo systemctl enable --now nfs-server
echo "/home/youruser/shared  192.168.1.0/24(rw,sync,no_subtree_check)" \
  | sudo tee -a /etc/exports
sudo exportfs -arv
sudo firewall-cmd --permanent \
  --add-service=nfs --add-service=rpcbind --add-service=mountd
sudo firewall-cmd --reload

# Mount on client
sudo mount -t nfs 192.168.1.100:/home/youruser/shared /mnt/remote
```

Full guide: [docs.shani.dev — NFS](https://docs.shani.dev/doc/networking/nfs).

### rsyncd — Efficient Network Sync

The rsync daemon exposes file modules over `rsync://` for fast synchronisation without requiring SSH access.

```bash
sudo systemctl enable --now rsyncd
```

`/etc/rsyncd.conf`:

```ini
[backup]
    path = /home/user/backups
    read only = false
    auth users = syncuser
    secrets file = /etc/rsyncd.secrets
    hosts allow = 192.168.1.0/24
```

```bash
echo "syncuser:StrongPassword" | sudo tee /etc/rsyncd.secrets
sudo chmod 600 /etc/rsyncd.secrets

# Sync from client
rsync -avz --progress /local/dir/ rsync://syncuser@192.168.1.100/backup/
```

Full guide: [docs.shani.dev — rsyncd](https://docs.shani.dev/doc/networking/rsyncd).

### NBD — Network Block Device

NBD exports a raw block device or image file over the network. The client mounts it as a local block device (`/dev/nbd0`). Useful for thin-client boot images and centralised VM disk storage.

```bash
# Server
sudo systemctl enable --now nbd-server
# Restrict to LAN — NBD has no built-in authentication
sudo firewall-cmd --permanent \
  --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" port port="10809" protocol="tcp" accept'
sudo firewall-cmd --reload

# Client
sudo modprobe nbd
sudo nbd-client 192.168.1.100 10809 /dev/nbd0
sudo mount /dev/nbd0 /mnt/remote-disk
```

Full guide: [docs.shani.dev — NBD](https://docs.shani.dev/doc/networking/nbd).

---

## Remote Desktop

```bash
# Connect to a Windows machine (FreeRDP, pre-installed)
xfreerdp /v:192.168.1.100 /u:username /dynamic-resolution /gfx
```

**Enable inbound connections:**
KDE: Settings → Remote Desktop → Enable Remote Desktop (kRDP).
GNOME: Settings → Sharing → Remote Desktop (supports RDP and VNC simultaneously).

```bash
sudo firewall-cmd --permanent --add-service=rdp    # RDP port 3389
sudo firewall-cmd --permanent --add-port=5900/tcp  # VNC
sudo firewall-cmd --reload
```

> Never expose RDP or VNC directly to the internet. Use Tailscale — no open ports, no certificate warnings.

Full guide: [docs.shani.dev — Remote Desktop](https://docs.shani.dev/doc/networking/remote-desktop).

---

## KDE Connect — Phone Integration

KDE Connect integrates your Android or iOS phone with your Shani OS desktop over the LAN. Firewall rules are pre-configured — no manual setup needed after install.

Features: shared clipboard, file transfer, notification mirroring, remote input (phone as touchpad/keyboard), media controls.

Install the app ([Android](https://play.google.com/store/apps/details?id=org.kde.kdeconnect_tp) / [iOS](https://apps.apple.com/app/kde-connect/id1580245991)), ensure both devices are on the same Wi-Fi, and accept the pairing request.

```bash
systemctl --user status kdeconnectd                          # confirm daemon is running
kdeconnect-cli --list-devices                                # list discovered devices
kdeconnect-cli --share /path/to/file --device <id>          # send a file to phone
kdeconnect-cli --ring --device <id>                         # ring your phone to find it
```

Full guide: [docs.shani.dev — KDE Connect](https://docs.shani.dev/doc/networking/kdeconnect).

---

## Local Service Discovery (Avahi / mDNS)

Avahi is **active by default**. Your machine is reachable as `hostname.local` on the LAN without any DNS server. CUPS printers, Samba shares, and KDE Connect all advertise via Avahi.

```bash
avahi-browse -at                          # discover all services on the LAN
avahi-browse _ssh._tcp                    # find SSH servers
avahi-browse _ipp._tcp                    # find printers
avahi-resolve --name myhostname.local     # resolve a .local hostname to IP
```

Full guide: [docs.shani.dev — Avahi (mDNS)](https://docs.shani.dev/doc/networking/avahi).

---

## Mobile Broadband (3G/4G/5G)

ModemManager is pre-installed and integrates with NetworkManager. Plug in a supported modem and a Mobile Broadband connection is created automatically — configure the APN from Settings → Network.

```bash
mmcli -L        # list detected modems
mmcli -m 0      # signal strength, SIM status, bearer details
```

Full guide: [docs.shani.dev — ModemManager](https://docs.shani.dev/doc/networking/modemmanager).

---

## SNMP Monitoring

snmpd allows external monitoring systems (Zabbix, Nagios, LibreNMS, PRTG) to query your machine's status.

> ⚠️ Use SNMPv3 with authentication and privacy for any network that isn't fully trusted — SNMPv2c transmits the community string in plaintext.

```bash
sudo systemctl enable --now snmpd

# Restrict to your LAN
sudo firewall-cmd --permanent \
  --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" port port="161" protocol="udp" accept'
sudo firewall-cmd --reload

# Create an SNMPv3 user with auth + encryption (recommended)
sudo systemctl stop snmpd
sudo net-snmp-create-v3-user \
  -ro -A "MyAuthPassword" -a SHA -X "MyPrivPassword" -x AES monitoruser
sudo systemctl start snmpd
```

Full guide: [docs.shani.dev — snmpd](https://docs.shani.dev/doc/networking/snmpd).

---

## OpenLDAP — Centralised Directory

slapd provides centralised authentication and directory services. Database files persist in `/data/varlib/openldap` across OS updates.

```bash
sudo systemctl enable --now slapd
slappasswd                  # generate a password hash for LDIF files

# Search the directory
ldapsearch -x -H ldap://localhost -b dc=shanios,dc=local

sudo firewall-cmd --permanent --add-service=ldap --add-service=ldaps
sudo firewall-cmd --reload
```

Full guide: [docs.shani.dev — OpenLDAP (slapd)](https://docs.shani.dev/doc/networking/slapd).

---

## Kerberos 5 — Enterprise Authentication

Kerberos provides strong mutual authentication and is required by Active Directory environments. Kerberos database files persist in `/data/varlib/kerberos` across OS updates.

```bash
sudo systemctl enable --now krb5kdc kadmin

kinit youruser@SHANIOS.LOCAL   # obtain a ticket
klist                           # show active tickets and expiry
kinit -R                        # renew before expiry
kdestroy                        # destroy all tickets

sudo firewall-cmd --permanent --add-port=88/tcp --add-port=88/udp   # KDC
sudo firewall-cmd --permanent --add-port=749/tcp                     # kadmin
sudo firewall-cmd --reload
```

Full guide: [docs.shani.dev — Kerberos](https://docs.shani.dev/doc/networking/kerberos).

---

## Backup — rclone and restic

Both `rclone` and `restic` are pre-installed on Shani OS.

```bash
rclone config                                        # configure a cloud remote (interactive)
rclone sync ~/Documents gdrive:Backup/Documents --progress

export RESTIC_REPOSITORY="rclone:gdrive:shanios-backups"
export RESTIC_PASSWORD_FILE="$HOME/.config/restic/password"
restic init
restic backup /home /var/lib/containers
restic snapshots
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
restic check
```

Automate with a systemd user timer and a dead man's switch (Healthchecks) so you're alerted if a backup silently fails.

Full guide: [docs.shani.dev — Backup & Recovery](https://docs.shani.dev/doc/networking/backup).

---

## Network Services via Podman

Any network service also runs as a rootless Podman container on Shani OS, surviving every OS update untouched. The self-hosting wiki covers ready-to-run commands for:

- **[VPN & Tunnels](https://docs.shani.dev/doc/servers/vpn-tunnels)** — WG-Easy, Headscale + Headplane, Cloudflared, Pangolin, Pritunl, Firezone, Nebula, ZeroTier, NetBird
- **[Network & DNS](https://docs.shani.dev/doc/servers/networking)** — Pi-hole, AdGuard Home, Nginx Proxy Manager, Traefik, Caddy, Unbound, SearXNG, Homepage dashboard
- **[Mail Servers](https://docs.shani.dev/doc/servers/mail)** — Mailcow, Mailu, Stalwart, Roundcube, SnappyMail
- **[Monitoring](https://docs.shani.dev/doc/servers/monitoring)** — Prometheus, Grafana, Loki, Netdata, Uptime Kuma, Gatus, Dozzle

---

## Resources

- [docs.shani.dev — Networking](https://docs.shani.dev/doc/networking) — full networking documentation
- [docs.shani.dev/servers](https://docs.shani.dev/doc/servers) — self-hosting wiki with ready-to-run Podman commands
- [Shani OS as a Home Server](https://blog.shani.dev/post/shani-os-home-server) — self-hosting guide with service catalogue
- [Podman on Shani OS](https://blog.shani.dev/post/podman-containers-on-shani-os) — rootless containers reference
- [KDE Connect on Shani OS](https://blog.shani.dev/post/shani-os-kde-connect) — phone + desktop integration
- [Btrfs Snapshots and Backup on Shani OS](https://blog.shani.dev/post/shani-os-btrfs-snapshots-and-backup) — restic and rclone backup guide
- [Updates on Shani OS](https://blog.shani.dev/post/shani-os-updates) — update and rollback reference
- [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide) — network troubleshooting and general diagnostics
- [Shani OS FAQ](https://blog.shani.dev/post/shani-os-faq) — common questions
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
