/**
 * utils.js — Shared utilities for blog.shani.dev
 * ─────────────────────────────────────────────────────────────────
 * Extracted from script.js so both the public SPA and admin.html
 * can use the same markdown pipeline without any duplication.
 *
 * Load order:
 *   <script src="/config-shani.js"></script>   ← defines CONFIG
 *   <script src="/utils.js"></script>           ← defines Utils, TAG_ICONS
 *   <script src="/script.js"></script>          ← uses Utils, TAG_ICONS
 *
 * admin.html:
 *   <script src="/config-shani.js"></script>
 *   <script src="/utils.js"></script>           ← only this needed for preview
 * ─────────────────────────────────────────────────────────────────
 */

if (typeof CONFIG === 'undefined') {
  throw new Error('[utils.js] No CONFIG found. Load config-shani.js before utils.js.');
}

// ── Tag icons — driven by CONFIG.TAG_ICONS ────────────────────────
// Falls back to a built-in set if the config does not provide TAG_ICONS.
const TAG_ICONS = (CONFIG.TAG_ICONS && Object.keys(CONFIG.TAG_ICONS).length)
  ? CONFIG.TAG_ICONS
  : {
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
    };

// =========================================
// UTILS
// =========================================
const Utils = {
  qs: (sel, root) => (root || document).querySelector(sel),

  escapeHtml: str => String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;'),

  // safeText — use for text nodes rendered via innerHTML (NOT attributes).
  // Only escapes & < > so apostrophes and quotes display correctly.
  safeText: str => String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),

  fmtDate: str => {
    const d = new Date(str + 'T00:00:00');
    const locale = CONFIG.DATE_LOCALE || 'en-US';
    return isNaN(d) ? str : d.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
  },

  fmtDateShort: str => {
    const d = new Date(str + 'T00:00:00');
    const locale = CONFIG.DATE_LOCALE || 'en-US';
    return isNaN(d) ? str : d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  },

  tagIcon: tag => `<i class="${TAG_ICONS[tag] || TAG_ICONS.Post}" aria-hidden="true"></i>`,

  parseFrontmatter: raw => {
    const md = raw.replace(/^\uFEFF/, '');
    const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) return { fm: {}, body: md };
    const fm = {};
    match[1].split(/\r?\n/).forEach(line => {
      const i = line.indexOf(':');
      if (i < 1) return;
      const key = line.slice(0, i).trim();
      // Preserve everything after the first colon (handles URLs, timestamps, etc.)
      const raw = line.slice(i + 1).trim();
      // Strip only the outermost matching quote pair: 'value' or "value" or `value`
      fm[key] = raw.replace(/^(['"`])([\s\S]*)\1$/, '$2');
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
        catch { return ''; }
      });
      part = part.replace(/(?<!\$)\$([^\n$]+?)\$(?!\$)/g, (_, expr) => {
        try { return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false }); }
        catch { return ''; }
      });
      return part;
    }).join('');
  },

  // ─── MEDIA SHORTCODES ───────────────────────────────────────────
  _mediaBlocks: {},
  _mediaToken(html) {
    const key = `MBLOCK_${Object.keys(Utils._mediaBlocks).length}_END`;
    Utils._mediaBlocks[key] = html;
    return '\n\n' + key + '\n\n';
  },
  _cap: raw => {
    const pipe = raw.lastIndexOf('|');
    return pipe === -1
      ? { val: raw.trim(), caption: '' }
      : { val: raw.slice(0, pipe).trim(), caption: raw.slice(pipe + 1).trim() };
  },
  _youtube(id, caption) {
    const fig = caption ? `<figcaption>${caption}</figcaption>` : '';
    return `<figure class="media-embed"><div class="media-embed__ratio"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${caption || 'YouTube video'}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>${fig}</figure>`;
  },
  _vimeo(id, caption) {
    const fig = caption ? `<figcaption>${caption}</figcaption>` : '';
    return `<figure class="media-embed"><div class="media-embed__ratio"><iframe src="https://player.vimeo.com/video/${id}?dnt=1" title="${caption || 'Vimeo video'}" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>${fig}</figure>`;
  },
  _video(src, caption) {
    const fig  = caption ? `<figcaption>${caption}</figcaption>` : '';
    const ext  = src.split('?')[0].split('.').pop().toLowerCase();
    const mime = { mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg', mov: 'video/mp4' }[ext] || 'video/mp4';
    return `<figure class="media-figure media-figure--video"><video controls preload="metadata" playsinline loading="lazy"><source src="${src}" type="${mime}">Your browser doesn't support HTML video. <a href="${src}">Download it</a>.</video>${fig}</figure>`;
  },
  _audio(src, caption) {
    const fig = caption ? `<figcaption>${caption}</figcaption>` : '';
    return `<figure class="media-figure media-figure--audio"><audio controls preload="metadata" loading="lazy"><source src="${src}">Your browser doesn't support HTML audio. <a href="${src}">Download it</a>.</audio>${fig}</figure>`;
  },
  _image(src, rest) {
    const parts   = rest.split('|').map(s => s.trim());
    const alt     = parts[0] || '';
    const caption = parts[1] !== undefined ? parts[1] : alt;
    const wide    = parts[2] === 'wide';
    const fig     = caption ? `<figcaption>${caption}</figcaption>` : '';
    return `<figure class="media-figure${wide ? ' media-figure--wide' : ''}"><img src="${src}" alt="${alt}" loading="lazy">${fig}</figure>`;
  },
  _stripTocBlock(text) {
    return text
      .replace(/^#{1,3}\s+(?:table\s+of\s+)?contents?\s*\n[\s\S]*?(?=\n(?=#{1,3}\s))/im, '')
      .replace(/^\[\[?toc\]?\]\s*$/im, '')
      .trim();
  },

  // ─── TABLE OF CONTENTS ──────────────────────────────────────────
  _buildToc(text) {
    const headings = [];
    const re = /^(#{2,3})\s+(.+)$/gm;
    let m;
    while ((m = re.exec(text)) !== null) {
      const level = m[1].length;
      const raw   = m[2]
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\*+|`|_+|~+/g, '')
        .trim();
      if (/^(?:table\s+of\s+)?contents?$/i.test(raw)) continue;
      const id = Utils.slugify(raw);
      headings.push({ level, text: raw, id });
    }
    if (headings.length < 2) return '';
    let html = '<nav class="toc" aria-label="Table of contents"><p class="toc__title"><i class="fa-solid fa-list-ul" aria-hidden="true"></i> Contents</p><ol class="toc__list">';
    let inSub = false;
    headings.forEach((h, i) => {
      if (h.level === 2) {
        if (inSub) { html += '</li></ol></li>'; inSub = false; }
        else if (i > 0) html += '</li>';
        html += `<li class="toc__item"><a href="#${h.id}">${h.text}</a>`;
      } else {
        if (!inSub) { html += '<ol class="toc__sub">'; inSub = true; }
        else html += '</li>';
        html += `<li class="toc__item toc__item--sub"><a href="#${h.id}">${h.text}</a>`;
      }
    });
    if (inSub) html += '</li></ol></li>';
    else html += '</li>';
    html += '</ol></nav>';
    return html;
  },

  _processShortcodes(text) {
    Utils._mediaBlocks = {};
    if (/\[\[?toc\]?\]/i.test(text)) {
      const tocHtml = Utils._buildToc(text);
      text = text.replace(/\[\[?toc\]?\]/gi, tocHtml ? Utils._mediaToken(tocHtml) : '');
    }
    text = text.replace(
      /^#{1,3}\s+(?:table\s+of\s+)?contents?\s*\n[\s\S]*?(?=\n(?=#{1,3}\s))/im,
      (match) => {
        const tocHtml = Utils._buildToc(text);
        return tocHtml ? Utils._mediaToken(tocHtml) : '';
      }
    );
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
    html = html.replace(/<p>(MBLOCK_\d+_END)<\/p>/g, (_, token) => Utils._mediaBlocks[token] || '');
    html = html.replace(/MBLOCK_\d+_END/g, token => Utils._mediaBlocks[token] || '');
    return html;
  },

  safeMarkdown: text => {
    if (typeof marked !== 'undefined') {
      text = Utils._processShortcodes(text);
      const renderer = new marked.Renderer();

      renderer.code = (codeOrToken, lang) => {
        const code    = (codeOrToken && typeof codeOrToken === 'object') ? codeOrToken.text : codeOrToken;
        const rawLang = (codeOrToken && typeof codeOrToken === 'object') ? codeOrToken.lang : lang;
        const safeLang = ((rawLang || '').split(/\s/)[0]);
        const cls = safeLang ? `class="language-${safeLang}"` : '';
        const escaped = (code || '')
          .replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        return `<pre><code ${cls}>${escaped}</code></pre>\n`;
      };

      renderer.heading = (textOrToken, level) => {
        const text  = (textOrToken && typeof textOrToken === 'object') ? (textOrToken.text || '') : textOrToken;
        const depth = (textOrToken && typeof textOrToken === 'object') ? textOrToken.depth : level;
        const plain = text.replace(/<[^>]+>/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
        const id = Utils.slugify(plain);
        return `<h${depth} id="${id}">${text}<a class="heading-anchor" href="#${id}" aria-hidden="true">#</a></h${depth}>\n`;
      };

      renderer.link = (hrefOrToken, title, linkText) => {
        const href = (hrefOrToken && typeof hrefOrToken === 'object') ? hrefOrToken.href  : hrefOrToken;
        const ttl  = (hrefOrToken && typeof hrefOrToken === 'object') ? hrefOrToken.title : title;
        const txt  = (hrefOrToken && typeof hrefOrToken === 'object') ? hrefOrToken.text  : linkText;
        const isExternal = href && !href.startsWith('#') && !href.startsWith('/');
        const t   = ttl ? ` title="${ttl}"` : '';
        const ext = isExternal ? ` target="_blank" rel="noopener noreferrer"` : '';
        return `<a href="${href}"${t}${ext}>${txt}</a>`;
      };

      renderer.image = (srcOrToken, title, alt) => {
        const src     = (srcOrToken && typeof srcOrToken === 'object') ? srcOrToken.href : srcOrToken;
        const ttl     = (srcOrToken && typeof srcOrToken === 'object') ? srcOrToken.title : title;
        const altText = (srcOrToken && typeof srcOrToken === 'object') ? srcOrToken.text  : alt;
        const t       = ttl ? ` title="${ttl}"` : '';
        const caption = altText || ttl;
        const fig     = caption ? `<figcaption>${caption}</figcaption>` : '';
        return `<figure class="media-figure"><img src="${src}" alt="${altText || ''}"${t} loading="lazy">${fig}</figure>`;
      };

      renderer.blockquote = (quoteOrToken) => {
        const quote = (quoteOrToken && typeof quoteOrToken === 'object')
          ? (quoteOrToken.body || quoteOrToken.text || '')
          : quoteOrToken;
        const match = quote.match(/^<p>\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]([\s\S]*)/i);
        if (match) {
          const type = match[1].toUpperCase();
          const cfg  = Utils.CALLOUT_TYPES[type] || Utils.CALLOUT_TYPES.NOTE;
          const body = match[2].replace(/<\/p>$/, '').replace(/^(\s*<br\s*\/?>\s*|\n)/i, '').trim();
          return `<div class="callout ${cfg.cls}" role="note"><div class="callout__title"><i class="${cfg.icon}" aria-hidden="true"></i>${type}</div><div class="callout__body">${body}</div></div>\n`;
        }
        return `<blockquote>${quote}</blockquote>\n`;
      };

      let raw = marked.parse(text, { renderer, gfm: true, breaks: false });
      raw = Utils.renderMath(raw);

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
                     'poster', 'dnt'],
        });
      }

      return Utils._restoreShortcodes(raw);
    }
    return text.replace(/\n/g, '<br>');
  },

  readTime: body => {
    const wpm = CONFIG.WORDS_PER_MINUTE || 200;
    return `${Math.max(1, Math.ceil(body.trim().split(/\s+/).length / wpm))} min`;
  },
};
