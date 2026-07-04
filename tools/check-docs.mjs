#!/usr/bin/env node
/**
 * Docs freshness guard (no Java, deterministic — safe for CI).
 *
 * Catches the three ways the docs silently rot:
 *   1. a PlantUML source with no rendered SVG (or an orphan SVG left behind);
 *   2. a relative Markdown link that points at a file that isn't there;
 *   3. an `ADR-NNNN` reference with no matching `docs/adr/NNNN-*.md`.
 *
 * Byte-level SVG freshness is left to the render job (docs.yml) because it
 * depends on the exact PlantUML version; this guard is about structural drift,
 * which is deterministic everywhere. Run: `npm run docs:check`.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');
const errors = [];

/** Every file under `dir` (recursively) whose extension is in `exts`. */
function walk(dir, exts) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, exts));
    else if (exts.includes(extname(full))) out.push(full);
  }
  return out;
}

// 1. Every .puml has a sibling .svg, and no .svg under umls/ is an orphan.
const pumls = walk(DOCS, ['.puml']);
for (const puml of pumls) {
  const svg = puml.replace(/\.puml$/, '.svg');
  if (!existsSync(svg)) {
    errors.push(`Missing render: ${rel(puml)} has no sibling .svg (run PlantUML and commit it).`);
  }
}
const umls = join(DOCS, 'umls');
if (existsSync(umls)) {
  for (const svg of walk(umls, ['.svg'])) {
    const puml = svg.replace(/\.svg$/, '.puml');
    if (!existsSync(puml)) {
      errors.push(`Orphan SVG: ${rel(svg)} has no source .puml (delete it or add the source).`);
    }
  }
}

// 2. Relative Markdown links resolve; 3. ADR references exist.
const adrNumbers = new Set(
  existsSync(join(DOCS, 'adr'))
    ? readdirSync(join(DOCS, 'adr'))
        .map((f) => /^(\d{4})-/.exec(f)?.[1])
        .filter(Boolean)
    : [],
);
const linkRe = /\]\(([^)]+)\)/g;
const adrRefRe = /ADR-(\d{4})/g;

for (const md of walk(DOCS, ['.md'])) {
  const text = readFileSync(md, 'utf8');

  for (const [, target] of text.matchAll(linkRe)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue; // external / anchor-only
    const path = target.split('#')[0].split('?')[0];
    if (!path) continue;
    if (!existsSync(resolve(dirname(md), path))) {
      errors.push(`Dead link: ${rel(md)} → "${target}" does not resolve.`);
    }
  }

  for (const [, num] of text.matchAll(adrRefRe)) {
    if (!adrNumbers.has(num)) {
      errors.push(`Unknown ADR: ${rel(md)} references ADR-${num}, but no docs/adr/${num}-*.md exists.`);
    }
  }
}

function rel(p) {
  return p.slice(ROOT.length + 1);
}

if (errors.length) {
  console.error(`✗ docs:check found ${errors.length} issue(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ docs:check — ${pumls.length} diagrams, links and ADR references all resolve.`);
