import { TenantService } from '../../src/services/tenant-service.js';
import { InMemoryTenantRepository, InMemoryUserRepository } from '../support/fakes.js';
import type { User, Role } from '../../src/domain/user.js';
import type { Tenant } from '../../src/domain/tenant.js';

const user = (id: string, tenantId?: string, roles: Role[] = ['recruiter']): User => ({
  id,
  email: `${id}@example.com`,
  passwordHash: 'x',
  roles,
  createdAt: '2026-06-25T10:00:00.000Z',
  ...(tenantId ? { tenantId } : {}),
});

const tenant = (id: string, createdAt: string): Tenant => ({
  id,
  name: `${id} workspace`,
  createdAt,
  status: 'active',
});

function ctx() {
  const tenants = new InMemoryTenantRepository();
  const users = new InMemoryUserRepository();
  return {
    service: new TenantService({ tenantRepository: tenants, userRepository: users }),
    tenants,
    users,
  };
}

describe('TenantService.list (ADR-0037)', () => {
  it('AnnotatesRegistryTenantsWithMemberCounts', async () => {
    const c = ctx();
    c.tenants.tenants.push(tenant('acme', '2026-06-20T00:00:00.000Z'));
    c.tenants.tenants.push(tenant('globex', '2026-06-21T00:00:00.000Z'));
    c.users.users.push(user('a1', 'acme'), user('a2', 'acme'), user('b1', 'globex'));
    const list = await c.service.list();
    const byId = Object.fromEntries(list.map((t) => [t.id, t.memberCount]));
    expect(byId).toEqual({ acme: 2, globex: 1 });
  });

  it('SynthesisesTheImplicitDefaultTeamWhenItHasMembers', async () => {
    const c = ctx();
    c.tenants.tenants.push(tenant('acme', '2026-06-20T00:00:00.000Z'));
    // Two users without an explicit tenant → the default 'team'.
    c.users.users.push(user('u1'), user('u2'), user('a1', 'acme'));
    const list = await c.service.list();
    expect(list[0]).toMatchObject({ id: 'team', name: 'Default team', memberCount: 2 });
    expect(list.find((t) => t.id === 'acme')?.memberCount).toBe(1);
  });

  it('OmitsTheDefaultTeamWhenEmpty', async () => {
    const c = ctx();
    c.tenants.tenants.push(tenant('acme', '2026-06-20T00:00:00.000Z'));
    c.users.users.push(user('a1', 'acme')); // nobody in the default team
    const list = await c.service.list();
    expect(list.some((t) => t.id === 'team')).toBe(false);
  });

  it('DoesNotDuplicateDefaultTeam_WhenItIsARegisteredTenant', async () => {
    const c = ctx();
    // An explicit 'team' tenant in the registry must not be synthesised again.
    c.tenants.tenants.push(tenant('team', '2026-06-19T00:00:00.000Z'));
    c.users.users.push(user('u1'), user('u2')); // default 'team' members
    const list = await c.service.list();
    expect(list.filter((t) => t.id === 'team')).toHaveLength(1);
    expect(list.find((t) => t.id === 'team')?.memberCount).toBe(2);
  });

  it('EmptyEverywhere_ReturnsEmpty', async () => {
    const c = ctx();
    expect(await c.service.list()).toEqual([]);
  });
});

describe('TenantService.setStatus (ADR-0038)', () => {
  it('SuspendsAndReactivatesAnExistingTenant', async () => {
    const c = ctx();
    c.tenants.tenants.push(tenant('acme', '2026-06-20T00:00:00.000Z'));
    expect((await c.service.setStatus('acme', 'suspended')).status).toBe('suspended');
    expect(c.tenants.tenants[0]?.status).toBe('suspended');
    expect((await c.service.setStatus('acme', 'active')).status).toBe('active');
  });

  it('NoOpWhenStatusUnchanged', async () => {
    const c = ctx();
    c.tenants.tenants.push(tenant('acme', '2026-06-20T00:00:00.000Z')); // already active
    expect((await c.service.setStatus('acme', 'active')).status).toBe('active');
  });

  it('UnknownTenant_Throws404', async () => {
    const c = ctx();
    const { NotFoundError } = await import('../../src/domain/errors.js');
    await expect(c.service.setStatus('ghost', 'suspended')).rejects.toBeInstanceOf(NotFoundError);
  });
});
