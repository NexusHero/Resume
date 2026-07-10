import { defineConfig, devices } from '@playwright/test';

const PORT = 4188;
const baseURL = `http://127.0.0.1:${PORT}`;

/** UI acceptance tests: boot the real server and drive the web UIs in a browser. */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    // Block the Workbox service worker (registered by the kit, ADR-0028/0041) in
    // acceptance runs. Once it activates it proxies `/api/v1/*` through its runtime
    // cache, which bypasses Playwright's `page.route` mocks — so any flow that
    // re-fetches after an action (create→reload, open-editor) non-deterministically
    // hits the real server instead of the mock. These tests drive the UI against
    // mocked APIs; the service worker is covered by its own unit tests.
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // The desktop project drives everything except the mobile-only suite.
      testIgnore: /mobile\.spec\.ts$/,
    },
    {
      // Mobile pass (#202): a real touch viewport (393×851, hasTouch, mobile UA).
      // Pixel 5 is chromium-backed — the only engine installed in CI — so it runs
      // alongside the desktop project without a WebKit download.
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
      testMatch: /mobile\.spec\.ts$/,
    },
  ],
  webServer: {
    // Build the recruiting kit's Vite bundle before serving so the e2e drives
    // the production build (no CDN, no runtime Babel).
    command: `npm run build:web && PORT=${PORT} npm run serve`,
    url: `${baseURL}/api/v1/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
