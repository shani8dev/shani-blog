/**
 * config-shani.js — Brand config for blog.shani.dev
 *
 * Load this BEFORE script.js:
 *   <script src="/config-shani.js"></script>
 *   <script src="/script.js"></script>
 *
 * To switch brands, swap this file for another config-*.js.
 * Do NOT edit script.js or style.css for branding changes.
 *
 * Keys marked [script] are read by script.js at runtime.
 * Keys marked [build]  are read by generate-manifest.js at build time
 *                       (sitemap, RSS feed, PWA manifest.json).
 * Keys marked [both]   are read by both.
 */
// ═══════════════════════════════════════════════════════════════
//  CONFIG  ←  THE ONLY FILE YOU NEED TO EDIT FOR THIS BRAND
// ═══════════════════════════════════════════════════════════════
const CONFIG = {
  // ── Deployment ───────────────────────────────────────────────
  // [script] Used as fallback post-discovery via GitHub Contents API
  //          (only when posts/manifest.json is absent on first deploy).
  GITHUB_USER: 'shani8dev',
  GITHUB_REPO: 'shani-blog',
  // ── Admin panel (admin.html) ──────────────────────────────────
  // [script] Branch admin.html reads/writes posts to when committing directly.
  ADMIN_BRANCH:      'main',
  // [script] PR workflow — when enabled, "Commit & PR" pushes to a new feature
  //          branch and opens a Pull Request targeting ADMIN_DEFAULT_BRANCH.
  //          Set false to hide the button and always commit directly.
  ADMIN_PR_ENABLED:      true,
  // [script] The base (target) branch that PRs are opened against.
  //          Typically 'main' or 'production'.
  ADMIN_DEFAULT_BRANCH:  'main',
  // [script] Prefix used when auto-naming feature branches, e.g. post/my-slug.
  ADMIN_PR_BRANCH_PREFIX: 'post/',
  // [script] Repo path where uploaded images are stored.
  ADMIN_IMAGES_PATH: 'assets/images',
  // ── URLs ─────────────────────────────────────────────────────
  // [both] Canonical site root — no trailing slash.
  BLOG_URL: 'https://blog.shani.dev',
  // [script] Override the /posts directory path (e.g. a CDN URL).
  //          Leave empty to use the default '/posts' same-origin path.
  POSTS_BASE_URL: '',
  // [script] Override the GitHub Contents API URL used as fallback
  //          post discovery. Leave empty to use the default GitHub API.
  POSTS_API_URL: '',
  // ── Author / team identity ───────────────────────────────────
  // [script] Default author shown when a post has no author front-matter.
  AUTHOR_NAME:     'Shrinivas Kumbhar',
  AUTHOR_INITIALS: 'SK',
  AUTHOR_ROLE:     'Shanios · shani.dev',
  AUTHOR_BIO:      'Immutable Linux on Arch. Two OS copies, one always safe. Bad update? One reboot back. Zero telemetry. Built in India 🇮🇳',
  // ── Site identity ────────────────────────────────────────────
  // [both] Used in <title>, OG tags, JSON-LD, RSS, and PWA manifest.
  SITE_TITLE:       'Shanios Blog',
  SITE_TAGLINE:     'Engineering, Linux & Open Source',
  SITE_DESCRIPTION: "Engineering breakdowns, release notes, and stories from the team building India's immutable Linux OS.",
  // [script] Injected into <meta name="keywords">.
  SITE_KEYWORDS:    'Shanios, immutable Linux, atomic updates, rollback, open source OS, Arch Linux, Btrfs, zero telemetry, shani.dev',
  // ── Hero section ─────────────────────────────────────────────
  // [script] Eyebrow label above the hero title on the index page.
  HERO_EYEBROW: 'Shanios',
  // [script] Sub-headline shown below the hero title.
  HERO_SUB:     "Engineering breakdowns, release notes, and stories from the team building India's immutable Linux OS.",
  // [script] Number of posts shown in the hero sidebar (beside featured post).
  HERO_SIDEBAR_COUNT: 4,
  // ── Logo / favicon ───────────────────────────────────────────
  // [both] SVG used as favicon and PWA icon.
  FAVICON_URL:   'https://shani.dev/assets/images/logo.svg',
  // [script] Full logo image shown in header, footer, and loader.
  LOGO_IMG_URL:  'https://shani.dev/assets/images/about.svg',
  // [script] Alt text for the logo image.
  LOGO_ALT:      'Shanios',
  // [script] Small monospace label rendered beside the logo (e.g. 'blog').
  LOGO_WORDMARK: 'blog',
  // ── Top / auspicious bar ─────────────────────────────────────
  // [script] Thin bar above the header — brand motto, link to main site.
  AUSPICIOUS_TEXT:  '॥ श्री ॥',
  AUSPICIOUS_URL:   'https://shani.dev',
  AUSPICIOUS_LABEL: 'Visit Shanios',
  // ── Navigation ───────────────────────────────────────────────
  // [script] Header nav links. Bookmarks link is appended automatically
  //          when BOOKMARKS_ENABLED is true.
  NAV_LINKS: [
  { label: 'Home',        href: '/'                },
  { label: 'Engineering', href: '/?tag=Engineering' },
  { label: 'Release',     href: '/?tag=Release'     },
  { label: 'Linux',       href: '/?tag=Linux'       },
  { label: 'News',        href: '/?tag=News'        },
  ],
  // ── Publisher (JSON-LD structured data) ──────────────────────
  // [script] Used in BlogPosting and Organization schema.
  PUBLISHER_NAME: 'Shanios',
  PUBLISHER_URL:  'https://shani.dev',
  PUBLISHER_LOGO: 'https://shani.dev/assets/images/logo.svg',
  // ── Social / OG ──────────────────────────────────────────────
  // [script] Default OG / Twitter card image (used when post has no cover).
  OG_IMAGE: 'https://shani.dev/assets/images/logo.svg',
  // [script] Twitter/X @handle injected into <meta name="twitter:site">.
  TWITTER_HANDLE: '@shani8dev',
  // [script] Footer social link icons.
  SOCIAL_LINKS: [
  { label: 'GitHub',   icon: 'fa-brands fa-github',  url: 'https://github.com/shani8dev' },
  { label: 'LinkedIn', icon: 'fa-brands fa-linkedin', url: 'https://www.linkedin.com/in/Shrinivasvkumbhar/' },
  { label: 'Shanios',  icon: 'fa-brands fa-linux',    url: 'https://shani.dev' },
  { label: 'Wiki',     icon: 'fa-solid fa-book-open', url: 'https://wiki.shani.dev' },
  ],
  // ── Locale ───────────────────────────────────────────────────
  // [both] BCP-47 locale tag. Used in JSON-LD inLanguage, RSS <language>,
  //        and PWA manifest lang. Keep in sync with DATE_LOCALE.
  LANG: 'en-IN',
  // [both] Locale passed to Date.toLocaleDateString() for date display.
  //        Keep in sync with LANG. Examples: 'en-IN', 'en-US', 'de-DE'.
  DATE_LOCALE: 'en-IN',
  // ── Tag icons (Font Awesome class strings) ────────────────────
  // [script] Maps post tag names to FA icon class strings.
  //          Falls back to the Post icon for any unrecognised tag.
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
  Post:          'fa-solid fa-file-lines',
  },
  // ── Pagination ───────────────────────────────────────────────
  // [script] Posts shown per page on the index grid.
  POSTS_PER_PAGE: 9,
  // ── Storage ──────────────────────────────────────────────────
  // [script] Prefix for all localStorage / sessionStorage keys.
  //          Change when running two blogs on the same origin so they
  //          don't share theme, membership, bookmark, or like state.
  STORAGE_PREFIX: 'shani',
  // ── Membership / Paywall ──────────────────────────────────────
  // [script] Enables the paywall gate on posts marked paywalled: true.
  //
  //   MEMBERSHIP_KEYS_URL — public URL to the data/keys.json file served via
  //     jsDelivr CDN. Keys are validated client-side: no server, no Worker.
  //     The GitHub Action (issue-license-key.yml) appends new keys on purchase.
  //     Format: 'https://cdn.jsdelivr.net/gh/USER/REPO@main/data/keys.json'
  //
  //   RAZORPAY_KEY_ID — your live Razorpay key ID (public, safe to commit).
  //     Find it in: Razorpay Dashboard → Settings → API Keys.
  //     Leave empty to hide the Razorpay button (membership page will show a
  //     "contact us" message instead).
  //
  //   RAZORPAY_AMOUNT — amount in paise (₹199 = 19900).
  //
  //   MEMBERSHIP_URL — link used in the paywall gate inside posts.
  //     Should point to /membership so readers stay on-site and hit Razorpay.
  //
  //   NOTE: Never put secret API keys in this file — it is a public repo.
  MEMBERSHIP_KEYS_URL: 'https://cdn.jsdelivr.net/gh/shani8dev/shani-blog@main/data/keys.json',
  RAZORPAY_KEY_ID:     'rzp_live_XXXXXXXXXXXXXXXX', // ← replace with your live Razorpay key ID
  RAZORPAY_AMOUNT:     19900,   // paise — 19900 = ₹199
  MEMBERSHIP_URL:      '/membership',
  MEMBERSHIP_PRICE:    '₹199 / year',
  // ── Membership UI Copy (Centralized) ─────────────────────────
  MEMBERSHIP_HEADING: 'Shanios Members',
  MEMBERSHIP_DESCRIPTION: "Engineering deep-dives, release notes & more — unlock full access for ₹199/year.",
  MEMBERSHIP_CTA: 'Become a Member',
  // ── Paywall copy ─────────────────────────────────────────────
  // [script] Text shown on the paywall gate inside a members-only post.
  PAYWALL_HEADING:         'Members only',
  PAYWALL_DESCRIPTION:     "This post is for members. Purchase a membership to unlock all gated posts.",
  PAYWALL_KEY_LABEL:       'Already a member? Enter your license key:',
  PAYWALL_KEY_PLACEHOLDER: 'XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX',
  // [script] Number of content blocks shown as a free preview before the gate.
  PAYWALL_PREVIEW_BLOCKS: 12,
  // ── Monetization — Google AdSense ────────────────────────────
  // [script] Set BOTH ADSENSE_CLIENT and ADSENSE_SLOT to inject an AdSense
  //          unit mid-post on free posts.
  //          Leave ADSENSE_SLOT empty to fall back to the house ad instead.
  //          NOTE: client ID is public (it's in your page HTML already).
  ADSENSE_CLIENT: 'ca-pub-8268043375450773',
  ADSENSE_SLOT:   '8074583713',
  // ── House ad ─────────────────────────────────────────────────
  // [script] Shown mid-post on free posts when AdSense is not configured.
  //          Dismissed per-session. Set HOUSE_AD_ENABLED: false to hide.
  HOUSE_AD_ENABLED: true,
  HOUSE_AD_TEXT:    'Get full access to all member posts — engineering deep-dives, release notes & more.',
  HOUSE_AD_CTA:     'Become a Member →',
  // ── Newsletter ────────────────────────────────────────────────
  // [script] Shown at the bottom of every free post.
  //          Set NEWSLETTER_ACTION to a POST endpoint (e.g. Buttondown embed URL).
  //          Leave empty to show a success state without sending data.
  NEWSLETTER_ENABLED:     true,
  NEWSLETTER_HEADLINE:    'Stay in the loop',
  NEWSLETTER_DESCRIPTION: "Get engineering breakdowns, release notes and open-source stories from the Shanios team — no spam, unsubscribe anytime.",
  NEWSLETTER_PLACEHOLDER: 'you@example.com',
  NEWSLETTER_CTA:         'Subscribe',
  NEWSLETTER_ACTION:      '', // e.g. 'https://buttondown.email/api/emails/embed-subscribe/shani8dev'
  NEWSLETTER_SUCCESS:     "🎉 You're subscribed! Check your inbox to confirm.",
  // ── RSS ───────────────────────────────────────────────────────
  // [script] Injects <link rel="alternate" type="application/rss+xml"> in <head>.
  RSS_ENABLED: true,
  RSS_URL:     '/feed.xml',
  // ── Series ───────────────────────────────────────────────────
  // [script] Shows a series navigation strip on posts that share a
  //          `series:` front-matter key.
  SERIES_ENABLED: true,
  // ── Related posts ─────────────────────────────────────────────
  // [script] Posts shown at the bottom of each post (same tag first,
  //          then most recent). Set to 0 to disable.
  RELATED_POSTS_COUNT: 3,
  // ── Bookmarks ─────────────────────────────────────────────────
  // [script] Enables bookmark icons on cards and a /bookmarks page.
  BOOKMARKS_ENABLED: true,
  // [script] Number of recently viewed posts shown on the bookmarks page.
  //          Set to 0 to disable the section.
  RECENTLY_VIEWED_COUNT: 5,
  // ── View counter ──────────────────────────────────────────────
  // [script] Privacy-safe, localStorage-only view count on cards and
  //          in the post header. Set false to hide everywhere.
  VIEW_COUNT_ENABLED: true,
  // ── Reading streak ────────────────────────────────────────────
  // [script] Tracks consecutive daily visits and shows a 🔥 badge in
  //          the header after 2+ days in a row.
  STREAK_ENABLED: true,
  // ── Reading speed & word count ────────────────────────────────
  // [script] Words per minute used to compute estimated read time.
  //          Average adult: 200–250. Technical readers: 150–180.
  WORDS_PER_MINUTE: 200,
  // [script] Displays word count alongside read time in the post header.
  SHOW_WORD_COUNT: true,
  // ── Post cards ────────────────────────────────────────────────
  // [script] Show read-time on index grid cards.
  CARD_SHOW_READ_TIME: true,
  // [script] Highlight search query terms in card titles and excerpts.
  SEARCH_HIGHLIGHT: true,
  // [script] Days before today a post is badged "New". Set 0 to disable.
  NEW_POST_DAYS: 7,
  // [script] Days before today a post is badged "Recent".
  RECENT_POST_DAYS: 30,
  // ── Post reader ───────────────────────────────────────────────
  // [script] A− / A / A+ font-size buttons in the post header.
  FONT_SIZE_CONTROLS: true,
  // [script] Keyboard shortcut panel opened with the ? key.
  KEYBOARD_SHORTCUTS_ENABLED: true,
  // ── Excerpts ──────────────────────────────────────────────────
  // [script] Max characters for auto-generated excerpts (from post body).
  //          Only applies when no `excerpt:` field is in the front-matter.
  EXCERPT_MAX_CHARS: 140,
  // ── UI timings ────────────────────────────────────────────────
  // [script] How long toast notifications stay visible (ms).
  TOAST_DURATION: 2500,
  // [script] Scroll depth in px before the back-to-top button appears.
  BACK_TO_TOP_OFFSET: 400,
  // ── PWA (Progressive Web App) ─────────────────────────────────
  // [build] Written into manifest.json by generate-manifest.js.
  //         PWA_THEME_COLOR / PWA_BG_COLOR should match --color-bg in
  //         brand-shani.css (dark mode value).
  PWA_NAME:        'Shanios Blog',
  PWA_SHORT_NAME:  'Shanios',
  PWA_DESCRIPTION: "Engineering breakdowns and release notes from the Shanios team.",
  PWA_THEME_COLOR: '#161514',
  PWA_BG_COLOR:    '#161514',
  // ── Cloudflare Web Analytics ──────────────────────────────────
  // [script] Set to your Cloudflare Web Analytics token to inject the
  //          privacy-safe, cookie-free beacon automatically on every page.
  //          Find it in: CF Dashboard → Web Analytics → your site.
  //          This token is public (it's in your page HTML already — same as
  //          Google Analytics measurement IDs). Safe to commit.
  //          Leave empty to disable.
  CF_WEB_ANALYTICS_TOKEN: '',
  // ── Giscus (GitHub Discussions comments) ──────────────────────
  // [script] Renders a comment section at the bottom of each post.
  //          Setup: enable Discussions on your GitHub repo, install
  //          the Giscus app at https://giscus.app, then paste the
  //          generated IDs below.
  //          Leave GISCUS_REPO empty to disable comments entirely.
  GISCUS_ENABLED:     true,
  GISCUS_REPO:        'shani8dev/shani-blog',           // e.g. 'shani8dev/shani-blog'
  GISCUS_REPO_ID:     'R_kgDOR_FEJA',           // e.g. 'R_kgDO...'
  GISCUS_CATEGORY:    'General',    // Discussion category name
  GISCUS_CATEGORY_ID: 'DIC_kwDOR_FEJM4C6sMw',           // e.g. 'DIC_kwDO...'
  // 'pathname' | 'url' | 'title' — maps each post to a Discussion thread
  GISCUS_MAPPING:     'pathname',
  // 'light' | 'dark' | 'preferred_color_scheme' | 'transparent_dark'
  // Set 'preferred_color_scheme' to auto-follow the reader's OS theme,
  // or leave as '' to auto-sync with the blog's own dark/light toggle.
  GISCUS_THEME:       '',
  // ── Fuse.js fuzzy search ───────────────────────────────────────
  // [script] Replaces the built-in indexOf search with Fuse.js fuzzy
  //          matching — handles typos and partial matches automatically.
  //          Fuse.js is loaded from jsDelivr (already on your CDN allowlist)
  //          only when the search bar is first opened, so it costs nothing
  //          on page load.
  //          Set false to keep the existing simple search.
  FUZZY_SEARCH_ENABLED: true,
  // ── Sitemap static URLs ───────────────────────────────────────
  // [build] Written into sitemap.xml by generate-manifest.js alongside
  //         all post URLs. Keep in sync with NAV_LINKS.
  // changefreq: 'always'|'hourly'|'daily'|'weekly'|'monthly'|'yearly'|'never'
  SITEMAP_STATIC_URLS: [
  { path: '/',                 priority: '1.0', changefreq: 'weekly' },
  { path: '/?tag=Engineering', priority: '0.6', changefreq: 'weekly' },
  { path: '/?tag=Release',     priority: '0.6', changefreq: 'weekly' },
  { path: '/?tag=Linux',       priority: '0.6', changefreq: 'weekly' },
  { path: '/?tag=News',        priority: '0.6', changefreq: 'weekly' },
  ],
};
