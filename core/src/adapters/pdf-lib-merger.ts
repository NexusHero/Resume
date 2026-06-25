import { PDFDocument } from 'pdf-lib';
import type { PdfMerger } from '../ports/pdf-merger';

/** Merges PDF documents into one using pdf-lib. */
export class PdfLibMerger implements PdfMerger {
  async merge(parts: Buffer[], options: { title?: string } = {}): Promise<Buffer> {
    const out = await PDFDocument.create();
    if (options.title) out.setTitle(options.title);
    for (const part of parts) {
      const src = await PDFDocument.load(part, { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }
    return Buffer.from(await out.save());
  }
}
