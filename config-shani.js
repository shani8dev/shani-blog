/**
 * Brand config for blog.shani.dev
 * Load this BEFORE script.js:
 *   <script src="/config-shani.js"></script>
 *   <script src="/script.js"></script>
 */

// ═══════════════════════════════════════════════════════════════
//  CONFIG  ←  THE ONLY FILE YOU NEED TO EDIT FOR THIS BRAND
// ═══════════════════════════════════════════════════════════════
const CONFIG = {
  // ── GitHub Pages deployment ─────────────────────────────────
  GITHUB_USER: 'shani8dev',
  GITHUB_REPO: 'shani-blog',

  // ── Production blog URL (no trailing slash) ──────────────────
  BLOG_URL: 'https://blog.shani.dev',

  // ── Author / team identity ───────────────────────────────────
  AUTHOR_NAME:     'Shrinivas Kumbhar',
  AUTHOR_INITIALS: 'SK',
  AUTHOR_ROLE:     'Shanios · shani.dev',
  AUTHOR_BIO:      'Immutable Linux on Arch. Two OS copies, one always safe. Bad update? One reboot back. Zero telemetry. Built in India 🇮🇳',

  // ── Site copy ────────────────────────────────────────────────
  SITE_TITLE:       'Shanios Blog',
  SITE_TAGLINE:     'Engineering, Linux & Open Source',
  SITE_DESCRIPTION: "Engineering breakdowns, release notes, and stories from the team building India's immutable Linux OS.",
  HERO_EYEBROW:     'Shanios',
  HERO_SUB:         "Engineering breakdowns, release notes, and stories from the team building India's immutable Linux OS.",

  // ── Top / auspicious bar text ────────────────────────────────
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
  // 1. Lemon Squeezy paywall
  //    LEMONSQUEEZY_STORE:   your store slug (e.g. https://shani8dev.lemonsqueezy.com → "shani8dev")
  //    LEMONSQUEEZY_PRODUCT: numeric product ID from LS dashboard
  LEMONSQUEEZY_STORE:   'shani8dev',
  LEMONSQUEEZY_PRODUCT: '',                            // ← e.g. '123456'
  MEMBERSHIP_URL:       'https://shani8dev.lemonsqueezy.com',
  MEMBERSHIP_PRICE:     '₹199 / year',

  // 2. Google AdSense
  ADSENSE_CLIENT: '',                                  // ← e.g. 'ca-pub-1234567890123456'
  ADSENSE_SLOT:   '',                                  // ← Ad unit slot ID

  // 3. House ad (shown while AdSense is pending approval)
  HOUSE_AD_ENABLED: true,
  HOUSE_AD_TEXT:    'Get full access to all member posts — engineering deep-dives, release notes & more.',
  HOUSE_AD_CTA:     'Become a Member →',

  // ── Footer + social links ────────────────────────────────────
  SOCIAL_LINKS: [
    { label: 'GitHub',   icon: 'fa-brands fa-github',   url: 'https://github.com/shani8dev' },
    { label: 'LinkedIn', icon: 'fa-brands fa-linkedin',  url: 'https://www.linkedin.com/in/Shrinivasvkumbhar/' },
    { label: 'Shanios',  icon: 'fa-brands fa-linux',     url: 'https://shani.dev' },
    { label: 'Wiki',     icon: 'fa-solid fa-book-open',  url: 'https://wiki.shani.dev' },
  ],
};
