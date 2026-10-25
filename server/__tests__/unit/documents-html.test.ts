import { documentsToHtml } from '../../src/domain/documents-html.js';
import type { TalentDocuments } from '../../src/domain/talent-documents.js';

const documents: TalentDocuments = {
  ownerId: 'owner1',
  talentId: 't1',
  contact: {
    name: 'Lena Brandt',
    role: 'Product Designer',
    email: 'lena@example.com',
    phone: '+49 151',
    location: 'Leipzig',
    linkedin: 'linkedin.com/in/lena',
  },
  resume: {
    summary: 'A designer with taste.',
    experience: [
      {
        role: 'Designer',
        company: 'Aurora',
        period: '2020—',
        location: 'Leipzig',
        bullets: ['Built the design system'],
        skills: ['Figma'],
      },
    ],
    education: [{ degree: 'B.A.', school: 'HfG', period: '2012—2016', note: 'Note 1.9' }],
    skillGroups: [{ label: 'Tools', items: ['Figma', 'Sketch'] }],
  },
  letter: {
    firma: 'Aurora Systems GmbH',
    ansprechpartner: 'Frau Vogel',
    strasse: 'Hauptstr. 1',
    plzOrt: '04109 Leipzig',
    betreff: 'Bewerbung als Designerin',
    anrede: 'Sehr geehrte Frau Vogel,',
    absaetze: ['Erster Absatz.', 'Zweiter Absatz.'],
    gruss: 'Mit freundlichen Grüßen',
  },
  style: {
    accent: '#1F8A5B',
    strong: '#15734a',
    onDark: '#6ee7b7',
    font: 'var(--font-body)',
    size: 1,
  },
};

describe('documentsToHtml', () => {
  it('WeavesContactResumeAndLetterContent', () => {
    const html = documentsToHtml(documents);
    expect(html).toContain('Lena Brandt');
    expect(html).toContain('A designer with taste.');
    expect(html).toContain('Built the design system');
    expect(html).toContain('B.A.');
    expect(html).toContain('Bewerbung als Designerin');
    expect(html).toContain('Erster Absatz.');
    expect(html).toContain('Zweiter Absatz.');
  });

  it('DocumentRendering_ExcludesRawText', () => {
    // The internal raw CV text is never rendered into the preview HTML / PDF
    // (ADR-0057): only the structured sections are.
    const withRaw = {
      ...documents,
      resume: { ...documents.resume, rawText: 'CONFIDENTIAL-RAW-CV-CONTENT' },
    };
    const html = documentsToHtml(withRaw);
    expect(html).not.toContain('CONFIDENTIAL-RAW-CV-CONTENT');
  });

  it('AppliesTheSharedAccentStyle', () => {
    const html = documentsToHtml(documents);
    expect(html).toContain('#1F8A5B'); // accent drives the page
    expect(html).toContain('#15734a'); // strong
  });

  it('EscapesHtmlToPreventInjection', () => {
    const evil = {
      ...documents,
      resume: { ...documents.resume, summary: '<script>alert(1)</script>' },
    };
    const html = documentsToHtml(evil);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('DefaultsToClassicWhenTemplateMissingOrUnknown', () => {
    // rows saved before templates existed have no `template` field
    const html = documentsToHtml({ ...documents, style: { ...documents.style } });
    expect(html).toContain('class="tpl-classic"');
  });

  it('ClassicTemplate_EmptyStyleFields_RenderWithoutThrowing', () => {
    // Exercises the classic/modern/compact cssValue() path (distinct from the
    // ink template's `|| fallback` variant) with empty accent/strong/font.
    const html = documentsToHtml({
      ...documents,
      style: { accent: '', strong: '', onDark: '', font: '', size: 1 },
    });
    expect(html).toContain('class="tpl-classic"');
  });

  it('ModernTemplate_TintsHeadingsWithAccent', () => {
    const html = documentsToHtml({
      ...documents,
      style: { ...documents.style, template: 'modern' },
    });
    expect(html).toContain('class="tpl-modern"');
    expect(html).toContain('.resume h1 { color: #1F8A5B');
  });

  it('CompactTemplate_TightensLayout', () => {
    const html = documentsToHtml({
      ...documents,
      style: { ...documents.style, template: 'compact' },
    });
    expect(html).toContain('class="tpl-compact"');
    expect(html).toContain('margin: 14mm 14mm'); // tighter page margins
  });

  it('InkTemplate_RendersTheTwoColumnSidebarLayout', () => {
    const html = documentsToHtml({
      ...documents,
      style: { ...documents.style, template: 'ink' },
    });
    expect(html).toContain('class="tpl-ink"');
    // signature two-column structure: dark sidebar + light main column
    expect(html).toContain('class="ink-layout"');
    expect(html).toContain('class="ink-sidebar"');
    expect(html).toContain('class="ink-main"');
    // contact rows (with icon chips) + skill chips live in the sidebar
    expect(html).toContain('lena@example.com');
    expect(html).toContain('ink-contact');
    expect(html).toContain('ink-chip');
    expect(html).toContain('Figma');
    // eyebrow-labelled sections in the main column
    expect(html).toContain('ink-kicker');
    expect(html).toContain('<h2>Profil</h2>');
    expect(html).toContain('Berufserfahrung');
    // experience timeline: node dots, date pill, tech-stack chips
    expect(html).toContain('ink-timeline');
    expect(html).toContain('ink-node');
    expect(html).toContain('ink-pill');
    expect(html).toContain('Tech Stack');
    // the cover letter is a clean sheet (accent-ruled name header, no dark band)
    expect(html).toContain('class="ink-letter"');
    expect(html).toContain('ink-letter-head');
    // typography is embedded so the preview and PDF match with no host fonts
    expect(html).toContain('@font-face');
    expect(html).toContain('Space Grotesk');
    // multi-page safety: a fixed spine repeats the dark band on every page
    expect(html).toContain('.ink-print-band');
    expect(html).toContain('position: fixed');
    expect(html).toContain('print-color-adjust: exact');
    // page anchors preserved for the editor's toggle
    expect(html).toContain('id="doc-resume"');
    expect(html).toContain('id="doc-letter"');
  });

  it('InkTemplate_EscapesHtml', () => {
    const evil = {
      ...documents,
      style: { ...documents.style, template: 'ink' as const },
      resume: { ...documents.resume, summary: '<script>alert(1)</script>' },
    };
    const html = documentsToHtml(evil);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('InkTemplate_RendersThePhotoAndOmitsEmptyFieldsAndSections', () => {
    const photo = 'data:image/png;base64,iVBORw0KGgo=';
    const bare = {
      ...documents,
      contact: {
        name: 'Nî Sévïnç', // Latin-1 accents must survive the embedded latin subset
        role: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        photo,
      },
      resume: {
        summary: '',
        experience: [
          { role: 'Engineer', company: '', period: '', location: '', bullets: [], skills: [] },
        ],
        education: [{ degree: 'B.Sc.', school: '', period: '', note: '' }],
        skillGroups: [],
      },
      // empty accent/strong/onDark exercise the colour fallbacks; a non-finite
      // size exercises the scale default.
      style: { accent: '', strong: '', onDark: '', font: '', size: Number.NaN, template: 'ink' },
    };
    const html = documentsToHtml(bare);
    // photo renders inside the avatar
    expect(html).toContain(`src="${photo}"`);
    expect(html).toContain('ink-avatar');
    expect(html).toContain('Nî Sévïnç');
    // no contact rows and no skills section when those fields are empty
    // (match markup, not the always-present CSS class definitions)
    expect(html).not.toContain('class="ink-contact"');
    expect(html).not.toContain('>Kenntnisse</h2>');
    // no Profile section (empty summary); the bare experience still renders,
    // but without a date pill or a tech-stack strip
    expect(html).not.toContain('<h2>Profil</h2>');
    expect(html).toContain('Engineer');
    expect(html).not.toContain('class="ink-pill');
    expect(html).not.toContain('Tech Stack');
    // colour fallback is applied (default blueprint accent)
    expect(html).toContain('#2563eb');
  });

  it('OmitsEmptySectionsGracefully', () => {
    const bare: TalentDocuments = {
      ...documents,
      resume: { summary: '', experience: [], education: [], skillGroups: [] },
      letter: { ...documents.letter, absaetze: [] },
    };
    const html = documentsToHtml(bare);
    expect(html).toContain('Lena Brandt'); // contact still renders
    expect(html).not.toContain('Berufserfahrung'); // no experience heading
    expect(html).not.toContain('Ausbildung'); // no education heading
  });

  it('CssEscapesStyleFieldsToPreventRuleBreakoutAndSsrf', () => {
    // accent/strong/onDark/font are free user strings interpolated raw into a
    // <style> block; esc() only HTML-escapes, so a crafted value could break
    // out of the custom property and inject a CSS rule (e.g. `@import
    // url(...)`, fetched server-side by the headless-Chromium renderer — SSRF).
    const evilStyle = {
      accent: 'red} *{background:url(http://169.254.169.254/latest/meta-data/)',
      strong: '1d4ed8;} body{color:red} /* \'"<> */',
      onDark: '60a5fa',
      font: 'Inter; } @import url(http://evil.example/x); h1{',
      size: 1,
    };
    for (const template of ['classic', 'modern', 'compact', 'ink'] as const) {
      const html = documentsToHtml({
        ...documents,
        style: { ...documents.style, ...evilStyle, template },
      });
      expect(html).not.toContain('url(http://169.254.169.254');
      expect(html).not.toContain('url(http://evil.example');
      expect(html).not.toContain('@import');
      expect(html).not.toContain('*{background');
    }
  });

  it('UsesGermanSectionHeadingsMatchingTheEditor', () => {
    const html = documentsToHtml(documents);
    // German-first product (Vivid redesign): the export headings are German and
    // must match the editor's German document chrome.
    expect(html).toContain('lang="de"');
    expect(html).toContain('<h2>Profil</h2>');
    expect(html).toContain('<h2>Berufserfahrung</h2>');
    expect(html).toContain('<h2>Ausbildung</h2>');
    expect(html).toContain('<h2>Kenntnisse</h2>');
    expect(html).not.toContain('<h2>Profile</h2>');
    expect(html).not.toContain('<h2>Experience</h2>');
  });

  it('UsesEnglishSectionHeadingsForAnEnglishLetter', () => {
    // Phase 7 (ADR-0064, OQ-2): the CV section headings follow the document
    // language. An English cover letter → English headings.
    const english: TalentDocuments = {
      ...documents,
      letter: {
        ...documents.letter,
        anrede: 'Dear Sir or Madam,',
        gruss: 'Kind regards',
        betreff: 'Application as Designer',
        absaetze: ['First paragraph.', 'Second paragraph.'],
      },
    };
    const html = documentsToHtml(english);
    expect(html).toContain('<h2>Profile</h2>');
    expect(html).toContain('<h2>Professional experience</h2>');
    expect(html).toContain('<h2>Education</h2>');
    expect(html).toContain('<h2>Skills</h2>');
    expect(html).not.toContain('<h2>Profil</h2>');
    expect(html).not.toContain('<h2>Berufserfahrung</h2>');
  });

  it('UsesEnglishSectionHeadingsForTheInkTemplate', () => {
    const english: TalentDocuments = {
      ...documents,
      style: { ...documents.style, template: 'ink' as const },
      letter: {
        ...documents.letter,
        anrede: 'Dear Sir or Madam,',
        gruss: 'Kind regards',
        betreff: 'Application as Designer',
        absaetze: ['First paragraph.'],
      },
    };
    const html = documentsToHtml(english);
    expect(html).toContain('>About me</');
    expect(html).toContain('<h2>Profile</h2>');
    expect(html).toContain('>Contact</h2>');
    expect(html).toContain('>Skills</h2>');
    expect(html).not.toContain('Über mich');
    expect(html).not.toContain('Kenntnisse');
  });

  it('DefaultsToEnglishHeadingsWithoutLanguageSignal', () => {
    // Phase 7: a document without a language signal (empty letter) defaults to
    // English headings.
    const bare: TalentDocuments = {
      ...documents,
      letter: { ...documents.letter, anrede: '', gruss: '', betreff: '', absaetze: [] },
    };
    const html = documentsToHtml(bare);
    expect(html).toContain('<h2>Profile</h2>');
    expect(html).not.toContain('<h2>Profil</h2>');
  });

  it('CarriesPageAnchorsAndScreenSheetSoThePreviewMatchesTheExport', () => {
    const html = documentsToHtml(documents);
    // The editor scrolls to these anchors; the @media screen sheet gives the
    // live preview the same A4 width/margins as the printed page.
    expect(html).toContain('id="doc-resume"');
    expect(html).toContain('id="doc-letter"');
    expect(html).toContain('@media screen');
    expect(html).toContain('width: 210mm');
    // Print margins are still driven by @page, so the PDF is unchanged.
    expect(html).toContain('@page { size: A4; margin: 20mm 18mm; }');
  });
});

describe('documentsToHtml order option (AK-4.1)', () => {
  it('DocumentsToHtml_LetterFirstOrder_RendersLetterBeforeResume', () => {
    const html = documentsToHtml(documents, { order: 'letter-first' });
    expect(html.indexOf('id="doc-letter"')).toBeLessThan(html.indexOf('id="doc-resume"'));
  });

  it('DocumentsToHtml_DefaultOrder_RendersResumeBeforeLetter', () => {
    // Regression: the base export keeps CV → Anschreiben (ADR-0061 §4).
    const html = documentsToHtml(documents);
    expect(html.indexOf('id="doc-resume"')).toBeLessThan(html.indexOf('id="doc-letter"'));
  });

  it('InkDocument_LetterFirstOrder_RendersLetterBeforeResume', () => {
    const ink = { ...documents, style: { ...documents.style, template: 'ink' as const } };
    const html = documentsToHtml(ink, { order: 'letter-first' });
    expect(html.indexOf('id="doc-letter"')).toBeLessThan(html.indexOf('id="doc-resume"'));
    expect(html).toContain('id="doc-resume"');
  });

  it('InkDocument_DefaultOrder_RendersResumeBeforeLetter', () => {
    const ink = { ...documents, style: { ...documents.style, template: 'ink' as const } };
    const html = documentsToHtml(ink);
    expect(html.indexOf('id="doc-resume"')).toBeLessThan(html.indexOf('id="doc-letter"'));
  });
});

describe('Mappe renders the adapted copy, not the base (AK-4.2)', () => {
  it('Mappe_ExtractedText_ContainsAdaptedNotBase', () => {
    // The copy carries a Magic-Pen-adapted summary; the base-only marker lives in
    // `rawText` (the copy blanks it, ADR-0059) and must never reach the Mappe.
    const copy = {
      ...documents,
      resume: {
        ...documents.resume,
        summary: 'ANGEPASSTER PROFILTEXT 9999',
        rawText: 'BASIS-NUR-MARKER-0001',
      },
    };
    const html = documentsToHtml(copy, { order: 'letter-first' });
    expect(html).toContain('ANGEPASSTER PROFILTEXT 9999');
    expect(html).not.toContain('BASIS-NUR-MARKER-0001');
    // Letter first (the Mappe order).
    expect(html.indexOf('id="doc-letter"')).toBeLessThan(html.indexOf('id="doc-resume"'));
  });
});
