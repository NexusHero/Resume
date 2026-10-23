import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NoTextLayerError } from '../../src/domain/errors.js';
import { PdfjsTextExtractor } from '../../src/adapters/pdfjs-text-extractor.js';
import { DocumentService } from '../../src/services/document-service.js';
import { LlmService } from '../../src/services/llm-service.js';
import { buildDocumentAiService } from '../support/build-document-ai.js';
import type { Talent } from '../../src/domain/talent.js';
import {
  InMemoryTalentRepository,
  InMemoryDocumentRepository,
  InMemoryUserRepository,
  InMemoryUsageMeter,
  InMemoryInterviewObservationRepository,
  InMemoryArtifactLogRepository,
  FakePdfRenderer,
  FakeLlmProvider,
  FixedClock,
  SequenceIdGenerator,
  noopLogger,
} from '../support/fakes.js';

/**
 * Phase-0 hardening: a password-protected or structurally broken PDF is a
 * *client* input problem — the import answers 422 `no-text-layer`, never a 500.
 * These run the real pdf.js adapter against committed/generated fixtures so the
 * `PasswordException`/`InvalidPDFException` classification stays honest.
 * The opposite branch (`classifyPdfjsError` rethrows anything else → 500
 * `InternalError`, Q1) is covered by `pdfjs-text-extractor-error.test.ts`, which
 * mocks the pdfjs module to throw a foreign error and asserts the rethrow; the
 * service-level 500 path is additionally covered by
 * `ParsePdf_ExtractorThrows_ThrowsInternalErrorNotNoTextLayer` (fake extractor).
 */
const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const OWNER = 'team';

const talent = (id: string): Talent => ({
  id,
  ownerId: OWNER,
  name: 'Lena',
  role: 'Designerin',
  headline: '',
  location: '',
  email: '',
  phone: '',
  availability: '',
  salary: '',
  skills: [],
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
});

/** A CvParseService (via DocumentAiService) wired to the *real* pdf.js extractor. */
function ctx() {
  const talents = new InMemoryTalentRepository();
  const documents = new InMemoryDocumentRepository();
  const users = new InMemoryUserRepository();
  const documentService = new DocumentService({
    documentRepository: documents,
    talentRepository: talents,
    userRepository: users,
    pdfRenderer: new FakePdfRenderer(),
    clock: new FixedClock(),
  });
  const service = buildDocumentAiService({
    documentService,
    // No server key → the text-only mode, so a successful extraction is stored
    // as `rawText` and never reaches the LLM.
    llmService: new LlmService({
      providers: [new FakeLlmProvider('claude', false)],
      defaultProvider: 'claude',
      logger: noopLogger,
    }),
    userRepository: users,
    pdfTextExtractor: new PdfjsTextExtractor(),
    usageMeter: new InMemoryUsageMeter(),
    interviewObservationRepository: new InMemoryInterviewObservationRepository(),
    artifactLogRepository: new InMemoryArtifactLogRepository(),
    idGenerator: new SequenceIdGenerator('art'),
    clock: new FixedClock(),
    logger: noopLogger,
  });
  return { service, talents };
}

describe('CvParseService PDF input errors (Phase-0 hardening)', () => {
  it('ParsePdf_PasswordProtected_Returns422NoTextLayer', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    const pdf = readFileSync(join(FIXTURES, 'password-protected.pdf'));
    await expect(c.service.parsePdf(OWNER, OWNER, 't1', pdf)).rejects.toBeInstanceOf(
      NoTextLayerError,
    );
  }, 30_000);

  it('ParsePdf_CorruptPdf_Returns422NoTextLayer', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    const corrupt = Buffer.from('%PDF-1.4 truncated header, not a real PDF');
    await expect(c.service.parsePdf(OWNER, OWNER, 't1', corrupt)).rejects.toBeInstanceOf(
      NoTextLayerError,
    );
  }, 30_000);

  it('ParsePdf_TextPdf_StillExtractsTextLayer', async () => {
    // Regression guard: a healthy PDF still extracts (text mode) rather than
    // being misclassified as no-text-layer.
    const c = ctx();
    await c.talents.add(talent('t1'));
    const pdf = readFileSync(join(FIXTURES, 'text-cv.pdf'));
    const parsed = await c.service.parsePdf(OWNER, OWNER, 't1', pdf);
    expect(parsed.mode).toBe('text');
    expect(parsed.resume.rawText).toContain('Lebenslauf');
  }, 30_000);
});
