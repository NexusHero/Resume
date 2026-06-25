// Flat ESLint config. PR1 scope: the tooling/test code this repo owns today.
// The legacy `tools/` JS backend is replaced by a fully linted TypeScript
// `core/` in PR2 (with typescript-eslint); it is intentionally not linted here.
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'reports/**',
      'vendor/**',
      '**/_ds_bundle.js',
      'assets/**',
      'index.html',
      'tokens/**',
      'ui_kits/**',
      'components/**',
      'myjob/**',
      'tools/**',
      'generate-pdf.js',
    ],
  },
  js.configs.recommended,
  {
    files: ['test/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    files: ['eslint.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },
  {
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
