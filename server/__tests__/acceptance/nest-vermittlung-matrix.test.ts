import 'reflect-metadata';
import request from 'supertest';
import { loadConfig } from '../../src/config.js';
import { makeNestApp, closeNestApps } from '../support/nest-app.js';
import { VERMITTLER_ROUTES } from '../support/route-inventory.js';
import { FEATURE_NOT_ENABLED_DETAIL } from '../../src/domain/workspace-settings.js';

/** Table-driven families over the 37 intermediary routes (plan §6.2/AK-0.2). */
async function appFor(opts: { vermittlung?: boolean; plan?: 'free' | 'pro' } = {}) {
  return makeNestApp(loadConfig(opts.plan ? { PLAN: opts.plan } : {}), {
    vermittlung: opts.vermittlung ?? false,
  });
}

const bodyFor = (method: string) => (method === 'GET' || method === 'DELETE' ? undefined : {});

describe('Vermittler route matrix (AK-0.2)', () => {
  afterAll(async () => {
    await closeNestApps();
  });

  it('VermittlerRoute_VermittlungOff_Returns404ProblemJson (R01–R37)', async () => {
    const app = await appFor();
    const admin = request.agent(app);
    await admin
      .post('/api/v1/auth/register')
      .send({ email: 'matrix-admin@phase0.test', password: 'correct-horse-battery' });
    for (const route of VERMITTLER_ROUTES) {
      const res = await admin[route.method.toLowerCase() as 'get'](route.path).send(
        bodyFor(route.method),
      );
      expect({ id: route.id, status: res.status }).toEqual({ id: route.id, status: 404 });
      expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
      expect(res.body.type).toBe('about:blank#not-found');
      expect(res.body.detail).toBe(FEATURE_NOT_ENABLED_DETAIL);
    }
  });

  it('VermittlerRoute_NoLoginAndVermittlungOff_Returns401 (R01–R37)', async () => {
    const app = await appFor();
    const anonymous = request(app);
    for (const route of VERMITTLER_ROUTES) {
      const res = await anonymous[route.method.toLowerCase() as 'get'](route.path).send(
        bodyFor(route.method),
      );
      expect({ id: route.id, status: res.status }).toEqual({ id: route.id, status: 401 });
    }
  });

  it('VermittlerRoute_RecruiterRoleAndVermittlungOff_Returns404 (R01–R37)', async () => {
    const app = await appFor();
    const admin = request.agent(app);
    await admin
      .post('/api/v1/auth/register')
      .send({ email: 'matrix-first@phase0.test', password: 'correct-horse-battery' });
    const recruiter = request.agent(app);
    await recruiter
      .post('/api/v1/auth/register')
      .send({ email: 'matrix-recruiter@phase0.test', password: 'correct-horse-battery' });
    for (const route of VERMITTLER_ROUTES) {
      const res = await recruiter[route.method.toLowerCase() as 'get'](route.path).send(
        bodyFor(route.method),
      );
      expect({ id: route.id, status: res.status }).toEqual({ id: route.id, status: 404 });
    }
  });

  it('VermittlerRoute_VermittlungOn_IsNotBlockedByTheSwitch (R01–R37)', async () => {
    const app = await appFor({ vermittlung: true });
    const admin = request.agent(app);
    await admin
      .post('/api/v1/auth/register')
      .send({ email: 'matrix-on@phase0.test', password: 'correct-horse-battery' });
    for (const route of VERMITTLER_ROUTES) {
      const res = await admin[route.method.toLowerCase() as 'get'](route.path).send(
        bodyFor(route.method),
      );
      if (res.status === 404) {
        expect({ id: route.id, detail: res.body.detail }).not.toEqual({
          id: route.id,
          detail: FEATURE_NOT_ENABLED_DETAIL,
        });
      }
    }
  });

  it('VermittlerRoute_FreePlanAndVermittlungOff_Returns404Not402 (subset)', async () => {
    const app = await appFor({ plan: 'free' });
    const admin = request.agent(app);
    await admin
      .post('/api/v1/auth/register')
      .send({ email: 'matrix-free@phase0.test', password: 'correct-horse-battery' });
    const ids = new Set(['R06', 'R07', 'R08', 'R29', 'R33', 'R34', 'R35', 'R37']);
    for (const route of VERMITTLER_ROUTES.filter((r) => ids.has(r.id))) {
      const res = await admin[route.method.toLowerCase() as 'get'](route.path).send(
        bodyFor(route.method),
      );
      expect({ id: route.id, status: res.status }).toEqual({ id: route.id, status: 404 });
    }
  });

  it('VermittlerRoute_NoAiKeyAndVermittlungOff_Returns404Not503', async () => {
    const app = await appFor();
    const admin = request.agent(app);
    await admin
      .post('/api/v1/auth/register')
      .send({ email: 'matrix-nokey@phase0.test', password: 'correct-horse-battery' });
    for (const route of VERMITTLER_ROUTES.filter((r) =>
      ['R06', 'R07', 'R08', 'R34', 'R35'].includes(r.id),
    )) {
      const res = await admin[route.method.toLowerCase() as 'get'](route.path).send({});
      expect({ id: route.id, status: res.status }).toEqual({ id: route.id, status: 404 });
    }
  });

  it('VermittlungSwitch_OnInOneWorkspace_OtherWorkspaceStillGets404', async () => {
    const app = await makeNestApp(loadConfig({ SELF_SERVE_TENANTS: 'true' }), {
      vermittlung: false,
    });
    const a = request.agent(app);
    await a
      .post('/api/v1/auth/register')
      .send({ email: 'ws-a@phase0.test', password: 'correct-horse-battery' });
    await a.patch('/api/v1/settings/workspace').send({ vermittlung: true }).expect(200);
    expect((await a.get('/api/v1/mandates')).status).toBe(200);

    const b = request.agent(app);
    await b
      .post('/api/v1/auth/register')
      .send({ email: 'ws-b@phase0.test', password: 'correct-horse-battery' });
    expect((await b.get('/api/v1/mandates')).status).toBe(404);
    expect((await a.get('/api/v1/mandates')).status).toBe(200);
  });

  it('VermittlungSwitch_Off_AccountExportStillContainsMandates', async () => {
    const app = await appFor({ vermittlung: true });
    const admin = request.agent(app);
    await admin
      .post('/api/v1/auth/register')
      .send({ email: 'export@phase0.test', password: 'correct-horse-battery' });
    await admin
      .post('/api/v1/mandates')
      .send({ client: 'Export GmbH', role: 'Engineer', location: 'Berlin' })
      .expect(201);
    await admin.patch('/api/v1/settings/workspace').send({ vermittlung: false }).expect(200);
    const exported = await admin.get('/api/v1/account/export');
    expect(exported.status).toBe(200);
    expect(exported.body.mandates.some((m: { client: string }) => m.client === 'Export GmbH')).toBe(
      true,
    );
  });
});
