import { MembersService } from '../../src/services/members-service';
import { NotFoundError, ValidationError } from '../../src/domain/errors';
import { InMemoryUserRepository } from '../support/fakes';
import type { User, Role } from '../../src/domain/user';

const user = (id: string, roles: Role[], createdAt: string): User => ({
  id,
  email: `${id}@example.com`,
  passwordHash: 'x',
  roles,
  createdAt,
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
});
