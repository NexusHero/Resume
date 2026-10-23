import { jest } from '@jest/globals';
import { TalentImportService } from '../../src/services/talent-import-service.js';
import { AttachmentService } from '../../src/services/attachment-service.js';
import { TalentService } from '../../src/services/talent-service.js';
import { DocumentService } from '../../src/services/document-service.js';
import { buildDocumentAiService } from '../support/build-document-ai.js';
import { LlmService } from '../../src/services/llm-service.js';
import {
  importedName,
  importedSkills,
  nameFromFilename,
  DEFAULT_IMPORT_NAME,
} from '../../src/domain/talent-import.js';
import { emptyResume } from '../../src/domain/talent-documents.js';
import type { LlmProvider } from '../../src/ports/llm-provider.js';
import {
  InMemoryArtifactLogRepository,
  InMemoryTalentRepository,
  InMemoryUserRepository,
  InMemoryDocumentRepository,
  InMemoryCandidacyRepository,
  InMemoryUsageMeter,
  InMemoryInterviewObservationRepository,
  InMemoryAttachmentStore,
  FakePdfRenderer,
  FakePdfTextExtractor,
  FixedClock,
  SequenceIdGenerator,
  noopLogger,
} from '../support/fakes.js';
import { buildTalentDataPurgers } from '../support/talent-purgers.js';

const OWNER = 'owner1';
const b64 = (s: string) => Buffer.from(s).toString('base64');

function ctx(
  generate?: (p: string) => string,
  pdfText = 'Extracted CV text from the uploaded PDF.',
) {
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
  const talentService = new TalentService({
    talentRepository: talents,
    documentRepository: documents,
    talentDataPurgers: buildTalentDataPurgers({
      documentRepository: documents,
      attachmentStore: new InMemoryAttachmentStore(),
      candidacyRepository: new InMemoryCandidacyRepository(),
      clock: new FixedClock(),
    }),
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator('talent'),
  });
  const provider: LlmProvider = {
    id: 'claude',
    label: 'Claude',
    available: !!generate,
    generate: async (input) => ({
      text: generate ? generate(input.prompt) : '',
      usage: { inputTokens: 5, outputTokens: 7 },
    }),
  };
  const attachmentStore = new InMemoryAttachmentStore();
  const documentAiService = buildDocumentAiService({
    documentService,
    userRepository: users,
    llmService: new LlmService({
      providers: [provider],
      defaultProvider: 'claude',
      logger: noopLogger,
    }),
    pdfTextExtractor: new FakePdfTextExtractor(pdfText),
    usageMeter: new InMemoryUsageMeter(),
    interviewObservationRepository: new InMemoryInterviewObservationRepository(),
    artifactLogRepository: new InMemoryArtifactLogRepository(),
    idGenerator: new SequenceIdGenerator('art'),
    clock: new FixedClock(),
    logger: noopLogger,
  });
  const attachmentService = new AttachmentService({
    attachmentStore,
    talentRepository: talents,
    userRepository: users,
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator('att'),
  });
  const service = new TalentImportService({
    talentService,
    documentService,
    documentAiService,
    attachmentService,
    logger: noopLogger,
  });
  return { service, talents, documentService, attachmentService };
}

describe('talent-import domain helpers', () => {
  it('importedName_UsesContactName_ElsePlaceholder', () => {
    expect(importedName({ name: '  Ada Lovelace ' } as never)).toBe('Ada Lovelace');
    expect(importedName({ name: '   ' } as never)).toBe('Importierter Lebenslauf');
    expect(DEFAULT_IMPORT_NAME).toBe('Importierter Lebenslauf');
  });

  it('importedSkills_FlattensDedupsAndTrims', () => {
    const resume = {
      ...emptyResume,
      skillGroups: [
        { label: 'Lang', items: [' Go ', 'Rust', 'go'] },
        { label: 'Cloud', items: ['AWS', ''] },
      ],
    };
    expect(importedSkills(resume)).toEqual(['Go', 'Rust', 'AWS']);
  });
});

describe('TalentImportService.importPdfs', () => {
  const jsonCv = () =>
    JSON.stringify({
      contact: { name: 'Ada Lovelace', role: 'Engineer', email: 'ada@x.io' },
      resume: {
        summary: 'Builds engines.',
        skillGroups: [{ label: 'Lang', items: ['Go', 'Rust'] }],
      },
    });
  const pdfBase64 = (label: string) => b64(`%PDF ${label}`);

  it('TalentImportService_NoProvider_ImportsAllFilesInTextMode', async () => {
    const c = ctx(); // no provider → the named text mode
    const { results } = await c.service.importPdfs(OWNER, OWNER, {
      items: [
        { dataBase64: pdfBase64('a'), filename: 'ada_lovelace.pdf' },
        { dataBase64: pdfBase64('b'), filename: 'grace_hopper.pdf' },
      ],
    });
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ ok: true, mode: 'text', name: 'Ada Lovelace' });
    expect(results[0]).not.toHaveProperty('provider');
    expect(await c.talents.list(OWNER)).toHaveLength(2);
  });

  it('TextImport_LongCv_KeepsFullText', async () => {
    const longText = 'Berufserfahrung. '.repeat(200); // ~3200 chars, > the old 600 cut
    const c = ctx(undefined, longText);
    const { results } = await c.service.importPdfs(OWNER, OWNER, {
      items: [{ dataBase64: pdfBase64('a'), filename: 'ada.pdf' }],
    });
    const talentId = (results[0] as { talentId: string }).talentId;
    const docs = await c.documentService.get(OWNER, talentId);
    expect(docs.resume.rawText).toContain('Berufserfahrung.');
    expect(docs.resume.rawText.length).toBeGreaterThan(600);
    expect(docs.resume.summary).toBe('');
  });

  it('TextImport_VeryLongCv_TruncatesAtLimitAndReportsTruncated', async () => {
    const huge = 'x'.repeat(60_000);
    const c = ctx(undefined, huge);
    const { results } = await c.service.importPdfs(OWNER, OWNER, {
      items: [{ dataBase64: pdfBase64('a'), filename: 'ada.pdf' }],
    });
    expect(results[0]).toMatchObject({ ok: true, mode: 'text', truncated: true });
    const docs = await c.documentService.get(OWNER, (results[0] as { talentId: string }).talentId);
    expect(docs.resume.rawText).toHaveLength(50_000);
  });

  it('TalentImportService_TextMode_StoresOriginalAsReferenceAttachment', async () => {
    const c = ctx();
    const { results } = await c.service.importPdfs(OWNER, OWNER, {
      items: [{ dataBase64: pdfBase64('a'), filename: 'ada.pdf' }],
    });
    const first = results[0] as { attachmentId?: string; talentId: string };
    expect(first.attachmentId).toBeTruthy();
    const attachments = await c.attachmentService.list(OWNER, first.talentId);
    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toMatchObject({
      name: 'Original-Lebenslauf (Import).pdf',
      contentType: 'application/pdf',
    });
  });

  it('TalentImportService_TextMode_DerivesNameFromFilename', async () => {
    expect(nameFromFilename('ada_lovelace-cv.pdf')).toBe('Ada Lovelace Cv');
    const c = ctx();
    const { results } = await c.service.importPdfs(OWNER, OWNER, {
      items: [{ dataBase64: pdfBase64('a'), filename: 'max_beispiel.pdf' }],
    });
    expect(results[0]).toMatchObject({ ok: true, name: 'Max Beispiel' });
  });

  it('TalentImportService_FilenameUnusable_UsesImportierterLebenslauf', async () => {
    expect(nameFromFilename('.pdf')).toBe(DEFAULT_IMPORT_NAME);
    const c = ctx();
    const { results } = await c.service.importPdfs(OWNER, OWNER, {
      items: [{ dataBase64: pdfBase64('a'), filename: '.pdf' }],
    });
    expect(results[0]).toMatchObject({ ok: true, name: 'Importierter Lebenslauf' });
  });

  it('TalentImportService_OneScannedPdf_ReportsNoTextLayerAndOthersStillSucceed', async () => {
    const c = ctx(undefined, 'no text'); // below the 20-char threshold for every file
    const { results } = await c.service.importPdfs(OWNER, OWNER, {
      items: [
        { dataBase64: pdfBase64('a'), filename: 'scan.pdf' },
        { dataBase64: pdfBase64('b'), filename: 'scan2.pdf' },
      ],
    });
    expect(results[0]).toMatchObject({ ok: false, error: 'no-text-layer' });
    expect(results[1]).toMatchObject({ ok: false, error: 'no-text-layer' });
  });

  it('AiParse_WithProvider_ReturnsAiModeWithProviderAndUsage', async () => {
    const c = ctx(jsonCv);
    const { results } = await c.service.importPdfs(OWNER, OWNER, {
      items: [{ dataBase64: pdfBase64('a'), filename: 'a.pdf' }],
    });
    expect(results[0]).toMatchObject({
      ok: true,
      name: 'Ada Lovelace',
      skillCount: 2,
      mode: 'ai',
      provider: 'claude',
    });
    const [talent] = await c.talents.list(OWNER);
    const docs = await c.documentService.get(OWNER, talent.id);
    expect(docs.resume.summary).toBe('Builds engines.');
  });

  it('TalentImportService_AiModeOneFileFails_ReportsFailureAndNeverDowngrades', async () => {
    const c = ctx(jsonCv);
    jest.spyOn(c.documentService, 'save').mockRejectedValueOnce(new Error('disk full'));
    const { results } = await c.service.importPdfs(OWNER, OWNER, {
      items: [
        { dataBase64: pdfBase64('a'), filename: 'broken.pdf' },
        { dataBase64: pdfBase64('b'), filename: 'b.pdf' },
      ],
    });
    expect(results[0]).toMatchObject({ ok: false, filename: 'broken.pdf' });
    expect(results[1]).toMatchObject({ ok: true, mode: 'ai' });
    expect(await c.talents.list(OWNER)).toHaveLength(1);
  });
});
