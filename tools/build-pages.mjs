#!/usr/bin/env node
/**
 * Assemble the static Swagger UI site published to GitHub Pages.
 *
 * Self-hosted, same as the in-app docs: the Swagger UI assets come from the
 * installed `swagger-ui-dist` package (no CDN), and the contract is the very
 * same `server/openapi.yaml` the server serves — so Pages can never drift from
 * the app. Output goes to `site/`, which the Pages workflow uploads. Run:
 * `npm run docs:pages` then open `site/index.html`.
 */
import { mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { absolutePath } from 'swagger-ui-dist';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site');
const DIST = absolutePath();

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// Swagger UI assets straight from the installed package (no CDN).
for (const asset of [
  'swagger-ui.css',
  'swagger-ui-bundle.js',
  'swagger-ui-standalone-preset.js',
  'favicon-32x32.png',
  'favicon-16x16.png',
]) {
  copyFileSync(join(DIST, asset), join(OUT, asset));
}

// The published contract IS the served contract.
copyFileSync(join(ROOT, 'server', 'openapi.yaml'), join(OUT, 'openapi.yaml'));

// Tell Pages not to run the assets through Jekyll.
writeFileSync(join(OUT, '.nojekyll'), '');

writeFileSync(
  join(OUT, 'index.html'),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>myJob API — Swagger UI</title>
    <link rel="icon" type="image/png" href="./favicon-32x32.png" sizes="32x32" />
    <link rel="stylesheet" href="./swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="./swagger-ui-bundle.js" charset="UTF-8"></script>
    <script src="./swagger-ui-standalone-preset.js" charset="UTF-8"></script>
    <script src="./swagger-initializer.js" charset="UTF-8"></script>
  </body>
</html>
`,
);

writeFileSync(
  join(OUT, 'swagger-initializer.js'),
  `window.onload = function () {
  window.ui = SwaggerUIBundle({
    url: './openapi.yaml',
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    layout: 'BaseLayout',
  });
};
`,
);

console.log(`✓ built Swagger UI site → ${OUT.slice(ROOT.length + 1)}/ (open index.html)`);
