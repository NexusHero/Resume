import express from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { AppConfig } from '../config.js';
import {
  securityHeaders,
  corsMiddleware,
  recruitingCsp,
  hstsHeader,
  RECRUITING_KIT_PREFIX,
} from '../http/security.js';
import { registerApiDocs } from '../http/api-docs.js';

/**
 * The Express edge around the Nest router (ADR-0051) — everything `create-app.ts`
 * did outside the controllers: security headers, CORS allow-list, the two-tier
 * JSON body limit (1 MB default, 80 MB only on the base64-upload routes so an
 * unauthenticated caller can't force a huge buffer+parse), the self-hosted
 * OpenAPI/Swagger docs, the root redirect into the recruiting Workspace and the
 * static kits with the scoped CSP. Registered as middleware, so it runs before
 * the Nest-routed API; the app must be created with `bodyParser: false`.
 */
export function configureHttpEdge(app: NestExpressApplication, config: AppConfig): void {
  // Express defaults `trust proxy` to false, so behind the documented
  // HTTPS-terminating reverse proxy `req.ip` would always be the proxy's own
  // socket address — collapsing every client into one bucket for the
  // brute-force and AI-spend rate limiters (both keyed on `req.ip`). Configure
  // via TRUST_PROXY_HOPS to match the real deployment topology.
  app.set('trust proxy', config.security.trustProxyHops);
  app.use(securityHeaders);
  app.use(hstsHeader(config.auth.cookieSecure));
  app.use(corsMiddleware(config.security.corsOrigins));

  const smallJson = express.json({ limit: '1mb' });
  const largeJson = express.json({ limit: '80mb' });
  const LARGE_BODY = /^\/api\/v1\/talents\/(import|[^/]+\/(attachments|documents))$/;
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) =>
    (LARGE_BODY.test(req.path) ? largeJson : smallJson)(req, res, next),
  );

  // API reference: the OpenAPI contract + a self-hosted Swagger UI (no CDN).
  const docs = express.Router();
  registerApiDocs(docs, config.rootDir);
  app.use('/api/v1', docs);

  // The app opens directly on the recruiting Workspace — there is no launcher.
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.method === 'GET' && req.path === '/') {
      res.redirect(302, `${RECRUITING_KIT_PREFIX}/index.html`);
      return;
    }
    next();
  });

  // Static web UIs (recruiting Workspace + CV/cover-letter print templates).
  // The Vite-built recruiting kit gets a strict CSP; the CDN-loading print
  // templates are left untouched (a global CSP would break them).
  app.use(RECRUITING_KIT_PREFIX, recruitingCsp);
  app.use(express.static(config.staticDir, { index: false }));
}
