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
import { RoleAuthorizer } from '../../src/adapters/role-authorizer.js';
import { CoreModule } from '../../src/nest/core.module.js';
import { MembersModule } from '../../src/nest/members/members.module.js';
import { InvitesModule } from '../../src/nest/invites/invites.module.js';
import { TenantAdminModule } from '../../src/nest/tenant-admin/tenant-admin.module.js';
import { AuthGuard } from '../../src/nest/auth.guard.js';
import { ProblemJsonFilter } from '../../src/nest/problem-json.filter.js';
import {
  AUTHORIZER,
  USER_REPOSITORY,
  TENANT_REPOSITORY,
  INVITE_REPOSITORY,
  AUTH_ENGINE,
  MAILER,
  RATE_LIMITER,
} from '../../src/nest/tokens.js';
import { InMemoryRateLimiter } from '../../src/adapters/in-memory-rate-limiter.js';
import {
  InMemoryUserRepository,
  InMemoryTenantRepository,
  InMemoryInviteRepository,
  FakeAuthEngine,
  RecordingMailer,
  noopLogger,
} from '../support/fakes.js';

// Mutable stamped principal — each test sets roles / super-admin before its request.
const principal = {
  userId: 'u1',
  roles: ['admin'] as string[],
  tenantId: 'team',
  isSuperAdmin: false,
};

class StampGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    Object.assign(ctx.switchToHttp().getRequest(), principal);
    return true;
  }
}

describe('NestJS team-admin authorization', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const fakes: Provider[] = [
      { provide: AUTHORIZER, useValue: new RoleAuthorizer() },
      { provide: USER_REPOSITORY, useValue: new InMemoryUserRepository() },
      { provide: TENANT_REPOSITORY, useValue: new InMemoryTenantRepository() },
      { provide: INVITE_REPOSITORY, useValue: new InMemoryInviteRepository() },
      { provide: AUTH_ENGINE, useValue: new FakeAuthEngine() },
      { provide: MAILER, useValue: new RecordingMailer() },
      { provide: RATE_LIMITER, useValue: new InMemoryRateLimiter() },
    ];
    @Global()
    @Module({ providers: fakes, exports: fakes.map((p) => (p as { provide: symbol }).provide) })
    class FakePortsModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule, FakePortsModule, MembersModule, InvitesModule, TenantAdminModule],
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

  it('Members_Admin_CanList', async () => {
    principal.roles = ['admin'];
    const res = await request(app.getHttpServer()).get('/api/v1/members');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('Members_NoRole_Forbidden403', async () => {
    principal.roles = [];
    const res = await request(app.getHttpServer()).get('/api/v1/members');
    expect(res.status).toBe(403);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
  });

  it('Invites_NonAdmin_CannotCreate403', async () => {
    principal.roles = ['recruiter'];
    const res = await request(app.getHttpServer())
      .post('/api/v1/members/invites')
      .send({ email: 'new@agency.de', roles: ['recruiter'] });
    expect(res.status).toBe(403);
  });

  it('AdminTenants_SuperAdmin_CanList', async () => {
    principal.roles = ['admin'];
    principal.isSuperAdmin = true;
    const res = await request(app.getHttpServer()).get('/api/v1/admin/tenants');
    expect(res.status).toBe(200);
  });

  it('AdminTenants_NonSuperAdmin_Forbidden403', async () => {
    principal.isSuperAdmin = false;
    const res = await request(app.getHttpServer()).get('/api/v1/admin/tenants');
    expect(res.status).toBe(403);
  });
});
