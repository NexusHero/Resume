import type { Role } from '../domain/user';

/** The acting user, as far as authorization cares: an id and a set of roles. */
export interface AuthPrincipal {
  id: string;
  roles: Role[];
}

/** The thing being acted on: a kind (e.g. 'mandate', 'member') plus attributes. */
export interface AuthResource {
  kind: string;
  attr?: Record<string, unknown>;
}

/**
 * Decides whether a principal may perform an action on a resource. Deliberately
 * resource/action-shaped (not just role checks) so the hand-rolled adapter can
 * later be swapped for a policy engine (Cerbos, OpenFGA) without touching the
 * call sites.
 */
export interface Authorizer {
  check(principal: AuthPrincipal, resource: AuthResource, action: string): boolean;
}
