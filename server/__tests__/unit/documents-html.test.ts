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

  it('OmitsEmptySectionsGracefully', () => {
    const bare: TalentDocuments = {
      ...documents,
      resume: { summary: '', experience: [], education: [], skillGroups: [] },
      letter: { ...documents.letter, absaetze: [] },
    };
    const html = documentsToHtml(bare);
    expect(html).toContain('Lena Brandt'); // contact still renders
    expect(html).not.toContain('Werdegang'); // no experience heading
    expect(html).not.toContain('Ausbildung'); // no education heading
  });
});
