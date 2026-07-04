# ADR-0040 — Capacitor native app wrapper

- **Status:** Accepted
- **Relates to:** ADR-0028 (installable PWA), ADR-0039 (richer offline)

## Context

The recruiting kit is already an installable PWA. To also reach the Apple App
Store and Google Play — where some buyers expect a "real app" — we want a native
wrapper without forking the UI into a second codebase. The realistic options
were a full native rewrite, React Native, or a WebView wrapper
(Capacitor/Cordova). A rewrite duplicates the whole product; React Native
re-implements the UI. Capacitor wraps the exact web build in a native WebView,
so there is one UI and one release path.

A constraint on _this_ environment: CI has no Android SDK or Xcode, so native
platform projects can't be generated or built here — only the web-side wiring
can be committed and verified.

## Decision

Adopt **Capacitor** as the native wrapper, committing only the web-side wiring:

- `capacitor.config.ts` at the repo root, with `webDir` pointing at the Vite
  build output (`design/myjob/ui_kits/recruiting/dist`).
- `@capacitor/core` + `@capacitor/cli` as dev dependencies and `cap:sync` /
  `cap:add:android` / `cap:add:ios` npm scripts.
- The generated `android/` and `ios/` projects are **gitignored** — they are
  created with `cap add` on a developer machine that has the SDK/Xcode.
- **API origin** is called out explicitly (config comments + `docs/native-app.md`):
  because the app is cookie-session authenticated and calls relative `/api/v1`,
  the native build must either load from the hosted origin via `server.url`
  (recommended — cookies/relative paths just work) or bundle the assets and set
  `window.RECRUIT_API` to the absolute backend URL with cross-origin CORS +
  `SameSite=None; Secure` cookies. The `window.RECRUIT_API` seam already exists
  in `data.js`, so no app-code change is needed.

## Consequences

- One codebase ships to web, PWA install, and both native stores. Each release
  is `npm run cap:sync` then a native build.
- **Honestly bounded:** what CI can verify is locked by a small source-level test
  (config `webDir`/`appId`/`appName`, scripts present). Generating the platform
  projects, building the `.apk`/`.ipa`, installing on a device, and store
  submission are a **manual acceptance step on a dev machine** — they cannot run
  in this environment, and the docs say so rather than implying a green build
  proves a working app.
- Adds `@capacitor/*` dev dependencies; they are build-time only and don't touch
  the server or the web runtime bundle.
