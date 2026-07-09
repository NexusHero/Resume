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
import { RegistriesModule } from '../../src/nest/registries.module.js';
import { TalentsModule } from '../../src/nest/talents/talents.module.js';
import { AuthGuard } from '../../src/nest/auth.guard.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import {
  TALENT_REPOSITORY,
  DOCUMENT_REPOSITORY,
  ATTACHMENT_STORE,
  CANDIDACY_REPOSITORY,
} from '../../src/nest/tokens.js';
import {
  InMemoryTalentRepository,
  InMemoryDocumentRepository,
  InMemoryAttachmentStore,
  InMemoryCandidacyRepository,
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

describe('NestJS talents vertical', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const fakes: Provider[] = [
      { provide: TALENT_REPOSITORY, useValue: new InMemoryTalentRepository() },
      { provide: DOCUMENT_REPOSITORY, useValue: new InMemoryDocumentRepository() },
      { provide: ATTACHMENT_STORE, useValue: new InMemoryAttachmentStore() },
      { provide: CANDIDACY_REPOSITORY, useValue: new InMemoryCandidacyRepository() },
    ];
    @Global()
    @Module({ providers: fakes, exports: fakes.map((p) => (p as { provide: symbol }).provide) })
    class FakePortsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule, FakePortsModule, RegistriesModule, TalentsModule],
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

  it('CreateListUpdateDelete_RoundTrip_ExercisesDsgvoPurgers', async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post('/api/v1/talents')
      .send({ name: 'Mara Vogel', role: 'Staff Engineer', skills: ['C++', 'Rust'] });
    expect(created.status).toBe(201);
    const id = created.body.talent.id;

    const list = await request(server).get('/api/v1/talents');
    expect(list.body.map((t: { id: string }) => t.id)).toContain(id);

    const patched = await request(server)
      .patch(`/api/v1/talents/${id}`)
      .send({ role: 'Principal Engineer' });
    expect(patched.status).toBe(200);
    expect(patched.body.talent.role).toBe('Principal Engineer');

    // remove runs the TalentDataPurgers registry (documents/attachments/candidacies)
    const removed = await request(server).delete(`/api/v1/talents/${id}`);
    expect(removed.status).toBe(204);

    const after = await request(server).get('/api/v1/talents');
    expect(after.body.map((t: { id: string }) => t.id)).not.toContain(id);
  });

  it('Create_InvalidBody_Returns400ProblemJson', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/talents').send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
  });
});
