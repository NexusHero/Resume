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

| Variable                               | Default   | Purpose                                                                                  |
| -------------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| `PORT`                                 | `4178`    | HTTP port.                                                                               |
| `STORE`                                | `fs`      | `sql` uses Postgres; otherwise JSON files under `archive/`.                              |
| `DATABASE_URL`                         | —         | Postgres connection string (required when `STORE=sql`).                                  |
| `CORS_ORIGINS`                         | _(empty)_ | Comma-separated browser origins allowed to call the API.                                 |
| `COOKIE_SECURE`                        | _(off)_   | `true` sends the session cookie Secure (HTTPS-only). Auto-on when `NODE_ENV=production`. |
| `SESSION_TTL_DAYS`                     | `30`      | Server-side session lifetime; older sessions are rejected.                               |
| `LLM_PROVIDER`                         | `claude`  | Active model provider for cover letters.                                                 |
| `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | —         | Provider keys (server-side; never in the client).                                        |

## Notes

- **Persistence:** with `STORE=sql`, recruiting records, applications, audit
  events and saved searches live in Postgres. The user/session store and the PDF
  archive are file-backed under `/app/archive` — mount a volume so they survive a
  redeploy. (A SQL-backed user/session store is a tracked follow-up.)
- **TLS / cookies:** terminate TLS at a reverse proxy and serve the app over
  HTTPS. The `httpOnly` session cookie is sent `Secure` automatically in
  production (`NODE_ENV=production`) or with `COOKIE_SECURE=true`. Server-side
  sessions expire after `SESSION_TTL_DAYS`.
- **Migrations:** `migrate()` runs idempotent `CREATE TABLE IF NOT EXISTS`
  statements on boot. A versioned migration tool is a follow-up for schema
  evolution.
