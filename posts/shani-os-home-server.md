---
slug: shani-os-home-server
title: 'Shani OS as a Home Server — Self-Host Everything, No Public IP Required'
date: '2026-04-22'
tag: 'Guide'
excerpt: 'Turn any PC, mini PC, or old laptop into a home server that replaces your cloud subscriptions. Media streaming, AI models, file sync, home automation, password management, and a full education platform — all accessible from anywhere, with no public IP and no port forwarding.'
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

There is a laptop in a drawer somewhere in your home right now. It has a working CPU, a working GPU, and enough storage to outlast a dozen cloud subscriptions. It is doing nothing.

A $150 mini PC from Amazon will outrun it — quieter, cooler, drawing 10 watts at idle — but the principle is the same. Any reasonably modern x86 machine can become a home server that streams your media library to every device you own, backs itself up automatically, runs AI language models with no API key, manages your smart home, and stores your passwords — all without a single monthly fee, and all accessible from anywhere in the world.

Shani OS makes this practical rather than theoretical. This guide explains how.

---

## The Problem with Most Home Server Setups

Home servers fail in predictable ways. A system update pulls in a library version that breaks a running service. A config file gets silently overwritten. A rootful Docker daemon runs as root, and one misconfigured container is a privilege escalation away from owning the host. After two years of uptime, something stops working and nobody remembers exactly how it was set up.

Shani OS is designed around the assumption that these problems are structural, not user error.

The root filesystem is **read-only and atomically managed** — updates are applied as a complete image swap and activated on next boot, the same way your phone updates. If anything breaks, one command rolls the entire OS back to the previous generation. Your running containers live in a dedicated `@containers` Btrfs subvolume that is completely separate from the OS layer. When the OS updates, your containers do not move. When you roll back, your containers stay exactly where they were. There is no entanglement between the two.

The practical result is a home server you can update fearlessly and leave running for years. On Shani OS, forgetting you have a server is a feature.

---

## Why Shani OS Specifically

Several properties matter when you are running services around the clock.

**Security defaults that hold.** firewalld is active from first boot with a default-deny inbound policy — nothing is exposed unless you explicitly open it. All containers run rootless via Podman — a container process runs as your user, not as root, so a container breakout lands in a fully restricted user context rather than on the host as root. fail2ban is pre-installed and integrates with firewalld automatically.

**Remote access that doesn't require router configuration.** Tailscale and Cloudflared ship pre-installed with their state persisted across OS updates. Authenticate once and the connection survives every reboot, update, and rollback indefinitely — you never need to re-run setup commands after a system update.

**Reliable storage.** The dedicated `@containers`, `@home`, and `@waydroid` Btrfs subvolumes use zstd compression. Container images, volumes, and user data all benefit from transparent deduplication and compression without manual setup. Btrfs snapshots created by `shani-deploy` let you inspect or restore previous states, though they live on the same drive and are not a substitute for offsite backups.

**HTTPS everywhere, automatically.** Caddy is pre-installed. Point a domain at a local service and Caddy provisions a TLS certificate — either via Let's Encrypt for public domains or via its built-in CA for private `.home.local` addresses. Your browser never shows a certificate warning.

**SSH host keys that survive updates.** SSH keys are persisted across OS updates and rollbacks — you will never see `REMOTE HOST IDENTIFICATION HAS CHANGED` after applying a system update.

---

## Hardware

Shani OS runs on any x86-64 machine. For a dedicated home server:

**Mini PCs** are the best choice for most people. An Intel N100 or N150 draws 10–15 W at idle, runs completely silent with passive cooling on many models, and handles everything in this guide simultaneously — media transcoding, several databases, a local AI model, and home automation. Street price: $100–180.

**Old laptops** work well if you already have one. The built-in battery acts as a UPS — the server survives a brief power outage without a shutdown. Passively cooled models run silently and draw very little power.

**Old desktops** offer more PCIe expansion for dedicated GPUs (significant for local AI inference), more storage bays, and 2.5G or 10G NIC options for fast LAN file sharing.

**RAM guidance:** 8 GB is comfortable for a full setup without AI models. 16 GB handles everything including a 7B parameter model running via Ollama. 32 GB opens up 13B+ models with room for everything else. For storage, plan for 1 TB minimum and expand from there — media libraries grow quickly, and container images add up.

---

## Remote Access Without a Public IP

This is the piece that makes home servers practical for most people. Your home connection almost certainly uses a dynamic IP, and many ISPs block inbound connections on ports 80 and 443. None of that matters with the approaches below — all of them work via outbound connections from your server, which any network permits.

### Tailscale — Your Private Mesh Network

Tailscale creates a WireGuard mesh across all your devices. Your phone, laptop, work computer, and home server all get stable Tailscale IPs and hostnames and can reach each other directly — regardless of network, NAT, or firewall.

```bash
# Already installed on Shani OS — just authenticate
sudo systemctl enable --now tailscaled
sudo tailscale up

# Enable Tailscale SSH — removes the need for managing sshd and firewall rules
sudo tailscale up --ssh

# Route all your traffic through your home connection when travelling
sudo tailscale up --advertise-exit-node

# Expose devices on your LAN that don't have Tailscale installed
# (NAS, printers, IP cameras, smart home hubs)
sudo tailscale up --advertise-routes=192.168.1.0/24
```

Once connected, your server is reachable at its Tailscale hostname from any of your devices. Jellyfin on port 8096? Open `http://shani-server:8096` on your phone at a coffee shop. It just works.

Disable key expiry in the [Tailscale admin console](https://login.tailscale.com/admin/machines) for your server — combined with Shani OS's persisted state, the machine stays connected indefinitely without any manual re-authentication.

Full guide: [docs.shani.dev — Tailscale](https://docs.shani.dev/doc/networking/tailscale).

### Cloudflare Tunnel — Public HTTPS Without Opening Ports

If you want to share a service with others — a family Jellyfin, a shared Nextcloud, a Gitea for a small team — Cloudflare Tunnel gives you a real public HTTPS URL with automatic TLS, without touching your router or opening any inbound ports.

```bash
cloudflared login
cloudflared tunnel create home-server

cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: <tunnel-id>
credentials-file: /home/user/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: media.yourdomain.com
    service: http://localhost:8096
  - hostname: files.yourdomain.com
    service: http://localhost:8384
  - hostname: vault.yourdomain.com
    service: http://localhost:8180
  - service: http_status:404
EOF

cloudflared tunnel route dns home-server media.yourdomain.com
cloudflared tunnel route dns home-server files.yourdomain.com

sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Protect exposed services with **Cloudflare Access** — require login via email OTP, Google, or GitHub before reaching your service. No code changes needed on your side.

Full guide: [docs.shani.dev — Cloudflared Tunnels](https://docs.shani.dev/doc/networking/cloudflared).

### Pangolin — Self-Hosted Tunnels (Full Data Sovereignty)

Cloudflare Tunnel routes your traffic through Cloudflare's network. If you want the same experience with full control over your data path, Pangolin runs on a cheap VPS you own and creates an encrypted WireGuard tunnel back to your home server. Your traffic never touches a third-party network.

```bash
# Newt agent on your Shani OS machine — connects to your VPS-hosted Pangolin server
podman run -d \
  --name newt \
  -e PANGOLIN_URL=https://pangolin.yourdomain.com \
  -e NEWT_ID=<your-newt-id> \
  -e NEWT_SECRET=<your-newt-secret> \
  --restart unless-stopped \
  fosrl/newt:latest
```

Full setup: [docs.shani.dev — VPN & Tunnels](https://docs.shani.dev/doc/servers/vpn-tunnels#pangolin).

---

## What You Can Run

The self-hosting wiki at [docs.shani.dev/doc/servers](https://docs.shani.dev/doc/servers) has ready-to-run Podman commands for every service below.

### Media

**Jellyfin** is the definitive open-source media server — hardware transcoding, multi-user support, parental controls, and native apps for every platform. One Podman command and your entire media library streams to phones, TVs, tablets, and laptops in and outside your home.

```bash
podman run -d \
  --name jellyfin \
  -p 127.0.0.1:8096:8096 \
  -v /home/user/jellyfin/config:/config:Z \
  -v /home/user/media:/media:ro,Z \
  --device /dev/dri \
  --restart unless-stopped \
  jellyfin/jellyfin
```

**Immich** does for photos what Jellyfin does for video — automatic mobile backup, AI face recognition and object tagging, shared albums, and a timeline that rivals Google Photos. Your photo library, your hardware, no subscription.

The **\*Arr stack** (Radarr, Sonarr, Prowlarr) automates media acquisition. Request a movie, Radarr finds it, downloads it, renames it, and drops it in Jellyfin. Your library stays current without manual work.

Wiki: [docs.shani.dev/doc/servers/media](https://docs.shani.dev/doc/servers/media).

### Productivity & Files

**Nextcloud** is the Swiss Army knife of self-hosting. File sync across all your devices, calendar, contacts, collaborative document editing via Collabora or OnlyOffice, a chat feature, and a mobile app that feels like Google Drive. One deployment replaces Dropbox, Google Drive, Google Calendar, and Google Contacts simultaneously.

**Syncthing** offers a lighter alternative for file sync — pure peer-to-peer, no central server, encrypted, and completely private. Great for keeping specific folders in sync across laptop, phone, and server without the overhead of a full Nextcloud.

**Paperless-ngx** handles your paper trail. Drop a PDF into a watch folder and it automatically OCRs, indexes, and tags the document — then you can full-text search every receipt, contract, and letter you have ever scanned.

Wiki: [docs.shani.dev/doc/servers/productivity](https://docs.shani.dev/doc/servers/productivity).

### AI & Local LLMs

This is the category that has changed most dramatically in the past two years. A modern mini PC with 16 GB of RAM runs a 7B parameter language model at perfectly usable speeds — no API key, no usage limits, no data leaving your network.

**Ollama** handles model management. Pull any open-weight model (Llama, Mistral, Phi, Gemma, Qwen, DeepSeek) with a single command and serve it via a REST API compatible with the OpenAI specification.

```bash
# Pull a capable general-purpose model
podman exec ollama ollama pull llama3.2

# Smaller/faster model for lower-spec hardware
podman exec ollama ollama pull phi4-mini
```

**Open WebUI** puts a polished ChatGPT-style interface in front of Ollama — conversation history, document RAG pipelines, web search via SearXNG, voice input via Whisper, and the ability to mix local models with cloud APIs (Anthropic, OpenAI, Groq) in the same interface.

**ComfyUI** runs Stable Diffusion locally with a node-based workflow editor. **Whisper** transcribes audio and video files locally in 99 languages. **Kokoro** does high-quality text-to-speech locally with multiple voices. **Tabby** is a self-hosted AI coding assistant that plugs into VS Code and JetBrains as a drop-in Copilot replacement — completions happen on your hardware with no usage limits and no telemetry.

Wiki: [docs.shani.dev/doc/servers/ai-llms](https://docs.shani.dev/doc/servers/ai-llms).

### Security & Passwords

**Vaultwarden** is a lightweight Bitwarden-compatible server. Your Bitwarden mobile app, browser extension, and desktop client all connect to your own server — passwords, TOTP codes, secure notes, and shared organisation vaults, all on your hardware. The Bitwarden clients are polished and well-maintained; you get the same UX as Bitwarden cloud, minus the subscription.

```bash
podman run -d \
  --name vaultwarden \
  -p 127.0.0.1:8180:80 \
  -v /home/user/vaultwarden/data:/data:Z \
  -e WEBSOCKET_ENABLED=true \
  -e SIGNUPS_ALLOWED=false \
  -e ADMIN_TOKEN=$(openssl rand -base64 48) \
  --restart unless-stopped \
  vaultwarden/server:latest
```

**Authelia** adds two-factor authentication in front of any service exposed via Caddy — one login page protects your entire self-hosted stack. **Authentik** goes further with full OIDC/SAML support for SSO across many apps.

Wiki: [docs.shani.dev/doc/servers/security](https://docs.shani.dev/doc/servers/security).

### Home Automation

**Home Assistant** integrates with over 3,000 devices and platforms. Running it locally means sub-50ms automations, no cloud dependency, and no concern about a manufacturer's servers going offline. If the internet goes down, your smart home keeps working.

```bash
podman run -d \
  --name homeassistant \
  --network host \
  -v /home/user/homeassistant/config:/config:Z \
  -e TZ=Asia/Kolkata \
  --restart unless-stopped \
  ghcr.io/home-assistant/home-assistant:stable
```

**Zigbee2MQTT** bridges 3,000+ Zigbee devices (the dominant smart home radio standard for lights, sensors, and plugs) to Home Assistant via a $15 USB coordinator — no proprietary hub, no cloud bridge, no subscription. **Frigate** adds AI object detection to any RTSP camera, identifying people, cars, and packages in real time on your GPU. **ESPHome** lets you build custom sensors on $5 ESP32 boards with YAML config and direct Home Assistant integration.

Wiki: [docs.shani.dev/doc/servers/home-automation](https://docs.shani.dev/doc/servers/home-automation).

### Education & Learning

Running a school, homeschool co-op, or corporate training platform? Shani OS can host the entire stack locally with no per-seat licensing.

**Moodle** is the world's most widely deployed open-source LMS — courses, quizzes, graded assignments, SCORM packages, H5P interactive content, and detailed analytics. Connect it to a local **BigBlueButton** instance for live virtual classrooms.

**ERPNext Education** goes beyond the LMS into full school ERP territory: admissions, enrollment, timetables, attendance, fee management, and parent portals. For lighter school administration without the ERP scope, **Gibbon** delivers the essentials with a much smaller footprint.

**Open edX** (deployed via Tutor) powers the MOOC-scale end of the spectrum — the same platform behind edX.org, with peer-graded assignments, video courses, certifications, and a plugin ecosystem.

**Overleaf Community Edition** gives researchers and students a self-hosted collaborative LaTeX editor — essential for academic writing and thesis work.

Wiki: [docs.shani.dev/doc/servers/education](https://docs.shani.dev/doc/servers/education).

### Databases & Developer Tools

Every database you need runs rootless via Podman: **PostgreSQL** and **MariaDB** for relational workloads; **Redis** and **Valkey** for caching and sessions; **MongoDB** for document storage; **TimescaleDB** for time-series data with full SQL support; **Qdrant** and **Weaviate** for vector search in AI pipelines. All ports are bound to `127.0.0.1` by default — nothing is exposed to your network unless you explicitly proxy it through Caddy.

**Gitea** is a full GitHub on your own hardware — web UI, issue tracking, wikis, pull requests, and CI integration. **code-server** runs VS Code in the browser, accessible from any device on your tailnet. **Grafana + Prometheus + Loki** give you dashboards, metrics, and log aggregation for everything running on the server.

Wikis: [databases](https://docs.shani.dev/doc/servers/databases) · [developer tools](https://docs.shani.dev/doc/servers/devtools).

### Business Intelligence & Analytics

Your databases already live on the server — running your analytics stack next to them eliminates egress costs and removes per-seat cloud BI pricing.

**Metabase** is the fastest to get useful: non-technical users build charts through a point-and-click interface with no SQL required. **Apache Superset** goes deeper — 40+ connectors, a full SQL IDE, and role-based access control. **Redash** focuses on query-first operational dashboards with scheduled refreshes and alerting. For code-first analysts, **Evidence.dev** renders SQL queries embedded in Markdown files as polished interactive reports, version-controlled in Git. **Plausible** and **Umami** cover web analytics — GDPR-compliant, no cookies, no cross-site tracking.

Wiki: [docs.shani.dev/doc/servers/business-intelligence](https://docs.shani.dev/doc/servers/business-intelligence).

### Communication & Notifications

**Matrix/Synapse** with the Element client gives you end-to-end encrypted, federated chat on your own server. Your messages never leave your hardware — and if you want, your server federates with the wider Matrix network so you can message anyone on matrix.org or any other homeserver. **Conduit** offers a Rust-based alternative that uses a fraction of the RAM.

**Ntfy** and **Gotify** handle push notifications from scripts, cron jobs, and services. One curl command sends a message to your phone:

```bash
curl -d "Backup complete ✅" ntfy.sh/your-private-topic
```

Indispensable for backup completion alerts, disk usage warnings, and any automation that needs to reach you.

Wiki: [docs.shani.dev/doc/servers/communication](https://docs.shani.dev/doc/servers/communication).

### Finance

Financial data is among the most sensitive data you produce. Cloud services like Mint, YNAB, and QuickBooks have been acquired, shut down, or had data breaches. Running finance tools locally means your transaction history, budget, and account balances never leave your hardware.

**Firefly III** is the most complete self-hosted personal finance manager — double-entry bookkeeping, budgets, recurring transactions, and detailed reports. **Actual Budget** takes a zero-based envelope approach (YNAB-style) with all data stored locally and synced through your own server. **Ghostfolio** tracks investments and portfolios with live prices, XIRR, and FIRE progress. **Invoice Ninja** handles freelancer invoicing, quotes, and client management with professional PDF output and online payment support.

Wiki: [docs.shani.dev/doc/servers/finance](https://docs.shani.dev/doc/servers/finance).

### Medical & Health

**OpenEMR** and **OpenMRS** bring full electronic health record systems to your own hardware — visit notes, prescriptions, lab orders, scheduling, and billing — relevant for small clinics or anyone who wants to own their clinical data. For personal use, **Fasten Health** connects to 1,000+ US health providers via SMART on FHIR and downloads your complete medical history to a local dashboard. **Wger** tracks workouts and nutrition; **Tandoor** handles recipe management with ingredient-level macros.

Wiki: [docs.shani.dev/doc/servers/medical](https://docs.shani.dev/doc/servers/medical).

### Backups

A server without offsite backups is a hardware failure away from total data loss. The 3-2-1 rule applies: three copies of your data, on two different storage media, with one copy offsite.

**Restic** handles fast, encrypted, deduplicated backups to any destination — local disk, SFTP, S3, or a **MinIO** instance running on a second machine. **Rclone** syncs to 70+ cloud providers. A systemd timer runs the backup nightly; **Healthchecks** alerts you if the expected ping doesn't arrive.

```bash
# Backup, notify, and prune in one shot
restic backup /home /var/lib/containers && \
  curl -s "https://hc.home.local/ping/YOUR-UUID" && \
  restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune
```

> ⚠️ Btrfs snapshots created by `shani-deploy` live on the same physical drive. They protect against bad updates — not drive failure. Use Restic + Rclone to copy data to an external drive or cloud storage.

Wiki: [docs.shani.dev/doc/servers/backups-sync](https://docs.shani.dev/doc/servers/backups-sync).

---

## Keeping Things Running

### Auto-Start on Boot

Generate a systemd user unit from any running container, then enable lingering so it starts at boot even without an active login session:

```bash
podman generate systemd --name jellyfin --new --files
mkdir -p ~/.config/systemd/user
mv container-jellyfin.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now container-jellyfin.service
loginctl enable-linger $USER
```

### Automatic Container Updates

Podman's built-in auto-update pulls new images and recreates containers on a schedule. Add the label to any container you want updated automatically:

```bash
podman run -d \
  --label io.containers.autoupdate=registry \
  ... \
  jellyfin/jellyfin

# Preview what would update without applying
podman auto-update --dry-run

# Apply updates (or let the weekly timer do it automatically)
podman auto-update
```

### Atomic OS Updates

Shani OS updates atomically in the background. The new OS image is staged while everything keeps running, then activated on the next reboot. Your containers are entirely untouched. If something is wrong after an update:

```bash
sudo shani-deploy --rollback
```

That is the entire recovery procedure. No rescue mode, no package manager archaeology, no manual state reconstruction.

### Monitoring

**Uptime Kuma** monitors every service and sends alerts via ntfy, Telegram, or email when something goes down. **Gatus** is a declarative, Git-friendly alternative — define health checks in YAML, version-control them alongside your configs, and get a built-in status page. **Dozzle** shows live container logs in the browser. **Netdata** provides real-time system metrics with zero configuration, auto-discovering containers, databases, and services as they start.

### Container Management

**Portainer** and **Dockge** provide graphical dashboards for managing containers, images, volumes, and compose stacks — both work with Podman's socket. Useful when you want to manage the server from a tablet or prefer a visual interface for day-to-day operations.

---

## The Full Self-Hosting Wiki

Every service above has a ready-to-run Podman command in the wiki at [docs.shani.dev/doc/servers](https://docs.shani.dev/doc/servers):

| Category | Services |
|---|---|
| [Media](https://docs.shani.dev/doc/servers/media) | Jellyfin, Plex, Navidrome, Immich, *Arr stack, qBittorrent, Pinchflat, Kavita, Audiobookshelf, PhotoPrism |
| [Productivity](https://docs.shani.dev/doc/servers/productivity) | Nextcloud, Syncthing, Paperless-ngx, Planka, Vikunja, Outline, Mealie, Miniflux, Stirling PDF, Actual Budget, n8n |
| [AI & LLMs](https://docs.shani.dev/doc/servers/ai-llms) | Ollama, Open WebUI, LocalAI, ComfyUI, Automatic1111, Whisper, Kokoro TTS, Tabby, SearXNG |
| [Security](https://docs.shani.dev/doc/servers/security) | Vaultwarden, Authelia, Authentik, Keycloak, Zitadel, CrowdSec, Step-CA, Infisical |
| [Home Automation](https://docs.shani.dev/doc/servers/home-automation) | Home Assistant, Zigbee2MQTT, Mosquitto, Node-RED, ESPHome, Frigate, Matter Server, Double Take |
| [Databases](https://docs.shani.dev/doc/servers/databases) | PostgreSQL, MariaDB, Redis, Valkey, MongoDB, Kafka, Redpanda, Neo4j, TimescaleDB, CockroachDB, InfluxDB, MeiliSearch, Elasticsearch, Qdrant, Weaviate, Litestream |
| [Developer Tools](https://docs.shani.dev/doc/servers/devtools) | Gitea, Woodpecker CI, code-server, Coder, Nginx, Private Registry, Mailpit, n8n |
| [Education](https://docs.shani.dev/doc/servers/education) | Moodle, Canvas LMS, Open edX, BigBlueButton, Greenlight, ERPNext Education, Gibbon, Chamilo, Kolibri, Overleaf CE, Anki Sync Server |
| [Communication](https://docs.shani.dev/doc/servers/communication) | Matrix/Synapse, Conduit, Mattermost, Rocket.Chat, Ntfy, Gotify, Jitsi Meet |
| [Mail](https://docs.shani.dev/doc/servers/mail) | Mailcow, Mailu, Stalwart, Roundcube, SnappyMail, SOGo |
| [Finance](https://docs.shani.dev/doc/servers/finance) | Firefly III, Actual Budget, Ghostfolio, Invoice Ninja, ERPNext Accounting, hledger, Rotki, Bitcoin/LND |
| [Medical & Health](https://docs.shani.dev/doc/servers/medical) | OpenMRS, OpenEMR, HAPI FHIR, Medplum, Fasten Health, Tandoor, Wger |
| [Business Intelligence](https://docs.shani.dev/doc/servers/business-intelligence) | Metabase, Apache Superset, Redash, Evidence.dev, Lightdash, ClickHouse, Plausible, Umami |
| [IoT & Monitoring](https://docs.shani.dev/doc/servers/iot) | Telegraf, EMQX, MQTT Exporter, Prometheus, Alertmanager, InfluxDB, Modbus, OPC-UA |
| [VPN & Tunnels](https://docs.shani.dev/doc/servers/vpn-tunnels) | WG-Easy, Headscale, Headplane, Cloudflared, Pangolin, Pritunl, Firezone, Nebula, ZeroTier, NetBird, Hysteria 2, OpenVPN |
| [Network & DNS](https://docs.shani.dev/doc/servers/networking) | Pi-hole, AdGuard Home, Unbound, Nginx Proxy Manager, Traefik, SearXNG, Homepage |
| [Backups & Sync](https://docs.shani.dev/doc/servers/backups-sync) | Restic, Rclone, MinIO, Garage, Duplicati, Borgmatic, Kopia |
| [Monitoring](https://docs.shani.dev/doc/servers/monitoring) | Prometheus, Grafana, Loki, Alloy, Netdata, Uptime Kuma, Gatus, Beszel, Dozzle, Healthchecks, Speedtest Tracker |
| [Management](https://docs.shani.dev/doc/servers/management) | Portainer, Dockge, Yacht, Homepage, auto-update, systemd integration, cleanup timers |

---

## One More Thing

The argument for self-hosting is usually framed around privacy or cost — and both are real. But there is a third reason that tends to matter more over time: **ownership**.

Cloud services get shut down, acquired, repriced, or quietly degraded. Google Photos compression changed. Dropbox halved its free tier. Services that were free become paid; services that were paid disappear. When you run the server, those decisions belong to you.

Shani OS is built with that in mind — an operating system that gets out of the way, updates without drama, and runs your services reliably for as long as you want to run them.

---

## Related Guides

- [Podman on Shani OS](https://blog.shani.dev/post/podman-containers-on-shani-os) — rootless containers, Docker Compose compatibility, volumes, auto-start
- [Networking on Shani OS](https://blog.shani.dev/post/shani-os-networking-guide) — VPNs, Tailscale, SSH hardening, Caddy, firewall rules
- [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os) — full mutable Linux inside the immutable OS
- [Telegram community](https://t.me/shani8dev) — questions, setups, and community support

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
