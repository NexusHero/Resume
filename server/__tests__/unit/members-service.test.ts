import { MembersService } from '../../src/services/members-service.js';
import { NotFoundError, ValidationError } from '../../src/domain/errors.js';
import { InMemoryUserRepository } from '../support/fakes.js';
import type { User, Role } from '../../src/domain/user.js';

const user = (id: string, roles: Role[], createdAt: string, tenantId?: string): User => ({
  id,
  email: `${id}@example.com`,
  passwordHash: 'x',
  roles,
  createdAt,
  ...(tenantId ? { tenantId } : {}),
});

function ctx() {
  const repo = new InMemoryUserRepository();
  const service = new MembersService({ userRepository: repo });
  return { service, repo };
}

describe('MembersService', () => {
  it('List_ReturnsPublicViewsOldestFirst', async () => {
    const c = ctx();
    c.repo.users.push(user('u2', ['recruiter'], '2026-02-01T00:00:00.000Z'));
    c.repo.users.push(user('u1', ['admin', 'recruiter'], '2026-01-01T00:00:00.000Z'));
    const list = await c.service.list();
    expect(list.map((m) => m.id)).toEqual(['u1', 'u2']); // sorted by createdAt
    expect(list[0]).not.toHaveProperty('passwordHash');
    expect(list[0]?.roles).toEqual(['admin', 'recruiter']);
  });

  it('SetRoles_UpdatesAndDeduplicates', async () => {
    const c = ctx();
    c.repo.users.push(user('u1', ['admin'], '2026-01-01T00:00:00.000Z'));
    c.repo.users.push(user('u2', ['recruiter'], '2026-01-02T00:00:00.000Z'));
    const updated = await c.service.setRoles('u2', ['recruiter', 'recruiter', 'admin']);
    expect(updated.roles).toEqual(['recruiter', 'admin']);
    expect(c.repo.users.find((u) => u.id === 'u2')?.roles).toEqual(['recruiter', 'admin']);
  });

  it('SetRoles_UnknownMember_Throws404', async () => {
    const c = ctx();
    await expect(c.service.setRoles('missing', ['recruiter'])).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('SetRoles_DemotingLastAdmin_Throws', async () => {
    const c = ctx();
    c.repo.users.push(user('u1', ['admin', 'recruiter'], '2026-01-01T00:00:00.000Z'));
    await expect(c.service.setRoles('u1', ['recruiter'])).rejects.toBeInstanceOf(ValidationError);
    // roles unchanged
    expect(c.repo.users[0]?.roles).toEqual(['admin', 'recruiter']);
  });

  it('SetRoles_DemotingOneOfTwoAdmins_Allowed', async () => {
    const c = ctx();
    c.repo.users.push(user('u1', ['admin'], '2026-01-01T00:00:00.000Z'));
    c.repo.users.push(user('u2', ['admin'], '2026-01-02T00:00:00.000Z'));
    const updated = await c.service.setRoles('u2', ['recruiter']);
    expect(updated.roles).toEqual(['recruiter']);
  });

  describe('tenant isolation (ADR-0033)', () => {
    it('List_OnlyReturnsMembersOfTheGivenTenant', async () => {
      const c = ctx();
      c.repo.users.push(user('a1', ['admin'], '2026-01-01T00:00:00.000Z', 'acme'));
      c.repo.users.push(user('a2', ['recruiter'], '2026-01-02T00:00:00.000Z', 'acme'));
      c.repo.users.push(user('b1', ['admin'], '2026-01-03T00:00:00.000Z', 'globex'));
      const acme = await c.service.list('acme');
      expect(acme.map((m) => m.id)).toEqual(['a1', 'a2']);
      expect((await c.service.list('globex')).map((m) => m.id)).toEqual(['b1']);
    });

    it('List_DefaultScope_ReturnsUsersWithoutAnExplicitTenant', async () => {
      const c = ctx();
      c.repo.users.push(user('u1', ['admin'], '2026-01-01T00:00:00.000Z')); // no tenantId => 'team'
      c.repo.users.push(user('b1', ['admin'], '2026-01-02T00:00:00.000Z', 'globex'));
      expect((await c.service.list()).map((m) => m.id)).toEqual(['u1']);
    });

    it('SetRoles_TargetInAnotherTenant_Throws404', async () => {
      const c = ctx();
      c.repo.users.push(user('a1', ['admin'], '2026-01-01T00:00:00.000Z', 'acme'));
      c.repo.users.push(user('b1', ['recruiter'], '2026-01-02T00:00:00.000Z', 'globex'));
      // An acme admin cannot touch a globex member — it's not even visible.
      await expect(c.service.setRoles('b1', ['admin'], 'acme')).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(c.repo.users.find((u) => u.id === 'b1')?.roles).toEqual(['recruiter']);
    });

    it('SetRoles_LastAdminGuard_IsPerTenant', async () => {
      const c = ctx();
      // acme has a single admin; globex has its own admin. Demoting acme's only
      // admin must fail even though the instance still has another admin elsewhere.
      c.repo.users.push(user('a1', ['admin'], '2026-01-01T00:00:00.000Z', 'acme'));
      c.repo.users.push(user('b1', ['admin'], '2026-01-02T00:00:00.000Z', 'globex'));
      await expect(c.service.setRoles('a1', ['recruiter'], 'acme')).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(c.repo.users.find((u) => u.id === 'a1')?.roles).toEqual(['admin']);
    });
  });
});
