/* Validates the PWA wiring (ADR-0028) at the source level — the manifest is a
   valid installable manifest, index.html links it, and the service worker has
   the handlers installability needs and never caches the API. On-device install
   still has to be confirmed on a real phone; these lock the parts we can. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const kit = resolve(process.cwd(), 'design/myjob/ui_kits/recruiting');
const read = (p) => readFileSync(resolve(kit, p), 'utf8');

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

describe('service worker', () => {
  const sw = read('public/sw.js');

  it('Sw_RegistersInstallActivateAndFetchHandlers', () => {
    for (const evt of ['install', 'activate', 'fetch']) {
      expect(sw).toContain(`addEventListener('${evt}'`);
    }
  });

  it('Sw_NeverCachesTheApi', () => {
    expect(sw).toMatch(/pathname\.startsWith\('\/api'\)/);
  });

  it('Sw_StaleWhileRevalidate_RefreshesAssetsInBackground', () => {
    // Both a cache read and a background network fetch feed the asset response.
    expect(sw).toContain('caches.match(req)');
    expect(sw).toContain('return hit || network');
  });

  it('Sw_ServesAnOfflineFallbackOnAColdInstall', () => {
    expect(sw).toContain('offlineResponse()');
    expect(sw).toMatch(/You.re offline/);
  });

  it('Sw_BumpsTheCacheVersion', () => {
    expect(sw).toMatch(/CACHE_VERSION = 'myjob-v2'/);
  });
});

describe('service worker registration', () => {
  it('Main_RegistersTheServiceWorkerBehindAFeatureGuard', () => {
    const main = read('main.jsx');
    expect(main).toContain("'serviceWorker' in navigator");
    expect(main).toContain("navigator.serviceWorker.register('./sw.js'");
  });
});
