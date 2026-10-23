import 'reflect-metadata';
import request from 'supertest';
import { loadConfig } from '../../src/config.js';
import { makeNestApp, closeNestApps } from '../support/nest-app.js';
import { CompositeJobSource } from '../../src/adapters/composite-job-source.js';
import { EmptyJobSource } from '../../src/adapters/empty-job-source.js';
import { FakeJobSource, FakeLlmProvider, FakePageFetcher, noopLogger } from '../support/fakes.js';

const POSTING_JSON =
  '{"company":"Acme","title":"Engineer","location":"Berlin","country":"DE","requirements":["Rust"]}';

/** A composite wrapping a fake source whose getPosting can be seeded. */
function jobSourceWithPosting(sourceId: string, description: string) {
  return new CompositeJobSource(
    [new FakeJobSource().withPosting(sourceId, description)],
    noopLogger,
  );
}

describe('JobPostings API (AK-1.1/1.2/1.6/1.7/1.8)', () => {
  afterEach(async () => {
    await closeNestApps();
  });

  const register = async (agent: ReturnType<typeof request.agent>, email: string) => {
    await agent.post('/api/v1/auth/register').send({ email, password: 'correct-horse-battery' });
  };

  it('JobPostings_NoLogin_Returns401', async () => {
    const app = await makeNestApp();
    const req = request(app);
    const cases: Array<Promise<request.Response>> = [
      req.get('/api/v1/job-postings'),
      req.get('/api/v1/job-postings/id1'),
      req.post('/api/v1/job-postings/adopt').send({}),
      req.post('/api/v1/job-postings/extract').send({}),
      req.post('/api/v1/job-postings').send({}),
      req.patch('/api/v1/job-postings/id1').send({}),
      req.delete('/api/v1/job-postings/id1'),
    ];
    for (const promise of cases) {
      const res = await promise;
      expect(res.status).toBe(401);
    }
  });

  it('Adopt_ValidSource_StoresAndSubsequentListContainsIt', async () => {
    const app = await makeNestApp(loadConfig({}), {
      jobSource: jobSourceWithPosting('f1', 'Full ad description here.'),
    });
    const agent = request.agent(app);
    await register(agent, 'adopt@phase1.test');
    const adopt = await agent.post('/api/v1/job-postings/adopt').send({
      source: 'Fake',
      sourceId: 'f1',
      url: 'https://Example.com/job/',
      company: 'Aurora Systems',
      title: 'Senior C++ Engineer',
      location: 'Berlin',
      country: 'DE',
      requirements: ['C++'],
    });
    expect(adopt.status).toBe(200);
    expect(adopt.body.jobPosting).toMatchObject({
      description: 'Full ad description here.',
      descriptionIncomplete: false,
      url: 'https://example.com/job',
    });
    const list = await agent.get('/api/v1/job-postings');
    expect(list.status).toBe(200);
    expect(list.body.some((p: { id: string }) => p.id === adopt.body.jobPosting.id)).toBe(true);
  });

  it('Adopt_DuplicateSourceAndSourceId_ReturnsAlreadySaved', async () => {
    const app = await makeNestApp(loadConfig({}), {
      jobSource: jobSourceWithPosting('f1', 'Full text'),
    });
    const agent = request.agent(app);
    await register(agent, 'dup1@phase1.test');
    const body = { source: 'Fake', sourceId: 'f1', company: 'A', title: 'T' };
    const first = await agent.post('/api/v1/job-postings/adopt').send(body);
    const second = await agent.post('/api/v1/job-postings/adopt').send(body);
    expect(first.body.alreadySaved).toBe(false);
    expect(second.status).toBe(200);
    expect(second.body.alreadySaved).toBe(true);
    expect(second.body.jobPosting.id).toBe(first.body.jobPosting.id);
  });

  it('Adopt_DuplicateUrl_ReturnsAlreadySaved', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'dupurl@phase1.test');
    const first = await agent.post('/api/v1/job-postings/adopt').send({
      source: 'A',
      url: 'https://Example.com/job/',
      company: 'A',
      title: 'T',
    });
    const second = await agent.post('/api/v1/job-postings/adopt').send({
      source: 'B',
      url: 'https://example.com/job',
      company: 'B',
      title: 'T',
    });
    expect(first.body.alreadySaved).toBe(false);
    expect(second.body.alreadySaved).toBe(true);
    expect(second.body.jobPosting.id).toBe(first.body.jobPosting.id);
  });

  it('Adopt_UnknownSource_Returns404', async () => {
    const app = await makeNestApp(loadConfig({}), { jobSource: jobSourceWithPosting('f1', 'x') });
    const agent = request.agent(app);
    await register(agent, 'unknown@phase1.test');
    const res = await agent
      .post('/api/v1/job-postings/adopt')
      .send({ source: 'Nope', sourceId: 'f1', company: 'A', title: 'T' });
    expect(res.status).toBe(404);
    expect(res.body.type).toBe('about:blank#not-found');
  });

  it('Adopt_NoSourcesConfigured_Returns404', async () => {
    const app = await makeNestApp(loadConfig({}), { jobSource: new EmptyJobSource() });
    const agent = request.agent(app);
    await register(agent, 'nosources@phase1.test');
    const res = await agent
      .post('/api/v1/job-postings/adopt')
      .send({ source: 'Fake', sourceId: 'f1', company: 'A', title: 'T' });
    expect(res.status).toBe(404);
  });

  it('Adopt_SourceWithoutDetail_ReturnsIncompletePosting', async () => {
    const app = await makeNestApp(loadConfig({}), {
      jobSource: new CompositeJobSource([new FakeJobSource()], noopLogger),
    });
    const agent = request.agent(app);
    await register(agent, 'incomplete@phase1.test');
    const res = await agent
      .post('/api/v1/job-postings/adopt')
      .send({ source: 'Fake', sourceId: 'f1', company: 'A', title: 'T' });
    expect(res.body.jobPosting.description).toBe('');
    expect(res.body.jobPosting.descriptionIncomplete).toBe(true);
  });

  it('Adopt_OnlyUrlWithoutSourceId_ReturnsIncompletePosting', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'onlyurl@phase1.test');
    const res = await agent
      .post('/api/v1/job-postings/adopt')
      .send({ source: 'url', url: 'https://x.test/job', company: 'A', title: 'T' });
    expect(res.status).toBe(200);
    expect(res.body.jobPosting.descriptionIncomplete).toBe(true);
  });

  it('Extract_NoKey_Returns503AiNotConfigured', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'nokey@phase1.test');
    const res = await agent.post('/api/v1/job-postings/extract').send({ text: 'We hire.' });
    expect(res.status).toBe(503);
    expect(res.body.type).toBe('about:blank#ai-not-configured');
  });

  it('Extract_NoKeyAndInvalidBody_Returns503Before400', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'nokeyinvalid@phase1.test');
    const res = await agent.post('/api/v1/job-postings/extract').send({ nonsense: true });
    expect(res.status).toBe(503);
  });

  it('Extract_FakeProvider_ReturnsDraft', async () => {
    const app = await makeNestApp(loadConfig({}), {
      llmProviders: [new FakeLlmProvider('claude', true, POSTING_JSON)],
    });
    const agent = request.agent(app);
    await register(agent, 'extract@phase1.test');
    const res = await agent
      .post('/api/v1/job-postings/extract')
      .send({ text: 'We hire a Rust engineer in Berlin.' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      company: 'Acme',
      title: 'Engineer',
      source: 'text',
      description: 'We hire a Rust engineer in Berlin.',
    });
  });

  it('Extract_FakeProvider_DraftContainsUrl', async () => {
    const app = await makeNestApp(loadConfig({}), {
      llmProviders: [new FakeLlmProvider('claude', true, POSTING_JSON)],
      pageFetcher: new FakePageFetcher({ text: 'Page text.', finalUrl: 'https://x.test/job' }),
    });
    const agent = request.agent(app);
    await register(agent, 'extracturl@phase1.test');
    const res = await agent.post('/api/v1/job-postings/extract').send({ url: 'https://x.test/' });
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('url');
    expect(res.body.url).toBe('https://x.test/job');
  });

  it('Extract_ProviderReturnsGarbage_Returns502', async () => {
    const app = await makeNestApp(loadConfig({}), {
      llmProviders: [new FakeLlmProvider('claude', true, 'not json at all')],
    });
    const agent = request.agent(app);
    await register(agent, 'garbage@phase1.test');
    const res = await agent.post('/api/v1/job-postings/extract').send({ text: 'We hire.' });
    expect(res.status).toBe(502);
    expect(res.body.type).toBe('about:blank#upstream-provider');
  });

  it('Extract_Url_SsrfBlocked_Returns400SsrfBlocked', async () => {
    const app = await makeNestApp(loadConfig({}), {
      llmProviders: [new FakeLlmProvider('claude', true, POSTING_JSON)],
      pageFetcher: FakePageFetcher.blocked(),
    });
    const agent = request.agent(app);
    await register(agent, 'ssrf@phase1.test');
    const res = await agent.post('/api/v1/job-postings/extract').send({ url: 'http://127.0.0.1/' });
    expect(res.status).toBe(400);
    expect(res.body.type).toBe('about:blank#ssrf-blocked');
  });

  it('Extract_Url_NoText_Returns422NoText', async () => {
    const app = await makeNestApp(loadConfig({}), {
      llmProviders: [new FakeLlmProvider('claude', true, POSTING_JSON)],
      pageFetcher: FakePageFetcher.noText(),
    });
    const agent = request.agent(app);
    await register(agent, 'notext@phase1.test');
    const res = await agent.post('/api/v1/job-postings/extract').send({ url: 'https://x.test/' });
    expect(res.status).toBe(422);
    expect(res.body.type).toBe('about:blank#no-text');
  });

  it('Create_Draft_PersistsAndIsEditable', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'create@phase1.test');
    const created = await agent.post('/api/v1/job-postings').send({
      source: 'text',
      company: 'Acme',
      title: 'Engineer',
      description: 'Ad text.',
      requirements: ['Rust'],
    });
    expect(created.status).toBe(201);
    const id = created.body.jobPosting.id;
    const patched = await agent
      .patch(`/api/v1/job-postings/${id}`)
      .send({ title: 'Senior Engineer' });
    expect(patched.status).toBe(200);
    expect(patched.body.jobPosting.title).toBe('Senior Engineer');
  });

  it('Create_DuplicateUrl_ReturnsAlreadySaved', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'createdup@phase1.test');
    const body = {
      source: 'url',
      url: 'https://Example.com/job/',
      company: 'A',
      title: 'T',
      description: 'x',
    };
    const first = await agent.post('/api/v1/job-postings').send(body);
    const second = await agent.post('/api/v1/job-postings').send(body);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.alreadySaved).toBe(true);
  });

  it('Update_CompletesIncompleteDescription', async () => {
    const app = await makeNestApp(loadConfig({}), {
      jobSource: new CompositeJobSource([new FakeJobSource()], noopLogger),
    });
    const agent = request.agent(app);
    await register(agent, 'complete@phase1.test');
    const adopt = await agent
      .post('/api/v1/job-postings/adopt')
      .send({ source: 'Fake', sourceId: 'f1', company: 'A', title: 'T' });
    expect(adopt.body.jobPosting.descriptionIncomplete).toBe(true);
    const patched = await agent
      .patch(`/api/v1/job-postings/${adopt.body.jobPosting.id}`)
      .send({ description: 'Now full text.' });
    expect(patched.body.jobPosting.description).toBe('Now full text.');
    expect(patched.body.jobPosting.descriptionIncomplete).toBe(false);
  });

  it('Delete_RemovesPosting_SubsequentGet404s', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'delete@phase1.test');
    const created = await agent
      .post('/api/v1/job-postings')
      .send({ source: 'text', company: 'A', title: 'T' });
    const id = created.body.jobPosting.id;
    expect((await agent.delete(`/api/v1/job-postings/${id}`)).status).toBe(204);
    expect((await agent.get(`/api/v1/job-postings/${id}`)).status).toBe(404);
  });

  it('JobPostings_VermittlungOff_StillVisible', async () => {
    const app = await makeNestApp(loadConfig({}), { vermittlung: false });
    const agent = request.agent(app);
    await register(agent, 'visible@phase1.test');
    expect((await agent.get('/api/v1/job-postings')).status).toBe(200);
  });

  it('JobPostings_TwoWorkspaces_AreIsolated', async () => {
    const app = await makeNestApp(loadConfig({ SELF_SERVE_TENANTS: 'true' }));
    const a = request.agent(app);
    const b = request.agent(app);
    await register(a, 'ws-a@phase1.test');
    await register(b, 'ws-b@phase1.test');

    const created = await a
      .post('/api/v1/job-postings')
      .send({ source: 'text', company: 'A only', title: 'T' });
    const id = created.body.jobPosting.id;

    expect((await a.get('/api/v1/job-postings')).body.map((p: { id: string }) => p.id)).toContain(
      id,
    );
    expect(
      (await b.get('/api/v1/job-postings')).body.map((p: { id: string }) => p.id),
    ).not.toContain(id);
  });

  it('JobPostings_ForeignId_GetPatchDelete_Return404', async () => {
    const app = await makeNestApp(loadConfig({ SELF_SERVE_TENANTS: 'true' }));
    const a = request.agent(app);
    const b = request.agent(app);
    await register(a, 'foreign-a@phase1.test');
    await register(b, 'foreign-b@phase1.test');

    const created = await a
      .post('/api/v1/job-postings')
      .send({ source: 'text', company: 'A', title: 'T' });
    const id = created.body.jobPosting.id;

    expect((await b.get(`/api/v1/job-postings/${id}`)).status).toBe(404);
    expect((await b.patch(`/api/v1/job-postings/${id}`).send({ title: 'X' })).status).toBe(404);
    expect((await b.delete(`/api/v1/job-postings/${id}`)).status).toBe(404);
  });
});
