import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

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
    ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS llm_provider text;
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token text PRIMARY KEY,
      user_id text NOT NULL,
      created_at text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens (user_id);
    CREATE TABLE IF NOT EXISTS tenants (
      id text PRIMARY KEY,
      name text NOT NULL,
      created_at text NOT NULL,
      status text NOT NULL DEFAULT 'active'
    );
    CREATE TABLE IF NOT EXISTS tenant_invites (
      token text PRIMARY KEY,
      email text NOT NULL,
      tenant_id text NOT NULL,
      roles jsonb NOT NULL,
      invited_by text NOT NULL,
      created_at text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tenant_invites_tenant_id_idx ON tenant_invites (tenant_id);
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      token text PRIMARY KEY,
      user_id text NOT NULL,
      created_at text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS email_verification_tokens_user_id_idx ON email_verification_tokens (user_id);
    CREATE TABLE IF NOT EXISTS api_keys (
      owner_id text NOT NULL,
      provider text NOT NULL,
      value text NOT NULL,
      PRIMARY KEY (owner_id, provider)
    );
    CREATE TABLE IF NOT EXISTS applications (
      id text PRIMARY KEY,
      owner_id text NOT NULL,
      date text NOT NULL,
      company text NOT NULL,
      position text NOT NULL,
      address text NOT NULL,
      reference text NOT NULL,
      status text NOT NULL,
      pdf_path text,
      source text NOT NULL,
      talent_id text,
      talent_name text,
      created_at text NOT NULL,
      updated_at text,
      commit text
    );
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS talent_id text;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS talent_name text;
    -- Additive owner scope for pre-existing rows: backfill to the default team,
    -- then every read filters by owner_id (ADR-0010/0033).
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS owner_id text NOT NULL DEFAULT 'team';
    CREATE INDEX IF NOT EXISTS applications_owner_id_idx ON applications (owner_id);
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
      lang text NOT NULL DEFAULT 'en',
      created_at text NOT NULL,
      updated_at text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mandates_owner_id_idx ON mandates (owner_id);
    ALTER TABLE mandates ADD COLUMN IF NOT EXISTS job_text text NOT NULL DEFAULT '';
    ALTER TABLE mandates ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'en';
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
      translations jsonb,
      updated_at text NOT NULL,
      PRIMARY KEY (owner_id, talent_id)
    );
    CREATE INDEX IF NOT EXISTS talent_documents_owner_id_idx ON talent_documents (owner_id);
    ALTER TABLE talent_documents ADD COLUMN IF NOT EXISTS translations jsonb;
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
    CREATE TABLE IF NOT EXISTS interview_observations (
      id text PRIMARY KEY,
      owner_id text NOT NULL,
      company_key text NOT NULL,
      company text NOT NULL,
      mandate_id text NOT NULL,
      talent_id text NOT NULL,
      rounds integer NOT NULL,
      formats jsonb NOT NULL,
      difficulty text NOT NULL,
      notes text NOT NULL,
      at text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS interview_observations_company_idx ON interview_observations (owner_id, company_key);
    CREATE TABLE IF NOT EXISTS assistant_settings (
      owner_id text PRIMARY KEY,
      settings jsonb NOT NULL
    );
    CREATE TABLE IF NOT EXISTS retention_policies (
      owner_id text PRIMARY KEY,
      policy jsonb NOT NULL
    );
    CREATE TABLE IF NOT EXISTS assistant_suggestions (
      id text PRIMARY KEY,
      owner_id text NOT NULL,
      kind text NOT NULL,
      title text NOT NULL,
      rationale text NOT NULL,
      mandate_id text,
      talent_id text,
      payload jsonb NOT NULL,
      status text NOT NULL,
      created_at text NOT NULL,
      resolved_at text,
      run_id text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS assistant_suggestions_owner_idx ON assistant_suggestions (owner_id, status);
    CREATE TABLE IF NOT EXISTS artifact_logs (
      id text PRIMARY KEY,
      owner_id text NOT NULL,
      kind text NOT NULL,
      talent_id text NOT NULL,
      provider text NOT NULL,
      channel text NOT NULL,
      audience text NOT NULL,
      outcome text NOT NULL,
      created_at text NOT NULL,
      outcome_at text
    );
    CREATE INDEX IF NOT EXISTS artifact_logs_owner_idx ON artifact_logs (owner_id, talent_id);
    CREATE TABLE IF NOT EXISTS stage_transitions (
      id text PRIMARY KEY,
      owner_id text NOT NULL,
      candidacy_id text NOT NULL,
      mandate_id text NOT NULL,
      talent_id text NOT NULL,
      from_stage text,
      to_stage text NOT NULL,
      at text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS stage_transitions_owner_idx ON stage_transitions (owner_id, candidacy_id);
  `);
}
