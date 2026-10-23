import 'reflect-metadata';
import request from 'supertest';
import type { Server } from 'http';
import { loadConfig } from '../../src/config.js';
import { makeNestApp, closeNestApps } from '../support/nest-app.js';
import { AI_ROUTES, type RouteSpec } from '../support/route-inventory.js';
import { FakeLlmProvider } from '../support/fakes.js';
import type { AssistantSettings } from '../../src/domain/assistant.js';

/** One request body per AI route (K10 has none; K11 selects autopilot). */
const BODY: Record<string, unknown> = {
  K01: { action: 'summary' },
  K02: { jobText: 'We need React.' },
  K03: { mandateContext: 'x' },
  K04: { audience: 'candidate', channel: 'email' },
  K05: { targetLang: 'de' },
  K06: {},
  K07: {},
  K08: {},
  K09: { company: 'Helio', role: 'Engineer' },
  K10: undefined,
  K11: { mode: 'autopilot' },
  K12: { text: 'We are hiring a Senior C++ Engineer in Berlin.' },
};

const CONDITIONAL = new Set(['K10', 'K11']);

interface Ids {
  talent: string;
  mandate: string;
}

async function boot(opts: {
  available?: boolean;
  plan?: 'free' | 'pro';
  reply?: string;
}): Promise<{ app: Server; agent: ReturnType<typeof request.agent>; ids: Ids }> {
  const app = await makeNestApp(loadConfig(opts.plan ? { PLAN: opts.plan } : {}), {
    vermittlung: true,
    llmProviders: [new FakeLlmProvider('claude', opts.available ?? false, opts.reply ?? 'AI text')],
    assistantSettings: { enabled: true, mode: 'autopilot' } as Partial<AssistantSettings>,
  });
  const agent = request.agent(app);
  await agent
    .post('/api/v1/auth/register')
    .send({ email: 'ai-contract@phase0.test', password: 'correct-horse-battery' });
  const talent = await agent.post('/api/v1/talents').send({ name: 'Ada Beispiel' });
  const mandate = await agent
    .post('/api/v1/mandates')
    .send({ client: 'Helio', role: 'Engineer', location: 'Berlin', jobText: 'React' });
  return {
    app,
    agent,
    ids: { talent: talent.body.talent.id, mandate: mandate.body.mandate.id },
  };
}

const realPath = (path: string, ids: Ids) => {
  const withTalent = path.startsWith('/api/v1/talents/')
    ? path.replace(':id', ids.talent)
    : path.replace(':id', ids.mandate);
  return withTalent.replace(':talentId', ids.talent);
};

const hit = (
  agent: ReturnType<typeof request.agent> | ReturnType<typeof request>,
  route: RouteSpec,
  ids: Ids,
  body: unknown = BODY[route.id],
) =>
  agent[route.method.toLowerCase() as 'post' | 'put' | 'get'](realPath(route.path, ids)).send(
    body as Record<string, unknown>,
  );

describe('AI route contract (AK-0.5)', () => {
  afterEach(async () => {
    await closeNestApps();
  });

  it('AiRoute_NoKeyConfigured_Returns503AiNotConfigured (K01–K11)', async () => {
    const { agent, ids } = await boot({ available: false });
    for (const route of AI_ROUTES) {
      const res = await hit(agent, route, ids);
      expect({ id: route.id, status: res.status }).toEqual({ id: route.id, status: 503 });
      expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
      expect(res.body.type).toBe('about:blank#ai-not-configured');
    }
  });

  it('AiRoute_NoKeyConfigured_ResponseContainsNoGeneratedText (K01–K11)', async () => {
    const { agent, ids } = await boot({ available: false });
    for (const route of AI_ROUTES) {
      const res = await hit(agent, route, ids);
      expect(Object.keys(res.body).sort()).toEqual(['detail', 'status', 'title', 'type']);
      expect(JSON.stringify(res.body)).not.toMatch(
        /"text"|paragraphs|summary|message|pitch|ats|suggestion|translation|template/i,
      );
    }
  });

  it('AiRoute_NoKeyConfigured_NeverCallsAProvider (K01–K11)', async () => {
    const provider = new FakeLlmProvider('claude', false, 'unused');
    const app = await makeNestApp(loadConfig({}), {
      vermittlung: true,
      llmProviders: [provider],
      assistantSettings: { enabled: true, mode: 'autopilot' },
    });
    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/register')
      .send({ email: 'never@phase0.test', password: 'correct-horse-battery' });
    const talent = await agent.post('/api/v1/talents').send({ name: 'Ada Beispiel' });
    const mandate = await agent
      .post('/api/v1/mandates')
      .send({ client: 'Helio', role: 'Engineer', location: 'Berlin', jobText: 'React' });
    const ids = { talent: talent.body.talent.id, mandate: mandate.body.mandate.id };
    for (const route of AI_ROUTES) await hit(agent, route, ids);
    expect(provider.calls).toBe(0);
  });

  it('AiRoute_NoLoginAndNoKey_Returns401 (K01–K11)', async () => {
    const { app, ids } = await boot({ available: false });
    for (const route of AI_ROUTES) {
      const res = await hit(request(app), route, ids);
      expect({ id: route.id, status: res.status }).toEqual({ id: route.id, status: 401 });
    }
  });

  it('AiRoute_NoKeyAndInvalidBody_Returns503 (K01–K09)', async () => {
    const { agent, ids } = await boot({ available: false });
    for (const route of AI_ROUTES.filter((r) => !CONDITIONAL.has(r.id))) {
      const res = await hit(agent, route, ids, { nonsense: true });
      expect({ id: route.id, status: res.status }).toEqual({ id: route.id, status: 503 });
    }
  });

  it('AiRoute_NoKeyAndFreePlan_Returns503Before402 (K01–K09)', async () => {
    const { agent, ids } = await boot({ available: false, plan: 'free' });
    for (const route of AI_ROUTES.filter((r) => !CONDITIONAL.has(r.id))) {
      const res = await hit(agent, route, ids);
      expect({ id: route.id, status: res.status }).toEqual({ id: route.id, status: 503 });
    }
  });

  it('AssistantSettings_FreePlanAutopilotWithoutKey_Returns402Not503 (K11)', async () => {
    const { agent } = await boot({ available: false, plan: 'free' });
    const res = await agent.put('/api/v1/assistant').send({ mode: 'autopilot' });
    expect(res.status).toBe(402);
  });

  it('AssistantRun_AutopilotWithoutKeyAndNoCandidates_Returns503AndStagesNothing (K10)', async () => {
    const { agent } = await boot({ available: false });
    const before = await agent.get('/api/v1/assistant');
    const res = await agent.post('/api/v1/assistant/run');
    expect(res.status).toBe(503);
    expect(res.body.type).toBe('about:blank#ai-not-configured');
    const after = await agent.get('/api/v1/assistant');
    expect(after.body.settings.lastRunAt).toBe(before.body.settings.lastRunAt);
    expect(await agent.get('/api/v1/assistant/suggestions')).toMatchObject({ body: [] });
  });

  it('AiRoute_FakeProviderConfigured_ReturnsContentTaggedWithProvider (K01, K09)', async () => {
    const { agent, ids } = await boot({
      available: true,
      reply: 'Generated text from the provider.',
    });
    for (const id of ['K01', 'K09']) {
      const route = AI_ROUTES.find((r) => r.id === id)!;
      const res = await hit(agent, route, ids);
      expect(res.status).toBe(200);
      const provider = id === 'K01' ? res.body.suggestion.provider : res.body.provider;
      expect(provider).toBe('claude');
      expect(provider).not.toBe('template');
    }
  });

  it('AiRoute_ProviderThrows_Returns502UpstreamProvider (K01–K09)', async () => {
    const provider = new FakeLlmProvider('claude', true, 'unused');
    provider.failWith = new Error('upstream down');
    const app = await makeNestApp(loadConfig({}), { vermittlung: true, llmProviders: [provider] });
    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/register')
      .send({ email: 'throws@phase0.test', password: 'correct-horse-battery' });
    const talent = await agent.post('/api/v1/talents').send({ name: 'Ada Beispiel' });
    const mandate = await agent
      .post('/api/v1/mandates')
      .send({ client: 'Helio', role: 'Engineer', location: 'Berlin', jobText: 'React' });
    const ids = { talent: talent.body.talent.id, mandate: mandate.body.mandate.id };
    for (const route of AI_ROUTES.filter((r) => !CONDITIONAL.has(r.id))) {
      const res = await hit(agent, route, ids);
      expect({ id: route.id, status: res.status }).toEqual({ id: route.id, status: 502 });
      expect(res.body.type).toBe('about:blank#upstream-provider');
    }
  });
});
