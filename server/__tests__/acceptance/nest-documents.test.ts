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
import { DocumentsModule } from '../../src/nest/documents/documents.module.js';
import { AttachmentsModule } from '../../src/nest/attachments/attachments.module.js';
import { PasswordResetModule } from '../../src/nest/password-reset/password-reset.module.js';
import { AuthGuard } from '../../src/nest/auth.guard.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import {
  DOCUMENT_REPOSITORY,
  TALENT_REPOSITORY,
  USER_REPOSITORY,
  ATTACHMENT_STORE,
  PDF_RENDERER,
  PDF_MERGER,
  AUTH_ENGINE,
  PASSWORD_RESET_TOKEN_STORE,
  MAILER,
  RATE_LIMITER,
} from '../../src/nest/tokens.js';
import { InMemoryRateLimiter } from '../../src/adapters/in-memory-rate-limiter.js';
import {
  InMemoryDocumentRepository,
  InMemoryTalentRepository,
  InMemoryUserRepository,
  InMemoryAttachmentStore,
  InMemoryPasswordResetTokenStore,
  FakePdfRenderer,
  FakePdfMerger,
  FakeAuthEngine,
  RecordingMailer,
  noopLogger,
} from '../support/fakes.js';

class StampGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    req.userId = 'user1';
    req.tenantId = 'team';
    return true;
  }
}

describe('NestJS documents + attachments + password-reset verticals', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const fakes: Provider[] = [
      { provide: DOCUMENT_REPOSITORY, useValue: new InMemoryDocumentRepository() },
      { provide: TALENT_REPOSITORY, useValue: new InMemoryTalentRepository() },
      { provide: USER_REPOSITORY, useValue: new InMemoryUserRepository() },
      { provide: ATTACHMENT_STORE, useValue: new InMemoryAttachmentStore() },
      { provide: PDF_RENDERER, useValue: new FakePdfRenderer() },
      { provide: PDF_MERGER, useValue: new FakePdfMerger() },
      { provide: AUTH_ENGINE, useValue: new FakeAuthEngine() },
      { provide: PASSWORD_RESET_TOKEN_STORE, useValue: new InMemoryPasswordResetTokenStore() },
      { provide: MAILER, useValue: new RecordingMailer() },
      { provide: RATE_LIMITER, useValue: new InMemoryRateLimiter() },
    ];
    @Global()
    @Module({ providers: fakes, exports: fakes.map((p) => (p as { provide: symbol }).provide) })
    class FakePortsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        CoreModule,
        FakePortsModule,
        DocumentsModule,
        AttachmentsModule,
        PasswordResetModule,
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(StampGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemJsonFilter(noopLogger));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Documents_Save_InvalidBody_Returns400', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/v1/talents/t1/documents')
      .send({ contact: 'not-an-object' });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
  });

  it('Attachments_Upload_InvalidBody_Returns400', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/talents/t1/attachments').send({});
    expect(res.status).toBe(400);
  });

  it('PasswordReset_Request_Always202_NoLeak', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({ email: 'unknown@nobody.de' });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ ok: true });
  });

  it('PasswordReset_Confirm_InvalidToken_Rejected', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: 'nope', password: 'Sup3rSecret!' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
