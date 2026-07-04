import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { VitePWA } from 'vite-plugin-pwa';

const recruitingDir = resolve(__dirname, 'design/myjob/ui_kits/recruiting');

/**
 * Build for the recruiting kit. Bundles React/ReactDOM and compiles the JSX so
 * the app no longer pulls React + Babel from a CDN or transpiles in the browser.
 * Output goes to <kit>/dist, served by the Express static handler.
 *
 * The kit files use a global-React model (`React.useState`, `<jsx>` → React),
 * so JSX is compiled with the classic runtime targeting the global `React`
 * that setup-globals.js installs.
 *
 * PWA (ADR-0028/0039): Workbox via vite-plugin-pwa in `injectManifest` mode.
 * The plugin injects a revision-hashed precache manifest into our own
 * `sw.js` source (see the kit's sw.js), which keeps explicit control of the
 * routing this subpath/relative-base + strict-CSP deployment needs. The
 * existing hand-written manifest.webmanifest and its <link> in index.html are
 * kept (`manifest: false`), and registration is imported into main.jsx
 * (`injectRegister: false`) so the worker stays a bundled, same-origin,
 * CSP-safe module.
 */
export default defineConfig({
  root: recruitingDir,
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: '.',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff,woff2}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
