/**
 * Local REST API + static server for the Bewerbungs-Suite.
 *
 *   npm run serve          (default port 4178)
 *
 * Serves the app over http://localhost:4178/ (also fixes Safari's file://
 * limitations) and exposes an external interface so applications can be fed in
 * automatically. Every change is logged (history.jsonl) and committed to git.
 *
 * API
 *   GET    /api/applications            -> list
 *   GET    /api/history                 -> audit trail
 *   POST   /api/applications            -> record only { firma, stelle, adresse, status, pdfBase64? }
 *   POST   /api/build                   -> render CV + cover letter (with address) + merge attachments,
 *                                          archive + log + commit. Body:
 *                                          { firma, ansprech, strasse, plzort, stelle, referenz,
 *                                            ort, datum, lang, status, attachments:[{name,base64}] }
 *                                          -> { entry, pdfBase64 }
 *   PATCH  /api/applications/:id         -> { status?, stelle?, ... }
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const store = require('./store');
const { mergePdfs } = require('./pdf');
const render = require('./render');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 4178;

let browserPromise = null;
function getBrowser() { if (!browserPromise) browserPromise = render.launch(); return browserPromise; }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function json(res, code, obj) { cors(res); res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => { chunks.push(c); if (Buffer.concat(chunks).length > 80 * 1024 * 1024) reject(new Error('Body zu groß')); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.join(ROOT, path.normalize(rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const p = u.pathname;
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }

  try {
    if (p === '/api/applications' && req.method === 'GET') return json(res, 200, store.list());
    if (p === '/api/history' && req.method === 'GET') return json(res, 200, store.history());

    if (p === '/api/applications' && req.method === 'POST') {
      const b = await readBody(req);
      if (!b.firma) return json(res, 400, { error: 'firma erforderlich' });
      const pdfBytes = b.pdfBase64 ? Buffer.from(b.pdfBase64, 'base64') : null;
      const entry = store.addApplication({ ...b, pdfBytes, source: b.source || 'api' });
      return json(res, 201, { entry });
    }

    if (p === '/api/build' && req.method === 'POST') {
      const b = await readBody(req);
      if (!b.firma) return json(res, 400, { error: 'firma erforderlich' });
      const browser = await getBrowser();
      const letter = await render.renderCoverLetter(browser, b);
      const cv = await render.renderCV(browser, { lang: b.lang || 'de' });
      const atts = Array.isArray(b.attachments) ? b.attachments.map((a) => Buffer.from(a.base64, 'base64')) : [];
      const merged = await mergePdfs([letter, cv, ...atts], { title: 'Bewerbung — Suhay Sevinc' });
      const entry = store.addApplication({ ...b, pdfBytes: merged, source: b.source || 'api' });
      return json(res, 201, { entry, pdfBase64: merged.toString('base64') });
    }

    const m = p.match(/^\/api\/applications\/([^/]+)$/);
    if (m && req.method === 'PATCH') {
      const b = await readBody(req);
      const entry = store.updateApplication(m[1], b, b.source || 'api');
      return entry ? json(res, 200, { entry }) : json(res, 404, { error: 'nicht gefunden' });
    }

    if (p.startsWith('/api/')) return json(res, 404, { error: 'unbekannter Endpunkt' });

    return serveStatic(req, res, p);
  } catch (e) {
    return json(res, 500, { error: String(e && e.message || e) });
  }
});

server.listen(PORT, () => {
  console.log(`Bewerbungs-Suite läuft auf http://localhost:${PORT}`);
  console.log(`  App:     http://localhost:${PORT}/`);
  console.log(`  API:     http://localhost:${PORT}/api/applications`);
  console.log('  (Strg+C zum Beenden)');
});
