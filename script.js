/**
 * blog.shani.dev Blog Engine — SPA, config-driven, zero-build.
 * Single index.html. Hash routing: #/ = list, #/post/slug = article.
 * Architecture: Config → State → DataLoader → Renderer → UI → Router
 */
const CONFIG = {
  GITHUB_USER: '',
  GITHUB_REPO: '',
  AUTHOR_NAME: 'Shrinivas Kumbhar',
  AUTHOR_INITIALS: 'SK',
  AUTHOR_ROLE: 'Shanios · shani.dev',
  AUTHOR_BIO: 'Immutable Linux on Arch. Two OS copies, one always safe. Bad update? One reboot back. Zero telemetry. Built in India 🇮🇳',
  SITE_TITLE: 'Shanios Blog',
  HERO_EYEBROW: 'Shanios',
  HERO_SUB: "Engineering breakdowns, release notes, and stories from the team building India's immutable Linux OS.",
  SOCIAL_LINKS: [
    { label: 'GitHub',   icon: 'fa-brands fa-github',   url: 'https://github.com/shani8dev' },
    { label: 'LinkedIn', icon: 'fa-brands fa-linkedin',  url: 'https://www.linkedin.com/in/Shrinivasvkumbhar/' },
    { label: 'Shanios',  icon: 'fa-brands fa-linux',     url: 'https://shani.dev' },
    { label: 'Wiki',     icon: 'fa-solid fa-book-open',  url: 'https://wiki.shani.dev' },
  ]
};

// ── Tag icons using Font Awesome ──────────────────────────────
const TAG_ICONS = {
  Product:      'fa-solid fa-box-open',
  Engineering:  'fa-solid fa-gears',
  News:         'fa-solid fa-newspaper',
  Release:      'fa-solid fa-rocket',
  Careers:      'fa-solid fa-briefcase',
  Culture:      'fa-solid fa-people-group',
  Partnerships: 'fa-solid fa-handshake',
  Linux:        'fa-brands fa-linux',
  AWS:          'fa-brands fa-aws',
  DevOps:       'fa-solid fa-gears',
  Platform:     'fa-solid fa-layer-group',
  Incident:     'fa-solid fa-triangle-exclamation',
  Essay:        'fa-solid fa-feather-pointed',
  Post:         'fa-solid fa-file-lines',
};

// =========================================
// 1. STATE
// =========================================
const AppState = {
  posts: [],        // Metadata array (body loaded on demand)
  postsCache: {},   // Keyed by slug — full post objects with body
  filter: 'all',
  search: '',
  theme: localStorage.getItem('blogs-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  isMember: localStorage.getItem('blogs_member') === '1',
  pagination: { page: 1, perPage: 9 }
};

// =========================================
// 2. UTILS
// =========================================
const Utils = {
  qs: (sel, root) => (root || document).querySelector(sel),
  fmtDate: str => new Date(str + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  fmtDateShort: str => new Date(str + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  tagIcon: tag => `<i class="${TAG_ICONS[tag] || TAG_ICONS.Post}" aria-hidden="true"></i>`,
  parseFrontmatter: raw => {
    const md = raw.replace(/^\uFEFF/, '');
    const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) return { fm: {}, body: md };
    const fm = {};
    match[1].split(/\r?\n/).forEach(line => {
      const i = line.indexOf(':');
      if (i < 1) return;
      fm[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^['"`]|['"`]$/g, '');
    });
    return { fm, body: match[2] };
  },
  slugify: text => text.toLowerCase()
    .replace(/[^\w\s-]/g, '').trim()
    .replace(/[\s_]+/g, '-').replace(/-+/g, '-'),

  CALLOUT_TYPES: {
    NOTE:      { icon: 'fa-solid fa-circle-info',          cls: 'callout-note'      },
    TIP:       { icon: 'fa-solid fa-lightbulb',            cls: 'callout-tip'       },
    WARNING:   { icon: 'fa-solid fa-triangle-exclamation', cls: 'callout-warning'   },
    CAUTION:   { icon: 'fa-solid fa-fire',                 cls: 'callout-caution'   },
    IMPORTANT: { icon: 'fa-solid fa-star',                 cls: 'callout-important' },
  },

  renderMath(html) {
    if (typeof katex === 'undefined') return html;
    const parts = html.split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/);
    return parts.map((part, i) => {
      if (i % 2 === 1) return part;
      part = part.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
        try { return katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false }); }
        catch { return _; }
      });
      part = part.replace(/(?<!\$)\$([^\n$]+?)\$(?!\$)/g, (_, expr) => {
        try { return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false }); }
        catch { return _; }
      });
      return part;
    }).join('');
  },

  // =========================================================
  // MEDIA SHORTCODES
  // Usage in .md files:
  //   ::youtube[VIDEO_ID]
  //   ::youtube[VIDEO_ID|Caption text]
  //   ::vimeo[VIDEO_ID|Caption]
  //   ::video[https://…/file.mp4|Caption]
  //   ::video[../assets/demo.mp4]
  //   ::audio[https://…/file.mp3|Caption]
  //   ::image[https://…/photo.jpg|Alt text|Caption|wide]
  //   Standard MD images still work: ![alt](url)
  //
  // How it works: shortcodes are replaced with opaque placeholder tokens
  // BEFORE markdown parsing, then the real HTML is injected AFTER DOMPurify
  // (which would strip <iframe> and <video> if they went through it).
  // =========================================================
  _mediaBlocks: {},

  _mediaToken(html) {
    const key = `MBLOCK_${Object.keys(Utils._mediaBlocks).length}_END`;
    Utils._mediaBlocks[key] = html;
    return '\n\n' + key + '\n\n'; // blank lines so marked wraps it as a paragraph, not inline
  },

  _cap: raw => {
    const pipe = raw.lastIndexOf('|');
    return pipe === -1
      ? { val: raw.trim(), caption: '' }
      : { val: raw.slice(0, pipe).trim(), caption: raw.slice(pipe + 1).trim() };
  },

  _youtube(id, caption) {
    const fig = caption ? `<figcaption>${caption}</figcaption>` : '';
    return `<figure class="media-embed media-embed--youtube">
  <div class="media-embed__ratio">
    <iframe src="https://www.youtube-nocookie.com/embed/${id}"
      title="${caption || 'YouTube video'}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen loading="lazy"></iframe>
  </div>${fig}
</figure>`;
  },

  _vimeo(id, caption) {
    const fig = caption ? `<figcaption>${caption}</figcaption>` : '';
    return `<figure class="media-embed media-embed--vimeo">
  <div class="media-embed__ratio">
    <iframe src="https://player.vimeo.com/video/${id}?dnt=1"
      title="${caption || 'Vimeo video'}"
      allow="autoplay; fullscreen; picture-in-picture"
      allowfullscreen loading="lazy"></iframe>
  </div>${fig}
</figure>`;
  },

  _video(src, caption) {
    const fig  = caption ? `<figcaption>${caption}</figcaption>` : '';
    const ext  = src.split('?')[0].split('.').pop().toLowerCase();
    const mime = { mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg', mov: 'video/mp4' }[ext] || 'video/mp4';
    return `<figure class="media-figure media-figure--video">
  <video controls preload="metadata" playsinline>
    <source src="${src}" type="${mime}">
    Your browser doesn't support HTML video. <a href="${src}">Download it</a>.
  </video>${fig}
</figure>`;
  },

  _audio(src, caption) {
    const fig = caption ? `<figcaption>${caption}</figcaption>` : '';
    return `<figure class="media-figure media-figure--audio">
  <audio controls preload="metadata">
    <source src="${src}">
    Your browser doesn't support HTML audio. <a href="${src}">Download it</a>.
  </audio>${fig}
</figure>`;
  },

  _image(src, rest) {
    // rest = "alt | caption | wide"
    const parts   = rest.split('|').map(s => s.trim());
    const alt     = parts[0] || '';
    const caption = parts[1] !== undefined ? parts[1] : alt;
    const wide    = parts[2] === 'wide';
    const fig     = caption ? `<figcaption>${caption}</figcaption>` : '';
    return `<figure class="media-figure${wide ? ' media-figure--wide' : ''}">
  <img src="${src}" alt="${alt}" loading="lazy">${fig}
</figure>`;
  },

  _processShortcodes(text) {
    Utils._mediaBlocks = {};
    text = text.replace(/::youtube\[([^\]]+)\]/g, (_, raw) => {
      const { val, caption } = Utils._cap(raw);
      return Utils._mediaToken(Utils._youtube(val, caption));
    });
    text = text.replace(/::vimeo\[([^\]]+)\]/g, (_, raw) => {
      const { val, caption } = Utils._cap(raw);
      return Utils._mediaToken(Utils._vimeo(val, caption));
    });
    text = text.replace(/::video\[([^\]]+)\]/g, (_, raw) => {
      const { val, caption } = Utils._cap(raw);
      return Utils._mediaToken(Utils._video(val, caption));
    });
    text = text.replace(/::audio\[([^\]]+)\]/g, (_, raw) => {
      const { val, caption } = Utils._cap(raw);
      return Utils._mediaToken(Utils._audio(val, caption));
    });
    text = text.replace(/::image\[([^\]]+)\]/g, (_, raw) => {
      const first = raw.indexOf('|');
      const src   = first === -1 ? raw.trim() : raw.slice(0, first).trim();
      const rest  = first === -1 ? '' : raw.slice(first + 1);
      return Utils._mediaToken(Utils._image(src, rest));
    });
    return text;
  },

  _restoreShortcodes(html) {
    // Tokens may be wrapped in <p> tags by marked — unwrap them
    html = html.replace(/<p>(MBLOCK_\d+_END)<\/p>/g, (_, token) => Utils._mediaBlocks[token] || '');
    html = html.replace(/MBLOCK_\d+_END/g, token => Utils._mediaBlocks[token] || '');
    return html;
  },

  safeMarkdown: text => {
    if (typeof marked !== 'undefined') {
      // 1. Replace shortcodes with opaque tokens before the MD parser sees them
      text = Utils._processShortcodes(text);

      const renderer = new marked.Renderer();

      renderer.code = (code, lang) => {
        const safeLang = (lang || '').split(/\s/)[0];
        const cls = safeLang ? `class="language-${safeLang}"` : '';
        const escaped = code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
        return `<pre><code ${cls}>${escaped}</code></pre>\n`;
      };

      renderer.heading = (text, level) => {
        const id = Utils.slugify(text.replace(/<[^>]+>/g, ''));
        return `<h${level} id="${id}"><a class="heading-anchor" href="#${id}" aria-hidden="true">#</a>${text}</h${level}>\n`;
      };

      renderer.link = (href, title, linkText) => {
        const isExternal = href && !href.startsWith('#') && !href.startsWith('/');
        const t = title ? ` title="${title}"` : '';
        const ext = isExternal ? ` target="_blank" rel="noopener noreferrer"` : '';
        return `<a href="${href}"${t}${ext}>${linkText}</a>`;
      };

      // Standard MD images — lazy load, figcaption from alt or title
      renderer.image = (src, title, alt) => {
        const t       = title ? ` title="${title}"` : '';
        const caption = alt || title;
        const fig     = caption ? `<figcaption>${caption}</figcaption>` : '';
        return `<figure class="media-figure"><img src="${src}" alt="${alt || ''}"${t} loading="lazy">${fig}</figure>`;
      };

      renderer.blockquote = (quote) => {
        const match = quote.match(/^<p>\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]([\s\S]*)/i);
        if (match) {
          const type = match[1].toUpperCase();
          const cfg  = Utils.CALLOUT_TYPES[type] || Utils.CALLOUT_TYPES.NOTE;
          const body = match[2].replace(/<\/p>$/, '').trim();
          return `<div class="callout ${cfg.cls}" role="note">
  <div class="callout__title"><i class="${cfg.icon}" aria-hidden="true"></i>${type}</div>
  <div class="callout__body">${body}</div>
</div>\n`;
        }
        return `<blockquote>${quote}</blockquote>\n`;
      };

      // 2. Parse markdown (tokens pass through untouched)
      let raw = marked.parse(text, { renderer, gfm: true, breaks: false });

      // 3. Math
      raw = Utils.renderMath(raw);

      // 4. Sanitise (tokens are plain text — DOMPurify won't touch them)
      if (typeof DOMPurify !== 'undefined') {
        raw = DOMPurify.sanitize(raw, {
          ADD_TAGS: ['pre', 'code', 'span', 'video', 'audio', 'source', 'iframe',
                     'details', 'summary', 'input', 'figure', 'figcaption',
                     'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
                     'math', 'annotation', 'semantics', 'mrow', 'mi', 'mn',
                     'mo', 'msup', 'msub', 'mfrac', 'mspace', 'mtext'],
          ADD_ATTR: ['class', 'id', 'src', 'controls', 'autoplay', 'loop', 'muted',
                     'playsinline', 'width', 'height', 'allow', 'allowfullscreen',
                     'frameborder', 'loading', 'type', 'checked', 'disabled',
                     'target', 'rel', 'title', 'alt', 'scope', 'align',
                     'encoding', 'display', 'style', 'aria-hidden', 'preload',
                     'poster', 'dnt']
        });
      }

      // 5. Inject shortcode HTML after sanitisation
      return Utils._restoreShortcodes(raw);
    }
    return text.replace(/\n/g, '<br>');
  },

  readTime: body => `${Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 200))} min`
};

// =========================================
// 3. DATA LOADER
//    Fast path : posts/index.json is an array of metadata objects
//    Slow path : posts/index.json is an array of .md filenames → fetch each
//    Body fetch: on-demand, cached in AppState.postsCache
// =========================================
const DataLoader = {
  async load() {
    if (location.protocol === 'file:') {
      UI.showError('Open via a local server', 'Browsers block file:// fetches.', 'python3 -m http.server 8080');
      return null;
    }

    let list;
    try {
      const r = await fetch('posts/index.json');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      list = await r.json();
      if (!Array.isArray(list)) throw new Error('posts/index.json must be a JSON array');
    } catch (e) {
      UI.showError('Could not load posts/index.json', e.message, '[ "my-post.md" ]');
      return null;
    }

    // ── Fast path: index.json contains metadata objects ──────────
    if (list.length > 0 && typeof list[0] === 'object' && list[0] !== null) {
      return list
        .map(item => ({
          slug:           item.slug || '',
          title:          item.title || 'Untitled',
          excerpt:        item.excerpt || '',
          date:           item.date   || new Date().toISOString().split('T')[0],
          tag:            item.tag    || 'Post',
          readTime:       item.readTime || '1 min',
          paywalled:      item.paywalled === true || item.paywalled === 'true',
          cover:          item.cover || '',
          author:         item.author         || CONFIG.AUTHOR_NAME,
          authorRole:     item.author_role    || CONFIG.AUTHOR_ROLE,
          authorBio:      item.author_bio     || CONFIG.AUTHOR_BIO,
          authorInitials: item.author_initials || (
            (item.author || CONFIG.AUTHOR_NAME)
              .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
          ),
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // ── Slow path: array of filenames → fetch all in parallel ────
    const base = (CONFIG.GITHUB_USER && CONFIG.GITHUB_REPO)
      ? `https://raw.githubusercontent.com/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/main/posts`
      : 'posts';

    const files = list.filter(n => typeof n === 'string' && n.endsWith('.md'));
    const posts = await Promise.all(files.map(async name => {
      try {
        const r = await fetch(`${base}/${name}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const { fm, body } = Utils.parseFrontmatter(await r.text());
        const slug = name.replace(/\.md$/, '');
        const post = {
          slug,
          title:   fm.title || 'Untitled',
          excerpt: fm.excerpt || (() => {
            const s = body
              .replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '')
              .replace(/!?\[[^\]]*\]\([^)]*\)/g, '')
              .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
              .replace(/^#{1,6}\s+/gm, '').replace(/^>\s*/gm, '')
              .replace(/^[-*+]\s+/gm, '').replace(/\n/g, ' ').trim();
            return s.substring(0, 140) + (s.length > 140 ? '…' : '');
          })(),
          date:           fm.date     || new Date().toISOString().split('T')[0],
          tag:            fm.tag      || 'Post',
          readTime:       fm.readTime || Utils.readTime(body),
          paywalled:      fm.paywalled === 'true',
          cover:          fm.cover    || '',
          author:         fm.author         || CONFIG.AUTHOR_NAME,
          authorRole:     fm.author_role    || CONFIG.AUTHOR_ROLE,
          authorBio:      fm.author_bio     || CONFIG.AUTHOR_BIO,
          authorInitials: fm.author_initials || (
            (fm.author || CONFIG.AUTHOR_NAME)
              .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
          ),
          body
        };
        AppState.postsCache[slug] = post; // cache immediately
        return post;
      } catch (e) {
        console.error(`Failed: ${name}`, e);
        return null;
      }
    }));

    return posts.filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  // On-demand body fetch (used with fast-path metadata-only index)
  async fetchBody(slug) {
    if (AppState.postsCache[slug]) return AppState.postsCache[slug];

    const base = (CONFIG.GITHUB_USER && CONFIG.GITHUB_REPO)
      ? `https://raw.githubusercontent.com/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/main/posts`
      : 'posts';

    const r = await fetch(`${base}/${slug}.md`);
    if (!r.ok) throw new Error(`HTTP ${r.status} — could not load ${slug}.md`);

    const { fm, body } = Utils.parseFrontmatter(await r.text());
    const meta = AppState.posts.find(p => p.slug === slug) || {};
    const full = { ...meta, body };
    AppState.postsCache[slug] = full;
    return full;
  }
};

// =========================================
// 4. RENDERER
// =========================================
const Renderer = {

  applyBranding() {
    document.title = `Shanios Blog — Engineering, Linux & Open Source`;
    document.getElementById('canonical-url')?.setAttribute('href', 'https://blog.shani.dev/');
    ['og-title', 'tw-title'].forEach(id =>
      Utils.qs(`#${id}`)?.setAttribute('content', 'Shanios Blog — Engineering, Linux & Open Source'));
    ['og-desc', 'tw-desc'].forEach(id =>
      Utils.qs(`#${id}`)?.setAttribute('content', CONFIG.HERO_SUB));
    document.getElementById('og-url')?.setAttribute('content', 'https://blog.shani.dev/');
    document.getElementById('og-type')?.setAttribute('content', 'website');
    document.getElementById('meta-desc')?.setAttribute('content', CONFIG.HERO_SUB);
    document.getElementById('footer-links').innerHTML = CONFIG.SOCIAL_LINKS
      .map(s => `<a href="${s.url}" target="_blank" rel="noopener" aria-label="${s.label}"><i class="${s.icon}" aria-hidden="true"></i> <span>${s.label}</span></a>`)
      .join('');
    document.querySelectorAll('[data-current-year]').forEach(el => el.textContent = new Date().getFullYear());
  },

  renderHero(posts) {
    if (!posts.length) return;
    const p = posts[0];
    Utils.qs('#hero-eyebrow').textContent = CONFIG.HERO_EYEBROW;
    const titleEl = Utils.qs('#hero-title');
    const words = p.title.split(' ');
    const last = words.pop();
    titleEl.innerHTML = `${words.join(' ')} <em>${last}</em>`;
    titleEl.onclick = () => Router.go(p.slug);
    titleEl.style.cursor = 'pointer';

    Utils.qs('#hero-sub').textContent = CONFIG.HERO_SUB;
    Utils.qs('#hero-meta').innerHTML = `
      <span class="avatar">${p.authorInitials}</span>
      <span>${p.author}</span>
      <span class="meta-dot">·</span>
      <span>${Utils.fmtDateShort(p.date)}</span>
      <span class="meta-dot">·</span>
      <span><i class="fa-regular fa-clock"></i> ${p.readTime}</span>
      ${p.paywalled ? '<span class="members-badge"><i class="fa-solid fa-star"></i> Members</span>' : ''}
    `;

    const existing = Utils.qs('.hero-link');
    if (existing) existing.remove();
    const link = document.createElement('button');
    link.className = 'hero-link';
    link.textContent = 'Read post';
    link.onclick = () => Router.go(p.slug);
    Utils.qs('#hero-meta').after(link);

    const aside = Utils.qs('#aside-list');
    const items = posts.slice(1, 4);
    aside.innerHTML = items.length
      ? items.map(item => `
          <li>
            <button class="sidebar__link" data-slug="${item.slug}">
              ${Utils.tagIcon(item.tag)} ${item.title}
            </button>
            <span class="sidebar__date">
              <i class="fa-regular fa-calendar"></i> ${Utils.fmtDateShort(item.date)}
              <span class="meta-dot">·</span>
              <i class="fa-regular fa-clock"></i> ${item.readTime}
            </span>
          </li>`).join('')
      : '<li class="loading-text">No more posts</li>';
    aside.querySelectorAll('.sidebar__link[data-slug]').forEach(btn => {
      btn.addEventListener('click', () => Router.go(btn.dataset.slug));
    });
  },

  renderPosts(posts, showFeatured = false) {
    const grid = Utils.qs('#posts-grid');
    if (!posts.length) {
      grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-inbox empty-icon"></i><h3>No posts found</h3><p>Try a different topic or check back soon.</p></div>`;
      return;
    }
    grid.innerHTML = posts.map((p, i) => {
      const isFeat = showFeatured && i === 0;
      return `<article class="card ${isFeat ? 'featured' : ''}" role="listitem" data-idx="${i}">
        <div class="card__visual"><i class="${TAG_ICONS[p.tag] || TAG_ICONS.Post} card__icon" aria-hidden="true"></i></div>
        <div class="card__content">
          <span class="card__tag" data-tag="${p.tag}"><i class="${TAG_ICONS[p.tag] || TAG_ICONS.Post}"></i> ${p.tag}</span>
          <h2 class="card__title">${p.title}</h2>
          <p class="card__excerpt">${p.excerpt}</p>
          <div class="card__footer">
            <span class="card__author"><i class="fa-solid fa-user-pen"></i> ${p.author}</span>
            <span class="card__meta">
              <i class="fa-regular fa-calendar"></i> ${Utils.fmtDateShort(p.date)}
              <span class="meta-dot">·</span>
              <i class="fa-regular fa-clock"></i> ${p.readTime}
              ${p.paywalled ? '<span class="members-badge"><i class="fa-solid fa-star"></i></span>' : ''}
            </span>
          </div>
        </div>
      </article>`;
    }).join('');

    grid.querySelectorAll('.card').forEach(card => {
      const idx = parseInt(card.dataset.idx);
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Read: ${posts[idx].title}`);
      card.addEventListener('click', () => Router.go(posts[idx].slug));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Router.go(posts[idx].slug); }
      });
    });
  },

  // ── PAGINATION ────────────────────────────────────────────────
  renderPagination(total, perPage, currentPage) {
    let container = Utils.qs('#pagination-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pagination-container';
      const grid = Utils.qs('#posts-grid');
      if (grid && grid.parentNode) grid.parentNode.insertBefore(container, grid.nextSibling);
    }

    const totalPages = Math.ceil(total / perPage);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    // Page numbers: always include 1, totalPages, and a window of ±1 around current
    const pageSet = new Set([1, totalPages]);
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) pageSet.add(i);
    const sorted = [...pageSet].sort((a, b) => a - b);

    // Insert ellipsis markers between non-contiguous runs
    const items = [];
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) items.push('…');
      items.push(p);
      prev = p;
    }

    let html = `<nav class="pagination" aria-label="Post pages">`;
    html += `<button class="pag-btn${currentPage === 1 ? ' disabled' : ''}"
               data-page="${currentPage - 1}"
               aria-label="Previous page"
               ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>`;

    for (const item of items) {
      if (item === '…') {
        html += `<span class="pag-ellipsis">…</span>`;
      } else if (item === currentPage) {
        html += `<button class="pag-btn active" disabled aria-current="page">${item}</button>`;
      } else {
        html += `<button class="pag-btn" data-page="${item}" aria-label="Go to page ${item}">${item}</button>`;
      }
    }

    html += `<button class="pag-btn${currentPage === totalPages ? ' disabled' : ''}"
               data-page="${currentPage + 1}"
               aria-label="Next page"
               ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>`;
    html += `</nav>`;

    container.innerHTML = html;

    container.querySelectorAll('.pag-btn:not(.disabled):not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        const newPage = parseInt(btn.dataset.page);
        if (!newPage) return;
        Router.setQuery({ tag: AppState.filter === 'all' ? null : AppState.filter, page: newPage });
        // Scroll back up to the posts section
        Utils.qs('#posts-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  },

  // ── FULL POST ─────────────────────────────────────────────────
  renderPost(post) {
    const app = Utils.qs('#post-article');
    const html = Utils.safeMarkdown(post.body);
    const paywalled = post.paywalled;
    const date = Utils.fmtDate(post.date);

    document.title = `${post.title} — Shanios Blog`;
    const postUrl = `https://blog.shani.dev/#/post/${post.slug}`;
    const defaultOgImg = 'https://shani.dev/assets/images/logo.svg';
    const ogImg = post.cover || defaultOgImg;
    document.getElementById('canonical-url')?.setAttribute('href', postUrl);
    document.getElementById('meta-desc')?.setAttribute('content', post.excerpt);
    document.getElementById('og-type')?.setAttribute('content', 'article');
    ['og-title', 'tw-title'].forEach(id => Utils.qs(`#${id}`)?.setAttribute('content', post.title));
    ['og-desc',  'tw-desc' ].forEach(id => Utils.qs(`#${id}`)?.setAttribute('content', post.excerpt));
    document.getElementById('og-url')?.setAttribute('content', postUrl);
    document.getElementById('og-image')?.setAttribute('content', ogImg);
    document.getElementById('tw-image')?.setAttribute('content', ogImg);

    const ldblogs = document.getElementById('ld-blogs');
    if (ldblogs) ldblogs.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "BlogPosting",
      "headline": post.title, "description": post.excerpt, "datePublished": post.date,
      ...(post.cover ? { "image": post.cover } : {}),
      "author": { "@type": "Person", "name": post.author },
      "publisher": {
        "@type": "Organization", "name": "Shanios", "url": "https://shani.dev",
        "logo": { "@type": "ImageObject", "url": "https://shani.dev/assets/images/logo.svg" }
      },
      "mainEntityOfPage": { "@type": "WebPage", "@id": postUrl },
      "url": postUrl, "keywords": post.tag, "inLanguage": "en-US"
    });

    const ldOrg = document.getElementById('ld-org');
    if (ldOrg) ldOrg.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home",     "item": "https://blog.shani.dev/" },
        { "@type": "ListItem", "position": 2, "name": post.tag,   "item": `https://blog.shani.dev/#/?tag=${post.tag}` },
        { "@type": "ListItem", "position": 3, "name": post.title, "item": postUrl }
      ]
    });

    let content = '';
    if (paywalled && !AppState.isMember) {
      const div = document.createElement('div');
      div.innerHTML = html;
      const blocks = [...div.querySelectorAll('p, h2, h3, blockquote, pre, ul, ol')];
      const free  = blocks.slice(0, 3).map(n => n.outerHTML).join('');
      const gated = blocks.slice(3).map(n => n.outerHTML).join('');
      content = `<div class="paywall-wrap"><div class="post-body paywall-fade">${free}${gated}</div></div>
        <div class="paywall-gate"><div class="paywall-card">
          <i class="fa-solid fa-lock paywall-icon"></i>
          <h3>Members only</h3>
          <p>This post is for members. Unlock full access instantly.</p>
          <div class="paywall-actions">
            <button class="btn primary" id="unlock-btn"><i class="fa-solid fa-unlock"></i> Unlock Access</button>
            <button class="btn" id="back-btn"><i class="fa-solid fa-arrow-left"></i> Back to posts</button>
          </div>
        </div></div>`;
    } else {
      content = `<div class="post-body">${html}</div>`;
    }

    const liked = localStorage.getItem(`liked:${post.slug}`) === '1';

    app.innerHTML = `
      <header class="post-header">
        <button class="post-back" onclick="Router.back()"><i class="fa-solid fa-arrow-left"></i> All posts</button>
        <span class="post-tag">${Utils.tagIcon(post.tag)} ${post.tag}</span>
        <h1 class="post-title">${post.title}</h1>
        ${post.excerpt ? `<p class="post-excerpt">${post.excerpt.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>` : ''}
        <div class="post-meta">
          <span class="avatar">${post.authorInitials}</span>
          <div class="meta-info">
            <div class="meta-name"><i class="fa-solid fa-user-pen"></i> ${post.author}${post.authorRole ? ` · <span class="meta-role">${post.authorRole}</span>` : ''}</div>
            ${post.authorBio ? `<div class="meta-bio">${post.authorBio}</div>` : ''}
            <div class="meta-details">
              <span><i class="fa-regular fa-calendar"></i> ${date}</span>
              <span class="meta-dot">·</span>
              <span><i class="fa-regular fa-clock"></i> ${post.readTime} read</span>
              ${paywalled ? '<span class="meta-dot">·</span><span class="members-badge"><i class="fa-solid fa-star"></i> Members</span>' : ''}
            </div>
          </div>
          <div class="meta-actions">
            <button class="btn" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button>
            <button class="btn" id="share-btn"><i class="fa-solid fa-share-nodes"></i> Share</button>
          </div>
        </div>
      </header>
      <div class="post-cover" aria-hidden="true"><i class="${TAG_ICONS[post.tag] || TAG_ICONS.Post} post-cover-icon"></i></div>
      ${content}
      <footer class="post-footer">
        <div class="post-tags">
          <button class="tag-chip" onclick="Router.back('${post.tag}')">${Utils.tagIcon(post.tag)} ${post.tag}</button>
          <button class="tag-chip" onclick="Router.back()"><i class="fa-solid fa-grip"></i> All Posts</button>
        </div>
        <div class="meta-actions" style="margin-bottom:var(--space-6)">
          <button class="btn like ${liked ? 'reacted' : ''}" id="like-btn">
            <i class="fa-${liked ? 'solid' : 'regular'} fa-heart"></i> ${liked ? 'Liked' : 'Like'}
          </button>
        </div>
        <div class="post-nav" id="post-nav-btns"></div>
      </footer>`;

    app.querySelector('#like-btn')?.addEventListener('click', function () {
      const is = this.classList.toggle('reacted');
      this.innerHTML = `<i class="fa-${is ? 'solid' : 'regular'} fa-heart"></i> ${is ? 'Liked' : 'Like'}`;
      localStorage.setItem(`liked:${post.slug}`, is ? '1' : '0');
    });

    // Prev / Next post navigation
    const navEl = app.querySelector('#post-nav-btns');
    if (navEl && AppState.posts.length) {
      const idx  = AppState.posts.findIndex(p => p.slug === post.slug);
      const prev = idx < AppState.posts.length - 1 ? AppState.posts[idx + 1] : null; // older
      const next = idx > 0                          ? AppState.posts[idx - 1] : null; // newer
      navEl.innerHTML = `
        ${prev ? `<button class="post-nav-btn" id="nav-prev">
          <div class="nav-label"><i class="fa-solid fa-arrow-left"></i> Older</div>
          <div class="nav-title">${prev.title}</div>
        </button>` : `<button class="post-nav-btn" onclick="Router.back()">
          <div class="nav-label"><i class="fa-solid fa-arrow-left"></i> Back</div>
          <div class="nav-title">Browse all posts</div>
        </button>`}
        ${next ? `<button class="post-nav-btn post-nav-btn--right" id="nav-next">
          <div class="nav-label">Newer <i class="fa-solid fa-arrow-right"></i></div>
          <div class="nav-title">${next.title}</div>
        </button>` : '<div></div>'}`;
      navEl.querySelector('#nav-prev')?.addEventListener('click', () => Router.go(prev.slug));
      navEl.querySelector('#nav-next')?.addEventListener('click', () => Router.go(next.slug));
    }
    app.querySelector('#share-btn')?.addEventListener('click', () => UI.share());
    app.querySelector('#unlock-btn')?.addEventListener('click', () => {
      localStorage.setItem('blogs_member', '1');
      AppState.isMember = true;
      Renderer.renderPost(post);
    });
    app.querySelector('#back-btn')?.addEventListener('click', () => Router.back());

    // Code copy buttons
    app.querySelectorAll('pre').forEach(pre => {
      const wrap = document.createElement('div');
      wrap.className = 'code-block';
      const bar = document.createElement('div');
      bar.className = 'code-block__bar';
      const lang = pre.querySelector('code')?.className.match(/language-(\w+)/)?.[1];
      const langLabel = Object.assign(document.createElement('span'), { className: 'code-lang', textContent: lang || '' });
      bar.appendChild(langLabel);
      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.innerHTML = `<i class="fa-regular fa-copy"></i> Copy`;
      btn.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(pre.textContent); } catch {
          try {
            const ta = Object.assign(document.createElement('textarea'), { value: pre.textContent });
            ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
          } catch { /* clipboard unavailable */ }
        }
        btn.innerHTML = `<i class="fa-solid fa-check"></i> Copied`;
        btn.classList.add('copied');
        setTimeout(() => { btn.innerHTML = `<i class="fa-regular fa-copy"></i> Copy`; btn.classList.remove('copied'); }, 2000);
      });
      bar.appendChild(btn);
      wrap.appendChild(bar);
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
    });

    // Table: scrollable + CSV copy
    app.querySelectorAll('.post-body table, .paywall-fade table').forEach(table => {
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
      const bar = document.createElement('div');
      bar.className = 'table-bar';
      const copyBtn = document.createElement('button');
      copyBtn.className = 'table-copy-btn btn';
      copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i> Copy CSV`;
      copyBtn.addEventListener('click', async () => {
        const rows = [...table.querySelectorAll('tr')];
        const csv  = rows.map(r => [...r.querySelectorAll('th,td')]
          .map(c => `"${c.textContent.replace(/"/g, '""')}"`)
          .join(',')).join('\n');
        try { await navigator.clipboard.writeText(csv); } catch {
          try {
            const ta = Object.assign(document.createElement('textarea'), { value: csv });
            ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
          } catch { /* clipboard unavailable */ }
        }
        copyBtn.innerHTML = `<i class="fa-solid fa-check"></i> Copied`;
        copyBtn.classList.add('copied');
        setTimeout(() => { copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i> Copy CSV`; copyBtn.classList.remove('copied'); }, 2000);
      });
      bar.appendChild(copyBtn);
      wrap.insertBefore(bar, table);
    });

    if (typeof Prism !== 'undefined') Prism.highlightAll();
    window.scrollTo({ top: 0, behavior: 'instant' });

    // In-page anchor links — scroll only, don't trigger router
    app.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const id = decodeURIComponent(a.getAttribute('href').slice(1));
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }
};

// =========================================
// 5. ROUTER — hash-based SPA
// =========================================
const Router = {
  go(slug) {
    history.pushState({ slug }, '', `#/post/${slug}`);
    this.render();
  },
  back(tag) {
    this.setQuery({ tag: tag || null, page: 1 });
  },
  getSlug() {
    const m = location.hash.match(/^#\/post\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  },
  getParams() {
    const qs = new URLSearchParams(location.hash.includes('?') ? location.hash.split('?')[1] : '');
    return {
      tag:  qs.get('tag') || null,
      page: Math.max(1, parseInt(qs.get('page')) || 1)
    };
  },
  setQuery({ tag, page } = {}) {
    const qs = new URLSearchParams();
    if (tag && tag !== 'all') qs.set('tag', tag);
    if (page > 1) qs.set('page', page);
    history.pushState({}, '', qs.toString() ? `#/?${qs.toString()}` : '#/');
    this.render();
  },

  async render() {
    const slug    = this.getSlug();
    const indexEl = document.getElementById('view-index');
    const postEl  = document.getElementById('view-post');
    const readBar = document.getElementById('reading-bar');

    if (slug) {
      // ── POST VIEW ──────────────────────────────────────────────
      indexEl.style.display = 'none';
      postEl.style.display  = '';
      if (readBar) readBar.style.display = '';

      document.querySelectorAll('.nav a, .mobile-nav a').forEach(a =>
        a.classList.toggle('active', a.getAttribute('href') === '#/')
      );

      Utils.qs('#post-article').innerHTML =
        `<div class="loading-spinner"><div class="spinner"></div></div>`;

      try {
        const post = AppState.postsCache[slug] || await DataLoader.fetchBody(slug);
        if (post && post.body) {
          Renderer.renderPost(post);
        } else {
          throw new Error('body missing');
        }
      } catch {
        Utils.qs('#post-article').innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-file-circle-xmark empty-icon"></i>
            <h3>Post not found</h3>
            <p>The post you're looking for doesn't exist or failed to load.</p>
            <button class="btn primary" onclick="Router.back()">
              <i class="fa-solid fa-arrow-left"></i> Back to posts
            </button>
          </div>`;
      }
    } else {
      // ── LIST VIEW ─────────────────────────────────────────────
      indexEl.style.display = '';
      postEl.style.display  = 'none';
      if (readBar) readBar.style.display = 'none';

      // Restore list-view meta
      document.title = `Shanios Blog — Engineering, Linux & Open Source`;
      document.getElementById('canonical-url')?.setAttribute('href', 'https://blog.shani.dev/');
      document.getElementById('og-type')?.setAttribute('content', 'website');
      document.getElementById('og-url')?.setAttribute('content', 'https://blog.shani.dev/');
      ['og-title', 'tw-title'].forEach(id =>
        Utils.qs(`#${id}`)?.setAttribute('content', 'Shanios Blog — Engineering, Linux & Open Source'));
      ['og-desc', 'tw-desc'].forEach(id =>
        Utils.qs(`#${id}`)?.setAttribute('content', CONFIG.HERO_SUB));

      const { tag, page } = this.getParams();
      AppState.filter = tag || 'all';
      AppState.pagination.page = page;

      // Nav active state
      document.querySelectorAll('.nav a, .mobile-nav a').forEach(a => {
        const href = a.getAttribute('href');
        const hrefTag = href?.includes('?tag=') ? href.split('?tag=')[1].toLowerCase() : null;
        const activeTag = tag ? tag.toLowerCase() : null;
        a.classList.toggle('active', hrefTag === activeTag || (!hrefTag && !tag && href === '#/'));
      });

      // Chip active state
      document.querySelectorAll('.chip').forEach(chip =>
        chip.classList.toggle('active', chip.dataset.tag.toLowerCase() === AppState.filter.toLowerCase())
      );

      // Filter + search (case-insensitive tag match)
      let filtered = AppState.filter === 'all'
        ? AppState.posts
        : AppState.posts.filter(p => p.tag.toLowerCase() === AppState.filter.toLowerCase());
      if (AppState.search) {
        const q = AppState.search.toLowerCase();
        filtered = filtered.filter(p =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.tag.toLowerCase().includes(q) ||
          (AppState.postsCache[p.slug]?.body || '').toLowerCase().includes(q)
        );
      }

      // Paginate
      const { perPage } = AppState.pagination;
      const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
      if (AppState.pagination.page > totalPages) AppState.pagination.page = totalPages;
      const start   = (AppState.pagination.page - 1) * perPage;
      const visible = filtered.slice(start, start + perPage);

      const showFeatured = AppState.filter === 'all' && AppState.pagination.page === 1 && !AppState.search;

      const st = Utils.qs('#section-title');
      if (st) st.textContent = AppState.search
        ? `Results for "${AppState.search}"`
        : (AppState.filter === 'all' ? 'Latest Posts' : AppState.filter);

      Renderer.renderPosts(visible, showFeatured);
      Renderer.renderPagination(filtered.length, perPage, AppState.pagination.page);
    }
  }
};

// =========================================
// 6. UI & EVENTS
// =========================================
const UI = {
  showError(title, detail, code) {
    const grid = Utils.qs('#posts-grid');
    if (!grid) return;
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-triangle-exclamation empty-icon" style="color:var(--color-error)"></i>
        <h3>${title}</h3><p>${detail}</p>
        ${code ? `<pre>${code}</pre>` : ''}
      </div>`;
  },
  initTheme() {
    const btn  = Utils.qs('#theme-btn');
    const icon = Utils.qs('#theme-icon');
    const PRISM_DARK  = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css';
    const PRISM_LIGHT = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css';
    const apply = t => {
      document.documentElement.setAttribute('data-theme', t);
      AppState.theme = t;
      localStorage.setItem('blogs-theme', t);
      if (icon) icon.className = t === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      const prismLink = document.getElementById('prism-theme');
      if (prismLink) prismLink.href = t === 'dark' ? PRISM_DARK : PRISM_LIGHT;
    };
    apply(AppState.theme);
    btn?.addEventListener('click', () =>
      apply(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')
    );
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('blogs-theme')) apply(e.matches ? 'dark' : 'light');
    });
  },
  initMenu() {
    const btn = Utils.qs('#menu-toggle');
    const nav = Utils.qs('#mobile-nav');
    btn?.addEventListener('click', () => {
      const open = nav?.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav?.setAttribute('aria-hidden', open ? 'false' : 'true');
    });
    nav?.addEventListener('click', e => {
      if (e.target.tagName === 'A' || e.target.closest('a')) {
        nav.classList.remove('open');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        nav.setAttribute('aria-hidden', 'true');
      }
    });
  },
  initSearch() {
    const toggleBtn = Utils.qs('#search-toggle');
    const closeBtn  = Utils.qs('#search-close');
    const searchBar = Utils.qs('#search-bar');
    const input     = Utils.qs('#search-input');
    toggleBtn?.addEventListener('click', () => {
      const open = searchBar.classList.toggle('open');
      searchBar.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open) setTimeout(() => input?.focus(), 80);
    });
    closeBtn?.addEventListener('click', () => {
      searchBar.classList.remove('open');
      searchBar.setAttribute('aria-hidden', 'true');
      if (input) { input.value = ''; input.dispatchEvent(new Event('input')); }
    });
    input?.addEventListener('input', e => {
      AppState.search = e.target.value.toLowerCase().trim();
      if (Router.getSlug()) return;
      AppState.pagination.page = 1; // reset to page 1 on every search keystroke
      Router.render();
      const live = Utils.qs('#search-live');
      if (live && AppState.search) {
        const q = AppState.search;
        const count = AppState.posts.filter(p =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.tag.toLowerCase().includes(q) ||
          (AppState.postsCache[p.slug]?.body || '').toLowerCase().includes(q)
        ).length;
        live.textContent = `${count} result${count !== 1 ? 's' : ''} for ${AppState.search}`;
      } else if (live) {
        live.textContent = '';
      }
    });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchBar.classList.add('open');
        searchBar.setAttribute('aria-hidden', 'false');
        setTimeout(() => input?.focus(), 80);
      }
      if (e.key === 'Escape' && searchBar.classList.contains('open')) {
        searchBar.classList.remove('open');
        searchBar.setAttribute('aria-hidden', 'true');
        if (input) { input.value = ''; input.dispatchEvent(new Event('input')); }
      }
    });
  },
  initFilters() {
    const bar = Utils.qs('#tag-bar');
    if (!bar) return;
    const tags = ['all', ...new Set(AppState.posts.map(p => p.tag))];
    bar.innerHTML = tags.map(t =>
      `<button class="chip ${t === AppState.filter ? 'active' : ''}" data-tag="${t}">
        ${t !== 'all' ? `<i class="${TAG_ICONS[t] || 'fa-solid fa-tag'}" aria-hidden="true"></i> ` : ''}${t === 'all' ? 'All' : t}
      </button>`
    ).join('');
    bar.addEventListener('click', e => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      bar.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.search = '';
      const input = Utils.qs('#search-input');
      if (input) input.value = '';
      Router.setQuery({ tag: btn.dataset.tag === 'all' ? null : btn.dataset.tag, page: 1 });
    });
  },
  initBackTop() {
    const btn = Utils.qs('#back-top');
    if (!btn) return;
    window.addEventListener('scroll', () => btn.classList.toggle('show', window.scrollY > 400), { passive: true });
    btn.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
  },
  initReadingBar() {
    const bar = Utils.qs('#reading-bar');
    if (!bar) return;
    window.addEventListener('scroll', () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = total > 0 ? (window.scrollY / total * 100) + '%' : '0%';
    }, { passive: true });
  },
  initLogoLink() {
    Utils.qs('#logo-link')?.addEventListener('click', e => { e.preventDefault(); Router.back(); });
  },
  share() {
    const url = location.href;
    const title = document.title;
    if (navigator.share) {
      navigator.share({ title, url });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        const toast = Object.assign(document.createElement('div'), {
          className: 'toast',
          innerHTML: '<i class="fa-solid fa-check"></i> Link copied'
        });
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2000);
      });
    }
  }
};

// =========================================
// 7. BOOTSTRAP
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
  Renderer.applyBranding();
  UI.initTheme();
  UI.initMenu();
  UI.initBackTop();
  UI.initReadingBar();
  UI.initSearch();
  UI.initLogoLink();

  // Legacy post.html redirect
  if (location.pathname.includes('post.html')) {
    const slug = new URLSearchParams(location.search).get('slug');
    if (slug) { location.replace(`index.html#/post/${encodeURIComponent(slug)}`); return; }
  }

  const loadGrid = Utils.qs('#posts-grid');
  if (loadGrid) loadGrid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

  const posts = await DataLoader.load();
  if (posts) {
    AppState.posts = posts;
    Renderer.renderHero(posts);
    UI.initFilters();
    Router.render();
  }

  window.addEventListener('hashchange', () => Router.render());
  window.addEventListener('popstate',   () => Router.render());
});
