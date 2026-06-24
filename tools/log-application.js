/**
 * Record a sent application from the CLI and archive its PDF.
 *
 *   npm run sent -- "Firma GmbH" "Stelle" [pfad/zur/Bewerbung.pdf]
 *
 * Uses the shared store (log.json + history.jsonl + git versioning + home
 * rebuild). If no PDF path is given, picks the newest "Bewerbung*.pdf" from the
 * repo root or ~/Downloads.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const store = require('./store');

const ROOT = path.join(__dirname, '..');
function fail(m) { console.error('\n✗ ' + m + '\n'); process.exit(1); }

function newestBewerbungPdf() {
  let best = null;
  for (const dir of [ROOT, path.join(os.homedir(), 'Downloads')]) {
    let entries = [];
    try { entries = fs.readdirSync(dir); } catch (_) { continue; }
    for (const name of entries) {
      if (!/^Bewerbung.*\.pdf$/i.test(name)) continue;
      const full = path.join(dir, name); const m = fs.statSync(full).mtimeMs;
      if (!best || m > best.m) best = { full, m };
    }
  }
  return best && best.full;
}

const args = process.argv.slice(2);
const firma = args[0];
const stelle = args[1] || '';
if (!firma) fail('Bitte Firma angeben:  npm run sent -- "Firma GmbH" "Stelle" [pfad/zur/Bewerbung.pdf]');

const pdfSrc = args[2] ? path.resolve(args[2]) : newestBewerbungPdf();
if (!pdfSrc || !fs.existsSync(pdfSrc)) {
  fail('Keine PDF gefunden. Erst eine Mappe erstellen, oder Pfad angeben:\n  npm run sent -- "Firma" "Stelle" ~/Downloads/Bewerbung-....pdf');
}

const entry = store.addApplication({ firma, stelle, pdfBytes: fs.readFileSync(pdfSrc), source: 'cli' });
console.log('\n✓ Erfasst: ' + entry.firma + (entry.stelle ? ' — ' + entry.stelle : ''));
console.log('  Archiviert: ' + entry.pdf);
if (entry.commit) console.log('  Version:    ' + entry.commit);
console.log('  Startseite aktualisiert.\n');
