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

| Variable                               | Default                  | Purpose                                                                                  |
| -------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------- |
| `PORT`                                 | `4178`                   | HTTP port.                                                                               |
| `STORE`                                | `fs`                     | `sql` uses Postgres; otherwise JSON files under `archive/`.                              |
| `DATABASE_URL`                         | —                        | Postgres connection string (required when `STORE=sql`).                                  |
| `CORS_ORIGINS`                         | _(empty)_                | Comma-separated browser origins allowed to call the API.                                 |
| `COOKIE_SECURE`                        | _(off)_                  | `true` sends the session cookie Secure (HTTPS-only). Auto-on when `NODE_ENV=production`. |
| `SESSION_TTL_DAYS`                     | `30`                     | Server-side session lifetime; older sessions are rejected.                               |
| `LLM_PROVIDER`                         | `claude`                 | Active model provider for cover letters.                                                 |
| `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | —                        | Provider keys (server-side; never in the client).                                        |
| `APP_SECRET`                           | _(dev)_                  | Secret that encrypts stored secrets (per-user API keys) at rest. **Set in production.**  |
| `MAIL_TRANSPORT`                       | `console`                | `smtp` sends real email via nodemailer; otherwise the dev console transport logs it.     |
| `MAIL_FROM`                            | `myJob …`                | From address on outgoing mail.                                                           |
| `APP_BASE_URL`                         | `http://localhost:$PORT` | Public origin used to build links in emails (e.g. the password-reset link).              |
| `RESET_TOKEN_TTL_MINUTES`              | `60`                     | Lifetime of a password-reset token.                                                      |
| `SMTP_HOST` / `SMTP_PORT`              | — / `587`                | SMTP relay (used when `MAIL_TRANSPORT=smtp`). `SMTP_SECURE=true` or port 465 for TLS.    |
| `SMTP_USER` / `SMTP_PASS`              | —                        | SMTP credentials (omit for an open relay on a trusted network).                          |

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
- **TLS / cookies:** terminate TLS at a reverse proxy and serve the app over
  HTTPS. The `httpOnly` session cookie is sent `Secure` automatically in
  production (`NODE_ENV=production`) or with `COOKIE_SECURE=true`. Server-side
  sessions expire after `SESSION_TTL_DAYS`.
- **Migrations:** `migrate()` runs idempotent `CREATE TABLE IF NOT EXISTS`
  statements on boot. A versioned migration tool is a follow-up for schema
  evolution.
