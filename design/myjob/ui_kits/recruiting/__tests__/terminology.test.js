/* AK-0.4 / AK-7.1 — no forbidden (German) UI vocabulary anywhere in the shipped
   kit. The scan uses the TypeScript compiler API (JSX parser) so comments, imports,
   property names and identifiers are never treated as copy; rendered views are
   covered separately by Playwright's all-views check.

   Phase 7 (english-only, ADR-0064) sharpens this into an anti-regression guard:
   any German UI fragment — a curated German noun/verb list plus a umlaut/eszett
   catch-all — turns the test red. The only escape hatch is the allowlist
   (terminology-allowlist.json), which must stay small and justified. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.resolve(HERE, '..');
const ALLOWLIST = JSON.parse(fs.readFileSync(path.join(KIT, 'terminology-allowlist.json'), 'utf8'));

/* Code-name guards (ADR-0057/0064): the UI says Candidate / Mandate, the code and
   API stay Talent / Mandate. "Talent" and "talent pool" must never leak into copy. */
const CODE_NAMES = [/\bTalent/, /\btalent pool/i, /\bSuchmandat/];

/* German UI word list (ADR-0064 Begriffskarte + words observed in the shipped kit).
   Word-start matches catch compounds (Bewerbungsmappe, Mandantenpool,
   Stellenanzeige); "Neu", "Mappe", "Mehr" and a few short stems keep a trailing
   boundary so English near-misses (Neural, mapped, …) don't false-positive. */
const GERMAN_UI_WORDS = [
  /\bMandant/,
  /\bStelle/,
  /\bSuchauftrag/,
  /\bBewerbung/,
  /\bVermittlung/,
  /\bAnschreiben/,
  /\bLebenslauf/,
  /\bMappe\b/,
  /\bEinstellungen/,
  /\bAbbrechen/,
  /\bSpeichern/,
  /\bLöschen/,
  /\bÜbernehmen/,
  /\bZustimmen/,
  /\bAnmelden/,
  /\bPasswort/,
  /\bKonto/,
  /\bSenden/,
  /\bErstellen/,
  /\bHinzufügen/,
  /\bSuchen/,
  /\bFehler/,
  /\bKeine\b/,
  /\bNoch\b/,
  /\bZurück/,
  /\bNeu\b/,
  /\bWeiter/,
  /\bBitte/,
  /\bFirma/,
  /\bUnternehmen/,
  /\bHonorar/,
  /\bPlatzierungen/,
  /\bAbsage/,
  /\bGesendet/,
  /\bAngebot/,
  /\bEingestellt/,
  /\bPostfach/,
  /\bMehr\b/,
  /\bBerichte\b/,
  /\bNachrichten\b/,
  /\bKlient/,
  /\bMandat\b/,
  /\bVerwerfen/,
  /\bHinweis/,
  /\bSichtung\b/,
  /\bAnrede/,
  /\bGespeichert/,
  /\bBearbeiten/,
  /\bStellenanzeige/,
  /\bWählen/,
  /\bErneut/,
  /\bversuchen/,
  /\bschiefgelaufen/,
  /\bleer\b/,
  /\bhierhin/,
  /\bziehen/,
  /\bPassende/,
  /\bfinden/,
  /\bFirmenwissen/,
  /\bkonnte/,
  /\bgeladen/,
  /\bwerden/,
  /\bKandidat/,
  /\bentfernt/,
  /\bunbekannt/,
];

/* Umlaut/eszett catch-all: German-only characters in string copy are a signal
   regardless of the word list above. Applies to string literals / JSX text only
   (the collector never yields comments or identifiers). */
const UMLAUT = /[äöüÄÖÜß]/;

const GLOBAL = [...CODE_NAMES, ...GERMAN_UI_WORDS, UMLAUT];

/* English nav labels that must exist somewhere in the kit (anti-no-op guard).
   The scanner can go green only by actually introducing the new vocabulary. */
const REQUIRED_ENGLISH_LABELS = ['Candidates', 'Jobs', 'Applications', 'Agency'];

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
    if (ts.isTemplateExpression(node)) {
      // Collect the literal parts (head + middle/tail) of a template with
      // substitutions, so `` `Bewerbung_${id}.pdf` `` and `` `${x} entfernt` ``
      // can't slip past the scan. The `${…}` expressions themselves are code,
      // not copy, and are skipped.
      const parent = node.parent;
      const isImport = ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent);
      const isPropertyName = ts.isPropertyAssignment(parent) && parent.name === node;
      const parts = [node.head, ...node.templateSpans.map((s) => s.literal)];
      for (const part of parts) {
        const text = part.text;
        if (!text) continue;
        const isPath = /^\//.test(text) || /^https?:/.test(text);
        if (!isImport && !isPropertyName && !isPath) {
          items.push({ text, context: currentFn });
        }
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

describe('UI terminology (AK-0.4 / AK-7.1)', () => {
  it('UiStrings_AllShippedKitFiles_ContainNoForbiddenTerms', () => {
    expect(format(hits(GLOBAL))).toEqual([]);
  });

  it('UiStrings_Scanner_FlagsGermanUiVocabulary', () => {
    const seeded = collectCopy(
      'seed.jsx',
      `function Demo(){ return <div>Mandant, Suchauftrag, Stelle, Bewerbung und Mappe</div>; }`,
    );
    expect(seeded.some((c) => /\bMandant/.test(c.text))).toBe(true);
    expect(seeded.some((c) => /\bSuchauftrag/.test(c.text))).toBe(true);
    expect(seeded.some((c) => /\bBewerbung/.test(c.text))).toBe(true);
    expect(seeded.some((c) => /[äöüÄÖÜß]/.test(c.text))).toBe(false);
  });

  it('UiStrings_Scanner_FlagsUmlautInCopyButNotInComments', () => {
    const seeded = collectCopy(
      'seed.jsx',
      `function Demo(){
         // Der Vorschlag ist noch nicht übernommen — comment, never collected
         return <div>Übernehmen</div>;
       }`,
    );
    expect(seeded.some((c) => /[äöüÄÖÜß]/.test(c.text))).toBe(true);
    expect(seeded.some((c) => /Vorschlag/.test(c.text))).toBe(false);
  });

  it('UiStrings_Scanner_CollectsTemplateExpressionLiterals', () => {
    const seeded = collectCopy(
      'seed.jsx',
      'const a = `Bewerbung_${id}.pdf`; const b = `${name} aus der Pipeline entfernt`;',
    );
    // The literal parts of a template with substitutions are collected so a
    // German fragment can't hide inside `${…}` (the expressions are skipped).
    expect(seeded.some((c) => /\bBewerbung/.test(c.text))).toBe(true);
    expect(seeded.some((c) => /\bentfernt/.test(c.text))).toBe(true);
    expect(seeded.some((c) => c.text.includes('${'))).toBe(false);
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

  it('UiStrings_PositiveGuard_EnglishNavLabelsPresent', () => {
    const allText = COPY.map((c) => c.text);
    for (const label of REQUIRED_ENGLISH_LABELS) {
      expect(allText, `expected the kit to contain the nav label "${label}"`).toContain(label);
    }
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
