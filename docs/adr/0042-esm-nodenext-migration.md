# ADR-0042 — Server migrated to ESM (nodenext)

- **Status:** Accepted
- **Relates to:** ADR-0001 (hexagonal TS backend), ADR-0002 (Awilix DI). Unblocks
  the Better-Auth adoption (a follow-up ADR), the change that motivated doing this now.

## Context

The server was **CommonJS** (`module: "CommonJS"`, `moduleResolution: "Node"` —
the legacy node10 mode) with extensionless relative imports. The tsconfig itself
flagged the ESM/nodenext move as a deliberate _follow-up_:

> "TS 6 deprecates node10 resolution (removed in TS 7). We stay on CommonJS with
> extensionless imports for now; nodenext migration is a follow-up."

Two forces made "later" become "now":

- **node10 resolution is on borrowed time** — deprecated in TS 6, removed in TS 7.
- **The modern package ecosystem is ESM-only.** Adopting Better-Auth (a follow-up ADR)
  surfaced this concretely: it is ESM-only, and under CommonJS + ts-jest it needed
  `unknown` casts (node10 picked the wrong `.d.ts`) and Jest could not load it at
  all (its sandbox chokes on `import` statements). Rather than accumulate hacks
  around every ESM-only dependency, we do the migration the tsconfig already
  earmarked, once, so ESM packages drop in cleanly.

This is a **pure infrastructure change — no runtime behaviour changes.** It is
its own PR precisely so the large mechanical diff is reviewable in isolation,
ahead of the feature (Better-Auth) that needs it.

## Decision

Migrate the server to **native ESM with `nodenext`**:

- **`package.json` `"type": "module"`** — `.js` output and the project are ESM.
- **tsconfig `module`/`moduleResolution: "NodeNext"`** — reads packages' `exports`
  maps and requires explicit extensions on relative imports.
- **Explicit `.js` extensions on every relative import** (1570 of them), applied
  by a committed, filesystem-aware one-shot codemod (`tools/esm-add-extensions.mjs`)
  that resolves each specifier — a file becomes `.js`, a directory `/index.js`.
  The compiler (`npm run typecheck`) is the safety net: a wrong extension fails to
  resolve.
- **`__dirname` → `import.meta.url`** at the two sites that used it
  (`config.ts`, the OpenAPI-contract test), via `fileURLToPath`.
- **Jest runs under ESM:** `ts-jest` with `useESM: true` +
  `extensionsToTreatAsEsm`, a `moduleNameMapper` that strips the `.js` suffix back
  to the `.ts` source, and `node --experimental-vm-modules`. Test files that use
  the `jest` mock object now `import { jest } from '@jest/globals'` (there is no
  `jest.mock` in the suite, so no ESM hoisting concerns).
- **CommonJS config/tooling kept as `.cjs`:** `jest.config.cjs`,
  `eslint.config.cjs`, and the legacy `tools/*.cjs` stay CommonJS (renamed from
  `.js`) so they keep working under `type: module`; ESLint gains a `**/*.cjs`
  block with node/commonjs globals.

We stayed with `nodenext` + real `.js` extensions rather than a bundler-style
resolution because the server is **run directly by Node** (`node server/dist`),
not bundled — extensionless ESM imports would fail at runtime, and a codemod makes
the extension cost a one-time, compiler-verified edit.

## Consequences

- **ESM-only packages now load without interop hacks** — Better-Auth (a follow-up ADR)
  and future modern dependencies drop in with static imports, no `unknown` casts,
  no Jest ESM workaround per package.
- **Relative imports carry `.js` everywhere** — the standard, if initially
  unfamiliar, ESM shape. New code must include the extension; the compiler
  enforces it.
- **No behaviour change and no coverage change** — the full gate is green:
  `typecheck`, `lint`, `format:check`, `docs:check`, **1071 Jest tests** (≥ 90 %
  branch gate held), **83 Vitest tests**, `build` (ESM emit) and `build:web`. The
  Jest suite is unchanged in count and slightly faster.
- **node10 resolution is retired**, removing the TS 7 deprecation cliff.
- The one-shot codemod is committed for provenance (how the 1570 edits were made);
  it is idempotent and not part of the build.
