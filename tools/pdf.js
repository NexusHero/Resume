/** PDF merge helper (pdf-lib). */
const path = require('path');
const { PDFDocument } = require(path.join(__dirname, '..', 'vendor/pdf-lib.min.js'));

async function mergePdfs(buffers, { title } = {}) {
  const out = await PDFDocument.create();
  if (title) out.setTitle(title);
  for (const b of buffers) {
    const src = await PDFDocument.load(b, { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return Buffer.from(await out.save());
}

module.exports = { mergePdfs };
