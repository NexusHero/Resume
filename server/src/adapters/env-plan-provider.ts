import type { Plan } from '../domain/plan.js';
import type { PlanProvider } from '../ports/plan-provider.js';

/**
 * The default plan source (ADR-0021): a single instance-wide plan from config
 * (`PLAN`), defaulting to `pro` so nothing is gated until enforcement is turned
 * on. Zero latency, no network. Later a license-verifying or billing-backed
 * adapter replaces this behind the same port without touching call sites.
 */
export class EnvPlanProvider implements PlanProvider {
  constructor(private readonly plan: Plan) {}

  async planFor(): Promise<Plan> {
    return this.plan;
  }
}
