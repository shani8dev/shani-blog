# blog.shani.dev

The official Shanios Blog — a lightweight, config-driven SPA covering immutable Linux, atomic updates, OS engineering, product releases, and project news. No build step. No framework. Just HTML, CSS, and one JavaScript file.

Live at → **[blog.shani.dev](https://blog.shani.dev)**

---

## How it works

One HTML page. One config object. Drop a Markdown file into `posts/`, push to `main`, and it appears on the site — with a card on the index grid, a tag filter chip, and a fully rendered post page.

The blog is a History API SPA hosted on **GitHub Pages**:

- `index.html` handles both the post list (`/`) and individual posts (`/post/slug`)
- `404.html` intercepts unmatched GitHub Pages 404s, encodes the path into `/?p=...`, and redirects to `index.html`, which restores the real URL via `history.replaceState` before the app boots
- `.nojekyll` disables Jekyll so `.md` files are served as raw text

There is no build step, no bundler, no SSR. The entire engine is `script.js`. Shared markdown utilities live in `utils.js`, loaded by both `script.js` and `admin.html`.

---

## Getting started

### 1. Fork / clone the repo

```bash
git clone https://github.com/shani8dev/shani-blog.git
cd shani-blog
```

### 2. Enable GitHub Pages

Go to your repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main` → Folder: `/ (root)`.

If you have a custom domain, update `CNAME` with your domain and configure the DNS A/CNAME records per [GitHub's docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

### 3. Configure `config-shani.js`

This is **the only file you ever need to edit** for branding. Every string, URL, and feature flag lives here. It is loaded before `script.js`.

Config keys are tagged by where they are consumed:
- `[script]` — read by `script.js` at browser runtime
- `[build]` — read by `generate-manifest.js` at build time (sitemap, RSS, PWA manifest)
- `[both]` — read by both

```javascript
const CONFIG = {

  // ── Deployment ────────────────────────────────────────────────
  // [script] Used as fallback post-discovery via GitHub Contents API
  //          on first deploy before posts/manifest.json exists.
  GITHUB_USER: 'shani8dev',
  GITHUB_REPO: 'shani-blog',

  // ── Admin panel (admin.html) ──────────────────────────────────
  // [script] Branch admin.html reads/writes posts to when committing directly.
  ADMIN_BRANCH:           'main',

  // [script] PR workflow — when enabled, "Commit & PR" pushes to a new feature
  //          branch and opens a Pull Request targeting ADMIN_DEFAULT_BRANCH.
  //          Set false to hide the button and always commit directly.
  ADMIN_PR_ENABLED:       true,
  // [script] The base (target) branch that PRs are opened against.
  ADMIN_DEFAULT_BRANCH:   'main',
  // [script] Prefix used when auto-naming feature branches, e.g. post/my-slug.
  ADMIN_PR_BRANCH_PREFIX: 'post/',

  // [script] Repo path where uploaded images are stored.
  ADMIN_IMAGES_PATH: 'assets/images',

  // ── URLs ──────────────────────────────────────────────────────
  BLOG_URL: 'https://blog.shani.dev',  // [both] canonical root — no trailing slash
  POSTS_BASE_URL: '',   // [script] CDN override for /posts path; leave empty for default same-origin /posts
  POSTS_API_URL:  '',   // [script] GitHub Contents API override; leave empty for default

  // ── Author / team identity ────────────────────────────────────
  AUTHOR_NAME:     'Shrinivas Kumbhar',
  AUTHOR_INITIALS: 'SK',
  AUTHOR_ROLE:     'Shanios · shani.dev',
  AUTHOR_BIO:      'Immutable Linux on Arch. Two OS copies, one always safe. Bad update? One reboot back. Zero telemetry. Built in India 🇮🇳',

  // ── Site identity ─────────────────────────────────────────────
  SITE_TITLE:       'Shanios Blog',
  SITE_TAGLINE:     'Engineering, Linux & Open Source',
  SITE_DESCRIPTION: "Engineering breakdowns, release notes, and stories from the team building India's immutable Linux OS.",
  SITE_KEYWORDS:    'Shanios, immutable Linux, atomic updates, rollback, open source OS, Arch Linux, Btrfs, zero telemetry, shani.dev',

  // ── Hero section ──────────────────────────────────────────────
  HERO_EYEBROW:       'Shanios',
  HERO_SUB:           "Engineering breakdowns, release notes, and stories from the team building India's immutable Linux OS.",
  HERO_SIDEBAR_COUNT: 4,   // posts shown beside the featured post in the hero

  // ── Logo / favicon ────────────────────────────────────────────
  FAVICON_URL:   'https://shani.dev/assets/images/logo.svg',   // [both] SVG favicon + PWA icon
  LOGO_IMG_URL:  'https://shani.dev/assets/images/about.svg',  // [script] header / footer / loader logo
  LOGO_ALT:      'Shanios',
  LOGO_WORDMARK: 'blog',   // small mono label rendered beside the logo image

  // ── Top / auspicious bar ──────────────────────────────────────
  AUSPICIOUS_TEXT:  '॥ श्री ॥',
  AUSPICIOUS_URL:   'https://shani.dev',
  AUSPICIOUS_LABEL: 'Visit Shanios',

  // ── Navigation ────────────────────────────────────────────────
  // A Bookmarks link is appended automatically when BOOKMARKS_ENABLED is true.
  NAV_LINKS: [
    { label: 'Home',        href: '/'                },
    { label: 'Engineering', href: '/?tag=Engineering' },
    { label: 'Release',     href: '/?tag=Release'     },
    { label: 'Linux',       href: '/?tag=Linux'       },
    { label: 'News',        href: '/?tag=News'        },
  ],

  // ── Publisher (JSON-LD structured data) ───────────────────────
  PUBLISHER_NAME: 'Shanios',
  PUBLISHER_URL:  'https://shani.dev',
  PUBLISHER_LOGO: 'https://shani.dev/assets/images/logo.svg',

  // ── Social / OG ───────────────────────────────────────────────
  OG_IMAGE:       'https://shani.dev/assets/images/logo.svg',  // default OG/Twitter card image
  TWITTER_HANDLE: '@shani8dev',
  SOCIAL_LINKS: [
    { label: 'GitHub',   icon: 'fa-brands fa-github',  url: 'https://github.com/shani8dev' },
    { label: 'LinkedIn', icon: 'fa-brands fa-linkedin', url: 'https://www.linkedin.com/in/Shrinivasvkumbhar/' },
    { label: 'Shanios',  icon: 'fa-brands fa-linux',    url: 'https://shani.dev' },
    { label: 'Wiki',     icon: 'fa-solid fa-book-open', url: 'https://wiki.shani.dev' },
  ],

  // ── Locale ────────────────────────────────────────────────────
  LANG:        'en-IN',   // [both] BCP-47 — JSON-LD inLanguage, RSS <language>, PWA lang
  DATE_LOCALE: 'en-IN',   // [both] passed to Date.toLocaleDateString()

  // ── Tag icons (Font Awesome class strings) ────────────────────
  TAG_ICONS: {
    Product:       'fa-solid fa-box-open',
    Engineering:   'fa-solid fa-gears',
    News:          'fa-solid fa-newspaper',
    Release:       'fa-solid fa-rocket',
    Careers:       'fa-solid fa-briefcase',
    Culture:       'fa-solid fa-people-group',
    Partnerships:  'fa-solid fa-handshake',
    Linux:         'fa-brands fa-linux',
    NDC:           'fa-solid fa-plane',
    AWS:           'fa-brands fa-aws',
    DevOps:        'fa-solid fa-gears',
    Platform:      'fa-solid fa-layer-group',
    Incident:      'fa-solid fa-triangle-exclamation',
    Essay:         'fa-solid fa-feather-pointed',
    'Open Source': 'fa-brands fa-osi',
    Post:          'fa-solid fa-file-lines',   // fallback for unknown tags
  },

  // ── Pagination ────────────────────────────────────────────────
  POSTS_PER_PAGE: 9,   // posts shown per page on the index grid

  // ── Storage ───────────────────────────────────────────────────
  // Prefix for all localStorage / sessionStorage keys.
  // Change if running two blogs on the same origin so they don't share state.
  STORAGE_PREFIX: 'shani',

  // ── Monetization — Lemon Squeezy ──────────────────────────────
  LEMONSQUEEZY_STORE:   'shani8dev',
  LEMONSQUEEZY_PRODUCT: '',           // numeric product ID; empty = validate against all products
  MEMBERSHIP_URL:       'https://shani8dev.lemonsqueezy.com',
  MEMBERSHIP_PRICE:     '₹199 / year',

  // ── Paywall copy ──────────────────────────────────────────────
  PAYWALL_HEADING:         'Members only',
  PAYWALL_DESCRIPTION:     "This post is for members. Purchase a membership to unlock all gated posts — you'll receive a license key instantly.",
  PAYWALL_KEY_LABEL:       'Already a member? Enter your license key:',
  PAYWALL_KEY_PLACEHOLDER: 'XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX',
  PAYWALL_PREVIEW_BLOCKS:  12,   // content blocks shown as free preview before the paywall gate

  // ── Monetization — Google AdSense ─────────────────────────────
  ADSENSE_CLIENT: '',   // e.g. 'ca-pub-1234567890123456'
  ADSENSE_SLOT:   '',   // ad unit slot ID from AdSense dashboard

  // ── House ad ──────────────────────────────────────────────────
  HOUSE_AD_ENABLED: true,
  HOUSE_AD_TEXT:    'Get full access to all member posts — engineering deep-dives, release notes & more.',
  HOUSE_AD_CTA:     'Become a Member →',

  // ── Newsletter ────────────────────────────────────────────────
  NEWSLETTER_ENABLED:     true,
  NEWSLETTER_HEADLINE:    'Stay in the loop',
  NEWSLETTER_DESCRIPTION: "Get engineering breakdowns, release notes and open-source stories from the Shanios team — no spam, unsubscribe anytime.",
  NEWSLETTER_PLACEHOLDER: 'you@example.com',
  NEWSLETTER_CTA:         'Subscribe',
  NEWSLETTER_ACTION:      '',   // POST endpoint e.g. Buttondown embed URL; empty = success state only
  NEWSLETTER_SUCCESS:     "🎉 You're subscribed! Check your inbox to confirm.",

  // ── RSS ───────────────────────────────────────────────────────
  RSS_ENABLED: true,
  RSS_URL:     '/feed.xml',   // injects <link rel="alternate" type="application/rss+xml"> in <head>

  // ── Series ────────────────────────────────────────────────────
  SERIES_ENABLED: true,   // shows a series strip on posts sharing a series: frontmatter key

  // ── Related posts ─────────────────────────────────────────────
  RELATED_POSTS_COUNT: 3,   // shown under each post (same tag first, then most recent); 0 to disable

  // ── Bookmarks ─────────────────────────────────────────────────
  BOOKMARKS_ENABLED:     true,   // bookmark icon on cards, Bookmarks nav link, /bookmarks page
  RECENTLY_VIEWED_COUNT: 5,      // recent posts shown on /bookmarks; 0 to disable

  // ── View counter ──────────────────────────────────────────────
  VIEW_COUNT_ENABLED: true,   // privacy-safe localStorage-only; false to hide everywhere

  // ── Reading streak ────────────────────────────────────────────
  STREAK_ENABLED: true,   // 🔥 badge in header after 2+ consecutive daily visits

  // ── Reading speed & word count ────────────────────────────────
  WORDS_PER_MINUTE: 200,
  SHOW_WORD_COUNT:  true,   // displayed beside read time in post header

  // ── Post cards ────────────────────────────────────────────────
  CARD_SHOW_READ_TIME: true,
  SEARCH_HIGHLIGHT:    true,   // highlight query terms in card titles and excerpts
  NEW_POST_DAYS:       7,      // badge "New" for posts within this many days; 0 to disable
  RECENT_POST_DAYS:    30,     // badge "Recent" for posts within this many days

  // ── Post reader ───────────────────────────────────────────────
  FONT_SIZE_CONTROLS:         true,   // A− / A / A+ size buttons in post header
  KEYBOARD_SHORTCUTS_ENABLED: true,   // ? key opens the keyboard shortcuts panel

  // ── Excerpts ──────────────────────────────────────────────────
  EXCERPT_MAX_CHARS: 140,   // max chars for auto-generated excerpts (no excerpt: in frontmatter)

  // ── UI timings ────────────────────────────────────────────────
  TOAST_DURATION:     2500,   // ms toast notifications stay visible
  BACK_TO_TOP_OFFSET: 400,    // px scroll depth before back-to-top button appears

  // ── PWA ───────────────────────────────────────────────────────
  // [build] Written into manifest.json by generate-manifest.js
  // PWA_THEME_COLOR / PWA_BG_COLOR should match --color-bg in brand-shani.css (dark mode)
  PWA_NAME:        'Shanios Blog',
  PWA_SHORT_NAME:  'Shanios',
  PWA_DESCRIPTION: "Engineering breakdowns and release notes from the Shanios team.",
  PWA_THEME_COLOR: '#161514',
  PWA_BG_COLOR:    '#161514',

  // ── Sitemap static URLs ───────────────────────────────────────
  // [build] Written into sitemap.xml alongside all post URLs. Keep in sync with NAV_LINKS.
  SITEMAP_STATIC_URLS: [
    { path: '/',                 priority: '1.0', changefreq: 'weekly' },
    { path: '/?tag=Engineering', priority: '0.6', changefreq: 'weekly' },
    { path: '/?tag=Release',     priority: '0.6', changefreq: 'weekly' },
    { path: '/?tag=Linux',       priority: '0.6', changefreq: 'weekly' },
    { path: '/?tag=News',        priority: '0.6', changefreq: 'weekly' },
  ],
};
```

### 4. Write a post

Create a `.md` file in `posts/`. The filename (without `.md`) becomes the URL slug.

```markdown
---
title: 'Why Your OS Update Should Never Break Your Computer'
date: '2026-04-10'
tag: 'Engineering'
excerpt: 'Every server admin knows: you never update the live system. You update the standby, verify it, then switch.'
readTime: '7 min'
cover: 'https://shani.dev/assets/images/saturn-x.png'
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shanios'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shanios.'
author_initials: SK
author_linkedin: https://linkedin.com/in/shrinivasvkumbhar
author_github: https://github.com/shrinivasvkumbhar
author_website: https://shani.dev
series: 'Shanios Architecture'
paywalled: false
---

Content starts here. Full **Markdown** supported.
```

**Frontmatter reference:**

| Field              | Required | Notes |
|--------------------|----------|-------|
| `title`            | Yes      | Shown on card, post header, and `<title>` |
| `date`             | Yes      | ISO `YYYY-MM-DD` — used for sort order |
| `tag`              | No       | Creates a filter chip automatically |
| `excerpt`          | No       | Falls back to first ~`EXCERPT_MAX_CHARS` chars of body; paywalled posts use the first paragraph only |
| `readTime`         | No       | Auto-calculated at `WORDS_PER_MINUTE` wpm if omitted |
| `cover`            | No       | Absolute URL to a cover image — used on the card, as the post banner, and as `og:image` / `twitter:image` |
| `series`           | No       | Posts with the same `series:` value get a numbered series navigation strip |
| `paywalled`        | No       | `true` to gate behind a Lemon Squeezy license key |
| `featured`         | No       | `true` to pin as the hero featured post |
| `draft`            | No       | `true` to hide the post from all lists and feeds |
| `pinned`           | No       | `true` to keep the post at the top of the index |
| `noindex`          | No       | `true` to add `<meta name="robots" content="noindex">` |
| `toc`              | No       | Set to any value to force a table of contents; auto-detected from `[toc]` shortcode |
| `canonical`        | No       | Override the canonical URL (useful when cross-posting) |
| `og_image`         | No       | Override the OG/Twitter card image for this post |
| `lang`             | No       | Override the `hreflang` / `inLanguage` for this post |
| `keywords`         | No       | Comma-separated keywords for `<meta name="keywords">` |
| `updated`          | No       | ISO `YYYY-MM-DD` — `lastmod` in sitemap and `<lastBuildDate>` in RSS |
| `author`           | No       | Overrides `CONFIG.AUTHOR_NAME` |
| `author_role`      | No       | Overrides `CONFIG.AUTHOR_ROLE` |
| `author_bio`       | No       | Overrides `CONFIG.AUTHOR_BIO` |
| `author_initials`  | No       | Overrides `CONFIG.AUTHOR_INITIALS`; auto-derived from name (first letter of each word, max 2) if absent |
| `author_linkedin`  | No       | LinkedIn profile URL |
| `author_github`    | No       | GitHub profile URL |
| `author_website`   | No       | Personal / project website URL |

All `author_*` fields fall back to their `CONFIG` equivalents if omitted. Only social links that are set are rendered.

> **Note:** Do not put email addresses in frontmatter. `.md` files are publicly readable at their GitHub Pages URL.

**Cover image tips:**
- Recommended size: **1200×630 px** (standard OG ratio)
- Host in `assets/images/` or use any CDN
- If omitted, the card shows a file icon and no banner renders on the post page
- Falls back to `CONFIG.OG_IMAGE` for `og:image` / `twitter:image`

### 5. Push to deploy

```bash
git add posts/my-new-post.md
git commit -m "post: add my-new-post"
git push origin main
```

The GitHub Actions workflow runs automatically, generates the four output files, commits them back, and GitHub Pages redeploys. No manual steps.

---

## Admin panel (`admin.html`)

`admin.html` is a browser-based post editor that talks directly to the GitHub API. No local tooling required. Open `/admin.html` on the deployed site to use it.

### Authentication

On first open, a login overlay prompts for a **GitHub Personal Access Token (classic)** with `repo` scope (or a fine-grained PAT with Contents read/write on the repo). The token is stored only in `localStorage` under the `STORAGE_PREFIX` key — it is never sent anywhere except `api.github.com`.

### Features

- **Post list panel** — lists all `.md` files in `posts/`, with filter, new/draft badges, and one-click open
- **Monaco editor** — full VS Code editing experience: syntax highlighting, line numbers, cursor position indicator, keyboard shortcuts
- **Split / preview / editor-only modes** — toggle between editor, side-by-side split, and rendered preview
- **Live preview** — rendered using the same `Utils` markdown pipeline as the public site (Marked + DOMPurify + KaTeX + Prism)
- **Frontmatter panel** — structured form for all frontmatter fields (title, date, tag, cover, excerpt, author fields, paywalled, featured, draft, pinned, noindex, series, canonical, keywords, updated, toc); synced bidirectionally with the editor
- **Author preview card** — live preview of the author bio card as it will appear on the post
- **Branch selector** — dropdown to switch the target branch; shows default and protected badges; falls back to `ADMIN_BRANCH` from config
- **Commit & PR workflow** — when `ADMIN_PR_ENABLED: true`, the "Commit & PR" button pushes to a new branch (`ADMIN_PR_BRANCH_PREFIX` + slug) and opens a Pull Request against `ADMIN_DEFAULT_BRANCH`; the direct "Commit" button always writes to `ADMIN_BRANCH`
- **Image upload** — drag-and-drop or file picker; uploads to `ADMIN_IMAGES_PATH` in the repo via the GitHub Contents API; inserts the Markdown image shortcode at the cursor
- **GitHub image CDN picker** — paste any image URL and generate a `::image[...]` shortcode with alt, caption, and wide-bleed options
- **Media library panel** — browse and select images already in `assets/images/`
- **Shortcode modals** — toolbar buttons to insert YouTube, Vimeo, video, audio, image, callout block, code block, math (KaTeX preview), and link shortcodes
- **Copy Markdown / Download** — copy the raw Markdown to clipboard or download as a `.md` file
- **Draft banner** — yellow warning shown when `draft: true` is set in frontmatter
- **Config panel** — read-only view of key `CONFIG` values (site title, URL, tags, features) for quick reference
- **Activity log** — scrollable log panel at the bottom showing all API calls and their results
- **Theme toggle** — dark/light mode synced with the public site's theme preference

### Access control

`admin.html` has `<meta name="robots" content="noindex, nofollow">` and is not linked from the public site. Security relies on the GitHub PAT — anyone with the URL but without a valid token cannot read or write posts.

---

## Running locally

```bash
# Generate posts/manifest.json + sitemap.xml + feed.xml + manifest.json
node generate-manifest.js

# Auto-regenerate on every .md save
node generate-manifest.js --watch

# Serve the site
python3 -m http.server 8080
# or: npx serve .
# or: npx http-server -p 8080 -c-1
```

Open `http://localhost:8080`. **Do not open `index.html` as a `file://` URL** — browsers block `fetch()` from `file://` origins.

**How local post discovery works** (first success wins):

| Priority | Strategy | How |
|---|---|---|
| 1 | `posts/manifest.json` | Run `node generate-manifest.js` once — fastest, recommended |
| 2 | `posts/index.json` | A simple `["slug1.md", "slug2.md"]` array you maintain manually |
| 3 | Directory listing | `python3 -m http.server` serves a browsable HTML index; the SPA parses `<a href>` links to find `.md` files — zero config needed |

On production (non-localhost), if `posts/manifest.json` doesn't exist yet, the engine falls back to the **GitHub Contents API** (unauthenticated, 60 req/hr). This only happens before the Action has run for the first time.

---

## GitHub Pages deployment

### How posts load

The workflow (`.github/workflows/build-manifest.yml`) triggers when a `.md` file is pushed to `main`. It:

1. Checks out the repo using the auto-provided `GITHUB_TOKEN` — no secrets to create
2. Reads every `*.md` file in `posts/` (except `index.md`) directly from disk
3. Parses frontmatter, auto-generates excerpts (up to `EXCERPT_MAX_CHARS` chars) and read times (at 200 wpm)
4. Sorts posts newest-first and writes a **metadata-only** `posts/manifest.json` (~100 KB for hundreds of posts — no post bodies embedded)
5. Generates `sitemap.xml` with all `SITEMAP_STATIC_URLS` + all post URLs
6. Generates `feed.xml` (RSS 2.0, latest 50 posts)
7. Generates root `manifest.json` (PWA web app manifest)
8. Commits and pushes all four files back with `[skip ci]`

When a reader opens a post, the browser fetches that post's `.md` on demand and caches it in memory. Re-opening the same post in the session is instant.

### Secrets

**You need zero secrets.** `GITHUB_TOKEN` is provided automatically by GitHub. It is used only to clone the repo and push the generated files. It never appears in any output file.

Optional: `POSTS_PAT` — only needed if posts live in a **separate private repo**. See the commented-out checkout block in `build-manifest.yml` for full instructions.

### Key files for GitHub Pages

| File | Purpose |
|------|---------|
| `CNAME` | Custom domain — `blog.shani.dev` |
| `.nojekyll` | Disables Jekyll so `.md` files are served as raw text, not processed |
| `404.html` | Catches unmatched paths; encodes into `/?p=...`; redirects to `index.html`. Also handles `/posts/slug` → `/post/slug` rewrite |
| `robots.txt` | Allows all crawlers, disallows `404.html`, points to `https://blog.shani.dev/sitemap.xml` |
| `sitemap.xml` | Auto-generated; submit to Google Search Console for better deep-link indexing |
| `feed.xml` | RSS 2.0; auto-generated; latest 50 posts |

---

## External services

### Lemon Squeezy — membership paywall

Mark any post `paywalled: true`. Non-members see the first `PAYWALL_PREVIEW_BLOCKS` (default: 12) content blocks as a faded preview, then a paywall card with a "Get Access" button and a license key input.

The key is validated directly in the browser against Lemon Squeezy's CORS-enabled API — no server or proxy needed. The raw key is never stored; only its SHA-256 hash (via Web Crypto API) is written to `localStorage`. An integrity check on load clears corrupt state (member flag without a hash) automatically.

**Setup:**
1. Create an account at [lemonsqueezy.com](https://lemonsqueezy.com)
2. Create a **License Key** product (e.g. "Shanios Members Pass") and set your price
3. Copy the checkout URL into `MEMBERSHIP_URL`
4. Copy your store slug (e.g. `shani8dev` from `shani8dev.lemonsqueezy.com`) into `LEMONSQUEEZY_STORE`
5. Optionally copy the numeric product ID into `LEMONSQUEEZY_PRODUCT` (leave empty to accept any product in the store)

The engine calls:
```
POST https://api.lemonsqueezy.com/v1/licenses/validate
```

> **Security note:** Gated HTML is never sent to the browser for non-members — only the preview blocks are rendered. However, the raw `.md` file is publicly readable at its GitHub Pages URL. Do not use the paywall for genuinely sensitive content.

---

### Google AdSense — mid-post ads

An ad unit is injected after the first third of paragraphs in every **free** post. Members and paywalled posts never see it. The AdSense script loads lazily, only when a free post is opened.

**Setup:**
1. Apply at [adsense.google.com](https://adsense.google.com) and get your `ca-pub-` publisher ID
2. Create an ad unit and copy its slot ID
3. Set in `config-shani.js`:
   ```javascript
   ADSENSE_CLIENT: 'ca-pub-XXXXXXXXXXXXXXXX',
   ADSENSE_SLOT:   'XXXXXXXXXX',
   ```

Until both fields are set, the **house ad** shows instead (if `HOUSE_AD_ENABLED: true`). The house ad is a dismissable membership promotion banner; dismissal persists in `sessionStorage`. Set `HOUSE_AD_ENABLED: false` to hide it entirely.

---

### Newsletter — Buttondown (or any POST endpoint)

A signup form appears at the bottom of every free post. Members never see it. A `sessionStorage` flag prevents re-showing once submitted in a session. The form submits email as `FormData` via `mode: 'no-cors'` (required for cross-origin embed endpoints).

**Setup with Buttondown:**
1. Create a free account at [buttondown.email](https://buttondown.email) (free up to 100 subscribers)
2. Go to **Settings → Embeds** and copy the embed subscribe URL
3. Set in `config-shani.js`:
   ```javascript
   NEWSLETTER_ACTION: 'https://buttondown.email/api/emails/embed-subscribe/yourname',
   ```

**Other compatible services:** ConvertKit (paste form action URL), Mailchimp (paste embed form action URL), any service that accepts a plain POST with an `email` field via a public URL.

Leave `NEWSLETTER_ACTION` empty to show only a success message without sending data (useful for testing).

---

### Google Search Console — sitemap submission

GitHub Pages SPA post URLs rely on the `404.html` redirect for direct access. Submitting the sitemap significantly improves Google's ability to index deep post links.

**Setup:**
1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Add property → Domain or URL prefix for `blog.shani.dev`
3. Verify ownership (DNS TXT record or HTML file upload)
4. Go to **Sitemaps** → enter `https://blog.shani.dev/sitemap.xml` → Submit

The sitemap is rebuilt automatically on every post push by the GitHub Action.

---

### Other external services you can add

| Service | What it does | How to integrate |
|---------|-------------|------------------|
| **Cloudflare** | Free CDN, DDoS protection, SSL, HTTP/3 in front of GitHub Pages | Set domain nameservers to Cloudflare; keep GitHub Pages as origin; enable "Proxied" for the CNAME |
| **Plausible Analytics** | Privacy-first, GDPR-compliant, cookie-free page analytics | Add `<script defer data-domain="blog.shani.dev" src="https://plausible.io/js/script.js"></script>` to `<head>` in both `index.html` and `404.html` |
| **Fathom Analytics** | Cookie-free, GDPR-compliant, simple dashboard | Add the Fathom `<script>` snippet to `<head>` in both HTML files |
| **Umami Analytics** | Self-hostable or cloud privacy analytics | Add the Umami `<script>` tag to both HTML files |
| **Google Analytics GA4** | Full funnel/event analytics | Add the GA4 `gtag.js` snippet to both HTML files |
| **Giscus** | GitHub Discussions-powered comments, zero cost | Add the Giscus `<script>` snippet into `script.js` after the author card render block in `renderPost()` |
| **Disqus** | Hosted comment threads | Add the Disqus universal embed code block into `renderPost()` after the author card |
| **Buy Me a Coffee** | One-time tip / donation widget | Add their floating widget `<script>` to `index.html` |
| **Ko-fi** | Donations + membership alternative | Add the Ko-fi floating button `<script>` to `index.html` |
| **ConvertKit** | Newsletter with tagging and sequences | Set `NEWSLETTER_ACTION` to your ConvertKit form action URL |
| **Mailchimp** | Newsletter with automations | Set `NEWSLETTER_ACTION` to your Mailchimp embed form `action` URL |
| **Substack** | Cross-post / import your posts | Point Substack's RSS import to `https://blog.shani.dev/feed.xml` |
| **Feedly / NewsBlur** | RSS aggregator distribution | Share `https://blog.shani.dev/feed.xml` with readers |

---

## File structure

```
blog.shani.dev/
├── index.html              ← SPA shell — post list + post view
├── 404.html                ← GitHub Pages SPA fallback — encodes path, redirects to index.html
├── admin.html              ← Browser-based post editor (GitHub API, Monaco editor)
├── script.js               ← Full engine: State / DataLoader / Renderer / Router / UI
├── utils.js                ← Shared markdown pipeline — used by script.js and admin.html
├── style.css               ← All styles (brand-independent)
├── config-shani.js         ← Brand config — THE ONLY FILE TO EDIT
├── brand-shani.css         ← CSS brand tokens (colors, fonts, radii)
├── generate-manifest.js    ← Local dev + CI helper: generates all four output files
├── .nojekyll               ← Disables Jekyll — required for .md serving
├── CNAME                   ← blog.shani.dev
├── robots.txt              ← Allows all crawlers, disallows 404.html, points to sitemap
├── sitemap.xml             ← Auto-generated by GitHub Actions + generate-manifest.js
├── feed.xml                ← RSS 2.0, auto-generated, latest 50 posts
├── manifest.json           ← PWA web app manifest, auto-generated
├── .github/
│   └── workflows/
│       └── build-manifest.yml   ← Triggers on push to main when posts/*.md changes
├── assets/
│   ├── audio/
│   ├── images/
│   └── videos/
└── posts/
    ├── manifest.json       ← Auto-generated (metadata only, no post bodies)
    └── *.md                ← Blog post files
```

---

## Author bio card

Every post renders an author bio card between the post body and the post footer. It shows an initials avatar, name, role, bio text, and social link buttons (LinkedIn, GitHub, Website). Only links that are set are rendered. The card is hidden from print.

Posts by the primary author need no extra frontmatter — the card is auto-populated from `CONFIG.AUTHOR_*` values. Guest posts override with their own `author_*` frontmatter fields.

---

## Media shortcodes

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

Standard Markdown images (`![alt](url)`) also work and auto-render with a `<figcaption>`. The `wide` modifier bleeds the image past the prose column using negative margins.

YouTube embeds use `youtube-nocookie.com` (privacy-enhanced mode). Vimeo embeds pass `dnt=1`.

---

## Table of contents

Auto-generated from `h2`/`h3` headings (minimum 2 headings required). Place `[toc]` anywhere in the post body:

```markdown
[toc]
```

Manual `## Table of Contents` / `## Contents` heading blocks are also detected and replaced automatically — no shortcode needed if you already have one.

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
> Paywalled posts are gated client-side only — the raw .md is publicly readable.

> [!IMPORTANT]
> Always set a canonical URL when cross-posting.
```

| Type        | Icon                               | Colour                        |
|-------------|------------------------------------|-------------------------------|
| `NOTE`      | `fa-solid fa-circle-info`          | Blue (`--color-callout-note`) |
| `TIP`       | `fa-solid fa-lightbulb`            | Green (`--color-success`)     |
| `WARNING`   | `fa-solid fa-triangle-exclamation` | Amber (`--color-warning`)     |
| `CAUTION`   | `fa-solid fa-fire`                 | Red (`--color-error`)         |
| `IMPORTANT` | `fa-solid fa-star`                 | Violet (`--color-secondary`)  |

---

## Tags

| Tag           | Icon                               | Use for |
|---------------|------------------------------------|---------|
| `Engineering` | `fa-solid fa-gears`                | Technical deep-dives, architecture, OS internals |
| `Release`     | `fa-solid fa-rocket`               | Changelogs, version notes, new builds |
| `Linux`       | `fa-brands fa-linux`               | Linux ecosystem, distro comparisons, kernel topics |
| `News`        | `fa-solid fa-newspaper`            | Project announcements, press, milestones |
| `DevOps`      | `fa-solid fa-gears`                | CI/CD, deployment, Btrfs, atomic tooling |
| `Incident`    | `fa-solid fa-triangle-exclamation` | Post-mortems, rollback stories |
| `Essay`       | `fa-solid fa-feather-pointed`      | Long-form opinion or narrative pieces |
| `Product`     | `fa-solid fa-box-open`             | Product announcements and feature highlights |
| `Open Source` | `fa-brands fa-osi`                 | Contributions, licensing, community |
| `Careers`     | `fa-solid fa-briefcase`            | Job posts, team growth |
| `Culture`     | `fa-solid fa-people-group`         | Team, values, ways of working |
| `Partnerships`| `fa-solid fa-handshake`            | Collaborations, integrations |
| `Platform`    | `fa-solid fa-layer-group`          | Infrastructure, platforms, cloud |
| `AWS`         | `fa-brands fa-aws`                 | Amazon Web Services content |
| `NDC`         | `fa-solid fa-plane`                | NDC / travel / conference content |

Unrecognised tags fall back to `fa-solid fa-file-lines`. Add new tags to `TAG_ICONS` in `config-shani.js`.

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl` / `Cmd` + `K` | Open search |
| `Esc` | Close search |
| `?` | Show keyboard shortcuts panel |
| `G` then `H` | Go home |
| `G` then `B` | Go to bookmarks |
| `←` / `→` | Navigate to older / newer post |
| `L` | Like current post |
| `B` | Bookmark current post |

---

## Features

- **Zero build step** — plain HTML/CSS/JS, deploy anywhere
- **Config-driven** — edit `config-shani.js` once; `applyBranding()` injects all values into the DOM on every page load: title, meta, OG/Twitter cards, JSON-LD, favicon, logo, top bar, nav links, footer links, RSS discovery link, current year
- **Metadata-only manifest** — `posts/manifest.json` contains no post bodies; bodies are fetched on demand and cached in memory for the session
- **Auto sitemap + RSS + PWA manifest** — all four output files rebuilt by the GitHub Action on every post push; also generated locally by `generate-manifest.js`
- **Zero-config local dev** — `python3 -m http.server 8080` works out of the box with directory-listing discovery
- **Localhost-aware** — GitHub Contents API never called on `localhost` / `127.0.0.1` / LAN IPs
- **History API routing** — real paths (`/`, `/post/slug`, `/bookmarks`); no hash fragments, no full reloads
- **GitHub Pages SPA** — `404.html` catches all unmatched paths; `/posts/slug` rewritten silently to `/post/slug`
- **No Jekyll interference** — `.nojekyll` ensures `.md` files are served raw
- **Admin panel** — `admin.html` is a Monaco-powered browser editor that reads and writes posts directly via the GitHub API; supports draft/preview, frontmatter forms, image upload, shortcode insertion, and a Commit & PR workflow
- **Auto tag filter** — chips generated from frontmatter; synced with `?tag=` URL param
- **Pagination** — `POSTS_PER_PAGE` per page, smart ellipsis, URL-persisted `?page=`
- **Hero section** — featured latest post + "Also reading" sidebar (`HERO_SIDEBAR_COUNT` posts); hidden during filter/search
- **No theme flash** — inline `<script>` reads `localStorage` and applies `data-theme` before CSS loads
- **Dark / light mode** — system preference default, `localStorage` persistence, Prism theme swap on toggle
- **Reading progress bar** — 2 px accent line fixed to top of viewport on post pages; reading percentage shown in browser tab title
- **Ctrl+K / Cmd+K search** — client-side; searches title, excerpt, tag, and already-cached bodies only; no fetches triggered; optional term highlighting via `SEARCH_HIGHLIGHT`; `aria-live` result count
- **Series navigation** — numbered strip on posts sharing a `series:` frontmatter key; sorted by date ascending
- **Related posts** — "Keep reading" section at the bottom of each post (same tag prioritised, then most recent)
- **Bookmarks** — bookmark icon on every card; `/bookmarks` page; "Recently Viewed" list; all in `localStorage`
- **View counter** — privacy-safe, `localStorage`-only, counted once per slug per session
- **Reading streak** — 🔥 badge in header after 2+ consecutive daily visits
- **New / Recent badges** — posts badged "New" within `NEW_POST_DAYS` days, "Recent" within `RECENT_POST_DAYS` days
- **Font size controls** — A− / A / A+ in post header (14–22 px range, 2 px steps); persisted in `localStorage`
- **Word count** — displayed beside read time in post header
- **Keyboard shortcuts panel** — `?` key; lists all shortcuts in a modal with focus trap
- **Newsletter form** — at the bottom of every free post; configurable POST endpoint; success-only mode if empty; session-persisted via `sessionStorage`
- **Prev / Next navigation** — "Older" / "Newer" buttons in post footer; keyboard `←` / `→`
- **JSON-LD** — `BlogPosting` + `BreadcrumbList` on post pages; `Blog` + `Organization` on index; updated on every navigation
- **Media shortcodes** — YouTube (privacy-enhanced), Vimeo (DNT), `<video>`, `<audio>`, image figures with optional wide bleed
- **Table of contents** — auto-generated from `h2`/`h3`; `[toc]` shortcode or auto-detected manual TOC block
- **Callout blocks** — NOTE / TIP / WARNING / CAUTION / IMPORTANT
- **Math rendering** — KaTeX inline `$...$` and display `$$...$$`; skips code blocks
- **Share button** — Web Share API with clipboard fallback + toast notification
- **Code copy buttons** — language label + copy button on every fenced code block
- **Table copy** — Copy CSV button on every Markdown table
- **Syntax highlighting** — Prism.js: Bash, YAML, JSON, JS, TS, Python, CSS, Go, HCL, Docker, Nginx, SQL
- **Author bio card** — initials avatar, name, role, bio, LinkedIn/GitHub/Website links; hidden from print
- **Like button** — heart toggle per post in `localStorage`
- **Paywall gate** — faded preview (`PAYWALL_PREVIEW_BLOCKS` blocks); adaptive height (short previews shown in full, tall ones capped at 460 px with fade mask); Lemon Squeezy license key validated browser-side; SHA-256 hash stored only
- **Ads** — AdSense mid-post (lazy-loaded) or dismissable house ad fallback; hidden for members
- **Anchor deep-link toast** — toast notification when navigating to an in-page anchor hash
- **SEO** — OG, Twitter Card, JSON-LD, canonical URLs, keywords meta — all updated on every navigation
- **Responsive** — 3-col → 2-col → 1-col grid; hamburger nav on mobile
- **Accessible** — skip link, ARIA roles, `aria-expanded`, `aria-hidden`, WCAG 2.1 AA focus rings, `aria-live` search count, `<noscript>`, `prefers-reduced-motion`
- **Print styles** — nav, footer, interactive chrome, author card hidden; paywalled content blocked with a notice
- **Back to top** — appears after `BACK_TO_TOP_OFFSET` px scroll, smooth opacity transition
- **Page load overlay** — branded full-screen loader with animated progress bar; dismissed when posts are ready
- **External links** — auto `target="_blank" rel="noopener noreferrer"`
- **Anchor headings** — slugified `id` attributes, hoverable `#` anchor, smooth in-page scroll
- **PWA** — installable; `manifest.json` auto-generated from config values; `<meta name="theme-color">` synced with current dark/light mode

---

## Theming

Brand colors are CSS custom properties in `brand-shani.css`, consumed by `style.css`. To re-theme, swap `brand-shani.css` — `style.css` is brand-independent.

**Typefaces (loaded from Google Fonts):**
- `Playfair Display` — display headings
- `DM Sans` — body text
- `IBM Plex Mono` — code

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
  --shadow-hover:       0 8px 36px rgba(22, 21, 20, 0.65);
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
  --color-accent:       #b53309;   /* deepened coral — WCAG AA 5.4:1 on all light surfaces */
  --color-accent-hover: #9a2a05;
  --color-accent-bg:    rgba(181, 51, 9, 0.09);
  --color-accent-text:  #ffffff;
  --color-secondary:    #6d28d9;
  --color-secondary-bg: rgba(109, 40, 217, 0.08);
  --shadow-hover:       0 8px 36px rgba(28, 27, 25, 0.08);
}
```

Prism.js theme (`prism-tomorrow` in dark, `prism` in light) is swapped on every theme toggle.

---

## Known limitations

**Post pages depend on `404.html` for direct URL access.** Direct navigation to `/post/slug` triggers a GitHub Pages 404, caught by `404.html` and redirected client-side. Submitting `sitemap.xml` to Google Search Console significantly improves deep-link indexing.

**Paywall is DOM-secure but not network-secure.** Gated HTML is never rendered for non-members. However, the raw `.md` file is publicly readable at its GitHub Pages URL. Do not use the paywall for genuinely sensitive content.

**Search only covers already-cached bodies.** Posts not yet opened in the session are searched by title, excerpt, and tag only. No fetches are triggered by typing — this is intentional.

**On first deploy before the Action has run**, `posts/manifest.json` doesn't exist. The engine falls back to the unauthenticated GitHub Contents API (60 req/hr). Once the Action runs once and commits the file, this fallback is never reached again.

**Newsletter is fire-and-forget.** The form POSTs with `mode: 'no-cors'`, so the response is opaque. The success message is always shown after submission. Verify actual deliveries in your newsletter provider's dashboard.

**Admin panel requires a GitHub PAT.** `admin.html` uses the GitHub Contents API and needs a Personal Access Token with `repo` scope (classic) or Contents read/write (fine-grained). The token is stored in `localStorage` — do not use `admin.html` on a shared or public device.
