import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const recruitingDir = resolve(__dirname, 'design/myjob/ui_kits/recruiting');

/**
 * Build for the recruiting kit. Bundles React/ReactDOM and compiles the JSX so
 * the app no longer pulls React + Babel from a CDN or transpiles in the browser.
 * Output goes to <kit>/dist, served by the Express static handler.
 *
 * The kit files use a global-React model (`React.useState`, `<jsx>` → React),
 * so JSX is compiled with the classic runtime targeting the global `React`
 * that setup-globals.js installs.
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
});
