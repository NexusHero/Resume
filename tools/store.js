/**
 * Data + versioning layer for applications.
 *
 * - bewerbungen/log.json     : current list of applications (state)
 * - bewerbungen/history.jsonl: append-only audit trail (when / what / how)
 * - git                      : every change is committed (scoped to these files
 *                              + index.html), so the full history is versioned.
 *
 * Used by the CLI (npm run sent) and the REST server — single source of truth.
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'archive', 'bewerbungen');
const LOG = path.join(DIR, 'log.json');
const HIST = path.join(DIR, 'history.jsonl');
const { buildHome } = require('./build-home');

function ensure() { fs.mkdirSync(DIR, { recursive: true }); }

function readLog() {
  try { const d = JSON.parse(fs.readFileSync(LOG, 'utf8')); return Array.isArray(d) ? d : []; } catch (_) { return []; }
}
function writeLog(arr) { ensure(); fs.writeFileSync(LOG, JSON.stringify(arr, null, 2) + '\n'); }

function appendHistory(event) {
  ensure();
  fs.appendFileSync(HIST, JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n');
}
function readHistory() {
  try {
    return fs.readFileSync(HIST, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch (_) { return []; }
}

function slug(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'bewerbung';
}

// Commit ONLY our own files so unrelated working changes are never touched.
function gitCommit(message, files) {
  try {
    cp.execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: ROOT, stdio: 'ignore' });
  } catch (_) { return null; }
  try {
    const existing = files.filter((f) => fs.existsSync(path.join(ROOT, f)));
    if (!existing.length) return null;
    cp.execFileSync('git', ['add', '--', ...existing], { cwd: ROOT, stdio: 'ignore' });
    cp.execFileSync('git', ['commit', '-m', message, '--', ...existing], { cwd: ROOT, stdio: 'ignore' });
    const hash = cp.execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim();
    return hash;
  } catch (_) { return null; } // e.g. nothing changed / git not configured
}

function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

/**
 * Add an application.
 * @param {{firma, stelle, adresse, ansprech, strasse, plzort, referenz, status, pdfBytes?:Buffer, source?}} data
 */
function addApplication(data) {
  ensure();
  const id = newId();
  const date = new Date().toISOString().slice(0, 10);
  let pdfRel = null;
  if (data.pdfBytes && data.pdfBytes.length) {
    const fname = `${date}_${slug(data.firma)}_${id}.pdf`;
    fs.writeFileSync(path.join(DIR, fname), data.pdfBytes);
    pdfRel = 'bewerbungen/' + fname;
  }
  const entry = {
    id, date,
    firma: data.firma || '',
    stelle: data.stelle || '',
    adresse: data.adresse || [data.ansprech, data.strasse, data.plzort].filter(Boolean).join(', '),
    referenz: data.referenz || '',
    status: data.status || 'gesendet',
    pdf: pdfRel,
    source: data.source || 'cli',
    createdAt: new Date().toISOString(),
  };
  const log = readLog();
  log.push(entry);
  writeLog(log);
  appendHistory({ action: 'create', id, by: entry.source, data: { firma: entry.firma, stelle: entry.stelle, adresse: entry.adresse, status: entry.status, pdf: entry.pdf } });
  buildHome();
  const hash = gitCommit(`bewerbung: erfasst ${entry.firma}${entry.stelle ? ' — ' + entry.stelle : ''}`,
    ['bewerbungen/log.json', 'bewerbungen/history.jsonl', 'index.html', pdfRel].filter(Boolean));
  if (hash) { entry.commit = hash; appendHistory({ action: 'commit', id, commit: hash }); }
  return entry;
}

function updateApplication(id, patch, source = 'cli') {
  const log = readLog();
  const i = log.findIndex((e) => e.id === id);
  if (i < 0) return null;
  const before = { ...log[i] };
  const allowed = ['firma', 'stelle', 'adresse', 'referenz', 'status'];
  const changed = {};
  for (const k of allowed) if (k in patch && patch[k] !== before[k]) { log[i][k] = patch[k]; changed[k] = { from: before[k], to: patch[k] }; }
  if (!Object.keys(changed).length) return log[i];
  log[i].updatedAt = new Date().toISOString();
  writeLog(log);
  appendHistory({ action: 'update', id, by: source, changed });
  buildHome();
  const hash = gitCommit(`bewerbung: aktualisiert ${log[i].firma} (${Object.keys(changed).join(', ')})`,
    ['bewerbungen/log.json', 'bewerbungen/history.jsonl', 'index.html']);
  if (hash) appendHistory({ action: 'commit', id, commit: hash });
  return log[i];
}

module.exports = { addApplication, updateApplication, list: readLog, history: readHistory, slug };
