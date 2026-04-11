# blog.shani.dev

The official Shanios Blog — a lightweight, config-driven SPA covering engineering, product releases, Linux, and open source news. No build step. No framework. Just HTML, CSS, and one JavaScript file.

Live at → **[blog.shani.dev](https://blog.shani.dev)**

---

## What this is

One page. One config object. Drop a Markdown file into `posts/`, and it appears on the site — with a card on the grid, a tag filter chip, and a fully rendered post page. Dark mode, reading progress, search, and share all work out of the box.

The blog is a History API SPA: `index.html` handles both the post list (`/`) and individual posts (`/post/slug`). There is no separate post template file. GitHub Pages SPA routing is handled by `404.html`, which intercepts unmatched paths and restores the real URL via `history.replaceState` before the app boots.

---

## Getting started

### 1. Configure `script.js`

Open `script.js` and edit the `CONFIG` block at the top. This is the **only block you need to edit** — every hardcoded string, URL, and credential lives here.

```javascript
const CONFIG = {
  // GitHub Pages deployment — uncomment for production
  // GITHUB_USER: 'shani8dev',
  // GITHUB_REPO: 'shani-blog',

  // Production blog URL (no trailing slash)
  BLOG_URL: 'https://blog.shani.dev',

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
cover: 'https://shani.dev/assets/images/my-post-cover.jpg'
author: 'Shrinivas Kumbhar'
author_role: 'Shanios · shani.dev'
author_bio: 'Immutable Linux on Arch. Two OS copies, one always safe.'
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
| `cover`            | No       | URL to a cover image — shown on card, as a 21:9 banner on the post page, and as `og:image`        |
| `paywalled`        | No       | `true` to gate this post behind a Lemon Squeezy license key                                       |
| `author`           | No       | Overrides `CONFIG.AUTHOR_NAME` for this post                                                       |
| `author_role`      | No       | Overrides `CONFIG.AUTHOR_ROLE` — shown below the name in the bio card                             |
| `author_bio`       | No       | Overrides `CONFIG.AUTHOR_BIO` — shown in the bio card                                             |
| `author_initials`  | No       | Overrides `CONFIG.AUTHOR_INITIALS` — shown in the avatar circle; auto-derived from name if absent |
| `author_linkedin`  | No       | LinkedIn profile URL — shown as a link button in the bio card                                     |
| `author_github`    | No       | GitHub profile URL — shown as a link button in the bio card                                       |
| `author_website`   | No       | Personal or project website — shown as a link button in the bio card                              |

All `author_*` fields fall back to their `CONFIG` equivalents if omitted. `author_initials` is auto-derived from the author name (first letter of each word, max 2) if neither the frontmatter field nor `CONFIG.AUTHOR_INITIALS` is set. The three social link fields are individually optional — only links that are set are rendered.

> **Note:** Do not put email addresses in frontmatter. `.md` files are publicly readable on GitHub. Use LinkedIn, GitHub, or a website for contact instead.

**Cover image tips:**
- Recommended size: **1200×630px** (standard OG image ratio; also the 21:9 post banner aspect ratio)
- Host in `assets/images/` and reference as an absolute URL, or use any CDN URL
- If omitted, the card shows a file icon and no banner is rendered on the post page
- The `cover` value is always used as `og:image` and `twitter:image`; posts without a cover use `CONFIG.OG_IMAGE`

### 3. No `posts/index.json` needed in production

When `GITHUB_USER` and `GITHUB_REPO` are uncommented in CONFIG, the blog **auto-discovers** all `.md` files in `posts/` via the GitHub Contents API. Just push a post file and it appears.

For **local development**, a `posts/index.json` fallback is required (browsers cannot list directory contents). It can be a simple filename array:

```json
["newest-post.md", "older-post.md"]
```

Or a **metadata objects array** (fast path — skips parallel `.md` fetches on load; bodies are fetched on demand when a post is opened):

```json
[
  {
    "slug": "immutable-linux-deep-dive",
    "title": "A Deep Dive into Immutable Linux",
    "date": "2026-04-09",
    "tag": "Engineering",
    "excerpt": "What immutable Linux actually means, and why it matters.",
    "readTime": "8 min"
  }
]
```

### 4. Run locally

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Open `http://localhost:8080`. Do **not** open `index.html` as a `file://` URL — the blog errors because browsers block cross-origin file fetches.

---

## Deployment

The blog is deployed via **GitHub Pages** with a custom domain.

- **CNAME** → `blog.shani.dev`
- **404.html** → mirrors `index.html`; intercepts all unmatched paths and restores the real URL via `history.replaceState`; `/posts/slug` is silently rewritten to `/post/slug`
- **robots.txt** → allows all crawlers, disallows `404.html`, points to sitemap
- **sitemap.xml** → covers homepage + all tag filter URLs

To deploy: uncomment `GITHUB_USER` / `GITHUB_REPO` in CONFIG, then push to `main`. GitHub Pages rebuilds automatically.

---

## Monetization

Two revenue streams are built in, configured entirely in the `CONFIG` block — no server needed.

### Paywall — Lemon Squeezy license keys

Mark any post `paywalled: true` in frontmatter. Non-members see the **first 5 content blocks** as a faded preview plus a paywall card. Members enter a license key to unlock permanently.

**Setup:**
1. Create an account at [lemonsqueezy.com](https://lemonsqueezy.com)
2. Create a **License Key** product (e.g. "Shanios Members Pass") — set your price in INR
3. Copy the checkout URL into `MEMBERSHIP_URL` in CONFIG
4. Copy your store slug (e.g. `shani8dev` from `shani8dev.lemonsqueezy.com`) into `LEMONSQUEEZY_STORE`

Buyers receive a license key by email. They paste it into the key field on any paywalled post — the blog calls the Lemon Squeezy API directly from the browser. Valid keys are stored in `localStorage`; revoked keys are silently invalidated on the next page load.

**Fees:** ~8% + payment processing (~2%). On ₹199 you net ~₹190.

> **Security note:** Gated content is never sent to the browser for non-members — only the 5 free preview blocks are rendered into the DOM and the full body is not cached in memory for non-members. Print is blocked with a notice. The remaining limitation is that the raw `.md` file is publicly readable at its GitHub raw URL, which is inherent to static GitHub Pages hosting. Do not use the paywall for genuinely sensitive content.

### Ads — Google AdSense + house ad fallback

An ad unit is injected one-third into the body of every **free** post. Members never see it.

**Phase 1 — before AdSense approval:** A house ad banner promotes your membership. It has a dismiss × button; dismissal persists for the browser session (`sessionStorage`). Set `HOUSE_AD_ENABLED: false` to hide it entirely.

**Phase 2 — after AdSense approval:**
1. Apply at [adsense.google.com](https://adsense.google.com) — get your `ca-pub-` publisher ID
2. Create an ad unit — copy the slot ID
3. Fill in `ADSENSE_CLIENT` and `ADSENSE_SLOT` in CONFIG

The house ad disappears automatically once both fields are set.

---

## File structure

```
blog.shani.dev/
├── index.html              ← Single-page app shell
├── 404.html                ← GitHub Pages SPA fallback (mirrors index.html)
├── script.js               ← All logic + CONFIG  ← edit this
├── style.css               ← All styles (brand-independent)
├── brand-shani.css         ← Brand color tokens (--color-bg, --color-accent, etc.)
├── CNAME                   ← blog.shani.dev
├── robots.txt
├── sitemap.xml
├── README.md
├── posts/
│   ├── index.json          ← ["newest.md", "older.md"]  — local dev only
│   └── *.md                ← blog post files
└── assets/
    ├── images/             ← post cover images and OG images (1200×630px recommended)
    ├── videos/             ← self-hosted video files (.mp4, .webm)
    └── audio/              ← self-hosted audio files (.mp3)
```

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

| Tag            | Icon                               | Use for                                              |
|----------------|------------------------------------|------------------------------------------------------|
| `Engineering`  | `fa-solid fa-gears`                | Technical deep-dives, architecture, infrastructure   |
| `Release`      | `fa-solid fa-rocket`               | Changelogs, version notes                            |
| `Linux`        | `fa-brands fa-linux`               | Linux topics, kernel, distributions                  |
| `News`         | `fa-solid fa-newspaper`            | Announcements, press, milestones                     |
| `Product`      | `fa-solid fa-box-open`             | Feature launches, product updates, roadmap           |
| `Platform`     | `fa-solid fa-layer-group`          | Internal tooling, abstractions, developer experience |
| `DevOps`       | `fa-solid fa-gears`                | CI/CD, deployment, operations                        |
| `AWS`          | `fa-brands fa-aws`                 | AWS infrastructure and services                      |
| `NDC`          | `fa-solid fa-plane`                | NDC standard, airline distribution, IATA topics      |
| `Partnerships` | `fa-solid fa-handshake`            | Partner announcements                                |
| `Careers`      | `fa-solid fa-briefcase`            | Job openings, team growth, culture                   |
| `Culture`      | `fa-solid fa-people-group`         | Team culture, perspectives, essays                   |
| `Incident`     | `fa-solid fa-triangle-exclamation` | Post-mortems, outage reports                         |
| `Essay`        | `fa-solid fa-feather-pointed`      | Long-form opinion or narrative pieces                |

Tag icons are defined in the `TAG_ICONS` map at the top of `script.js`. Posts with an unrecognised tag fall back to `fa-solid fa-file-lines`.

---

## Callout blocks

```markdown
> [!NOTE]
> This is a note.

> [!TIP]
> Use the metadata fast-path in index.json to avoid parallel fetches on load.

> [!WARNING]
> Do not open index.html via file:// — cross-origin fetches will fail.

> [!CAUTION]
> Paywalled posts are gated client-side only — not a hard security boundary.

> [!IMPORTANT]
> Always set a canonical URL when cross-posting.
```

| Type        | Icon                               | Colour                       |
|-------------|------------------------------------|------------------------------|
| `NOTE`      | `fa-solid fa-circle-info`          | Blue (`#3b82f6`)             |
| `TIP`       | `fa-solid fa-lightbulb`            | Green (`--color-success`)    |
| `WARNING`   | `fa-solid fa-triangle-exclamation` | Amber (`--color-warning`)    |
| `CAUTION`   | `fa-solid fa-fire`                 | Red (`--color-error`)        |
| `IMPORTANT` | `fa-solid fa-star`                 | Violet (`--color-secondary`) |

---

## Features

- **Zero build step** — plain HTML/CSS/JS, deploy anywhere
- **Config-driven** — change `CONFIG` once; `applyBranding()` injects all values into the DOM: title, meta, OG/Twitter cards, JSON-LD, favicon, logo images, auspicious bar text, footer social links, and current year
- **Cover images** — set `cover` in frontmatter; shown on the card, as a 21:9 banner, and as `og:image` / `twitter:image`; falls back to `CONFIG.OG_IMAGE` for social sharing if omitted
- **GitHub Contents API** — auto-discovers `.md` files in `posts/` in production; `index.json` only needed locally
- **History API routing** — real paths (`/` for list, `/post/slug` for articles); no reloads, no hash fragments
- **GitHub Pages SPA support** — `404.html` intercepts unmatched paths and restores the real URL; `/posts/slug` silently rewritten to `/post/slug`
- **Two index modes** — filename array (slow path) or metadata objects (fast path, on-demand bodies)
- **Auto tag filter** — chips generated from frontmatter; active state synced with `?tag=` URL param
- **Pagination** — 9 posts per page, smart ellipsis, URL-persisted `?page=`
- **Hero section** — featured latest post with animated title + "Also reading" sidebar (posts 7–11); hidden when filtering or searching
- **No theme flash** — inline `<script>` applies `data-theme` before CSS renders
- **Dark / light mode** — system preference, `localStorage` persistence, Prism theme swaps
- **Reading progress bar** — 2px accent line fixed to top of viewport on post pages
- **Ctrl+K / Cmd+K search** — slide-down bar; client-side; title, excerpt, tag, and cached body search; gated content excluded for non-members; `aria-live` result count
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
- **Paywall gate** — 5-block faded preview; Lemon Squeezy license key validated from browser; `localStorage` persistence; silent re-validation on load; print blocked with notice
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
  --color-secondary:    #7c3aed;   /* violet — IMPORTANT callout */
  --color-secondary-bg: rgba(124, 58, 237, 0.1);
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
  --color-text-faint:   #8a867f;
  --color-border:       #e2dfd8;
  --color-border-hover: #c8c4bb;
  --color-accent:       #e85d2a;   /* coral, deeper for light contrast */
  --color-accent-hover: #d44e1e;
  --color-accent-bg:    rgba(232, 93, 42, 0.08);
  --color-accent-text:  #ffffff;
  --color-secondary:    #6d28d9;
  --color-secondary-bg: rgba(109, 40, 217, 0.08);
  --shadow-hover: 0 8px 36px rgba(28, 27, 25, 0.08);
}
```

Brand-independent tokens in `style.css`:

```css
:root {
  --font-display: 'Playfair Display', Georgia, serif;
  --font-sans:    'DM Sans', system-ui, sans-serif;
  --font-mono:    'IBM Plex Mono', Consolas, monospace;
  --color-like:         #e05c7a;   /* like button — rose        */
  --color-success:      #3dba7e;   /* TIP callout, unlock OK    */
  --color-warning:      #e8a215;   /* WARNING callout, members  */
  --color-error:        #e85555;   /* CAUTION callout, errors   */
  --color-callout-note: #3b82f6;   /* NOTE callout — blue       */
}
```

Prism.js theme (`prism-tomorrow` ↔ `prism`) is swapped by `UI.initTheme()` on every dark/light toggle.

---

## Known limitations

**Post pages depend on `404.html` for direct URL access.** Direct navigation to `/post/slug` returns a 404 that `404.html` catches client-side. Search engine deep-link indexing reliability varies.

**Paywall is DOM-secure but not network-secure.** Gated HTML is never rendered for non-members and the full body is not cached. However, the raw `.md` file is publicly readable at its GitHub raw URL. Do not use the paywall for genuinely sensitive content.

**Search only covers cached bodies.** Posts not yet opened in the session are searched by title, excerpt, and tag only. No extra fetches are triggered by searching.

**`GITHUB_USER` and `GITHUB_REPO` must be uncommented for production.** They are commented out by default for local development. Without them, the blog falls back to `posts/index.json`; if that file is absent, no posts will load.
