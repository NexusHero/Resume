# ADR-0003 — File-backed store by default, Postgres via `STORE=sql`

- **Status:** Accepted
- **Requirements:** NFR-04, NFR-10

## Context

The suite must run locally with zero external services (offline, CI, a quick demo), yet
support a real relational database for a hosted deployment.

## Decision

Keep every repository behind a **port**. Ship two adapter families:

- **File-backed JSON** (default) — no dependencies, the offline path.
- **Postgres via Drizzle** (`STORE=sql`) — an idempotent `migrate()` runs on boot; pure
  row↔domain mappers are unit-tested.

A `persistence-factory` selects the family from the `STORE` env var. When `STORE=sql`
the git `Versioner` is a no-op (no JSON files to commit).

## Consequences

- App, CI and offline development stay Docker-free by default.
- The thin DB glue is exercised by a **`DATABASE_URL`-gated integration test**, skipped
  when no database is present — so the default `jest` run stays fast and DB-free.
- **A new persisted field must be added to the SQL schema _and_ to the integration-test
  fixtures**, or the gated round-trip suite fails on deep-equality. New columns are easy
  to forget because the default test run does not touch SQL.
