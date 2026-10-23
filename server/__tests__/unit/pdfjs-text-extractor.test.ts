import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PdfjsTextExtractor } from '../../src/adapters/pdfjs-text-extractor.js';

/**
 * Real-PDF smoke for the text-layer extractor. The fake extractor in the
 * service tests hid a pdfjs 6 API break (`PDFDocumentProxy.destroy` is gone),
 * so this test runs the real adapter against an embedded, text-bearing PDF.
 */
const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'text-cv.pdf');

describe('PdfjsTextExtractor (real pdf.js)', () => {
  it('PdfjsTextExtractor_TextPdf_ReturnsItsTextLayer', async () => {
    const text = await new PdfjsTextExtractor().extract(readFileSync(FIXTURE));
    expect(text).toContain('Lebenslauf Max Beispiel');
    expect(text).toContain('Backend Engineer');
    expect(text.replace(/\s/g, '').length).toBeGreaterThan(20);
  }, 30_000);

  it('PdfjsTextExtractor_CanExtractTwice_CleansUpWithoutThrowing', async () => {
    const pdf = readFileSync(FIXTURE);
    const extractor = new PdfjsTextExtractor();
    await expect(extractor.extract(pdf)).resolves.toContain('Beispiel');
    await expect(extractor.extract(pdf)).resolves.toContain('Beispiel');
  }, 30_000);
});
