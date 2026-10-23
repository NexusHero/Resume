import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { Global, Module, type INestApplication, type Provider } from '@nestjs/common';
import request from 'supertest';
import { CoreModule } from '../../src/nest/core.module.js';
import { WorkspaceSettingsModule } from '../../src/nest/workspace-settings/workspace-settings.module.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import { RoleAuthorizer } from '../../src/adapters/role-authorizer.js';
import type { UserView } from '../../src/domain/user.js';
import { AUTH_SERVICE, AUTHORIZER, WORKSPACE_SETTINGS_STORE } from '../../src/nest/tokens.js';
import { InMemoryWorkspaceSettingsStore, noopLogger } from '../support/fakes.js';

describe('NestJS workspace settings (ADR-0057)', () => {
  let app: INestApplication;
  let current: UserView | null = null;

  beforeAll(async () => {
    const authStub = { currentUser: async () => current };
    const fakes: Provider[] = [
      { provide: AUTH_SERVICE, useValue: authStub },
      { provide: AUTHORIZER, useValue: new RoleAuthorizer() },
      { provide: WORKSPACE_SETTINGS_STORE, useValue: new InMemoryWorkspaceSettingsStore() },
    ];
    @Global()
    @Module({ providers: fakes, exports: fakes.map((p) => (p as { provide: symbol }).provide) })
    class FakePortsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule, FakePortsModule, WorkspaceSettingsModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemJsonFilter(noopLogger));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const asUser = (roles: Array<'admin' | 'recruiter'>, tenantId = 'team') => {
    current = {
      id: 'u1',
      email: 'u1@example.com',
      roles,
      createdAt: '2026-01-01T00:00:00.000Z',
      tenantId,
    };
  };

  it('WorkspaceSettings_GetWithoutSession_Returns401', async () => {
    current = null;
    const res = await request(app.getHttpServer()).get('/api/v1/settings/workspace');
    expect(res.status).toBe(401);
  });

  it('WorkspaceSettings_GetWithSession_ReturnsVermittlungFalseByDefault', async () => {
    asUser(['recruiter']);
    const res = await request(app.getHttpServer()).get('/api/v1/settings/workspace');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ vermittlung: false });
  });

  it('WorkspaceSettings_PatchAsAdmin_SetsVermittlung', async () => {
    asUser(['admin']);
    const res = await request(app.getHttpServer())
      .patch('/api/v1/settings/workspace')
      .send({ vermittlung: true });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ vermittlung: true });

    const read = await request(app.getHttpServer()).get('/api/v1/settings/workspace');
    expect(read.body).toEqual({ vermittlung: true });
  });

  it('WorkspaceSettings_PatchAsRecruiter_Returns403', async () => {
    asUser(['recruiter'], 'recruiter-room');
    const res = await request(app.getHttpServer())
      .patch('/api/v1/settings/workspace')
      .send({ vermittlung: true });
    expect(res.status).toBe(403);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
  });

  it('WorkspaceSettings_PatchInvalidBody_Returns400', async () => {
    asUser(['admin']);
    const res = await request(app.getHttpServer())
      .patch('/api/v1/settings/workspace')
      .send({ vermittlung: 'yes' });
    expect(res.status).toBe(400);
  });

  it('WorkspaceSettings_PatchInWorkspaceA_DoesNotLeakToWorkspaceB', async () => {
    asUser(['admin'], 'workspace-a');
    await request(app.getHttpServer())
      .patch('/api/v1/settings/workspace')
      .send({ vermittlung: true })
      .expect(200);

    asUser(['admin'], 'workspace-b');
    const res = await request(app.getHttpServer()).get('/api/v1/settings/workspace');
    expect(res.body).toEqual({ vermittlung: false });
  });
});
