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
import { LlmModule } from '../../src/nest/llm/llm.module.js';
import { AuthGuard, OptionalAuthGuard } from '../../src/nest/auth.guard.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import {
  LLM_SERVICE,
  COVER_LETTER_SERVICE,
  USAGE_METER,
  PLAN_PROVIDER,
  RATE_LIMITER,
  CANDIDATE,
  USER_REPOSITORY,
  WORKSPACE_SETTINGS_SERVICE,
} from '../../src/nest/tokens.js';
import { LlmService } from '../../src/services/llm-service.js';
import { CoverLetterService } from '../../src/services/cover-letter-service.js';
import {
  FakeLlmProvider,
  InMemoryUserRepository,
  InMemoryUsageMeter,
  noopLogger,
} from '../support/fakes.js';
import { InMemoryRateLimiter } from '../../src/adapters/in-memory-rate-limiter.js';
import { FixedClock } from '../support/fakes.js';

class StampGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    ctx.switchToHttp().getRequest().userId = 'user1';
    return true;
  }
}

async function makeApp(configured: boolean): Promise<INestApplication> {
  const provider = new FakeLlmProvider(
    'claude',
    configured,
    'Sehr geehrtes Team, hiermit bewerbe ich mich.',
  );
  const llmService = new LlmService({
    providers: [provider],
    defaultProvider: 'claude',
    logger: noopLogger,
  });
  const users = new InMemoryUserRepository();
  users.users.push({
    id: 'user1',
    email: 'u1@example.com',
    passwordHash: '',
    roles: ['recruiter'],
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  const coverLetter = new CoverLetterService({
    llmService,
    userRepository: users,
    candidate: { name: 'Test Person', title: 'Engineer' },
    usageMeter: new InMemoryUsageMeter(),
    clock: new FixedClock(),
    logger: noopLogger,
  });

  const fakes: Provider[] = [
    { provide: LLM_SERVICE, useValue: llmService },
    { provide: COVER_LETTER_SERVICE, useValue: coverLetter },
    { provide: USAGE_METER, useValue: new InMemoryUsageMeter() },
    { provide: PLAN_PROVIDER, useValue: { planFor: async () => 'pro' } },
    { provide: RATE_LIMITER, useValue: new InMemoryRateLimiter() },
    { provide: CANDIDATE, useValue: { name: 'Test Person', title: 'Engineer' } },
    { provide: USER_REPOSITORY, useValue: users },
    {
      provide: WORKSPACE_SETTINGS_SERVICE,
      useValue: { isAiConsentGranted: async () => true, get: async () => ({ aiConsent: true }) },
    },
  ];
  @Global()
  @Module({ providers: fakes, exports: fakes.map((p) => (p as { provide: symbol }).provide) })
  class FakePortsModule {}

  const moduleRef = await Test.createTestingModule({
    imports: [CoreModule, FakePortsModule, LlmModule],
  })
    .overrideGuard(AuthGuard)
    .useClass(StampGuard)
    .overrideGuard(OptionalAuthGuard)
    .useClass(StampGuard)
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalFilters(new ProblemJsonFilter(noopLogger));
  await app.listen(0, '127.0.0.1');
  return app;
}

const coverLetterBody = {
  company: 'Celonis',
  role: 'Senior Engineer',
  city: 'München',
  skills: ['C++'],
};

describe('NestJS llm vertical (server status + cover letter)', () => {
  describe('configured', () => {
    let app: INestApplication;
    beforeAll(async () => {
      app = await makeApp(true);
    });
    afterAll(async () => {
      await app.close();
    });

    it('Settings_Llm_ReturnsServerStatusOnly', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/settings/llm');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ configured: true, current: 'claude' });
      expect(res.body).toHaveProperty('providers');
    });

    it('Settings_KeysRoute_Returns404', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/settings/keys');
      expect(res.status).toBe(404);
    });

    it('SettingsLlm_PutUnavailableProvider_Returns400', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/v1/settings/llm')
        .send({ provider: 'gemini' });
      expect(res.status).toBe(400);
      expect(res.body.type).toBe('about:blank#validation-error');
    });

    it('Ai_CoverLetter_WithKey_ReturnsProviderResult', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/cover-letter')
        .send(coverLetterBody);
      expect(res.status).toBe(200);
      expect(res.body.provider).toBe('claude');
      expect(res.body.text).toContain('bewerbe ich mich');
    });
  });

  describe('not configured', () => {
    let app: INestApplication;
    beforeAll(async () => {
      app = await makeApp(false);
    });
    afterAll(async () => {
      await app.close();
    });

    it('SettingsLlm_NoKey_ReportsConfiguredFalseAndCurrentNull', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/settings/llm');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ configured: false, current: null });
    });

    it('Ai_CoverLetter_NoKey_Returns503AiNotConfigured', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/cover-letter')
        .send(coverLetterBody);
      expect(res.status).toBe(503);
      expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
      expect(res.body.type).toBe('about:blank#ai-not-configured');
      expect(JSON.stringify(res.body)).not.toContain('Template');
    });
  });
});
