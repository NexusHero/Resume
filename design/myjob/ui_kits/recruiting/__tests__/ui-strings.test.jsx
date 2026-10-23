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

/** Remove balanced `{…}` expressions from a text slice, leaving literal text.
    Nested braces (ternaries, object literals inside an expression) are handled by
    counting depth; an unbalanced tail is dropped with its expression. */
function stripExpressions(s) {
  let out = '';
  let depth = 0;
  for (const ch of s) {
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      if (depth > 0) depth -= 1;
    } else if (depth === 0) {
      out += ch;
    }
  }
  return out;
}

/** Lines that are clearly code, not copy — a safety net for regions the tag
    scanner may pick up. */
const LOOKS_LIKE_CODE = /(?:=>|\b(?:function|const|let|var|return|class|import|export)\b|;)/;

/** Collect literal JSX/HTML text nodes. Scans tag by tag, tracking quotes and
    `{…}` depth so a `>` inside an attribute expression (`onClick={() => …}`) or
    inside text interpolation does not end a tag early. Text between tags may
    span lines and contain `{' '}`/interpolations; expressions are stripped and
    only the literal copy is returned. */
function extractTextNodes(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt === -1) break;
    // Only `<Tag`, `</Tag` start a tag; comparisons/code are skipped.
    if (!/[A-Za-z/]/.test(src[lt + 1] ?? '')) {
      i = lt + 1;
      continue;
    }
    let j = lt + 1;
    let depth = 0;
    let quote = null;
    for (; j < src.length; j++) {
      const c = src[j];
      if (quote) {
        if (c === quote && src[j - 1] !== '\\') quote = null;
      } else if (c === '"' || c === "'" || c === '`') {
        quote = c;
      } else if (c === '{') {
        depth += 1;
      } else if (c === '}') {
        depth -= 1;
      } else if (c === '>' && depth === 0) {
        break;
      }
    }
    if (j >= src.length) break;
    const end = src.indexOf('<', j + 1);
    const raw = src.slice(j + 1, end === -1 ? src.length : end);
    for (const line of stripExpressions(raw).split('\n')) {
      const text = line.trim();
      if (text && /\p{L}/u.test(text) && !LOOKS_LIKE_CODE.test(text)) out.push(text);
    }
    i = end === -1 ? src.length : end;
  }
  return out;
}

/** Extract UI copy: single/double-quoted strings, simple template literals and
    JSX/HTML text nodes. Template literals that contain `${…}` or a newline are
    treated as code, not copy — extracting them would drag identifiers like
    `TalentGrid` in and produce false positives. */
function extractStrings(src) {
  const out = [];
  const quoted = /(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  for (const m of src.matchAll(quoted)) out.push(m[2]);
  const simpleTemplate = /`([^`$\n]*)`/g;
  for (const m of src.matchAll(simpleTemplate)) out.push(m[1]);
  out.push(...extractTextNodes(src));
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
