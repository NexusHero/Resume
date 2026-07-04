# Deployment blueprint

A prescriptive reference architecture for running myJob in production — the
opinionated companion to [`deployment.md`](deployment.md) (which is the full
variable-by-variable reference). It pulls the D-series scaling decisions
(ADR-0029–0035) into one shape you can copy.

The design goal: the **app tier is stateless and horizontally scalable**, and
everything stateful lives in managed backing services.

## Topology

```
                         ┌──────────────────────────┐
   Browser / PWA  ──TLS──▶  Reverse proxy / LB       │  terminates TLS,
   External API caller     │  (nginx, Caddy, ELB…)    │  fans out round-robin
                         └────────────┬─────────────┘
                                      │ HTTP :4178
                ┌─────────────────────┼─────────────────────┐
                ▼                     ▼                     ▼
         ┌────────────┐        ┌────────────┐        ┌────────────┐
         │  app inst. │        │  app inst. │   …    │  app inst. │  stateless
         │  (Node)    │        │  (Node)    │        │  (Node)    │  Chromium pool
         └─────┬──────┘        └─────┬──────┘        └─────┬──────┘  bounded per inst.
               └──────────────┬──────┴───────────────┬─────┘
                              ▼                       ▼
                     ┌─────────────────┐    ┌──────────────────────┐
                     │  Postgres        │    │  S3-compatible bucket │
                     │  (all app data,  │    │  (PDF archive,        │
                     │   sessions,      │    │   ADR-0031)           │
                     │   leader lock)   │    └──────────────────────┘
                     └─────────────────┘
                              ▲                       ▲
                     ┌────────┴────────┐     ┌────────┴────────┐
                     │  SMTP relay     │     │  IMAP mailbox   │  (optional:
                     │  (mail out)     │     │  (reply sync)   │   outreach loop)
                     └─────────────────┘     └─────────────────┘
```

Why this shape:

- **Postgres is mandatory** (`STORE=sql`): the filesystem store is single-instance
  and lost on redeploy, so boot **fails fast** without it in production (ADR-0029).
- **Any number of app instances.** The three periodic jobs (assistant playbook,
  IMAP reply sync, retention sweep) run under a **Postgres advisory-lock leader
  election** (ADR-0030), so each fires once per interval cluster-wide — no
  dedicated worker, no external scheduler.
- **Shared PDF archive** via `PDF_ARCHIVE=s3` (ADR-0031) so instances don't each
  keep a private copy; PDF rendering reuses one Chromium per instance with a
  **bounded page pool** (`PDF_RENDER_CONCURRENCY`, ADR-0032) so an export burst
  can't OOM an instance.
- **Multi-tenant ready** (ADR-0033–0035): data, member management and onboarding
  are all scoped per tenant; a single deployment can host many recruiting desks,
  and every install defaults to one implicit `team` tenant with no config.

## Minimum production environment

The smallest safe set — boot **refuses to start** without the first two
(ADR-0029). See [`deployment.md`](deployment.md) for every variable.

```bash
NODE_ENV=production                       # auto-enables Secure cookies
STORE=sql
DATABASE_URL=postgres://user:pass@db:5432/myjob
APP_SECRET=<long, stable, secret>         # encrypts stored per-user API keys

# Shared PDF archive (drop for a single-instance volume-backed deploy)
PDF_ARCHIVE=s3
S3_BUCKET=myjob-pdf
S3_REGION=eu-central-1
# S3_ENDPOINT=…                           # for R2 / Hetzner / MinIO
# S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY # omit to use the SDK default chain

# Mail (needed for password reset, email verification, invitations)
MAIL_TRANSPORT=smtp
SMTP_HOST=smtp.eu-provider.example
SMTP_USER=…
SMTP_PASS=…
APP_BASE_URL=https://app.example.com      # so emailed links resolve

# Only if the browser app is served from a different origin
# CORS_ORIGINS=https://app.example.com

# Per-instance tuning
PDF_RENDER_CONCURRENCY=2                   # size to the instance, scale out for throughput
```

## Go-live checklist

1. **Postgres** provisioned; `DATABASE_URL` set; tables are created on boot
   (`migrate()` runs idempotent `CREATE TABLE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS`).
2. **`APP_SECRET`** set to a strong value and **kept stable** — rotating it
   invalidates every stored per-user API key.
3. **Object storage** (`PDF_ARCHIVE=s3`) for a multi-instance deploy, _or_ a
   mounted volume at `/app/archive` for a single instance.
4. **Mail**: `MAIL_TRANSPORT=smtp` with `SMTP_*` and a public `APP_BASE_URL`, so
   reset / verification / invitation links resolve. Without it the console
   transport only logs them.
5. **TLS** terminated at the proxy; `NODE_ENV=production` (Secure cookies auto-on).
6. **Scale**: run N app instances behind the LB — no extra config; the leader
   lock keeps scheduled jobs single-fire. Size `PDF_RENDER_CONCURRENCY` per
   instance.
7. _(Optional)_ **Reply sync**: point `MAIL_IMAP_*` at the desk mailbox to close
   the outreach outcome loop (envelopes only, never message bodies — ADR-0015).

## What is _not_ needed

- **No separate worker/cron process** — the leader lock (ADR-0030) runs the
  periodic jobs inside the normal app instances.
- **No sticky sessions** — sessions live in Postgres, so any instance serves any
  request.
- **No Chromium install step** in the image beyond Puppeteer's own; rendering is
  in-process and bounded.

## Related decisions

ADR-0029 (readiness gate) · 0030 (leader election) · 0031 (S3 archive) ·
0032 (bounded render pool) · 0033–0035 (multi-tenant scope, member management,
invitation onboarding). Full log in [`adr/`](adr).
