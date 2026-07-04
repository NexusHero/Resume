import type { PdfTextExtractor } from '../ports/pdf-text-extractor.js';

// pdfjs-dist v4 ships as ESM only. This project compiles to CommonJS, where
// `import()` would be transpiled to `require()` — which cannot load an ESM
// package. Route the import through `new Function` so TypeScript leaves it as a
// genuine dynamic import that Node resolves as ESM at runtime.
const importEsm = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<Record<string, unknown>>;

/** PDF → text via Mozilla's pdf.js (legacy build, no worker, no canvas). */
export class PdfjsTextExtractor implements PdfTextExtractor {
  async extract(pdf: Buffer): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjs: any = await importEsm('pdfjs-dist/legacy/build/pdf.mjs');
    const task = pdfjs.getDocument({
      data: new Uint8Array(pdf),
      useSystemFonts: true,
      isEvalSupported: false,
    });
    const doc = await task.promise;
    try {
      const pages: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pages.push(content.items.map((it: any) => ('str' in it ? it.str : '')).join(' '));
      }
      return pages
        .join('\n')
        .replace(/[ \t]+/g, ' ')
        .trim();
    } finally {
      await doc.destroy();
    }
  }
}
