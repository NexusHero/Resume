import { loadConfig } from '../../src/config';
import { checkProductionReadiness } from '../../src/config-validation';

/** A fully production-ready environment; individual tests weaken one axis. */
const PROD_ENV: NodeJS.ProcessEnv = {
  STORE: 'sql',
  DATABASE_URL: 'postgres://user:pass@db:5432/myjob',
  APP_SECRET: 'a-strong-production-secret-value',
  MAIL_TRANSPORT: 'smtp',
  SMTP_HOST: 'smtp.example.com',
  APP_BASE_URL: 'https://app.example.com',
};

const check = (env: NodeJS.ProcessEnv) => checkProductionReadiness(loadConfig(env));

describe('checkProductionReadiness', () => {
  it('Readiness_FullyConfigured_HasNoErrorsOrWarnings', () => {
    const { errors, warnings } = check(PROD_ENV);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('Readiness_FilesystemStore_IsAnError', () => {
    const { errors } = check({ ...PROD_ENV, STORE: 'fs' });
    expect(errors.join(' ')).toMatch(/STORE=sql/);
  });

  it('Readiness_InsecureDevSecret_IsAnError', () => {
    const { APP_SECRET: _drop, ...noSecret } = PROD_ENV;
    const { errors } = check(noSecret);
    expect(errors.join(' ')).toMatch(/APP_SECRET/);
  });

  it('Readiness_SqlWithoutDatabaseUrl_IsAnError', () => {
    const { DATABASE_URL: _drop, ...noDb } = PROD_ENV;
    const { errors } = check(noDb);
    expect(errors.join(' ')).toMatch(/DATABASE_URL/);
  });

  it('Readiness_ConsoleMailAndLocalhostBaseUrl_AreWarningsNotErrors', () => {
    const { errors, warnings } = check({
      STORE: 'sql',
      DATABASE_URL: 'postgres://user:pass@db:5432/myjob',
      APP_SECRET: 'a-strong-production-secret-value',
      // MAIL_TRANSPORT unset → console; APP_BASE_URL unset → localhost
    });
    expect(errors).toEqual([]);
    expect(warnings.join(' ')).toMatch(/MAIL_TRANSPORT/);
    expect(warnings.join(' ')).toMatch(/APP_BASE_URL/);
  });
});
