import { loadConfig } from '../../src/config.js';
import { checkProductionReadiness } from '../../src/config-validation.js';

/** A fully production-ready environment; individual tests weaken one axis. */
const PROD_ENV: NodeJS.ProcessEnv = {
  STORE: 'sql',
  DATABASE_URL: 'postgres://user:pass@db:5432/myjob',
  APP_SECRET: 'a-strong-production-secret-value',
  MAIL_TRANSPORT: 'smtp',
  SMTP_HOST: 'smtp.example.com',
  APP_BASE_URL: 'https://app.example.com',
  ANTHROPIC_API_KEY: 'sk-ant-test',
};

const check = (env: NodeJS.ProcessEnv) => checkProductionReadiness(loadConfig(env));

describe('checkProductionReadiness', () => {
  it('Readiness_FullyConfigured_HasNoErrorsOrWarnings', () => {
    const { errors, warnings } = check(PROD_ENV);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('ConfigValidation_NoAiKey_AddsWarningNotError', () => {
    const { errors, warnings } = check({ ...PROD_ENV, ANTHROPIC_API_KEY: '' });
    expect(errors).toEqual([]);
    expect(warnings.join(' ')).toMatch(/No AI key configured/);
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

  it('CheckProductionReadiness_JobFetchDefaults_NoWarning', () => {
    const { warnings } = check(PROD_ENV);
    expect(warnings).toEqual([]);
  });

  it('CheckProductionReadiness_JobFetchExtremeRedirects_Warns', () => {
    const { warnings } = check({ ...PROD_ENV, JOB_FETCH_MAX_REDIRECTS: '99' });
    expect(warnings.join(' ')).toMatch(/JOB_FETCH_MAX_REDIRECTS/);
  });

  it('CheckProductionReadiness_JobFetchExtremeTimeout_Warns', () => {
    const { warnings } = check({ ...PROD_ENV, JOB_FETCH_TIMEOUT_MS: '120000' });
    expect(warnings.join(' ')).toMatch(/JOB_FETCH_TIMEOUT_MS/);
  });

  it('Config_JobFetchEnv_ClampsNegativeValuesToDefaults', () => {
    const config = loadConfig({
      JOB_FETCH_MAX_BYTES: '-5',
      JOB_FETCH_TIMEOUT_MS: '-5',
      JOB_FETCH_MAX_REDIRECTS: '-5',
    });
    expect(config.jobFetch).toEqual({ maxBytes: 1_000_000, timeoutMs: 10_000, maxRedirects: 5 });
  });

  it('Config_JobFetchEnv_AcceptsZeroAndCustomValues', () => {
    const config = loadConfig({
      JOB_FETCH_MAX_REDIRECTS: '0',
      JOB_FETCH_MAX_BYTES: '1000',
    });
    expect(config.jobFetch.maxRedirects).toBe(0);
    expect(config.jobFetch.maxBytes).toBe(1000);
  });
});
