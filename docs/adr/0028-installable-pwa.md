# ADR-0028 — Installable PWA (manifest + hand-rolled service worker)

- **Status:** Accepted (E2) — the **service-worker** part is superseded by
  ADR-0041 (Workbox via vite-plugin-pwa); the manifest, PNG icons, registration
  guard and offline-shell scope below still stand.
- **Relates to:** ADR-0025/0026/0027 (the responsive UI this makes installable), ADR-0004 (the strict recruiting-kit CSP)

## Context

The recruiting kit is now responsive end-to-end (E1). E2 turns it into an
**installable Progressive Web App** — the concrete answer to "can this run on
Android/iOS as an app": add it to the home screen, launch it standalone (no
browser chrome), and have the shell load without a connection. No native
wrapper (Capacitor) is needed for this step.

Constraints the kit imposes:

- It is a **Vite build served by Express** under a subpath
  (`/design/myjob/ui_kits/recruiting/dist`), not the origin root.
- It runs under a **strict CSP** (`default-src 'self'`, `script-src 'self'`, …).
- It uses a **global-React, classic-JSX** module model with no bundler plugins.

## Decision

- **A web app manifest** (`public/manifest.webmanifest`): `display: standalone`,
  brand `theme_color`/`background_color` (`#0b1220`), relative `start_url`/`scope`
  (`./`) so install works at the subpath, and 192/512 PNG icons marked
  `purpose: "any maskable"`.
- **PNG icons generated from the bar-mark**, not hand-drawn or SVG-only: iOS
  ignores manifest SVGs for the home screen, so `tools/generate-pwa-icons.mjs`
  rasterises the mark (full-bleed ink tile, bars centered inside the maskable
  safe zone) to 192/512 plus a 180 px `apple-touch-icon`, using the environment's
  Chromium. The PNGs are committed; the script is re-run only when the mark
  changes.
- **A hand-rolled service worker** (`public/sw.js`), no Workbox dependency —
  consistent with the kit's plugin-free model. Strategy: `/api/*` is network-only
  (live data is never cached), navigations are network-first with the cached app
  shell as the offline fallback, and static assets (hashed JS/CSS, fonts, icons)
  are cache-first. A `CACHE_VERSION` bump drops the old cache on deploy.
- **Registration is a guarded fire-and-forget** in `main.jsx`
  (`if ('serviceWorker' in navigator) … register('./sw.js', { scope: './' })`),
  so a failure (no HTTPS in dev, unsupported browser) never breaks the app.
- **No CSP change needed:** the manifest is covered by `default-src 'self'` and
  the same-origin worker by the `script-src 'self'` fallback chain. Vite copies
  `public/` verbatim into `dist/`; Express already serves `dist/` statically, so
  the manifest, SW and icons are served same-origin at the kit's scope.

## Consequences

- The suite is installable to the home screen on Android (Chrome) and iOS
  (Safari → Add to Home Screen), launches standalone, and the shell loads offline
  after the first visit. Live data still requires the network by design (the SW
  never caches `/api`).
- **On-device install cannot be verified in CI or this environment** — it needs a
  real device over HTTPS. The parts that _are_ checkable are locked by 7 Vitest
  tests (manifest core fields + 192/512 + maskable, index.html PWA tags, the SW's
  install/activate/fetch handlers and its API bypass, and the guarded
  registration). Treat the device install as a manual acceptance step.
- The offline story is deliberately shallow: an offline **shell**, not offline
  **data**. A richer offline mode (queuing writes, caching read models) is a
  separate, larger effort and is out of scope here.
- The next mobile step, if wanted, is a Capacitor wrapper for the app-store
  presence — it reuses this same build, manifest and icons.
