/* AK-0.4 — no forbidden UI vocabulary anywhere in the shipped kit.
   The scan uses the TypeScript compiler API (JSX parser) so comments, imports,
   property names and identifiers are never treated as copy; rendered views are
   covered separately by Playwright's all-views check. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.resolve(HERE, '..');
const ALLOWLIST = JSON.parse(fs.readFileSync(path.join(KIT, 'terminology-allowlist.json'), 'utf8'));

const GLOBAL = [/\bTalent/, /\btalent pool/i, /\bMandat(?!ant)/, /\bMandates\b/, /\bSuchmandat/];
const WORKSPACE_MANDANT = /\bMandant(en)?\b/;
const SUPER_ADMIN_FUNCTIONS = new Set(['SuperAdminCard', 'TenantMembers', 'TeamCard', 'InvitesCard']);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules' || entry === 'dist' || entry === 'public') continue;
      out.push(...walk(full));
    } else if (/\.(jsx|js)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Collect user-visible strings / JSX text from one source file. */
function collectCopy(file, src) {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JSX);
  const items = [];
  let currentFn = null;

  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name) currentFn = node.name.text;
    if (ts.isJsxText(node)) {
      const text = node.getText(sf).replace(/\s+/g, ' ').trim();
      if (text) items.push({ text, context: currentFn });
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const parent = node.parent;
      const isImport = ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent);
      const isPropertyName = ts.isPropertyAssignment(parent) && parent.name === node;
      const isJsxAttr = false; // JSX attribute strings are copy too (plan §6.1)
      const isPath = /^\//.test(node.text) || /^https?:/.test(node.text);
      if (!isImport && !isPropertyName && !isJsxAttr && !isPath) {
        items.push({ text: node.text, context: currentFn });
      }
    }
    ts.forEachChild(node, visit);
    if (ts.isFunctionDeclaration(node)) currentFn = null;
  };
  visit(sf);
  return items;
}

const COPY = walk(KIT).flatMap((file) => {
  const rel = path.relative(KIT, file);
  return collectCopy(file, fs.readFileSync(file, 'utf8')).map((item) => ({ ...item, file: rel }));
});

const allowed = new Set(ALLOWLIST.map((a) => `${a.file}|${a.text}`));
const hits = (patterns) => COPY.filter((c) => !allowed.has(`${c.file}|${c.text}`) && patterns.some((p) => p.test(c.text)));
const format = (list) => list.map((c) => `${c.file}: ${c.text}`);

describe('UI terminology (AK-0.4)', () => {
  it('UiStrings_AllShippedKitFiles_ContainNoForbiddenTerms', () => {
    expect(format(hits(GLOBAL))).toEqual([]);
  });

  it('UiStrings_Scanner_FlagsSeededPersonTalentMandateAndWorkspaceMandant', () => {
    const seeded = collectCopy(
      'seed.jsx',
      `function SuperAdminCard(){ return <div>Talent-Pool und Mandat für diesen Mandanten</div>; }`,
    );
    expect(seeded.some((c) => /\bTalent/.test(c.text))).toBe(true);
    expect(seeded.some((c) => /\bMandat(?!ant)/.test(c.text))).toBe(true);
    expect(
      seeded.some((c) => SUPER_ADMIN_FUNCTIONS.has(c.context) && WORKSPACE_MANDANT.test(c.text)),
    ).toBe(true);
  });

  it('UiStrings_Scanner_IgnoresIdentifiersApiPathsAndComments', () => {
    const seeded = collectCopy(
      'seed.jsx',
      `// Talent-Pool in a comment is not copy
       import { TalentGrid } from './TalentGrid.jsx';
       const x = { talentPool: 1 };
       export const route = '/api/v1/mandates';`,
    );
    expect(seeded).toEqual([]);
  });

  it('UiStrings_Manifest_ContainsNoForbiddenTerms', () => {
    const manifest = fs.readFileSync(path.join(KIT, 'public/manifest.webmanifest'), 'utf8');
    expect(GLOBAL.some((p) => p.test(manifest))).toBe(false);
  });

  it('UiStrings_Allowlist_HasNoStaleEntries', () => {
    const stale = ALLOWLIST.filter((a) => !fs.existsSync(path.join(KIT, a.file)));
    expect(stale).toEqual([]);
  });
});
