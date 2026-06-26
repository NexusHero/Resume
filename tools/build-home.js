/**
 * Generates the self-contained home / launcher page (index.html in the repo
 * root) — the single entry point that links to the CV, cover letter and the
 * Bewerbungsmappe builder, shows a "last updated" stamp and the list of sent
 * applications (read from bewerbungen/log.json).
 *
 *   node tools/build-home.js   (or via buildHome())
 *
 * Self-contained (tokens + photo inlined) so it works via file:// in any
 * browser, including Safari.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const readRoot = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');";
const TOKEN_FILES = ['colors', 'typography', 'spacing', 'effects', 'themes', 'base'];

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ICONS = {
  cv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
  letter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>',
  bundle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
  recruiting: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="18" rx="1.5"/><rect x="14" y="3" width="7" height="11" rx="1.5"/></svg>',
  bewerber: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
};

function readLog() {
  try {
    const data = JSON.parse(readRoot('archive/bewerbungen/log.json'));
    if (Array.isArray(data)) return data;
  } catch (_) {}
  return [];
}

function fmtDate(iso) {
  // iso: YYYY-MM-DD -> DD.MM.YYYY
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}.${m[2]}.${m[1]}` : (iso || '');
}

function buildHome() {
  const css = FONT_IMPORT + '\n' + TOKEN_FILES.map((t) => readRoot(`design/documents/tokens/${t}.css`)).join('\n');
  const photoURI =
    'data:image/jpeg;base64,' + fs.readFileSync(path.join(ROOT, 'assets/suhay-photo-sm.jpg')).toString('base64');

  const card = (href, accent, icon, title, desc) => `
      <a class="tile" href="${href}" style="--tile-accent:${accent};">
        <span class="tile-ic">${icon}</span>
        <span class="tile-body">
          <span class="tile-title">${title}</span>
          <span class="tile-desc">${desc}</span>
        </span>
        <span class="tile-go">→</span>
      </a>`;

  const log = readLog().slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const rows = log.map((e) => {
    const pdf = e.pdf ? `<a class="ap-pdf" href="${esc(e.pdf)}" title="Open PDF">PDF ↗</a>` : '';
    const status = e.status ? `<span class="ap-status">${esc(e.status)}</span>` : '';
    return `
        <li class="ap">
          <span class="ap-date">${esc(fmtDate(e.date))}</span>
          <span class="ap-meta"><span class="ap-firma">${esc(e.firma)}</span><span class="ap-stelle">${esc(e.stelle)}</span>${e.adresse ? `<span class="ap-adr">${esc(e.adresse)}</span>` : ''}</span>
          ${status}${pdf}
        </li>`;
  }).join('');

  const appsSection = `
    <div class="apps">
      <div class="apps-head">
        <p class="kicker" style="margin:0;">Sent applications${log.length ? ` · ${log.length}` : ''}</p>
      </div>
      ${log.length
        ? `<ul class="ap-list">${rows}</ul>`
        : `<p class="ap-empty">None recorded yet. After creating a dossier:&nbsp; <b>npm run sent -- "Company" "Position"</b></p>`}
    </div>`;

  const updated = new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const html = `<!DOCTYPE html>
<html lang="en" data-theme="blueprint">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Application — Suhay Sevinc</title>
<style>
${css}
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; font-family: var(--font-body); color: var(--sidebar-text);
  background:
    radial-gradient(120% 60% at 15% 0%, color-mix(in oklch, var(--accent) 16%, transparent) 0%, transparent 55%),
    linear-gradient(180deg, var(--sidebar-bg-top) 0%, var(--sidebar-bg-bottom) 100%);
  display: flex; align-items: flex-start; justify-content: center; padding: 48px 20px; }
.app { width: 100%; max-width: 640px; }
.hero { display: flex; align-items: center; gap: 20px; margin-bottom: 14px; }
.hero img { width: 84px; height: 84px; border-radius: 20px; object-fit: cover; border: 1px solid var(--sidebar-border-strong); box-shadow: var(--shadow-md); }
.hero h1 { font-family: var(--font-display); font-size: 30px; font-weight: 700; letter-spacing: -0.025em; color: #fff; margin: 0 0 8px; }
.hero .role { font-family: var(--font-mono); font-size: 11px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: #fff; background: var(--sidebar-glass-strong); border: 1px solid var(--sidebar-border-strong); padding: 5px 11px; border-radius: var(--radius-pill); }
.updated { font-family: var(--font-mono); font-size: 11px; color: var(--sidebar-soft); margin: 0 0 30px; }
.updated b { color: var(--sidebar-muted); font-weight: 600; }
.kicker { font-family: var(--font-mono); font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--sidebar-soft); margin: 0 0 12px; }
.tiles { display: flex; flex-direction: column; gap: 12px; }
.tile { display: flex; align-items: center; gap: 16px; text-decoration: none; padding: 18px 20px;
  background: var(--sidebar-glass); border: 1px solid var(--sidebar-border); border-radius: var(--radius-lg);
  transition: transform var(--dur-fast), border-color var(--dur-fast), background var(--dur-fast); }
.tile:hover { transform: translateY(-2px); border-color: var(--tile-accent); background: var(--sidebar-glass-strong); }
.tile-ic { width: 44px; height: 44px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; color: #fff; background: var(--tile-accent); }
.tile-ic svg { width: 22px; height: 22px; }
.tile-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.tile-title { font-family: var(--font-display); font-size: 17px; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
.tile-desc { font-size: 13px; line-height: 1.5; color: var(--sidebar-muted); }
.tile-go { font-size: 20px; color: var(--sidebar-soft); transition: transform var(--dur-fast), color var(--dur-fast); }
.tile:hover .tile-go { transform: translateX(3px); color: #fff; }
.apps { margin-top: 34px; }
.apps-head { margin-bottom: 12px; }
.ap-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.ap { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: var(--sidebar-glass); border: 1px solid var(--sidebar-border); border-radius: var(--radius-md); }
.ap-date { font-family: var(--font-mono); font-size: 12px; color: var(--sidebar-soft); flex-shrink: 0; width: 78px; }
.ap-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ap-firma { font-size: 14px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-stelle { font-size: 12px; color: var(--sidebar-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-adr { font-size: 11px; color: var(--sidebar-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-status { font-family: var(--font-mono); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--sidebar-muted); background: var(--sidebar-glass-strong); border: 1px solid var(--sidebar-border-strong); padding: 3px 8px; border-radius: var(--radius-pill); flex-shrink: 0; }
.ap-pdf { font-family: var(--font-mono); font-size: 11px; font-weight: 600; color: var(--accent); text-decoration: none; flex-shrink: 0; }
.ap-pdf:hover { color: #fff; }
.ap-empty { font-family: var(--font-mono); font-size: 12px; color: var(--sidebar-soft); line-height: 1.7; margin: 0; }
.ap-empty b { color: var(--sidebar-muted); font-weight: 600; }
</style>
</head>
<body>
  <div class="app">
    <div class="hero">
      <img src="${photoURI}" alt="Suhay Sevinc" />
      <div>
        <h1>Suhay Sevinc</h1>
        <span class="role">M.Sc. Software Engineer</span>
      </div>
    </div>
    <p class="updated">Last updated: <b>${updated}</b></p>

    <p class="kicker">Application Suite</p>
    <div class="tiles">
${card('design/documents/ui_kits/cv/index.html', 'var(--accent)', ICONS.cv, 'Resume', 'Interactive CV — EN/DE toggle, accent themes, PDF export.')}
${card('design/documents/ui_kits/cover-letter/index.html', '#7c3aed', ICONS.letter, 'Cover letter', 'Cover letter with theme choice and PDF export.')}
${card('design/documents/ui_kits/bewerbung/index.html', '#0891b2', ICONS.bundle, 'Application dossier', 'Merge cover letter + résumé + references into one PDF.')}
    </div>

    <p class="kicker" style="margin-top:34px;">myJob — Application tool <span style="text-transform:none;letter-spacing:0;color:var(--sidebar-soft);font-weight:400;">· requires <b style="color:var(--sidebar-muted);">npm run serve</b></span></p>
    <div class="tiles">
${card('design/myjob/ui_kits/recruiting/index.html', '#1d4ed8', ICONS.recruiting, 'myJob Workspace', 'ATS for HR & agencies — pipeline, talents, mandates, placements.')}
${card('design/myjob/ui_kits/bewerber/index.html', '#0d9488', ICONS.bewerber, 'myJob for applicants', 'Track applications and assemble your dossier.')}
    </div>
${appsSection}
  </div>
</body>
</html>
`;

  fs.writeFileSync(path.join(ROOT, 'index.html'), html);
  return path.join(ROOT, 'index.html');
}

module.exports = { buildHome };

if (require.main === module) {
  console.log('Home geschrieben:', buildHome());
}
