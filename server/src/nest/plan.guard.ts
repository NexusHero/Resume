import {
  Inject,
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { type Plan, planSatisfies } from '../domain/plan.js';
import { PlanRequiredError } from '../domain/errors.js';
import type { PlanProvider } from '../ports/plan-provider.js';
import { currentScope } from '../http/current-user.js';
import { PLAN_PROVIDER } from './tokens.js';

const PLAN_KEY = 'plan:required';

interface PlanRequirement {
  plan: Plan;
  /** Gates only some requests to a shared route (e.g. switching to autopilot). */
  when?: (req: Request) => boolean;
}

/**
 * The single plan-enforcement seam (ADR-0021), as a Nest guard. `@RequiresPlan('pro')`
 * on a route replaces the Express `requirePlan('pro')` middleware: the set of Pro
 * routes stays declarative at the HTTP edge and no feature ever branches on the
 * plan. Routes without the decorator pass through untouched; the optional `when`
 * predicate ports `requirePlan('pro', when)` for conditionally-gated routes.
 */
export const RequiresPlan = (plan: Plan, when?: (req: Request) => boolean) =>
  SetMetadata(PLAN_KEY, { plan, when } satisfies PlanRequirement);

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(PLAN_PROVIDER) private readonly planProvider: PlanProvider,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PlanRequirement | undefined>(PLAN_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required) return true;
    const req = ctx.switchToHttp().getRequest<Request>();
    if (required.when && !required.when(req)) return true;
    const held = await this.planProvider.planFor(currentScope(req));
    if (!planSatisfies(held, required.plan)) throw new PlanRequiredError(required.plan);
    return true;
  }
}
