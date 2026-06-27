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
  `);
}
