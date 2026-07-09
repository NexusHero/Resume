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
import { ForecastModule } from '../../src/nest/forecast/forecast.module.js';
import { ObservationsModule } from '../../src/nest/observations/observations.module.js';
import { UsageModule } from '../../src/nest/usage/usage.module.js';
import { AuthGuard } from '../../src/nest/auth.guard.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import {
  MANDATE_REPOSITORY,
  CANDIDACY_REPOSITORY,
  STAGE_TRANSITION_REPOSITORY,
  INTERVIEW_OBSERVATION_REPOSITORY,
  USAGE_METER,
} from '../../src/nest/tokens.js';
import {
  InMemoryMandateRepository,
  InMemoryCandidacyRepository,
  InMemoryStageTransitionRepository,
  InMemoryInterviewObservationRepository,
  InMemoryUsageMeter,
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

describe('NestJS insights verticals (forecast, observations, usage)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const fakes: Provider[] = [
      { provide: MANDATE_REPOSITORY, useValue: new InMemoryMandateRepository() },
      { provide: CANDIDACY_REPOSITORY, useValue: new InMemoryCandidacyRepository() },
      { provide: STAGE_TRANSITION_REPOSITORY, useValue: new InMemoryStageTransitionRepository() },
      {
        provide: INTERVIEW_OBSERVATION_REPOSITORY,
        useValue: new InMemoryInterviewObservationRepository(),
      },
      { provide: USAGE_METER, useValue: new InMemoryUsageMeter() },
    ];
    @Global()
    @Module({ providers: fakes, exports: fakes.map((p) => (p as { provide: symbol }).provide) })
    class FakePortsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule, FakePortsModule, ForecastModule, ObservationsModule, UsageModule],
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

  it('Forecast_ReturnsPipelineForecast', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/forecast');
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Object);
  });

  it('Usage_Summary_And_Audit_And_Csv', async () => {
    const server = app.getHttpServer();
    expect((await request(server).get('/api/v1/settings/usage')).status).toBe(200);
    expect((await request(server).get('/api/v1/settings/usage/audit')).status).toBe(200);
    const csv = await request(server).get('/api/v1/settings/usage/audit.csv');
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.headers['content-disposition']).toMatch(/ai-audit-trail\.csv/);
  });

  it('Observations_Record_InvalidBody_Returns400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/mandates/m1/observations')
      .send({ difficulty: 'not-a-difficulty' });
    expect(res.status).toBe(400);
  });
});
