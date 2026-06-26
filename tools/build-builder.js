/**
 * Generates the self-contained "Bewerbungsmappe" builder page
 * (ui_kits/bewerbung/index.html).
 *
 * Pre-loads the freshly generated CV + cover letter (passed by generate-pdf.js)
 * and lets you add attachments. The recipient form + final button talk to the
 * local REST API (npm run serve) when available: the server renders the cover
 * letter WITH the entered address, merges everything, archives, logs and
 * version-controls the application. Without the server it falls back to a
 * client-side merge (no address on the letter, no history).
 *
 *   buildBuilder([{ name, bytes }]) -> writes the page
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const readRoot = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const safeJS = (s) => s.replace(/<\/script>/gi, '<\\/script>');

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');";
const TOKEN_FILES = ['colors', 'typography', 'spacing', 'effects', 'themes', 'base'];

function combinedCSS() {
  return FONT_IMPORT + '\n' + TOKEN_FILES.map((t) => readRoot(`design/documents/tokens/${t}.css`)).join('\n');
}

/** @param {{name:string, bytes:Buffer|Uint8Array}[]} embedded */
function buildBuilder(embedded = []) {
  const { PDFDocument } = require(path.join(ROOT, 'design/documents/vendor/pdf-lib.min.js'));
  const pdfLib = safeJS(readRoot('design/documents/vendor/pdf-lib.min.js'));
  const css = combinedCSS();

  return (async () => {
    const docs = [];
    for (const d of embedded) {
      const bytes = Buffer.isBuffer(d.bytes) ? d.bytes : Buffer.from(d.bytes);
      let pages = 0;
      try { pages = (await PDFDocument.load(bytes, { ignoreEncryption: true })).getPageCount(); } catch (_) {}
      docs.push({ name: d.name, pages, b64: bytes.toString('base64') });
    }
    const html = render(css, pdfLib, JSON.stringify(docs));
    const outPath = path.join(ROOT, 'design/documents/ui_kits/bewerbung/index.html');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html);
    return outPath;
  })();
}

function render(css, pdfLib, embeddedJson) {
  return `<!DOCTYPE html>
<html lang="de" data-theme="blueprint">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Bewerbungsmappe erstellen — Suhay Sevinc</title>
<style>
${css}
body { margin: 0; background: var(--surface-page); font-family: var(--font-body); color: var(--text-body); }
.bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: 12px; padding: 14px 22px;
  background: color-mix(in oklch, var(--ink-900) 90%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--sidebar-border); }
.bar h1 { font-family: var(--font-display); font-size: 16px; color: #fff; margin: 0; font-weight: 700; letter-spacing: -0.01em; }
.bar .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--accent); }
.bar a.back { margin-left: auto; font-family: var(--font-mono); font-size: 12px; color: var(--sidebar-muted); text-decoration: none; }
.bar a.back:hover { color: #fff; }
.wrap { max-width: 760px; margin: 0 auto; padding: 32px 18px 64px; }
.card { background: var(--surface-card); border: 1px solid var(--border); border-radius: var(--radius-xl); box-shadow: var(--shadow-page); padding: 30px; }
.lead { font-size: 15px; line-height: 1.7; color: var(--text-muted); margin: 0 0 6px; }
.hint { font-size: 13px; color: var(--text-soft); margin: 0 0 22px; }
.hint b { color: var(--text-heading); }
.section-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--text-soft); margin: 22px 0 10px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
.fld { display: flex; flex-direction: column; gap: 5px; }
.fld span { font-family: var(--font-mono); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--text-soft); }
.fld input { font-family: var(--font-body); font-size: 14px; color: var(--text-heading); background: var(--surface-page); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 9px 11px; }
.fld input:focus { outline: none; border-color: var(--accent); }
.drop { border: 2px dashed var(--border-strong); border-radius: var(--radius-lg); padding: 22px; text-align: center; background: var(--surface-page); transition: border-color var(--dur-fast), background var(--dur-fast); cursor: pointer; }
.drop.over { border-color: var(--accent); background: var(--accent-soft); }
.drop p { margin: 8px 0 0; font-size: 13px; color: var(--text-soft); }
.btn { appearance: none; border: 0; cursor: pointer; font-family: var(--font-mono); font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: var(--radius-pill); transition: transform var(--dur-fast), box-shadow var(--dur-fast), opacity var(--dur-fast); }
.btn:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }
.btn-accent { background: var(--accent); color: #fff; }
.btn-ghost { background: var(--ink-900); color: #fff; }
.btn:disabled { opacity: .45; cursor: not-allowed; transform: none; box-shadow: none; }
ul.files { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
li.file { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--surface-card); }
li.file.pinned { background: var(--accent-soft); border-color: var(--accent-border); }
li.file .idx { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: #fff; background: var(--ink-900); width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
li.file .meta { flex: 1; min-width: 0; }
li.file .name { font-size: 14px; font-weight: 600; color: var(--text-heading); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
li.file .name .tag { font-family: var(--font-mono); font-size: 10px; font-weight: 600; color: var(--accent-strong); margin-left: 8px; }
li.file .sub { font-family: var(--font-mono); font-size: 11px; color: var(--text-soft); }
li.file .ops { display: flex; gap: 4px; }
li.file .ops button { appearance: none; border: 1px solid var(--border); background: var(--surface-page); cursor: pointer; width: 28px; height: 28px; border-radius: 7px; font-size: 13px; color: var(--text-muted); line-height: 1; }
li.file .ops button:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
li.file .ops button:disabled { opacity: .35; cursor: not-allowed; }
li.file .ops .rm:hover { border-color: #e11d48; color: #e11d48; }
.footer { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 24px; flex-wrap: wrap; }
.total { font-family: var(--font-mono); font-size: 12px; color: var(--text-muted); }
.msg { margin-top: 14px; font-size: 13px; padding: 10px 14px; border-radius: var(--radius-md); display: none; line-height: 1.5; }
.msg.err { display: block; background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.msg.ok { display: block; background: var(--accent-soft); color: var(--accent-strong); border: 1px solid var(--accent-border); }
.msg.warn { display: block; background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
.empty { color: var(--text-soft); font-size: 13px; padding: 6px 0; }
.api-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--text-soft); margin-right: 6px; vertical-align: middle; }
.api-dot.on { background: #16a34a; }
@media (max-width: 560px) { .grid2 { grid-template-columns: 1fr; } }
</style>
</head>
<body>
  <div class="bar">
    <span class="dot"></span><h1>Bewerbungsmappe erstellen</h1>
    <a class="back" href="../../index.html">← Start</a>
  </div>
  <div class="wrap">
    <div class="card">
      <p class="lead">Empfänger eintragen, Zeugnisse hinzufügen, fertige Mappe erstellen.</p>
      <p class="hint"><span class="api-dot" id="api-dot"></span><span id="api-state">API-Status …</span> &nbsp;·&nbsp; Mit laufender API (<b>npm run serve</b>) wird die Adresse ins Anschreiben gedruckt und die Bewerbung versioniert protokolliert.</p>

      <div class="section-label" style="margin-top:0;">Empfänger</div>
      <div class="grid2">
        <label class="fld"><span>Firma</span><input id="f-firma" type="text" placeholder="Firma GmbH" /></label>
        <label class="fld"><span>Stelle</span><input id="f-stelle" type="text" placeholder="Senior C++ Engineer" /></label>
        <label class="fld"><span>Ansprechpartner</span><input id="f-ansprech" type="text" placeholder="Personalabteilung" /></label>
        <label class="fld"><span>Referenz</span><input id="f-referenz" type="text" placeholder="optional" /></label>
        <label class="fld"><span>Straße & Nr.</span><input id="f-strasse" type="text" placeholder="Musterstraße 1" /></label>
        <label class="fld"><span>PLZ & Ort</span><input id="f-plzort" type="text" placeholder="12345 Musterstadt" /></label>
      </div>

      <div class="section-label">Dokumente</div>
      <ul class="files" id="list"></ul>
      <div class="empty" id="empty">Noch keine Dateien.</div>

      <div class="section-label">Zeugnisse / Anlagen hinzufügen</div>
      <div class="drop" id="drop">
        <button class="btn btn-ghost" id="pick" type="button">PDFs auswählen …</button>
        <p>oder PDF-Dateien hierher ziehen</p>
        <input id="file" type="file" accept="application/pdf,.pdf" multiple hidden />
      </div>

      <div class="footer">
        <span class="total" id="total"></span>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-ghost" id="reset" type="button">Zurücksetzen</button>
          <button class="btn btn-accent" id="merge" type="button" disabled>Mappe final erstellen (PDF)</button>
        </div>
      </div>
      <div class="msg" id="msg"></div>
    </div>
  </div>

  <script>${pdfLib}</script>
  <script>
  (function () {
    const { PDFDocument } = window.PDFLib;
    const EMBEDDED = ${embeddedJson};
    const API = location.protocol.startsWith('http') ? '' : 'http://localhost:4178';
    const $ = (id) => document.getElementById(id);
    const fileInput = $('file'), drop = $('drop'), listEl = $('list'), emptyEl = $('empty');
    const totalEl = $('total'), mergeBtn = $('merge'), msg = $('msg');
    let apiUp = false;
    let items = [];

    function b64ToBytes(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
    function bytesToB64(bytes) { let bin = ''; const ch = 0x8000; for (let i = 0; i < bytes.length; i += ch) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + ch)); return btoa(bin); }
    function slug(s) { return String(s || '').trim().toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
    function download(bytes, name) { const blob = new Blob([bytes], { type: 'application/pdf' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); }
    function fields() { return { firma: $('f-firma').value.trim(), stelle: $('f-stelle').value.trim(), ansprech: $('f-ansprech').value.trim(), referenz: $('f-referenz').value.trim(), strasse: $('f-strasse').value.trim(), plzort: $('f-plzort').value.trim() }; }
    function seed() { items = EMBEDDED.map((d) => ({ name: d.name, bytes: b64ToBytes(d.b64), pages: d.pages, pinned: true })); }
    function showMsg(t, k) { msg.textContent = t; msg.className = 'msg ' + k; }
    function clearMsg() { msg.className = 'msg'; msg.textContent = ''; }

    function render() {
      listEl.innerHTML = '';
      items.forEach((it, i) => {
        const li = document.createElement('li');
        li.className = 'file' + (it.pinned ? ' pinned' : '');
        li.innerHTML = '<span class="idx">' + (i + 1) + '</span>' +
          '<span class="meta"><div class="name"></div><div class="sub">' + it.pages + ' Seite' + (it.pages === 1 ? '' : 'n') + '</div></span>' +
          '<span class="ops">' +
            '<button class="up"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
            '<button class="down"' + (i === items.length - 1 ? ' disabled' : '') + '>↓</button>' +
            '<button class="rm">✕</button></span>';
        const nameEl = li.querySelector('.name'); nameEl.textContent = it.name;
        if (it.pinned) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'aktuelle Fassung'; nameEl.appendChild(t); }
        li.querySelector('.up').onclick = () => { if (i > 0) { [items[i-1], items[i]] = [items[i], items[i-1]]; render(); } };
        li.querySelector('.down').onclick = () => { if (i < items.length-1) { [items[i+1], items[i]] = [items[i], items[i+1]]; render(); } };
        li.querySelector('.rm').onclick = () => { items.splice(i, 1); render(); };
        listEl.appendChild(li);
      });
      const has = items.length > 0;
      emptyEl.style.display = has ? 'none' : 'block';
      mergeBtn.disabled = !has;
      const tp = items.reduce((s, x) => s + x.pages, 0);
      totalEl.textContent = has ? (items.length + ' Datei' + (items.length === 1 ? '' : 'en') + ' · ' + tp + ' Seiten') : '';
    }

    async function addFiles(fileList) {
      clearMsg();
      const files = Array.from(fileList);
      const rejected = [];
      for (const f of files) {
        const isPdf = f.type === 'application/pdf' || /\\.pdf$/i.test(f.name);
        if (!isPdf) { rejected.push(f.name); continue; }
        try { const bytes = new Uint8Array(await f.arrayBuffer()); const doc = await PDFDocument.load(bytes, { ignoreEncryption: true }); items.push({ name: f.name, bytes, pages: doc.getPageCount(), pinned: false }); }
        catch (e) { rejected.push(f.name + ' (beschädigt/geschützt?)'); }
      }
      render();
      if (rejected.length) showMsg('Übersprungen (keine gültigen PDFs): ' + rejected.join(', '), 'err');
    }

    $('pick').onclick = () => fileInput.click();
    fileInput.onchange = () => { const f = Array.from(fileInput.files); fileInput.value = ''; addFiles(f); };
    drop.onclick = (e) => { if (e.target === drop || e.target.tagName === 'P') fileInput.click(); };
    ['dragenter','dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave','drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });
    $('reset').onclick = () => { clearMsg(); seed(); render(); };

    async function clientMerge() {
      const out = await PDFDocument.create();
      out.setTitle('Bewerbung — Suhay Sevinc');
      for (const it of items) { const src = await PDFDocument.load(it.bytes, { ignoreEncryption: true }); const ps = await out.copyPages(src, src.getPageIndices()); ps.forEach((p) => out.addPage(p)); }
      return out.save();
    }

    mergeBtn.onclick = async () => {
      if (!items.length) return;
      clearMsg(); mergeBtn.disabled = true; const label = mergeBtn.textContent; mergeBtn.textContent = 'Erstelle …';
      const f = fields();
      const fileName = 'Bewerbung' + (slug(f.firma) ? '_' + slug(f.firma) : '') + '.pdf';
      try {
        if (apiUp && f.firma) {
          // Server renders the cover letter WITH the address, merges, logs & versions.
          const attachments = items.filter((it) => !it.pinned).map((it) => ({ name: it.name, base64: bytesToB64(it.bytes) }));
          const r = await fetch(API + '/api/build', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, source: 'builder', attachments }) });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const data = await r.json();
          download(b64ToBytes(data.pdfBase64), fileName);
          showMsg('✓ Erstellt, protokolliert' + (data.entry.commit ? ' & versioniert (' + data.entry.commit + ')' : '') + ': ' + data.entry.firma + '. Adresse ist im Anschreiben. Download läuft.', 'ok');
        } else {
          const bytes = await clientMerge();
          download(bytes, fileName);
          if (!apiUp) showMsg('Mappe erstellt (offline). Adresse NICHT im Brief und nicht protokolliert — dafür „npm run serve" starten und Seite neu laden.', 'warn');
          else showMsg('Mappe erstellt. Tipp: Firma eintragen, damit die Adresse ins Anschreiben kommt und die Bewerbung protokolliert wird.', 'warn');
        }
      } catch (e) {
        showMsg('Fehler: ' + (e && e.message || e), 'err');
      } finally { mergeBtn.disabled = false; mergeBtn.textContent = label; }
    };

    async function checkApi() {
      try { const r = await fetch(API + '/api/applications', { method: 'GET' }); apiUp = r.ok; } catch (_) { apiUp = false; }
      $('api-dot').className = 'api-dot' + (apiUp ? ' on' : '');
      $('api-state').textContent = apiUp ? 'API verbunden' : 'API offline';
    }

    seed(); render(); checkApi();
  })();
  </script>
</body>
</html>
`;
}

module.exports = { buildBuilder };

if (require.main === module) {
  buildBuilder([]).then((p) => console.log('Builder geschrieben:', p));
}
