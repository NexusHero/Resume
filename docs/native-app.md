# Native app (Capacitor wrapper)

myJob's recruiting kit is a PWA (ADR-0028/0039); it can also be shipped to the
Apple App Store and Google Play as a thin native app via
[Capacitor](https://capacitorjs.com) (ADR-0040). Capacitor loads the same web
build inside a native WebView and gives it a real app icon, splash screen and
store presence — no separate codebase.

This repo carries the **web-side wiring** (`capacitor.config.ts`, the
`@capacitor/*` dev dependencies and the `cap:*` npm scripts). The **native
platform projects** (`android/`, `ios/`) are generated on a developer machine
and are gitignored, because generating and building them needs the Android SDK
and/or Xcode, which CI here does not have.

## Prerequisites (developer machine)

- **Android:** Android Studio + SDK, a JDK.
- **iOS:** a Mac with Xcode + CocoaPods.

## One-time setup

```bash
npm install                # installs @capacitor/core + @capacitor/cli
npm run build:web          # produces the web build Capacitor wraps
npm run cap:add:android    # creates android/ (needs the Android SDK)
npm run cap:add:ios        # creates ios/   (needs a Mac + Xcode)
```

## Each release

```bash
npm run cap:sync           # rebuilds the web app and copies it into the native projects
npx cap open android       # opens Android Studio to build/run/sign
npx cap open ios           # opens Xcode to build/run/sign
```

`cap:sync` runs `npm run build:web` first, so the native app always bundles the
current UI.

## API origin — the one thing to get right

The app is **cookie-session authenticated** and calls the API at the relative
path `/api/v1`. Inside a native WebView that relative path resolves to the app's
_local_ origin, not your server, so it must be pointed at the hosted backend.
Two modes (see the comments in `capacitor.config.ts`):

1. **Remote — recommended.** Set `server.url` in `capacitor.config.ts` to your
   HTTPS origin so the WebView loads the whole app from there. Relative
   `/api/v1` and the `httpOnly` session cookie then work exactly as on the web,
   with no cross-origin cookie caveats. The native shell is effectively a
   branded, installable window onto the hosted app (still offline-capable via the
   service worker).
2. **Bundled.** Ship the built web assets inside the app and set
   `window.RECRUIT_API` to the backend's absolute URL (the kit reads it —
   `data.js`). This is cross-origin, so the backend must send CORS headers and
   `SameSite=None; Secure` session cookies, and you accept the usual third-party
   cookie friction. Prefer mode 1 unless you specifically need the assets bundled.

## Store submission

Signing, provisioning profiles, store listings and review are the normal
native-store steps, done from Android Studio / Xcode with your developer
accounts — outside this repo. Bump the version in the generated native project
per release.

## What is verified here vs. on a device

- **Verified in CI:** the config points `webDir` at the real Vite build output,
  the `cap:*` scripts exist, and `capacitor.config.ts` carries the correct
  `appId`/`appName` (a small source-level test locks these).
- **Manual, on a dev machine / device (cannot run in this CI):** `cap add`, the
  native build, install on a real phone, and store submission. Treat those as a
  manual acceptance step.
