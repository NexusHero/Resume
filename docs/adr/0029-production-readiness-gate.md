# ADR-0029 — Fail-fast production readiness gate

- **Status:** Accepted (D-series, slice 1)
- **Relates to:** ADR-0003 (fs default / Postgres via `STORE=sql`), ADR-0004 (auth/secrets)

## Context

The deployment runbook documents what production needs — `STORE=sql`, a real
`APP_SECRET`, a public `APP_BASE_URL` — but nothing enforced it. The defaults are
deliberately dev-friendly: the store falls back to JSON files under `archive/`,
and `APP_SECRET` falls back to a **public** constant that encrypts stored
per-user LLM API keys. A production deploy that forgot to set them would boot
happily and silently: single-instance, data lost on redeploy, and stored secrets
"encrypted" with a key anyone can read. That is a footgun, not a feature.

## Decision

Add a **boot-time readiness gate** that fails fast in production.

- A pure function, `checkProductionReadiness(config): { errors, warnings }`
  (`config-validation.ts`), evaluates the invariants against the resolved config.
  It reads no environment and no `NODE_ENV` — trivially unit-tested.
- **Errors** (block the boot): the insecure dev encryption secret; the filesystem
  store (`STORE` ≠ `sql`); `STORE=sql` without a `DATABASE_URL`.
- **Warnings** (logged, non-blocking): console mail transport (reset/verification
  links only log); an `APP_BASE_URL` still on `localhost`.
- `index.ts` runs the check **only when `NODE_ENV=production`**, before touching
  the database, printing warnings and — on any error — the list plus a refusal
  and `process.exit(1)`. Diagnostics go to the console because the logger lives in
  the DI container, which is not built yet at that point.
- The dev secret is named once (`DEV_ENCRYPTION_SECRET` in `config.ts`) and shared
  between the fallback and the check, so they can't drift.

## Consequences

- A misconfigured production deploy stops at boot with an actionable message
  instead of running in an unsafe or lossy state. Dev and CI are unaffected —
  the gate is inert unless `NODE_ENV=production`.
- This encodes the **Postgres-mandatory** posture (roadmap D1): with `STORE=sql`
  enforced, app instances are stateless and horizontally scalable — the one
  exception being the in-process assistant scheduler, which still needs a leader
  lock before running many instances (roadmap D3, called out in the runbook).
- The gate is a config check, not infrastructure: object storage for the PDF
  archive (D2), a Puppeteer render pool (D4) and scheduler leader election (D3)
  remain separate follow-ups. It is the cheapest, highest-leverage first step —
  it turns "documented" requirements into "enforced" ones.
