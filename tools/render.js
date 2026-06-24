/**
 * Puppeteer rendering of the self-contained pages to print-quality PDF.
 * The cover letter can be rendered with a real recipient address injected
 * straight into the DOM (full vector quality — no rasterising, no stamping).
 */
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.join(__dirname, '..');
const fileUrl = (rel) => 'file://' + path.join(ROOT, rel);

function launch() { return puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); }

async function ready(page, sel) {
  await page.waitForSelector(sel, { timeout: 15000 });
  await page.evaluate(async () => { try { await document.fonts.ready; } catch (_) {} });
}
async function toPdf(page) {
  return Buffer.from(await page.pdf({ preferCSSPageSize: true, printBackground: true, timeout: 60000 }));
}

async function renderCV(browser, { lang = 'de' } = {}) {
  const page = await browser.newPage();
  try {
    await page.goto(fileUrl('ui_kits/cv/index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
    await ready(page, '.cv-page');
    if (lang === 'de') {
      await page.click('#lang button[data-v="de"]');
      await page.waitForFunction(() => document.documentElement.lang === 'de', { timeout: 8000 });
      await ready(page, '.cv-page');
    }
    return await toPdf(page);
  } finally { await page.close(); }
}

async function renderCoverLetter(browser, opts = {}) {
  const page = await browser.newPage();
  try {
    await page.goto(fileUrl('ui_kits/cover-letter/index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
    await ready(page, '.cl-page');
    await page.evaluate((o) => {
      const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      if (o.firma || o.strasse || o.plzort || o.ansprech) {
        const lines = ['<strong>' + esc(o.firma || '') + '</strong>'];
        if (o.ansprech) lines.push(esc(o.ansprech));
        if (o.strasse) lines.push(esc(o.strasse));
        if (o.plzort) lines.push(esc(o.plzort));
        const r = document.querySelector('.cl-recipient');
        if (r) r.innerHTML = lines.join('<br>');
      }
      if (o.stelle) {
        const s = document.querySelector('.cl-subject');
        if (s) s.textContent = 'Bewerbung als ' + o.stelle + (o.referenz ? ' — Referenz: ' + o.referenz : '');
      }
      if (o.ort || o.datum) {
        const d = document.querySelector('.cl-date');
        if (d) d.textContent = (o.ort || '') + (o.ort && o.datum ? ', ' : '') + (o.datum || '');
      }
    }, opts);
    await page.evaluate(async () => { try { await document.fonts.ready; } catch (_) {} });
    return await toPdf(page);
  } finally { await page.close(); }
}

module.exports = { launch, renderCV, renderCoverLetter };
