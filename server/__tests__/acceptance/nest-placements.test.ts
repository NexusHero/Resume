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
import { PlacementsModule } from '../../src/nest/placements/placements.module.js';
import { AuthGuard } from '../../src/nest/auth.guard.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import { PLACEMENT_REPOSITORY } from '../../src/nest/tokens.js';
import { InMemoryPlacementRepository, noopLogger } from '../support/fakes.js';

class StampUserGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    req.userId = 'user1';
    req.tenantId = 'team';
    return true;
  }
}

describe('NestJS placements vertical', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const fakes: Provider[] = [
      { provide: PLACEMENT_REPOSITORY, useValue: new InMemoryPlacementRepository() },
    ];
    @Global()
    @Module({ providers: fakes, exports: fakes.map((p) => (p as { provide: symbol }).provide) })
    class FakePortsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule, FakePortsModule, PlacementsModule],
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

  it('CreateListUpdateDelete_RoundTrip', async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post('/api/v1/placements')
      .send({ candidateName: 'Mara Vogel', client: 'Aurora GmbH', fee: '12.000 €' });
    expect(created.status).toBe(201);
    const id = created.body.placement.id;

    const list = await request(server).get('/api/v1/placements');
    expect(list.body.map((p: { id: string }) => p.id)).toContain(id);

    const patched = await request(server)
      .patch(`/api/v1/placements/${id}`)
      .send({ status: 'invoiced' });
    expect(patched.status).toBe(200);
    expect(patched.body.placement.status).toBe('invoiced');

    const removed = await request(server).delete(`/api/v1/placements/${id}`);
    expect(removed.status).toBe(204);
  });

  it('Create_InvalidBody_Returns400ProblemJson', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/placements')
      .send({ candidateName: '', client: '' });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
  });
});
