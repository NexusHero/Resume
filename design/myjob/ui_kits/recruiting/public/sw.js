/* myJob service worker (ADR-0028) — makes the recruiting kit an installable,
   offline-capable PWA with a hand-rolled runtime cache (no Workbox dependency).

   Strategy:
   - /api/*        → network only (live data is never cached).
   - navigations   → network-first, falling back to the cached app shell offline.
   - static assets → cache-first (hashed JS/CSS, fonts, icons), populated on miss.

   Bump CACHE_VERSION to drop the old cache on the next deploy. */
const CACHE_VERSION = 'myjob-v1';
const APP_SHELL = './index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.add(APP_SHELL))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let cross-origin requests pass through
  if (url.pathname.startsWith('/api')) return; // live data — always hit the network

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches
            .open(CACHE_VERSION)
            .then((c) => c.put(APP_SHELL, copy))
            .catch(() => {});
          return res;
        })
        .catch(() => caches.match(APP_SHELL)),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches
              .open(CACHE_VERSION)
              .then((c) => c.put(req, copy))
              .catch(() => {});
          }
          return res;
        }),
    ),
  );
});
