# ADR-0039 — Richer offline experience

- **Status:** Accepted — the **service-worker v2** implementation below is
  superseded by ADR-0041 (Workbox via vite-plugin-pwa), which keeps the same
  strategy (SWR assets, `/api` network-only, offline shell) but replaces the
  hand-rolled worker and the manual `CACHE_VERSION` with revision-hashed
  precaching. The connectivity feedback (`useOnline`/`OfflineBanner`) is
  unaffected.
- **Relates to:** ADR-0028 (installable PWA), ADR-0041 (Workbox service worker)

## Context

ADR-0028 made the kit an installable PWA with a hand-rolled service worker: the
app shell is cached, static assets are cached-first, and `/api` is network-only.
That is enough to install, but the offline experience is thin — a user who loses
connectivity gets silent fetch failures with no explanation, and a redeploy's
assets only propagate on a hard reload (cache-first serves the old ones until
evicted).

We deliberately keep **`/api` network-only**: caching per-user recruiting data on
the device is a privacy call we don't want to make implicitly. So "richer
offline" here means clearer feedback and more reliable shell/asset caching, not
offline data editing.

## Decision

- **Connectivity feedback in the app.** A `useOnline()` hook tracks
  `navigator.onLine` and the `online`/`offline` events (degrading to "online"
  where `navigator.onLine` is absent, so it never falsely blocks the UI). An
  `OfflineBanner` — a slim fixed status bar — shows while offline, telling the
  user their last-loaded view is still readable and that changes won't save until
  they reconnect. Mounted in both the login and authed shells.
- **Service worker v2 (stale-while-revalidate for assets).** Hashed JS/CSS/fonts/
  icons are served from cache instantly, then refreshed in the background, so a
  redeploy propagates without a hard reload while offline loads still work from
  whatever is cached. `/api` stays network-only.
- **Cold-install offline fallback.** A navigation that finds neither the network
  nor a cached shell now returns a small built-in offline page instead of a
  browser error.

## Consequences

- Losing connectivity is now legible: the banner explains the state instead of
  the app failing silently, and the installed shell keeps rendering the last
  loaded data. Redeploys pick up fresh assets on the next visit without a manual
  reload.
- Still **no offline data editing** — `/api` is network-only by design (privacy);
  writes fail while offline, which the banner now sets the expectation for.
- Verifiable parts are locked by tests: the `useOnline` hook + banner
  (show/hide on connectivity events, degrade-to-online) as component tests, and
  the service-worker source (stale-while-revalidate shape, offline fallback,
  bumped cache version) at the source level. **On-device** offline behaviour
  (real install, airplane-mode reload) still has to be confirmed on a phone —
  these tests lock the parts we can.
