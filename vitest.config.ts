import { defineConfig } from 'vitest/config';

const kit = 'design/myjob/ui_kits/recruiting';

/**
 * Frontend unit/component test base (ADR-0023). Separate from the server's Jest
 * suite: the recruiting kit is a Vite project with a global-React, classic-JSX,
 * `Object.assign(window, …)` module model, so it is tested by Vitest — reusing
 * the exact esbuild JSX transform the production build uses, in a jsdom DOM.
 *
 * The classic transform matches the app's own vite.config: JSX compiles to
 * `React.createElement` against the global `React` the setup file installs, so a
 * test can never pass under a different transform than what ships.
 */
export default defineConfig({
  // Vite 8 transforms JSX with oxc (not esbuild). Force the *classic* runtime so
  // tests compile JSX to `React.createElement` against the global `React` the
  // setup installs — the exact transform the production `vite build` emits
  // (verified: the shipped bundle is all createElement, no jsx-runtime).
  oxc: {
    jsx: {
      runtime: 'classic',
      pragma: 'React.createElement',
      pragmaFrag: 'React.Fragment',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: [`${kit}/__tests__/**/*.test.{js,jsx}`],
    setupFiles: [`${kit}/__tests__/setup.js`],
    coverage: {
      provider: 'v8',
      include: [`${kit}/**/*.{js,jsx}`],
      exclude: [
        `${kit}/__tests__/**`,
        `${kit}/dist/**`,
        `${kit}/main.jsx`, // Vite entry: side-effect imports + createRoot, driven by e2e
        `${kit}/setup-globals.js`, // installs window.React, driven by the build
      ],
      // No enforced threshold yet: C1 establishes the harness and the first
      // tests. Coverage is reported, not gated, and grows as the god-components
      // are split (A2). The server suite keeps its own 90 % Jest gate.
    },
  },
});
