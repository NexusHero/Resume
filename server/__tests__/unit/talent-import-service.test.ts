import { TalentImportService } from '../../src/services/talent-import-service';
import { TalentService } from '../../src/services/talent-service';
import { DocumentService } from '../../src/services/document-service';
import { DocumentAiService } from '../../src/services/document-ai-service';
import { LlmService } from '../../src/services/llm-service';
import { importedName, importedSkills } from '../../src/domain/talent-import';
import { emptyResume } from '../../src/domain/talent-documents';
import type { LlmProvider } from '../../src/ports/llm-provider';
import {
  InMemoryArtifactLogRepository,
  InMemoryTalentRepository,
  InMemoryUserRepository,
  InMemoryDocumentRepository,
  InMemoryCandidacyRepository,
  InMemoryApiKeyStore,
  InMemoryUsageMeter,
  InMemoryInterviewObservationRepository,
  InMemoryAttachmentStore,
  FakePdfRenderer,
  FakePdfTextExtractor,
  FixedClock,
  SequenceIdGenerator,
  noopLogger,
} from '../support/fakes';

const OWNER = 'owner1';
const b64 = (s: string) => Buffer.from(s).toString('base64');

function ctx(generate?: (p: string) => string, pdfText = 'Extracted CV text.') {
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
    attachmentStore: new InMemoryAttachmentStore(),
    candidacyRepository: new InMemoryCandidacyRepository(),
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
  const documentAiService = new DocumentAiService({
    documentService,
    llmService: new LlmService({
      providers: [provider],
      defaultProvider: 'claude',
      logger: noopLogger,
    }),
    apiKeyStore: new InMemoryApiKeyStore(),
    userRepository: users,
    pdfTextExtractor: new FakePdfTextExtractor(pdfText),
    usageMeter: new InMemoryUsageMeter(),
    interviewObservationRepository: new InMemoryInterviewObservationRepository(),
    artifactLogRepository: new InMemoryArtifactLogRepository(),
    idGenerator: new SequenceIdGenerator('art'),
    clock: new FixedClock(),
    logger: noopLogger,
  });
  const service = new TalentImportService({
    talentService,
    documentService,
    documentAiService,
    logger: noopLogger,
  });
  return { service, talents, documentService };
}

describe('talent-import domain helpers', () => {
  it('importedName_UsesContactName_ElsePlaceholder', () => {
    expect(importedName({ name: '  Ada Lovelace ' } as never)).toBe('Ada Lovelace');
    expect(importedName({ name: '   ' } as never)).toBe('Imported CV');
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

  it('AiParse_CreatesTalentsWithNameAndSkills', async () => {
    const c = ctx(jsonCv);
    const { results } = await c.service.importPdfs(OWNER, OWNER, {
      items: [{ dataBase64: b64('%PDF a'), filename: 'a.pdf' }],
    });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      ok: true,
      name: 'Ada Lovelace',
      skillCount: 2,
      provider: 'claude',
    });
    const [talent] = await c.talents.list(OWNER);
    expect(talent.name).toBe('Ada Lovelace');
    expect(talent.skills).toEqual(['Go', 'Rust']);
    const docs = await c.documentService.get(OWNER, talent.id);
    expect(docs.resume.summary).toBe('Builds engines.');
  });

  it('NoProvider_FallsBackToPlaceholderName', async () => {
    const c = ctx(); // no LLM → template parse keeps text, no name
    const { results } = await c.service.importPdfs(OWNER, OWNER, {
      items: [{ dataBase64: b64('%PDF a'), filename: 'a.pdf' }],
    });
    expect(results[0]).toMatchObject({ ok: true, name: 'Imported CV', provider: 'template' });
  });

  it('DownstreamFailure_RollsBackTheTalent', async () => {
    const c = ctx(jsonCv);
    jest.spyOn(c.documentService, 'save').mockRejectedValueOnce(new Error('disk full'));
    const { results } = await c.service.importPdfs(OWNER, OWNER, {
      items: [{ dataBase64: b64('%PDF a'), filename: 'broken.pdf' }],
    });
    expect(results[0]).toMatchObject({ ok: false, filename: 'broken.pdf' });
    expect(await c.talents.list(OWNER)).toHaveLength(0); // no orphan shell
  });

  it('Batch_ContinuesPastAFailure', async () => {
    const c = ctx(jsonCv);
    jest.spyOn(c.documentService, 'save').mockRejectedValueOnce(new Error('one bad'));
    const { results } = await c.service.importPdfs(OWNER, OWNER, {
      items: [
        { dataBase64: b64('%PDF a'), filename: 'a.pdf' },
        { dataBase64: b64('%PDF b'), filename: 'b.pdf' },
      ],
    });
    expect(results[0].ok).toBe(false);
    expect(results[1].ok).toBe(true);
    expect(await c.talents.list(OWNER)).toHaveLength(1);
  });
});
