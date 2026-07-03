import path from 'node:path';
import express, { type Router, type Request, type Response, type NextFunction } from 'express';
import { absolutePath } from 'swagger-ui-dist';

/**
 * The interactive API reference: the OpenAPI contract (`server/openapi.yaml`)
 * plus a Swagger UI at /api/v1/docs. Everything is served from this origin —
 * the UI assets come from the installed `swagger-ui-dist` package, never a
 * CDN — so the page works offline and no request leaves the browser (DSGVO,
 * same reasoning as the self-hosted fonts). See ADR-0011.
 */

/** Strict CSP for the docs page; swagger-ui needs inline styles, nothing else. */
const DOCS_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "script-src 'self'",
  "connect-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
].join('; ');

function docsCsp(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Content-Security-Policy', DOCS_CSP);
  next();
}

/* The page carries no inline script (CSP: script-src 'self'); the initializer
   below shadows the placeholder swagger-initializer.js the package ships. */
const DOCS_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>myJob API — Swagger UI</title>
<link rel="stylesheet" href="/api/v1/docs/swagger-ui.css"/>
</head>
<body>
<div id="swagger-ui"></div>
<script src="/api/v1/docs/swagger-ui-bundle.js" charset="UTF-8"></script>
<script src="/api/v1/docs/swagger-initializer.js" charset="UTF-8"></script>
</body>
</html>
`;

const DOCS_INITIALIZER = `window.onload = function () {
  window.ui = SwaggerUIBundle({
    url: '/api/v1/openapi.yaml',
    dom_id: '#swagger-ui',
    deepLinking: true,
  });
};
`;

/** Mount the spec + Swagger UI on the /api/v1 router. */
export function registerApiDocs(api: Router, rootDir: string): void {
  const spec = path.join(rootDir, 'server', 'openapi.yaml');
  api.get('/openapi.yaml', (_req, res) => res.type('text/yaml').sendFile(spec));
  api.get(['/docs', '/docs/'], docsCsp, (_req, res) => res.type('html').send(DOCS_PAGE));
  // Must come before the static handler to shadow the package's placeholder.
  api.get('/docs/swagger-initializer.js', docsCsp, (_req, res) =>
    res.type('application/javascript').send(DOCS_INITIALIZER),
  );
  // redirect: false — the page routes above already answer /docs and /docs/.
  api.use('/docs', docsCsp, express.static(absolutePath(), { index: false, redirect: false }));
}
