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
import { MandatesModule } from '../../src/nest/mandates/mandates.module.js';
import { AuthGuard } from '../../src/nest/auth.guard.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import { MANDATE_REPOSITORY, CANDIDACY_REPOSITORY } from '../../src/nest/tokens.js';
import {
  InMemoryMandateRepository,
  InMemoryCandidacyRepository,
  noopLogger,
} from '../support/fakes.js';

/** Stamps a team member so the guarded routes run without the full auth chain. */
class StampUserGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    req.userId = 'user1';
    req.tenantId = 'team';
    return true;
  }
}

describe('NestJS mandates vertical', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const fakes: Provider[] = [
      { provide: MANDATE_REPOSITORY, useValue: new InMemoryMandateRepository() },
      { provide: CANDIDACY_REPOSITORY, useValue: new InMemoryCandidacyRepository() },
    ];
    @Global()
    @Module({ providers: fakes, exports: fakes.map((p) => (p as { provide: symbol }).provide) })
    class FakePortsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule, FakePortsModule, MandatesModule],
    })
      .overrideGuard(AuthGuard)
      .useClass(StampUserGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemJsonFilter(noopLogger));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const mandate = { client: 'Aurora GmbH', role: 'Staff Engineer', location: 'Berlin' };

  it('CreateListUpdateDelete_RoundTrip', async () => {
    const server = app.getHttpServer();

    const created = await request(server).post('/api/v1/mandates').send(mandate);
    expect(created.status).toBe(201);
    const id = created.body.mandate.id;
    expect(created.body.mandate).toMatchObject({ client: 'Aurora GmbH', role: 'Staff Engineer' });

    const list = await request(server).get('/api/v1/mandates');
    expect(list.status).toBe(200);
    expect(list.body.map((m: { id: string }) => m.id)).toContain(id);

    const patched = await request(server)
      .patch(`/api/v1/mandates/${id}`)
      .send({ role: 'Principal Engineer' });
    expect(patched.status).toBe(200);
    expect(patched.body.mandate.role).toBe('Principal Engineer');

    const removed = await request(server).delete(`/api/v1/mandates/${id}`);
    expect(removed.status).toBe(204);

    const after = await request(server).get('/api/v1/mandates');
    expect(after.body.map((m: { id: string }) => m.id)).not.toContain(id);
  });

  it('Create_InvalidBody_Returns400ProblemJson', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/mandates')
      .send({ client: '', role: 'x', location: 'y' });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
  });
});
