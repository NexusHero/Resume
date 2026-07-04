/* myJob service worker (ADR-0028, richer offline ADR-0039) — makes the recruiting
   kit an installable, offline-capable PWA with a hand-rolled runtime cache (no
   Workbox dependency).

   Strategy:
   - /api/*        → network only (live data is never cached — privacy).
   - navigations   → network-first, falling back to the cached app shell, then to
                     a built-in offline page when nothing is cached yet.
   - static assets → stale-while-revalidate (serve the cached hashed JS/CSS/fonts/
                     icons instantly, then refresh the cache in the background).

   Bump CACHE_VERSION to drop the old cache on the next deploy. */
const CACHE_VERSION = 'myjob-v2';
const APP_SHELL = './index.html';
const OFFLINE_HTML =
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Offline — myJob</title>' +
  '<body style="margin:0;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;background:#0f1720;color:#e5e7eb">' +
  '<div style="text-align:center;padding:24px"><h1 style="font-size:20px;margin:0 0 8px">You’re offline</h1>' +
  '<p style="color:#9ca3af;font-size:14px;margin:0">Reconnect and reopen myJob — it loads from cache once it has been opened online at least once.</p></div>';
const offlineResponse = () =>
  new Response(OFFLINE_HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } });

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
        // Offline: the cached shell, or a built-in offline page on a cold install.
        .catch(() => caches.match(APP_SHELL).then((hit) => hit || offlineResponse())),
    );
    return;
  }

  // Static assets: stale-while-revalidate — serve the cache instantly, then
  // refresh it in the background so a redeploy's assets propagate without a hard
  // reload, while offline loads still work from whatever is cached.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches
              .open(CACHE_VERSION)
              .then((c) => c.put(req, copy))
              .catch(() => {});
          }
          return res;
        })
        .catch(() => hit); // offline: fall back to whatever we cached
      return hit || network;
    }),
  );
});
