/**
 * config-shani.js — Brand config for blog.shani.dev
 *
 * Load this BEFORE script.js:
 *   <script src="/config-shani.js"></script>
 *   <script src="/script.js"></script>
 *
 * To switch brands, swap this file for another config-*.js.
 * Do NOT edit script.js or style.css for branding changes.
 */

// ═══════════════════════════════════════════════════════════════
//  CONFIG  ←  THE ONLY FILE YOU NEED TO EDIT FOR THIS BRAND
// ═══════════════════════════════════════════════════════════════
const CONFIG = {

  // ── GitHub Pages deployment ──────────────────────────────────
  GITHUB_USER: 'shani8dev',
  GITHUB_REPO: 'shani-blog',

  // ── Production blog URL (no trailing slash) ──────────────────
  BLOG_URL: 'https://blog.shani.dev',

  // ── Post storage ─────────────────────────────────────────────
  POSTS_BASE_URL: '',
  POSTS_API_URL:  '',

  // ── Author / team identity ───────────────────────────────────
  AUTHOR_NAME:     'Shrinivas Kumbhar',
  AUTHOR_INITIALS: 'SK',
  AUTHOR_ROLE:     'Shanios · shani.dev',
  AUTHOR_BIO:      'Immutable Linux on Arch. Two OS copies, one always safe. Bad update? One reboot back. Zero telemetry. Built in India 🇮🇳',

  // ── Site copy ────────────────────────────────────────────────
  SITE_TITLE:       'Shanios Blog',
  SITE_TAGLINE:     'Engineering, Linux & Open Source',
  SITE_DESCRIPTION: "Engineering breakdowns, release notes, and stories from the team building India's immutable Linux OS.",
  SITE_KEYWORDS:    'Shanios, immutable Linux, atomic updates, rollback, open source OS, Arch Linux, Btrfs, zero telemetry, shani.dev',
  HERO_EYEBROW:     'Shanios',
  HERO_SUB:         "Engineering breakdowns, release notes, and stories from the team building India's immutable Linux OS.",

  // ── Wordmark text shown next to the logo image ───────────────
  // The small monospace label rendered next to the logo in header/footer/loader.
  LOGO_WORDMARK: 'blog',

  // ── Locale for date formatting ───────────────────────────────
  // Used in Utils.fmtDate / Utils.fmtDateShort.
  DATE_LOCALE: 'en-IN',

  // ── Posts per page ────────────────────────────────────────────
  POSTS_PER_PAGE: 9,

  // ── localStorage / sessionStorage key prefix ─────────────────
  // Change this when running two blogs on the same origin to prevent
  // them sharing theme, membership, like, and bookmark state.
  STORAGE_PREFIX: 'shani',

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
    Post:          'fa-solid fa-file-lines',
  },

  // ── Paywall copy ──────────────────────────────────────────────
  PAYWALL_HEADING:         'Members only',
  PAYWALL_DESCRIPTION:     "This post is for members. Purchase a membership to unlock all gated posts — you'll receive a license key instantly.",
  PAYWALL_KEY_LABEL:       'Already a member? Enter your license key:',
  PAYWALL_KEY_PLACEHOLDER: 'XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX',

  // ── Navigation links ─────────────────────────────────────────
  NAV_LINKS: [
    { label: 'Home',        href: '/'              },
    { label: 'Engineering', href: '/?tag=Engineering' },
    { label: 'Release',     href: '/?tag=Release'     },
    { label: 'Linux',       href: '/?tag=Linux'       },
    { label: 'News',        href: '/?tag=News'        },
  ],

  // ── Top / auspicious bar ─────────────────────────────────────
  AUSPICIOUS_TEXT:  '॥ श्री ॥',
  AUSPICIOUS_URL:   'https://shani.dev',
  AUSPICIOUS_LABEL: 'Visit Shanios',

  // ── Logo / favicon ───────────────────────────────────────────
  LOGO_IMG_URL: 'https://shani.dev/assets/images/about.svg',
  LOGO_ALT:     'Shanios',
  FAVICON_URL:  'https://shani.dev/assets/images/logo.svg',

  // ── Publisher (for JSON-LD structured data) ──────────────────
  PUBLISHER_NAME: 'Shanios',
  PUBLISHER_URL:  'https://shani.dev',
  PUBLISHER_LOGO: 'https://shani.dev/assets/images/logo.svg',

  // ── Default OG image (used when post has no cover) ───────────
  OG_IMAGE: 'https://shani.dev/assets/images/logo.svg',

  // ── Twitter / X handle ───────────────────────────────────────
  TWITTER_HANDLE: '@shani8dev',

  // ── Monetization ─────────────────────────────────────────────
  LEMONSQUEEZY_STORE:   'shani8dev',
  LEMONSQUEEZY_PRODUCT: '',
  MEMBERSHIP_URL:       'https://shani8dev.lemonsqueezy.com',
  MEMBERSHIP_PRICE:     '₹199 / year',

  // ── Google AdSense ────────────────────────────────────────────
  ADSENSE_CLIENT: '',
  ADSENSE_SLOT:   '',

  // ── House ad ─────────────────────────────────────────────────
  HOUSE_AD_ENABLED: true,
  HOUSE_AD_TEXT:    'Get full access to all member posts — engineering deep-dives, release notes & more.',
  HOUSE_AD_CTA:     'Become a Member →',

  // ── Related posts ─────────────────────────────────────────────
  // Number of related posts shown at the bottom of each post (same tag first).
  // Set to 0 to disable.
  RELATED_POSTS_COUNT: 3,

  // ── Read-time on cards ────────────────────────────────────────
  CARD_SHOW_READ_TIME: true,

  // ── Bookmarks ─────────────────────────────────────────────────
  BOOKMARKS_ENABLED: true,

  // ── Newsletter ────────────────────────────────────────────────
  NEWSLETTER_ENABLED:     true,
  NEWSLETTER_HEADLINE:    'Stay in the loop',
  NEWSLETTER_DESCRIPTION: "Get engineering breakdowns, release notes and open-source stories from the Shanios team — no spam, unsubscribe anytime.",
  NEWSLETTER_PLACEHOLDER: 'you@example.com',
  NEWSLETTER_CTA:         'Subscribe',
  NEWSLETTER_ACTION:      '', // e.g. 'https://buttondown.email/api/emails/embed-subscribe/shani8dev'
  NEWSLETTER_SUCCESS:     "🎉 You're subscribed! Check your inbox to confirm.",

  // ── Series / multi-part posts ─────────────────────────────────
  SERIES_ENABLED: true,

  // ── RSS feed link in <head> ────────────────────────────────────
  RSS_ENABLED: true,
  RSS_URL:     '/feed.xml',

  // ── View count (privacy-safe, localStorage only) ────────────────
  VIEW_COUNT_ENABLED: true,

  // ── Word count in post header ─────────────────────────────────
  SHOW_WORD_COUNT: true,

  // ── Reading streak — consecutive-day visit tracker ────────────
  STREAK_ENABLED: true,

  // ── Keyboard shortcuts (? to open panel) ─────────────────────
  KEYBOARD_SHORTCUTS_ENABLED: true,

  // ── Language / locale ────────────────────────────────────────
  // Used in JSON-LD structured data (inLanguage) and date formatting.
  // Examples: 'en-IN', 'en-US', 'de-DE', 'fr-FR'
  LANG: 'en-IN',

  // ── Reading speed (words per minute) ─────────────────────────
  // Average adult: 200–250. Technical readers: 150–180.
  WORDS_PER_MINUTE: 200,

  // ── Excerpt truncation length (characters) ───────────────────
  EXCERPT_MAX_CHARS: 140,

  // ── Hero sidebar: number of posts shown beside the featured ──
  HERO_SIDEBAR_COUNT: 4,

  // ── Paywall: free preview paragraph block count ───────────────
  PAYWALL_PREVIEW_BLOCKS: 12,

  // ── Back-to-top button: scroll offset trigger (px) ───────────
  BACK_TO_TOP_OFFSET: 400,

  // ── Toast notification duration (ms) ─────────────────────────
  TOAST_DURATION: 2500,

  // ── "New" badge: posts newer than this many days get a badge ─
  // Set to 0 to disable freshness badges entirely.
  NEW_POST_DAYS: 7,
  RECENT_POST_DAYS: 30,

  // ── Font size controls in post reader ─────────────────────────
  // Adds A- / A+ buttons in post header. Set false to disable.
  FONT_SIZE_CONTROLS: true,

  // ── Search result highlighting ────────────────────────────────
  // Wraps matched query terms in <mark> on cards. Set false to disable.
  SEARCH_HIGHLIGHT: true,

  // ── Recently viewed posts ─────────────────────────────────────
  // Shown in the Bookmarks view. Set to 0 to disable.
  RECENTLY_VIEWED_COUNT: 5,

  // ── Copy as Markdown link ─────────────────────────────────────
  // Adds "Copy MD link" button in post footer. Set false to disable.
  COPY_MD_LINK: true,

  // ── Sitemap static pages (injected alongside post URLs) ───────
  // Each entry becomes a <url> block in sitemap.xml and feed.xml.
  // changefreq: 'always'|'hourly'|'daily'|'weekly'|'monthly'|'yearly'|'never'
  SITEMAP_STATIC_URLS: [
    { path: '/',                priority: '1.0', changefreq: 'weekly'  },
    { path: '/?tag=Engineering', priority: '0.6', changefreq: 'weekly'  },
    { path: '/?tag=Release',     priority: '0.6', changefreq: 'weekly'  },
    { path: '/?tag=Linux',       priority: '0.6', changefreq: 'weekly'  },
    { path: '/?tag=News',        priority: '0.6', changefreq: 'weekly'  },
  ],

  // ── PWA (Progressive Web App) metadata ───────────────────────
  PWA_NAME:        'Shanios Blog',
  PWA_SHORT_NAME:  'Shanios',
  PWA_DESCRIPTION: "Engineering breakdowns and release notes from the Shanios team.",
  PWA_THEME_COLOR: '#161514',
  PWA_BG_COLOR:    '#161514',

  // ── Footer + social links ────────────────────────────────────
  SOCIAL_LINKS: [
    { label: 'GitHub',   icon: 'fa-brands fa-github',  url: 'https://github.com/shani8dev' },
    { label: 'LinkedIn', icon: 'fa-brands fa-linkedin', url: 'https://www.linkedin.com/in/Shrinivasvkumbhar/' },
    { label: 'Shanios',  icon: 'fa-brands fa-linux',    url: 'https://shani.dev' },
    { label: 'Wiki',     icon: 'fa-solid fa-book-open', url: 'https://wiki.shani.dev' },
  ],
};
