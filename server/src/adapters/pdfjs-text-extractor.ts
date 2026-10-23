import type { PdfTextExtractor } from '../ports/pdf-text-extractor.js';
import { NoTextLayerError } from '../domain/errors.js';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let doc: any;
    try {
      doc = await task.promise;
    } catch (err) {
      throw classifyPdfjsError(err);
    }
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
    } catch (err) {
      throw classifyPdfjsError(err);
    } finally {
      // pdfjs-dist 6 removed PDFDocumentProxy.destroy(); cleanup() releases the
      // page/font resources without tearing down the loading task.
      await doc.cleanup();
    }
  }
}

/**
 * A password-protected or structurally broken PDF is a *client* input problem:
 * the user can paste the text instead. pdfjs signals these with its own
 * `PasswordException` / `InvalidPDFException`; translate them to the domain's
 * 422 `no-text-layer` so the import answers 422, while every other (genuinely
 * unexpected) extraction failure keeps the 500 `InternalError` path (Q1).
 */
function classifyPdfjsError(err: unknown): unknown {
  const name = (err as { name?: unknown } | null)?.name;
  if (name === 'PasswordException' || name === 'InvalidPDFException') {
    return new NoTextLayerError();
  }
  return err;
}
