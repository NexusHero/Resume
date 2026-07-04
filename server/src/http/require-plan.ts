import type { Request, RequestHandler } from 'express';
import { type Plan, planSatisfies } from '../domain/plan.js';
import { PlanRequiredError } from '../domain/errors.js';
import type { PlanProvider } from '../ports/plan-provider.js';
import { asyncHandler } from './async-handler.js';
import { currentScope } from './current-user.js';

/**
 * The single plan-enforcement seam (ADR-0021). `requirePlan('pro')` is dropped
 * in front of a route exactly like `requireAuth`; the set of Pro routes is thus
 * expressed once, declaratively, in the router — no feature ever branches on the
 * plan. An optional `when` predicate gates only some requests to a shared route
 * (e.g. only when the assistant is switched to the autopilot mode).
 */
export function makeRequirePlan(planProvider: PlanProvider) {
  return (required: Plan, when?: (req: Request) => boolean): RequestHandler =>
    asyncHandler(async (req, _res, next) => {
      if (when && !when(req)) return next();
      const held = await planProvider.planFor(currentScope(req));
      if (!planSatisfies(held, required)) throw new PlanRequiredError(required);
      next();
    });
}
