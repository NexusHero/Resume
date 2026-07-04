#!/usr/bin/env node
/**
 * One-shot codemod for the CommonJS→ESM (nodenext) migration: append explicit
 * extensions to every relative import/export specifier, which node ESM requires.
 * Filesystem-aware — resolves each specifier so a file becomes `.js` and a
 * directory becomes `/index.js`. Idempotent. Pass `--write` to apply; default is
 * a dry run that also reports any specifier it could not resolve.
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const WRITE = process.argv.includes('--write');
const ROOTS = ['server/src', 'server/__tests__'];
const repo = process.cwd();

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

const exists = (p) => {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
};

// Matches the specifier of: `from '...'`, `import('...')`, `export ... from '...'`.
const SPEC_RE = /(from\s+|import\s*\(\s*)(['"])(\.\.?\/[^'"]+)\2/g;

let edits = 0;
const unresolved = [];

for (const file of ROOTS.flatMap(walk)) {
  const src = readFileSync(file, 'utf8');
  const dir = dirname(file);
  const next = src.replace(SPEC_RE, (m, pre, q, spec) => {
    if (/\.(js|json|mjs|cjs)$/.test(spec)) return m; // already extensioned
    const abs = resolve(dir, spec);
    let rewritten;
    if (exists(`${abs}.ts`)) rewritten = `${spec}.js`;
    else if (exists(join(abs, 'index.ts'))) rewritten = `${spec}/index.js`;
    else {
      unresolved.push(`${file}: ${spec}`);
      return m;
    }
    edits++;
    return `${pre}${q}${rewritten}${q}`;
  });
  if (WRITE && next !== src) writeFileSync(file, next);
}

console.log(`${WRITE ? 'applied' : 'would apply'} ${edits} extension edits`);
if (unresolved.length) {
  console.log(`\n${unresolved.length} UNRESOLVED specifiers (handle manually):`);
  for (const u of [...new Set(unresolved)]) console.log('  - ' + u);
}
