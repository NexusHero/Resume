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
import { ApplicationsModule } from '../../src/nest/applications/applications.module.js';
import { AuthGuard } from '../../src/nest/auth.guard.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import {
  APPLICATION_REPOSITORY,
  AUDIT_LOG,
  PDF_ARCHIVE,
  PDF_RENDERER,
  PDF_MERGER,
  VERSIONER,
} from '../../src/nest/tokens.js';
import {
  InMemoryApplicationRepository,
  InMemoryAuditLog,
  InMemoryPdfArchive,
  FakePdfRenderer,
  FakePdfMerger,
  FakeVersioner,
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

const PDF = Buffer.from('%PDF-1.4 fake').toString('base64');

describe('NestJS applications vertical', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const fakes: Provider[] = [
      { provide: APPLICATION_REPOSITORY, useValue: new InMemoryApplicationRepository() },
      { provide: AUDIT_LOG, useValue: new InMemoryAuditLog() },
      { provide: PDF_ARCHIVE, useValue: new InMemoryPdfArchive() },
      { provide: PDF_RENDERER, useValue: new FakePdfRenderer() },
      { provide: PDF_MERGER, useValue: new FakePdfMerger() },
      { provide: VERSIONER, useValue: new FakeVersioner(null) },
    ];
    @Global()
    @Module({ providers: fakes, exports: fakes.map((p) => (p as { provide: symbol }).provide) })
    class FakePortsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule, FakePortsModule, ApplicationsModule],
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

  it('CreateListHistoryUpdate_RoundTrip', async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post('/api/v1/applications')
      .send({ company: 'Helio GmbH', position: 'Backend Engineer', pdfBase64: PDF });
    expect(created.status).toBe(201);
    const id = created.body.application.id;

    const list = await request(server).get('/api/v1/applications');
    expect(list.body.map((a: { id: string }) => a.id)).toContain(id);

    const history = await request(server).get('/api/v1/history');
    expect(history.status).toBe(200);
    expect(Array.isArray(history.body)).toBe(true);

    const patched = await request(server)
      .patch(`/api/v1/applications/${id}`)
      .send({ status: 'interview' });
    expect(patched.status).toBe(200);
    expect(patched.body.application.status).toBe('interview');
  });

  it('Build_RendersMergedPdf', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/applications/build')
      .send({ company: 'Helio GmbH', position: 'Backend Engineer' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('pdfBase64');
  });

  it('Create_InvalidBody_Returns400ProblemJson', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .send({ company: '' });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
  });
});
