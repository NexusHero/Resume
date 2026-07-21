import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { Global, Module, type INestApplication, type Provider } from '@nestjs/common';
import request from 'supertest';
import { loadConfig } from '../../src/config.js';
import { EnvPlanProvider } from '../../src/adapters/env-plan-provider.js';
import { CoreModule } from '../../src/nest/core.module.js';
import { AuthModule } from '../../src/nest/auth/auth.module.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import {
  USER_REPOSITORY,
  AUTH_ENGINE,
  TENANT_REPOSITORY,
  EMAIL_VERIFICATION_TOKEN_STORE,
  MAILER,
  PLAN_PROVIDER,
  RATE_LIMITER,
} from '../../src/nest/tokens.js';
import { InMemoryRateLimiter } from '../../src/adapters/in-memory-rate-limiter.js';
import {
  InMemoryUserRepository,
  InMemoryTenantRepository,
  InMemoryEmailVerificationTokenStore,
  RecordingMailer,
  FakeAuthEngine,
  noopLogger,
} from '../support/fakes.js';

/**
 * The auth vertical driven end-to-end through NestJS (ADR-0051): the Nest
 * AuthController + the real AuthService/EmailVerificationService, with the
 * credential engine and stores swapped for in-memory fakes (the same seams the
 * Express acceptance suite uses). Proves register→session cookie→me→logout and
 * that a guard-less `me` returns null when signed out.
 */
describe('NestJS auth vertical', () => {
  let app: INestApplication;
  const config = loadConfig({});

  beforeAll(async () => {
    // In production these tokens are supplied by the @Global Persistence/Infra
    // modules; here a global fakes module stands in with in-memory adapters so
    // AuthModule (encapsulated) can see them.
    const fakeProviders: Provider[] = [
      { provide: USER_REPOSITORY, useValue: new InMemoryUserRepository() },
      { provide: AUTH_ENGINE, useValue: new FakeAuthEngine() },
      { provide: TENANT_REPOSITORY, useValue: new InMemoryTenantRepository() },
      {
        provide: EMAIL_VERIFICATION_TOKEN_STORE,
        useValue: new InMemoryEmailVerificationTokenStore(),
      },
      { provide: MAILER, useValue: new RecordingMailer() },
      { provide: PLAN_PROVIDER, useValue: new EnvPlanProvider(config.plan) },
      { provide: RATE_LIMITER, useValue: new InMemoryRateLimiter() },
    ];
    @Global()
    @Module({
      providers: fakeProviders,
      exports: fakeProviders.map((p) => (p as { provide: symbol }).provide),
    })
    class FakePortsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule, FakePortsModule, AuthModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemJsonFilter(noopLogger));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const creds = { email: 'nora@agency.de', password: 'Sup3rSecret!', name: 'Nora' };

  it('Register_SetsSessionCookie_AndReturnsUser', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/register').send(creds);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'nora@agency.de' });
    expect(res.headers['set-cookie']?.[0]).toMatch(/HttpOnly/i);
  });

  it('Me_WithSessionCookie_ReturnsUserAndPlan', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/register').send({ ...creds, email: 'me@agency.de' });
    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'me@agency.de' });
    expect(res.body).toHaveProperty('plan');
    expect(res.body.isSuperAdmin).toBe(false);
  });

  it('Me_WithoutSession_ReturnsNullUser', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it('LoginThenLogout_WorkAndClearCookie', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/register').send({ ...creds, email: 'lo@agency.de' });
    const login = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'lo@agency.de', password: creds.password });
    expect(login.status).toBe(200);
    const logout = await agent.post('/api/v1/auth/logout');
    expect(logout.status).toBe(204);
  });

  it('Providers_ReturnsSocialLoginAvailability', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/providers');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('google');
    expect(res.body).toHaveProperty('linkedin');
  });

  it('RequestVerification_WithoutSession_Returns401ProblemJson', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/verify-email/request');
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
  });
});
