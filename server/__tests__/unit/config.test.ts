import { loadConfig } from '../../src/config.js';

describe('loadConfig — auth hardening', () => {
  it('Defaults_CookieInsecure_And30DayTtl', () => {
    const c = loadConfig({});
    expect(c.auth.cookieSecure).toBe(false);
    expect(c.auth.sessionTtlMs).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('ProductionEnv_EnablesSecureCookie', () => {
    expect(loadConfig({ NODE_ENV: 'production' }).auth.cookieSecure).toBe(true);
  });

  it('CookieSecureFlag_EnablesSecureCookie', () => {
    expect(loadConfig({ COOKIE_SECURE: 'true' }).auth.cookieSecure).toBe(true);
  });

  it('SessionTtlDays_OverridesLifetime', () => {
    expect(loadConfig({ SESSION_TTL_DAYS: '7' }).auth.sessionTtlMs).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('CorsOrigins_ParsedFromCommaList', () => {
    expect(
      loadConfig({ CORS_ORIGINS: 'https://a.example, https://b.example' }).security.corsOrigins,
    ).toEqual(['https://a.example', 'https://b.example']);
  });
});

describe('loadConfig — job source circuit breaker', () => {
  it('Defaults_FiveFailuresAnd60sReset', () => {
    const c = loadConfig({});
    expect(c.jobSources.circuitBreakerThreshold).toBe(5);
    expect(c.jobSources.circuitBreakerResetMs).toBe(60000);
  });

  it('EnvOverrides_ThresholdAndResetMs_Applied', () => {
    const c = loadConfig({
      JOB_SOURCE_CIRCUIT_THRESHOLD: '3',
      JOB_SOURCE_CIRCUIT_RESET_MS: '15000',
    });
    expect(c.jobSources.circuitBreakerThreshold).toBe(3);
    expect(c.jobSources.circuitBreakerResetMs).toBe(15000);
  });

  it('NonNumericEnvValue_FallsBackToDefault', () => {
    // A non-numeric env value parses to NaN, which is falsy, so the || default applies.
    expect(
      loadConfig({ JOB_SOURCE_CIRCUIT_THRESHOLD: 'not-a-number' }).jobSources
        .circuitBreakerThreshold,
    ).toBe(5);
  });

  it('BelowFloorEnvValues_ClampedByMathMax', () => {
    // A too-low explicit value is still floored by Math.max, not accepted as-is.
    const c = loadConfig({
      JOB_SOURCE_CIRCUIT_THRESHOLD: '-2',
      JOB_SOURCE_CIRCUIT_RESET_MS: '500',
    });
    expect(c.jobSources.circuitBreakerThreshold).toBe(1);
    expect(c.jobSources.circuitBreakerResetMs).toBe(1000);
  });
});
