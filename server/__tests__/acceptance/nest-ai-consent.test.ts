import 'reflect-metadata';
import request from 'supertest';
import type { Server } from 'http';
import { loadConfig } from '../../src/config.js';
import { makeNestApp, closeNestApps } from '../support/nest-app.js';
import { FakeLlmProvider } from '../support/fakes.js';
import { AI_ROUTES } from '../support/route-inventory.js';
import { AI_CONSENT_REQUIRED_DETAIL } from '../../src/domain/workspace-settings.js';

/**
 * AI consent gate (ADR-0063). The server must answer 403 `ai-consent-required`
 * on every generative route until a workspace admin consents; the CV-import
 * routes (T01–T03) are only gated in the AI mode (key set).
 */

const LETTER_REPLY =
  '{"paragraphs":["I am writing to apply to Acme Corp for the Senior Engineer role. ' +
  'My background in distributed systems and Kubernetes matches your posting."]}';

const KEY = () => [new FakeLlmProvider('claude', true, LETTER_REPLY)];

const register = async (agent: ReturnType<typeof request.agent>, email: string) => {
  await agent.post('/api/v1/auth/register').send({ email, password: 'correct-horse-battery' });
};

const seedTalent = async (agent: ReturnType<typeof request.agent>, name = 'Ada Lovelace') =>
  (await agent.post('/api/v1/talents').send({ name })).body.talent;

const seedMandate = async (agent: ReturnType<typeof request.agent>) =>
  (
    await agent.post('/api/v1/mandates').send({
      client: 'Acme GmbH',
      role: 'Staff Engineer',
      location: 'Berlin',
      jobText: 'Wir suchen eine:n Staff Engineer.',
    })
  ).body.mandate;

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

/** Per-route request body + any resource ids the route path needs. */
function routeRequest(
  agent: ReturnType<typeof request.agent>,
  spec: (typeof AI_ROUTES)[number],
  ids: {
    talentId: string;
    mandateId: string;
    applicationId: string;
  },
) {
  const path = spec.path.replace(':id', ids.applicationId).replace(':talentId', ids.talentId);
  const method = spec.method.toLowerCase() as 'get' | 'post' | 'put';
  const bodyByRoute: Record<string, unknown> = {
    K01: { action: 'summary' },
    K02: { jobText: 'job' },
    K03: { mandateContext: 'ctx' },
    K04: {},
    K05: { targetLang: 'en' },
    K09: { company: 'Celonis', role: 'Senior Engineer', city: 'München', skills: ['C++'] },
    K11: { mode: 'autopilot' },
    K12: { text: 'Senior Engineer bei Acme.' },
    K19: { message: 'Hallo' },
  };
  return agent[method](path).send(bodyByRoute[spec.id] ?? {});
}

describe('AI consent gate (ADR-0063)', () => {
  afterEach(async () => {
    await closeNestApps();
  });

  it('AiConsent_NoConsent_GenerativeRoute_Returns403', async () => {
    const app = await makeNestApp(loadConfig({}), { aiConsent: false, llmProviders: KEY() });
    const agent = request.agent(app);
    await register(agent, 'noconsent@phase6.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const res = await agent.post(`/api/v1/job-applications/${application.id}/letter`);
    expect(res.status).toBe(403);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body.type).toBe('about:blank#ai-consent-required');
    expect(res.body.detail).toBe(AI_CONSENT_REQUIRED_DETAIL);
  });

  it('AiConsent_WithConsent_GenerativeRoute_Returns200', async () => {
    const app = await makeNestApp(loadConfig({}), { aiConsent: false, llmProviders: KEY() });
    const agent = request.agent(app);
    await register(agent, 'consented@phase6.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    await agent.patch('/api/v1/settings/workspace').send({ aiConsent: true }).expect(200);

    const res = await agent.post(`/api/v1/job-applications/${application.id}/letter`);
    expect(res.status).toBe(200);
  });

  it('AiConsent_NoKey_Returns503BeforeConsent', async () => {
    // Guard order: the missing key (503) is more fundamental than the missing
    // consent (403) — a keyless server must never leak a consent prompt.
    const app = await makeNestApp(loadConfig({}), { aiConsent: false });
    const agent = request.agent(app);
    await register(agent, 'nokey-consent@phase6.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const res = await agent.post(`/api/v1/job-applications/${application.id}/letter`);
    expect(res.status).toBe(503);
    expect(res.body.type).toBe('about:blank#ai-not-configured');
  });

  it('AiConsent_VermittlerKiRoutes_VermittlungOff_Returns404Before403', async () => {
    // AK-0.2 stays intact: with the switch off, the intermediary AI routes are
    // 404 `not-enabled`, regardless of the consent state. `pitch` (K03) and
    // match-ai `explain` (K06) are the document-AI/match-AI routes that carry
    // `@RequiresVermittlung()` (K01 `ai` is a main-path CV-editing route).
    const app = await makeNestApp(loadConfig({}), {
      aiConsent: false,
      vermittlung: false,
      llmProviders: KEY(),
    });
    const agent = request.agent(app);
    await register(agent, 'vermittler-off@phase6.test');
    const talent = await seedTalent(agent);

    const pitch = await agent
      .post(`/api/v1/talents/${talent.id}/documents/pitch`)
      .send({ mandateContext: 'ctx' });
    expect(pitch.status).toBe(404);
    expect(pitch.body.type).toBe('about:blank#not-found');

    const matchAi = await agent.post('/api/v1/mandates/missing/candidates/t1/explain').send({});
    expect(matchAi.status).toBe(404);
    expect(matchAi.body.type).toBe('about:blank#not-found');
  });

  it('AiConsent_AllGenerativeRoutes_Gated', async () => {
    // Every non-conditional AI route 403s without consent (switch ON, key set).
    const app = await makeNestApp(loadConfig({}), {
      aiConsent: false,
      vermittlung: true,
      llmProviders: KEY(),
    });
    const agent = request.agent(app);
    await register(agent, 'all-gated@phase6.test');
    const talent = await seedTalent(agent);
    const mandate = await seedMandate(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);
    const ids = { talentId: talent.id, mandateId: mandate.id, applicationId: application.id };

    // K10/K11 are conditional autopilot: seed autopilot so the consent check
    // is reached (the switch must be on for the assistant routes to be reachable).
    await agent
      .put('/api/v1/assistant')
      .send({ mode: 'suggest' })
      .catch(() => undefined);

    const results: Array<{ id: string; status: number }> = [];
    for (const spec of AI_ROUTES) {
      const res = await routeRequest(agent, spec, ids);
      results.push({ id: spec.id, status: res.status });
    }

    for (const r of results) {
      // K10 (POST /assistant/run) needs an enabled autopilot to reach the consent
      // gate; K11 (PUT /assistant) gates on `mode: 'autopilot'` in the body.
      if (r.id === 'K10') {
        expect({ id: r.id, status: r.status }).toEqual({ id: r.id, status: 400 });
        continue;
      }
      expect({ id: r.id, status: r.status }).toEqual({ id: r.id, status: 403 });
    }
  });

  it('AiConsent_AssistantAutopilot_NoConsent_Returns403', async () => {
    const app = await makeNestApp(loadConfig({}), {
      aiConsent: false,
      vermittlung: true,
      llmProviders: KEY(),
      assistantSettings: { enabled: true, mode: 'autopilot' },
    });
    const agent = request.agent(app);
    await register(agent, 'assistant-consent@phase6.test');

    const run = await agent.post('/api/v1/assistant/run');
    expect(run.status).toBe(403);
    expect(run.body.type).toBe('about:blank#ai-consent-required');

    const put = await agent.put('/api/v1/assistant').send({ mode: 'autopilot' });
    expect(put.status).toBe(403);
    expect(put.body.type).toBe('about:blank#ai-consent-required');
  });

  it('AiConsent_TwoWorkspaces_ConsentIsScoped', async () => {
    const app = await makeNestApp(loadConfig({ SELF_SERVE_TENANTS: 'true' }), {
      aiConsent: false,
      llmProviders: KEY(),
    });
    const a = request.agent(app);
    await a
      .post('/api/v1/auth/register')
      .send({ email: 'ws-a-consent@phase6.test', password: 'correct-horse-battery' });
    await a.patch('/api/v1/settings/workspace').send({ aiConsent: true }).expect(200);
    const talentA = await seedTalent(a);
    const postingA = await seedPosting(a);
    const applicationA = await seedApplication(a, postingA.id, talentA.id);
    expect((await a.post(`/api/v1/job-applications/${applicationA.id}/letter`)).status).toBe(200);

    const b = request.agent(app);
    await b
      .post('/api/v1/auth/register')
      .send({ email: 'ws-b-consent@phase6.test', password: 'correct-horse-battery' });
    const talentB = await seedTalent(b);
    const postingB = await seedPosting(b);
    const applicationB = await seedApplication(b, postingB.id, talentB.id);
    expect((await b.post(`/api/v1/job-applications/${applicationB.id}/letter`)).status).toBe(403);
  });

  it('AiConsent_CvImport_NoKey_TextModeSucceeds', async () => {
    const app = await makeNestApp(loadConfig({}), { aiConsent: false });
    const agent = request.agent(app);
    await register(agent, 'cv-import-nokey@phase6.test');
    const talent = await seedTalent(agent);

    const res = await agent
      .post(`/api/v1/talents/${talent.id}/documents/parse`)
      .send({ text: 'My CV text' });
    expect(res.status).toBe(200);
    expect(res.body.parsed.mode).toBe('text');
  });

  it('AiConsent_CvImport_WithKey_NoConsent_Returns403', async () => {
    const app = await makeNestApp(loadConfig({}), { aiConsent: false, llmProviders: KEY() });
    const agent = request.agent(app);
    await register(agent, 'cv-import-consent@phase6.test');
    const talent = await seedTalent(agent);

    const res = await agent
      .post(`/api/v1/talents/${talent.id}/documents/parse`)
      .send({ text: 'My CV text' });
    expect(res.status).toBe(403);
    expect(res.body.type).toBe('about:blank#ai-consent-required');
  });

  it('AiConsent_Settings_NonAdmin_Forbidden', async () => {
    const app = await makeNestApp(loadConfig({}), { aiConsent: false });
    const admin = request.agent(app);
    await admin
      .post('/api/v1/auth/register')
      .send({ email: 'owner@phase6.test', password: 'correct-horse-battery' });

    // The second registered user is a recruiter in the same default tenant.
    const recruiter = request.agent(app);
    await recruiter
      .post('/api/v1/auth/register')
      .send({ email: 'recruiter@phase6.test', password: 'correct-horse-battery' });

    const res = await recruiter.patch('/api/v1/settings/workspace').send({ aiConsent: true });
    expect(res.status).toBe(403);
  });
});
