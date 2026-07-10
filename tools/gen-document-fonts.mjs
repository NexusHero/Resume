/* Regenerates server/src/domain/document-fonts.ts — the base64-embedded latin
   subsets of Inter, Space Grotesk and JetBrains Mono used by the ink CV
   template. Run from the repo root:  node tools/gen-document-fonts.mjs
   Re-run whenever design/fonts/*.woff2 change. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fonts = [
  { family: 'Inter', weight: '300 700', file: 'design/fonts/inter-latin.woff2' },
  { family: 'Space Grotesk', weight: '400 700', file: 'design/fonts/space-grotesk-latin.woff2' },
  { family: 'JetBrains Mono', weight: '400 600', file: 'design/fonts/jetbrains-mono-latin.woff2' },
];
const faces = fonts
  .map(({ family, weight, file }) => {
    const b64 = readFileSync(join(root, file)).toString('base64');
    return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
  })
  .join('\n');
const out = `/* GENERATED — do not edit by hand. Regenerate with tools/gen-document-fonts.mjs.
   Self-hosted latin subsets (Inter, Space Grotesk, JetBrains Mono — all SIL OFL)
   embedded as base64 so the exported PDF and the editor's iframe preview render
   the exact same typography with no network request (DSGVO) and no dependency on
   fonts being installed in the Chromium/print environment. Latin subset covers
   Latin-1 (incl. German umlauts ä ö ü ß). */
/* eslint-disable */
export const DOCUMENT_FONT_FACE_CSS = ${JSON.stringify(faces)};
`;
writeFileSync(join(root, 'server/src/domain/document-fonts.ts'), out);
console.log('wrote server/src/domain/document-fonts.ts', (out.length / 1024).toFixed(0) + 'KB');
