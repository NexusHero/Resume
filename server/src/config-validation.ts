import { DEV_ENCRYPTION_SECRET, type AppConfig } from './config.js';

/** The outcome of a production-readiness check. */
export interface ReadinessReport {
  /** Misconfigurations that must block a production boot. */
  errors: string[];
  /** Configurations that work but are probably not what production wants. */
  warnings: string[];
}

/**
 * Check a resolved config against the invariants a production deployment must
 * hold (ADR-0029). Pure — it does not read the environment or `NODE_ENV`; the
 * caller (index.ts) decides when to enforce it and turns any error into a
 * fail-fast exit. Kept a plain function of the config so it is trivially tested.
 *
 * Errors are the things that are unsafe or lossy in production:
 * - the insecure dev encryption secret (it protects stored API keys at rest);
 * - the filesystem store (single-instance and lost on redeploy — Postgres is
 *   required to run more than one instance or survive a restart);
 * - `STORE=sql` without a `DATABASE_URL`.
 * Warnings are things that merely won't behave as a real deployment expects.
 */
export function checkProductionReadiness(config: AppConfig): ReadinessReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.security.encryptionSecret === DEV_ENCRYPTION_SECRET) {
    errors.push(
      'APP_SECRET is unset or the insecure dev default. Set a strong, secret value — it encrypts stored per-user API keys at rest.',
    );
  }

  if (config.store !== 'sql') {
    errors.push(
      'STORE=sql (Postgres) is required in production. The filesystem store is single-instance and is lost on redeploy, so it cannot back a scaled or durable deployment.',
    );
  } else if (!config.databaseUrl) {
    errors.push('DATABASE_URL must be set when STORE=sql.');
  }

  if (config.mail.transport !== 'smtp') {
    warnings.push(
      'MAIL_TRANSPORT is not "smtp": password-reset and email-verification links are only logged, not delivered.',
    );
  }

  if (config.mail.appBaseUrl.startsWith('http://localhost')) {
    warnings.push(
      'APP_BASE_URL still points at localhost: links in emails and other absolute URLs will not resolve for users.',
    );
  }

  return { errors, warnings };
}
