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

function ctx(providerOverrides: Partial<LlmProvider> = {}) {
  const talents = new InMemoryTalentRepository();
  const documents = new InMemoryDocumentRepository();
  const keys = new InMemoryApiKeyStore();
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
