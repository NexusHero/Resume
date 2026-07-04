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
