import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { CoreModule } from '../../src/nest/core.module.js';
import { JobsModule } from '../../src/nest/jobs/jobs.module.js';
import { AuthGuard } from '../../src/nest/auth.guard.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import { JOB_SOURCE } from '../../src/nest/tokens.js';
import { FakeJobSource, noopLogger } from '../support/fakes.js';

/**
 * The jobs vertical driven end-to-end through NestJS (ADR-0051): controller +
 * guard + zod parse + problem filter + the real JobSearchService, wired via the
 * module's useFactory providers. The live job source is swapped for the
 * FakeJobSource and the AuthGuard is stubbed to stamp a user — the same seams
 * the Express acceptance suite uses. Proves the migration pattern is sound.
 */
class StampUserGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    req.userId = 'user1';
    req.roles = [];
    req.tenantId = 'team';
    return true;
  }
}

describe('NestJS jobs vertical', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule, JobsModule],
    })
      .overrideProvider(JOB_SOURCE)
      .useValue(new FakeJobSource())
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

  it('GetJobs_NoParams_RunsDefaultSearchInTwoTiers', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/jobs');
    expect(res.status).toBe(200);
    expect(res.body.threshold).toBe(80);
    expect(Array.isArray(res.body.top)).toBe(true);
    expect(Array.isArray(res.body.more)).toBe(true);
    expect(res.body.top.every((j: { match: number }) => j.match >= 80)).toBe(true);
    expect(res.body.counts.total).toBe(res.body.counts.top + res.body.counts.more);
    // per-source breakdown flows through the Nest path (FakeJobSource → 'Fake')
    expect(res.body.top[0]).toHaveProperty('matchedSkills');
  });

  it('GetJobs_WithKeyword_FiltersBySearchTerm', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/jobs').query({ q: 'Rust' });
    expect(res.status).toBe(200);
    const all = [...res.body.top, ...res.body.more];
    expect(all.length).toBeGreaterThan(0);
    expect(
      all.every((j: { role: string; skills: string[] }) =>
        `${j.role} ${j.skills.join(' ')}`.toLowerCase().includes('rust'),
      ),
    ).toBe(true);
  });

  it('GetJobs_InvalidThreshold_Returns400ProblemJson', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/jobs').query({ threshold: '999' });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body).toMatchObject({ title: 'Validation failed', status: 400 });
  });
});
