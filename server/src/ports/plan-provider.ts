import type { Plan } from '../domain/plan.js';

/**
 * Resolves the subscription plan for a scope (team). The port exists so the
 * *source* of the plan can change — an env/config default now, a signed offline
 * license or a billing backend later (ADR-0021) — without touching the
 * enforcement seam (`requirePlan`). Resolution must be cheap/local: the guard
 * runs on every gated request, so no per-request network call.
 */
export interface PlanProvider {
  planFor(scope: string): Promise<Plan>;
}
