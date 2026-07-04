/* myJob service worker (ADR-0028 installable PWA, ADR-0039 richer offline).

   Built with Workbox via vite-plugin-pwa's `injectManifest` mode: the plugin
   injects a precache manifest of the built assets — each entry carrying a
   content-revision hash — into `self.__WB_MANIFEST`, and we keep explicit
   control of the routing that this deployment needs. The kit is served under a
   subpath with a relative base (`design/.../recruiting/dist`, ADR-0028) and
   under a strict CSP (`script-src 'self'`, ADR-0004), so the worker is bundled
   from source (same-origin, CSP-safe) rather than pulled from a Workbox CDN.

   Why Workbox over the previous hand-rolled cache: precaching with revision
   hashes means a redeploy's changed files are re-fetched *exactly* (no manual
   `CACHE_VERSION` bump, no stale-asset guesswork), and the strategy
   implementations below are Workbox's audited ones rather than our own.

   Strategy — unchanged in intent from the hand-rolled worker it replaces:
   - precache      → all built assets (`self.__WB_MANIFEST`), revision-hashed.
   - navigations   → app-shell fallback to the precached index.html, so the
                     installed shell loads offline (precached at install time,
                     so even a cold install already has it — no offline gap).
   - /api/*        → NetworkOnly: live recruiting data is never cached (privacy,
                     ADR-0039).
   - static assets → StaleWhileRevalidate: served from cache instantly, then
                     refreshed in the background so redeploys propagate without a
                     hard reload while offline loads still work from cache. */
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { clientsClaim } from 'workbox-core';

// Take over open clients as soon as this worker activates, so a redeploy's SW
// controls the page without waiting for every tab to close.
self.skipWaiting();
clientsClaim();

// Precache the built assets injected by vite-plugin-pwa (revision-hashed), and
// serve them from the precache on matching requests.
precacheAndRoute(self.__WB_MANIFEST);

// Live data is always network, never cached (privacy). Registered before the
// navigation fallback so an `/api` request can never be answered by the shell.
registerRoute(({ url }) => url.pathname.startsWith('/api'), new NetworkOnly());

// App-shell navigation fallback: serve the precached index.html for navigations,
// so the installed shell renders offline. `/api` is never a navigation, but deny
// it explicitly so a stray navigation there is never answered with the shell.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/api/] }),
);

// Same-origin static assets not covered by the precache (e.g. late-loaded
// fonts/images) → stale-while-revalidate: instant from cache, refreshed in the
// background.
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    ['style', 'script', 'worker', 'image', 'font'].includes(request.destination),
  new StaleWhileRevalidate({ cacheName: 'myjob-assets' }),
);
