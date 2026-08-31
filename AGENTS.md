# Agent instructions — shani-blog

This file applies to any AI coding assistant working in this repository
(Claude Code, opencode, Kilo Code, Cursor, Aider, or similar). Read this
before editing, and follow the verification steps before calling any change
done.

## What this repo is

A no-build-step static SPA (`blog.shani.dev`) — plain HTML/CSS/one JS
file, config-driven. Includes a members-only paywall (Razorpay-backed) and
an `admin.html` content-editing panel that holds a live GitHub write
token. Both of those are real attack surface for a "just a blog" — treat
changes to either with the same care as an authenticated app, not as
static content.

## Rule: "the page loads" is not verification — open it and actually check

A static site has no compiler to catch a wrong CDN hash, a broken fetch
path, or a paywall that silently serves full content. After any change:

1. Serve the repo locally (`python3 -m http.server 8000` from the repo
   root, or any static file server) and actually load the page in a
   browser — check the **console for errors**, not just that the page
   visually renders.
2. If you touched `admin.html` or any CDN `<script>`/`<link>` tag, confirm
   every `integrity=` (SRI) hash you add or keep actually matches the
   pinned CDN file version byte-for-byte — a mismatched hash makes the
   browser silently refuse to execute the script (no user-visible error
   unless you check the console), which can look like "the feature is
   just broken" with no obvious cause. Compute the hash yourself
   (`openssl dgst -sha384 -binary <file> | openssl base64 -A`) against the
   exact URL you're pinning; don't guess or copy one from memory.
3. If you touch anything related to the paywall (`fetchBody()`, the
   preview/full-content split, `config-shani.js`'s membership check),
   confirm — by actually fetching the relevant URL, e.g. `curl` a
   members-only post's markdown path directly — that full paywalled
   content is genuinely not retrievable by an unauthenticated request, not
   just hidden by client-side rendering logic. A paywall that only decides
   what to *display* while still serving the full content over the wire
   isn't a paywall.
4. If you touch `admin.html`'s token handling, confirm the GitHub token
   only ever lands in `sessionStorage`, never `localStorage`, and never in
   a URL or a log.
5. **If a page you just edited doesn't reflect your change (or misbehaves
   in a way that makes no sense given the source), check for a stale
   service worker before you start debugging application logic.**
   `sw.js` caches the app shell under a date-stamped `SHELL_CACHE` name
   (`bumpServiceWorkerCache()` only rotates it once per calendar day), so
   a browser tab that already registered that day's service worker on a
   given `origin:port` will keep serving whatever `script.js`/`index.html`
   existed at registration time — invisibly, with no console error —
   until that service worker is explicitly unregistered, regardless of
   `{cache:'no-cache'}` on any individual `fetch()` (that only governs the
   HTTP cache, not a service worker's own `fetch` handler). Symptom looks
   exactly like a real app bug (e.g. the bootstrap sequence silently never
   running). Check with `(await navigator.serviceWorker.getRegistrations())`
   in the console; clear with `.unregister()` on each registration plus
   `caches.delete()` on every `caches.keys()` entry, then hard-reload.
   This cost real debugging time once already — see the CSP entry in
   "Audit-verified known issues" below for the full trace.

## If you have Superpowers / oh-my-opencode / ultrawork / similar available

If your environment provides Claude Code's **Superpowers** plugin, OpenCode's
**oh-my-opencode**, an **ultrawork**-style parallel execution mode, or an
equivalent skill/subagent framework — use it to check the SRI-hash-matches
and paywall-actually-gates checks above concurrently rather than serially,
and to actually drive a headless/real browser rather than reasoning about
DOM behavior from the source alone.

## Audit-verified known issues (confirmed present)

- **Paywall is cosmetic (High) — investigated in depth, deliberately not
  "fixed" with a change that would only look like one.** Traced the exact
  leak precisely: the prerendered SEO stub (`/post/<slug>/index.html`,
  built by `generate-manifest.js`'s `buildStub()`) already correctly
  renders only `paywallPreviewMarkdown(body, PAYWALL_PREVIEW_BLOCKS)` for
  a paywalled post — that part is not the bug. The actual leak is
  `script.js`'s `fetchBody()`: it always does
  `fetch(`${base}/${slug}.md`)` against the raw, deployed source file,
  and only slices the result down to a preview client-side *after* the
  full text has already crossed the wire — visible in the Network tab or
  a plain `curl` regardless of membership. **Currently zero active
  exposure**: confirmed every post in `posts/manifest.json` has
  `"paywalled": false` right now (grepped for `paywalled: true` in
  frontmatter — zero matches) — but the mechanism would leak the full
  text of the first real paywalled post the moment one is published.
  Also verified the license-key mechanism itself is *not* part of this
  problem: `data/keys.json` (fetched client-side, per `script.js`'s own
  `KeysDB`) stores only SHA-256 hashes of keys, never raw keys or buyer
  PII — confirmed via the code's own comment and `.github/workflows/
  issue-license-key.yml`/`manage-keys.yml`.
  Considered and rejected a concrete fix — split each paywalled post's
  deployed `.md` into a public preview file (what's at the known
  `/posts/<slug>.md` path today) plus a separately-fetched full-content
  file, fetched only after a client-side license check passes. Rejected
  because it wouldn't actually close the gap: confirmed via
  `.github/workflows/build-manifest.yml`'s own documentation that
  `posts/*.md` is served completely as-is straight from this git repo —
  there is no build step that transforms source into a different served
  artifact, and this is a genuinely "zero-server" site by explicit design
  (see `issue-license-key.yml`'s own header: "ZERO CLOUDFLARE WORKER —
  FULL PIPELINE IN GITHUB ACTIONS ONLY"). On a static host with no
  request-time authorization hook, *any* URL a legitimate member's
  browser ever fetches is, by definition, equally fetchable by anyone
  else who finds that URL (e.g. by watching a member's own Network tab)
  — a second, "less obvious" file is security-by-obscurity, not a real
  boundary, and shipping it would make this finding look closed in a
  diff while leaving the actual property (non-members can't read paid
  content) unachieved.
  **Real fix requires one of two genuine decisions, not a code patch**:
  (1) accept the residual risk as an inherent, known trade-off of the
  deliberately-chosen zero-server architecture (document it prominently
  wherever paywalled posts are actually authored/sold, so the maintainer
  isn't surprised later), or (2) add real server-side/edge enforcement
  (a Cloudflare Worker or equivalent that checks a real session/entitlement
  before serving the specific file) — which is exactly the infrastructure
  this project has deliberately avoided everywhere else. Flagging for
  that decision before any paywalled post goes live, not attempting a
  fix that can't structurally deliver what "fixed" would need to mean
  here.
- **3 GitHub Actions workflows:** `build-manifest.yml`, `issue-license-key.yml`, `manage-keys.yml`.
- **Fuse.js fuzzy search.** Uses Fuse.js v7 lazy-loaded from jsDelivr for typo-tolerant search.
- **sessionStorage.** Token stored in `sessionStorage` (not `localStorage`), cleared on logout.
- **CI status.** 3 workflows. `build-manifest.yml` runs on every push
  touching `posts/**` — it re-runs `node generate-manifest.js` and
  auto-commits the regenerated `manifest.json`/stubs/sitemap/feed back to
  the branch; if a post edit makes the generator throw (bad frontmatter,
  etc.), the workflow fails *before* that commit step, so a red run here
  usually means "run `node generate-manifest.js` locally and read the
  actual error," not a flaky CI. It does not validate post *content*,
  only that the generator itself completes. `issue-license-key.yml`/
  `manage-keys.yml` are the Razorpay-webhook-driven license-key pipeline
  (see their own extensive header comments) — not build/test gates.
- **Missing cover images — FIXED.** `posts/manifest.json` and the matching `og:image`/`twitter:image` tags in the three affected post stubs referenced `/assets/images/blog/{build-pipeline,cosmic-edition,shani-repo}.webp` — none of these files were ever committed to the repo (confirmed via `git log --all --diff-filter=A`), so the card cover image and social-preview image both 404'd for those three posts. Can't fabricate real cover artwork, so fixed the actual bug instead: the `cover:` frontmatter field in all three source `.md` files pointed at files that don't exist, when every other post without real cover art uses `cover: ''` (56 of them; confirmed the one post with a non-empty `cover:` — `2026-04-15-release-notes.md` — has a file that genuinely exists, so `''` is the real "no cover" convention, not an oversight). Set all three to `cover: ''`; regenerated and confirmed their `og:image`/`twitter:image` now correctly fall back to the site-wide default (`gnome-screenshot.jpg`, which exists) instead of a 404.
- **CSP added to `index.html`, all 60 post stubs, `admin.html`, and `404.html` — verified live in a real browser, not just by reading the diff.** `admin.html` (holds a live GitHub write token) was the priority: `default-src 'self'; script-src 'self' 'unsafe-inline' cdnjs.cloudflare.com cdn.jsdelivr.net; worker-src 'self' blob:; style-src ... ; font-src ...; img-src 'self' data: blob:; connect-src 'self' api.github.com cdn.jsdelivr.net` (the `worker-src blob:` and `cdn.jsdelivr.net` in `connect-src` specifically for Monaco's dynamic worker/language-bundle loading, which a static `integrity=` list can't cover either — see the SRI entry below). Verified by actually serving the repo locally and loading `admin.html` in a real browser: empty console (would show "Refused to..." CSP violations if anything were blocked), correct visual render (fonts/icons/layout), and a Monaco `blob:` worker request initiating without error. Same CSP shape (minus Monaco-specific allowances) applied to `index.html`/post stubs and a minimal `default-src 'self'` version to `404.html` (no CDN resources there at all). **First attempt at the `index.html`/post-stub CSP had a real placement bug**: it was inserted *inside* the per-page SEO sentinel comment block that `generate-manifest.js` fully discards and rebuilds for every stub — so it silently vanished from all 60 generated post pages despite being correctly present in the source `index.html`. Caught by actually checking a generated stub after regenerating (`grep -c` came back 0), not by trusting the source edit; moved above the sentinel and reconfirmed present in every stub afterward. **While verifying this in a browser, hit — and, in a follow-up deep-check, fully root-caused — a "stuck on LOADING POSTS…" symptom. It was never a code bug.** A follow-up session did the actual root-cause work: instrumented `script.js`'s `DOMContentLoaded` handler with `console.log`/marker tracing at every step, only to find the markers never appeared even though `DataLoader`/`CONFIG`/`Utils` were all demonstrably defined and callable — a contradiction that doesn't make sense for straight-line synchronous script execution. The actual explanation: `fetch('/script.js', {cache:'no-cache'})` from within the page proved the *browser itself* was still executing an old, pre-instrumentation copy of the file — an **active service worker on that exact `origin:port`, registered during earlier testing in the same session, was intercepting every request and serving its own Cache Storage contents (`shaniblog-20260829`) regardless of the request's cache mode**, because `{cache:'no-cache'}` only governs the HTTP cache layer, not a service worker's own `fetch` event handler. `navigator.serviceWorker.getRegistrations()` confirmed one `activated` registration per test port. Ran `unregister()` on it + `caches.delete()` on every key, reloaded, and the instrumentation immediately showed the *entire* bootstrap sequence — `applyBranding` → all sync inits → `DataLoader.load()` resolving with all 60 posts — completing normally in milliseconds, followed by the loader actually being dismissed and the full post grid rendering correctly (confirmed both via DOM state and a real screenshot). Restored `script.js`/`index.html` to their pre-instrumentation state immediately after (diffed against a backup to confirm zero residue) — this was purely a diagnostic artifact of iterating on `script.js` across many same-day local test servers, colliding with `sw.js`'s cache-busting design: `SHELL_CACHE`'s date-stamped suffix (`bumpServiceWorkerCache()`) only changes *once per calendar day*, so any further edits to `script.js`/`index.html` made later the same day are invisible to a browser tab that already registered that day's service worker on that origin, until it's explicitly unregistered — a real, worth-knowing gotcha for local dev/testing in this repo (and likely `shani-docs`/`shani-website` too, if they ever grow a service worker), not a defect in the shipped code.
- **No SRI on `admin.html`'s CDN resources — FIXED.** Was: 24 external scripts/stylesheets (Font Awesome, KaTeX, marked, DOMPurify, Prism + languages, Monaco's `loader.js`) on the page holding a live GitHub write token, zero `integrity=` attributes. All 24 now have real `integrity="sha384-..."` + `crossorigin="anonymous"`, computed by fetching each exact pinned URL and hashing it. Monaco's own dynamically-`require`'d submodules (its worker/language bundles, loaded at runtime via `require.config`) are outside what a static `integrity=` attribute can cover — noted as a known limitation, not silently skipped. Also fixed two unrelated pre-existing HTML defects found while re-validating with html5lib: a bare `&` (×3) in the Google Fonts URL, and a genuine duplicate `style` attribute on `#save-modal-protected-hint` that was silently dropping its `margin:0`. Re-parsed after all fixes: 0 errors (was 4).
- **Clickable cards use role="listitem" — FIXED.** `script.js:766,1772` — post cards are `<article role="listitem">` made clickable/focusable via JS (`tabindex="0"` plus a `keydown` handler for Enter/Space), but the role was never changed to something actionable, so screen readers announced them as plain list items. Changed both occurrences (the main grid and the near-duplicate bookmarks-page template) to `role="link"` — `link` rather than `button` because the click/Enter/Space handler calls `Router.go(slug)`, a navigation to a new "page," which is exactly what `role="link"` signals to assistive tech. Left the parent `<div class="grid" role="list">` unchanged even though `role="list"` technically expects `role="listitem"` children per the ARIA spec — a `list` of `link`-role items is a widely-used, real-world-tested pattern (screen readers announce both correctly in practice) and changing the parent's role would have been a larger, unrequested structural change beyond what was flagged.
- **AI-card / any-card click -> blank "stuck" post view — FIXED (real code bug, distinct from the service-worker symptom above).** Root `index.html`'s `#view-post` contains a static `PRERENDERED-HOME-START…PRERENDERED-HOME-END` fallback block and **no `<article id="post-article">`** (that element was removed when the prerendered-home block was introduced). But `script.js` still does `Utils.qs('#post-article').innerHTML = ...` at `:888/:1852/:1864` with no null check, so any `Router.go` that tried to render a post threw on the missing element, aborted `render()`, and left the stale "Shanios Blog" fallback visible — looking exactly like a stuck/stale app (and easy to confuse with the service-worker issue in the CSP entry above). Direct post-URL loads worked only because `generate-manifest.js` injects `ARTICLE_PLACEHOLDER` (`<article id="post-article">`) into per-post stubs. Fixed by adding `preparePostView()` to the bootstrap (before `DOMContentLoaded` -> `Router.render()`), which strips the `PRERENDERED-HOME` markers block from `#view-post` and injects `<article id="post-article">` (idempotent for the stub path), mirroring the generator's placeholder. Verified live on a service-worker-free port: boot injects the element, and AI-card / regular-card clicks now render the correct post with no console throw.
- **On-page SEO bugs ported from `docs.shani.dev` (same code lineage) — FIXED, verified live.** Found while auditing `shani-docs` for the same "keywords not there / SEO not there" complaint and checking whether this repo's near-identical `generate-manifest.js`/`404.html` shared the same defects — it did:
  - **`autoExcerpt()`'s inline-code stripper deleted the CODE CONTENT, not just the backtick markup**, silently removing real technical keywords (tool/command names) from auto-generated meta descriptions whenever they appeared early in a post's first paragraph. Confirmed live, not theoretical: `posts/shani-repo-on-other-distros.md` (one of only 7 of 60 posts without an explicit `excerpt:` frontmatter field, so one of the few that actually exercises the auto-fallback) had `gen-efi` and `shani-health` silently deleted — description read "...its own filesystem layout.  generates Secure Boot UKIs... audits any running..." with both tool names vanished. Fixed to capture and keep the inner text; regenerated and confirmed both names now present in the real stub.
  - **Same function now also strips a leading H1 and collapses stray whitespace** (ported defensively from the `shani-docs` fix, even though 0 of the 60 current posts open with an H1 — for consistency and to guard against a future post that does) and strips bare markdown horizontal-rule lines.
  - **The GitHub Pages 404-redirect's bot-detection regex missed 2 of the 10 AI crawlers this repo's own `robots.txt` explicitly welcomes** (`ChatGPT-User` and `anthropic-ai` — neither contains "bot"/"crawler"/"spider" as a substring, unlike the other 8 which all matched an existing generic token). Since `robots.txt` also has `Disallow: /*?p=`, an unrecognized crawler hitting a stale/broken link would get client-redirected (if it runs JS) straight into a URL its own robots-respecting logic then refuses to follow. Added `anthropic-ai|chatgpt-user` to the regex; verified with a Node harness using each crawler's real known UA string that both now skip the redirect while a plain browser UA still gets redirected as before. See `shani-docs/AGENTS.md`'s matching entry for the full cross-repo investigation (the "12 duplicate descriptions" and "keywords tag empty" findings from that audit are `shani-docs`-specific and don't apply here — this repo's posts mostly set an explicit `excerpt:` field per post already).
- **SEO enhancement pass (per explicit "improve seo add whats best", done alongside the same pass in `shani-docs` — see that repo's `AGENTS.md` for the `BreadcrumbList`/`FAQPage`/sitelinks-searchbox additions, none of which apply here) found and fixed a real, separate gap in this repo's own JSON-LD.**
  - **`mdToPlainText`'s markdown-link stripper deleted the ENTIRE link, including its visible text, not just the markup** (`` !?\[[^\]]*\]\([^)]*\) `` → `''`) — same class of bug as the already-fixed inline-code deletion, just for `[text](url)` instead of `` `code` ``. Fixed to unwrap real links (keep the text, drop the markup) while still fully removing image embeds (`![alt](url)`, whose alt text isn't real prose). Re-scanned every meta description site-wide afterward for the same dangling-fragment signature (double-space, or "See ... for" with nothing between) — zero remaining.
  - **`index.html`'s `#ld-blogs` (`Blog`) and `#ld-org` (`Organization`) JSON-LD blocks shipped as literal empty `{}` placeholders in the static file, filled in only by `script.js` at runtime — so any crawler that doesn't execute JS saw nothing at all.** Same class of gap as this repo's own already-documented "root index.html OG/Twitter tags empty for non-JS crawlers" issue, just for structured data instead of meta tags. **Worse: every one of the 60 per-post stubs also hardcoded `id="ld-org">{}"`** (`generate-manifest.js`), meaning Organization/`sameAs` (social-profile) data was missing from every single post page, not just the homepage. Fixed by building real `BLOG_JSON`/`ORG_JSON` constants from `config-shani.js` at generate time (via the existing `getConfig()` helper, plus a new `parseSocialLinks()` for `sameAs`) and baking them into both the homepage's `<head>` (`prerenderHome()` now also replaces these two script tags, not just the body placeholder) and every post stub. Verified: all 61 pages (60 posts + home) now carry valid, non-empty `Blog`/`Organization` JSON-LD — checked with a Python harness that actually   `json.loads()`s every `<script type="application/ld+json">` on every page (0 parse errors), not just a grep for the tag's presence.
- **Live-content hydration broken when a post is opened at its literal
  `index.html` URL — FIXED, and it also poisoned giscus.** `Router.getSlug()`
  derived the slug straight from `location.pathname`, so a post loaded at its
  actual file path (`/post/<slug>/index.html`, which is exactly what
  `python3 -m http.server` local preview produces) yielded a slug of
  `<slug>/index.html`. `DataLoader` then fetched `posts/<slug>/index.html.md`
  → 404 and the post body silently fell back to the prerendered stub with a
  console error on **every** post when served at a literal file URL (homepage
  was fine; all 60 posts were broken under local preview). Production was
  unaffected because GitHub Pages serves `/post/<slug>/` (trailing slash,
  no `index.html`). Same class of defect as the one now fixed in
  `shani-docs`' `getSlugFromHash()` — see the matching entry in
  `shani-docs/AGENTS.md`. Fixed by normalizing the slug inside
  `Router.getSlug()` (strip trailing slash and a trailing `/index.html`).
  **The giscus comment thread inherited the same bug**: `Renderer.renderPost()`
  derived the `data-term`/setConfig `term` from the raw `pathname`, so a post
  opened at its file URL asked giscus for a discussion keyed `post/<slug>/index.html`
  (giscus then returned `404`/`Discussion not found`, falling back to a
  mismatched thread). Fixed the term derivation to use the now-normalized
  `Router.getSlug()` (not `this.getSlug()` — `renderPost` is a `Renderer`
  method, `getSlug` lives on `Router`, calling the former throws
  `this.getSlug is not a function`) and to emit `data-mapping="specific"` +
  `data-term="/post/<slug>/"` when GISCUS_MAPPING is `'pathname'`. Verified
  live on a service-worker-free port: full 62-page sweep (home + 60 posts +
  404) shows **zero real console errors** and zero broken requests.
- **CSP was self-blocking the blog's own AdSense and giscus features — FIXED, verified live.** The `index.html` CSP (`default-src 'self'`) blocked the very third parties the blog is built around: `script-src` lacked `pagead2.googlesyndication.com` (so `adsbygoogle.js` was refused), and giscus was not allowlisted — causing "Refused to load/connect/frame …" console errors that broke AdSense and comments. Iteratively expanded `script-src`, `style-src`, `img-src`, `frame-src`, and `connect-src` to allowlist the exact origins surfaced by the live sweep: `pagead2.googlesyndication.com`, `giscus.app`, `ep1.adtrafficquality.google`, `ep2.adtrafficquality.google`, `googleads.g.doubleclick.net`, `www.google.com`, `tpc.googlesyndication.com`, `csi.gstatic.com`. Because `generate-manifest.js`'s `buildStub()` copies the `<head>` (including this CSP meta) verbatim into all 60 post stubs, regeneration propagates the fix — grep-verified present in every stub after `node generate-manifest.js`. Note the `shani-docs` CSP is a *different, minimal* one (CDNs + `raw.githubusercontent.com` only) — it has no AdSense/giscus so it is intentionally NOT given these hosts; do not blindly copy the blog CSP into docs. Remaining console activity after this fix is only the Chromium `interest-cohort` Permissions-Policy deprecation warning (benign, leave it) and giscus's expected `404`/`Discussion not found` when no comment thread exists yet (threads are created lazily on first comment — leave).

## Cross-repo impact — check before calling a fix complete

Brand CSS (`brand-shani.css`), `sw.js`, nav JS, and `generate-manifest.js`
are **copy-pasted between this repo and `shani-docs` only** — there is no
shared package. A bug fix in one of these shared-shaped files (a CSP gap,
an XSS-prone rendering pattern, a broken service-worker cache rule) almost
certainly exists in the other copy too. Check **both** repos before
considering the fix complete, not just the one you started in.
**Correction (verify-before-trust note):** `shani-website` and `shani-wiki`
have **no** `sw.js`, no brand CSS, and no nav/content-fetch JS — the earlier
"shared across all four web repos" claim was stale. `shani-wiki` is
markdown-only (no slug/content-fetch logic, so the blog/docs slug fix does
not propagate there); `shani-website` is a single-page marketing site.
The per-site diffs of `sw.js`/`brand-shani.css` between blog and docs are
**expected** (different cache names `shaniblog-`/`shanidocs-`, different
asset lists, cosmetic comment-header differences only — the CSS tokens are
identical). If you fix a bug in a blog/docs shared file, propagate it to
the *other* one — but do not expect or create copies in website/wiki. See
the parent-level `AGENTS.md` too, which still lists these as shared across
all four and should be read with the same caveat.

## Post cover images

Every post's `cover:` frontmatter should point at a generated image under
`assets/images/blog/<slug>.webp` — a dark, on-brand graphic (a large
Font Awesome icon matching the post's actual subject, centred, in the
`brand-shani.css` palette) rather than a stock photo, a blank card, or
dense typography. All 60 posts have one as of this writing.

**To add a cover for a new post**, use the bundled generator:

```bash
python3 scripts/generate-cover.py --slug <slug> --icon fa-<name>
# --icon-brand if it's a logo (fa-windows, fa-android, fa-docker, ...)
# --search <keyword> to find a valid icon name first
```

It reads the post's `tag:` automatically (each tag has its own accent
colour, reusing the site's existing semantic colour tokens — Guide=coral,
Deep Dive=purple, Reference=blue, Ecosystem=green, Release=amber,
Migration=pink, Enterprise=red). Full usage, the reasoning behind every
design choice, and how to rebuild the bundled Font Awesome name→codepoint
table if the CDN version ever changes, are all in the script's own module
docstring (`scripts/generate-cover.py`) — read that before changing the
design, not just this summary.

**The icon is deliberately centred, not off to one side — do not "fix"
this back to an asymmetric composition without re-reading why.** This
same image is `object-fit: cover`'d into at least three different crop
ratios across the site's own CSS: the main grid card at 16:9
(`.card__visual`), the desktop `.card.featured` variant at a near-square
270×260, and the `.related-card__visual` sidebar thumbnail at a fixed
100px height with unpredictable width. An off-centre icon looks fine in
one of these and drifts toward an edge or gets cropped in the others —
verified concretely by simulating the featured-card crop against both an
off-centre and a centred version before settling on centred (see the
`--icon2` orbiting-badge composition for the same reasoning applied to
two-icon posts).

Only `2026-04-15-release-notes.md` predates this system with a real,
hand-made infographic (`assets/images/shani-os-2026.04.15.png`) — it was
replaced with a generated cover for visual consistency across the grid;
the original PNG is left in the repo unreferenced rather than deleted, in
case it's wanted again.

**Found and fixed while wiring this up**: `post.cover` is authored as a
root-relative path (`/assets/images/blog/<slug>.webp`), but `og:image`/
`twitter:image` meta tags and JSON-LD `image` fields require a fully-
qualified absolute URL per spec — a relative path there doesn't reliably
resolve for social-crawler HTTP clients the way a browser resolves an
`<img src>`. This bug was latent before (only one post ever had a
non-empty `cover:`) but would have affected all 60 once every post got
one. Fixed in both `generate-manifest.js` (`buildStub()`'s `image`
construction) and `script.js` (the client-side `ogImg` construction in
the post-view render path) to absolutize against `BLOG_URL` whenever the
value isn't already `http(s)://`-prefixed. Verified live in a browser
post-fix: both the generated stub's static `og:image` and the
client-rehydrated one resolve to `https://blog.shani.dev/assets/images/blog/...`.

## Where things are documented

`README.md` explains the site's architecture; `config-shani.js` documents
which IDs/URLs are safe to be public (Razorpay key ID, AdSense ID) versus
what must never be — don't move a value from the "safe to be public"
category without re-reading why it was classified that way.
