import type { RequestHandler } from 'express';
import { ForbiddenError } from '../domain/errors.js';
import type { Authorizer } from '../ports/authorizer.js';
import { currentPrincipal } from './current-user.js';

/**
 * The single role/permission-enforcement seam, dropped in front of a route just
 * like `requireAuth` and `requirePlan`. `requireCan('member', 'setRoles')` runs
 * the RBAC {@link Authorizer} at the route edge and refuses (403) a principal
 * that may not act — so admin-only routes are declared once, declaratively, in
 * the router, instead of each controller re-checking by hand at the top of every
 * handler. The (principal, resource, action) shape is unchanged, so the policy
 * still lives in one table and can move to a policy engine later untouched.
 */
export function makeRequireCan(authorizer: Authorizer) {
  return (kind: string, action: string): RequestHandler =>
    (req, _res, next) => {
      if (!authorizer.check(currentPrincipal(req), { kind }, action)) {
        throw new ForbiddenError();
      }
      next();
    };
}
