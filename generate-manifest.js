#!/usr/bin/env node
/**
 * generate-manifest.js
 * ────────────────────────────────────────────────────────────────
 * Local-dev helper: generates posts/manifest.json from all .md
 * files in the posts/ directory — same output as the GitHub
 * Actions workflow (build-manifest.yml) but runs on your machine.
 *
 * Usage:
 *   node generate-manifest.js
 *   node generate-manifest.js --watch     # re-run on every .md save
 *
 * Then start a local server:
 *   python3 -m http.server 8080
 *   # or: npx serve .
 *   # or: npx http-server -p 8080 -c-1
 *
 * Open: http://localhost:8080
 *
 * ── What it does ─────────────────────────────────────────────────
 * Reads every *.md file (except index.md) from ./posts/, parses
 * front-matter, generates excerpts + read-time, and writes:
 *   posts/manifest.json  — metadata only, no bodies (~100 KB)
 *   sitemap.xml          — all post URLs + static pages
 *   feed.xml             — RSS feed (latest 50 posts)
 *   manifest.json        — PWA web app manifest
 *   post/<slug>/index.html — static HTML stubs (200 OK for Googlebot)
 *
 * The SPA fetches each post's .md on-demand when a reader opens it.
 * This keeps the manifest tiny (~100 KB for hundreds of posts).
 * ────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

// ── Paths ─────────────────────────────────────────────────────────
const POSTS_DIR    = path.join(__dirname, 'posts');
const OUT_PATH     = path.join(POSTS_DIR, 'manifest.json');
const SITEMAP_PATH = path.join(__dirname, 'sitemap.xml');
const FEED_PATH    = path.join(__dirname, 'feed.xml');
const PWA_PATH     = path.join(__dirname, 'manifest.json');
const POST_DIR     = path.join(__dirname, 'post');
const ARTICLE_PLACEHOLDER = '<article id="post-article"></article>';
const HOME_MARKER_START = '<!--PRERENDERED-HOME-START-->';
const HOME_MARKER_END   = '<!--PRERENDERED-HOME-END-->';          // ← stub output dir
const CONFIG_PATH  = path.join(__dirname, 'config-shani.js');
const WATCH_MODE   = process.argv.includes('--watch');

// ── Read config values from config-shani.js ───────────────────────
// config-shani.js is browser-only (no require/module.exports), so we
// extract values with regex — the same technique used in build-manifest.yml.
const configRaw = fs.existsSync(CONFIG_PATH)
  ? fs.readFileSync(CONFIG_PATH, 'utf8')
  : '';

function getConfig(key, fallback) {
  // Matches:  KEY: 'value'  or  KEY: "value"  or  KEY: `value`
  // The closing delimiter must be the SAME character as the opening one,
  // so a value may contain the other quote types (e.g. "team's OS").
  // A naive [^'"`]+ would truncate at the first quote of any kind.
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = configRaw.match(new RegExp(esc + ":\\s*('([^']*)'|\"([^\"]*)\"|`([^`]*)`)"));
  if (!m) return fallback;
  return m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : m[4]);
}

// ── Service-worker cache busting ─────────────────────────────────
// Rewrites SHELL_CACHE's version suffix in sw.js with today's build stamp.
// Idempotent: same-day reruns produce the same name; the activate handler
// deletes any cache whose name no longer matches.
function bumpServiceWorkerCache(baseName) {
  const swPath = path.join(__dirname, 'sw.js');
  if (!fs.existsSync(swPath)) return;
  let sw = fs.readFileSync(swPath, 'utf8');
  const m = sw.match(/^const SHELL_CACHE = '([^-]+)-[^']*';$/m);
  if (!m) {
    console.warn('⚠  sw.js SHELL_CACHE format unrecognized — not bumping');
    return;
  }
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  sw = sw.replace(/^const SHELL_CACHE = '.*';$/m, `const SHELL_CACHE = '${baseName}-${stamp}';`);
  fs.writeFileSync(swPath, sw);
  console.log(`✓ sw.js SHELL_CACHE → ${baseName}-${stamp}`);
}

function getConfigNum(key, fallback) {
  const m = configRaw.match(new RegExp(key + ":\\s*(-?\\d+(?:\\.\\d+)?)"));
  return m ? Number(m[1]) : fallback;
}

// ── Config values (all sourced from config-shani.js) ─────────────
const BLOG_URL        = getConfig('BLOG_URL',        'https://blog.shani.dev');
const SITE_TITLE      = getConfig('SITE_TITLE',      'Blog');
const SITE_DESC       = getConfig('SITE_DESCRIPTION','');
const AUTHOR          = getConfig('AUTHOR_NAME',     '');
const LANG            = getConfig('LANG', getConfig('DATE_LOCALE', 'en-US'));
const PWA_NAME        = getConfig('PWA_NAME',        SITE_TITLE);
const PWA_SHORT_NAME  = getConfig('PWA_SHORT_NAME',  'Blog');
const PWA_DESCRIPTION = getConfig('PWA_DESCRIPTION', SITE_DESC);
const PWA_THEME_COLOR = getConfig('PWA_THEME_COLOR', '#000000');
const PWA_BG_COLOR    = getConfig('PWA_BG_COLOR',    '#000000');
const PWA_ICON_URL    = getConfig('FAVICON_URL',     '/favicon.svg');
const FAVICON_URL     = getConfig('FAVICON_URL',     '');
const OG_IMAGE        = getConfig('OG_IMAGE',        '');
const TWITTER_HANDLE  = getConfig('TWITTER_HANDLE',  '');
const PUBLISHER_NAME  = getConfig('PUBLISHER_NAME',  SITE_TITLE);
const PUBLISHER_LOGO  = getConfig('PUBLISHER_LOGO',  FAVICON_URL);
const PUBLISHER_URL   = getConfig('PUBLISHER_URL',   BLOG_URL);
const STORAGE_PREFIX  = getConfig('STORAGE_PREFIX',  'shani');
const PAYWALL_PREVIEW_BLOCKS = getConfigNum('PAYWALL_PREVIEW_BLOCKS', 12);

// ── SITEMAP_STATIC_URLS — parsed from the CONFIG array literal ───
// Falls back to a sensible default if parsing fails.
function parseSitemapStaticUrls() {
  const m = configRaw.match(/SITEMAP_STATIC_URLS\s*:\s*\[([\s\S]*?)\]/);
  if (!m) return [{ path: '/', priority: '1.0', changefreq: 'weekly' }];
  const block = m[1];
  const entries = [];
  // Each entry looks like: { path: '/foo', priority: '0.6', changefreq: 'weekly' }
  const entryRe = /\{([^}]+)\}/g;
  let em;
  while ((em = entryRe.exec(block)) !== null) {
    const inner = em[1];
    const get = k => { const r = inner.match(new RegExp(k + "\\s*:\\s*['\"`]([^'\"`]*)['\"`]")); return r ? r[1] : ''; };
    entries.push({ path: get('path'), priority: get('priority'), changefreq: get('changefreq') });
  }
  return entries.length ? entries : [{ path: '/', priority: '1.0', changefreq: 'weekly' }];
}

const SITEMAP_STATIC_URLS = parseSitemapStaticUrls();

// ── SOCIAL_LINKS — parsed from the CONFIG array literal ──────────
// Feeds Organization.sameAs so crawlers/Knowledge Graph can associate
// this site with its real social profiles, without needing client JS
// to populate it (see the ld-org fix below).
function parseSocialLinks() {
  const m = configRaw.match(/SOCIAL_LINKS\s*:\s*\[([\s\S]*?)\]/);
  if (!m) return [];
  const urls = [];
  const urlRe = /url\s*:\s*['"`]([^'"`]*)['"`]/g;
  let um;
  while ((um = urlRe.exec(m[1])) !== null) urls.push(um[1]);
  return urls;
}

const SOCIAL_LINKS = parseSocialLinks();

// Static Organization schema — same data script.js builds at runtime for
// ld-org, but baked in at build time so non-JS crawlers see it too.
const ORG_JSON = JSON.stringify({
  '@context': 'https://schema.org',
  '@type':    'Organization',
  name:       PUBLISHER_NAME,
  url:        PUBLISHER_URL,
  logo:       PUBLISHER_LOGO,
  ...(SOCIAL_LINKS.length ? { sameAs: SOCIAL_LINKS } : {}),
});

// Static Blog schema for the homepage — mirrors what script.js builds
// into #ld-blogs at runtime, baked in at build time for non-JS crawlers.
const BLOG_JSON = JSON.stringify({
  '@context': 'https://schema.org',
  '@type':    'Blog',
  name:       SITE_TITLE,
  url:        `${BLOG_URL}/`,
  description: SITE_DESC,
  publisher: {
    '@type': 'Organization',
    name:    PUBLISHER_NAME,
    url:     PUBLISHER_URL,
    logo:    { '@type': 'ImageObject', url: PUBLISHER_LOGO },
  },
  inLanguage: LANG,
});

// ── Helpers ───────────────────────────────────────────────────────
function readTime(body) {
  const words = body.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min`;
}

function autoExcerpt(body, paywalled) {
  let src = paywalled
    ? (body.split(/\n\n+/).find(l => l.trim() && !l.startsWith('#')) || body)
    : body;
  // Drop a leading H1 that just repeats the post title \u2014 already shown
  // separately as <title>/og:title, so restating it here wastes the
  // excerpt's ~140-char budget on a redundant repeat.
  src = src.replace(/^\s+/, '').replace(/^#\s+.+\n+/, '').replace(/^\s+/, '');
  const plain = src
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^(?:-{3,}|\*{3,}|_{3,})$/gm, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.substring(0, 140) + (plain.length > 140 ? '\u2026' : '');
}

function escXml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// escXml doubles as HTML attribute escaper for the stubs
const escHtml = escXml;

// ── Markdown → HTML (for prerendered stub content) ─────────────────
// Prefer the real `marked` package (same renderer family the client uses)
// if it's installed; otherwise fall back to a small dependency-free
// converter. script.js still hydrates/replaces #post-article on the
// client with the fully interactive render (Prism, KaTeX, TOC, likes,
// comments, etc.) — this just needs to be real, crawlable text.
let marked = null;
try { marked = require('marked'); } catch { /* not installed — fallback used */ }

function mdToHtmlFallback(md) {
  const blocks = [];
  let src = String(md || '').replace(/\r\n/g, '\n');


  const inline = s => s
    .replace(/`([^`]+)`/g, (_, c) => `<code>${escXml(c)}</code>`)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_, a, u) => `<img src="${escXml(u)}" alt="${escXml(a)}" loading="lazy">`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${escXml(u)}">${t}</a>`);

  const lines = src.split('\n');
  const slugifyH = t => t.toLowerCase().replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-');
  let inQuoteFence = false, qfLang = '', qfBuf = [];
  const usedIds = new Set();
  const uniqId = t => { let id = slugifyH(t) || 'section'; let n = id; let k = 2;
    while (usedIds.has(n)) n = id + '-' + k++; usedIds.add(n); return n; };

  // Blockquoted fences ("> ```bash … > ```"): convert to a quoted code
  // block before line processing so the fence scanner sees clean fences.
  src = src.replace(
    /^> ```([\w-]*)\n([\s\S]*?)^> ```[ \t]*$/gm,
    (_, lang, body) => {
      const lines = body.split('\n').map(l => l.replace(/^> ?/, ''));
      const esc2 = t => t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      return `<blockquote><pre><code${lang ? ` class="language-${lang}"` : ''}>${esc2(lines.join('\n').replace(/\n$/,''))}</code></pre></blockquote>`;
    });
  let inFence = false, fenceChar = '`', fenceLen = 0, fenceLang = '', fenceBuf = [];
  const out = [];
  let para = [];
  let list = null; // 'ul' | 'ol'
  let quote = null; // collected blockquote lines
  let table = null; // { head:[], rows:[][] }

  const flushPara = () => {
    if (para.length) { out.push(`<p>${inline(para.join(' ').trim())}</p>`); para = []; }
  };
  const flushList = () => {
    if (list) { out.push(`</${list}>`); list = null; }
  };
  const flushQuote = () => {
    if (quote) { out.push(`<blockquote>${inline(quote.join(' ').trim())}</blockquote>`); quote = null; }
  };
  const flushTable = () => {
    if (!table) return;
    const cell = c => `<td>${inline(c.trim())}</td>`;
    let h = '<thead><tr>' + table.head.map(c => `<th>${inline(c.trim())}</th>`).join('') + '</tr></thead>';
    let b = '';
    for (const row of table.rows) b += '<tr>' + row.map(cell).join('') + '</tr>';
    out.push(`<table>${h}<tbody>${b}</tbody></table>`);
    table = null;
  };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); flushTable(); };

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];

    // ── Fenced code (CommonMark-style): a fence OPENER may carry an info
    // string; a CLOSER is backticks/tildes only, ≥ opener length. Lines
    // inside a fence are always literal — nested ``` examples can never
    // desync the parser.
    {
      const m = line.match(/^(`{3,}|~{3,})(.*)$/);
      if (inFence) {
        if (m && m[1][0] === fenceChar && m[1].length >= fenceLen && !m[2].trim()) {
          const idx = blocks.push(
            `<pre><code${fenceLang ? ` class="language-${escXml(fenceLang)}"` : ''}>${escXml(fenceBuf.join('\n'))}</code></pre>`
          ) - 1;
          flushAll();
          out.push(`\u0000BLOCK${idx}\u0000`);
          inFence = false; fenceBuf = [];
        } else {
          fenceBuf.push(line);
        }
        continue;
      }
      if (m && m[2].trim()) { // opener requires info string (or bare ``` handled below)
        flushAll();
        inFence = true; fenceChar = m[1][0]; fenceLen = m[1].length;
        fenceLang = m[2].trim().split(/\s+/)[0]; fenceBuf = [];
        continue;
      }
      if (m && !m[2].trim()) { // bare fence with no info string: treat as opener too
        flushAll();
        inFence = true; fenceChar = m[1][0]; fenceLen = m[1].length;
        fenceLang = ''; fenceBuf = [];
        continue;
      }
    }

    if (/^\u0000BLOCK\d+\u0000$/.test(line.trim())) { flushAll(); out.push(line.trim()); continue; }

    // GFM table: current line has |, next line is a |---|---| separator
    if (line.includes('|') && li + 1 < lines.length &&
        /^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(lines[li + 1]) &&
        /\|/.test(lines[li + 1])) {
      flushAll();
      const splitRow = r => r.trim().replace(/^\||\|$/g, '').split('|');
      table = { head: splitRow(line), rows: [] };
      li++; // skip separator
      continue;
    }
    if (table && line.includes('|')) { table.rows.push(line.trim().replace(/^\||\|$/g, '').split('|')); continue; }
    flushTable();

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flushAll(); const lvl = h[1].length; const ht = inline(h[2].trim()); out.push(`<h${lvl} id="${uniqId(h[2].trim())}">${ht}</h${lvl}>`); continue; }

    // Horizontal rule (standalone --- / *** with blank-ish context)
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { flushAll(); out.push('<hr>'); continue; }

    const task = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (task || ul || ol) {
      flushPara(); flushQuote();
      const tag = ol ? 'ol' : 'ul';
      if (list !== tag) { flushList(); out.push(`<${tag}>`); list = tag; }
      if (task) {
        const checked = task[1].toLowerCase() === 'x';
        out.push(`<li><input type="checkbox" disabled${checked ? ' checked' : ''}> ${inline(task[2].trim())}</li>`);
      } else {
        out.push(`<li>${inline((ul || ol)[1].trim())}</li>`);
      }
      continue;
    }

    const bq = line.match(/^\s*>\s?(.*)$/);
    if (bq) {
      flushPara(); flushList();
      if (!quote) quote = [];
      quote.push(bq[1]);
      continue;
    }
    flushQuote();

    if (!line.trim()) { flushPara(); flushList(); continue; }
    para.push(line.trim());
  }
  flushAll();

  let html = out.join('\n');
  blocks.forEach((b, i) => { html = html.replace(`\u0000BLOCK${i}\u0000`, b); });
  return html;
}

function mdToHtml(md) {
  if (marked) {
    try { return typeof marked.parse === 'function' ? marked.parse(md || '') : marked(md || ''); }
    catch { /* fall through to the built-in converter */ }
  }
  return mdToHtmlFallback(md);
}

// Strip a leading "# Title" line from the body if it duplicates the post's
// title (which the stub already renders in <h1 class="post-title">) —
// otherwise every stub ships two H1s, which hurts SEO/structure.
function stripDuplicateLeadingH1(body, title) {
  const m = String(body || '').match(/^\s*#\s+(.+?)\s*\n([\s\S]*)$/);
  if (!m) return body;
  const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  return norm(m[1]) === norm(title || '') ? m[2] : body;
}

// Mirrors the client's paywall gating (renderPost() in script.js): non-
// members only ever see the first PAYWALL_PREVIEW_BLOCKS blocks. The stub
// must show the SAME preview a real anonymous visitor gets — never more —
// or crawlers would index content that's supposed to be gated.
function paywallPreviewMarkdown(body, maxBlocks) {
  const blocks = String(body || '').split(/\n{2,}/).filter(b => b.trim());
  return blocks.slice(0, maxBlocks).join('\n\n');
}

// ── Post stub builder ─────────────────────────────────────────────
// Generates a real HTML file at post/<slug>/index.html so GitHub Pages
// returns HTTP 200 for every post URL.
//
// KEY DESIGN: The <body> is a FULL COPY of index.html so script.js has
// all the DOM elements it needs (#view-index, #view-post, #posts-grid,
// etc.). Only the <head> SEO tags are pre-filled for Googlebot / social
// crawlers. The SPA reads location.pathname on boot and renders the post.
//
// A minimal stub body (just a loader + scripts) breaks script.js because
// it tries to querySelector elements that don't exist and silently fails,
// resulting in a blank page for real users.
function buildStub(post) {
  // Trailing slash matches the actual stub location (post/<slug>/index.html).
  // GitHub Pages 301-redirects a directory URL requested WITHOUT the slash,
  // so every URL we hand to crawlers/feeds should already be the final one.
  const url           = `${BLOG_URL}/post/${post.slug}/`;
  const title         = escHtml(post.title);
  const desc          = escHtml(post.excerpt || SITE_DESC);
  // og:image/twitter:image must be a fully-qualified absolute URL per spec —
  // most social crawlers won't resolve a root-relative path the way a
  // browser resolves an <img src>. post.cover/og_image are authored as
  // root-relative paths (e.g. /assets/images/blog/<slug>.webp), so
  // absolutize them against BLOG_URL; leave an already-absolute value
  // (http(s)://...) or the OG_IMAGE fallback untouched.
  const absolutize    = u => u && !/^https?:\/\//.test(u) ? `${BLOG_URL}${u}` : u;
  const image         = escHtml(absolutize(post.og_image || post.cover) || OG_IMAGE);
  const authorName    = escHtml(post.author || AUTHOR);
  const datePublished = post.date    ? new Date(post.date    + 'T00:00:00').toISOString() : '';
  const dateModified  = post.updated ? new Date(post.updated + 'T00:00:00').toISOString() : datePublished;
  const robots        = (post.noindex || post.draft) ? 'noindex' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

  const ldJson = JSON.stringify({
    '@context':     'https://schema.org',
    '@type':        'BlogPosting',
    headline:       post.title,
    description:    post.excerpt || SITE_DESC,
    url,
    datePublished,
    dateModified,
    author:    { '@type': 'Person', name: post.author || AUTHOR },
    publisher: {
      '@type': 'Organization',
      name:    PUBLISHER_NAME,
      logo:    { '@type': 'ImageObject', url: PUBLISHER_LOGO },
    },
    ...(image ? { image } : {}),
    ...(post.paywalled ? { isAccessibleForFree: 'False' } : { isAccessibleForFree: 'True' }),
  });

  // ── Prerendered article content ────────────────────────────────
  // Paywalled posts get exactly the same preview a real anonymous
  // visitor would see client-side — never the full body.
  const sourceMd  = stripDuplicateLeadingH1(
    post.paywalled ? paywallPreviewMarkdown(post.body, PAYWALL_PREVIEW_BLOCKS) : (post.body || ''),
    post.title
  );
  const bodyHtml  = mdToHtml(sourceMd);
  const dateDisp  = post.date ? escHtml(post.date) : '';
  const articleHtml = `
      <header class="post-header">
        <span class="post-tag">${escHtml(post.tag || 'Post')}</span>
        <h1 class="post-title">${title}</h1>
        <div class="post-meta">
          <span class="meta-info">${authorName ? authorName + ' · ' : ''}${dateDisp}${post.readTime ? ' · ' + escHtml(post.readTime) : ''}${post.paywalled ? ' · <span class="members-badge"><i class="fa-solid fa-star"></i> Members</span>' : ''}</span>
        </div>
      </header>
      <div class="post-body">${bodyHtml}</div>
      ${post.paywalled ? `<div class="paywall-gate"><div class="paywall-card">
        <p>This post is for members. <a href="/membership">Become a member</a> to read the rest.</p>
      </div></div>` : ''}`;

  // Read the root index.html once and cache it
  if (!buildStub._indexHtml) {
    const indexPath = path.join(__dirname, 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error(`buildStub: index.html not found at ${indexPath}`);
    }
    // Strip any prerendered-home block so article stubs never inherit it.
    buildStub._indexHtml = fs.readFileSync(indexPath, 'utf8')
      .replace(new RegExp(`${HOME_MARKER_START}[\\s\\S]*?${HOME_MARKER_END}`), ARTICLE_PLACEHOLDER);
  }

  // Replace only the <head> SEO block in index.html.
  // We inject pre-filled tags right after <meta charset> so crawlers see
  // them immediately. The rest of index.html (body, scripts) is untouched.
  const SEO_INJECTION = `
  <title>${title} — ${escHtml(SITE_TITLE)}</title>
  <meta name="description" id="meta-desc" content="${desc}">
  <meta name="author"      content="${authorName}">
  <meta name="robots"      content="${robots}">
  <link rel="canonical"    id="canonical-url" href="${escHtml(url)}">

  <meta property="og:site_name" id="og-site-name" content="${escHtml(SITE_TITLE)}">
  <meta property="og:type"      id="og-type"      content="article">
  <meta property="og:title"     id="og-title"     content="${title}">
  <meta property="og:description" id="og-desc"    content="${desc}">
  <meta property="og:url"       id="og-url"       content="${escHtml(url)}">
  <meta property="og:image"     id="og-image"     content="${image}">
  <meta property="og:image:alt" id="og-image-alt" content="${title}">
  <meta property="og:locale"    content="en_US">
  <meta property="article:published_time" id="og-article-pubtime" content="${datePublished}">
  <meta property="article:modified_time"  id="og-article-modtime" content="${dateModified}">
  <meta property="article:author"         id="og-article-author"  content="${authorName}">
  <meta property="article:section"        id="og-article-section" content="${escHtml(post.tag || '')}">
  ${post.keywords ? `<meta name="keywords" content="${escHtml(post.keywords)}">` : ''}

  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:site"        id="tw-site"  content="${escHtml(TWITTER_HANDLE)}">
  <meta name="twitter:title"       id="tw-title" content="${title}">
  <meta name="twitter:description" id="tw-desc"  content="${desc}">
  <meta name="twitter:image"       id="tw-image" content="${image}">

  <script type="application/ld+json" id="ld-blogs">${ldJson}<\/script>
  <script type="application/ld+json" id="ld-org">${ORG_JSON}<\/script>
  <link rel="alternate" type="application/rss+xml" title="${escHtml(SITE_TITLE)} RSS Feed" href="/feed.xml">`;

  // Replace the entire existing <head> SEO block (from <title> to the last
  // ld+json script) with our pre-filled version.
  //
  // SENTINEL DESIGN: index.html must contain the exact comment line:
  //   <!-- ═══ PRIMARY SEO — values overwritten by Renderer.applyBranding() ══════ -->
  // followed by the placeholder <title>Blog</title>.
  // The replacement ends at (and excludes) the PERFORMANCE comment sentinel.
  // This avoids brittle regex spanning the full head block.
  let html = buildStub._indexHtml;

  const START_SENTINEL = '<!-- ═══ PRIMARY SEO — values overwritten by Renderer.applyBranding() ══════ -->';
  const END_SENTINEL   = '<!-- ═══ PERFORMANCE';

  const startIdx = html.indexOf(START_SENTINEL);
  const endIdx   = html.indexOf(END_SENTINEL, startIdx);

  if (startIdx === -1 || endIdx === -1) {
    // Fallback: try the original title-based regex for backward compatibility
    const patched = html.replace(
      /[ \t]*<title>Blog<\/title>[\s\S]*?<\/script>\s*\n(\s*<!-- ═══ PERFORMANCE)/,
      SEO_INJECTION + '\n\n  $1'
    );
    if (patched === html) {
      throw new Error(
        'buildStub: Could not find SEO injection sentinels in index.html.\n' +
        'Ensure index.html contains the PRIMARY SEO comment block and PERFORMANCE comment.'
      );
    }
    html = patched;
  } else {
    // Splice: keep everything before START_SENTINEL, inject SEO block, then
    // keep everything from END_SENTINEL onward (preserving the PERFORMANCE section).
    html = html.slice(0, startIdx) +
           SEO_INJECTION.trimStart() + '\n\n  ' +
           html.slice(endIdx);
  }

  // ── Prerender the article body + fix initial view visibility ────
  // Without this, every post stub ships the same empty #post-article,
  // which is the thin/duplicate-content pattern that keeps crawlers
  // from bothering to index individual post URLs. script.js still
  // fully re-renders #post-article and re-toggles views on load, so
  // this only affects what's visible before/without JS execution.
  // (ARTICLE_PLACEHOLDER defined at module scope)
  if (html.includes(ARTICLE_PLACEHOLDER)) {
    html = html.replace(ARTICLE_PLACEHOLDER, `<article id="post-article">${articleHtml}</article>`);
  } else {
    console.warn(`  ⚠  buildStub: #post-article placeholder not found for "${post.slug}" — stub will ship with empty article content.`);
  }

  const VIEW_INDEX_OPEN = '<section id="view-index">';
  if (html.includes(VIEW_INDEX_OPEN)) {
    html = html.replace(VIEW_INDEX_OPEN, '<section id="view-index" style="display:none">');
  }

  const VIEW_POST_OPEN = '<section id="view-post" class="container" style="display:none" aria-label="Post">';
  if (html.includes(VIEW_POST_OPEN)) {
    html = html.replace(VIEW_POST_OPEN, '<section id="view-post" class="container" aria-label="Post">');
  }

  return html;
}

// ── Build ─────────────────────────────────────────────────────────
function build() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error(`\n  ✗ posts/ directory not found at: ${POSTS_DIR}\n`);
    process.exit(1);
  }

  const files = fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md') && f !== 'index.md')
    .sort();

  if (files.length === 0) {
    console.warn('\n  ⚠  No .md files found in posts/\n');
    fs.writeFileSync(OUT_PATH, '[]');
    return;
  }

  const posts = [];

  for (const file of files) {
    const raw  = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/^\uFEFF/, '');
    const slug = file.replace(/\.md$/, '');

    // Parse front-matter
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!fmMatch) {
      console.warn(`  ⚠  Skipping ${file} — no front-matter block found`);
      continue;
    }

    const fm   = {};
    const body = fmMatch[2];

    // ── Robust front-matter parser ────────────────────────────────
    // Handles:
    //   - Values with colons (URLs, timestamps, subtitles)
    //   - Quoted multi-line values: "title: 'Foo: Bar: Baz'"
    //   - Bare values, single/double/backtick quoted values
    //   - Trailing whitespace / Windows line endings
    const fmLines = fmMatch[1].split(/\r?\n/);
    let i = 0;
    while (i < fmLines.length) {
      const line = fmLines[i];
      // Skip blank lines and comment lines
      if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }

      // Only parse TOP-LEVEL keys (zero indentation).
      // Indented lines are nested values (e.g. items inside `related:`,
      // `tags:`, or any YAML list). Without this guard, nested `title:`
      // entries would overwrite the post's top-level title.
      if (/^\s/.test(line)) { i++; continue; }

      const colonIdx = line.indexOf(':');
      if (colonIdx < 1) { i++; continue; }

      const key    = line.slice(0, colonIdx).trim();
      let   rawVal = line.slice(colonIdx + 1).trim();

      // Detect block scalars (| or >) — collect continuation lines
      if (rawVal === '|' || rawVal === '>') {
        const joiner = rawVal === '>' ? ' ' : '\n';
        const parts  = [];
        const baseIndent = (fmLines[i + 1] || '').match(/^(\s*)/)[1].length;
        i++;
        while (i < fmLines.length) {
          const next = fmLines[i];
          if (next.trim() === '' || next.match(/^(\s*)/)[1].length >= baseIndent) {
            parts.push(next.slice(baseIndent));
            i++;
          } else {
            break;
          }
        }
        fm[key] = parts.join(joiner).trimEnd();
        continue;
      }

      // Detect opening of a flow/quoted multi-line value
      // e.g.  excerpt: "This spans
      //        multiple lines"
      const quoteMatch = rawVal.match(/^(['"`])([\s\S]*)$/);
      if (quoteMatch) {
        const q    = quoteMatch[1];
        let   val  = quoteMatch[2];
        // Check if closing quote is already on this line
        if (val.endsWith(q)) {
          fm[key] = val.slice(0, -1);
        } else {
          // Accumulate continuation lines until closing quote found
          i++;
          while (i < fmLines.length) {
            const next = fmLines[i].trimEnd();
            if (next.endsWith(q)) {
              val += '\n' + next.slice(0, -1);
              i++;
              break;
            }
            val += '\n' + next;
            i++;
          }
          fm[key] = val;
        }
      } else {
        // Plain unquoted value — everything after the first colon
        fm[key] = rawVal;
      }

      i++;
    }

    const isPaywalled = fm.paywalled === 'true';

    posts.push({
      slug,
      title:           fm.title           || 'Untitled',
      excerpt:         fm.excerpt          || autoExcerpt(body, isPaywalled),
      date:            fm.date             || new Date().toISOString().split('T')[0],
      updated:         fm.updated          || '',
      tag:             fm.tag              || 'Post',
      readTime:        fm.readTime         || readTime(body),
      paywalled:       isPaywalled,
      cover:           fm.cover            || '',
      series:          fm.series           || '',
      featured:        fm.featured         === 'true',
      draft:           fm.draft            === 'true',
      pinned:          fm.pinned           === 'true',
      author:          fm.author           || '',
      author_role:     fm.author_role      || '',
      author_bio:      fm.author_bio       || '',
      author_initials: fm.author_initials  || '',
      author_linkedin: fm.author_linkedin  || '',
      author_github:   fm.author_github    || '',
      author_website:  fm.author_website   || '',
      keywords:        fm.keywords         || '',
      og_image:        fm.og_image         || '',
      canonical:       fm.canonical        || '',
      lang:            fm.lang             || '',
      noindex:         fm.noindex          === 'true',
      toc:             fm.toc              || '',
      body,            // kept in-memory only for stub rendering — stripped before manifest.json is written
    });

    console.log(`  ${isPaywalled ? '[members]' : '[free]   '} ${slug}`);
  }

  // ── Filter out drafts — never publish to manifest, sitemap, feed, or stubs ──
  const draftSlugs = posts.filter(p => p.draft).map(p => p.slug);
  if (draftSlugs.length) {
    console.log(`\n  ✎ Skipping ${draftSlugs.length} draft(s): ${draftSlugs.join(', ')}`);
  }
  const publishedPosts = posts.filter(p => !p.draft);

  // ── Warn on duplicate titles (common sign of copy-paste front-matter errors) ──
  const titleCount = {};
  publishedPosts.forEach(p => { titleCount[p.title] = (titleCount[p.title] || 0) + 1; });
  const dupes = Object.entries(titleCount).filter(([, n]) => n > 1);
  if (dupes.length) {
    console.warn('\n  ⚠  Duplicate titles detected (likely wrong title: in front-matter):');
    dupes.forEach(([title, n]) => {
      const slugs = publishedPosts.filter(p => p.title === title).map(p => p.slug).join(', ');
      console.warn(`     "${title}" appears ${n}×  →  ${slugs}`);
    });
    console.warn('');
  }

  // Sort newest first (same as GitHub Actions output)
  publishedPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

  fs.writeFileSync(OUT_PATH, JSON.stringify(publishedPosts.map(({ body, ...rest }) => rest), null, 2));
  console.log(`\n  ✓ Written ${publishedPosts.length} post(s) to posts/manifest.json`);

  // ── Generate sitemap.xml ────────────────────────────────────────
  const staticUrls = SITEMAP_STATIC_URLS.map(u => ({
    loc: `${BLOG_URL}${u.path}`,
    priority: u.priority,
    changefreq: u.changefreq,
  }));
  const postUrls = publishedPosts.filter(p => !p.noindex).map(p => ({
    loc:        `${BLOG_URL}/post/${p.slug}/`,
    lastmod:    p.updated || p.date,
    priority:   '0.8',
    changefreq: 'monthly',
  }));
  const allUrls = [...staticUrls, ...postUrls];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...allUrls.map(u => [
      '  <url>',
      `    <loc>${u.loc}</loc>`,
      u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : null,
      `    <changefreq>${u.changefreq}</changefreq>`,
      `    <priority>${u.priority}</priority>`,
      '  </url>',
    ].filter(Boolean).join('\n')),
    '</urlset>',
  ].join('\n');
  fs.writeFileSync(SITEMAP_PATH, xml);
  console.log(`  ✓ Written sitemap.xml with ${allUrls.length} URL(s)`);

  // ── Generate feed.xml (RSS) ─────────────────────────────────────
  const rssItems = publishedPosts.filter(p => !p.noindex).slice(0, 50).map(p => [
    '    <item>',
    `      <title>${escXml(p.title)}</title>`,
    `      <link>${BLOG_URL}/post/${p.slug}/</link>`,
    `      <guid isPermaLink="true">${BLOG_URL}/post/${p.slug}/</guid>`,
    `      <description>${escXml(p.excerpt)}</description>`,
    `      <pubDate>${new Date(p.date + 'T00:00:00').toUTCString()}</pubDate>`,
    p.updated ? `      <lastBuildDate>${new Date(p.updated + 'T00:00:00').toUTCString()}</lastBuildDate>` : null,
    `      <category>${escXml(p.tag)}</category>`,
    `      <author>${escXml(AUTHOR)}</author>`,
    '    </item>',
  ].filter(Boolean).join('\n')).join('\n');
  const feed = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escXml(SITE_TITLE)}</title>`,
    `    <link>${BLOG_URL}/</link>`,
    `    <description>${escXml(SITE_DESC)}</description>`,
    `    <language>${LANG}</language>`,
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${BLOG_URL}/feed.xml" rel="self" type="application/rss+xml"/>`,
    rssItems,
    '  </channel>',
    '</rss>',
  ].join('\n');
  fs.writeFileSync(FEED_PATH, feed);
  const indexableCount = publishedPosts.filter(p => !p.noindex).length;
  console.log(`  ✓ Written feed.xml with ${Math.min(50, indexableCount)} item(s)`);

  // ── Generate manifest.json (PWA) ────────────────────────────────
  const pwa = {
    name:             PWA_NAME,
    short_name:       PWA_SHORT_NAME,
    description:      PWA_DESCRIPTION,
    start_url:        '/',
    display:          'standalone',
    background_color: PWA_BG_COLOR,
    theme_color:      PWA_THEME_COLOR,
    lang:             LANG,
    icons: [{ src: PWA_ICON_URL, sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
    categories: ['technology', 'news'],
  };
  fs.writeFileSync(PWA_PATH, JSON.stringify(pwa, null, 2));
  console.log(`  ✓ Written manifest.json (PWA)`);

// ── Static homepage prerender ────────────────────────────────────
// The root index.html ships with an empty <article id="post-article">
// placeholder — a thin shell for crawlers hitting /. Inject a real,
// crawlable post listing between markers so the homepage is fully
// static (Google/AI see every title+excerpt without executing JS).
// The SPA still overwrites this node on load, so interactive users
// get the identical hydrated experience.

function buildStaticHomeHtml() {
  const posts = publishedPosts;
  let html = `
      <section class="home-hero-static">
        <h1 class="post-title">${escHtml(SITE_TITLE)}</h1>
        <p>${escHtml(SITE_DESC)}</p>
      </section>
      <h2>All Posts (${posts.length})</h2>
      <ul class="post-list-static">`;
  for (const p of posts) {
    const url = `/post/${p.slug}/`;
    html += `\n        <li>
          <a href="${url}"><strong>${escHtml(p.title)}</strong></a><br>
          <small>${escHtml(p.date || '')}${p.tag ? ' · ' + escHtml(p.tag) : ''}</small>
          <p>${escHtml((p.excerpt || '').slice(0, 200))}</p>
        </li>`;
  }
  html += '\n      </ul>';
  return html;
}

function prerenderHome() {
  const indexPath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  // Idempotent: restore placeholder from any previous injection first.
  const prev = new RegExp(`${HOME_MARKER_START}[\\s\\S]*?${HOME_MARKER_END}`);
  if (prev.test(html)) {
    html = html.replace(prev, ARTICLE_PLACEHOLDER);
  }
  if (html.includes(ARTICLE_PLACEHOLDER)) {
    html = html.replace(
      ARTICLE_PLACEHOLDER,
      `${HOME_MARKER_START}${buildStaticHomeHtml()}${HOME_MARKER_END}`
    );
  }

  // Bake in the Blog/Organization JSON-LD statically — these two
  // <script> tags used to ship as empty `{}` placeholders, only ever
  // filled in by script.js at runtime, so non-JS crawlers saw nothing.
  html = html.replace(
    /<script type="application\/ld\+json" id="ld-blogs">.*?<\/script>/s,
    `<script type="application/ld+json" id="ld-blogs">${BLOG_JSON}</script>`
  );
  html = html.replace(
    /<script type="application\/ld\+json" id="ld-org">.*?<\/script>/s,
    `<script type="application/ld+json" id="ld-org">${ORG_JSON}</script>`
  );

  fs.writeFileSync(indexPath, html);
  console.log('✓ index.html homepage prerendered (static post listing + JSON-LD)');
}

// ── llms.txt / llms-full.txt (AI discoverability) ────────────────
// llmstxt.org convention: a curated markdown index AI crawlers can ingest
// directly (no JS, no HTML boilerplate), plus a full-corpus variant.
function generateLlmsFiles() {
  const summary = 'The official blog for Shanios — the immutable Linux OS with atomic blue-green updates, instant rollback, and zero telemetry. Engineering breakdowns, release notes, guides, and stories from the team building India\'s immutable Linux OS.';

  // Index file: site overview + every post as a titled link.
  const sections = {};
  for (const p of publishedPosts) {
    const tag = p.tag || 'Posts';
    (sections[tag] = sections[tag] || []).push(p);
  }

  let idx = `# ${SITE_TITLE}\n\n> ${summary}\n\n`;
  if (OG_IMAGE) idx += `Primary image: ${OG_IMAGE}\n`;
  idx += `All posts are also available as full-content HTML at ${BLOG_URL}/post/<slug>/ and in the complete corpus at ${BLOG_URL}/llms-full.txt\n`;

  for (const tag of Object.keys(sections).sort()) {
    idx += `\n## ${tag}\n\n`;
    for (const p of sections[tag]) {
      const url = `${BLOG_URL}/post/${p.slug}/`;
      idx += `- [${p.title}](${url}): ${(p.excerpt || '').replace(/\n+/g, ' ').trim() || 'Blog post'}\n`;
    }
  }
  fs.writeFileSync(path.join(__dirname, 'llms.txt'), idx);

  // Full corpus: every post's complete markdown body.
  let full = `# ${SITE_TITLE} — Complete Content\n\n> ${summary}\n`;
  for (const p of publishedPosts) {
    const url = `${BLOG_URL}/post/${p.slug}/`;
    full += `\n---\n\n# ${p.title}\n\nURL: ${url}\nPublished: ${p.date || ''}${p.tag ? ` · Tag: ${p.tag}` : ''}\n\n${(p.body || '').trim()}\n`;
  }
  fs.writeFileSync(path.join(__dirname, 'llms-full.txt'), full);

  console.log(`✓ llms.txt (${publishedPosts.length} posts indexed)`);
  console.log(`✓ llms-full.txt (full corpus: ${Math.round(full.length / 1024)} KB)`);
}

  // ── Service-worker cache busting ─────────────────────────────────
  // SHELL_CACHE in sw.js is never bumped by the build, so the cache-first
  // handler can serve stale script.js/style.css indefinitely after a
  // deploy. Rewrite its version suffix on every generator run (CI runs
  // this on each deploy) — the SW activate handler then purges the old
  // cache and returning browsers get a fresh shell.
  bumpServiceWorkerCache('shaniblog');

  // ── AI discoverability ───────────────────────────────────────────
  generateLlmsFiles();

  // ── Static homepage prerender (run last) ────────────────────────
  prerenderHome();


  // ── Generate post/<slug>/index.html stubs ────────────────────────
  // Each stub is a real file → GitHub Pages returns HTTP 200 for every
  // post URL. Googlebot indexes the meta tags + JSON-LD immediately.
  // The SPA (script.js) still hydrates the page for real users.
  fs.mkdirSync(POST_DIR, { recursive: true });

  // Stubs are written for EVERY parsed post, including drafts — drafts get
  // robots:noindex (see buildStub) and are excluded from manifest.json,
  // sitemap.xml, and feed.xml above, but this lets you open
  // post/<slug>/ locally to preview a draft before it's published.
  const liveSlugs = new Set();
  let stubsWritten = 0;

  for (const post of posts) {
    if (!post.slug) continue;
    liveSlugs.add(post.slug);
    const dir  = path.join(POST_DIR, post.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), buildStub(post));
    stubsWritten++;
  }

  // Remove stubs for posts that no longer exist — directories only, never files
  let stubsRemoved = 0;
  for (const entry of fs.readdirSync(POST_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;  // skip .nojekyll, README.md, etc.
    if (!liveSlugs.has(entry.name)) {
      fs.rmSync(path.join(POST_DIR, entry.name), { recursive: true, force: true });
      console.log(`  ✗ Removed stale stub: post/${entry.name}/`);
      stubsRemoved++;
    }
  }

  console.log(`  ✓ Written ${stubsWritten} post stub(s) to post/${stubsRemoved ? ` (${stubsRemoved} stale removed)` : ''}\n`);
}

// ── Run ───────────────────────────────────────────────────────────
console.log('\n  Shanios Blog — manifest generator\n');
build();

if (WATCH_MODE) {
  console.log('  Watching posts/ for changes… (Ctrl+C to stop)\n');
  let debounce;
  fs.watch(POSTS_DIR, { persistent: true }, (eventType, filename) => {
    if (!filename?.endsWith('.md')) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      console.log(`  → ${filename} changed, rebuilding…\n`);
      build();
    }, 150);
  });
}
