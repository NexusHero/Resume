import type { Role } from '../domain/user';
import type { Authorizer, AuthPrincipal, AuthResource } from '../ports/authorizer';

/**
 * A small, readable RBAC policy table: resource kind → action → roles allowed.
 * `'*'` matches any action on that kind. `admin` is allowed everything, so it
 * never needs listing. This is the hand-rolled stand-in for a policy engine;
 * the shape (principal, resource, action) matches Cerbos/OpenFGA so swapping the
 * adapter later needs no changes at the call sites.
 */
const POLICY: Record<string, Record<string, Role[]>> = {
  // Team administration — only admins manage members and their roles.
  member: { list: ['admin'], setRoles: ['admin'] },
  // DSGVO retention review + anonymize — admin-only (no recruiter rule).
  retention: {},
  // Recruiting work is shared across the team: any recruiter (or admin) may do it.
  mandate: { '*': ['recruiter'] },
  talent: { '*': ['recruiter'] },
  placement: { '*': ['recruiter'] },
  candidacy: { '*': ['recruiter'] },
  document: { '*': ['recruiter'] },
  attachment: { '*': ['recruiter'] },
  settings: { '*': ['recruiter'] },
};

/** Hand-rolled RBAC authorizer driven by the POLICY table above. */
export class RoleAuthorizer implements Authorizer {
  check(principal: AuthPrincipal, resource: AuthResource, action: string): boolean {
    if (principal.roles.includes('admin')) return true;
    const forKind = POLICY[resource.kind];
    if (!forKind) return false;
    const allowed = forKind[action] ?? forKind['*'];
    if (!allowed) return false;
    return principal.roles.some((r) => allowed.includes(r));
  }
}
