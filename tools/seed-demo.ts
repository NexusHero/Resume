/**
 * Demo-workspace seeding (AK-6.6, plan §6): `npm run seed:demo`.
 *
 * Composes the same persistence layer the app uses (`createPersistence` from
 * `persistence-factory.ts`), so it is fs/sql-symmetric and idempotent. All data
 * is synthetic (no real PII). `aiConsent` stays unset by default; pass
 * `--with-consent` to preset it to `true`.
 */
import { loadConfig } from '../server/src/config.js';
import { createPersistence } from '../server/src/adapters/persistence-factory.js';
import { SystemClock } from '../server/src/adapters/system-clock.js';
import { createDb, migrate } from '../server/src/adapters/sql/db.js';
import { seedDemo } from '../server/src/demo-seed.js';
import { TEAM_SCOPE } from '../server/src/http/current-user.js';

const withConsent = process.argv.includes('--with-consent');
const scope = process.env.SEED_SCOPE || TEAM_SCOPE;

const config = loadConfig({});
const clock = new SystemClock();

let pool;
let db;
if (config.store === 'sql') {
  const conn = createDb(config.databaseUrl);
  await migrate(conn.pool);
  db = conn.db;
  pool = conn.pool;
}

const persistence = createPersistence({ config, clock, db });

try {
  const result = await seedDemo(
    {
      scope,
      talentRepository: persistence.talentRepository,
      jobPostingRepository: persistence.jobPostingRepository,
      jobApplicationRepository: persistence.jobApplicationRepository,
      workspaceSettingsStore: persistence.workspaceSettingsStore,
    },
    { withConsent },
  );

  const c = result.created;
  const already = (created) => (created ? 'created' : 'already present');
  console.log('\n✓ Demo seed complete (synthetic data, no real PII):');
  console.log(`  Candidate   ${result.talent.id} "${result.talent.name}" — ${already(c.talent)}`);
  console.log(`  Job posting ${result.posting.id} "${result.posting.title}" — ${already(c.posting)}`);
  console.log(
    `  Application ${result.application.id} (draft) — ${already(c.application)}`,
  );
  if (withConsent) {
    console.log('  aiConsent = true (--with-consent)');
  } else {
    console.log('  aiConsent stays unset — the consent is shown during the walkthrough.');
  }
  console.log('');
} finally {
  if (pool) await pool.end();
}
