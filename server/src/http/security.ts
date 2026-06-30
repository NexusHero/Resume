import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * CORS with an explicit allow-list. The API uses cookie credentials, so a
 * wildcard origin is neither valid nor safe — instead we echo the request's
 * Origin only when it is configured. An empty allow-list (the default) sends no
 * `Access-Control-Allow-Origin` header at all, leaving the API same-origin only.
 */
export function corsMiddleware(allowedOrigins: string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  };
}

/**
 * Baseline security response headers (no dependency). Deliberately omits a
 * Content-Security-Policy for now — the recruiting/karriere kits load React and
 * Babel from a CDN, which a strict CSP would block; a CSP lands with the
 * Vite/bundled-frontend migration.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
}
