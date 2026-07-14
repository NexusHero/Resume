import type { TalentDocuments } from './talent-documents.js';
import { DOCUMENT_FONT_FACE_CSS } from './document-fonts.js';

/** Escape text for safe interpolation into HTML. */
function esc(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );
}

/**
 * Sanitize a user-controlled colour/font value for safe interpolation into a
 * raw CSS declaration inside the embedded `<style>` block. Unlike `esc()` (HTML
 * escaping), this is a CSS context: `{ } ; ( ) ' " newline` etc. can break out
 * of the custom property and inject arbitrary rules (e.g. `@import url(...)`),
 * which a headless-Chromium render would then fetch server-side. Keeps only
 * characters real colour/font values use (hex, `rgb()`/`rgba()`, `var(--x)`,
 * font names with spaces/hyphens); the `(` `)` here are safe because every
 * other CSS metacharacter is already stripped.
 */
function cssValue(value: unknown): string {
  return String(value ?? '').replace(/[^a-zA-Z0-9 #.,()%_-]/g, '');
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
  const accent = cssValue(style.accent);
  const strong = cssValue(style.strong);
  const font = cssValue(style.font).replace(/var\(--font-display\)|var\(--font-body\)/, 'Inter');
  const scale = Number.isFinite(style.size) ? style.size : 1;
  const px = (n: number) => `${(n * scale).toFixed(2)}px`;
  // Backward-compatible: rows saved before templates existed default to classic.
  const template = (['modern', 'compact', 'ink'] as const).includes(
    style.template as 'modern' | 'compact' | 'ink',
  )
    ? style.template
    : 'classic';
  const isInk = template === 'ink';

  // The ink template is a full portfolio-grade redesign (dark two-column CV +
  // clean cover letter). It owns its whole document, so it renders through a
  // dedicated builder rather than the shared classic/modern/compact base.
  if (isInk) return inkDocument(documents, options);

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

  const resumeSection = `<section id="doc-resume" class="page resume">
    ${photoOk ? `<img class="photo" src="${contact.photo}" alt="" />` : ''}
    <h1>${esc(contact.name)}</h1>
    <div class="role">${esc(contact.role)}</div>
    <div class="contact">${[contact.email, contact.phone, contact.location, contact.linkedin]
      .filter(Boolean)
      .map((c) => esc(c))
      .join('&nbsp;·&nbsp;')}</div>
    ${resume.summary ? `<h2>Profil</h2><div class="summary">${esc(resume.summary)}</div>` : ''}
    ${experience ? `<h2>Berufserfahrung</h2>${experience}` : ''}
    ${education ? `<h2>Ausbildung</h2>${education}` : ''}
    ${skillGroups ? `<h2>Kenntnisse</h2>${skillGroups}` : ''}
  </section>`;

  const letterInner = `
    ${letterAddress ? `<div class="cl-recipient">${letterAddress}</div>` : ''}
    ${options.letterDate ? `<div class="cl-date">${esc(options.letterDate)}</div>` : ''}
    ${letter.betreff ? `<div class="cl-subject">${esc(letter.betreff)}</div>` : ''}
    ${letter.anrede ? `<p>${esc(letter.anrede)}</p>` : ''}
    ${letterBody}
    <div class="cl-gruss">${esc(letter.gruss)}<br><br>${esc(contact.name)}</div>`;

  const letterSection = `<section id="doc-letter" class="page cl">${letterInner}</section>`;

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
<html lang="de">
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

/** Feather-style line icons (24×24 stroke grid) used across the ink CV. */
function inkIcon(name: string, size = 16): string {
  const p: Record<string, string> = {
    phone:
      '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    linkedin:
      '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    briefcase:
      '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    cap: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    calendar:
      '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  };
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;flex-shrink:0;vertical-align:-2px">${p[name] ?? ''}</svg>`;
}

/**
 * The "Ink" template — a portfolio-grade CV that mirrors the reference design
 * (`docs/images/cv.png`): a dark two-column résumé (rounded photo, role pill,
 * icon contact rows and skill chips in the sidebar; eyebrow-labelled sections,
 * an experience timeline with node dots, date pills and tech-stack chips in the
 * light main column) plus a clean, matching cover letter. Rendered from the one
 * render source (ADR-0052) with the display/body/mono webfonts embedded, so the
 * editor preview and the exported PDF are byte-identical and typographically
 * exact with no network request or host-font dependency.
 */
function inkDocument(documents: TalentDocuments, options: DocumentsHtmlOptions): string {
  const { contact, resume, letter, style } = documents;
  const accent = cssValue(style.accent) || '#2563eb';
  const accentStrong = cssValue(style.strong) || '#1d4ed8';
  const accentOnDark = cssValue(style.onDark) || '#60a5fa';
  const scale = Number.isFinite(style.size) ? style.size : 1;
  const s = (n: number) => `${(n * scale).toFixed(1)}px`;
  const photoOk =
    !!contact.photo && /^data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+$/.test(contact.photo);

  // ---- Sidebar: contact rows + skill chip groups ----
  const contactRows = (
    [
      contact.phone && { icon: 'phone', v: contact.phone },
      contact.email && { icon: 'mail', v: contact.email },
      contact.location && { icon: 'pin', v: contact.location },
      contact.linkedin && { icon: 'linkedin', v: contact.linkedin },
    ].filter(Boolean) as { icon: string; v: string }[]
  )
    .map(
      (c) =>
        `<li class="ink-contact"><span class="ink-contact-ic">${inkIcon(c.icon, 14)}</span><span class="ink-contact-tx">${esc(c.v)}</span></li>`,
    )
    .join('');

  const sideSkills = resume.skillGroups
    .map(
      (g, gi) =>
        `<div class="ink-skillgroup"><h3>${esc(g.label)}</h3><div class="ink-chips">${g.items
          .map((it) => `<span class="ink-chip${gi === 0 ? ' is-light' : ''}">${esc(it)}</span>`)
          .join('')}</div></div>`,
    )
    .join('');

  const sidebar = `<aside class="ink-sidebar">
      <div class="ink-profile">
        ${photoOk ? `<div class="ink-avatar"><img src="${contact.photo}" alt="" /></div>` : ''}
        <h1 class="ink-name">${esc(contact.name)}</h1>
        ${contact.role ? `<span class="ink-role">${esc(contact.role)}</span>` : ''}
      </div>
      ${contactRows ? `<section class="ink-side-sec"><h2 class="ink-side-title">${inkIcon('user', 14)}Kontakt</h2><ul class="ink-contact-list">${contactRows}</ul></section>` : ''}
      ${sideSkills ? `<section class="ink-side-sec"><h2 class="ink-side-title">${inkIcon('zap', 14)}Kenntnisse</h2>${sideSkills}</section>` : ''}
    </aside>`;

  // ---- Main column: eyebrow-labelled sections ----
  const sectionHead = (kicker: string, icon: string, title: string) =>
    `<header class="ink-sec-head"><div class="ink-kicker">${inkIcon(icon, 13)}${esc(kicker)}</div><h2>${esc(title)}</h2></header>`;

  const jobs = resume.experience
    .map((e, i) => {
      const company = e.company
        ? ` · <span class="ink-co">${esc(e.company)}${e.location ? `, ${esc(e.location)}` : ''}</span>`
        : '';
      const pill = e.period
        ? `<span class="ink-pill${i === 0 ? ' is-accent' : ''}">${inkIcon('calendar', 12)}${esc(e.period)}</span>`
        : '';
      const tech = e.skills.length
        ? `<div class="ink-tech"><span class="ink-tech-l">${inkIcon('zap', 12)}Tech Stack</span><div class="ink-chips">${e.skills
            .map((t) => `<span class="ink-chip is-outline">${esc(t)}</span>`)
            .join('')}</div></div>`
        : '';
      const bullets = e.bullets.length
        ? `<ul class="ink-bullets">${e.bullets.map((b) => `<li><span>${esc(b)}</span></li>`).join('')}</ul>`
        : '';
      return `<article class="ink-job${i === 0 ? ' is-current' : ''}">
        <span class="ink-node" aria-hidden="true"></span>
        <div class="ink-job-head"><h3>${esc(e.role)}${company}</h3>${pill}</div>
        ${tech}${bullets}
      </article>`;
    })
    .join('');

  const edu = resume.education
    .map(
      (e) =>
        `<div class="ink-edu"><div class="ink-edu-head"><div><h3>${esc(e.degree)}</h3>${e.school ? `<p>${esc(e.school)}</p>` : ''}</div>${e.period ? `<span class="ink-pill">${inkIcon('calendar', 12)}${esc(e.period)}</span>` : ''}</div>${e.note ? `<p class="ink-edu-note">${esc(e.note)}</p>` : ''}</div>`,
    )
    .join('');

  const mainCol = `<main class="ink-main">
      ${resume.summary ? `<section class="ink-main-sec">${sectionHead('Über mich', 'user', 'Profil')}<p class="ink-summary">${esc(resume.summary)}</p></section>` : ''}
      ${jobs ? `<section class="ink-main-sec">${sectionHead('Werdegang', 'briefcase', 'Berufserfahrung')}<div class="ink-timeline"><span class="ink-rail" aria-hidden="true"></span>${jobs}</div></section>` : ''}
      ${edu ? `<section class="ink-main-sec">${sectionHead('Bildung', 'cap', 'Ausbildung')}<div class="ink-edu-list">${edu}</div></section>` : ''}
    </main>`;

  // ---- Cover letter: clean sheet, accent-ruled name header (no dark band) ----
  const letterAddress = [letter.firma, letter.ansprechpartner, letter.strasse, letter.plzOrt]
    .filter(Boolean)
    .map((l) => esc(l))
    .join('<br>');
  const letterBody = letter.absaetze.map((p) => `<p>${esc(p)}</p>`).join('');
  const letterSection = `<section id="doc-letter" class="ink-letter">
      <header class="ink-letter-head">
        <h1>${esc(contact.name)}</h1>
        ${contact.role ? `<span class="ink-letter-role">${esc(contact.role)}</span>` : ''}
      </header>
      <div class="ink-letter-body">
        ${letterAddress ? `<div class="ink-lt-recipient">${letterAddress}</div>` : ''}
        ${options.letterDate ? `<div class="ink-lt-date">${esc(options.letterDate)}</div>` : ''}
        ${letter.betreff ? `<div class="ink-lt-subject">${esc(letter.betreff)}</div>` : ''}
        ${letter.anrede ? `<p>${esc(letter.anrede)}</p>` : ''}
        ${letterBody}
        <div class="ink-lt-gruss">${esc(letter.gruss)}<br><br>${esc(contact.name)}</div>
      </div>
    </section>`;

  const css = `${DOCUMENT_FONT_FACE_CSS}
  :root {
    --ink-850:#0f1626; --ink-900:#0b1220; --ink-700:#1f2940;
    --border:#e5e7eb; --border-strong:#cbd5e1; --surface-sunk:#f1f5f9;
    --text-heading:#0a0a0a; --text-body:#0f172a; --text-muted:#475569; --text-soft:#64748b;
    --accent:${accent}; --accent-strong:${accentStrong}; --accent-on-dark:${accentOnDark};
    --accent-soft:${accent}1a; --accent-border:${accent}59;
    --sidebar-glass:rgba(255,255,255,0.06); --sidebar-border:rgba(255,255,255,0.10);
    --sidebar-border-strong:rgba(255,255,255,0.16); --sidebar-muted:rgba(241,245,249,0.80);
    --fbody:'Inter',-apple-system,system-ui,'Segoe UI',sans-serif;
    --fdisp:'Space Grotesk',var(--fbody); --fmono:'JetBrains Mono',ui-monospace,'SFMono-Regular',Menlo,monospace;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: var(--fbody); color: var(--text-body); font-size: ${s(15)}; line-height: 1.6;
    -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  h1, h2, h3 { font-family: var(--fdisp); letter-spacing: -0.015em; color: var(--text-heading); }

  @page { size: A4; margin: 9mm; }

  /* ---- Layout ---- */
  .ink-layout { display: grid; grid-template-columns: 34% 1fr; min-height: 279mm;
    background: linear-gradient(to right, var(--ink-900) 0, var(--ink-900) 34%, #fff 34%);
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* Print-only full-height dark spine (see @media print). Hidden on screen,
     where the layout gradient already paints the band on the single A4 card. */
  .ink-print-band { display: none; }

  /* ---- Sidebar (dark) ---- */
  .ink-sidebar { position: relative; color: #f1f5f9; padding: 14mm 9mm;
    background:
      radial-gradient(120% 42% at 0% 0%, ${accent}26 0%, transparent 55%),
      linear-gradient(180deg, var(--ink-850) 0%, var(--ink-900) 100%);
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .ink-sidebar::after { content: ""; position: absolute; inset: 0; pointer-events: none;
    background-image: radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px); background-size: 22px 22px;
    -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,.35) 0%, transparent 70%);
    mask-image: linear-gradient(180deg, rgba(0,0,0,.35) 0%, transparent 70%); opacity: .6; }
  .ink-sidebar > * { position: relative; z-index: 1; }
  .ink-profile { margin-bottom: 26px; padding-bottom: 22px; border-bottom: 1px solid var(--sidebar-border); }
  .ink-avatar { width: 62mm; max-width: 205px; aspect-ratio: 1/1; border-radius: 12px; overflow: hidden;
    border: 1px solid var(--sidebar-border-strong); background: var(--sidebar-glass);
    box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 24px -8px rgba(0,0,0,.4); }
  .ink-avatar img { width: 100%; height: 100%; object-fit: cover; object-position: center 15%; display: block; transform: scale(1.2); transform-origin: center 18%; }
  .ink-name { font-size: ${s(34)}; font-weight: 700; line-height: 1.05; letter-spacing: -0.025em; color: #fff; margin: 18px 0 10px; }
  .ink-role { display: inline-block; font-family: var(--fmono); font-size: ${s(10.5)}; font-weight: 500;
    letter-spacing: .12em; text-transform: uppercase; color: #fff; background: rgba(255,255,255,0.12);
    border: 1px solid var(--sidebar-border-strong); padding: 5px 11px; border-radius: 999px; }
  .ink-side-sec { margin-bottom: 26px; }
  .ink-side-sec:last-child { margin-bottom: 0; }
  .ink-side-title { display: flex; align-items: center; gap: 8px; font-family: var(--fmono); font-size: ${s(10.5)};
    font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #fff; margin: 0 0 13px;
    padding-bottom: 9px; border-bottom: 1px solid var(--sidebar-border); }
  .ink-contact-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 11px; }
  .ink-contact { display: flex; align-items: flex-start; gap: 10px; font-size: ${s(12.5)}; color: var(--sidebar-muted); line-height: 1.45; }
  .ink-contact-ic { width: 27px; height: 27px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
    background: var(--sidebar-glass); border: 1px solid var(--sidebar-border); border-radius: 7px; color: #fff; margin-top: 1px; }
  .ink-contact-tx { padding-top: 4px; word-break: break-word; }
  .ink-skillgroup { margin-bottom: 16px; }
  .ink-skillgroup:last-child { margin-bottom: 0; }
  .ink-skillgroup h3 { font-family: var(--fmono); font-size: ${s(10.5)}; font-weight: 600; color: #fff; opacity: .85;
    margin: 0 0 8px; letter-spacing: .08em; text-transform: uppercase; }
  .ink-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .ink-chip { display: inline-block; font-family: var(--fmono); font-size: ${s(11)}; font-weight: 500; line-height: 1.4;
    padding: 3px 9px; border-radius: 6px; white-space: nowrap;
    background: var(--sidebar-glass); color: #f1f5f9; border: 1px solid var(--sidebar-border-strong);
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .ink-chip.is-light { background: #fff; color: var(--ink-900); border-color: #fff; font-weight: 600; }

  /* ---- Main column (light) ---- */
  .ink-main { background: #fff; padding: 14mm 11mm; color: var(--text-body);
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .ink-main p, .ink-main li { text-align: justify; -webkit-hyphens: auto; hyphens: auto; }
  .ink-main-sec { margin-bottom: 30px; }
  .ink-main-sec:last-child { margin-bottom: 0; }
  .ink-sec-head { margin-bottom: 18px; }
  .ink-kicker { display: flex; align-items: center; gap: 9px; font-family: var(--fmono); font-size: ${s(10.5)};
    font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--text-soft); margin: 0 0 7px; }
  .ink-sec-head h2 { font-size: ${s(24)}; font-weight: 700; margin: 0; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
  .ink-summary { margin: 0; color: var(--text-body); }

  /* ---- Experience timeline ---- */
  .ink-timeline { position: relative; padding-left: 30px; }
  .ink-rail { position: absolute; left: 6px; top: 8px; bottom: 8px; width: 1.5px;
    background: linear-gradient(to bottom, var(--border) 0%, var(--border-strong) 20%, var(--border-strong) 80%, var(--border) 100%); }
  .ink-job { position: relative; margin-bottom: 26px; }
  .ink-job:last-child { margin-bottom: 0; }
  .ink-node { position: absolute; left: -30px; top: 6px; width: 13px; height: 13px; border-radius: 50%;
    background: #fff; border: 2px solid var(--text-heading); box-shadow: 0 0 0 4px #fff, 0 0 0 5px var(--border);
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .ink-job.is-current .ink-node { background: var(--accent); border-color: var(--accent); }
  .ink-job-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 4px; }
  .ink-job-head h3 { font-size: ${s(16)}; font-weight: 700; margin: 0; }
  .ink-co { color: var(--text-muted); font-weight: 600; }
  .ink-pill { display: inline-flex; align-items: center; gap: 6px; font-family: var(--fmono); font-size: ${s(11.5)};
    font-weight: 500; white-space: nowrap; font-variant-numeric: tabular-nums; padding: 3px 9px; border-radius: 999px;
    background: var(--surface-sunk); border: 1px solid var(--border); color: var(--text-soft);
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .ink-pill.is-accent { background: var(--accent-soft); border-color: var(--accent-border); color: var(--accent-strong); }
  .ink-tech { margin: 11px 0 12px; display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
  .ink-tech-l { display: inline-flex; align-items: center; gap: 5px; font-family: var(--fmono); font-size: ${s(10)};
    font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--text-soft); padding-top: 5px; flex-shrink: 0; }
  .ink-chip.is-outline { background: #fff; color: var(--text-muted); border-color: var(--border-strong); }
  .ink-bullets { margin: 8px 0 0; padding-left: 18px; }
  .ink-bullets li { color: var(--accent); margin-bottom: 4px; font-size: ${s(13.5)}; line-height: 1.6; }
  .ink-bullets li span { color: var(--text-body); }

  /* ---- Education ---- */
  .ink-edu-list { display: flex; flex-direction: column; gap: 12px; }
  .ink-edu { padding: 15px 18px; background: #fff; border: 1px solid var(--border); border-radius: 12px; }
  .ink-edu-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 8px; }
  .ink-edu-head h3 { font-size: ${s(15.5)}; font-weight: 700; margin: 0; }
  .ink-edu-head p { color: var(--text-muted); font-weight: 500; font-size: ${s(12.5)}; margin: 3px 0 0; }
  .ink-edu-note { color: var(--text-muted); font-size: ${s(13)}; margin: 8px 0 0; }

  /* ---- Cover letter (clean) ---- */
  .ink-letter { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .ink-letter-head { padding: 14mm 16mm 0; }
  .ink-letter-head h1 { font-size: ${s(26)}; font-weight: 700; margin: 0; }
  .ink-letter-role { display: inline-block; font-family: var(--fmono); font-size: ${s(11)}; font-weight: 500;
    letter-spacing: .1em; text-transform: uppercase; color: var(--accent-strong); margin-top: 7px;
    padding-bottom: 12px; border-bottom: 2px solid var(--accent); }
  .ink-letter-body { padding: 12mm 16mm 14mm; }
  .ink-letter-body p { margin: 0 0 11px; text-align: justify; -webkit-hyphens: auto; hyphens: auto; }
  .ink-lt-recipient { margin-bottom: 22px; line-height: 1.55; }
  .ink-lt-date { text-align: right; color: var(--text-soft); margin: 4px 0 16px; font-variant-numeric: tabular-nums; }
  .ink-lt-subject { font-family: var(--fdisp); font-weight: 700; color: var(--text-heading); margin-bottom: 14px; }
  .ink-lt-gruss { margin-top: 18px; }

  /* ---- Screen: A4 sheets stacked, like the export ---- */
  @media screen {
    html { background: #e2e8f0; }
    body { padding: 16px 0; }
    .ink-page, .ink-letter { width: 210mm; min-height: 297mm; margin: 0 auto 16px; background: #fff; overflow: hidden;
      border-radius: 14px; box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 10px 30px -10px rgba(15,23,42,.18), 0 30px 60px -30px rgba(15,23,42,.25); }
    .ink-layout { min-height: 297mm; }
  }

  /* ---- Print: full-bleed sheet, dark band spans every page ---- */
  @media print {
    html, body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    /* The résumé flows across as many pages as it needs; the letter always
       starts on a fresh page. Only a break-before here (no break-after on the
       résumé) so no empty page is inserted between them. */
    .ink-letter { break-before: page; }
    /* The dark spine is painted by a position:fixed element, which a printer
       repeats on every page — so the sidebar band runs full-height even where a
       résumé overflows onto a second page (no mid-page dark→white cut). The
       sidebar sits transparently on top; the white main column masks the band's
       right edge; the cover-letter sheet fills its page in white to cover the
       band entirely, so no spine leaks onto the letter. */
    .ink-layout { background: none; }
    .ink-print-band { display: block; position: fixed; left: 0; top: 0; bottom: 0; width: 34%; z-index: 0;
      background: linear-gradient(180deg, var(--ink-850) 0%, var(--ink-900) 100%);
      -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .ink-sidebar { position: relative; z-index: 1; background:
      radial-gradient(120% 42% at 0% 0%, ${accent}26 0%, transparent 55%), transparent; }
    .ink-sidebar::after { display: none; }
    .ink-main { position: relative; z-index: 1; }
    .ink-letter { position: relative; z-index: 1; min-height: 279mm; background: #fff; }
    .ink-job, .ink-edu { break-inside: avoid; }
    .ink-sec-head { break-inside: avoid; break-after: avoid; }
  }`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<style>${css}</style>
</head>
<body class="tpl-ink">
  <div class="ink-print-band" aria-hidden="true"></div>
  <section id="doc-resume" class="ink-page">
    <div class="ink-layout">
      ${sidebar}
      ${mainCol}
    </div>
  </section>
  ${letterSection}
</body>
</html>`;
}
