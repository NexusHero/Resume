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
    // signature two-column structure: dark rail + sidebar + main column
    expect(html).toContain('class="ink-rail"');
    expect(html).toContain('class="ink-side"');
    expect(html).toContain('class="ink-main"');
    // contact + skills live in the sidebar
    expect(html).toContain('lena@example.com');
    expect(html).toContain('ink-chips');
    expect(html).toContain('Figma');
    // the cover letter gets the matching ink header band (no rail leak)
    expect(html).toContain('ink-letter-head');
    // multi-page safety: fixed rail in print, dark background forced to print
    expect(html).toContain('@media print { .ink-rail { position: fixed; } }');
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

  it('OmitsEmptySectionsGracefully', () => {
    const bare: TalentDocuments = {
      ...documents,
      resume: { summary: '', experience: [], education: [], skillGroups: [] },
      letter: { ...documents.letter, absaetze: [] },
    };
    const html = documentsToHtml(bare);
    expect(html).toContain('Lena Brandt'); // contact still renders
    expect(html).not.toContain('Experience'); // no experience heading
    expect(html).not.toContain('Education'); // no education heading
  });

  it('UsesEnglishSectionHeadingsMatchingTheEditor', () => {
    const html = documentsToHtml(documents);
    // The whole product is English; the export headings must match the editor.
    expect(html).toContain('lang="en"');
    expect(html).toContain('<h2>Profile</h2>');
    expect(html).toContain('<h2>Experience</h2>');
    expect(html).toContain('<h2>Education</h2>');
    expect(html).toContain('<h2>Skills</h2>');
    expect(html).not.toContain('Werdegang');
    expect(html).not.toContain('Ausbildung');
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
