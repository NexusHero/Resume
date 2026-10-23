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
import { CandidaciesModule } from '../../src/nest/candidacies/candidacies.module.js';
import { AuthGuard } from '../../src/nest/auth.guard.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import {
  CANDIDACY_REPOSITORY,
  MANDATE_REPOSITORY,
  TALENT_REPOSITORY,
  STAGE_TRANSITION_REPOSITORY,
  PLACEMENT_REPOSITORY,
  WORKSPACE_SETTINGS_STORE,
  WORKSPACE_SETTINGS_SERVICE,
} from '../../src/nest/tokens.js';
import {
  InMemoryCandidacyRepository,
  InMemoryMandateRepository,
  InMemoryTalentRepository,
  InMemoryStageTransitionRepository,
  InMemoryPlacementRepository,
  noopLogger,
} from '../support/fakes.js';

class StampUserGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    req.userId = 'user1';
    req.tenantId = 'team';
    return true;
  }
}

/**
 * Candidacies routing through the real Nest app (ADR-0051). The happy-path
 * pipeline logic is covered by the CandidacyService unit tests; here we prove
 * the Nest wiring — guard, @CurrentScope, the multi-base-path routes, zod
 * validation and problem+json mapping — end to end.
 */
describe('NestJS candidacies vertical', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const fakes: Provider[] = [
      { provide: CANDIDACY_REPOSITORY, useValue: new InMemoryCandidacyRepository() },
      { provide: MANDATE_REPOSITORY, useValue: new InMemoryMandateRepository() },
      { provide: TALENT_REPOSITORY, useValue: new InMemoryTalentRepository() },
      { provide: STAGE_TRANSITION_REPOSITORY, useValue: new InMemoryStageTransitionRepository() },
      { provide: PLACEMENT_REPOSITORY, useValue: new InMemoryPlacementRepository() },
      {
        provide: WORKSPACE_SETTINGS_SERVICE,
        useValue: {
          isVermittlungEnabled: async () => true,
          get: async () => ({ vermittlung: true }),
        },
      },
      {
        provide: WORKSPACE_SETTINGS_STORE,
        useValue: { get: async () => ({ vermittlung: true }), set: async () => undefined },
      },
    ];
    @Global()
    @Module({ providers: fakes, exports: fakes.map((p) => (p as { provide: symbol }).provide) })
    class FakePortsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule, FakePortsModule, CandidaciesModule],
    })
      .overrideGuard(AuthGuard)
      .useClass(StampUserGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemJsonFilter(noopLogger));
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app.close();
  });

  it('ForTalent_UnknownTalent_Returns404ProblemJson', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/talents/t-unknown/candidacies');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
  });

  it('AddToMandate_UnknownMandate_Returns404ProblemJson', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/mandates/m-unknown/candidacies')
      .send({ talentId: 't1' });
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
  });

  it('AddToMandate_InvalidBody_Returns400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/mandates/m1/candidacies')
      .send({ talentId: '' });
    expect(res.status).toBe(400);
  });
});
