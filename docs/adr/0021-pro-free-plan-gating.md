# ADR-0021 — Pro/Free plan gating at one HTTP seam

- **Status:** Accepted (foundation; license mechanism deferred)
- **Relates to:** ADR-0004 (auth/RBAC), ADR-0002 (DI), ADR-0005 (deterministic fallback)

## Context

The product splits into two tiers: **Free** (the ATS craft — mandates, talent
pool, pipeline, placements, reports, offline matching, the deterministic
assistant modes) and **Pro** (everything generative/LLM-backed — document
assist, CV parsing, ATS scoring, pitch, outreach, cover letters, translation,
match explanations, interview kits, candidate prep, AGG rewrite, and the
autopilot gear).

The hard requirement: **no `if (isPro)` scattered through the code.** Enforcement
must be centralized, and the _source_ of the plan must be swappable — an
env/config default now, a signed offline license or a billing backend later —
without a per-request network call (latency) and without touching feature code.

## Decision

- **One enforcement seam: the `requirePlan` HTTP middleware.** Dropped in front
  of a route exactly like `requireAuth`, so the set of Pro routes is expressed
  once, declaratively, in the router (`create-app.ts`). No service or domain code
  ever branches on the plan. An optional predicate gates only some requests to a
  shared route — used so switching the assistant to the token-spending
  `autopilot` mode is Pro while its Free `suggest`/`act` modes stay open.
- **The plan comes from a `PlanProvider` port.** The default `EnvPlanProvider`
  returns one instance-wide plan from config (`PLAN`), **defaulting to `pro`** so
  nothing is gated until enforcement is deliberately turned on (`PLAN=free`).
  Resolution is local — zero latency, no network — as the guard runs on every
  gated request.
- **Failure is an RFC-9457 problem+json** with a dedicated `plan-required` type
  and **402 Payment Required**, so the client can render an "upgrade" affordance
  rather than a generic error. The plan is echoed in `GET /auth/me` for the UI.

## Consequences

- The Free/Pro boundary is now a single, reviewable list (the `requirePro`
  wrappers). Adding a Pro feature = wrap its route; the "what is Pro" decision
  lives in one file.
- **The license/billing mechanism is deliberately out of scope here.** When a
  method is chosen (see the licensing discussion — a signed offline license key
  for self-host à la GitLab, or a billing-webhook-set flag for SaaS), it becomes
  a new `PlanProvider` adapter behind the same port; the enforcement seam and all
  the route markings are unchanged. This is the "prepare so we can build on it"
  step, not the full build.
- Default `pro` means the gate is dormant in production today — zero behaviour
  change — but fully wired and tested (unit + acceptance with `PLAN=free`), so
  turning it on is a config flip plus a real `PlanProvider`.
- Instance-wide plan matches today's single-team scope (`currentScope` is
  constant); a per-team/-org plan later is a change inside the `PlanProvider`, not
  the seam.
