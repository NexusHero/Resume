/* Generate the PWA icon set from the myJob bar-mark (ADR-0028).
 *
 * Full-bleed brand tiles: the mark's three bars centered on the ink background
 * so the same PNG works as a maskable icon (content inside the 80% safe zone),
 * a plain icon, and — at 180px — the iOS apple-touch-icon (iOS applies its own
 * rounded mask, so we ship a full square with no transparency).
 *
 * Run: node tools/generate-pwa-icons.mjs
 * Uses the Chromium already in the environment; re-run only when the mark changes.
 * Output is committed under design/myjob/ui_kits/recruiting/public/icons.
 */
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../design/myjob/ui_kits/recruiting/public/icons');
mkdirSync(outDir, { recursive: true });

const CHROMIUM =
  process.env.PWA_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// The bar-mark on a full-bleed ink tile. Bars are scaled from the 40×40 source
// and centered so they sit within the maskable safe zone.
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <rect width="512" height="512" fill="#0b1220"/>
  <g transform="translate(-44,-44) scale(15)">
    <rect x="11" y="10" width="4.2" height="20" rx="2.1" fill="#60a5fa"/>
    <rect x="18" y="13" width="4.2" height="14" rx="2.1" fill="#2563eb"/>
    <rect x="25" y="16.5" width="4.2" height="7" rx="2.1" fill="#1d4ed8"/>
  </g>
</svg>`;

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon-180.png', size: 180 },
];

const browser = await puppeteer.launch({
  executablePath: CHROMIUM,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
try {
  for (const { name, size } of targets) {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(
      `<!doctype html><html><body style="margin:0">${svg(size)}</body></html>`,
      { waitUntil: 'networkidle0' },
    );
    await page.screenshot({ path: resolve(outDir, name), omitBackground: false });
    await page.close();
    console.log(`wrote ${name} (${size}×${size})`);
  }
} finally {
  await browser.close();
}
