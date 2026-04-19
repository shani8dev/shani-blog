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
readTime: '16 min'
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

## HTTPS for Local Services — Caddy

Every service on your home server should be reachable via HTTPS — even on your LAN. Without it, browsers warn about insecure connections, WebSockets behave inconsistently, and some apps (like Vaultwarden) require HTTPS for full functionality.

Caddy is pre-installed on Shani OS and handles this automatically. It provisions and renews TLS certificates via Let's Encrypt for public domains, and via its own built-in CA for private `.home.local` addresses — no certificate warnings, no manual renewal, no Certbot cron job.

Always bind container ports to `127.0.0.1` so services are not directly exposed to the network, then proxy through Caddy:

```bash
sudo systemctl enable --now caddy
caddy validate --config /etc/caddy/Caddyfile    # validate before reloading
sudo systemctl reload caddy                      # zero-downtime reload
```

Config file: `/etc/caddy/Caddyfile`. Changes persist across OS updates.

```caddyfile
# Public domain — HTTPS via Let's Encrypt (DNS must point to your server)
jellyfin.yourdomain.com {
    reverse_proxy localhost:8096
}

# Private .home.local domain — HTTPS via Caddy's internal CA (LAN only)
jellyfin.home.local {
    tls internal
    reverse_proxy localhost:8096
}

nextcloud.home.local {
    tls internal
    reverse_proxy localhost:8080
}

# Protect any service with SSO via Authelia
vault.yourdomain.com {
    forward_auth localhost:9091 {
        uri /api/verify?rd=https://auth.yourdomain.com
        copy_headers Remote-User Remote-Groups Remote-Name Remote-Email
    }
    reverse_proxy localhost:8180
}
```

For `.home.local` addresses, trust Caddy's internal CA once so browsers accept the certificates:

```bash
sudo trust anchor \
  /var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt
sudo update-ca-trust
```

Full guide: [docs.shani.dev — Caddy](https://docs.shani.dev/doc/networking/caddy).

---

## What You Can Run

The categories below cover the most common use cases. Each links to a wiki page with ready-to-run Podman commands, full configuration examples, and a Caddy reverse-proxy block for every service.

### Media — [wiki](https://docs.shani.dev/doc/servers/media)

**Jellyfin** streams your entire media library to phones, TVs, tablets, and laptops — hardware transcoding, multi-user support, and native apps on every platform. **Immich** handles photos: automatic mobile backup, AI face and object tagging, shared albums, and a Google Photos-rivalling timeline. The **\*Arr stack** (Radarr, Sonarr, Prowlarr, Lidarr) automates acquisition — request a title, it finds, downloads, renames, and drops it into Jellyfin without you lifting a finger. **Navidrome** covers music streaming, **Audiobookshelf** covers audiobooks and podcasts, **Kavita** and **Komga** cover ebooks and manga. **Tdarr** handles automated video transcoding to optimise storage.

### Productivity & Files — [wiki](https://docs.shani.dev/doc/servers/productivity)

**Nextcloud** replaces Dropbox, Google Drive, Google Calendar, and Google Contacts in one deployment — file sync, calendar, contacts, and collaborative document editing via Collabora or OnlyOffice. **Syncthing** is the lighter alternative: pure peer-to-peer sync with no central server. **Paperless-ngx** OCRs, indexes, and tags every document you feed it so you can full-text search every receipt and contract you have ever scanned. Beyond files: **Outline** for team wikis, **BookStack** for structured documentation, **Planka** and **Vikunja** for task management, **Ghost** or **WordPress** for publishing, **Penpot** for design, **n8n** for workflow automation, **Grocy** for household management, and **Monica** for personal CRM.

### AI & Local LLMs — [wiki](https://docs.shani.dev/doc/servers/ai-llms)

A mini PC with 16 GB of RAM runs a 7B parameter model at usable speeds — no API key, no usage limits, no data leaving your network. **Ollama** manages models (Llama, Mistral, Phi, Gemma, Qwen, DeepSeek) and serves them via an OpenAI-compatible REST API. **Open WebUI** puts a polished ChatGPT-style interface in front of it, with document RAG, web search via SearXNG, and voice via Whisper. **Tabby** is a self-hosted Copilot replacement that plugs directly into VS Code and JetBrains. **ComfyUI** and **InvokeAI** run Stable Diffusion locally. **Flowise** and **Dify** build production LLM pipelines visually. **Langfuse** gives you full observability over every prompt and completion.

### Security & Identity — [wiki](https://docs.shani.dev/doc/servers/security)

**Vaultwarden** is a Bitwarden-compatible password server — every Bitwarden client (mobile, browser, desktop) connects to your own hardware instead of Bitwarden's cloud. **Authelia** gates your entire self-hosted stack behind a single 2FA login page; **Authentik** adds full OIDC/SAML SSO for more complex setups. **Step-CA** is your own internal certificate authority. **Wazuh** provides SIEM and threat detection across all hosts. **Suricata** runs network IDS/IPS inline. **CrowdSec** and **Fail2ban** handle brute-force prevention at the firewall level.

### Home Automation — [wiki](https://docs.shani.dev/doc/servers/home-automation)

**Home Assistant** integrates 3,000+ devices — local execution means sub-50ms automations and no cloud dependency. If the internet goes down, your smart home keeps working. **Zigbee2MQTT** bridges 3,000+ Zigbee devices via a $15 USB coordinator with no proprietary hub. **Frigate** runs AI object detection on any RTSP camera on your GPU. **ESPHome** turns $5 ESP32 boards into custom sensors with YAML config and native Home Assistant integration. **evcc** optimises EV charging against solar production and grid tariffs.

### Communication — [wiki](https://docs.shani.dev/doc/servers/communication)

**Matrix/Synapse** (or the lighter **Conduit**) gives you end-to-end encrypted federated chat — your messages stay on your hardware, and you can still reach anyone on matrix.org. **Mattermost** and **Rocket.Chat** cover team chat. **Jitsi Meet** handles video calls. **Ntfy** and **Gotify** send push notifications from any script or cron job to your phone with a single `curl`. For community platforms: **Discourse** for forums, **Mastodon** for microblogging, **Lemmy** for link aggregation, **PeerTube** for video hosting.

### Databases — [wiki](https://docs.shani.dev/doc/servers/databases)

Every database runs rootless via Podman with ports bound to `127.0.0.1` by default — nothing reaches your network unless you explicitly proxy it. Relational: **PostgreSQL**, **MariaDB**. Caching: **Redis**, **Valkey**, **Dragonfly**. Document: **MongoDB**, **FerretDB**. Message queues: **Kafka**, **Redpanda**, **RabbitMQ**, **NATS**. Graph: **Neo4j**. Time-series: **TimescaleDB**, **InfluxDB**. Search: **MeiliSearch**, **Typesense**, **Elasticsearch**, **OpenSearch**. Vector: **Qdrant**, **Weaviate**. Analytical: **ClickHouse**, **DuckDB**.

### Developer Tools — [wiki](https://docs.shani.dev/doc/servers/devtools)

**Gitea** or **GitLab CE** give you a full GitHub on your own hardware — issues, pull requests, wikis, and CI. **Woodpecker CI** runs pipelines triggered by Gitea pushes. **code-server** runs VS Code in the browser, reachable from any device on your tailnet. **Harbor** is a production container registry with vulnerability scanning. **SonarQube** runs continuous code quality and security analysis. **Mailpit** intercepts outbound email in development so nothing accidentally reaches real users.

### Business Intelligence — [wiki](https://docs.shani.dev/doc/servers/business-intelligence)

Your databases already live on the server — your analytics stack runs next to them at zero egress cost. **Metabase** is the fastest path to charts for non-technical users. **Apache Superset** goes deeper with 40+ connectors and a full SQL IDE. **Evidence.dev** lets analysts write SQL in Markdown files and ship polished reports as a static site, version-controlled in Git. **Plausible** and **Umami** replace Google Analytics with GDPR-compliant, cookieless web analytics.

### Finance — [wiki](https://docs.shani.dev/doc/servers/finance)

**Firefly III** covers personal finance with double-entry bookkeeping, budgets, and recurring transactions. **Actual Budget** takes a zero-based envelope approach (YNAB-style) with data stored locally. **Ghostfolio** tracks investments with live prices and XIRR. **Invoice Ninja** handles freelancer invoicing with PDF output and online payments. **Paisa** is purpose-built for Indian personal finance — UPI, mutual funds, and Indian account types out of the box.

### Medical & Health — [wiki](https://docs.shani.dev/doc/servers/medical)

**OpenEMR** and **OpenMRS** are full electronic health record systems — visit notes, prescriptions, lab orders, scheduling, billing — relevant for small clinics or anyone who wants clinical data off cloud infrastructure. **HAPI FHIR** gives you a standards-based health data hub that any FHIR-compatible app can consume. **Fasten Health** connects to 1,000+ US health providers via SMART on FHIR and pulls your complete medical history into a local dashboard. **Wger** tracks workouts; **Tandoor** tracks nutrition with ingredient-level macros.

### Education — [wiki](https://docs.shani.dev/doc/servers/education)

**Moodle** is the world's most-deployed open-source LMS — courses, graded assignments, SCORM, H5P, and analytics, with no per-seat licensing. Pair it with **BigBlueButton** for live virtual classrooms. **Open edX** (via Tutor) powers MOOC-scale delivery — the same platform behind edX.org. **ERPNext Education** covers the full school ERP side: admissions, timetables, attendance, fees, and parent portals. **Overleaf** gives researchers and students a collaborative LaTeX editor.

### Game Servers — [wiki](https://docs.shani.dev/doc/servers/game-servers)

**Minecraft** (Java and Bedrock), **Valheim**, **Terraria**, **Factorio**, **Satisfactory**, and **CS2** all run as rootless containers. **Pterodactyl** and **Crafty Controller** provide web-based panels for managing multiple game server instances, resource limits, and console access from the browser.

### IoT & Sensor Pipelines — [wiki](https://docs.shani.dev/doc/servers/iot)

**Mosquitto** or **EMQX** broker MQTT from ESP32s, Shelly switches, and Tasmota devices. **Telegraf** ingests from 300+ sources and writes to **InfluxDB** for time-series storage. **OwnTracks** tracks your phone's GPS location via your own broker — no third party ever touches the data. The wiki covers the full pipeline through to Grafana dashboards and Prometheus alerts.

### Mail — [wiki](https://docs.shani.dev/doc/servers/mail)

Self-hosting email requires a static IP, correct DNS (MX, SPF, DKIM, DMARC), and an ISP or VPS that allows port 25. **Mailcow** bundles the full stack (Postfix, Dovecot, Rspamd, SOGo, ClamAV). **Stalwart** is a modern single-binary alternative with native JMAP. Beyond servers: **listmonk** for newsletters, **SimpleLogin** and **addy.io** for email aliasing, **Postal** for transactional sending with delivery analytics and bounce handling.

### Backups — [wiki](https://docs.shani.dev/doc/servers/backups-sync)

A server without offsite backups is one drive failure from total loss. **Restic** handles encrypted, deduplicated snapshots to any destination — local, SFTP, S3, or **MinIO** on a second machine. **Rclone** mirrors to 70+ cloud providers. **Borgmatic** wraps Borg with a single YAML config and automatic pruning. **Litestream** gives SQLite-backed apps continuous offsite replication with sub-second RPO.

> ⚠️ Btrfs snapshots created by `shani-deploy` live on the same drive. They protect against bad updates — not hardware failure. Offsite backups are non-negotiable.

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

Run updates when you choose — Shani OS does not update automatically. `shani-deploy` stages the new OS image while everything keeps running, then activates it on the next reboot. Your containers are entirely untouched throughout.

```bash
# Apply an update
sudo shani-deploy

# Roll back if anything is wrong after rebooting
sudo shani-deploy -r
```

No rescue mode, no package manager archaeology, no manual state reconstruction. Full update reference: [Updates on Shani OS](https://blog.shani.dev/post/shani-os-updates).

### Monitoring — [wiki](https://docs.shani.dev/doc/servers/monitoring)

**Uptime Kuma** monitors every service and alerts via ntfy, Telegram, or email when something goes down. **Gatus** is the declarative alternative — health checks in YAML, versioned alongside your configs, with a built-in status page. **Grafana + Prometheus + Loki** cover metrics, dashboards, and log aggregation across every container. **Dozzle** shows live logs in the browser. **Beszel** gives you a lightweight multi-host overview.

### Container Management — [wiki](https://docs.shani.dev/doc/servers/management)

**Portainer**, **Dockge**, and **Komodo** provide graphical dashboards for containers, images, volumes, and compose stacks — all work with Podman's socket. **Homepage** assembles a live service dashboard with status indicators, system metrics, and bookmarks. **Diun** watches your running containers and notifies you when a new image version is available on the registry.

---

## The Full Self-Hosting Wiki

Every service has a ready-to-run Podman command in the wiki at [docs.shani.dev/doc/servers](https://docs.shani.dev/doc/servers):

| Category | Services |
|---|---|
| [Media](https://docs.shani.dev/doc/servers/media) | Jellyfin, Plex, Navidrome, Immich, Jellyseerr, \*Arr stack (Radarr, Sonarr, Lidarr, Prowlarr), qBittorrent, Pinchflat, Kavita, Audiobookshelf, PhotoPrism, Calibre-Web, Readarr, Bazarr, Overseerr, Tdarr, MeTube, Stash, Komga, TubeArchivist, Kometa |
| [Productivity](https://docs.shani.dev/doc/servers/productivity) | Nextcloud, Syncthing, Filebrowser, Paperless-ngx, Planka, Vikunja, Outline, Mealie, Miniflux, FreshRSS, Stirling PDF, Ghost, WordPress, BookStack, Wiki.js, HedgeDoc, CryptPad, Wallabag, Linkwarden, Monica, Rallly, Kimai, Grocy, Joplin Server, Penpot, Memos, AFFiNE, Hoarder, n8n, Actual Budget |
| [AI & LLMs](https://docs.shani.dev/doc/servers/ai-llms) | Ollama, Open WebUI, LocalAI, ComfyUI, Automatic1111, InvokeAI, Whisper, Kokoro TTS, Piper TTS, Tabby, AnythingLLM, LiteLLM, Perplexica, Flowise, Langfuse, Open WebUI Pipelines, Dify, Open Interpreter, SearXNG |
| [Security](https://docs.shani.dev/doc/servers/security) | Vaultwarden, Passbolt, Authelia, Authentik, Keycloak, Zitadel, CrowdSec, Fail2ban, Step-CA, Infisical, OpenBao, Wazuh, Greenbone, Trivy, Teleport, Coraza WAF, SafeLine WAF, Suricata, osquery, OWASP ZAP, Nuclei |
| [Home Automation](https://docs.shani.dev/doc/servers/home-automation) | Home Assistant, Mosquitto, Zigbee2MQTT, ESPHome, Node-RED, Matter Server, Frigate, go2rtc, Double Take, Z-Wave JS UI, Scrypted, AppDaemon, evcc, WLED |
| [Communication](https://docs.shani.dev/doc/servers/communication) | Matrix/Synapse, Conduit, Mattermost, Rocket.Chat, Zulip, Ntfy, Gotify, Jitsi Meet, Discourse, Mastodon, Lemmy, Pixelfed, PeerTube, Mumble, FreePBX/Asterisk, SimpleX, Chatwoot |
| [Mail](https://docs.shani.dev/doc/servers/mail) | Mailcow, Mailu, Stalwart, listmonk, SimpleLogin, addy.io, Postal, Roundcube, SnappyMail, SOGo |
| [Databases](https://docs.shani.dev/doc/servers/databases) | PostgreSQL, MariaDB, Redis, Valkey, KeyDB, Dragonfly, MongoDB, FerretDB, Apache Kafka, Redpanda, RabbitMQ, NATS, Neo4j, Cassandra, ScyllaDB, CockroachDB, TimescaleDB, InfluxDB, MeiliSearch, Typesense, Elasticsearch, OpenSearch, Qdrant, Weaviate, DuckDB, SurrealDB, Litestream, Adminer |
| [Developer Tools](https://docs.shani.dev/doc/servers/devtools) | Gitea, Forgejo, GitLab CE, Woodpecker CI, code-server, Coder, Nginx, Harbor, Private Registry, Mailpit, Matomo, n8n, Leantime, Twenty CRM, Huly, DocuSeal, SonarQube, act, Plane |
| [Business Intelligence](https://docs.shani.dev/doc/servers/business-intelligence) | Metabase, Apache Superset, Redash, Evidence.dev, Lightdash, ClickHouse, Plausible, Umami |
| [Finance](https://docs.shani.dev/doc/servers/finance) | Firefly III, Actual Budget, Ghostfolio, Invoice Ninja, ERPNext Accounting, hledger, Beancount, Kresus, Paisa, Rotki, Bitcoin/LND, Monero Node |
| [Medical & Health](https://docs.shani.dev/doc/servers/medical) | OpenMRS, OpenEMR, HAPI FHIR, Medplum, Fasten Health, Tandoor, Wger, Nextcloud Health |
| [Education](https://docs.shani.dev/doc/servers/education) | Moodle, Canvas LMS, Open edX, BigBlueButton, Greenlight, ERPNext Education, Gibbon, Chamilo, Kolibri, Overleaf, Anki Sync Server, ITflow, H5P |
| [Game Servers](https://docs.shani.dev/doc/servers/game-servers) | Minecraft Java, Minecraft Bedrock, Velocity Proxy, Valheim, Terraria, Factorio, Satisfactory, CS2, Pterodactyl, Crafty Controller |
| [IoT](https://docs.shani.dev/doc/servers/iot) | Mosquitto, EMQX, Telegraf, Node-RED, MQTT Exporter, Prometheus, Alertmanager, InfluxDB, Modbus, OPC-UA, OwnTracks |
| [VPN & Tunnels](https://docs.shani.dev/doc/servers/vpn-tunnels) | WireGuard, WG-Easy, Tailscale, Headscale, Headplane, Cloudflared, Pangolin, NetBird, Pritunl, Firezone, Nebula, ZeroTier, OpenVPN, Hysteria 2, Gluetun |
| [Network & DNS](https://docs.shani.dev/doc/servers/networking) | Pi-hole, AdGuard Home, Blocky, Unbound, Technitium, Nginx Proxy Manager, Traefik, HAProxy, SearXNG, LibreNMS, NetBox, Ntopng, OwnTracks |
| [Monitoring](https://docs.shani.dev/doc/servers/monitoring) | Prometheus, Alertmanager, Grafana, Grafana Alloy, Loki, Netdata, Uptime Kuma, Gatus, Beszel, Dozzle, Healthchecks, Speedtest Tracker, SmokePing, VictoriaMetrics, Grafana Tempo, Zabbix, SigNoz, OpenTelemetry Collector, Checkmk, Karma, Graylog, Changedetection.io |
| [Backups & Sync](https://docs.shani.dev/doc/servers/backups-sync) | Restic, Borgmatic, Duplicati, Rclone, MinIO, Kopia, Garage, Litestream |
| [Management](https://docs.shani.dev/doc/servers/management) | Portainer, Dockge, Yacht, Komodo, Homepage, Diun, auto-update, systemd integration, cleanup timers |

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
- [Updates on Shani OS](https://blog.shani.dev/post/shani-os-updates) — update and rollback reference
- [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide) — when things go wrong
- [Btrfs Snapshots and Backup on Shani OS](https://blog.shani.dev/post/shani-os-btrfs-snapshots-and-backup) — off-device backup strategy
- [Telegram community](https://t.me/shani8dev) — questions, setups, and community support

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
