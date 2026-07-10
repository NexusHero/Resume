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
 *
 * The `ink` template is the app's signature two-column look — a dark sidebar
 * (contact + skills) beside a light content column. It lives here, in the one
 * render source (ADR-0052), so the editor preview and the PDF stay identical.
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
  const onDark = esc(style.onDark) || '#7aa7f5';
  const font = esc(style.font).replace(/var\(--font-display\)|var\(--font-body\)/, 'Inter');
  const scale = Number.isFinite(style.size) ? style.size : 1;
  const px = (n: number) => `${(n * scale).toFixed(2)}px`;
  // Backward-compatible: rows saved before templates existed default to classic.
  const template = (['modern', 'compact', 'ink'] as const).includes(
    style.template as 'modern' | 'compact' | 'ink',
  )
    ? style.template
    : 'classic';
  const isInk = template === 'ink';

  const photoOk =
    !!contact.photo && /^data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+$/.test(contact.photo);

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

  // Single-column skills line (classic/modern/compact only — ink moves them to
  // the sidebar as chips).
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

  // ---- Ink template pieces (dark sidebar) ----
  const inkContactRows = [contact.email, contact.phone, contact.location, contact.linkedin]
    .filter(Boolean)
    .map((v) => `<div class="ink-crow">${esc(v)}</div>`)
    .join('');
  const inkSkills = resume.skillGroups
    .map(
      (g) =>
        `<div class="ink-sg"><div class="ink-sg-label">${esc(g.label)}</div><div class="ink-chips">${g.items
          .map((i) => `<span>${esc(i)}</span>`)
          .join('')}</div></div>`,
    )
    .join('');
  const inkSide = `<aside class="ink-side">
      ${photoOk ? `<img class="ink-photo" src="${contact.photo}" alt="" />` : ''}
      <div class="ink-name">${esc(contact.name)}</div>
      <div class="ink-role">${esc(contact.role)}</div>
      ${inkContactRows ? `<div class="ink-sec-label">Contact</div>${inkContactRows}` : ''}
      ${inkSkills ? `<div class="ink-sec-label">Skills</div>${inkSkills}` : ''}
    </aside>`;

  const mainBody = `
    ${resume.summary ? `<h2>Profile</h2><div class="summary">${esc(resume.summary)}</div>` : ''}
    ${experience ? `<h2>Experience</h2>${experience}` : ''}
    ${education ? `<h2>Education</h2>${education}` : ''}`;

  const resumeSection = isInk
    ? `<section id="doc-resume" class="page resume">
    <div class="ink-rail"></div>
    ${inkSide}
    <main class="ink-main">${mainBody}</main>
  </section>`
    : `<section id="doc-resume" class="page resume">
    ${photoOk ? `<img class="photo" src="${contact.photo}" alt="" />` : ''}
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
  </section>`;

  const letterInner = `
    ${letterAddress ? `<div class="cl-recipient">${letterAddress}</div>` : ''}
    ${options.letterDate ? `<div class="cl-date">${esc(options.letterDate)}</div>` : ''}
    ${letter.betreff ? `<div class="cl-subject">${esc(letter.betreff)}</div>` : ''}
    ${letter.anrede ? `<p>${esc(letter.anrede)}</p>` : ''}
    ${letterBody}
    <div class="cl-gruss">${esc(letter.gruss)}<br><br>${esc(contact.name)}</div>`;

  const letterSection = isInk
    ? `<section id="doc-letter" class="page cl">
    <div class="ink-letter-head"><div class="n">${esc(contact.name)}</div><div class="r">${esc(contact.role)}</div></div>
    <div class="ink-letter-body">${letterInner}</div>
  </section>`
    : `<section id="doc-letter" class="page cl">${letterInner}</section>`;

  // Template-specific overrides layered on top of the shared base styles.
  const templateCss =
    template === 'modern'
      ? `.resume h1 { color: ${accent}; font-size: ${px(26)}; }
         .contact { border-bottom-width: 3px; }
         h2 { border-left: 3px solid ${accent}; padding-left: 8px; }`
      : template === 'compact'
        ? `@page { margin: 14mm 14mm; }
           body { font-size: ${px(9.5)}; line-height: 1.35; }
           .entry { margin-bottom: 6px; }
           h2 { margin: 10px 0 5px; }`
        : isInk
          ? // Full-bleed sidebar: the page owns its own padding, so the ink spine
            // reaches the paper edge. The dark rail is ABSOLUTE on screen (one per
            // résumé sheet in the stacked preview) and FIXED in print, where a
            // fixed element repeats on every page — so the spine runs full-height
            // on a résumé that overflows onto a second page. The rail lives in the
            // résumé section only; the letter section paints white over it (higher
            // stacking level) so no dark spine leaks onto the cover-letter page. A
            // clearfix contains the floated sidebar without `overflow:hidden`
            // (which would clip a two-page résumé).
            `@page { margin: 0; }
             .tpl-ink .page { position: relative; padding: 0; min-height: 297mm; }
             .tpl-ink .page::after { content: ''; display: table; clear: both; }
             .ink-rail { position: absolute; top: 0; bottom: 0; left: 0; width: 68mm; z-index: 0;
               background: linear-gradient(165deg, #1b2433 0%, #0d1220 100%);
               -webkit-print-color-adjust: exact; print-color-adjust: exact; }
             @media print { .ink-rail { position: fixed; } }
             .ink-side { position: relative; z-index: 1; float: left; width: 68mm; padding: 18mm 12mm; color: #fff; }
             .ink-main { position: relative; z-index: 1; margin-left: 68mm; padding: 18mm 16mm; }
             .tpl-ink .cl { position: relative; z-index: 1; background: #fff;
               -webkit-print-color-adjust: exact; print-color-adjust: exact; }
             .ink-photo { width: 74px; height: 74px; object-fit: cover; border-radius: 10px; margin-bottom: 14px; }
             .ink-name { font-family: ${font}, sans-serif; font-size: ${px(25)}; font-weight: 700; letter-spacing: -0.02em; line-height: 1.12; }
             .ink-role { color: ${onDark}; font-weight: 600; font-size: ${px(12)}; margin-top: 5px; }
             .ink-sec-label { font-size: ${px(9)}; letter-spacing: 0.16em; text-transform: uppercase; color: #8ea0bf; margin: 22px 0 11px; }
             .ink-crow { font-size: ${px(9.5)}; color: #c7d2e4; margin-bottom: 7px; word-break: break-word; line-height: 1.45; }
             .ink-sg { margin-bottom: 12px; }
             .ink-sg-label { font-size: ${px(9)}; color: #8ea0bf; margin-bottom: 6px; }
             .ink-chips span { display: inline-block; font-size: ${px(8.5)}; color: #fff;
               background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16);
               border-radius: 4px; padding: 2px 7px; margin: 0 5px 5px 0;
               -webkit-print-color-adjust: exact; print-color-adjust: exact; }
             .ink-main h2:first-child { margin-top: 0; }
             .ink-letter-head { background: linear-gradient(165deg, #1b2433 0%, #0d1220 100%);
               color: #fff; padding: 24px 44px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
             .ink-letter-head .n { font-family: ${font}, sans-serif; font-size: ${px(22)}; font-weight: 700; letter-spacing: -0.02em; }
             .ink-letter-head .r { color: ${onDark}; font-weight: 600; font-size: ${px(12)}; margin-top: 3px; }
             .ink-letter-body { padding: 34px 44px; }`
          : '';

  // Screen-only rules so the editor's live preview is an accurate A4 sheet
  // (same content width → same line breaks as the export). Print ignores these,
  // so the PDF is driven solely by the `@page` rules above and stays unchanged;
  // the padding here mirrors that page margin so preview and PDF line up. Ink is
  // full-bleed (padding 0) since its columns carry their own padding.
  const pagePadding = isInk ? '0' : template === 'compact' ? '14mm 14mm' : '20mm 18mm';
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
  body { font-family: ${font}, -apple-system, system-ui, sans-serif; color: #14181f; font-size: ${px(10.5)}; line-height: 1.5; margin: 0; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  h1 { font-size: ${px(22)}; margin: 0 0 2px; color: #0f1626; letter-spacing: -0.02em; }
  .role { color: ${strong}; font-weight: 600; margin-bottom: 10px; }
  .contact { font-size: ${px(9.5)}; color: #4b5563; border-bottom: 2px solid ${accent}; padding-bottom: 10px; margin-bottom: 14px; }
  .photo { float: right; width: 86px; height: 86px; object-fit: cover; border-radius: 8px; margin: 0 0 8px 12px; }
  h2 { font-size: ${px(11)}; text-transform: uppercase; letter-spacing: 0.12em; color: ${strong}; margin: 16px 0 8px; }
  .summary { margin-bottom: 6px; }
  .entry { margin-bottom: 10px; }
  .entry-head { display: flex; justify-content: space-between; gap: 12px; }
  .entry-role { font-weight: 600; color: #0f1626; }
  .entry-meta, .note { color: #6b7280; font-size: ${px(9)}; }
  ul { margin: 4px 0 4px 16px; padding: 0; }
  li { margin: 2px 0; }
  .tags { margin-top: 3px; }
  .tags span { display: inline-block; background: ${accent}1a; color: ${strong}; border-radius: 4px; padding: 1px 7px; margin: 2px 4px 0 0; font-size: ${px(8.5)}; }
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
  ${resumeSection}
  ${letterSection}
</body>
</html>`;
}
