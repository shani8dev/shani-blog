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
 * front-matter, generates excerpts + read-time, and writes a
 * compact posts/manifest.json (metadata only — no body).
 *
 * The SPA fetches each post's .md on-demand when a reader opens it.
 * This keeps the manifest tiny (~100 KB for hundreds of posts).
 * ────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────
// Change this if your posts directory is elsewhere.
const POSTS_DIR  = path.join(__dirname, 'posts');
const OUT_PATH   = path.join(POSTS_DIR, 'manifest.json');
const WATCH_MODE = process.argv.includes('--watch');

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
    fmMatch[1].split(/\r?\n/).forEach(line => {
      const i = line.indexOf(':');
      if (i < 1) return;
      fm[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^['"`]|['"`]$/g, '');
    });

    const isPaywalled = fm.paywalled === 'true';

    posts.push({
      slug,
      title:           fm.title           || 'Untitled',
      excerpt:         fm.excerpt          || autoExcerpt(body, isPaywalled),
      date:            fm.date             || new Date().toISOString().split('T')[0],
      tag:             fm.tag              || 'Post',
      readTime:        fm.readTime         || readTime(body),
      paywalled:       isPaywalled,
      cover:           fm.cover            || '',
      author:          fm.author           || '',
      author_role:     fm.author_role      || '',
      author_bio:      fm.author_bio       || '',
      author_initials: fm.author_initials  || '',
      author_linkedin: fm.author_linkedin  || '',
      author_github:   fm.author_github    || '',
      author_website:  fm.author_website   || '',
      // body intentionally omitted — the SPA fetches .md on-demand
    });

    console.log(`  ${isPaywalled ? '[members]' : '[free]   '} ${slug}`);
  }

  // Sort newest first (same as GitHub Actions output)
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  fs.writeFileSync(OUT_PATH, JSON.stringify(posts, null, 2));
  console.log(`\n  ✓ Written ${posts.length} post(s) to posts/manifest.json\n`);
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
