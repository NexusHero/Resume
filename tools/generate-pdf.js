/**
 * Generate print-ready PDFs from the self-contained CV and cover-letter print
 * templates (design/documents/ui_kits/{cv,cover-letter}) — the same templates
 * the Workspace's PDF export renders.
 *
 *   npm run pdf
 *
 * Output (repo root): Lebenslauf-DE.pdf, Lebenslauf-EN.pdf, Anschreiben.pdf
 */
const fs = require('fs');
const path = require('path');
const { launch, renderCV, renderCoverLetter } = require('./render');

const ROOT = path.join(__dirname, '..');
const write = (name, buf) => {
  fs.writeFileSync(path.join(ROOT, name), buf);
  console.log('  ✓', name);
};

(async () => {
  const browser = await launch();
  try {
    write('Lebenslauf-EN.pdf', await renderCV(browser, { lang: 'en' }));
    write('Lebenslauf-DE.pdf', await renderCV(browser, { lang: 'de' }));
    write('Anschreiben.pdf', await renderCoverLetter(browser));
  } finally {
    await browser.close();
  }

  console.log('\nFertig. Starte die App mit "npm run serve" (öffnet direkt den Workspace).');
})().catch((err) => {
  console.error('PDF-Erzeugung fehlgeschlagen:', err);
  process.exit(1);
});
