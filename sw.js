// sw.js — blog.shani.dev
// Ported from docs.shani.dev's service worker. Gives the blog real offline
// support instead of just an installable manifest.json with no caching.
const SHELL_CACHE = 'shaniblog-20260830';
const POST_CACHE  = 'shaniblog-posts-v1';
const SHELL = [
  '/',
  '/index.html',
  '/404.html',
  '/brand-shani.css',
  '/style.css',
  '/config-shani.js',
  '/utils.js',
  '/script.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.addAll(SHELL))
      // addAll() is all-or-nothing — if a single SHELL url 404s, the whole
      // install silently fails and nothing gets cached. Log which one broke
      // instead of swallowing it, and don't let install() reject outright
      // (better to have a partially-working SW than none at all).
      .catch(err => console.error('[sw] shell precache failed:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(k => k !== SHELL_CACHE && k !== POST_CACHE)
        .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // 1) App shell — cache first
  if (SHELL.includes(url.pathname)) {
    e.respondWith(caches.match(request).then(c => c || fetch(request)));
    return;
  }

  // 2) Markdown posts — stale-while-revalidate, same pattern as docs
  if (url.pathname.startsWith('/posts/') && url.pathname.endsWith('.md')) {
    e.respondWith(
      caches.open(POST_CACHE).then(async cache => {
        const cached = await cache.match(request);
        const network = fetch(request).then(res => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // 3) Navigations (post/tag/index pages under the SPA router) — network
  //    first, falling back to the cached shell so a mid-air network drop
  //    still renders the app instead of the browser's default offline page.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 4) Everything else — network with cache fallback
  e.respondWith(fetch(request).catch(() => caches.match(request)));
});
