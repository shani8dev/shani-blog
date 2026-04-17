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
const BLOG_URL       = getConfig('BLOG_URL',        'https://blog.shani.dev');
const SITE_TITLE     = getConfig('SITE_TITLE',      'Blog');
const SITE_DESC      = getConfig('SITE_DESCRIPTION','');
const AUTHOR         = getConfig('AUTHOR_NAME',     '');
const LANG           = getConfig('LANG', getConfig('DATE_LOCALE', 'en-US'));
const PWA_NAME       = getConfig('PWA_NAME',        SITE_TITLE);
const PWA_SHORT_NAME = getConfig('PWA_SHORT_NAME',  'Blog');
const PWA_DESCRIPTION= getConfig('PWA_DESCRIPTION', SITE_DESC);
const PWA_THEME_COLOR= getConfig('PWA_THEME_COLOR', '#000000');
const PWA_BG_COLOR   = getConfig('PWA_BG_COLOR',    '#000000');
const PWA_ICON_URL   = getConfig('FAVICON_URL',     '/favicon.svg');

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

  // ── Warn on duplicate titles (common sign of copy-paste front-matter errors) ──
  const titleCount = {};
  posts.forEach(p => { titleCount[p.title] = (titleCount[p.title] || 0) + 1; });
  const dupes = Object.entries(titleCount).filter(([, n]) => n > 1);
  if (dupes.length) {
    console.warn('\n  ⚠  Duplicate titles detected (likely wrong title: in front-matter):');
    dupes.forEach(([title, n]) => {
      const slugs = posts.filter(p => p.title === title).map(p => p.slug).join(', ');
      console.warn(`     "${title}" appears ${n}×  →  ${slugs}`);
    });
    console.warn('');
  }

  // Sort newest first (same as GitHub Actions output)
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  fs.writeFileSync(OUT_PATH, JSON.stringify(posts, null, 2));
  console.log(`\n  ✓ Written ${posts.length} post(s) to posts/manifest.json`);

  // ── Generate sitemap.xml ────────────────────────────────────────
  const staticUrls = SITEMAP_STATIC_URLS.map(u => ({
    loc: `${BLOG_URL}${u.path}`,
    priority: u.priority,
    changefreq: u.changefreq,
  }));
  const postUrls = posts.map(p => ({
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
  const rssItems = posts.slice(0, 50).map(p => [
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
  console.log(`  ✓ Written feed.xml with ${Math.min(50, posts.length)} item(s)`);

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
  console.log(`  ✓ Written manifest.json (PWA)\n`);
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
      console.log(`  → ${filename} changed, rebuilding…`);
      build();
    }, 150);
  });
}
