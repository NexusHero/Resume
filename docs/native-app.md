# Native app (Capacitor wrapper)

myJob's recruiting kit is a PWA (ADR-0028/0039); it can also be shipped to the
Apple App Store and Google Play as a thin native app via
[Capacitor](https://capacitorjs.com) (ADR-0040). Capacitor loads the same web
build inside a native WebView and gives it a real app icon, splash screen and
store presence — no separate codebase.

This repo carries the **web-side wiring** (`capacitor.config.ts`, the
`@capacitor/*` dev dependencies and the `cap:*` npm scripts). The **native
platform projects** (`android/`, `ios/`) are gitignored and generated on
demand — `android/` can now be generated **and built** in CI (below); `ios/`
still needs a developer machine, because that needs a Mac with Xcode.

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

## CI: on-demand unsigned Android APK

The **Native — Android** workflow (`.github/workflows/native-android.yml`,
manual `workflow_dispatch` only — it's a heavier, on-demand build, not part of
the required verify gate) does the whole Android side in a plain
`ubuntu-latest` runner: builds the web bundle, generates `android/` fresh via
`cap add android` (`@capacitor/android` is a pinned devDependency so this step
needs no network install of its own), syncs it, and runs
`./gradlew assembleDebug`. The resulting **unsigned debug APK** — signed with
Gradle's auto-generated debug keystore, so it installs straight onto a device
or emulator for testing — is uploaded as a workflow artifact.

This is deliberately **debug-only**. A signed **release** APK/AAB for the Play
Store needs a real signing keystore held as a secret — a one-time setup left
for whoever owns the store listing, not something to fake in CI. **iOS is not
built in CI at all**: that needs a `macos-latest` runner (materially more
expensive per minute) plus an Apple Developer account for code signing, since
an unsigned iOS build only runs in the simulator, not on a device or in the
App Store — not worth automating until that account exists. Both remain the
manual dev-machine flow above.

## Store submission

Signing, provisioning profiles, store listings and review are the normal
native-store steps, done from Android Studio / Xcode with your developer
accounts — outside this repo. Bump the version in the generated native project
per release.

## What is verified here vs. on a device

- **Verified in CI, on every push:** the config points `webDir` at the real
  Vite build output, the `cap:*` scripts exist, and `capacitor.config.ts`
  carries the correct `appId`/`appName` (a small source-level test locks
  these).
- **Buildable in CI, on demand:** the Android platform generates and the debug
  APK builds (see above) — but installing it on a real phone and confirming it
  actually launches is still a manual step, since no device is attached to CI.
- **Manual, on a dev machine / device only:** the iOS build (needs a Mac +
  Xcode), install on a real phone, signed release builds, and store
  submission. Treat those as a manual acceptance step.
