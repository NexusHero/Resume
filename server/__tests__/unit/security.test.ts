import express from 'express';
import request from 'supertest';
import {
  corsMiddleware,
  securityHeaders,
  recruitingCsp,
  RECRUITING_KIT_PREFIX,
} from '../../src/http/security.js';

function appWith(origins: string[]) {
  const app = express();
  app.use(securityHeaders);
  app.use(corsMiddleware(origins));
  app.get('/x', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('securityHeaders', () => {
  it('SetsBaselineHeaders', async () => {
    const res = await request(appWith([])).get('/x');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin');
  });
});

describe('recruitingCsp', () => {
  function appWithCsp() {
    const app = express();
    app.use(RECRUITING_KIT_PREFIX, recruitingCsp);
    app.get(`${RECRUITING_KIT_PREFIX}/index.html`, (_req, res) => res.send('<html></html>'));
    app.get('/other/index.html', (_req, res) => res.send('<html></html>'));
    return app;
  }

  it('RecruitingPath_SetsStrictScriptSrcAndFontAllowances', async () => {
    const res = await request(appWithCsp()).get(`${RECRUITING_KIT_PREFIX}/index.html`);
    const csp = res.headers['content-security-policy'];
    expect(csp).toBeDefined();
    // script-src is same-origin only — no unsafe-inline / unsafe-eval (the real XSS guard)
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    // styles need unsafe-inline (React inline styles); fonts are self-hosted,
    // so no third-party origin may appear anywhere in the policy
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("font-src 'self'");
    expect(csp).not.toContain('fonts.googleapis.com');
    expect(csp).not.toContain('fonts.gstatic.com');
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('blob:'); // export/PDF downloads
  });

  it('OtherPaths_AreNotConstrained', async () => {
    const res = await request(appWithCsp()).get('/other/index.html');
    expect(res.headers['content-security-policy']).toBeUndefined();
  });
});

describe('corsMiddleware', () => {
  it('AllowedOrigin_IsEchoedWithCredentials', async () => {
    const res = await request(appWith(['https://app.example']))
      .get('/x')
      .set('Origin', 'https://app.example');
    expect(res.headers['access-control-allow-origin']).toBe('https://app.example');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['vary']).toBe('Origin');
  });

  it('DisallowedOrigin_IsNotEchoed', async () => {
    const res = await request(appWith(['https://app.example']))
      .get('/x')
      .set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('NoOriginHeader_NoAllowOrigin', async () => {
    const res = await request(appWith(['https://app.example'])).get('/x');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    // method/headers allowances are still advertised for same-origin clients
    expect(res.headers['access-control-allow-methods']).toMatch(/GET/);
  });

  it('Preflight_Returns204_AndEchoesAllowedOrigin', async () => {
    const res = await request(appWith(['https://app.example']))
      .options('/x')
      .set('Origin', 'https://app.example');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://app.example');
  });
});
