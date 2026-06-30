import express from 'express';
import request from 'supertest';
import { corsMiddleware, securityHeaders } from '../../src/http/security';

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
