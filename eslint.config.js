// Flat ESLint config. Lints the TypeScript backend (core/) and this repo's tooling.
// The legacy `tools/` JS backend is superseded by core/ and intentionally not linted.
const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'core/dist/**',
      'dist/**',
      'coverage/**',
      'reports/**',
      '.stryker-tmp/**',
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
  ...tseslint.configs.recommended,
  {
    files: ['core/**/*.ts', 'e2e/**/*.ts', 'playwright.config.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['*.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
