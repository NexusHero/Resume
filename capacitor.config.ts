import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for wrapping the recruiting kit as a native iOS/Android app
 * (ADR-0040). `webDir` points at the Vite build output (`npm run build:web`).
 *
 * IMPORTANT — API origin. The app is cookie-session authenticated and calls the
 * API at the relative `/api/v1`. Inside a native webview that relative path
 * resolves to the app's local origin, not your server, so you must point it at
 * the hosted backend. Two modes:
 *
 *   1. Remote (recommended for the cookie-session auth): uncomment `server.url`
 *      below to load the whole app from your HTTPS origin. Relative `/api/v1`
 *      and the session cookie then work exactly as on the web.
 *   2. Bundled: ship these web assets and set `window.RECRUIT_API` to the
 *      backend's absolute URL (data.js reads it). This is cross-origin, so the
 *      backend must send CORS + `SameSite=None; Secure` session cookies.
 *
 * See docs/native-app.md for the full build/signing/store walkthrough.
 */
const config: CapacitorConfig = {
  appId: 'de.myjob.recruiting',
  appName: 'myJob',
  webDir: 'design/myjob/ui_kits/recruiting/dist',
  // server: {
  //   url: 'https://app.example.com/design/myjob/ui_kits/recruiting/dist/',
  //   cleartext: false,
  // },
};

export default config;
