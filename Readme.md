# blog.shani.dev

The official Shanios Blog — a lightweight, config-driven SPA covering technology, product releases, and company news. No build step. No framework. Just HTML, CSS, and one JavaScript file.

Live at → **[blog.shani.dev](https://blog.shani.dev)**

---

## What this is

One page. One config object. Drop a Markdown file, register it in a JSON array, and it appears on the site — with a card on the grid, a tag filter chip, and a fully rendered post page. Dark mode, reading progress, search, and share all work out of the box.

The blogs is a hash-routed SPA: `index.html` handles both the post list (`#/`) and individual posts (`#/post/slug`). There is no separate post template file.

---

## Getting started

### 1. Configure `script.js`

Open `script.js` and edit the `CONFIG` block at the top:

```javascript
const CONFIG = {
  // GitHub Pages deployment — leave empty for local dev
  GITHUB_USER: '',
  GITHUB_REPO: '',

  // Author / team identity
  AUTHOR_NAME:     'Shani Team',
  AUTHOR_INITIALS: 'VT',
  AUTHOR_ROLE:     'Shanios',
  AUTHOR_BIO:      'Shanios is an IATA-certified NDC aggregator connecting 23,000+ travel agents to 40+ global airlines.',

  // Site copy
  SITE_TITLE:   'Shanios Blog',
  HERO_EYEBROW: 'Shanios',
  HERO_SUB:     'News, product releases, engineering deep-dives, and perspectives from the team behind Shanios.',

  // Footer + social links
  SOCIAL_LINKS: [
    { label: 'GitHub',   icon: 'fa-brands fa-github',  url: 'https://github.com/shani8dev' },
    { label: 'LinkedIn', icon: 'fa-brands fa-linkedin', url: 'https://www.linkedin.com/in/Shrinivasvkumbhar/' },
    { label: 'Shanios',  icon: 'fa-solid fa-plane',     url: 'https://shani.dev' },
    { label: 'Blog',     icon: 'fa-solid fa-globe',     url: 'https://blog.shani.dev' },
  ],
};
```

### 2. Write a post

Create a `.md` file in `posts/` with a frontmatter block at the top:

```markdown
---
title: 'My Post Title'
date: '2026-04-09'
tag: 'NDC'
excerpt: 'One sentence that appears on the card and in search results.'
readTime: '6 min'
---

Content starts here. Full **Markdown** supported.
```

**Frontmatter reference:**

| Field          | Required | Notes                                                        |
|----------------|----------|--------------------------------------------------------------|
| `title`        | Yes      | Shown on card, post header, and browser tab                  |
| `date`         | Yes      | ISO format `YYYY-MM-DD` — used for sort order                |
| `tag`          | No       | Creates a filter chip automatically                          |
| `excerpt`      | No       | Falls back to first ~140 chars of body                       |
| `readTime`     | No       | Auto-calculated from word count if omitted                   |
| `author`       | No       | Overrides `CONFIG.AUTHOR_NAME` for this post                 |
| `author_role`  | No       | Overrides `CONFIG.AUTHOR_ROLE` for this post                 |
| `author_bio`   | No       | Overrides `CONFIG.AUTHOR_BIO` for this post                  |
| `paywalled`    | No       | `true` to show a members gate (localStorage unlock)          |
| `cover`        | No       | URL to a cover image — used as `og:image` for social shares  |

### 3. Register it in `posts/index.json`

```json
[
  "my-new-post.md",
  "ndc-deep-dive.md",
  "airline-distribution-explained.md"
]
```

Newest first — the first entry becomes the featured hero post.

The JSON array can also hold **metadata objects** instead of filenames (fast path — no per-post fetch on load):

```json
[
  {
    "slug": "ndc-deep-dive",
    "title": "A Deep Dive into NDC",
    "date": "2026-04-09",
    "tag": "NDC",
    "excerpt": "What NDC actually is, and why it matters.",
    "readTime": "8 min"
  }
]
```

When objects are used, post bodies are still fetched on demand from `posts/<slug>.md`.

> **Why a manifest?**
> Browsers cannot list directory contents, and GitHub Pages does not return directory listings. The JSON array is a simple, zero-dependency solution. When `GITHUB_USER` is set in CONFIG, the GitHub Contents API is used instead and `index.json` is ignored.

### 4. Run locally

Any static server works:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Open `http://localhost:8080`. Do **not** open `index.html` as a `file://` URL — the blogs will error because browsers block cross-origin file fetches.

---

## Deployment

The blogs is deployed via **GitHub Pages** with a custom domain.

- **CNAME** → `blog.shani.dev`
- **robots.txt** → allows all crawlers, points to sitemap
- **sitemap.xml** → covers homepage + all tag filter URLs

To deploy after changes: push to `main`. GitHub Pages rebuilds automatically.

If using the GitHub Contents API (set `GITHUB_USER` + `GITHUB_REPO` in CONFIG), `posts/index.json` is not needed — the API lists the `posts/` directory directly.

---

## File structure

```
blog.shani.dev/
├── index.html              ← Single-page app shell
├── script.js               ← All logic + CONFIG  ← edit this
├── style.css               ← All styles (CSS variables for theming)
├── CNAME                   ← blog.shani.dev
├── robots.txt
├── sitemap.xml
├── Readme.md
├── posts/
│   ├── index.json          ← ["newest.md", "older.md"]  or metadata objects
│   └── *.md                ← blogs post files
└── assets/
    ├── images/             ← post images and OG covers
    ├── videos/             ← self-hosted video files (.mp4, .webm)
    └── audio/              ← self-hosted audio files (.mp3)
```

Reference assets from posts using relative paths or shortcodes (see below). Images placed in `assets/images/` are referenced as `../assets/images/filename.jpg` from inside `posts/`.

---

## Media shortcodes

Posts support rich media via shortcodes — written inline in Markdown, processed before the parser runs so they survive DOMPurify sanitisation.

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

Standard Markdown images (`![alt](url)`) also work and render with a `<figcaption>` automatically.

---

## Tags

Use consistent tags so the filter bar stays clean. The nav exposes: **Product**, **Engineering**, **Platform**, **News**.

| Tag            | Use for                                                       |
|----------------|---------------------------------------------------------------|
| `Product`      | Feature launches, product updates, roadmap items              |
| `Engineering`  | Technical deep-dives, architecture, infrastructure            |
| `Platform`     | Internal tooling, abstractions, developer experience          |
| `News`         | Company announcements, press, milestones                      |
| `NDC`          | NDC standard, airline distribution, IATA topics               |
| `Partnerships` | Airline or agency partner announcements                       |
| `Careers`      | Job openings, team growth, culture                            |
| `Release`      | Changelogs, version notes                                     |

Tag icons are defined in the `TAG_ICONS` map at the top of `script.js`. Add an entry there to give a new tag its own Font Awesome icon.

---

## Callout blocks

Use GitHub-style callout syntax inside blockquotes:

```markdown
> [!NOTE]
> NDC Level 4 certification is required for full offer and order capability.

> [!TIP]
> Use the metadata fast-path in index.json to avoid parallel fetches on load.

> [!WARNING]
> Do not open index.html via file:// — cross-origin fetches will fail.

> [!CAUTION]
> Paywalled posts are gated client-side only — not a security boundary.

> [!IMPORTANT]
> Always set a canonical URL when cross-posting.
```

Supported types: `NOTE`, `TIP`, `WARNING`, `CAUTION`, `IMPORTANT`.

---

## Features

- **Zero build step** — plain HTML/CSS/JS, deploy anywhere
- **Config-driven** — change `CONFIG` once, everything updates
- **Hash-routed SPA** — `#/` for the list, `#/post/slug` for articles; no page reloads
- **Two index modes** — filename array (slow path, fetches all) or metadata objects (fast path, on-demand bodies)
- **Auto tag filter** — chips generated from post frontmatter; active state synced with nav
- **Pagination** — 9 posts per page, smart ellipsis, URL-persisted page number
- **No theme flash** — inline script sets `data-theme` before CSS paints; system preference detected before first render
- **Dark / light mode** — follows system preference, persists via localStorage, Prism theme swaps too
- **Reading progress bar** — thin accent line at the top of post pages
- **Ctrl+K / Cmd+K search** — client-side; searches title, excerpt, tag, and cached post bodies; result count announced to screen readers
- **Prev / Next navigation** — post footer shows adjacent posts by date; falls back to "Browse all" at list ends
- **Per-post OG image** — set `cover` in frontmatter to use a custom `og:image` and `twitter:image` per post
- **Media shortcodes** — YouTube, Vimeo, `<video>`, `<audio>`, image figures; processed before DOMPurify
- **Callout blocks** — NOTE / TIP / WARNING / CAUTION / IMPORTANT styled alerts
- **Math rendering** — KaTeX for inline `$...$` and display `$$...$$` LaTeX
- **Share button** — Web Share API with clipboard fallback + toast notification
- **Code copy buttons** — language label + copy button on every code block
- **Table copy** — Copy CSV button on every table
- **Syntax highlighting** — Prism.js (JS, TS, Bash, JSON, YAML, CSS, Python, Go, SQL, HCL, Docker, Nginx)
- **Per-post author override** — `author`, `author_role`, `author_bio` in frontmatter
- **Like button** — heart toggle persisted per-post in localStorage
- **Paywall gate** — soft paywall, localStorage unlock, first 3 blocks visible as preview
- **SEO-ready** — Open Graph, Twitter Card, JSON-LD (`blogsPosting` + `BreadcrumbList`), canonical URLs, sitemap with `lastmod`
- **Responsive** — 3-column grid → 2-column → single column
- **Accessible** — skip link, ARIA roles, focus rings (WCAG 2.1 AA), live search region, `<noscript>` fallback
- **Print styles** — chrome hidden, clean article output
- **Back to top** — smooth opacity/visibility transition, no layout shift

---

## Theming

All colours and type settings are CSS custom properties in `style.css`. The palette is Shanios's brand green on a dark charcoal base:

```css
:root {
  --color-bg:          #161514;   /* page background (warm charcoal) */
  --color-text:        #f5f4f2;   /* body text                        */
  --color-accent:      #ff7f50;   /* coral — links, chips, accents    */
  --color-secondary:   #7c3aed;   /* violet — reading progress bar    */
  --color-text-muted:  #b0aaa4;   /* secondary / muted text           */

  --font-display: 'Playfair Display', Georgia, serif;   /* headings  */
  --font-sans:    'DM Sans', system-ui, sans-serif;     /* UI, body  */
  --font-mono:    'IBM Plex Mono', Consolas, monospace; /* code, meta */
}
```

Light mode overrides are defined in `html[data-theme="light"]` in `style.css`. Code blocks always use a fixed dark background regardless of theme — Prism's theme link is swapped dynamically by `UI.initTheme()`.

---

## Known limitations

**Post pages are not individually indexable by search engines.** The blogs uses hash-based routing (`#/post/slug`), which Google does not crawl as separate URLs — only the root `https://blog.shani.dev/` is indexed. Post content relies on social sharing and direct links for discovery rather than organic search. If SEO per-post matters, the architecture would need to move to a prerendered or SSR approach (e.g. a GitHub Action that prerenders each post to a static HTML file).

**Paywall is client-side only.** The members gate prevents casual reading but is not a security boundary — the full post body is fetched and stored in `AppState.postsCache`. Do not use it for genuinely sensitive content.

**Search only covers cached bodies.** Full-text body search works for posts that have been opened in the current session (bodies are cached on first visit). Posts not yet opened are searched by title, excerpt, and tag only. There are no extra fetches on search.
