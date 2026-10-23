import { jest } from '@jest/globals';
import { NoTextLayerError } from '../../src/domain/errors.js';

// The "neither PasswordException nor InvalidPDFException" branch: pdfjs rejects
// with a generic error, and the extractor must rethrow it so the service answers
// 500 (InternalError), never the 422 "no text layer" path. ESM modules are mocked
// via `unstable_mockModule` + a dynamic import *after* the mock is registered
// (same convention as puppeteer-pdf-renderer.test.ts).
jest.unstable_mockModule('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: () => ({ promise: Promise.reject(new Error('unexpected pdfjs failure')) }),
}));

let PdfjsTextExtractor: typeof import('../../src/adapters/pdfjs-text-extractor.js').PdfjsTextExtractor;

beforeAll(async () => {
  ({ PdfjsTextExtractor } = await import('../../src/adapters/pdfjs-text-extractor.js'));
});

describe('PdfjsTextExtractor unexpected pdfjs failure', () => {
  it('PdfjsTextExtractor_UnexpectedPdfjsError_RethrowsOriginalNotNoTextLayer', async () => {
    const err = await new PdfjsTextExtractor()
      .extract(Buffer.from('%PDF-1.4 fake'))
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(NoTextLayerError);
    expect((err as Error).message).toBe('unexpected pdfjs failure');
  }, 30_000);
});
