/**
 * Generate print-ready PDFs from the self-contained HTML pages, then refresh
 * the Bewerbungsmappe builder (with CV + cover letter pre-loaded) and the
 * home page.
 *
 *   npm run pdf
 *
 * Output (repo root): Lebenslauf-DE.pdf, Lebenslauf-EN.pdf, Anschreiben.pdf
 */
const fs = require('fs');
const path = require('path');
const { launch, renderCV, renderCoverLetter } = require('./tools/render');
const { buildBuilder } = require('./tools/build-builder');
const { buildHome } = require('./tools/build-home');

const ROOT = __dirname;
const write = (name, buf) => { fs.writeFileSync(path.join(ROOT, name), buf); console.log('  ✓', name); };

(async () => {
  const browser = await launch();
  try {
    write('Lebenslauf-EN.pdf', await renderCV(browser, { lang: 'en' }));
    write('Lebenslauf-DE.pdf', await renderCV(browser, { lang: 'de' }));
    write('Anschreiben.pdf', await renderCoverLetter(browser));
  } finally {
    await browser.close();
  }

  const builderPath = await buildBuilder([
    { name: 'Anschreiben.pdf', bytes: fs.readFileSync(path.join(ROOT, 'Anschreiben.pdf')) },
    { name: 'Lebenslauf-DE.pdf', bytes: fs.readFileSync(path.join(ROOT, 'Lebenslauf-DE.pdf')) },
  ]);
  console.log('  ✓ Builder aktualisiert (' + path.relative(ROOT, builderPath) + ')');

  buildHome();
  console.log('  ✓ Startseite aktualisiert (index.html)');

  console.log('\nFertig. Öffne index.html als Einstieg, oder starte die API mit "npm run serve".');
})().catch((err) => {
  console.error('PDF-Erzeugung fehlgeschlagen:', err);
  process.exit(1);
});
