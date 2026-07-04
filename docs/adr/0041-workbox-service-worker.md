# ADR-0041 — Workbox service worker (vite-plugin-pwa)

- **Status:** Accepted
- **Supersedes:** the hand-rolled service-worker decision in ADR-0028 and its v2
  in ADR-0039 (the manifest, icons, registration guard and "no offline data"
  scope of those ADRs still stand — only the worker implementation changes).
- **Relates to:** ADR-0004 (the strict recruiting-kit CSP), ADR-0040 (Capacitor
  reuses this same build).

## Context

ADR-0028 shipped an installable PWA with a **hand-rolled** service worker and
ADR-0039 grew it to v2 (stale-while-revalidate assets, a manual `CACHE_VERSION`,
a built-in offline page). That worker was correct but carried the two failure
modes hand-rolled service workers are known for:

- **Cache invalidation by hand.** Assets were kept fresh with a manually bumped
  `CACHE_VERSION` and a stale-while-revalidate guess. Forget the bump and users
  keep stale files; there is no per-file content check.
- **Hand-written caching logic** for install/activate/fetch, offline fallback and
  the API bypass — exactly the surface where subtle bugs (a mis-scoped `caches`
  key, a fallback that swallows an error) hide, and which we can only test at the
  source level (on-device behaviour is a manual step, unchanged here).

The kit's own principle is _use good packages where they fit rather than
hand-rolling_ — and for service workers the industry-standard package is
**Workbox** (Google's PWA library, what `create-react-app`, Vite and Next PWA
setups all generate under the hood). We adopt it via **`vite-plugin-pwa`**, the
maintained Vite integration.

Two kit constraints shape _how_ we adopt it:

- It is a **Vite build served by Express under a subpath** with a **relative
  base** (`base: './'`, `design/.../recruiting/dist`), so the worker's routing
  must stay relative — an absolute-origin assumption would break the scope.
- It runs under a **strict CSP** (`script-src 'self'`, ADR-0004), so the worker
  and its registration must be **same-origin bundled code**, never a CDN import
  or an inline `<script>`.

## Decision

Adopt Workbox via `vite-plugin-pwa` in **`injectManifest` mode**, not
`generateSW`:

- **`injectManifest` keeps our routing, Workbox provides the machinery.** We
  keep a small hand-written `sw.js` (the routes: precache, `/api` NetworkOnly,
  the app-shell NavigationRoute, stale-while-revalidate assets) — the exact
  behaviour ADR-0028/0039 specified — while the plugin injects a
  **revision-hashed precache manifest** (`self.__WB_MANIFEST`) and Workbox
  supplies the audited strategy implementations. We chose this over `generateSW`
  because the fully-generated worker's `navigateFallback` under a relative base +
  subpath scope is precisely the behaviour we cannot verify in CI or this
  environment; retaining explicit relative routing keeps the proven behaviour and
  the risk visible.
- **Precaching replaces the manual `CACHE_VERSION`.** Every built asset is
  precached with a content hash, so a redeploy re-fetches exactly the files that
  changed — no manual version bump, no stale-asset guessing. The app shell
  (`index.html`) is precached at install time, so even a cold install renders
  offline (this subsumes ADR-0039's built-in offline page — there is no
  cold-install gap left to fall back from).
- **CSP-safe by construction.** The worker is bundled from source (same-origin),
  and registration is imported into `main.jsx` via the plugin's
  `virtual:pwa-register` module (`injectRegister: false`) — a bundled module, not
  the inline registration script `generateSW`'s default would emit, which
  `script-src 'self'` would reject.
- **The existing manifest and icons are untouched** (`manifest: false`): the
  hand-written `public/manifest.webmanifest` and its `<link>` in `index.html`
  (relative `start_url`/`scope`, 192/512 maskable PNGs) already work at the
  subpath, so the plugin does not regenerate or re-inject them.
- **`registerType: 'autoUpdate'`:** a redeployed worker takes over and reloads to
  the fresh shell without a user prompt — appropriate for an internal tool where
  "always latest" beats an update toast.

## Consequences

- Cache invalidation is now Workbox's job: redeploys propagate by content hash,
  removing the manual-`CACHE_VERSION` footgun ADR-0039 lived with. The caching
  logic is a maintained library's, not ours.
- **The dependency cost is real but build-time only.** `vite-plugin-pwa`
  (+ `workbox-build` and the `workbox-*` runtime it bundles into the worker) is a
  dev dependency; it adds a `workbox-window` chunk (~6 kB) to the client for
  registration and the bundled worker. Nothing new reaches the server.
- **The same honesty bound as ADR-0028 holds.** On-device install and
  airplane-mode reload still cannot be verified in CI — they are a manual
  acceptance step on a real device over HTTPS. The parts we _can_ lock are locked
  by the rewritten `pwa.test.js`: the manifest and index.html tags (unchanged),
  the worker's precache/`__WB_MANIFEST`, NetworkOnly-`/api`, app-shell
  NavigationRoute and stale-while-revalidate routes, the `injectManifest` build
  wiring, and the `virtual:pwa-register` registration. `npm run build:web` is the
  integration gate — it fails if the worker can't be bundled or the manifest
  can't be injected.
- If the relative-base/subpath routing ever needs to change, it changes in _our_
  `sw.js`, in the open, rather than inside a generated file we don't own.
