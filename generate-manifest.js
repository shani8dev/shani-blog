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
const POST_DIR     = path.join(__dirname, 'post');          // ← stub output dir
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
  const m = configRaw.match(new RegExp(key + ":\\s*['\"`]([^'\"`]+)['\"`]"));
  return m ? m[1] : fallback;
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
const STORAGE_PREFIX  = getConfig('STORAGE_PREFIX',  'shani');

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

// ── Helpers ───────────────────────────────────────────────────────
function readTime(body) {
  const words = body.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min`;
}

function autoExcerpt(body, paywalled) {
  const src = paywalled
    ? (body.split(/\n\n+/).find(l => l.trim() && !l.startsWith('#')) || body)
    : body;
  const plain = src
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\n/g, ' ')
    .trim();
  return plain.substring(0, 140) + (plain.length > 140 ? '\u2026' : '');
}

function escXml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// escXml doubles as HTML attribute escaper for the stubs
const escHtml = escXml;

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
  const url           = `${BLOG_URL}/post/${post.slug}`;
  const title         = escHtml(post.title);
  const desc          = escHtml(post.excerpt || SITE_DESC);
  const image         = escHtml(post.og_image || post.cover || OG_IMAGE);
  const authorName    = escHtml(post.author || AUTHOR);
  const datePublished = post.date    ? new Date(post.date    + 'T00:00:00').toISOString() : '';
  const dateModified  = post.updated ? new Date(post.updated + 'T00:00:00').toISOString() : datePublished;
  const robots        = post.noindex ? 'noindex' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

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
  });

  // Read the root index.html once and cache it
  if (!buildStub._indexHtml) {
    const indexPath = path.join(__dirname, 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error(`buildStub: index.html not found at ${indexPath}`);
    }
    buildStub._indexHtml = fs.readFileSync(indexPath, 'utf8');
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
  <script type="application/ld+json" id="ld-org">{}<\/script>
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
    return patched;
  }

  // Splice: keep everything before START_SENTINEL, inject SEO block, then
  // keep everything from END_SENTINEL onward (preserving the PERFORMANCE section).
  html = html.slice(0, startIdx) +
         SEO_INJECTION.trimStart() + '\n\n  ' +
         html.slice(endIdx);

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
      // body intentionally omitted — the SPA fetches .md on-demand
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

  fs.writeFileSync(OUT_PATH, JSON.stringify(publishedPosts, null, 2));
  console.log(`\n  ✓ Written ${publishedPosts.length} post(s) to posts/manifest.json`);

  // ── Generate sitemap.xml ────────────────────────────────────────
  const staticUrls = SITEMAP_STATIC_URLS.map(u => ({
    loc: `${BLOG_URL}${u.path}`,
    priority: u.priority,
    changefreq: u.changefreq,
  }));
  const postUrls = publishedPosts.filter(p => !p.noindex).map(p => ({
    loc:        `${BLOG_URL}/post/${p.slug}`,
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
    `      <link>${BLOG_URL}/post/${p.slug}</link>`,
    `      <guid isPermaLink="true">${BLOG_URL}/post/${p.slug}</guid>`,
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

  // ── Generate post/<slug>/index.html stubs ────────────────────────
  // Each stub is a real file → GitHub Pages returns HTTP 200 for every
  // post URL. Googlebot indexes the meta tags + JSON-LD immediately.
  // The SPA (script.js) still hydrates the page for real users.
  fs.mkdirSync(POST_DIR, { recursive: true });

  const liveSlugs = new Set();
  let stubsWritten = 0;

  for (const post of publishedPosts) {
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
