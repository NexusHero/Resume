/* AK-0.4 — the UI must stop calling the person "Talent", the client's search
   assignment "Mandat", and the workspace "Mandant".

   The scan is string-based (not source-based): identifiers like `TalentProfile`
   or `getTalentDocuments` are code, not UI copy, so only the extracted text is
   checked. Two checks keep the rebuild honest:
     (a) global — "Talent" (person) and "Mandat" (client assignment) anywhere;
     (b) super-admin — "Mandant" only in the SettingsView console, where the old
         term meant "Workspace". (Elsewhere "Mandant" is the CORRECT new term.)
   Matcher roots cover plural/flection (Talente, Talenten, Mandate, Mandaten). */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, '../../..'); // design/myjob
const REPO = path.resolve(HERE, '../../../../../'); // repo root

/** Every file under `dir` whose extension is in `exts`. */
function walk(dir, exts) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules' || entry === 'dist') continue;
      out.push(...walk(full, exts));
    } else if (exts.includes(path.extname(full))) {
      out.push(full);
    }
  }
  return out;
}

/** Extract UI copy: single/double-quoted strings, simple template literals and
    single-line JSX/HTML text nodes. Template literals that contain `${…}` or a
    newline are treated as code, not copy — extracting them would drag identifiers
    like `TalentGrid` in and produce false positives. */
function extractStrings(src) {
  const out = [];
  const quoted = /(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  for (const m of src.matchAll(quoted)) out.push(m[2]);
  const simpleTemplate = /`([^`$\n]*)`/g;
  for (const m of src.matchAll(simpleTemplate)) out.push(m[1]);
  const textNodes = />([^<>{}\n]*\p{L}[^<>{}\n]*)</gu;
  for (const m of src.matchAll(textNodes)) out.push(m[1]);
  return out;
}

// Module paths, URLs, API routes and asset names are not UI copy.
const NOT_COPY =
  /(?:^[./]|^https?:|^#|\/api\/|\.(?:jsx?|tsx?|css|json|html|svg|png|jpe?g|md)(?:$|[?#]))/i;

// "Talent" (person) + "Mandat" (client assignment); "Mandant" is the correct
// new term, so exclude it explicitly.
const GLOBAL_FORBIDDEN = /(?<!\p{L})(?:Talent\w*|Mandat(?!ant)\w*)/u;
const MANDANT_AS_WORKSPACE = /(?<!\p{L})Mandant\w*/u;

const SOURCE_FILES = [
  ...walk(path.join(APP, 'ui_kits/recruiting'), ['.jsx', '.js']),
  ...walk(path.join(APP, 'screens'), ['.html']),
  ...walk(path.join(APP, 'components'), ['.jsx', '.js', '.html', '.md']),
];

describe('UI strings (AK-0.4)', () => {
  it('UiStrings_Global_TalentAndMandat_NoneFound', () => {
    const offenders = [];
    for (const file of SOURCE_FILES) {
      const src = fs.readFileSync(file, 'utf8');
      for (const text of extractStrings(src)) {
        if (NOT_COPY.test(text.trim())) continue;
        if (GLOBAL_FORBIDDEN.test(text)) offenders.push(`${path.relative(REPO, file)}: ${text.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('UiStrings_SuperAdmin_MandantAsWorkspace_NoneFound', () => {
    const src = fs.readFileSync(path.join(APP, 'ui_kits/recruiting/SettingsView.jsx'), 'utf8');
    // Only the super-admin console used "Mandant" to mean the workspace; scan
    // that slice, not the whole settings screen (where "Mandant" = the person).
    const consoleSrc = src.slice(
      src.indexOf('function TenantMembers'),
      src.indexOf('/* ComplianceCard'),
    );
    const offenders = extractStrings(consoleSrc).filter((t) => MANDANT_AS_WORKSPACE.test(t));
    expect(offenders).toEqual([]);
  });
});
