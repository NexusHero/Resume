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
  API_KEY_STORE,
  USER_REPOSITORY,
} from '../../src/nest/tokens.js';
import { InMemoryApiKeyStore, InMemoryUserRepository, noopLogger } from '../support/fakes.js';

class StampGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    ctx.switchToHttp().getRequest().userId = 'user1';
    return true;
  }
}

// Minimal LlmService stand-in — only settings()/get()/currentProvider() are used here.
const llmStub = {
  settings: () => ({ provider: 'claude', providers: { claude: true, gemini: false } }),
  get: () => ({}),
  currentProvider: () => 'claude',
};

describe('NestJS llm vertical (provider settings + keys)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const fakes: Provider[] = [
      { provide: LLM_SERVICE, useValue: llmStub },
      { provide: COVER_LETTER_SERVICE, useValue: {} },
      { provide: API_KEY_STORE, useValue: new InMemoryApiKeyStore() },
      { provide: USER_REPOSITORY, useValue: new InMemoryUserRepository() },
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

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemJsonFilter(noopLogger));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Settings_ReturnsProviderAvailability', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/settings/llm');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('providers');
  });

  it('Keys_SetStatusRemove_RoundTrip', async () => {
    const server = app.getHttpServer();
    expect((await request(server).get('/api/v1/settings/keys')).body).toEqual({
      claude: false,
      gemini: false,
    });
    expect(
      (await request(server).put('/api/v1/settings/keys/claude').send({ key: 'sk-x' })).status,
    ).toBe(204);
    expect((await request(server).get('/api/v1/settings/keys')).body).toEqual({
      claude: true,
      gemini: false,
    });
    expect((await request(server).delete('/api/v1/settings/keys/claude')).status).toBe(204);
    expect((await request(server).get('/api/v1/settings/keys')).body.claude).toBe(false);
  });

  it('Keys_UnknownProvider_Returns400', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/v1/settings/keys/openai')
      .send({ key: 'x' });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
  });
});
