import { RoleAuthorizer } from '../../src/adapters/role-authorizer.js';
import type { AuthPrincipal } from '../../src/ports/authorizer.js';

const authz = new RoleAuthorizer();
const admin: AuthPrincipal = { id: 'a', roles: ['admin', 'recruiter'] };
const recruiter: AuthPrincipal = { id: 'r', roles: ['recruiter'] };
const nobody: AuthPrincipal = { id: 'n', roles: [] };

describe('RoleAuthorizer', () => {
  it('Admin_MayDoEverything', () => {
    expect(authz.check(admin, { kind: 'member' }, 'setRoles')).toBe(true);
    expect(authz.check(admin, { kind: 'mandate' }, 'delete')).toBe(true);
    expect(authz.check(admin, { kind: 'anything' }, 'weird')).toBe(true);
  });

  it('Recruiter_MayDoRecruitingWork', () => {
    expect(authz.check(recruiter, { kind: 'mandate' }, 'update')).toBe(true);
    expect(authz.check(recruiter, { kind: 'talent' }, 'create')).toBe(true);
    expect(authz.check(recruiter, { kind: 'candidacy' }, 'delete')).toBe(true);
    expect(authz.check(recruiter, { kind: 'settings' }, 'update')).toBe(true);
  });

  it('Recruiter_MayNotManageMembers', () => {
    expect(authz.check(recruiter, { kind: 'member' }, 'list')).toBe(false);
    expect(authz.check(recruiter, { kind: 'member' }, 'setRoles')).toBe(false);
  });

  it('UnknownKind_IsDenied', () => {
    expect(authz.check(recruiter, { kind: 'billing' }, 'read')).toBe(false);
  });

  it('KnownKind_UnlistedActionWithoutWildcard_IsDenied', () => {
    // 'member' has explicit actions but no '*', so an unlisted action is denied.
    expect(authz.check(recruiter, { kind: 'member' }, 'whatever')).toBe(false);
  });

  it('NoRoles_IsDeniedEverywhere', () => {
    expect(authz.check(nobody, { kind: 'mandate' }, 'read')).toBe(false);
    expect(authz.check(nobody, { kind: 'member' }, 'list')).toBe(false);
  });
});
