import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

/** Open a connection pool and a Drizzle handle for the given Postgres URL. */
export function createDb(databaseUrl: string): { db: Db; pool: Pool } {
  const pool = new Pool({ connectionString: databaseUrl });
  return { db: drizzle(pool, { schema }), pool };
}

/** Create the tables if they do not exist. Idempotent; run on boot. */
export async function migrate(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      roles jsonb NOT NULL DEFAULT '["recruiter"]'::jsonb,
      created_at text NOT NULL
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS roles jsonb NOT NULL DEFAULT '["recruiter"]'::jsonb;
    CREATE TABLE IF NOT EXISTS sessions (
      token text PRIMARY KEY,
      user_id text NOT NULL,
      created_at text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token text PRIMARY KEY,
      user_id text NOT NULL,
      created_at text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens (user_id);
    CREATE TABLE IF NOT EXISTS api_keys (
      owner_id text NOT NULL,
      provider text NOT NULL,
      value text NOT NULL,
      PRIMARY KEY (owner_id, provider)
    );
    CREATE TABLE IF NOT EXISTS applications (
      id text PRIMARY KEY,
      date text NOT NULL,
      company text NOT NULL,
      position text NOT NULL,
      address text NOT NULL,
      reference text NOT NULL,
      status text NOT NULL,
      pdf_path text,
      source text NOT NULL,
      created_at text NOT NULL,
      updated_at text,
      commit text
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      seq serial PRIMARY KEY,
      ts text NOT NULL,
      action text NOT NULL,
      app_id text NOT NULL,
      by text,
      data jsonb,
      changed jsonb,
      commit text
    );
    CREATE TABLE IF NOT EXISTS saved_searches (
      id text PRIMARY KEY,
      name text NOT NULL,
      query jsonb NOT NULL,
      created_at text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mandates (
      id text PRIMARY KEY,
      owner_id text NOT NULL,
      client text NOT NULL,
      role text NOT NULL,
      location text NOT NULL,
      fee text NOT NULL,
      fee_value text NOT NULL,
      deadline text NOT NULL,
      priority text NOT NULL,
      status text NOT NULL,
      submitted integer NOT NULL,
      interviews integer NOT NULL,
      job_text text NOT NULL DEFAULT '',
      created_at text NOT NULL,
      updated_at text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mandates_owner_id_idx ON mandates (owner_id);
    ALTER TABLE mandates ADD COLUMN IF NOT EXISTS job_text text NOT NULL DEFAULT '';
    CREATE TABLE IF NOT EXISTS talents (
      id text PRIMARY KEY,
      owner_id text NOT NULL,
      name text NOT NULL,
      role text NOT NULL,
      headline text NOT NULL,
      location text NOT NULL,
      email text NOT NULL,
      phone text NOT NULL,
      availability text NOT NULL,
      salary text NOT NULL,
      skills jsonb NOT NULL,
      created_at text NOT NULL,
      updated_at text NOT NULL,
      anonymized_at text
    );
    CREATE INDEX IF NOT EXISTS talents_owner_id_idx ON talents (owner_id);
    ALTER TABLE talents ADD COLUMN IF NOT EXISTS anonymized_at text;
    CREATE TABLE IF NOT EXISTS placements (
      id text PRIMARY KEY,
      owner_id text NOT NULL,
      candidate_name text NOT NULL,
      candidate_role text NOT NULL,
      client text NOT NULL,
      start text NOT NULL,
      fee text NOT NULL,
      status text NOT NULL,
      created_at text NOT NULL,
      updated_at text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS placements_owner_id_idx ON placements (owner_id);
    CREATE TABLE IF NOT EXISTS talent_documents (
      owner_id text NOT NULL,
      talent_id text NOT NULL,
      contact jsonb NOT NULL,
      resume jsonb NOT NULL,
      letter jsonb NOT NULL,
      style jsonb NOT NULL,
      updated_at text NOT NULL,
      PRIMARY KEY (owner_id, talent_id)
    );
    CREATE INDEX IF NOT EXISTS talent_documents_owner_id_idx ON talent_documents (owner_id);
    CREATE TABLE IF NOT EXISTS attachments (
      id text PRIMARY KEY,
      owner_id text NOT NULL,
      talent_id text NOT NULL,
      name text NOT NULL,
      content_type text NOT NULL,
      size integer NOT NULL,
      data text NOT NULL,
      created_at text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS attachments_owner_talent_idx ON attachments (owner_id, talent_id);
    CREATE TABLE IF NOT EXISTS candidacies (
      id text PRIMARY KEY,
      owner_id text NOT NULL,
      mandate_id text NOT NULL,
      talent_id text NOT NULL,
      stage text NOT NULL,
      note text NOT NULL,
      "order" integer NOT NULL,
      created_at text NOT NULL,
      updated_at text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS candidacies_owner_mandate_idx ON candidacies (owner_id, mandate_id);
    CREATE INDEX IF NOT EXISTS candidacies_owner_talent_idx ON candidacies (owner_id, talent_id);
    CREATE TABLE IF NOT EXISTS usage_events (
      seq serial PRIMARY KEY,
      owner_id text NOT NULL,
      provider text NOT NULL,
      feature text NOT NULL,
      input_tokens integer NOT NULL,
      output_tokens integer NOT NULL,
      at text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS usage_events_owner_id_idx ON usage_events (owner_id);
  `);
}
