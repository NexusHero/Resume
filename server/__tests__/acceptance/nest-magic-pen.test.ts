import 'reflect-metadata';
import request from 'supertest';
import type { Server } from 'http';
import { loadConfig } from '../../src/config.js';
import { makeNestApp, closeNestApps } from '../support/nest-app.js';
import { FakeLlmProvider } from '../support/fakes.js';
import type {
  LlmGenerateInput,
  LlmGenerateResult,
  LlmProvider,
} from '../../src/ports/llm-provider.js';

/** A provider that answers each section with the right schema, keyed off its system prompt. */
class SchemaAwarePenProvider implements LlmProvider {
  readonly id = 'claude' as const;
  readonly label = 'Fake';
  readonly available = true;
  calls = 0;
  failNext = false;
  async generate(input: LlmGenerateInput): Promise<LlmGenerateResult> {
    this.calls += 1;
    if (this.failNext) {
      this.failNext = false;
      throw new Error('upstream down');
    }
    const sys = input.system ?? '';
    if (sys.includes('"bullets"')) {
      return { text: '{"bullets":["did the thing"]}', usage: { inputTokens: 1, outputTokens: 1 } };
    }
    if (sys.includes('"groups"')) {
      return {
        text: '{"groups":[{"label":"Languages","items":["Go"]}]}',
        usage: { inputTokens: 1, outputTokens: 1 },
      };
    }
    if (sys.includes('"paragraphs"')) {
      return { text: '{"paragraphs":["Dear team."]}', usage: { inputTokens: 1, outputTokens: 1 } };
    }
    return { text: '{"text":"Tuned text"}', usage: { inputTokens: 1, outputTokens: 1 } };
  }
}

const PEN_PATHS = ['headline', 'summary', 'experience', 'skills', 'all'];

describe('Magic Pen API (AK-3.1/3.2/3.5)', () => {
  afterEach(async () => {
    await closeNestApps();
  });

  const register = async (agent: ReturnType<typeof request.agent>, email: string) => {
    await agent.post('/api/v1/auth/register').send({ email, password: 'correct-horse-battery' });
  };

  const seedTalent = async (agent: ReturnType<typeof request.agent>, name = 'Ada Lovelace') =>
    (await agent.post('/api/v1/talents').send({ name })).body.talent;

  const seedPosting = async (agent: ReturnType<typeof request.agent>) =>
    (
      await agent.post('/api/v1/job-postings').send({
        source: 'text',
        company: 'Acme Corp',
        title: 'Senior Engineer',
        description: 'We need distributed systems experience.',
      })
    ).body.jobPosting;

  const seedApplication = async (
    agent: ReturnType<typeof request.agent>,
    jobPostingId: string,
    talentId: string,
  ) =>
    (await agent.post('/api/v1/job-applications').send({ jobPostingId, talentId })).body
      .jobApplication;

  /** Save the base CV (grounding source) with one experience station and the given skills. */
  const seedBaseCv = async (
    agent: ReturnType<typeof request.agent>,
    talentId: string,
    skills: string[],
  ) => {
    await agent.put(`/api/v1/talents/${talentId}/documents`).send({
      resume: {
        summary: 'Backend engineer.',
        experience: [
          {
            role: 'Backend Engineer',
            company: 'Acme',
            period: '2018–2022',
            location: '',
            bullets: ['Built APIs'],
            skills: [],
          },
        ],
        education: [],
        skillGroups: [{ label: 'x', items: skills }],
        rawText: '',
      },
    });
  };

  const bootWithProvider = async (provider?: LlmProvider, plan?: string): Promise<Server> =>
    makeNestApp(loadConfig(plan ? { PLAN: plan } : {}), {
      llmProviders: provider ? [provider] : [],
    });

  it('Pen_NoLogin_Returns401', async () => {
    const app = await makeNestApp();
    const req = request(app);
    for (const section of PEN_PATHS) {
      const body = section === 'experience' ? { experienceIndex: 0 } : undefined;
      const res = await req.post(`/api/v1/job-applications/id1/pen/${section}`).send(body);
      expect({ section, status: res.status }).toEqual({ section, status: 401 });
    }
  });

  it('Pen_NoKey_Returns503AiNotConfigured', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'nokey-pen@phase3.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);
    for (const section of PEN_PATHS) {
      const body = section === 'experience' ? { experienceIndex: 0 } : undefined;
      const res = await agent
        .post(`/api/v1/job-applications/${application.id}/pen/${section}`)
        .send(body);
      expect({ section, status: res.status }).toEqual({ section, status: 503 });
      expect(res.body.type).toBe('about:blank#ai-not-configured');
    }
  });

  it('Pen_TwoWorkspaces_AreIsolated', async () => {
    const app = await makeNestApp(loadConfig({ SELF_SERVE_TENANTS: 'true' }), {
      llmProviders: [new SchemaAwarePenProvider()],
    });
    const a = request.agent(app);
    const b = request.agent(app);
    await register(a, 'pen-a@phase3.test');
    await register(b, 'pen-b@phase3.test');
    const talentA = await seedTalent(a);
    const postingA = await seedPosting(a);
    const application = await seedApplication(a, postingA.id, talentA.id);

    const res = await b.post(`/api/v1/job-applications/${application.id}/pen/summary`);
    expect(res.status).toBe(404);
  });

  it('Pen_ForeignId_Returns404', async () => {
    const app = await makeNestApp(loadConfig({}), {
      llmProviders: [new SchemaAwarePenProvider()],
    });
    const agent = request.agent(app);
    await register(agent, 'pen-foreign@phase3.test');
    const res = await agent.post('/api/v1/job-applications/nope/pen/summary');
    expect(res.status).toBe(404);
  });

  it('PenHeadline_Valid_ReturnsSuggestionWithBeforeAfter', async () => {
    const app = await bootWithProvider(new SchemaAwarePenProvider());
    const agent = request.agent(app);
    await register(agent, 'pen-headline@phase3.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const res = await agent.post(`/api/v1/job-applications/${application.id}/pen/headline`);
    expect(res.status).toBe(200);
    expect(res.body.suggestion.section).toBe('headline');
    expect(res.body.suggestion).toHaveProperty('before');
    expect(res.body.suggestion).toHaveProperty('after');
    expect(res.body.suggestion.provider).toBe('claude');
    expect(res.body.suggestion.grounding).toBeDefined();
  });

  it('PenExperience_IndexOutOfRange_Returns400', async () => {
    const app = await bootWithProvider(new SchemaAwarePenProvider());
    const agent = request.agent(app);
    await register(agent, 'pen-idx@phase3.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id); // 0 stations

    const res = await agent
      .post(`/api/v1/job-applications/${application.id}/pen/experience`)
      .send({ experienceIndex: 0 });
    expect(res.status).toBe(400);
    expect(res.body.type).toBe('about:blank#validation-error');
  });

  it('Pen_Grounding_FabricatedSkillFlagged', async () => {
    const provider = new FakeLlmProvider('claude', true, '{"text":"I use Kubernetes daily."}');
    const app = await bootWithProvider(provider);
    const agent = request.agent(app);
    await register(agent, 'pen-skill@phase3.test');
    const talent = await seedTalent(agent);
    await seedBaseCv(agent, talent.id, ['Rust']); // base has no Kubernetes
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const res = await agent.post(`/api/v1/job-applications/${application.id}/pen/summary`);
    expect(res.status).toBe(200);
    expect(res.body.suggestion.grounding.grounded).toBe(false);
    expect(
      res.body.suggestion.grounding.unsupported.some(
        (u: { kind: string; text: string }) => u.kind === 'skill' && u.text === 'kubernetes',
      ),
    ).toBe(true);
  });

  it('Pen_Grounding_FabricatedNumberFlagged', async () => {
    const provider = new FakeLlmProvider('claude', true, '{"text":"Over 15 Jahre experience."}');
    const app = await bootWithProvider(provider);
    const agent = request.agent(app);
    await register(agent, 'pen-num@phase3.test');
    const talent = await seedTalent(agent);
    await seedBaseCv(agent, talent.id, ['Rust']);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const res = await agent.post(`/api/v1/job-applications/${application.id}/pen/summary`);
    expect(res.status).toBe(200);
    expect(
      res.body.suggestion.grounding.unsupported.some((u: { kind: string }) => u.kind === 'number'),
    ).toBe(true);
  });

  it('Pen_DoesNotPersistAnything', async () => {
    const app = await bootWithProvider(new SchemaAwarePenProvider());
    const agent = request.agent(app);
    await register(agent, 'pen-persist@phase3.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);
    const before = await agent.get(`/api/v1/job-applications/${application.id}/documents`);

    await agent.post(`/api/v1/job-applications/${application.id}/pen/summary`);
    const after = await agent.get(`/api/v1/job-applications/${application.id}/documents`);
    expect(after.body.documents).toEqual(before.body.documents);
  });

  it('Pen_NoPlanGuard_WorksForNonProUser', async () => {
    const app = await bootWithProvider(new SchemaAwarePenProvider(), 'free');
    const agent = request.agent(app);
    await register(agent, 'pen-free@phase3.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const res = await agent.post(`/api/v1/job-applications/${application.id}/pen/summary`);
    expect(res.status).toBe(200);
  });

  it('Pen_ProviderGarbage_Returns502', async () => {
    const app = await bootWithProvider(new FakeLlmProvider('claude', true, 'not json'));
    const agent = request.agent(app);
    await register(agent, 'pen-garbage@phase3.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const res = await agent.post(`/api/v1/job-applications/${application.id}/pen/summary`);
    expect(res.status).toBe(502);
    expect(res.body.type).toBe('about:blank#upstream-provider');
  });

  it('PenAll_ReturnsAggregateSections', async () => {
    const app = await bootWithProvider(new SchemaAwarePenProvider());
    const agent = request.agent(app);
    await register(agent, 'pen-all@phase3.test');
    const talent = await seedTalent(agent);
    await seedBaseCv(agent, talent.id, ['Rust']); // one experience station
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const res = await agent.post(`/api/v1/job-applications/${application.id}/pen/all`);
    expect(res.status).toBe(200);
    const sections = res.body.sections;
    const kinds = sections
      .filter((s: { section?: string }) => s.section)
      .map((s: { section: string }) => s.section);
    expect(kinds).toEqual(
      expect.arrayContaining(['headline', 'summary', 'experienceBullets', 'skills', 'letter']),
    );
    expect(
      sections.filter((s: { section?: string }) => s.section === 'experienceBullets'),
    ).toHaveLength(1);
  });

  it('PenAll_PartialProviderFailure_ReturnsErrorSlotAndRest', async () => {
    const provider = new SchemaAwarePenProvider();
    provider.failNext = true; // the first section fails, the rest succeed
    const app = await bootWithProvider(provider);
    const agent = request.agent(app);
    await register(agent, 'pen-allfail@phase3.test');
    const talent = await seedTalent(agent);
    await seedBaseCv(agent, talent.id, ['Rust']);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const res = await agent.post(`/api/v1/job-applications/${application.id}/pen/all`);
    expect(res.status).toBe(200);
    const sections = res.body.sections as Array<{ section?: string; error?: { type: string } }>;
    expect(sections.some((s) => s.error)).toBe(true);
    expect(sections.some((s) => s.section)).toBe(true);
    const errorSlot = sections.find((s) => s.error)!;
    expect(errorSlot.error.type).toBe('upstream-provider');
  });
});
