import type { PdfTextExtractor } from '../ports/pdf-text-extractor.js';

/** PDF → text via Mozilla's pdf.js (legacy build, no worker, no canvas). */
export class PdfjsTextExtractor implements PdfTextExtractor {
  async extract(pdf: Buffer): Promise<string> {
    // The project is native ESM (package.json "type": "module"), so a plain
    // dynamic import loads pdfjs-dist's ESM build in both Node and Jest.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
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
      // pdfjs-dist 6 removed PDFDocumentProxy.destroy(); cleanup() releases the
      // page/font resources without tearing down the loading task.
      await doc.cleanup();
    }
  }
}
