import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import {
  Global,
  Module,
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
  type Provider,
} from '@nestjs/common';
import request from 'supertest';
import { CoreModule } from '../../src/nest/core.module.js';
import { AtsModule } from '../../src/nest/ats/ats.module.js';
import { SearchesModule } from '../../src/nest/searches/searches.module.js';
import { AuthGuard } from '../../src/nest/auth.guard.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import {
  JOB_SOURCE,
  SAVED_SEARCH_REPOSITORY,
  WORKSPACE_SETTINGS_STORE,
} from '../../src/nest/tokens.js';
import { FakeJobSource, InMemorySavedSearchRepository, noopLogger } from '../support/fakes.js';
import { loadConfig } from '../../src/config.js';
import { makeNestApp, closeNestApps } from '../support/nest-app.js';

class StampUserGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    ctx.switchToHttp().getRequest().userId = 'user1';
    return true;
  }
}

describe('NestJS ats + searches verticals', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const fakes: Provider[] = [
      { provide: SAVED_SEARCH_REPOSITORY, useValue: new InMemorySavedSearchRepository() },
      {
        provide: WORKSPACE_SETTINGS_STORE,
        useValue: { get: async () => ({ vermittlung: true }), set: async () => undefined },
      },
    ];
    @Global()
    @Module({ providers: fakes, exports: fakes.map((p) => (p as { provide: symbol }).provide) })
    class FakePortsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule, FakePortsModule, AtsModule, SearchesModule],
    })
      .overrideGuard(AuthGuard)
      .useClass(StampUserGuard)
      // Replace JobsModule's own JOB_SOURCE (createJobSource → live boards) so the
      // saved-search re-run never touches the network in tests.
      .overrideProvider(JOB_SOURCE)
      .useValue(new FakeJobSource())
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemJsonFilter(noopLogger));
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app.close();
  });

  it('Ats_Analyze_ScoresAgainstProfile', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ats')
      .send({ text: 'We need C++ and gRPC and distributed systems experience.' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('score');
  });

  it('Ats_EmptyRequest_Returns400', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/ats').send({});
    expect(res.status).toBe(400);
  });

  it('Searches_CreateListRunDelete_RoundTrip', async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post('/api/v1/searches')
      .send({ name: 'Rust roles', q: 'Rust' });
    expect(created.status).toBe(201);
    const id = created.body.search.id;

    const list = await request(server).get('/api/v1/searches');
    expect(list.body.map((s: { id: string }) => s.id)).toContain(id);

    const run = await request(server).get(`/api/v1/searches/${id}/run`);
    expect(run.status).toBe(200);
    expect(run.body).toHaveProperty('counts');

    const removed = await request(server).delete(`/api/v1/searches/${id}`);
    expect(removed.status).toBe(204);
  });
});

describe('Saved searches workspace scope (RI15/Q6)', () => {
  afterEach(async () => {
    await closeNestApps();
  });

  const register = async (agent: ReturnType<typeof request.agent>, email: string) => {
    await agent.post('/api/v1/auth/register').send({ email, password: 'correct-horse-battery' });
  };

  it('SavedSearches_NoLogin_Returns401', async () => {
    const app = await makeNestApp();
    const req = request(app);
    const cases: Array<Promise<request.Response>> = [
      req.get('/api/v1/searches'),
      req.post('/api/v1/searches').send({ name: 'x' }),
      req.delete('/api/v1/searches/id1'),
      req.get('/api/v1/searches/id1/run'),
    ];
    for (const promise of cases) {
      const res = await promise;
      expect(res.status).toBe(401);
    }
  });

  it('SavedSearches_Create_SetsOwnerIdFromScope', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'ss-owner@phase1.test');
    const created = await agent
      .post('/api/v1/searches')
      .send({ name: 'Rust', q: 'rust', threshold: 70 });
    expect(created.status).toBe(201);
    expect(created.body.search.ownerId).toBe('team');
  });

  it('SavedSearches_TwoWorkspaces_AreIsolated', async () => {
    const app = await makeNestApp(loadConfig({ SELF_SERVE_TENANTS: 'true' }));
    const a = request.agent(app);
    const b = request.agent(app);
    await register(a, 'ss-a@phase1.test');
    await register(b, 'ss-b@phase1.test');

    const created = await a
      .post('/api/v1/searches')
      .send({ name: 'Rust', q: 'rust', threshold: 70 });
    expect(created.status).toBe(201);
    const id = created.body.search.id;

    expect((await a.get('/api/v1/searches')).body.map((s: { id: string }) => s.id)).toContain(id);
    expect((await b.get('/api/v1/searches')).body.map((s: { id: string }) => s.id)).not.toContain(
      id,
    );

    // A foreign id is invisible: delete/run answer 404, not a cross-tenant leak.
    expect((await b.delete(`/api/v1/searches/${id}`)).status).toBe(404);
    expect((await b.get(`/api/v1/searches/${id}/run`)).status).toBe(404);
  });

  it('SavedSearches_VermittlungOff_StillVisible', async () => {
    const app = await makeNestApp(loadConfig({}), { vermittlung: false });
    const agent = request.agent(app);
    await register(agent, 'ss-visible@phase1.test');
    expect((await agent.get('/api/v1/searches')).status).toBe(200);
  });
});
