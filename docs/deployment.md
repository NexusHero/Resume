# Deployment

The app is a single Node service that serves the REST API and the static web
UIs. It runs in two storage modes; production uses Postgres.

## Quick start (Docker Compose)

```bash
docker compose up --build
```

This builds the image, starts Postgres, and runs the app on
<http://localhost:4178> with `STORE=sql`. Database tables are created on boot.

## Image only

```bash
docker build -t myjob .
docker run -p 4178:4178 \
  -e STORE=sql \
  -e DATABASE_URL=postgres://user:pass@host:5432/myjob \
  -e CORS_ORIGINS=https://app.example.com \
  -v myjob-archive:/app/archive \
  myjob
```

## Configuration

Resolved from the environment (see `server/src/config.ts`):

| Variable                                                    | Default                                                    | Purpose                                                                                                                              |
| ----------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `PORT`                                                      | `4178`                                                     | HTTP port.                                                                                                                           |
| `STORE`                                                     | `fs`                                                       | `sql` uses Postgres; otherwise JSON files under `archive/`.                                                                          |
| `DATABASE_URL`                                              | —                                                          | Postgres connection string (required when `STORE=sql`).                                                                              |
| `CORS_ORIGINS`                                              | _(empty)_                                                  | Comma-separated browser origins allowed to call the API.                                                                             |
| `COOKIE_SECURE`                                             | _(off)_                                                    | `true` sends the session cookie Secure (HTTPS-only). Auto-on when `NODE_ENV=production`.                                             |
| `SESSION_TTL_DAYS`                                          | `30`                                                       | Server-side session lifetime; older sessions are rejected.                                                                           |
| `LLM_PROVIDER`                                              | `claude`                                                   | Active model provider for cover letters.                                                                                             |
| `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`                      | —                                                          | Provider keys (server-side; never in the client).                                                                                    |
| `EMBEDDING_PROVIDER`                                        | `hashed`                                                   | Matching embeddings: `hashed` (offline default), `ollama` (local neural), or `openai`. Falls back to hashed on any error (ADR-0020). |
| `OLLAMA_URL` / `OLLAMA_EMBED_MODEL`                         | `http://localhost:11434` / `nomic-embed-text`              | Ollama server + embedding model (when `EMBEDDING_PROVIDER=ollama`).                                                                  |
| `OPENAI_API_KEY` / `OPENAI_EMBED_MODEL` / `OPENAI_BASE_URL` | — / `text-embedding-3-small` / `https://api.openai.com/v1` | OpenAI embeddings (when `EMBEDDING_PROVIDER=openai`; without the key it stays hashed).                                               |
| `PLAN`                                                      | `pro`                                                      | Subscription plan: `pro` (default) leaves all AI features open; `free` gates them behind a 402 (ADR-0021).                           |
| `APP_SECRET`                                                | _(dev)_                                                    | Secret that encrypts stored secrets (per-user API keys) at rest. **Set in production.**                                              |
| `MAIL_TRANSPORT`                                            | `console`                                                  | `smtp` sends real email via nodemailer; otherwise the dev console transport logs it.                                                 |
| `MAIL_FROM`                                                 | `myJob …`                                                  | From address on outgoing mail.                                                                                                       |
| `APP_BASE_URL`                                              | `http://localhost:$PORT`                                   | Public origin used to build links in emails (e.g. the password-reset link).                                                          |
| `RESET_TOKEN_TTL_MINUTES`                                   | `60`                                                       | Lifetime of a password-reset token.                                                                                                  |
| `SMTP_HOST` / `SMTP_PORT`                                   | — / `587`                                                  | SMTP relay (used when `MAIL_TRANSPORT=smtp`). `SMTP_SECURE=true` or port 465 for TLS.                                                |
| `SMTP_USER` / `SMTP_PASS`                                   | —                                                          | SMTP credentials (omit for an open relay on a trusted network).                                                                      |
| `MAIL_IMAP_HOST`                                            | —                                                          | IMAP mailbox for outreach reply detection; unset disables reply sync entirely.                                                       |
| `MAIL_IMAP_PORT` / `MAIL_IMAP_SECURE`                       | `993` / `true`                                             | IMAP connection; `MAIL_IMAP_SECURE=false` opts out of implicit TLS.                                                                  |
| `MAIL_IMAP_USER` / `MAIL_IMAP_PASS`                         | —                                                          | IMAP credentials.                                                                                                                    |
| `MAIL_IMAP_POLL_MINUTES`                                    | `15`                                                       | How often the server polls the inbox for replies.                                                                                    |

## Production readiness

When `NODE_ENV=production`, the server runs a **fail-fast readiness check** at
boot (`server/src/config-validation.ts`, ADR-0029) and **refuses to start** if
the configuration is unsafe. Fix these before deploying:

| Must set (boot fails otherwise) | Why                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `STORE=sql` + `DATABASE_URL`    | The filesystem store is single-instance and lost on redeploy — Postgres is mandatory to scale or persist. |
| `APP_SECRET`                    | Encrypts stored per-user LLM API keys at rest; the dev default is public.                                 |

The check also **warns** (without blocking) when `MAIL_TRANSPORT` is not `smtp`
(reset/verification links only log) or `APP_BASE_URL` still points at
`localhost` (email links won't resolve).

Recommended production checklist:

1. `STORE=sql`, a managed Postgres `DATABASE_URL`, and a volume for `/app/archive`
   (the PDF archive is still file-backed — see Notes).
2. A strong `APP_SECRET` (keep it stable — rotating it invalidates stored keys).
3. `MAIL_TRANSPORT=smtp` with `SMTP_*` and an `APP_BASE_URL` on the public origin.
4. TLS terminated at the proxy; `NODE_ENV=production` (auto-enables Secure cookies).
5. `CORS_ORIGINS` set only if the browser app is served from a different origin.

### Running more than one instance

With Postgres (required in production) the app tier is stateless and
**horizontally scalable — run as many instances as you like**. The three
periodic jobs (assistant playbook, IMAP reply sync, retention sweep) are guarded
by a Postgres advisory-lock leader election (ADR-0030), so each fires once per
interval cluster-wide, not once per instance. No dedicated worker or external
scheduler is needed. With the filesystem store the no-op lock applies (a single
instance is always the leader). PDF rendering (Puppeteer) and the object-storage
move for the archive are the remaining scale follow-ups (roadmap D2/D4).

## Notes

- **Persistence:** with `STORE=sql`, everything (recruiting records,
  applications, audit events, saved searches, users, sessions, password-reset
  tokens and the encrypted per-user API keys) lives in Postgres. Only the PDF
  archive is file-backed under `/app/archive` — mount a volume so it survives a
  redeploy. With the default file store, mount a volume for the whole
  `/app/archive` directory.
- **Email / password reset:** the password-reset flow emails a one-time link.
  In production set `MAIL_TRANSPORT=smtp` with the `SMTP_*` variables (any relay
  works — e.g. an EU provider such as Brevo, Mailjet or SES-Frankfurt) and an
  `APP_BASE_URL` matching the public origin so the link resolves. Without it the
  console transport just logs the email (handy for local/dev).
- **Outreach email + reply detection:** drafted outreach can be sent straight
  from the app (same transport as above). Point `MAIL_IMAP_*` at the desk's
  mailbox and the server polls it, stamping pending email outreach as `replied`
  in the outcome loop when the talent writes back — only envelopes (sender,
  date, subject) are read, message bodies never enter the application
  (ADR-0015).
- **TLS / cookies:** terminate TLS at a reverse proxy and serve the app over
  HTTPS. The `httpOnly` session cookie is sent `Secure` automatically in
  production (`NODE_ENV=production`) or with `COOKIE_SECURE=true`. Server-side
  sessions expire after `SESSION_TTL_DAYS`.
- **Migrations:** `migrate()` runs idempotent `CREATE TABLE IF NOT EXISTS`
  statements on boot. A versioned migration tool is a follow-up for schema
  evolution.
