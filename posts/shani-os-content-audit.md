# Shani OS Blog — Content Audit & Recommendations

**Total posts reviewed:** 45 markdown files  
**Date:** April 2026

---

## 1. POSTS TO MERGE (Significant Overlap)

### 1a. RETIRE `shani-os-for-everyone` → redirect to the four specialist posts

`shani-os-for-everyone` has four sections — Windows/macOS switchers, Developers, Gamers, IT Admins — each of which now has a dedicated, much deeper post. The overview is redundant and sends users to pages that already exist.

**Retirement target:** `shani-os-for-everyone`  
**Users who would have landed here:** redirect to:
- Switchers → `migrating-to-shani-os`
- Developers → `shani-os-getting-started` (dev section) or `nix-on-shani-os`
- Gamers → `shani-os-gaming-deep-dive`
- IT Admins → `shani-os-oem-and-fleet-deployment`

**Alternative:** Keep it as a very short "index" page (500 words) with one paragraph per audience and links, removing all duplicated body content.

---

### 1b. MERGE `shani-deploy-reference` + `shani-os-update-notifications` → one post

These two are complementary halves of the same system. `shani-deploy-reference` covers the low-level tool; `shani-os-update-notifications` covers the user-facing wrapper. Both share a "Update Channels" section (identical content). Users reading one will always need the other.

**Merged slug:** `shani-os-updates` (or keep `shani-deploy-reference` and absorb `shani-update` as a section)  
**New structure:**
1. How updates work (30 seconds of context)
2. shani-update — the user-facing manager (from `shani-os-update-notifications`)
3. shani-deploy — complete flag reference (from `shani-deploy-reference`)
4. Update channels (deduplicate — appears in both currently)
5. Boot counting and automatic rollback
6. Fleet/unattended use

**Duplicate to remove:** "Update Channels" section exists verbatim in both files.

---

### 1c. MERGE `shani-os-security-deep-dive` + `gen-efi-and-secure-boot` + `shani-os-luks-after-installation` → Security hub with clear sub-pages

Currently these three posts repeat TPM2 enroll/cleanup commands, PCR policy explanation, and Secure Boot chain description across all three files. The overlap:

| Topic | security-deep-dive | gen-efi | luks-after-installation |
|---|---|---|---|
| Secure Boot chain | ✓ | ✓ | — |
| TPM2 PCR policy | ✓ | ✓ | ✓ |
| enroll-tpm2 command | ✓ | ✓ | ✓ |
| cleanup-tpm2 command | — | ✓ | ✓ |
| argon2id explanation | ✓ | — | ✓ |

**Recommendation:** Keep all three as separate posts (they serve different audiences — overview, engineering deep-dive, operational reference) but eliminate the repeated command blocks. Each should describe the concept once and link to the authoritative page for commands.

- `shani-os-security-deep-dive` → conceptual overview, no command blocks (links out)
- `gen-efi-and-secure-boot` → authoritative for UKI/MOK/TPM2 commands
- `shani-os-luks-after-installation` → authoritative for LUKS keyslot/header/recovery commands

Remove from `shani-os-security-deep-dive`: the `sudo gen-efi enroll-tpm2` command block and re-enrollment steps (just link to gen-efi post).

---

### 1d. MERGE `why-your-os-update-should-never-break-your-computer` + `shani-os-architecture-deep-dive` closer together

These are currently written as a two-part series (the philosophy post explicitly says "the next post goes deeper"). The content is coherent as-is, but the philosophy post (`why-os-updates-should-never-break`) repeats the Btrfs layout, the blue-green model, and the security summary that `shani-os-architecture-deep-dive` covers in full. 

**Recommendation:** The philosophy post is fine as a marketing/entry-point piece — keep it. But trim the "Installing Software on an Immutable OS" section (850 words) that appears in `why-os-updates-should-never-break`, as `shani-os-getting-started` covers this in full. Replace with a two-sentence summary and a link.

---

### 1e. MERGE `shani-os-getting-started` + `migrating-to-shani-os` — they nearly duplicate "Daily Use" and the package table

`shani-os-getting-started` has a "Common Questions" section with a software installation table. `migrating-to-shani-os` has an extensive "Package Installation: The Full Translation Table" section. Both cover the same ground (pacman → flatpak, apt → flatpak, etc.) with different framing.

**Recommendation:** Keep both posts but:
- Remove the abbreviated package table from `shani-os-getting-started` — replace it with a link to `migrating-to-shani-os` for the full translation
- `shani-os-getting-started` focuses on first-boot steps (its strong section)
- `migrating-to-shani-os` owns the "what changes" conceptual material

---

## 2. POSTS WITH INTERNAL DUPLICATION (Trim)

### 2a. "Ecosystem comparison" footers — near-identical text in 12+ posts

Every container/app guide ends with a "vs the Full Ecosystem" section that repeats the same list of alternatives with the same descriptions. This is useful once per post, but the text is near-verbatim across:

`distrobox-on-shani-os`, `podman-containers-on-shani-os`, `flatpak-on-shani-os`, `snap-on-shani-os`, `nix-on-shani-os`, `appimage-on-shani-os`, `lxc-lxd-on-shani-os`, `systemd-nspawn-on-shani-os`, `apptainer-on-shani-os`, `homebrew-on-shani-os`

**Recommendation:** Create a canonical "Software Ecosystem on Shani OS" comparison table page (see New Posts below, item 3a). Each guide's ecosystem section becomes 2–3 sentences + a link to the canonical comparison page, rather than a full repeated list.

---

### 2b. TPM2 commands repeated in four posts

`sudo gen-efi enroll-tpm2`, `sudo gen-efi cleanup-tpm2`, and the "after firmware update" workflow appear in: `shani-os-security-deep-dive`, `gen-efi-and-secure-boot`, `shani-os-luks-after-installation`, `shani-os-power-management`.

**Recommendation:** `gen-efi-and-secure-boot` is the authoritative source. The other three should reduce to one paragraph + link.

---

### 2c. Btrfs layout diagram repeated verbatim

The full `@blue / @green / @data / @home / @flatpak...` subvolume tree appears in both `shani-os-architecture-deep-dive` and `why-your-os-update-should-never-break-your-computer`. It's long and technical.

**Recommendation:** Remove from the philosophy post, keep in the architecture post. The philosophy post can refer to it in prose.

---

### 2d. Snap ecosystem position statement repeated

The "Flatpak is primary, Snap is fallback" explanation appears at length in `flatpak-on-shani-os`, `snap-on-shani-os`, `shani-os-getting-started`, and `migrating-to-shani-os`.

**Recommendation:** Each post needs one paragraph on this. The full rationale lives in `snap-on-shani-os`. Others link to it.

---

## 3. NEW POSTS TO ADD

### 3a. `shani-os-software-ecosystem` — The Canonical "What to Use When" Reference

**Gap:** Every post has its own comparison table, but there's no single authoritative reference. Users want "I need X, which tool?" with a direct answer.

**Suggested content:**
- Decision flowchart: GUI app → Flatpak → Flathub? → Snap → AppImage
- CLI tool → Nix → not in Nixpkgs? → Distrobox
- Windows app → Bottles/Wine → not compatible? → VM
- Full comparison table: Flatpak / Snap / AppImage / Nix / Distrobox / Podman / LXD / nspawn / Apptainer / Homebrew / VMs — one row per tool, columns for: Use case, Isolation level, Persists across updates, GUI apps, CLI tools, root required
- "Where does it live?" — subvolume for each ecosystem
- This post becomes the canonical link target from all ecosystem footer sections

---

### 3b. `shani-os-troubleshooting-guide` — Consolidated Troubleshooting

**Gap:** Troubleshooting is scattered. Audio troubleshooting is in `shani-os-audio-pipewire`. Boot issues are referenced in `shani-deploy-reference` but not written. Bluetooth troubleshooting is in `shani-os-bluetooth`. etc.

**Suggested content:**
- Won't boot / boot loop → how to use fallback slot, how to run shani-deploy -r from live USB
- Black screen after update → GPU driver steps
- Audio not working → PipeWire restart, SOF firmware
- Bluetooth not connecting → rfkill, hciconfig
- Flatpak permissions / sandboxing issues → Flatseal
- TPM2 won't unlock after update → gen-efi cleanup-tpm2
- `shani-deploy` fails mid-download → aria2c resume, -c cleanup flag
- Waydroid won't start → binder module, re-init
- NVIDIA not detected → Secure Boot MOK enrollment
- Common `journalctl` commands for diagnosing any of the above

This post is referenced by `docs.shani.dev` links throughout the codebase — many posts link to `docs.shani.dev/doc/troubleshooting` which presumably maps here.

---

### 3c. `shani-os-first-week` — What to Do in Your First Week

**Gap:** `shani-os-getting-started` covers installation and first boot well. But there's nothing that bridges first boot → productive daily use for a non-developer. This is the highest-friction period for new users.

**Suggested content (day-by-day or task-by-task):**
- Day 1: Verify install, enroll TPM2, run first update, install must-have apps via Flatpak
- Day 2: Set up email (Thunderbird), cloud storage (GNOME Online Accounts / Nextcloud), set locale
- Day 3: Configure your printer (CUPS/ipp-usb), pair Bluetooth devices, set up KDE Connect
- Day 4: Install dev tools (Nix channel setup, first Distrobox container)
- Day 5: Understand backups — set up restic
- Day 6: Explore the shell (McFly, FZF, bat, eza)
- Day 7: Review your /etc overlay, know what you've customised

Target: non-technical users making a complete switch.

---

### 3d. `shani-os-faq` — Frequently Asked Questions

**Gap:** Questions like "Can I install pacman packages?", "What happens to my files after rollback?", "Does it work without internet?", "Can I dual boot?" appear repeatedly across multiple posts (getting-started, for-everyone, migrating, why-updates). A single FAQ page would stop these answers from being scattered.

**Suggested content:** Pull the best answer from each post where it currently appears, consolidate into a structured FAQ. Suggested groupings:
- Installation & Requirements
- Updates & Rollback
- Software Installation (the "no pacman" questions)
- File Safety & Data
- Security & Encryption
- Hardware & Compatibility
- Gaming
- Developer Use

---

### 3e. `shani-os-networking-details` — Deeper Networking Reference

**Gap noted in posts:** `shani-os-networking-guide` exists (uploaded but not in context). Multiple posts reference it for Tailscale, VPN, SSH, Caddy. A post covering Cloudflared tunnels, reverse proxies, and self-hosting networking would complement the home server post.

*(Skip this if `shani-os-networking-guide` already covers this — review that file before creating.)*

---

### 3f. `shani-health-reference` — shani-health CLI Reference

**Gap:** The 2026.04.15 release notes introduce `shani-health` as a new CLI for checking system health, but there is no guide for it anywhere in the 45 posts. Given that `shani-deploy` has a full reference post, `shani-health` should too.

**Suggested content:**
- What shani-health checks (filesystem integrity, slot health, subvolume sizes, service status)
- All subcommands and flags
- Reading the output
- Integration with monitoring / automated fleet health checks
- How it complements `shani-deploy --storage-info`

---

### 3g. `shani-os-android-app-compatibility` — Android App Compatibility List and Workarounds

**Gap:** `waydroid-android-on-shani-os` covers setup well but doesn't address the most common user question: "Will [specific category of app] work?" Particularly relevant for India-specific apps.

**Suggested content:**
- Known-working Indian apps: BHIM, PhonePe, Paytm, DigiLocker, IRCTC, Aarogya Setu, UMANG
- Streaming services: Netflix (Widevine L1 status), Hotstar, JioCinema, SonyLIV
- Banking apps (most are blocked — explain why and the SMS workaround)
- Play Protect / SafetyNet status and how to handle it
- ARM vs x86 app categories — what typically fails
- Workarounds: webapps, PWAs as alternatives to blocked apps

---

## 4. MINOR ISSUES BY POST

| Post | Issue |
|---|---|
| `shani-os-for-everyone` | "For IT Administrators" section duplicates `shani-os-oem-and-fleet-deployment` almost verbatim |
| `shani-os-getting-started` | "Installing Developer Tools" section duplicates `distrobox-on-shani-os` create/enter commands |
| `shani-os-multimedia` | "Music Playback" section duplicates app list from `shani-os-for-general-desktop-users` |
| `shani-os-for-general-desktop-users` | "Keeping Your System Updated" section is shorter/less accurate than `shani-os-update-notifications` — should just link |
| `shani-os-audio-pipewire` | "Bluetooth Audio Codecs" section duplicates `shani-os-bluetooth` codec table — one should be canonical |
| `shani-os-btrfs-snapshots-and-backup` | "The Complete Strategy" (3-layer model) also appears in `shani-os-for-researchers-and-hpc` — fine as a summary, just note it |
| `shani-os-architecture-deep-dive` | Security Stack table is duplicated in `shani-os-security-deep-dive` — fine to have in both (different audiences) |
| `2026-04-15-release-notes` | No link to `shani-health-reference` — add once that post exists |
| `homebrew-on-shani-os` | Short (130 lines) — could be merged into `nix-on-shani-os` as a "Homebrew alternative" section, or kept standalone for SEO |

---

## 5. POSTS THAT ARE FINE AS-IS (no changes needed)

These are well-scoped, non-overlapping, and cover their topic without significant duplication:

- `shani-os-architecture-deep-dive` ✓
- `flatpak-on-shani-os` ✓ (minor: trim ecosystem footer)
- `distrobox-on-shani-os` ✓ (minor: trim ecosystem footer)
- `nix-on-shani-os` ✓
- `podman-containers-on-shani-os` ✓
- `apptainer-on-shani-os` ✓
- `lxc-lxd-on-shani-os` ✓
- `systemd-nspawn-on-shani-os` ✓
- `appimage-on-shani-os` ✓
- `snap-on-shani-os` ✓
- `shani-os-bluetooth` ✓
- `shani-os-power-management` ✓ (minor: trim TPM2 commands, link to gen-efi)
- `shani-os-printing-and-scanning` ✓
- `shani-os-kde-connect` ✓
- `shani-os-accessibility` ✓
- `shani-os-indian-language-support` ✓
- `shani-os-shell-and-terminal` ✓
- `shani-os-system-configuration` ✓
- `shani-os-btrfs-snapshots-and-backup` ✓
- `waydroid-android-on-shani-os` ✓
- `shani-os-virtual-machines` ✓
- `windows-apps-on-shani-os` ✓
- `shani-os-vs-alternatives` ✓
- `shani-os-gaming-deep-dive` ✓
- `shani-os-for-video-creators` ✓
- `shani-os-for-researchers-and-hpc` ✓
- `shani-os-for-designers-and-visual-creators` ✓
- `shani-os-home-server` ✓
- `shani-os-oem-and-fleet-deployment` ✓
- `shani-os-networking-guide` ✓
- `gpu-compute-on-shani-os` ✓
- `migrating-to-shani-os` ✓ (minor: remove abbreviated package table, link to its own full table)
- `gen-efi-and-secure-boot` ✓
- `shani-os-luks-after-installation` ✓
- `shani-os-multimedia` ✓
- `shani-os-audio-pipewire` ✓
- `2026-04-15-release-notes` ✓

---

## 6. PRIORITY ACTIONS (ordered)

1. **Create `shani-os-software-ecosystem`** (new) — highest impact, fixes 12+ posts at once
2. **Create `shani-os-troubleshooting-guide`** (new) — fills the most-linked-to missing page
3. **Create `shani-health-reference`** (new) — fills an explicit gap from the release notes
4. **Merge `shani-deploy-reference` + `shani-os-update-notifications`** — clean duplication
5. **Trim `shani-os-for-everyone`** to an index page or retire it
6. **Trim TPM2 command blocks** from `shani-os-security-deep-dive` and `shani-os-power-management`
7. **Trim "Installing Software" from `why-your-os-update-should-never-break`**
8. **Create `shani-os-faq`** (new)
9. **Create `shani-os-first-week`** (new)
10. **Create `shani-os-android-app-compatibility`** (new)

---

## 7. CONTENT SERIES STRUCTURE (as-is vs recommended)

**Current series:**
- Shani OS Deep Dives: architecture, why-updates, security, for-everyone, for-researchers, vs-alternatives
- Shani OS Guides: everything else
- Shani OS Releases: release notes

**Recommended series additions:**
- **Shani OS Reference**: shani-deploy-reference, shani-update, shani-health-reference, gen-efi-and-secure-boot, shani-os-luks-after-installation
- **Shani OS Containers**: distrobox, podman, lxc-lxd, nspawn, apptainer (currently scattered in Guides)
- **Shani OS for [Audience]**: for-everyone, for-developers, for-gamers, for-video-creators, for-designers, for-researchers, for-general-desktop, migrating-to
