# blog.shani.dev

The official Shanios Blog — a lightweight, config-driven SPA covering immutable Linux, atomic updates, OS engineering, product releases, and project news. No build step. No framework. Just HTML, CSS, and one JavaScript file.

Live at → **[blog.shani.dev](https://blog.shani.dev)**

---

## What this is

One page. One config object. Drop a Markdown file into `posts/`, and it appears on the site — with a card on the grid, a tag filter chip, and a fully rendered post page. Dark mode, reading progress, search, and share all work out of the box.

The blog is a History API SPA: `index.html` handles both the post list (`/`) and individual posts (`/post/slug`). There is no separate post template file. GitHub Pages SPA routing is handled by `404.html`, which intercepts unmatched paths and encodes them into `/?p=...`, redirecting to `index.html` which restores the real URL before the app boots.

---

## Getting started

### 1. Configure `config-shani.js`

Open `config-shani.js` and edit the `CONFIG` block. This is the **only file you need to edit** — every hardcoded string, URL, and credential lives here. It is loaded before `script.js` so the engine picks up all values automatically.

```javascript
const CONFIG = {
  // GitHub Pages deployment
  GITHUB_USER: 'shani8dev',
  GITHUB_REPO: 'shani-blog',

  // Production blog URL (no trailing slash)
  BLOG_URL: 'https://blog.shani.dev',

  // Post storage — leave empty for standard GitHub Pages (same repo)
  POSTS_BASE_URL: '',   // ← set only if posts are hosted elsewhere
  POSTS_API_URL:  '',   // ← set only if using a Worker proxy

  // Default author identity (overridable per post in frontmatter)
  AUTHOR_NAME:     'Shrinivas Kumbhar',
  AUTHOR_INITIALS: 'SK',
  AUTHOR_ROLE:     'Shanios · shani.dev',
  AUTHOR_BIO:      'Immutable Linux on Arch. Two OS copies, one always safe. Bad update? One reboot back. Zero telemetry. Built in India 🇮🇳',

  // Site copy
  SITE_TITLE:       'Shanios Blog',
  SITE_TAGLINE:     'Engineering, Linux & Open Source',
  SITE_DESCRIPTION: "Engineering breakdowns, release notes, and stories from the team building India's immutable Linux OS.",
  HERO_EYEBROW:     'Shanios',
  HERO_SUB:         "Engineering breakdowns, release notes, and stories from the team building India's immutable Linux OS.",

  // Top bar (slim brand strip above the header)
  AUSPICIOUS_TEXT:  '॥ श्री ॥',
  AUSPICIOUS_URL:   'https://shani.dev',
  AUSPICIOUS_LABEL: 'Visit Shanios',

  // Logo & favicon — applied dynamically by applyBranding()
  LOGO_IMG_URL: 'https://shani.dev/assets/images/about.svg',
  LOGO_ALT:     'Shanios',
  FAVICON_URL:  'https://shani.dev/assets/images/logo.svg',

  // Publisher info used in JSON-LD structured data
  PUBLISHER_NAME: 'Shanios',
  PUBLISHER_URL:  'https://shani.dev',
  PUBLISHER_LOGO: 'https://shani.dev/assets/images/logo.svg',

  // Default OG image — used when a post has no cover frontmatter
  OG_IMAGE: 'https://shani.dev/assets/images/logo.svg',

  // Twitter / X card handle
  TWITTER_HANDLE: '@shani8dev',

  // Monetization — see Monetization section below
  LEMONSQUEEZY_STORE:   'shani8dev',
  LEMONSQUEEZY_PRODUCT: '',          // e.g. '123456' from LS dashboard
  MEMBERSHIP_URL:       'https://shani8dev.lemonsqueezy.com',
  MEMBERSHIP_PRICE:     '₹199 / year',

  ADSENSE_CLIENT: '',                // e.g. 'ca-pub-1234567890123456'
  ADSENSE_SLOT:   '',                // Ad unit slot ID from AdSense dashboard

  HOUSE_AD_ENABLED: true,
  HOUSE_AD_TEXT:  'Get full access to all member posts — engineering deep-dives, release notes & more.',
  HOUSE_AD_CTA:   'Become a Member →',

  // Footer + social links
  SOCIAL_LINKS: [
    { label: 'GitHub',   icon: 'fa-brands fa-github',   url: 'https://github.com/shani8dev' },
    { label: 'LinkedIn', icon: 'fa-brands fa-linkedin',  url: 'https://www.linkedin.com/in/Shrinivasvkumbhar/' },
    { label: 'Shanios',  icon: 'fa-brands fa-linux',     url: 'https://shani.dev' },
    { label: 'Wiki',     icon: 'fa-solid fa-book-open',  url: 'https://wiki.shani.dev' },
  ],
};
```

### 2. Write a post

Create a `.md` file in `posts/` with a frontmatter block at the top:

```markdown
---
title: 'My Post Title'
date: '2026-04-09'
tag: 'Engineering'
excerpt: 'One sentence that appears on the card and in search results.'
readTime: '6 min'
cover: 'https://blog.shani.dev/assets/images/my-post-cover.jpg'
author: 'Shrinivas Kumbhar'
author_role: 'Shanios · shani.dev'
author_bio: 'Immutable Linux on Arch. Two OS copies, one always safe. Bad update? One reboot back. Zero telemetry. Built in India 🇮🇳'
author_initials: 'SK'
author_linkedin: 'https://www.linkedin.com/in/Shrinivasvkumbhar/'
author_github: 'https://github.com/shani8dev'
author_website: 'https://shani.dev'
paywalled: false
---

Content starts here. Full **Markdown** supported.
```

**Frontmatter reference:**

| Field              | Required | Notes                                                                                              |
|--------------------|----------|----------------------------------------------------------------------------------------------------|
| `title`            | Yes      | Shown on card, post header, and browser tab                                                        |
| `date`             | Yes      | ISO format `YYYY-MM-DD` — used for sort order                                                      |
| `tag`              | No       | Creates a filter chip automatically                                                                |
| `excerpt`          | No       | Falls back to first ~140 chars of body; paywalled posts use first paragraph only                  |
| `readTime`         | No       | Auto-calculated at 200 wpm from body word count if omitted                                         |
| `cover`            | No       | URL to a cover image — shown on card, as a banner on the post page, and as `og:image`             |
| `paywalled`        | No       | `true` to gate this post behind a Lemon Squeezy license key                                       |
| `author`           | No       | Overrides `CONFIG.AUTHOR_NAME` for this post                                                       |
| `author_role`      | No       | Overrides `CONFIG.AUTHOR_ROLE` — shown below the name in the bio card                             |
| `author_bio`       | No       | Overrides `CONFIG.AUTHOR_BIO` — shown in the bio card                                             |
| `author_initials`  | No       | Overrides `CONFIG.AUTHOR_INITIALS` — shown in the avatar circle; auto-derived from name if absent |
| `author_linkedin`  | No       | LinkedIn profile URL — shown as a link button in the bio card                                     |
| `author_github`    | No       | GitHub profile URL — shown as a link button in the bio card                                       |
| `author_website`   | No       | Personal or project website — shown as a link button in the bio card                              |

All `author_*` fields fall back to their `CONFIG` equivalents if omitted. `author_initials` is auto-derived from the author name (first letter of each word, max 2) if neither the frontmatter field nor `CONFIG.AUTHOR_INITIALS` is set. The three social link fields are individually optional — only links that are set are rendered.

> **Note:** Do not put email addresses in frontmatter. `.md` files are publicly readable on GitHub.

**Cover image tips:**
- Recommended size: **1200×630px** (standard OG image ratio)
- Host in `assets/images/` and reference as an absolute URL, or use any CDN URL
- If omitted, the card shows a file icon and no banner is rendered on the post page
- The cover value is always used as `og:image` and `twitter:image`; posts without a cover use `CONFIG.OG_IMAGE`

### 3. Run locally

```bash
node generate-manifest.js        # generate posts/manifest.json + sitemap.xml once
node generate-manifest.js --watch  # auto-regenerate on every .md save
python3 -m http.server 8080
```

Open `http://localhost:8080`. Do **not** open `index.html` as a `file://` URL — the browser blocks fetch requests from `file://` origins.

**How local post discovery works** — two strategies tried in order, first success wins:

| Priority | Strategy | How |
|---|---|---|
| 1 | `posts/manifest.json` | Generated by `node generate-manifest.js` — fastest, recommended |
| 2 | Directory listing | `python3 -m http.server` serves a browsable HTML index; the SPA parses its `<a href>` links to find `.md` files automatically — zero config needed |

`generate-manifest.js` produces the exact same `posts/manifest.json` and `sitemap.xml` as the GitHub Actions workflow. Run it once locally before starting the dev server.

---

## Deployment

### How posts load in production

The GitHub Actions workflow (`.github/workflows/build-manifest.yml`) runs automatically whenever a `.md` file is pushed to `main`. It:

1. Checks out the repo using the auto-provided `GITHUB_TOKEN` (no secrets to create)
2. Reads every `.md` file in `posts/` directly from disk
3. Parses frontmatter and generates a **metadata-only** `posts/manifest.json`
4. Generates `sitemap.xml` with all post URLs + static pages
5. Commits and pushes both files back to the repo

**`manifest.json` is metadata only — no post bodies are embedded.** This keeps it tiny (~100 KB for hundreds of posts vs 5+ MB with bodies). When a reader opens a post, the browser fetches that post's `.md` file on demand and caches it in memory. Re-opening the same post in the session is instant.

### Secrets

**You need zero secrets.** `GITHUB_TOKEN` is injected automatically by GitHub into every workflow run — you do not create it. It is used only to clone the repo and push the generated files back. It never appears in any output file and never reaches the browser.

The only optional secret is `POSTS_PAT` — needed only if you store posts in a **separate private repo** (the commented-out checkout block in the workflow). This setup uses a single repo, so it does not apply.

### GitHub Pages setup

- **CNAME** → `blog.shani.dev`
- **.nojekyll** → disables Jekyll so `.md` files are served as raw text (required)
- **404.html** → encodes unmatched paths into `/?p=...` and redirects to `index.html`; `index.html` decodes and restores the real URL via `history.replaceState`
- **robots.txt** → allows all crawlers, disallows `404.html`, points to sitemap
- **sitemap.xml** → auto-generated by the Action; covers homepage, tag filter URLs, and all post URLs

To deploy: push to `main`. The Action runs, writes `manifest.json` and `sitemap.xml`, and GitHub Pages serves the updated site. No manual steps.

---

## Monetization

Two revenue streams are built in, configured entirely in the `CONFIG` block — no server needed.

### Paywall — Lemon Squeezy license keys

Mark any post `paywalled: true` in frontmatter. Non-members see the **first 5 content blocks** as a faded preview plus a paywall card. Members enter a license key to unlock permanently.

**Setup:**
1. Create an account at [lemonsqueezy.com](https://lemonsqueezy.com)
2. Create a **License Key** product (e.g. "Shanios Members Pass") — set your price
3. Copy the checkout URL into `MEMBERSHIP_URL` in `config-shani.js`
4. Copy your store slug (e.g. `shani8dev` from `shani8dev.lemonsqueezy.com`) into `LEMONSQUEEZY_STORE`
5. Copy the numeric product ID into `LEMONSQUEEZY_PRODUCT`

Buyers receive a license key by email. They paste it into the key field on any paywalled post — the blog calls the Lemon Squeezy API directly from the browser (CORS-enabled, no server proxy needed). Valid keys are stored as a SHA-256 hash in `localStorage`; the raw key is never persisted.

> **Security note:** Gated content is never sent to the browser for non-members — only the free preview blocks are rendered into the DOM. Print is blocked with a notice. The remaining limitation is that the raw `.md` file is publicly readable at its GitHub Pages URL. Do not use the paywall for genuinely sensitive content.

### Ads — Google AdSense + house ad fallback

An ad unit is injected one-third into the body of every **free** post. Members never see it.

**Phase 1 — before AdSense approval:** A house ad banner promotes your membership. It has a dismiss × button; dismissal persists for the browser session (`sessionStorage`). Set `HOUSE_AD_ENABLED: false` to hide it entirely.

**Phase 2 — after AdSense approval:**
1. Apply at [adsense.google.com](https://adsense.google.com) — get your `ca-pub-` publisher ID
2. Create an ad unit — copy the slot ID
3. Fill in `ADSENSE_CLIENT` and `ADSENSE_SLOT` in `config-shani.js`

The house ad disappears automatically once both fields are set.

---

## File structure

```
blog.shani.dev/
├── index.html              ← Single-page app shell
├── 404.html                ← GitHub Pages SPA fallback — encodes path, redirects to index.html
├── script.js               ← All engine logic (shared across brands)
├── style.css               ← All styles (brand-independent)
├── config-shani.js         ← Brand config — THE ONLY FILE TO EDIT
├── brand-shani.css         ← Brand color tokens (--color-bg, --color-accent, etc.)
├── generate-manifest.js    ← Local dev helper: generates posts/manifest.json + sitemap.xml
├── .nojekyll               ← Disables Jekyll so .md files are served as raw text
├── CNAME                   ← blog.shani.dev
├── robots.txt
├── sitemap.xml             ← Auto-generated by GitHub Actions + generate-manifest.js
└── posts/
    ├── manifest.json       ← Auto-generated (GitHub Actions on every push to main)
    └── *.md                ← blog post files
```

> **Note:** `generate-manifest.js` produces the exact same `posts/manifest.json` and `sitemap.xml` as the GitHub Actions workflow. Run it once locally before starting a dev server for correct sort order and instant post loads.

---

## Author bio card

Every post renders an author bio card between the post body and the post footer. It shows the author's avatar (initials circle), name, role, bio, and social link buttons (LinkedIn, GitHub, Website).

- Posts by the primary author need no extra frontmatter — the card is auto-populated from CONFIG
- Guest posts set their own `author`, `author_bio`, `author_linkedin`, etc. in frontmatter
- Only social links that are set are rendered
- The card is hidden from print output

---

## Media shortcodes

Posts support rich media via shortcodes written inline in Markdown, processed before the parser runs:

```markdown
::youtube[VIDEO_ID]
::youtube[VIDEO_ID|Caption text]

::vimeo[VIDEO_ID|Caption]

::video[https://example.com/file.mp4|Caption]
::video[../assets/videos/demo.mp4]

::audio[https://example.com/file.mp3|Caption]
::audio[../assets/audio/clip.mp3]

::image[../assets/images/photo.jpg|Alt text|Caption]
::image[../assets/images/wide-banner.jpg|Alt text|Caption|wide]
```

Standard Markdown images (`![alt](url)`) also work and render with a `<figcaption>` automatically. The `wide` modifier on `::image` bleeds the image past the prose column using negative margins.

---

## Tags

Use consistent tags so the filter bar stays clean. The nav exposes: **Engineering**, **Release**, **Linux**, **News**.

| Tag           | Icon                               | Use for                                              |
|---------------|------------------------------------|------------------------------------------------------|
| `Engineering` | `fa-solid fa-gears`                | Technical deep-dives, architecture, OS internals     |
| `Release`     | `fa-solid fa-rocket`               | Changelogs, version notes, new builds                |
| `Linux`       | `fa-brands fa-linux`               | Linux ecosystem, distro comparisons, kernel topics   |
| `News`        | `fa-solid fa-newspaper`            | Project announcements, press, milestones             |
| `DevOps`      | `fa-solid fa-gears`                | CI/CD, deployment, Btrfs, atomic tooling             |
| `Incident`    | `fa-solid fa-triangle-exclamation` | Post-mortems, rollback stories                       |
| `Essay`       | `fa-solid fa-feather-pointed`      | Long-form opinion or narrative pieces                |
| `Open Source` | `fa-brands fa-osi`                 | Contributions, licensing, community                  |

Tag icons are defined in the `TAG_ICONS` map at the top of `script.js`. Posts with an unrecognised tag fall back to `fa-solid fa-file-lines`.

---

## Callout blocks

```markdown
> [!NOTE]
> Shanios keeps two OS copies on disk — one always clean and bootable.

> [!TIP]
> Run `node generate-manifest.js --watch` while writing posts locally.

> [!WARNING]
> Do not open index.html via file:// — cross-origin fetches will fail.

> [!CAUTION]
> Paywalled posts are gated client-side only — not a hard security boundary.

> [!IMPORTANT]
> Always set a canonical URL when cross-posting.
```

| Type        | Icon                               | Colour                        |
|-------------|------------------------------------|-------------------------------|
| `NOTE`      | `fa-solid fa-circle-info`          | Blue (`--color-callout-note`) |
| `TIP`       | `fa-solid fa-lightbulb`            | Green (`--color-success`)     |
| `WARNING`   | `fa-solid fa-triangle-exclamation` | Amber (`--color-warning`)     |
| `CAUTION`   | `fa-solid fa-fire`                 | Red (`--color-error`)         |
| `IMPORTANT` | `fa-solid fa-star`                 | Olive (`--color-secondary`)   |

---

## Features

- **Zero build step** — plain HTML/CSS/JS, deploy anywhere
- **Config-driven** — edit `config-shani.js` once; `applyBranding()` injects all values into the DOM: title, meta, OG/Twitter cards, JSON-LD, favicon, logo images, top bar text, footer social links, and current year
- **Metadata-only manifest** — `posts/manifest.json` contains no post bodies (~100 KB for hundreds of posts); bodies are fetched on demand when a post is opened and cached in memory for the session
- **Auto sitemap** — `sitemap.xml` is rebuilt by the GitHub Action and `generate-manifest.js` on every post change; includes all post URLs + static pages
- **Batched post fetching** — `.md` files are fetched in batches of 12 rather than all at once, keeping the browser connection pool sane at scale
- **Zero-config local dev** — `python3 -m http.server 8080` works out of the box; the SPA parses the directory listing to discover `.md` files automatically; `generate-manifest.js` available for the best experience
- **Localhost-aware** — on `localhost` / `127.0.0.1` / LAN IPs the GitHub Contents API is never called; post discovery uses local strategies only
- **Cover images** — set `cover` in frontmatter; shown on the card, as a banner, and as `og:image` / `twitter:image`; falls back to `CONFIG.OG_IMAGE` if omitted
- **History API routing** — real paths (`/` for list, `/post/slug` for articles); no reloads, no hash fragments
- **GitHub Pages SPA support** — `404.html` encodes unmatched paths and redirects to `index.html`; `/posts/slug` silently rewritten to `/post/slug`
- **No Jekyll interference** — `.nojekyll` ensures `.md` files are served as raw text, not processed by Jekyll
- **Auto tag filter** — chips generated from frontmatter; active state synced with `?tag=` URL param
- **Pagination** — 9 posts per page, smart ellipsis, URL-persisted `?page=`
- **Hero section** — featured latest post with animated title + "Also reading" sidebar; hidden when filtering or searching
- **No theme flash** — inline `<script>` applies `data-theme` before CSS renders
- **Dark / light mode** — system preference, `localStorage` persistence, Prism theme swaps
- **Reading progress bar** — 2px accent line fixed to top of viewport on post pages
- **Ctrl+K / Cmd+K search** — slide-down bar; client-side; searches title, excerpt, tag, and already-cached bodies only (no fetch triggered by searching); gated content excluded for non-members; `aria-live` result count
- **Prev / Next navigation** — "Older" / "Newer" buttons in post footer
- **JSON-LD** — `BlogPosting` + `BreadcrumbList` on post pages; `Blog` + `Organization` on index; updated on every navigation
- **Media shortcodes** — YouTube (privacy-enhanced embed), Vimeo, `<video>`, `<audio>`, image figures with optional wide bleed
- **Callout blocks** — NOTE / TIP / WARNING / CAUTION / IMPORTANT
- **Math rendering** — KaTeX inline `$...$` and display `$$...$$`; skips code blocks
- **Share button** — Web Share API with clipboard fallback + toast
- **Code copy buttons** — language label + copy on every fenced code block
- **Table copy** — Copy CSV on every Markdown table
- **Syntax highlighting** — Prism.js (Bash, YAML, JSON, JS, TS, Python, CSS, Go, HCL, Docker, Nginx, SQL)
- **Author bio card** — avatar, name, role, bio, LinkedIn / GitHub / Website buttons; overridable per post via frontmatter; hidden from print
- **Like button** — heart toggle per post in `localStorage`
- **Paywall gate** — faded preview; Lemon Squeezy license key validated from the browser via their CORS-enabled API; key stored as SHA-256 hash only (raw key never persisted); print blocked with notice
- **Ads** — AdSense mid-post unit with house ad fallback; dismissed via `sessionStorage`; hidden for members
- **SEO** — Open Graph, Twitter Card, JSON-LD, canonical URLs updated on every navigation
- **Responsive** — 3-col → 2-col → 1-col grid; hamburger nav on mobile; search bar hidden on mobile (toggle only)
- **Accessible** — skip link, ARIA roles, `aria-expanded`, `aria-hidden`, WCAG 2.1 AA focus rings, `aria-live` search, `<noscript>`, `prefers-reduced-motion`
- **Print styles** — header, footer, sidebar, author card, and interactive chrome hidden; paywalled content blocked with a notice
- **Back to top** — appears after 400px scroll, smooth opacity transition
- **Page load overlay** — full-screen branded loader with animated progress bar; dismissed on posts ready
- **External links** — auto `target="_blank" rel="noopener noreferrer"`
- **Anchor headings** — slugified `id` attributes, hoverable `#` anchor, smooth in-page scroll

---

## Theming

Brand colors are CSS custom properties in `brand-shani.css`, consumed by `style.css`. Swap the brand file to re-theme without touching shared styles.

**Dark mode (default) — Warm Charcoal + Coral:**

```css
:root {
  --color-bg:           #161514;
  --color-bg-alt:       #1e1d1b;
  --color-bg-elevated:  #262422;
  --color-bg-card:      #1b1a18;
  --color-text:         #f5f4f2;
  --color-text-muted:   #b0aaa4;
  --color-text-faint:   #8a8580;
  --color-border:       #2e2c29;
  --color-border-hover: #4a4641;
  --color-accent:       #ff7f50;   /* coral */
  --color-accent-hover: #ff6a33;
  --color-accent-bg:    rgba(255, 127, 80, 0.12);
  --color-accent-text:  #161514;
  --color-secondary:    #9f72f5;   /* violet */
  --color-secondary-bg: rgba(159, 114, 245, 0.1);
  --shadow-hover: 0 8px 36px rgba(22, 21, 20, 0.65);
}
```

**Light mode — Warm Editorial:**

```css
html[data-theme="light"] {
  --color-bg:           #faf9f7;
  --color-bg-alt:       #f2f0ec;
  --color-bg-elevated:  #eae8e3;
  --color-bg-card:      #ffffff;
  --color-text:         #1c1b19;
  --color-text-muted:   #5a5752;
  --color-text-faint:   #6e6a63;
  --color-border:       #e2dfd8;
  --color-border-hover: #c8c4bb;
  --color-accent:       #b53309;   /* deepened coral for WCAG AA on light bg */
  --color-accent-hover: #9a2a05;
  --color-accent-bg:    rgba(181, 51, 9, 0.09);
  --color-accent-text:  #ffffff;
  --color-secondary:    #6d28d9;
  --color-secondary-bg: rgba(109, 40, 217, 0.08);
  --shadow-hover: 0 8px 36px rgba(28, 27, 25, 0.08);
}
```

Prism.js theme (`prism-tomorrow` ↔ `prism`) is swapped by `UI.initTheme()` on every dark/light toggle.

---

## Known limitations

**Post pages depend on `404.html` for direct URL access.** Direct navigation to `/post/slug` triggers a GitHub Pages 404, which `404.html` catches and redirects client-side. Search engine deep-link indexing reliability varies — submitting `sitemap.xml` to Google Search Console improves this significantly.

**Paywall is DOM-secure but not network-secure.** Gated HTML is never rendered for non-members and the full body is never cached for non-members. However, the raw `.md` file is publicly readable at its GitHub Pages URL. Do not use the paywall for genuinely sensitive content.

**Search only covers already-cached bodies.** Posts not yet opened in the session are searched by title, excerpt, and tag only. No fetches are triggered by searching — this is intentional to avoid hundreds of requests on every keystroke.

**On first deploy before the Action has run**, `manifest.json` does not exist yet. In production the blog falls back to the GitHub Contents API (unauthenticated, 60 req/hr) to discover posts. Once the Action runs once and commits `manifest.json`, this fallback is never used again.
