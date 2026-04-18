---
slug: shani-os-home-server
title: 'Shani OS as a Home Server — Self-Host Everything, No Public IP Required'
date: '2026-04-22'
tag: 'Guide'
excerpt: 'Turn any PC, mini PC, or old laptop into a modern home server running Shani OS. Media streaming, file sync, AI models, home automation, password management, and more — all accessible from anywhere without a public IP address or port forwarding.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '12 min'
series: 'Shani OS Guides'
---

Your old laptop sitting in a drawer. A $150 mini PC. A spare desktop. Any of these can become a home server that replaces half a dozen cloud subscriptions — and runs better than most of them.

Shani OS is an immutable, atomic Linux built for exactly this. Updates never break your running services. Every container survives a rollback untouched. The system is secure by default — firewall active from first boot, rootless containers, zero telemetry. And because Tailscale and Cloudflared are pre-installed, you can reach your server from anywhere in the world without a public IP address, without port forwarding, and without touching your router.

This post covers the full picture: why Shani OS works well as a server, how to make it accessible remotely, and what you can actually run on it.

---

## Why Shani OS Works Well as a Home Server

Most home server setups break eventually. A system update pulls in a new library version that conflicts with a running service. A config file gets overwritten. Something that worked for two years suddenly does not.

Shani OS is structured differently. The root filesystem is read-only and managed atomically — updates are applied as a whole and rolled back as a whole. Your running containers live in the `@containers` Btrfs subvolume, completely separate from the OS. When the OS updates, your containers do not move. When you roll back, your containers stay exactly where they were.

The practical result: a home server that you can update fearlessly and leave running for years.

Other properties that matter for a server:

- **Podman pre-installed and socket-enabled at first boot** — no setup required to start running containers
- **firewalld active from first boot** — default-deny inbound, nothing is exposed unless you explicitly open it
- **fail2ban pre-installed** — repeated authentication failures are banned automatically
- **Tailscale and Cloudflared pre-installed** — remote access without any router configuration
- **Btrfs zstd compression on all subvolumes** — storage is efficient without any manual setup
- **SSH host keys persisted across updates** — your `known_hosts` fingerprints stay valid forever

---

## Hardware

Shani OS runs on any x86-64 machine. For a dedicated home server, good options are:

- **Mini PCs** (Intel N100, N150, Ryzen 5825U) — quiet, low power (~10–15W idle), capable enough for everything here
- **Old laptops** — built-in battery acts as a UPS; fanless if the CPU is passively cooled
- **Old desktops** — more storage expansion, more PCIe slots for GPU or extra NICs
- **Raspberry Pi / ARM** — Shani OS currently targets x86-64; ARM support is on the roadmap

4GB RAM is the minimum for a light setup. 8–16GB is comfortable for running a media server, a few databases, and local AI models simultaneously. Storage matters more than RAM for media — plan accordingly.

---

## Remote Access Without a Public IP

This is the piece that makes home servers practical for most people. Your home internet connection almost certainly uses a dynamic IP address, and many ISPs block inbound connections entirely. None of that matters with the approaches below — all of them work by making outbound connections from your server, which any network allows.

Tailscale and Cloudflared are both pre-installed on Shani OS with their state persisted across updates. You can use either or both depending on what you are exposing.

### Tailscale — Private Access for You and Your Devices

Tailscale creates a private WireGuard mesh network across all your devices. Your phone, laptop, work computer, and home server all get a Tailscale IP address and can reach each other directly — regardless of what network they are on, regardless of NAT or firewalls.

```bash
# Start Tailscale and authenticate (opens browser)
sudo tailscale up

# Check your Tailscale IP and connected devices
tailscale status

# Enable Tailscale SSH (most secure way to access your server remotely)
sudo tailscale up --ssh

# Use your server as an exit node (routes all traffic through your home connection)
sudo tailscale up --advertise-exit-node
```

Once connected, you reach your server at its Tailscale hostname from any device on your tailnet. No port forwarding. No dynamic DNS. If you run Jellyfin on port 8096, you open `http://shani-server:8096` on your phone and it works — whether you are at home, at work, or on a plane.

Full guide: [docs.shani.dev — Tailscale](https://docs.shani.dev/doc/networking/tailscale).

### Cloudflare Tunnel — Public HTTPS URLs for Shared Services

Tailscale is ideal for private access. If you want to share a service with others — a family Jellyfin instance, a shared Nextcloud, a Gitea for a small team — Cloudflare Tunnel gives you a public HTTPS URL with a real TLS certificate, without opening any inbound ports.

```bash
# Authenticate
cloudflared login

# Create a tunnel
cloudflared tunnel create home-server

# Configure which services to expose
cat > ~/.cloudflared/config.yml << EOF
tunnel: <tunnel-id>
credentials-file: /home/user/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: media.yourdomain.com
    service: http://localhost:8096
  - hostname: files.yourdomain.com
    service: http://localhost:8384
  - service: http_status:404
EOF

# Run as a system service
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Full guide: [docs.shani.dev — Cloudflared Tunnels](https://docs.shani.dev/doc/networking/cloudflared).

### Pangolin — Self-Hosted Tunnel Server (No Third-Party Cloud)

Cloudflare Tunnel is convenient, but your traffic still flows through Cloudflare's network. Pangolin gives you the same experience — expose local services via a public HTTPS URL, no inbound ports, no port forwarding — except you own the entire path. A cheap VPS runs the Pangolin server; the Newt agent on your Shani OS machine creates an outbound WireGuard tunnel back to it.

```bash
# Newt agent on your Shani OS machine
podman run -d \
  --name newt \
  -e PANGOLIN_URL=https://pangolin.yourdomain.com \
  -e NEWT_ID=<your-newt-id> \
  -e NEWT_SECRET=<your-newt-secret> \
  --restart unless-stopped \
  fosrl/newt:latest
```

Define your services in the Pangolin dashboard — map hostnames to local ports — and Pangolin handles TLS via Let's Encrypt automatically. It also supports identity-aware access control per resource, so you can restrict services to authenticated users without a separate SSO layer. Full guide: [docs.shani.dev/servers/vpn-tunnels](https://docs.shani.dev/servers/vpn-tunnels).

### Headscale — Self-Hosted Tailscale Control Server

If you want the Tailscale mesh experience without depending on Tailscale's coordination servers, Headscale is a fully open-source, self-hosted replacement. Run it on a cheap VPS (or another machine), connect all your devices to it, and you have a private mesh network you control entirely.

Headplane provides a modern web UI for Headscale — node management, pre-auth keys, ACLs, and API key generation without touching the CLI.

```bash
# Run Headscale
podman run -d \
  --name headscale \
  -p 127.0.0.1:8080:8080 \
  -v /home/user/headscale/config:/etc/headscale:Z \
  -v /home/user/headscale/data:/var/lib/headscale:Z \
  --restart unless-stopped \
  headscale/headscale:latest

# Create a user and generate a pre-auth key
podman exec headscale headscale users create home
podman exec headscale headscale preauthkeys create --user home --reusable --expiration 30d

# Connect your Shani OS server to Headscale
sudo tailscale up --login-server https://headscale.yourdomain.com --authkey <key>
```

Full guide: [docs.shani.dev/servers/vpn-tunnels](https://docs.shani.dev/servers/vpn-tunnels).

### WG-Easy — WireGuard with a Web UI

If you want a traditional VPN where your phone or laptop routes all traffic through your home connection, WG-Easy gives you WireGuard with a clean web interface for generating client configs and QR codes. One inbound UDP port on your router is all it needs.

```bash
podman run -d \
  --name wg-easy \
  -p 127.0.0.1:51821:51821 \
  -p 0.0.0.0:51820:51820/udp \
  -v /home/user/wgeasy:/etc/wireguard:Z \
  -e WG_HOST=vpn.yourdomain.com \
  -e PASSWORD=changeme \
  -e WG_DEFAULT_DNS=1.1.1.1 \
  --cap-add NET_ADMIN \
  --sysctl net.ipv4.ip_forward=1 \
  --restart unless-stopped \
  ghcr.io/wg-easy/wg-easy
```

Open port 51820/udp on your router, point a DNS record at your home IP, and manage clients at `http://localhost:51821` (proxied through Caddy). Full guide: [docs.shani.dev/servers/vpn-tunnels](https://docs.shani.dev/servers/vpn-tunnels).

### Caddy — HTTPS for Everything

Whatever access method you use, Caddy ties it together. It is pre-installed on Shani OS and handles TLS automatically — either via Let's Encrypt for public domains or via a local internal CA for private ones. Every service gets HTTPS without manual certificate management.

```bash
sudo systemctl enable --now caddy
```

```caddyfile
# /etc/caddy/Caddyfile

# Public services via Cloudflare Tunnel or port forwarding
media.yourdomain.com   { reverse_proxy localhost:8096 }
files.yourdomain.com   { reverse_proxy localhost:8384 }

# Private services via Tailscale (internal CA, no public cert needed)
jellyfin.home.local    { tls internal; reverse_proxy localhost:8096 }
nextcloud.home.local   { tls internal; reverse_proxy localhost:8888 }
```

Full Caddy reference: [docs.shani.dev/servers/caddy](https://docs.shani.dev/servers/caddy).

---

## What to Run

All of the following run as rootless Podman containers. They live in `@containers`, survive every OS update, and can be set to auto-start via systemd user units. Ready-to-run commands for everything below are in the self-hosting wiki at [docs.shani.dev/servers](https://docs.shani.dev/servers).

### Media

**Jellyfin** is the centrepiece of a home media setup — a free, open-source media server with hardware transcoding, multi-user accounts, and client apps for every platform. Point it at your movie and TV directories and it organises, scrapes metadata, and streams to your phone, TV, or browser.

**Navidrome** does the same for music — a Subsonic-compatible server that streams your local library to apps like DSub and Symfonium, everywhere you go.

**Immich** replaces Google Photos. It backs up your phone's camera roll automatically, runs local AI for face recognition and object detection, and gives you a polished timeline interface. Your photos stay on your hardware.

**The *Arr stack** (Radarr, Sonarr, Prowlarr) automates finding, downloading, and sorting movies and TV shows — connecting to Jellyfin so your library is always current.

Wiki: [docs.shani.dev/servers/media](https://docs.shani.dev/servers/media)

### Files & Productivity

**Nextcloud** is a full cloud suite — file sync across all your devices, calendar, contacts, collaborative document editing, and a mobile app that makes it feel like Google Drive. It replaces Dropbox, Google Drive, and Google Calendar simultaneously.

**Syncthing** is simpler and more focused: peer-to-peer file sync with no server in the middle. Your devices sync directly with each other. Fast, encrypted, and completely decentralised.

**Paperless-ngx** scans and OCRs paper documents, indexes their content, and makes everything searchable. Drop a PDF in the inbox folder and it is automatically tagged and filed.

Wiki: [docs.shani.dev/servers/productivity](https://docs.shani.dev/servers/productivity)

### AI & Local LLMs

**Ollama** pulls and runs open-weight language models (Llama, Mistral, Phi, Gemma) locally via a REST API. **Open WebUI** gives you a ChatGPT-style interface on top of Ollama — multi-model, with conversation history, RAG pipelines, and image support.

Nothing leaves your machine. No API key. No usage limits. If your server has an AMD or Intel GPU, Ollama uses it automatically via the pre-configured `/dev/dri` device passthrough.

**Whisper** handles local speech-to-text. **ComfyUI** runs Stable Diffusion image generation with a node-based workflow editor. **LocalAI** provides a drop-in OpenAI-compatible API endpoint for any model.

Wiki: [docs.shani.dev/servers/ai-llms](https://docs.shani.dev/servers/ai-llms)

### Security & Passwords

**Vaultwarden** is a Bitwarden-compatible password server. Your Bitwarden mobile app, browser extension, and desktop app all connect to your own server instead of Bitwarden's cloud. Passwords, TOTP codes, secure notes, and shared organisation vaults — all on your hardware.

**Authelia** adds two-factor authentication in front of any service you expose via Caddy. A single login protects your entire self-hosted stack.

Wiki: [docs.shani.dev/servers/security](https://docs.shani.dev/servers/security)

### Home Automation

**Home Assistant** integrates with over 3,000 devices and platforms — lights, sensors, thermostats, cameras, smart plugs — and lets you build automations that actually work. Running it locally means no cloud dependency, sub-millisecond response times, and full control over your data.

**Zigbee2MQTT** bridges Zigbee devices (the cheap, reliable smart home standard) to Home Assistant via MQTT using a $15 USB adapter — no proprietary hubs, no cloud bridges.

**Frigate** turns any RTSP camera into an AI-powered NVR with local object detection. It identifies people, cars, and animals in real time using your GPU — and integrates with Home Assistant for automations triggered by detections.

Wiki: [docs.shani.dev/servers/home-automation](https://docs.shani.dev/servers/home-automation)

### Databases & Developer Tools

Every database you need runs rootless via Podman: PostgreSQL, MariaDB, Redis, MongoDB, InfluxDB, MeiliSearch. Bind them to `127.0.0.1` so only local services can reach them.

**Gitea** gives you a self-hosted Git server with web UI, issue tracking, wikis, and CI integration — a GitHub you control. **code-server** is VS Code running in the browser, accessible from any device on your tailnet. **Grafana + Prometheus + Loki** gives you dashboards, metrics, and log aggregation for everything running on the server.

Wikis: [docs.shani.dev/servers/databases](https://docs.shani.dev/servers/databases) · [docs.shani.dev/servers/devtools](https://docs.shani.dev/servers/devtools)

### Communication & Notifications

**Matrix/Synapse** with **Element** gives you a self-hosted, end-to-end encrypted chat that federates with the wider Matrix network. Your messages live on your server.

**Ntfy** and **Gotify** handle push notifications — send alerts from any script, cron job, or service to your phone instantly. Useful for backup completion, disk usage warnings, or any event you care about.

Wiki: [docs.shani.dev/servers/communication](https://docs.shani.dev/servers/communication)

### Backups

A home server is only as good as its backup strategy. **Restic** provides fast, encrypted, deduplicated backups to any destination — local disk, S3, Backblaze B2, or a **MinIO** instance you run on another machine. **Rclone** syncs to 70+ cloud providers. **Duplicati** adds a web UI for scheduled incremental backups.

Wiki: [docs.shani.dev/servers/backups-sync](https://docs.shani.dev/servers/backups-sync)

---

## Keeping Things Running

### Auto-Start on Boot

Generate a systemd user unit from any running container:

```bash
podman generate systemd --name jellyfin --new --files
mkdir -p ~/.config/systemd/user
mv container-jellyfin.service ~/.config/systemd/user/
systemctl --user enable --now container-jellyfin.service

# Start services even when not logged in
loginctl enable-linger $USER
```

### Automatic Updates

Podman's auto-update pulls new images and recreates containers on a schedule:

```bash
podman auto-update --all

# Or set up a weekly systemd timer — see:
# docs.shani.dev/servers/management
```

### Monitoring

**Uptime Kuma** monitors your services and notifies you when something goes down. **Dozzle** gives you live container logs in the browser. **Netdata** provides real-time system metrics with no configuration. Full examples: [docs.shani.dev/servers/devtools](https://docs.shani.dev/servers/devtools).

### Container Management UI

**Portainer** and **Dockge** give you graphical dashboards for managing all your containers, images, and volumes — useful if you prefer not to use the terminal for day-to-day management. Full examples: [docs.shani.dev/servers/management](https://docs.shani.dev/servers/management).

---

## The Full Self-Hosting Wiki

Every service mentioned above has a ready-to-run Podman command in the self-hosting wiki at [docs.shani.dev/servers](https://docs.shani.dev/servers):

| Category | What's inside |
|---|---|
| [Media](https://docs.shani.dev/servers/media) | Jellyfin, Plex, Navidrome, Immich, *Arr stack, Kavita, Audiobookshelf, PhotoPrism |
| [Productivity](https://docs.shani.dev/servers/productivity) | Nextcloud, Syncthing, Paperless-ngx, Planka, Mealie, Miniflux, Actual Budget |
| [AI & LLMs](https://docs.shani.dev/servers/ai-llms) | Ollama, Open WebUI, LocalAI, ComfyUI, Whisper |
| [Security](https://docs.shani.dev/servers/security) | Vaultwarden, Authelia, Authentik, Keycloak, CrowdSec, Step-CA |
| [Home Automation](https://docs.shani.dev/servers/home-automation) | Home Assistant, Zigbee2MQTT, Mosquitto, Node-RED, ESPHome, Frigate |
| [Databases](https://docs.shani.dev/servers/databases) | PostgreSQL, MariaDB, Redis, MongoDB, InfluxDB, MeiliSearch, Elasticsearch |
| [Developer Tools](https://docs.shani.dev/servers/devtools) | Gitea, Woodpecker CI, code-server, Grafana, Prometheus, Loki, Netdata, n8n |
| [Communication](https://docs.shani.dev/servers/communication) | Matrix/Synapse, Mattermost, Ntfy, Gotify |
| [Mail](https://docs.shani.dev/servers/mail) | Mailcow, Mailu, Stalwart, Roundcube, SnappyMail |
| [VPN & Tunnels](https://docs.shani.dev/servers/vpn-tunnels) | WG-Easy, Headscale, Headplane, Cloudflared, Pangolin, Pritunl, Firezone, Nebula, NetBird |
| [Network & Analytics](https://docs.shani.dev/servers/networking) | Pi-hole, AdGuard Home, Traefik, SearXNG, Plausible, Umami, Homepage |
| [Backups & Sync](https://docs.shani.dev/servers/backups-sync) | Restic, Rclone, MinIO, Duplicati, Borgmatic |
| [Management](https://docs.shani.dev/servers/management) | Portainer, Dockge, auto-update, systemd integration, cleanup |

---

## Related Guides

- [Podman on Shani OS](https://blog.shani.dev/post/podman-containers-on-shani-os) — the full Podman reference: rootless containers, Docker Compose, volumes, auto-start
- [Networking on Shani OS](https://blog.shani.dev/post/shani-os-networking-guide) — VPNs, Tailscale, SSH, Caddy, file sharing, firewall
- [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os) — full mutable Linux inside the immutable OS, for tools that need `apt` or `pacman`
- [Telegram community](https://t.me/shani8dev) — questions, setups, and support

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
