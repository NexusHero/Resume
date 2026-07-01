import { DocumentAiService } from '../../src/services/document-ai-service';
import { DocumentService } from '../../src/services/document-service';
import { LlmService } from '../../src/services/llm-service';
import { NotFoundError } from '../../src/domain/errors';
import type { LlmProvider } from '../../src/ports/llm-provider';
import {
  InMemoryTalentRepository,
  InMemoryDocumentRepository,
  InMemoryApiKeyStore,
  FakePdfRenderer,
  FakePdfTextExtractor,
  FixedClock,
  noopLogger,
} from '../support/fakes';
import type { Talent } from '../../src/domain/talent';

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

function ctx(providerOverrides: Partial<LlmProvider> = {}, pdfText: string | Error = '') {
  const talents = new InMemoryTalentRepository();
  const documents = new InMemoryDocumentRepository();
  const keys = new InMemoryApiKeyStore();
  const pdfTextExtractor = new FakePdfTextExtractor(pdfText);
  const documentService = new DocumentService({
    documentRepository: documents,
    talentRepository: talents,
    pdfRenderer: new FakePdfRenderer(),
    clock: new FixedClock(),
  });
  let usedKey: string | undefined;
  const provider: LlmProvider = {
    id: 'claude',
    label: 'Claude',
    available: false,
    generate: async (input) => {
      usedKey = input.apiKey;
      return 'AI PARA ONE.\n\nAI PARA TWO.\n\nAI PARA THREE.';
    },
    ...providerOverrides,
  };
  const llm = new LlmService({
    providers: [provider],
    defaultProvider: 'claude',
    logger: noopLogger,
  });
  const service = new DocumentAiService({
    documentService,
    llmService: llm,
    apiKeyStore: keys,
    pdfTextExtractor,
    logger: noopLogger,
  });
  return { service, talents, keys, getUsedKey: () => usedKey };
}

describe('DocumentAiService', () => {
  it('Suggest_WithUserKey_UsesProviderAndForwardsKey', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    await c.keys.set(OWNER, 'claude', 'sk-user');

    const summary = await c.service.suggest(OWNER, 't1', 'summary');
    expect(summary.provider).toBe('claude');
    expect(summary.text).toContain('AI PARA ONE');
    expect(c.getUsedKey()).toBe('sk-user');

    const letter = await c.service.suggest(OWNER, 't1', 'letter', { role: 'X' });
    expect(letter.paragraphs).toEqual(['AI PARA ONE.', 'AI PARA TWO.', 'AI PARA THREE.']);
  });

  it('Suggest_NoKeyNoServerCredential_FallsBackToTemplate', async () => {
    const c = ctx(); // provider.available=false and no user key → no provider
    await c.talents.add(talent('t1'));

    const summary = await c.service.suggest(OWNER, 't1', 'summary');
    expect(summary.provider).toBe('template');
    expect(summary.text).toContain('Designer'); // deterministic fallback

    const letter = await c.service.suggest(OWNER, 't1', 'letter', { company: 'Helio' });
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
    const res = await c.service.suggest(OWNER, 't1', 'summary');
    expect(res.provider).toBe('template');
  });

  it('Suggest_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.suggest(OWNER, 'missing', 'summary')).rejects.toBeInstanceOf(
      NotFoundError,
    );
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
    const parsed = await c.service.parse(OWNER, 't1', 'raw cv text');
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
    const parsed = await c.service.parse(OWNER, 't1', 'My whole CV as text');
    expect(parsed.provider).toBe('template');
    expect(parsed.resume.summary).toContain('My whole CV as text');
  });

  it('Parse_MalformedJson_FallsBack', async () => {
    const c = ctx({ available: true, generate: async () => 'not json at all' });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parse(OWNER, 't1', 'the cv');
    expect(parsed.provider).toBe('template');
    expect(parsed.resume.summary).toContain('the cv');
  });

  it('Parse_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.parse(OWNER, 'missing', 'x')).rejects.toBeInstanceOf(NotFoundError);
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
    const parsed = await c.service.parsePdf(OWNER, 't1', PDF);
    expect(parsed.provider).toBe('claude');
    expect(parsed.contact.name).toBe('Max Mustermann');
    expect(parsed.extractedChars).toBeGreaterThan(0);
  });

  it('ParsePdf_NoProvider_KeepsExtractedTextAsSummary', async () => {
    const c = ctx({}, 'Product Designer with 8 years of experience.');
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parsePdf(OWNER, 't1', PDF);
    expect(parsed.provider).toBe('template');
    expect(parsed.resume.summary).toContain('Product Designer');
    expect(parsed.extractedChars).toBeGreaterThan(0);
  });

  it('ParsePdf_ScannedPdf_NoText_ReturnsEmpty', async () => {
    const c = ctx({ available: true, generate: async () => 'unused' }, '   ');
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parsePdf(OWNER, 't1', PDF);
    expect(parsed.provider).toBe('template');
    expect(parsed.extractedChars).toBe(0);
    expect(parsed.resume.summary).toBe('');
  });

  it('ParsePdf_ExtractorThrows_ReturnsEmpty', async () => {
    const c = ctx({}, new Error('corrupt pdf'));
    await c.talents.add(talent('t1'));
    const parsed = await c.service.parsePdf(OWNER, 't1', PDF);
    expect(parsed.provider).toBe('template');
    expect(parsed.extractedChars).toBe(0);
  });

  it('ParsePdf_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.parsePdf(OWNER, 'missing', PDF)).rejects.toBeInstanceOf(NotFoundError);
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
    const res = await c.service.scoreAgainstJob(OWNER, 't1', 'C++ role, Kubernetes a plus');
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
    const res = await c.service.scoreAgainstJob(OWNER, 't1', 'job');
    expect(res.score).toBe(100);
  });

  it('Score_NoProvider_FallsBackToKeywordOverlap', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    const res = await c.service.scoreAgainstJob(OWNER, 't1', 'any job text');
    expect(res.provider).toBe('template');
    expect(typeof res.score).toBe('number');
    expect(Array.isArray(res.suggestions)).toBe(true);
  });

  it('Score_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.scoreAgainstJob(OWNER, 'missing', 'job')).rejects.toBeInstanceOf(
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
    const res = await c.service.pitchForMandate(OWNER, 't1', 'UX Lead gesucht');
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
    const res = await c.service.pitchForMandate(OWNER, 't1', '');
    expect(res.provider).toBe('template');
    expect(res.headline).toContain('Designer');
  });

  it('Pitch_NoProvider_FallsBackToFacts', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    const res = await c.service.pitchForMandate(OWNER, 't1', 'any mandate');
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
    const res = await c.service.pitchForMandate(OWNER, 't1', '');
    expect(res.provider).toBe('template');
  });

  it('Pitch_MalformedJson_FallsBack', async () => {
    const c = ctx({ available: true, generate: async () => 'not json' });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.pitchForMandate(OWNER, 't1', '');
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
    const res = await c.service.pitchForMandate(OWNER, 't1', '');
    expect(res.provider).toBe('claude');
    expect(res.paragraphs).toEqual(['Ein starker Absatz.']);
  });

  it('Pitch_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.pitchForMandate(OWNER, 'missing', '')).rejects.toBeInstanceOf(
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
    const res = await c.service.outreach(OWNER, 't1', opts());
    expect(res.provider).toBe('claude');
    expect(res.subject).toBe('Spannende Rolle');
    expect(res.body).toContain('Hallo Lena');
  });

  it('Outreach_LinkedIn_DropsSubjectEvenIfProvided', async () => {
    const json = JSON.stringify({ subject: 'sollte weg', body: 'Kurze DM' });
    const c = ctx({ available: true, generate: async () => json });
    await c.keys.set(OWNER, 'claude', 'sk-user');
    await c.talents.add(talent('t1'));
    const res = await c.service.outreach(OWNER, 't1', opts({ channel: 'linkedin' }));
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
    const res = await c.service.outreach(OWNER, 't1', opts());
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
    const res = await c.service.outreach(OWNER, 't1', opts({ audience: 'client' }));
    expect(res.provider).toBe('template');
    expect(res.body).toContain('Lena');
  });

  it('Outreach_NoProvider_FallsBack', async () => {
    const c = ctx();
    await c.talents.add(talent('t1'));
    const res = await c.service.outreach(OWNER, 't1', opts());
    expect(res.provider).toBe('template');
  });

  it('Outreach_UnknownTalent_Throws404', async () => {
    const c = ctx();
    await expect(c.service.outreach(OWNER, 'missing', opts())).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
