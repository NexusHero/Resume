import {
  InternalError,
  NotFoundError,
  NoTextLayerError,
  AiNotConfiguredError,
  AiConsentRequiredError,
  UpstreamProviderError,
  ValidationError,
} from '../../src/domain/errors.js';
import { jest } from '@jest/globals';
import { DocumentService } from '../../src/services/document-service.js';
import { LlmService } from '../../src/services/llm-service.js';
import type { DocumentAiService } from '../../src/services/document-ai-service.js';
import type { LlmGenerateInput, LlmProvider } from '../../src/ports/llm-provider.js';
import {
  InMemoryArtifactLogRepository,
  InMemoryTalentRepository,
  InMemoryUserRepository,
  InMemoryDocumentRepository,
  InMemoryUsageMeter,
  InMemoryInterviewObservationRepository,
  FakePdfRenderer,
  FakePdfTextExtractor,
  FixedClock,
  SequenceIdGenerator,
  noopLogger,
} from '../support/fakes.js';
import { buildDocumentAiService } from '../support/build-document-ai.js';
import type { Talent } from '../../src/domain/talent.js';
import { saveDocumentsSchema } from '../../src/domain/talent-documents.js';

const OWNER = 'owner1';
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

interface ProviderStub {
  id?: 'claude' | 'gemini';
  label?: string;
  available?: boolean;
  generate?: (input: LlmGenerateInput) => Promise<string>;
}

function ctx(
  stub: ProviderStub = {},
  pdfText: string | Error = '',
  logger = noopLogger,
  workspaceSettings?: { isAiConsentGranted(scope: string): Promise<boolean> },
) {
  const talents = new InMemoryTalentRepository();
  const documents = new InMemoryDocumentRepository();
  const users = new InMemoryUserRepository();
  const usageMeter = new InMemoryUsageMeter();
  const pdfTextExtractor = new FakePdfTextExtractor(pdfText);
  const documentService = new DocumentService({
    documentRepository: documents,
    talentRepository: talents,
    userRepository: users,
    pdfRenderer: new FakePdfRenderer(),
    clock: new FixedClock(),
  });
  const provider: LlmProvider = {
    id: stub.id ?? 'claude',
    label: stub.label ?? 'Claude',
    available: stub.available ?? false,
    generate: async (input) => {
      const text = stub.generate
        ? await stub.generate(input)
        : 'AI PARA ONE.\n\nAI PARA TWO.\n\nAI PARA THREE.';
      return { text, usage: { inputTokens: 5, outputTokens: 7 } };
    },
  };
  // A gemini twin so tests can exercise the persisted per-user provider choice
  // (ADR-0011, kept by ADR-0057): with 'claude' as the default it is only
  // reachable through a user's stored preference.
  const gemini: LlmProvider = { ...provider, id: 'gemini', label: 'Gemini' };
  const llm = new LlmService({
    providers: [provider, gemini],
    defaultProvider: stub.id ?? 'claude',
    logger: noopLogger,
  });
  const observations = new InMemoryInterviewObservationRepository();
  const artifacts = new InMemoryArtifactLogRepository();
  const service = buildDocumentAiService({
    documentService,
    llmService: llm,
    userRepository: users,
    pdfTextExtractor,
    usageMeter,
    interviewObservationRepository: observations,
    artifactLogRepository: artifacts,
    idGenerator: new SequenceIdGenerator('art'),
    clock: new FixedClock(),
    logger,
    ...(workspaceSettings ? { workspaceSettings } : {}),
  });
  return {
    service,
    talents,
    users,
    usageMeter,
    observations,
    artifacts,
    documentService,
  };
}

const germanDocuments = saveDocumentsSchema.parse({
  contact: { name: 'Lena', role: 'Produktdesignerin' },
  resume: {
    summary:
      'Erfahrene Designerin mit abgeschlossenem Studium und langjähriger Erfahrung ' +
      'in anspruchsvollen Projekten für internationale Unternehmen.',
    experience: [
      {
        role: 'Designerin',
        company: 'Aurora',
        bullets: ['Gestaltung und Pflege der Design-Systeme für die wichtigsten Produkte'],
      },
    ],
    skillGroups: [{ label: 'Werkzeuge', items: ['Figma'] }],
  },
});

describe('DocumentAiService.suggest', () => {
  it('Suggest_WithProvider_UsesProviderAndAttachesUsage', async () => {
    const c = ctx({ available: true });
    await c.talents.add(talent('t1'));

    const summary = await c.service.suggest(OWNER, OWNER, 't1', 'summary');
    expect(summary.provider).toBe('claude');
    expect(summary.text).toContain('AI PARA ONE');
    expect(summary.usage).toEqual({ inputTokens: 5, outputTokens: 7, costUsd: 0.0001 });

    const letter = await c.service.suggest(OWNER, OWNER, 't1', 'letter', { role: 'X' });
    expect(letter.paragraphs).toEqual(['AI PARA ONE.', 'AI PARA TWO.', 'AI PARA THREE.']);
  });

  it('Suggest_UsesTheUsersPersistedProviderChoice', async () => {
    // The configured default is claude, but this user persisted a gemini choice
    // on the account (ADR-0011) — the choice must win, also after a restart.
    const c = ctx({ available: true });
    await c.talents.add(talent('t1'));
    await c.users.add({
      id: OWNER,
      email: 'owner@example.com',
      passwordHash: 'h',
      roles: ['recruiter'],
      createdAt: '2026-06-25T10:00:00.000Z',
      llmProvider: 'gemini',
    });
    const summary = await c.service.suggest(OWNER, OWNER, 't1', 'summary');
    expect(summary.provider).toBe('gemini');
  });

  it('Suggest_NoProviderConfigured_ThrowsAiNotConfigured', async () => {
    const c = ctx(); // provider unavailable → no central key
    await c.talents.add(talent('t1'));
    await expect(c.service.suggest(OWNER, OWNER, 't1', 'summary')).rejects.toBeInstanceOf(
      AiNotConfiguredError,
    );
  });

  it('Suggest_ProviderThrows_ThrowsUpstreamProvider', async () => {
    const c = ctx({
      available: true,
      generate: async () => {
        throw new Error('boom');
      },
    });
    await c.talents.add(talent('t1'));
    await expect(c.service.suggest(OWNER, OWNER, 't1', 'summary')).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('Suggest_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.suggest(OWNER, OWNER, 'missing', 'summary')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('Suggest_WithProvider_MetersUsageAgainstTheUser', async () => {
    const c = ctx({ available: true });
    await c.talents.add(talent('t1'));
    await c.service.suggest(OWNER, OWNER, 't1', 'summary');
    const events = await c.usageMeter.list(OWNER);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      provider: 'claude',
      feature: 'suggest',
      inputTokens: 5,
      outputTokens: 7,
    });
  });

  it('Suggest_GermanCv_PromptsCarryGermanDirective', async () => {
    const systems: string[] = [];
    const c = ctx({
      available: true,
      generate: async (input) => {
        systems.push(input.system ?? '');
        return 'Ein Vorschlag.';
      },
    });
    await c.talents.add(talent('t1'));
    await c.documentService.save(OWNER, 't1', germanDocuments);

    await c.service.suggest(OWNER, OWNER, 't1', 'summary');
    await c.service.suggest(OWNER, OWNER, 't1', 'letter');
    expect(systems).toHaveLength(2);
    for (const system of systems) {
      expect(system).toContain('Antworte ausschließlich auf Deutsch.');
    }
  });

  it('Suggest_EnglishCv_PromptsCarryEnglishDirective', async () => {
    const systems: string[] = [];
    const c = ctx({
      available: true,
      generate: async (input) => {
        systems.push(input.system ?? '');
        return 'A suggestion.';
      },
    });
    await c.talents.add(talent('t1')); // empty docs → detection falls back to 'en'

    await c.service.suggest(OWNER, OWNER, 't1', 'summary');
    expect(systems[0]).toContain('Respond in English only.');
  });

  it('Suggest_MeteringFailure_DoesNotBreakTheSuggestion', async () => {
    const c = ctx({ available: true });
    c.usageMeter.record = async () => {
      throw new Error('meter down');
    };
    await c.talents.add(talent('t1'));
    const res = await c.service.suggest(OWNER, OWNER, 't1', 'summary');
    expect(res.provider).toBe('claude'); // succeeds despite the meter throwing
  });
});

describe('DocumentAiService.parse', () => {
  const RESUME_JSON = JSON.stringify({
    contact: { name: 'Max Mustermann', role: 'C++ Engineer' },
    resume: {
      summary: 'Senior Engineer.',
      experience: [{ role: 'Dev', company: 'Acme', period: '2020—', bullets: ['Shipped X'] }],
      skillGroups: [{ label: 'Lang', items: ['C++'] }],
    },
  });

  it('Parse_WithProvider_ReturnsValidatedStructure', async () => {
    const c = ctx({ available: true, generate: async () => '```json\n' + RESUME_JSON + '\n```' });
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parse(OWNER, OWNER, 't1', 'raw cv text');
    expect(parsed.mode).toBe('ai');
    expect(parsed.provider).toBe('claude');
    expect(parsed.contact.name).toBe('Max Mustermann');
    expect(parsed.resume.summary).toBe('Senior Engineer.');
    expect(parsed.resume.experience[0]).toMatchObject({ company: 'Acme', bullets: ['Shipped X'] });
    expect(parsed.resume.education).toEqual([]);
  });

  it('CvParseService_NoProvider_TakesTextWithoutAiAndNamesTheMode', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parse(OWNER, OWNER, 't1', 'My whole CV as text');
    expect(parsed.mode).toBe('text');
    expect(parsed.provider).toBeUndefined();
    expect(parsed.resume.rawText).toBe('My whole CV as text');
    expect(parsed.resume.summary).toBe('');
  });

  it('ParseService_NoKey_TextModeSucceedsWithoutConsent', async () => {
    // No key → the named text take-over runs and never transmits (ADR-0063
    // §Decision 4): consent is not required, and no consent check may fire.
    const c = ctx({}, '', noopLogger, { isAiConsentGranted: async () => false });
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parse(OWNER, OWNER, 't1', 'My whole CV as text');
    expect(parsed.mode).toBe('text');
    expect(parsed.resume.rawText).toBe('My whole CV as text');
  });

  it('ParseService_WithKey_NoConsent_ThrowsAiConsentRequired', async () => {
    const c = ctx({ available: true }, '', noopLogger, {
      isAiConsentGranted: async () => false,
    });
    await c.talents.add(talent('t1'));
    await expect(c.service.parse(OWNER, OWNER, 't1', 'raw cv text')).rejects.toBeInstanceOf(
      AiConsentRequiredError,
    );
  });

  it('ParseService_WithKey_WithConsent_UsesAiMode', async () => {
    const c = ctx(
      { available: true, generate: async () => '```json\n' + RESUME_JSON + '\n```' },
      '',
      noopLogger,
      { isAiConsentGranted: async () => true },
    );
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parse(OWNER, OWNER, 't1', 'raw cv text');
    expect(parsed.mode).toBe('ai');
    expect(parsed.provider).toBe('claude');
  });

  it('Parse_MalformedJson_ThrowsUpstreamProvider', async () => {
    const c = ctx({ available: true, generate: async () => 'not json at all' });
    await c.talents.add(talent('t1'));
    await expect(c.service.parse(OWNER, OWNER, 't1', 'the cv')).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('CvParse_ProviderReturnsMalformedPayload_ThrowsUpstreamProviderError', async () => {
    // Valid JSON, but the shape fails the documents schema: that is an unusable
    // provider reply (502), not a client validation error (400).
    const c = ctx({
      available: true,
      generate: async () => JSON.stringify({ contact: 'not-an-object', resume: 42 }),
    });
    await c.talents.add(talent('t1'));
    await expect(c.service.parse(OWNER, OWNER, 't1', 'the cv')).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('CvParse_AiMode_OverLimitText_SetsTruncatedFlag', async () => {
    const c = ctx({ available: true, generate: async () => RESUME_JSON });
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parse(OWNER, OWNER, 't1', 'x'.repeat(50_001));
    expect(parsed.mode).toBe('ai');
    expect(parsed.truncated).toBe(true);
  });

  it('Parse_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.parse(OWNER, OWNER, 'missing', 'x')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('DocumentAiService.parsePdf', () => {
  const PDF = Buffer.from('%PDF-1.4 fake');

  it('ParsePdf_WithProvider_ExtractsThenParses', async () => {
    const RESUME_JSON = JSON.stringify({
      contact: { name: 'Max Mustermann', role: 'C++ Engineer' },
      resume: { summary: 'Senior Engineer.' },
    });
    const c = ctx(
      { available: true, generate: async () => RESUME_JSON },
      'Max Mustermann — Senior C++ Engineer at Acme',
    );
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parsePdf(OWNER, OWNER, 't1', PDF);
    expect(parsed.mode).toBe('ai');
    expect(parsed.provider).toBe('claude');
    expect(parsed.contact.name).toBe('Max Mustermann');
    expect(parsed.extractedChars).toBeGreaterThan(0);
  });

  it('CvParseService_PdfWithoutTextLayer_ThrowsNoTextLayerInTextMode', async () => {
    const c = ctx({}, '   ');
    await c.talents.add(talent('t1'));
    await expect(c.service.parsePdf(OWNER, OWNER, 't1', PDF)).rejects.toBeInstanceOf(
      NoTextLayerError,
    );
  });

  it('CvParseService_PdfWithoutTextLayer_ThrowsNoTextLayerInAiMode', async () => {
    const c = ctx({ available: true, generate: async () => 'unused' }, '   ');
    await c.talents.add(talent('t1'));
    await expect(c.service.parsePdf(OWNER, OWNER, 't1', PDF)).rejects.toBeInstanceOf(
      NoTextLayerError,
    );
  });

  it('CvParseService_PdfTextBelowThreshold_ThrowsNoTextLayer', async () => {
    const c = ctx({ available: true }, 'short');
    await c.talents.add(talent('t1'));
    await expect(c.service.parsePdf(OWNER, OWNER, 't1', PDF)).rejects.toBeInstanceOf(
      NoTextLayerError,
    );
  });

  it('ParsePdf_ExtractorThrows_ThrowsInternalErrorNotNoTextLayer', async () => {
    const c = ctx({ available: true }, new Error('corrupt pdf'));
    await c.talents.add(talent('t1'));
    await expect(c.service.parsePdf(OWNER, OWNER, 't1', PDF)).rejects.toBeInstanceOf(InternalError);
  });

  it('ParsePdf_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.parsePdf(OWNER, OWNER, 'missing', PDF)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('DocumentAiService.scoreAgainstJob', () => {
  const ATS_JSON = JSON.stringify({
    score: 82,
    matched: ['C++'],
    missing: ['Kubernetes'],
    suggestions: ['Add Kubernetes experience'],
  });

  it('Score_WithProvider_ReturnsNormalizedResult', async () => {
    const c = ctx({ available: true, generate: async () => ATS_JSON });
    await c.talents.add(talent('t1'));
    const res = await c.service.scoreAgainstJob(OWNER, OWNER, 't1', 'C++ role, Kubernetes a plus');
    expect(res.provider).toBe('claude');
    expect(res.score).toBe(82);
    expect(res.missing).toEqual(['Kubernetes']);
  });

  it('Score_ClampsOutOfRangeScore', async () => {
    const c = ctx({
      available: true,
      generate: async () =>
        JSON.stringify({ score: 140, matched: [], missing: [], suggestions: [] }),
    });
    await c.talents.add(talent('t1'));
    const res = await c.service.scoreAgainstJob(OWNER, OWNER, 't1', 'job');
    expect(res.score).toBe(100);
  });

  it('Score_NoProvider_ThrowsAiNotConfigured', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await expect(
      c.service.scoreAgainstJob(OWNER, OWNER, 't1', 'any job text'),
    ).rejects.toBeInstanceOf(AiNotConfiguredError);
  });

  it('Score_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.scoreAgainstJob(OWNER, OWNER, 'missing', 'job')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('DocumentAiService.pitchForMandate', () => {
  const PITCH_JSON = JSON.stringify({
    headline: 'Starke Designerin für euer Team',
    paragraphs: ['Lena überzeugt durch …', 'Ihre Stationen zeigen …'],
    highlights: ['Design Systems', 'Prototyping'],
  });

  it('Pitch_WithProvider_ReturnsNormalizedResult', async () => {
    const c = ctx({ available: true, generate: async () => '```json\n' + PITCH_JSON + '\n```' });
    await c.talents.add(talent('t1'));
    const res = await c.service.pitchForMandate(OWNER, OWNER, 't1', 'UX Lead gesucht');
    expect(res.provider).toBe('claude');
    expect(res.headline).toContain('Designerin');
    expect(res.paragraphs).toHaveLength(2);
    expect(res.highlights).toEqual(['Design Systems', 'Prototyping']);
  });

  it('Pitch_EmptyLlmResult_ThrowsUpstreamProvider', async () => {
    const c = ctx({
      available: true,
      generate: async () => JSON.stringify({ headline: '', paragraphs: [], highlights: [] }),
    });
    await c.talents.add(talent('t1'));
    await expect(c.service.pitchForMandate(OWNER, OWNER, 't1', '')).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('Pitch_NoProvider_ThrowsAiNotConfigured', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await expect(
      c.service.pitchForMandate(OWNER, OWNER, 't1', 'any mandate'),
    ).rejects.toBeInstanceOf(AiNotConfiguredError);
  });

  it('Pitch_ProviderThrows_ThrowsUpstreamProvider', async () => {
    const c = ctx({
      available: true,
      generate: async () => {
        throw new Error('boom');
      },
    });
    await c.talents.add(talent('t1'));
    await expect(c.service.pitchForMandate(OWNER, OWNER, 't1', '')).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('Pitch_MalformedJson_ThrowsUpstreamProvider', async () => {
    const c = ctx({ available: true, generate: async () => 'not json' });
    await c.talents.add(talent('t1'));
    await expect(c.service.pitchForMandate(OWNER, OWNER, 't1', '')).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('Pitch_HeadlineOnly_UsesProviderResult', async () => {
    const c = ctx({
      available: true,
      generate: async () =>
        JSON.stringify({ headline: '', paragraphs: ['Ein starker Absatz.'], highlights: [] }),
    });
    await c.talents.add(talent('t1'));
    const res = await c.service.pitchForMandate(OWNER, OWNER, 't1', '');
    expect(res.provider).toBe('claude');
    expect(res.paragraphs).toEqual(['Ein starker Absatz.']);
  });

  it('Pitch_FabricatedSkill_IsFlaggedByGrounding', async () => {
    const json = JSON.stringify({
      headline: 'Cloud-Profi',
      paragraphs: ['Erfahren mit Kubernetes und Docker.'],
      highlights: [],
    });
    const c = ctx({ available: true, generate: async () => json });
    await c.talents.add(talent('t1'));
    const res = await c.service.pitchForMandate(OWNER, OWNER, 't1', '');
    expect(res.grounding.grounded).toBe(false);
    expect(res.grounding.unsupported.map((u) => u.text)).toEqual(
      expect.arrayContaining(['kubernetes', 'docker']),
    );
  });

  it('Pitch_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.pitchForMandate(OWNER, OWNER, 'missing', '')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('DocumentAiService.outreach', () => {
  const opts = (over: Partial<Parameters<DocumentAiService['outreach']>[3]> = {}) => ({
    audience: 'candidate' as const,
    channel: 'email' as const,
    tone: '',
    mandateContext: '',
    recruiterName: '',
    ...over,
  });

  it('Outreach_WithProvider_ReturnsNormalizedMessage', async () => {
    const json = JSON.stringify({ subject: 'Spannende Rolle', body: 'Hallo Lena, …' });
    const c = ctx({ available: true, generate: async () => '```json\n' + json + '\n```' });
    await c.talents.add(talent('t1'));
    const res = await c.service.outreach(OWNER, OWNER, 't1', opts());
    expect(res.provider).toBe('claude');
    expect(res.subject).toBe('Spannende Rolle');
    expect(res.body).toContain('Hallo Lena');
  });

  it('Outreach_LinkedIn_DropsSubjectEvenIfProvided', async () => {
    const json = JSON.stringify({ subject: 'sollte weg', body: 'Kurze DM' });
    const c = ctx({ available: true, generate: async () => json });
    await c.talents.add(talent('t1'));
    const res = await c.service.outreach(OWNER, OWNER, 't1', opts({ channel: 'linkedin' }));
    expect(res.provider).toBe('claude');
    expect(res.subject).toBe('');
    expect(res.body).toBe('Kurze DM');
  });

  it('Outreach_EmptyBody_ThrowsUpstreamProvider', async () => {
    const c = ctx({
      available: true,
      generate: async () => JSON.stringify({ subject: 'x', body: '' }),
    });
    await c.talents.add(talent('t1'));
    await expect(c.service.outreach(OWNER, OWNER, 't1', opts())).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('Outreach_ProviderThrows_ThrowsUpstreamProvider', async () => {
    const c = ctx({
      available: true,
      generate: async () => {
        throw new Error('boom');
      },
    });
    await c.talents.add(talent('t1'));
    await expect(
      c.service.outreach(OWNER, OWNER, 't1', opts({ audience: 'client' })),
    ).rejects.toBeInstanceOf(UpstreamProviderError);
  });

  it('Outreach_NoProvider_ThrowsAiNotConfigured', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await expect(c.service.outreach(OWNER, OWNER, 't1', opts())).rejects.toBeInstanceOf(
      AiNotConfiguredError,
    );
  });

  it('Outreach_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.outreach(OWNER, OWNER, 'missing', opts())).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('DocumentAiService.explainMatch', () => {
  const mandate = { role: 'Engineer', location: 'Berlin', client: 'Acme' };

  it('WithProvider_ReturnsReasonsAndMeters', async () => {
    const json = JSON.stringify({ summary: 'Passt gut.', reasons: ['Starke Skills', 'Erfahrung'] });
    const c = ctx({ available: true, generate: async () => json });
    await c.talents.add(talent('t1'));
    const res = await c.service.explainMatch(OWNER, OWNER, 't1', mandate);
    expect(res.provider).toBe('claude');
    expect(res.summary).toBe('Passt gut.');
    expect(res.reasons).toEqual(['Starke Skills', 'Erfahrung']);
    expect((await c.usageMeter.list(OWNER)).some((e) => e.feature === 'matchExplain')).toBe(true);
  });

  it('NoProvider_ThrowsAiNotConfigured', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await expect(c.service.explainMatch(OWNER, OWNER, 't1', mandate)).rejects.toBeInstanceOf(
      AiNotConfiguredError,
    );
  });

  it('EmptyLlmReasons_ThrowsUpstreamProvider', async () => {
    const c = ctx({
      available: true,
      generate: async () => JSON.stringify({ summary: 'x', reasons: [] }),
    });
    await c.talents.add(talent('t1'));
    await expect(c.service.explainMatch(OWNER, OWNER, 't1', mandate)).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.explainMatch(OWNER, OWNER, 'missing', mandate)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('DocumentAiService.interviewKit', () => {
  const mandate = { role: 'Engineer', location: 'Berlin', client: 'Acme' };

  it('WithProvider_ReturnsKitAndMeters', async () => {
    const json = JSON.stringify({
      focus: 'Fachtiefe prüfen',
      questions: [{ category: 'Fachlich', question: 'Erzählen Sie von X', lookFor: 'Details' }],
      scorecard: ['Fachtiefe', 'Motivation'],
    });
    const c = ctx({ available: true, generate: async () => json });
    await c.talents.add(talent('t1'));
    const res = await c.service.interviewKit(OWNER, OWNER, 't1', mandate);
    expect(res.provider).toBe('claude');
    expect(res.focus).toBe('Fachtiefe prüfen');
    expect(res.questions).toHaveLength(1);
    expect((await c.usageMeter.list(OWNER)).some((e) => e.feature === 'interviewKit')).toBe(true);
  });

  it('NoProvider_ThrowsAiNotConfigured', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await expect(c.service.interviewKit(OWNER, OWNER, 't1', mandate)).rejects.toBeInstanceOf(
      AiNotConfiguredError,
    );
  });

  it('EmptyLlmQuestions_ThrowsUpstreamProvider', async () => {
    const c = ctx({
      available: true,
      generate: async () => JSON.stringify({ focus: 'x', questions: [], scorecard: [] }),
    });
    await c.talents.add(talent('t1'));
    await expect(c.service.interviewKit(OWNER, OWNER, 't1', mandate)).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.interviewKit(OWNER, OWNER, 'missing', mandate)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('DocumentAiService.candidatePrep', () => {
  const mandate = { role: 'Engineer', location: 'Berlin', client: 'Google' };
  const ad = 'Frontend Engineer\n- React erforderlich\n- Führerschein erforderlich';
  const PREP_JSON = JSON.stringify({
    likelyQuestions: [{ category: 'Fachlich', question: 'React?', why: 'relevant' }],
    starAnswers: [{ competency: 'React', prompt: 'P', scaffold: 'Situation: ...' }],
    candidateQuestions: ['Wie ist das Team?'],
  });

  it('WithProvider_MergesRefinementAndMeters', async () => {
    const c = ctx({ available: true, generate: async () => PREP_JSON });
    await c.talents.add(talent('t1'));
    const res = await c.service.candidatePrep(OWNER, OWNER, 't1', mandate, ad);
    expect(res.provider).toBe('claude');
    expect(res.likelyQuestions[0]?.question).toBe('React?');
    expect(res.companyLabel).toBe('US Big Tech');
    expect(res.obligations.some((o) => o.includes('Führerschein'))).toBe(true);
    expect((await c.usageMeter.list(OWNER)).some((e) => e.feature === 'candidatePrep')).toBe(true);
  });

  it('NoProvider_ThrowsAiNotConfigured', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await expect(c.service.candidatePrep(OWNER, OWNER, 't1', mandate, ad)).rejects.toBeInstanceOf(
      AiNotConfiguredError,
    );
  });

  it('TruncatedReply_LogsWarningAndThrowsUpstreamProvider', async () => {
    const warns: string[] = [];
    const logger = { ...noopLogger, warn: (_ctx: unknown, msg?: string) => warns.push(msg ?? '') };
    const c = ctx(
      { available: true, generate: async () => '{"likelyQuestions":[{"category":"Fa' },
      '',
      logger,
    );
    await c.talents.add(talent('t1'));
    await expect(c.service.candidatePrep(OWNER, OWNER, 't1', mandate, ad)).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
    expect(warns.some((m) => m.includes('did not match the expected schema'))).toBe(true);
  });

  it('ObservationsOverrideArchetypeConfidence', async () => {
    const c = ctx({ available: true, generate: async () => PREP_JSON });
    await c.talents.add(talent('t1'));
    for (let i = 0; i < 3; i++) {
      await c.observations.add({
        id: `o${i}`,
        ownerId: OWNER,
        companyKey: 'google',
        company: 'Google',
        mandateId: 'm1',
        talentId: '',
        rounds: 5,
        formats: ['coding'],
        difficulty: 'high',
        notes: '',
        at: '2026-07-01T10:00:00.000Z',
      });
    }
    const res = await c.service.candidatePrep(OWNER, OWNER, 't1', mandate, ad);
    expect(res.companySource).toBe('observed');
    expect(res.companyConfidence).toBe('medium');
  });

  it('UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(
      c.service.candidatePrep(OWNER, OWNER, 'missing', mandate, ad),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('DocumentAiService outcome logging', () => {
  const OUTREACH_JSON = JSON.stringify({ subject: 'Hi', body: 'A real body.' });

  it('Outreach_LogsAnArtifactWithChannelAndAudience', async () => {
    const c = ctx({ available: true, generate: async () => OUTREACH_JSON });
    await c.talents.add(talent('t1'));
    await c.service.outreach(OWNER, OWNER, 't1', {
      audience: 'client',
      channel: 'linkedin',
      tone: '',
      mandateContext: '',
      recruiterName: '',
    });
    const [logged] = await c.artifacts.list(OWNER);
    expect(logged).toMatchObject({
      kind: 'outreach',
      talentId: 't1',
      provider: 'claude',
      channel: 'linkedin',
      audience: 'client',
      outcome: 'pending',
    });
  });

  it('Pitch_LogsTheProviderThatProducedIt', async () => {
    const json = JSON.stringify({ headline: 'H', paragraphs: ['P'], highlights: [] });
    const c = ctx({ available: true, generate: async () => json });
    await c.talents.add(talent('t1'));
    await c.service.pitchForMandate(OWNER, OWNER, 't1', '');
    const [logged] = await c.artifacts.list(OWNER);
    expect(logged).toMatchObject({ kind: 'pitch', provider: 'claude', channel: '' });
  });

  it('Outreach_LoggingFailure_DoesNotBreakTheFeature', async () => {
    const c = ctx({ available: true, generate: async () => OUTREACH_JSON });
    await c.talents.add(talent('t1'));
    jest.spyOn(c.artifacts, 'add').mockRejectedValue(new Error('disk full'));
    const message = await c.service.outreach(OWNER, OWNER, 't1', {
      audience: 'candidate',
      channel: 'email',
      tone: '',
      mandateContext: '',
      recruiterName: '',
    });
    expect(message.body).toBeTruthy();
  });
});

describe('DocumentAiService.translateDocuments', () => {
  const TRANSLATED = JSON.stringify({
    resume: { summary: 'Experienced developer.' },
    letter: { absaetze: ['Hello team'] },
  });

  it('Translate_NoProvider_ThrowsAiNotConfigured', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await expect(c.service.translateDocuments(OWNER, OWNER, 't1', 'de')).rejects.toBeInstanceOf(
      AiNotConfiguredError,
    );
  });

  it('Translate_SameLanguage_ThrowsValidation', async () => {
    const c = ctx({ available: true, generate: async () => TRANSLATED });
    await c.talents.add(talent('t1')); // empty docs → source 'en'
    await expect(c.service.translateDocuments(OWNER, OWNER, 't1', 'en')).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('Translate_WithProvider_CreatesAndPersistsVariant', async () => {
    const c = ctx({ available: true, generate: async () => TRANSLATED });
    await c.talents.add(talent('t1'));

    const first = await c.service.translateDocuments(OWNER, OWNER, 't1', 'de');
    expect(first.created).toBe(true);
    expect(first.lang).toBe('de');
    expect(first.translation.resume.summary).toBe('Experienced developer.');
    expect(first.translation.provider).toBe('claude');

    const second = await c.service.translateDocuments(OWNER, OWNER, 't1', 'de');
    expect(second.created).toBe(false);
    expect(second.translation.letter.absaetze).toEqual(['Hello team']);
  });

  it('Translate_MalformedResult_ThrowsUpstreamProvider', async () => {
    const c = ctx({ available: true, generate: async () => 'not json at all' });
    await c.talents.add(talent('t1'));
    await expect(c.service.translateDocuments(OWNER, OWNER, 't1', 'de')).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('Translate_UnknownTalent_Throws404', async () => {
    const c = ctx({ available: true, generate: async () => TRANSLATED });
    await expect(
      c.service.translateDocuments(OWNER, OWNER, 'missing', 'de'),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('DocumentAiService.tailorForMandate', () => {
  const target = {
    role: 'Backend Engineer',
    company: 'Helio',
    jobText: 'Go and Kubernetes',
    lang: 'en' as const,
  };

  it('AiPath_ReturnsTunedSummaryAndCoverLetter_WithUsageAndGrounding', async () => {
    const c = ctx({
      available: true,
      generate: async () =>
        JSON.stringify({ summary: 'Tuned summary.', paragraphs: ['Intro.', 'Core.', 'Close.'] }),
    });
    await c.talents.add(talent('t1'));
    const res = await c.service.tailorForMandate(OWNER, OWNER, 't1', target);
    expect(res.provider).toBe('claude');
    expect(res.summary).toBe('Tuned summary.');
    expect(res.paragraphs).toEqual(['Intro.', 'Core.', 'Close.']);
    expect(res.lang).toBe('en');
    expect(res.usage).toEqual({ inputTokens: 5, outputTokens: 7, costUsd: 0.0001 });
    expect(res.grounding).toBeDefined();
    const events = await c.usageMeter.list(OWNER);
    expect(events).toHaveLength(1);
    expect(events[0].feature).toBe('tailor');
  });

  it('NoProvider_ThrowsAiNotConfigured', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await expect(
      c.service.tailorForMandate(OWNER, OWNER, 't1', { ...target, lang: 'de', company: 'Globex' }),
    ).rejects.toBeInstanceOf(AiNotConfiguredError);
  });

  it('MalformedJson_ThrowsUpstreamProvider', async () => {
    const c = ctx({ available: true, generate: async () => 'not json at all' });
    await c.talents.add(talent('t1'));
    await expect(c.service.tailorForMandate(OWNER, OWNER, 't1', target)).rejects.toBeInstanceOf(
      UpstreamProviderError,
    );
  });

  it('UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(
      c.service.tailorForMandate(OWNER, OWNER, 'missing', target),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
