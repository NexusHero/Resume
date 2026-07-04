import { jest } from '@jest/globals';
import type { DocumentAiService } from '../../src/services/document-ai-service.js';
import { buildDocumentAiService } from '../support/build-document-ai.js';
import { DocumentService } from '../../src/services/document-service.js';
import { LlmService } from '../../src/services/llm-service.js';
import { NotFoundError, ValidationError } from '../../src/domain/errors.js';
import type { LlmGenerateInput, LlmProvider, LlmProviderId } from '../../src/ports/llm-provider.js';
import {
  InMemoryArtifactLogRepository,
  InMemoryTalentRepository,
  InMemoryUserRepository,
  InMemoryDocumentRepository,
  InMemoryApiKeyStore,
  InMemoryUsageMeter,
  InMemoryInterviewObservationRepository,
  FakePdfRenderer,
  FakePdfTextExtractor,
  FixedClock,
  SequenceIdGenerator,
  noopLogger,
} from '../support/fakes.js';
import type { Talent } from '../../src/domain/talent.js';
import { saveDocumentsSchema } from '../../src/domain/talent-documents.js';

const OWNER = 'owner1';
const talent = (id: string): Talent => ({
  id,
  ownerId: OWNER,
  name: 'Lena',
  role: 'Designer',
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

/**
 * A provider stub whose `generate` returns just the text (the token usage is
 * filled in by ctx), so the many test cases below stay terse.
 */
interface ProviderStub {
  id?: LlmProviderId;
  label?: string;
  available?: boolean;
  generate?: (input: LlmGenerateInput) => Promise<string>;
}

function ctx(stub: ProviderStub = {}, pdfText: string | Error = '', logger = noopLogger) {
  const talents = new InMemoryTalentRepository();
  const documents = new InMemoryDocumentRepository();
  const keys = new InMemoryApiKeyStore();
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
  let usedKey: string | undefined;
  const provider: LlmProvider = {
    id: stub.id ?? 'claude',
    label: stub.label ?? 'Claude',
    available: stub.available ?? false,
    generate: async (input) => {
      usedKey = input.apiKey;
      const text = stub.generate
        ? await stub.generate(input)
        : 'AI PARA ONE.\n\nAI PARA TWO.\n\nAI PARA THREE.';
      return { text, usage: { inputTokens: 5, outputTokens: 7 } };
    },
  };
  // A gemini twin of the stub, so tests can exercise the per-user provider
  // choice; with 'claude' as the configured default it is only reachable via
  // a persisted user preference.
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
    apiKeyStore: keys,
    userRepository: users,
    pdfTextExtractor,
    usageMeter,
    interviewObservationRepository: observations,
    artifactLogRepository: artifacts,
    idGenerator: new SequenceIdGenerator('art'),
    clock: new FixedClock(),
    logger,
  });
  return {
    service,
    talents,
    keys,
    users,
    usageMeter,
    observations,
    artifacts,
    documentService,
    getUsedKey: () => usedKey,
  };
}

/** A document set whose resume clearly reads as German (drives language detection). */
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

describe('DocumentAiService', () => {
  it('Suggest_WithUserKey_UsesProviderAndForwardsKey', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await c.keys.set(OWNER, 'claude', 'sk-user');

    const summary = await c.service.suggest(OWNER, OWNER, 't1', 'summary');
    expect(summary.provider).toBe('claude');
    expect(summary.text).toContain('AI PARA ONE');
    expect(c.getUsedKey()).toBe('sk-user');

    const letter = await c.service.suggest(OWNER, OWNER, 't1', 'letter', { role: 'X' });
    expect(letter.paragraphs).toEqual(['AI PARA ONE.', 'AI PARA TWO.', 'AI PARA THREE.']);
  });

  it('Suggest_WithProvider_AttachesPerCallUsage', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await c.keys.set(OWNER, 'claude', 'sk-user');
    const summary = await c.service.suggest(OWNER, OWNER, 't1', 'summary');
    // ctx's provider stub reports 5 in / 7 out; claude 5·$3/M + 7·$15/M ≈ $0.0001
    expect(summary.usage).toEqual({ inputTokens: 5, outputTokens: 7, costUsd: 0.0001 });
  });

  it('Suggest_TemplateFallback_HasNoUsage', async () => {
    const c = ctx(); // no provider → template, nothing was spent
    await c.talents.add(talent('t1'));
    const summary = await c.service.suggest(OWNER, OWNER, 't1', 'summary');
    expect(summary.usage).toBeUndefined();
  });

  it('Suggest_UsesTheUsersPersistedProviderChoice', async () => {
    // Config default is claude, but this user switched to gemini (persisted on
    // the account) and only has a gemini key — the choice must win, also after
    // a server restart (nothing about it lives in memory).
    const c = ctx();
    await c.talents.add(talent('t1'));
    await c.users.add({
      id: OWNER,
      email: 'owner@example.com',
      passwordHash: 'h',
      roles: ['recruiter'],
      createdAt: '2026-06-25T10:00:00.000Z',
      llmProvider: 'gemini',
    });
    await c.keys.set(OWNER, 'gemini', 'g-user-key');
    const summary = await c.service.suggest(OWNER, OWNER, 't1', 'summary');
    expect(summary.provider).toBe('gemini');
    expect(c.getUsedKey()).toBe('g-user-key');
  });

  it('Suggest_NoKeyNoServerCredential_FallsBackToTemplate', async () => {
    const c = ctx(); // provider.available=false and no user key → no provider
    await c.talents.add(talent('t1'));

    const summary = await c.service.suggest(OWNER, OWNER, 't1', 'summary');
    expect(summary.provider).toBe('template');
    expect(summary.text).toContain('Designer'); // deterministic fallback

    const letter = await c.service.suggest(OWNER, OWNER, 't1', 'letter', { company: 'Helio' });
    expect(letter.provider).toBe('template');
    expect(letter.paragraphs).toHaveLength(3);
    expect(letter.paragraphs?.[0]).toContain('Helio');
  });

  it('Suggest_ProviderThrows_FallsBackToTemplate', async () => {
    const c = ctx({
      available: true,
      generate: async () => {
        throw new Error('boom');
      },
    });
    await c.talents.add(talent('t1'));
    const res = await c.service.suggest(OWNER, OWNER, 't1', 'summary');
    expect(res.provider).toBe('template');
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

  it('Suggest_Fallback_DoesNotMeter', async () => {
    const c = ctx(); // no provider → template fallback, no LLM call
    await c.talents.add(talent('t1'));
    await c.service.suggest(OWNER, OWNER, 't1', 'summary');
    expect(c.usageMeter.events).toHaveLength(0);
  });

  it('Suggest_GermanCv_FallsBackToGermanTemplates', async () => {
    const c = ctx(); // no provider → deterministic fallback
    await c.talents.add(talent('t1'));
    await c.documentService.save(OWNER, 't1', germanDocuments);

    const summary = await c.service.suggest(OWNER, OWNER, 't1', 'summary');
    expect(summary.provider).toBe('template');
    expect(summary.text).toContain('Produktdesignerin');
    expect(summary.text).toContain('lösungsorientiert');

    const letter = await c.service.suggest(OWNER, OWNER, 't1', 'letter', {
      role: 'Lead Designerin',
      company: 'Helio',
    });
    expect(letter.provider).toBe('template');
    expect(letter.paragraphs).toHaveLength(3);
    expect(letter.paragraphs?.[0]).toContain('bewerbe ich mich');
    expect(letter.paragraphs?.[0]).toContain('bei Helio');
  });

  it('Suggest_GermanCv_PromptsCarryGermanDirective', async () => {
    const systems: string[] = [];
    const c = ctx({
      available: true,
      generate: async (input) => {
        systems.push(input.system);
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
        systems.push(input.system);
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
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parse(OWNER, OWNER, 't1', 'raw cv text');
    expect(parsed.provider).toBe('claude');
    expect(parsed.contact.name).toBe('Max Mustermann');
    expect(parsed.resume.summary).toBe('Senior Engineer.');
    expect(parsed.resume.experience[0]).toMatchObject({ company: 'Acme', bullets: ['Shipped X'] });
    // schema fills defaults for omitted fields
    expect(parsed.resume.education).toEqual([]);
  });

  it('Parse_NoProvider_FallsBackToRawSummary', async () => {
    const c = ctx(); // provider unavailable + no key
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parse(OWNER, OWNER, 't1', 'My whole CV as text');
    expect(parsed.provider).toBe('template');
    expect(parsed.resume.summary).toContain('My whole CV as text');
  });

  it('Parse_MalformedJson_FallsBack', async () => {
    const c = ctx({ available: true, generate: async () => 'not json at all' });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parse(OWNER, OWNER, 't1', 'the cv');
    expect(parsed.provider).toBe('template');
    expect(parsed.resume.summary).toContain('the cv');
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
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parsePdf(OWNER, OWNER, 't1', PDF);
    expect(parsed.provider).toBe('claude');
    expect(parsed.contact.name).toBe('Max Mustermann');
    expect(parsed.extractedChars).toBeGreaterThan(0);
  });

  it('ParsePdf_NoProvider_KeepsExtractedTextAsSummary', async () => {
    const c = ctx({}, 'Product Designer with 8 years of experience.');
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parsePdf(OWNER, OWNER, 't1', PDF);
    expect(parsed.provider).toBe('template');
    expect(parsed.resume.summary).toContain('Product Designer');
    expect(parsed.extractedChars).toBeGreaterThan(0);
  });

  it('ParsePdf_ScannedPdf_NoText_ReturnsEmpty', async () => {
    const c = ctx({ available: true, generate: async () => 'unused' }, '   ');
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parsePdf(OWNER, OWNER, 't1', PDF);
    expect(parsed.provider).toBe('template');
    expect(parsed.extractedChars).toBe(0);
    expect(parsed.resume.summary).toBe('');
  });

  it('ParsePdf_ExtractorThrows_ReturnsEmpty', async () => {
    const c = ctx({}, new Error('corrupt pdf'));
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parsePdf(OWNER, OWNER, 't1', PDF);
    expect(parsed.provider).toBe('template');
    expect(parsed.extractedChars).toBe(0);
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
    await c.keys.set(OWNER, 'claude', 'sk-user');
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
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.scoreAgainstJob(OWNER, OWNER, 't1', 'job');
    expect(res.score).toBe(100);
  });

  it('Score_NoProvider_FallsBackToKeywordOverlap', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    const res = await c.service.scoreAgainstJob(OWNER, OWNER, 't1', 'any job text');
    expect(res.provider).toBe('template');
    expect(typeof res.score).toBe('number');
    expect(Array.isArray(res.suggestions)).toBe(true);
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
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.pitchForMandate(OWNER, OWNER, 't1', 'UX Lead gesucht');
    expect(res.provider).toBe('claude');
    expect(res.headline).toContain('Designerin');
    expect(res.paragraphs).toHaveLength(2);
    expect(res.highlights).toEqual(['Design Systems', 'Prototyping']);
  });

  it('Pitch_EmptyLlmResult_FallsBack', async () => {
    const c = ctx({
      available: true,
      generate: async () => JSON.stringify({ headline: '', paragraphs: [], highlights: [] }),
    });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.pitchForMandate(OWNER, OWNER, 't1', '');
    expect(res.provider).toBe('template');
    expect(res.headline).toContain('Designer');
  });

  it('Pitch_NoProvider_FallsBackToFacts', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    const res = await c.service.pitchForMandate(OWNER, OWNER, 't1', 'any mandate');
    expect(res.provider).toBe('template');
    expect(res.paragraphs.length).toBeGreaterThan(0);
  });

  it('Pitch_ProviderThrows_FallsBack', async () => {
    const c = ctx({
      available: true,
      generate: async () => {
        throw new Error('boom');
      },
    });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.pitchForMandate(OWNER, OWNER, 't1', '');
    expect(res.provider).toBe('template');
  });

  it('Pitch_MalformedJson_FallsBack', async () => {
    const c = ctx({ available: true, generate: async () => 'not json' });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.pitchForMandate(OWNER, OWNER, 't1', '');
    expect(res.provider).toBe('template');
  });

  it('Pitch_HeadlineOnly_UsesProviderResult', async () => {
    const c = ctx({
      available: true,
      generate: async () =>
        JSON.stringify({ headline: '', paragraphs: ['Ein starker Absatz.'], highlights: [] }),
    });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.pitchForMandate(OWNER, OWNER, 't1', '');
    expect(res.provider).toBe('claude');
    expect(res.paragraphs).toEqual(['Ein starker Absatz.']);
  });

  it('Pitch_FabricatedSkill_IsFlaggedByGrounding', async () => {
    // Talent has no skills, so a Kubernetes claim in the pitch is unsupported.
    const json = JSON.stringify({
      headline: 'Cloud-Profi',
      paragraphs: ['Erfahren mit Kubernetes und Docker.'],
      highlights: [],
    });
    const c = ctx({ available: true, generate: async () => json });
    await c.keys.set(OWNER, 'claude', 'sk-user');
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
  const opts = (over: Partial<Parameters<DocumentAiService['outreach']>[2]> = {}) => ({
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
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.outreach(OWNER, OWNER, 't1', opts());
    expect(res.provider).toBe('claude');
    expect(res.subject).toBe('Spannende Rolle');
    expect(res.body).toContain('Hallo Lena');
  });

  it('Outreach_LinkedIn_DropsSubjectEvenIfProvided', async () => {
    const json = JSON.stringify({ subject: 'sollte weg', body: 'Kurze DM' });
    const c = ctx({ available: true, generate: async () => json });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.outreach(OWNER, OWNER, 't1', opts({ channel: 'linkedin' }));
    expect(res.provider).toBe('claude');
    expect(res.subject).toBe('');
    expect(res.body).toBe('Kurze DM');
  });

  it('Outreach_EmptyBody_FallsBack', async () => {
    const c = ctx({
      available: true,
      generate: async () => JSON.stringify({ subject: 'x', body: '' }),
    });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.outreach(OWNER, OWNER, 't1', opts());
    expect(res.provider).toBe('template');
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('Outreach_ProviderThrows_FallsBack', async () => {
    const c = ctx({
      available: true,
      generate: async () => {
        throw new Error('boom');
      },
    });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.outreach(OWNER, OWNER, 't1', opts({ audience: 'client' }));
    expect(res.provider).toBe('template');
    expect(res.body).toContain('Lena');
  });

  it('Outreach_NoProvider_FallsBack', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    const res = await c.service.outreach(OWNER, OWNER, 't1', opts());
    expect(res.provider).toBe('template');
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
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.explainMatch(OWNER, OWNER, 't1', mandate);
    expect(res.provider).toBe('claude');
    expect(res.summary).toBe('Passt gut.');
    expect(res.reasons).toEqual(['Starke Skills', 'Erfahrung']);
    expect((await c.usageMeter.list(OWNER)).some((e) => e.feature === 'matchExplain')).toBe(true);
  });

  it('NoProvider_FallsBackToDeterministicReasons', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    const res = await c.service.explainMatch(OWNER, OWNER, 't1', mandate);
    expect(res.provider).toBe('template');
    expect(res.reasons.length).toBeGreaterThan(0);
  });

  it('EmptyLlmReasons_FallsBack', async () => {
    const c = ctx({
      available: true,
      generate: async () => JSON.stringify({ summary: 'x', reasons: [] }),
    });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.explainMatch(OWNER, OWNER, 't1', mandate);
    expect(res.provider).toBe('template');
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
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.interviewKit(OWNER, OWNER, 't1', mandate);
    expect(res.provider).toBe('claude');
    expect(res.focus).toBe('Fachtiefe prüfen');
    expect(res.questions).toHaveLength(1);
    expect((await c.usageMeter.list(OWNER)).some((e) => e.feature === 'interviewKit')).toBe(true);
  });

  it('NoProvider_FallsBackToTemplateKit', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    const res = await c.service.interviewKit(OWNER, OWNER, 't1', mandate);
    expect(res.provider).toBe('template');
    expect(res.questions.length).toBeGreaterThan(0);
  });

  it('EmptyLlmQuestions_FallsBack', async () => {
    const c = ctx({
      available: true,
      generate: async () => JSON.stringify({ focus: 'x', questions: [], scorecard: [] }),
    });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.interviewKit(OWNER, OWNER, 't1', mandate);
    expect(res.provider).toBe('template');
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

  it('WithProvider_MergesRefinementAndMeters', async () => {
    const json = JSON.stringify({
      likelyQuestions: [{ category: 'Fachlich', question: 'React?', why: 'relevant' }],
      starAnswers: [{ competency: 'React', prompt: 'P', scaffold: 'Situation: ...' }],
      candidateQuestions: ['Wie ist das Team?'],
    });
    const c = ctx({ available: true, generate: async () => json });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.candidatePrep(OWNER, OWNER, 't1', mandate, ad);
    expect(res.provider).toBe('claude');
    expect(res.likelyQuestions[0]?.question).toBe('React?');
    // grounded parts computed by us regardless of the LLM
    expect(res.companyLabel).toBe('US Big Tech');
    expect(res.obligations.some((o) => o.includes('Führerschein'))).toBe(true);
    expect((await c.usageMeter.list(OWNER)).some((e) => e.feature === 'candidatePrep')).toBe(true);
  });

  it('NoProvider_FallsBackToDeterministicPack', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    const res = await c.service.candidatePrep(OWNER, OWNER, 't1', mandate, ad);
    expect(res.provider).toBe('template');
    expect(res.likelyQuestions.length).toBeGreaterThan(0);
    expect(res.companyLabel).toBe('US Big Tech');
  });

  it('TruncatedReply_LogsWarningAndFallsBack', async () => {
    // A reply cut off mid-JSON (e.g. by the token budget) must not be a
    // silent template fallback — the warn log is what makes it diagnosable.
    const warns: string[] = [];
    const logger = { ...noopLogger, warn: (_ctx: unknown, msg?: string) => warns.push(msg ?? '') };
    const c = ctx(
      { available: true, generate: async () => '{"likelyQuestions":[{"category":"Fa' },
      '',
      logger,
    );
    await c.talents.add(talent('t1'));
    const res = await c.service.candidatePrep(OWNER, OWNER, 't1', mandate, ad);
    expect(res.provider).toBe('template');
    expect(warns.some((m) => m.includes('did not match the expected schema'))).toBe(true);
  });

  it('ObservationsOverrideArchetypeConfidence', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    // three recorded observations of 'google' (mandate.client) → observed profile
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

  it('Pitch_TemplateFallback_IsLoggedWithProviderTemplate', async () => {
    const c = ctx(); // no provider → template pitch, still part of the loop
    await c.talents.add(talent('t1'));
    await c.service.pitchForMandate(OWNER, OWNER, 't1', '');
    const [logged] = await c.artifacts.list(OWNER);
    expect(logged).toMatchObject({ kind: 'pitch', provider: 'template', channel: '' });
  });

  it('Outreach_LoggingFailure_DoesNotBreakTheFeature', async () => {
    const c = ctx();
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

  it('Translate_NoProvider_ThrowsValidation', async () => {
    const c = ctx(); // provider unavailable + no key
    await c.talents.add(talent('t1'));
    // Default docs are empty → detected source 'en'; translate to 'de' needs a provider.
    await expect(c.service.translateDocuments(OWNER, OWNER, 't1', 'de')).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('Translate_SameLanguage_Throws', async () => {
    const c = ctx({ available: true, generate: async () => TRANSLATED });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1')); // empty docs → source 'en'
    await expect(c.service.translateDocuments(OWNER, OWNER, 't1', 'en')).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('Translate_WithProvider_CreatesAndPersistsVariant', async () => {
    const c = ctx({ available: true, generate: async () => TRANSLATED });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));

    const first = await c.service.translateDocuments(OWNER, OWNER, 't1', 'de');
    expect(first.created).toBe(true);
    expect(first.lang).toBe('de');
    expect(first.translation.resume.summary).toBe('Experienced developer.');
    expect(first.translation.provider).toBe('claude');

    // Second call returns the persisted variant without regenerating.
    const second = await c.service.translateDocuments(OWNER, OWNER, 't1', 'de');
    expect(second.created).toBe(false);
    expect(second.translation.letter.absaetze).toEqual(['Hello team']);
  });

  it('Translate_MalformedResult_Throws', async () => {
    const c = ctx({ available: true, generate: async () => 'not json at all' });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    await expect(c.service.translateDocuments(OWNER, OWNER, 't1', 'de')).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('Translate_UnknownTalent_Throws404', async () => {
    const c = ctx({ available: true, generate: async () => TRANSLATED });
    await c.keys.set(OWNER, 'claude', 'sk-user');
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
    // Autopilot tailoring is metered as its own feature, not lumped in with 'suggest'.
    const events = await c.usageMeter.list(OWNER);
    expect(events).toHaveLength(1);
    expect(events[0].feature).toBe('tailor');
  });

  it('NoProvider_FallsBackToTemplateInTargetLanguage', async () => {
    const c = ctx(); // no provider
    await c.talents.add(talent('t1'));
    const res = await c.service.tailorForMandate(OWNER, OWNER, 't1', {
      ...target,
      lang: 'de',
      company: 'Globex',
    });
    expect(res.provider).toBe('template');
    expect(res.usage).toBeUndefined();
    expect(res.paragraphs).toHaveLength(3);
    expect(res.paragraphs[0]).toContain('Globex');
  });

  it('MalformedJson_FallsBackToTemplate', async () => {
    const c = ctx({ available: true, generate: async () => 'not json at all' });
    await c.talents.add(talent('t1'));
    const res = await c.service.tailorForMandate(OWNER, OWNER, 't1', target);
    expect(res.provider).toBe('template');
    expect(res.paragraphs).toHaveLength(3);
  });

  it('UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(
      c.service.tailorForMandate(OWNER, OWNER, 'missing', target),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
