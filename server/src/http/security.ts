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
 * Baseline security response headers (no dependency). A global Content-Security-
 * Policy is deliberately omitted: the still-unmigrated kits (karriere, the
 * documents kits, the design screens) load React and Babel from a CDN and
 * transpile JSX in the browser, which a strict CSP would break. A scoped CSP is
 * applied to the Vite-built recruiting kit instead — see `recruitingCsp`.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
}

/** URL prefix the Vite-built recruiting kit is served from. */
export const RECRUITING_KIT_PREFIX = '/design/myjob/ui_kits/recruiting/dist';

/**
 * Content-Security-Policy for the recruiting kit. The kit is bundled by Vite, so
 * scripts come only from same-origin (`script-src 'self'` — no `unsafe-inline`,
 * no `unsafe-eval`), which is the real XSS protection. Styles still need
 * `unsafe-inline` because the design system uses React inline styles and the
 * document carries an inline `<style>` block; the kit's CSS `@import`s the
 * Space Grotesk webfont from Google Fonts (CSS from fonts.googleapis.com, font
 * files from fonts.gstatic.com). `blob:` covers the client-side export/PDF
 * downloads built with `createObjectURL`.
 */
const RECRUITING_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self'",
  "connect-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
].join('; ');

/**
 * Applies the recruiting-kit CSP only to requests under `RECRUITING_KIT_PREFIX`,
 * leaving the CDN-loading legacy kits untouched. Set before the static handler.
 */
export function recruitingCsp(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Content-Security-Policy', RECRUITING_CSP);
  next();
}
