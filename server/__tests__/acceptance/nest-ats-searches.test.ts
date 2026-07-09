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
import { JOB_SOURCE, SAVED_SEARCH_REPOSITORY } from '../../src/nest/tokens.js';
import { FakeJobSource, InMemorySavedSearchRepository, noopLogger } from '../support/fakes.js';

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
    await app.init();
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
