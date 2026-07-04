/* Validates the PWA wiring (ADR-0028, ADR-0039) at the source level — the
   manifest is a valid installable manifest, index.html links it, and the
   Workbox service worker (vite-plugin-pwa `injectManifest`, see vite.config.ts)
   precaches the built assets, keeps `/api` off the cache, and falls back to the
   app shell for navigations. On-device install still has to be confirmed on a
   real phone; these lock the parts we can. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const kit = resolve(process.cwd(), 'design/myjob/ui_kits/recruiting');
const read = (p) => readFileSync(resolve(kit, p), 'utf8');
const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

describe('PWA manifest', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));

  it('Manifest_HasInstallableCoreFields', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toMatch(/^#/);
    expect(manifest.background_color).toMatch(/^#/);
  });

  it('Manifest_ShipsThe192And512Icons', () => {
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.every((i) => i.type === 'image/png')).toBe(true);
  });

  it('Manifest_HasAMaskableIcon', () => {
    expect(manifest.icons.some((i) => (i.purpose || '').includes('maskable'))).toBe(true);
  });
});

describe('index.html PWA tags', () => {
  const html = read('index.html');

  it('Index_LinksManifestThemeColorAndAppleTouchIcon', () => {
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('name="apple-mobile-web-app-capable"');
  });
});

describe('service worker (Workbox / vite-plugin-pwa)', () => {
  const sw = read('sw.js');

  it('Sw_PrecachesTheInjectedBuildManifest', () => {
    // vite-plugin-pwa (injectManifest) replaces __WB_MANIFEST with the
    // revision-hashed list of built assets, which Workbox then precaches.
    expect(sw).toContain('precacheAndRoute(self.__WB_MANIFEST)');
    expect(sw).toContain("from 'workbox-precaching'");
  });

  it('Sw_NeverCachesTheApi', () => {
    // Live recruiting data is network-only (privacy): a NetworkOnly route keyed
    // on the /api pathname, registered before the navigation fallback.
    expect(sw).toMatch(/pathname\.startsWith\('\/api'\)/);
    expect(sw).toContain('new NetworkOnly()');
  });

  it('Sw_FallsBackToThePrecachedAppShellForNavigations', () => {
    expect(sw).toContain('NavigationRoute');
    expect(sw).toContain("createHandlerBoundToURL('index.html')");
    // Navigations to /api must never be answered with the shell.
    expect(sw).toMatch(/denylist:\s*\[\/\^\\\/api\/\]/);
  });

  it('Sw_StaleWhileRevalidatesStaticAssets', () => {
    // Assets are served from cache instantly, then refreshed in the background.
    expect(sw).toContain('new StaleWhileRevalidate(');
    expect(sw).toContain("from 'workbox-strategies'");
  });
});

describe('build wiring (vite.config.ts)', () => {
  it('Vite_RegistersVitePWAInInjectManifestMode', () => {
    expect(viteConfig).toContain('VitePWA(');
    expect(viteConfig).toContain("strategies: 'injectManifest'");
    expect(viteConfig).toContain("filename: 'sw.js'");
  });

  it('Vite_KeepsTheWorkerBundledAndCspSafe', () => {
    // manifest kept hand-written (index.html link), registration imported into
    // main.jsx — so no plugin-injected inline manifest link or inline register
    // script that would trip the kit's strict CSP.
    expect(viteConfig).toContain('manifest: false');
    expect(viteConfig).toContain('injectRegister: false');
  });
});

describe('service worker registration', () => {
  it('Main_RegistersViaTheVitePluginPwaVirtualModule', () => {
    const main = read('main.jsx');
    expect(main).toContain("from 'virtual:pwa-register'");
    expect(main).toContain('registerSW(');
  });
});
