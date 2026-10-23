import 'reflect-metadata';
import request from 'supertest';
import type { Server } from 'http';
import { makeNestApp, closeNestApps } from '../support/nest-app.js';

/**
 * Every intermediary ("Vermittlung") route must answer 404 problem+json when the
 * workspace switch is off (ADR-0057, AK-0.2). This suite registers an admin and
 * exercises the real, fully-wired Nest app with the switch seeded off.
 */
type Method = 'get' | 'post' | 'patch' | 'delete';

const VERMITTLER_ROUTES: Array<[Method, string]> = [
  ['get', '/api/v1/mandates'],
  ['post', '/api/v1/mandates'],
  ['patch', '/api/v1/mandates/m1'],
  ['delete', '/api/v1/mandates/m1'],
  ['get', '/api/v1/mandates/m1/candidacies'],
  ['post', '/api/v1/mandates/m1/candidacies'],
  ['get', '/api/v1/talents/t1/candidacies'],
  ['patch', '/api/v1/candidacies/c1'],
  ['delete', '/api/v1/candidacies/c1'],
  ['post', '/api/v1/mandates/m1/match'],
  ['post', '/api/v1/mandates/m1/candidates/t1/explain'],
  ['post', '/api/v1/mandates/m1/candidates/t1/interview-kit'],
  ['post', '/api/v1/mandates/m1/candidates/t1/prep'],
  ['get', '/api/v1/mandates/m1/observations'],
  ['post', '/api/v1/mandates/m1/observations'],
  ['get', '/api/v1/placements'],
  ['post', '/api/v1/placements'],
  ['patch', '/api/v1/placements/p1'],
  ['delete', '/api/v1/placements/p1'],
  ['get', '/api/v1/forecast'],
  ['post', '/api/v1/talents/t1/outreach/send'],
  ['post', '/api/v1/mail/sync-replies'],
  ['get', '/api/v1/mail/status'],
  ['get', '/api/v1/assistant'],
  ['put', '/api/v1/assistant'],
  ['post', '/api/v1/assistant/run'],
  ['get', '/api/v1/assistant/suggestions'],
  ['post', '/api/v1/assistant/suggestions/s1/accept'],
  ['post', '/api/v1/assistant/suggestions/s1/dismiss'],
  ['get', '/api/v1/assistant/suggestions/s1/dossier.pdf'],
  ['get', '/api/v1/applications'],
  ['get', '/api/v1/history'],
  ['post', '/api/v1/applications'],
  ['post', '/api/v1/applications/build'],
  ['patch', '/api/v1/applications/a1'],
  ['delete', '/api/v1/applications/a1'],
  ['get', '/api/v1/searches'],
  ['post', '/api/v1/searches'],
  ['delete', '/api/v1/searches/s1'],
  ['get', '/api/v1/searches/s1/run'],
  ['post', '/api/v1/talents/t1/documents/pitch'],
  ['post', '/api/v1/talents/t1/documents/outreach'],
];

async function server(): Promise<Server> {
  return makeNestApp(undefined, { vermittlung: false });
}

async function registeredAgent(srv: Server) {
  const agent = request.agent(srv);
  await agent
    .post('/api/v1/auth/register')
    .send({ email: 'admin@phase0.test', password: 'correct-horse-battery' });
  return agent;
}

describe('Vermittlung switch off → every agency route answers 404', () => {
  afterAll(async () => {
    await closeNestApps();
  });

  it.each(VERMITTLER_ROUTES)('Vermittlung_%s_%s_WhenOff_Returns404', async (method, path) => {
    const srv = await server();
    const agent = await registeredAgent(srv);
    await agent.post('/api/v1/auth/login').send({
      email: 'admin@phase0.test',
      password: 'correct-horse-battery',
    });

    const res = await agent[method](path).send({});
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body.type).toBe('about:blank#not-found');
  });

  it('Vermittlung_GuardWithoutSession_Returns401', async () => {
    const srv = await server();
    const res = await request(srv).get('/api/v1/mandates');
    expect(res.status).toBe(401);
  });

  it('Vermittlung_Mandates_WhenOn_ReturnsExistingData', async () => {
    const srv = await server();
    const agent = await registeredAgent(srv);

    // switch on, create data
    await agent.patch('/api/v1/settings/workspace').send({ vermittlung: true }).expect(200);
    const created = await agent
      .post('/api/v1/mandates')
      .send({ client: 'Aurora GmbH', role: 'Staff Engineer', location: 'Berlin' });
    expect(created.status).toBe(201);

    // switch off → 404
    await agent.patch('/api/v1/settings/workspace').send({ vermittlung: false }).expect(200);
    expect((await agent.get('/api/v1/mandates')).status).toBe(404);

    // switch back on → the data is still there
    await agent.patch('/api/v1/settings/workspace').send({ vermittlung: true }).expect(200);
    const list = await agent.get('/api/v1/mandates');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ client: 'Aurora GmbH', role: 'Staff Engineer' });
  });

  it('Ai_DocumentsPitch_WhenOffWithoutKey_Returns404Not503', async () => {
    const srv = await server();
    const agent = await registeredAgent(srv);
    const res = await agent.post('/api/v1/talents/t1/documents/pitch').send({});
    expect(res.status).toBe(404); // VermittlungGuard before AiConfiguredGuard
  });

  it('Ai_MatchExplain_WhenOffWithoutKey_Returns404Not503', async () => {
    const srv = await server();
    const agent = await registeredAgent(srv);
    const res = await agent.post('/api/v1/mandates/m1/candidates/t1/explain').send({});
    expect(res.status).toBe(404);
  });
});
