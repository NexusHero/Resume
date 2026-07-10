import type { TalentDocuments } from './talent-documents.js';

/** Escape text for safe interpolation into HTML. */
function esc(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );
}

/**
 * Build a self-contained, print-ready HTML document (resume page + cover-letter
 * page) from a talent's saved documents. Pure and deterministic so it can be
 * asserted in tests; the Puppeteer → PDF step is a separate concern. The shared
 * style (accent colour, font, scale) drives both pages, so the export matches
 * what the editor previews.
 */
export interface DocumentsHtmlOptions {
  /** Pre-formatted letter date ("Zürich, 2.7.2026" carries the locale). */
  letterDate?: string;
}

export function documentsToHtml(
  documents: TalentDocuments,
  options: DocumentsHtmlOptions = {},
): string {
  const { contact, resume, letter, style } = documents;
  const accent = esc(style.accent);
  const strong = esc(style.strong);
  const font = esc(style.font).replace(/var\(--font-display\)|var\(--font-body\)/, 'Inter');
  const scale = Number.isFinite(style.size) ? style.size : 1;
  // Backward-compatible: rows saved before templates existed default to classic.
  const template =
    style.template === 'modern' || style.template === 'compact' ? style.template : 'classic';

  const experience = resume.experience
    .map(
      (e) => `
      <div class="entry">
        <div class="entry-head">
          <span class="entry-role">${esc(e.role)}${e.company ? ` · ${esc(e.company)}` : ''}</span>
          <span class="entry-meta">${esc(e.period)}${e.location ? ` · ${esc(e.location)}` : ''}</span>
        </div>
        ${e.bullets.length ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
        ${e.skills.length ? `<div class="tags">${e.skills.map((s) => `<span>${esc(s)}</span>`).join('')}</div>` : ''}
      </div>`,
    )
    .join('');

  const education = resume.education
    .map(
      (e) => `
      <div class="entry">
        <div class="entry-head">
          <span class="entry-role">${esc(e.degree)}${e.school ? ` · ${esc(e.school)}` : ''}</span>
          <span class="entry-meta">${esc(e.period)}</span>
        </div>
        ${e.note ? `<div class="note">${esc(e.note)}</div>` : ''}
      </div>`,
    )
    .join('');

  const skillGroups = resume.skillGroups
    .map(
      (g) =>
        `<div class="skillgroup"><span class="skilllabel">${esc(g.label)}</span> ${g.items
          .map((i) => esc(i))
          .join(' · ')}</div>`,
    )
    .join('');

  const letterAddress = [letter.firma, letter.ansprechpartner, letter.strasse, letter.plzOrt]
    .filter(Boolean)
    .map((l) => esc(l))
    .join('<br>');

  const letterBody = letter.absaetze.map((p) => `<p>${esc(p)}</p>`).join('');

  // Template-specific overrides layered on top of the shared base styles.
  const templateCss =
    template === 'modern'
      ? `.resume h1 { color: ${accent}; font-size: ${(26 * scale).toFixed(2)}px; }
         .contact { border-bottom-width: 3px; }
         h2 { border-left: 3px solid ${accent}; padding-left: 8px; }`
      : template === 'compact'
        ? `@page { margin: 14mm 14mm; }
           body { font-size: ${(9.5 * scale).toFixed(2)}px; line-height: 1.35; }
           .entry { margin-bottom: 6px; }
           h2 { margin: 10px 0 5px; }`
        : '';

  // Screen-only rules so the editor's live preview is an accurate A4 sheet
  // (same content width → same line breaks as the export). Print ignores these,
  // so the PDF is driven solely by the `@page` rules above and stays unchanged;
  // the padding here mirrors that page margin so preview and PDF line up.
  const pagePadding = template === 'compact' ? '14mm 14mm' : '20mm 18mm';
  const screenCss = `@media screen {
    html { background: #e9ebee; }
    body { padding: 16px 0; }
    .page { width: 210mm; min-height: 297mm; padding: ${pagePadding}; margin: 0 auto 16px; background: #fff; box-shadow: 0 2px 12px rgba(15, 22, 38, 0.16); }
  }`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: ${font}, -apple-system, system-ui, sans-serif; color: #14181f; font-size: ${(10.5 * scale).toFixed(2)}px; line-height: 1.5; margin: 0; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  h1 { font-size: ${(22 * scale).toFixed(2)}px; margin: 0 0 2px; color: #0f1626; letter-spacing: -0.02em; }
  .role { color: ${strong}; font-weight: 600; margin-bottom: 10px; }
  .contact { font-size: ${(9.5 * scale).toFixed(2)}px; color: #4b5563; border-bottom: 2px solid ${accent}; padding-bottom: 10px; margin-bottom: 14px; }
  .photo { float: right; width: 86px; height: 86px; object-fit: cover; border-radius: 8px; margin: 0 0 8px 12px; }
  h2 { font-size: ${(11 * scale).toFixed(2)}px; text-transform: uppercase; letter-spacing: 0.12em; color: ${strong}; margin: 16px 0 8px; }
  .summary { margin-bottom: 6px; }
  .entry { margin-bottom: 10px; }
  .entry-head { display: flex; justify-content: space-between; gap: 12px; }
  .entry-role { font-weight: 600; color: #0f1626; }
  .entry-meta, .note { color: #6b7280; font-size: ${(9 * scale).toFixed(2)}px; }
  ul { margin: 4px 0 4px 16px; padding: 0; }
  li { margin: 2px 0; }
  .tags { margin-top: 3px; }
  .tags span { display: inline-block; background: ${accent}1a; color: ${strong}; border-radius: 4px; padding: 1px 7px; margin: 2px 4px 0 0; font-size: ${(8.5 * scale).toFixed(2)}px; }
  .skillgroup { margin: 3px 0; }
  .skilllabel { font-weight: 600; color: ${strong}; }
  .cl-recipient { margin-bottom: 24px; }
  .cl-date { text-align: right; color: #555; margin: 4px 0 14px; }
  .cl-subject { font-weight: 700; color: #0f1626; margin-bottom: 14px; }
  .cl p { margin: 0 0 10px; }
  .cl-gruss { margin-top: 18px; }
  ${templateCss}
  ${screenCss}
</style>
</head>
<body class="tpl-${template}">
  <section id="doc-resume" class="page resume">
    ${
      contact.photo && /^data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+$/.test(contact.photo)
        ? `<img class="photo" src="${contact.photo}" alt="" />`
        : ''
    }
    <h1>${esc(contact.name)}</h1>
    <div class="role">${esc(contact.role)}</div>
    <div class="contact">${[contact.email, contact.phone, contact.location, contact.linkedin]
      .filter(Boolean)
      .map((c) => esc(c))
      .join('&nbsp;·&nbsp;')}</div>
    ${resume.summary ? `<h2>Profile</h2><div class="summary">${esc(resume.summary)}</div>` : ''}
    ${experience ? `<h2>Experience</h2>${experience}` : ''}
    ${education ? `<h2>Education</h2>${education}` : ''}
    ${skillGroups ? `<h2>Skills</h2>${skillGroups}` : ''}
  </section>
  <section id="doc-letter" class="page cl">
    ${letterAddress ? `<div class="cl-recipient">${letterAddress}</div>` : ''}
    ${options.letterDate ? `<div class="cl-date">${esc(options.letterDate)}</div>` : ''}
    ${letter.betreff ? `<div class="cl-subject">${esc(letter.betreff)}</div>` : ''}
    ${letter.anrede ? `<p>${esc(letter.anrede)}</p>` : ''}
    ${letterBody}
    <div class="cl-gruss">${esc(letter.gruss)}<br><br>${esc(contact.name)}</div>
  </section>
</body>
</html>`;
}
