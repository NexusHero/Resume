/**
 * Subscription plans (ADR-0021). The product splits into two tiers:
 * - `free` — the ATS craft: mandates, talent pool, pipeline, placements,
 *   reports, offline matching, the deterministic assistant modes.
 * - `pro` — everything generative (LLM-backed): document assist, CV parsing,
 *   ATS scoring, pitch, outreach, cover letters, translation, match
 *   explanations, interview kits, candidate prep, and the autopilot gear.
 *
 * Enforcement lives at ONE seam — the `requirePlan` HTTP middleware — driven by
 * a `PlanProvider`. No feature code ever branches on the plan. Which routes are
 * Pro is expressed once, declaratively, in the router.
 */
export const PLANS = ['free', 'pro'] as const;
export type Plan = (typeof PLANS)[number];

/** Does the held plan satisfy the required one? `pro` is a superset of `free`. */
export function planSatisfies(held: Plan, required: Plan): boolean {
  return required === 'free' || held === 'pro';
}
