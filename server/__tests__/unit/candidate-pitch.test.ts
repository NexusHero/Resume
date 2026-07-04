import {
  pitchPrompt,
  fallbackPitch,
  normalizePitch,
  pitchRequestSchema,
} from '../../src/domain/candidate-pitch.js';
import type { TalentDocuments } from '../../src/domain/talent-documents.js';

const documents: TalentDocuments = {
  ownerId: 'o',
  talentId: 't1',
  contact: {
    name: 'Max Mustermann',
    role: 'C++ Engineer',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
  },
  resume: {
    summary: 'Senior C++ engineer with 8 years of experience.',
    experience: [
      {
        role: 'Lead Engineer',
        company: 'Acme',
        period: '2020—',
        location: '',
        bullets: [],
        skills: ['gRPC'],
      },
    ],
    education: [{ degree: 'M.Sc. Informatik', school: 'TU', period: '', note: '' }],
    skillGroups: [{ label: 'Lang', items: ['C++', 'Rust', 'Python', 'Go'] }],
  },
  letter: {
    firma: '',
    ansprechpartner: '',
    strasse: '',
    plzOrt: '',
    betreff: '',
    anrede: '',
    absaetze: [],
    gruss: '',
  },
  style: {
    template: 'classic',
    accent: '#2A6FDB',
    strong: '#1d4ed8',
    onDark: '#7aa7f5',
    font: 'x',
    size: 1,
  },
};

describe('candidate-pitch', () => {
  it('PitchRequest_DefaultsEmptyContext', () => {
    expect(pitchRequestSchema.parse({}).mandateContext).toBe('');
    expect(pitchRequestSchema.parse({ mandateContext: 'Rolle X' }).mandateContext).toBe('Rolle X');
  });

  it('PitchPrompt_IncludesCandidateFactsAndMandate', () => {
    const { system, prompt } = pitchPrompt(documents, 'Wir suchen C++ Lead');
    expect(system).toContain('JSON');
    expect(prompt).toContain('Max Mustermann');
    expect(prompt).toContain('C++, Rust, Python, Go');
    expect(prompt).toContain('Wir suchen C++ Lead');
  });

  it('PitchPrompt_EmptyFacts_OmitsBlankLines', () => {
    const bare = {
      ...documents,
      contact: { ...documents.contact, name: '', role: '' },
      resume: { summary: '', experience: [], education: [], skillGroups: [] },
    };
    const { prompt } = pitchPrompt(bare, '');
    expect(prompt).not.toContain('Name:');
    expect(prompt).not.toContain('Role:');
    expect(prompt).not.toContain('Skills:');
    expect(prompt).toContain('(not provided');
  });

  it('FallbackPitch_BuildsProfileFromFacts', () => {
    const pitch = fallbackPitch(documents, '');
    expect(pitch.headline).toContain('Max Mustermann');
    expect(pitch.headline).toContain('C++');
    expect(pitch.paragraphs[0]).toContain('Senior C++ engineer');
    expect(pitch.highlights).toEqual(expect.arrayContaining(['C++', 'M.Sc. Informatik']));
    expect(pitch.highlights.length).toBeLessThanOrEqual(5);
  });

  it('FallbackPitch_German_ProducesGermanText', () => {
    const pitch = fallbackPitch(documents, 'Konkretes Mandat', 'de');
    expect(pitch.headline).toContain('mit Schwerpunkt');
    expect(pitch.paragraphs[pitch.paragraphs.length - 1]).toContain('vorliegenden Mandat');
  });

  it('FallbackPitch_WithMandate_AddsFitParagraph', () => {
    const withCtx = fallbackPitch(documents, 'Konkretes Mandat');
    const without = fallbackPitch(documents, '');
    expect(withCtx.paragraphs.length).toBe(without.paragraphs.length + 1);
  });

  it('FallbackPitch_EmptyDocuments_StillReturnsUsable', () => {
    const empty: TalentDocuments = {
      ...documents,
      contact: { ...documents.contact, name: '', role: '' },
      resume: { summary: '', experience: [], education: [], skillGroups: [] },
    };
    const pitch = fallbackPitch(empty, '');
    expect(pitch.headline).toContain('professional');
    expect(pitch.paragraphs.length).toBeGreaterThan(0);
    expect(pitch.highlights).toEqual([]);
  });

  it('NormalizePitch_TrimsCollapsesAndClamps', () => {
    const pitch = normalizePitch({
      headline: '  Top  Kandidat  ',
      paragraphs: ['  a ', '', 'b', 'c', 'd'],
      highlights: ['x', ' ', 'y', 'z', 'w', 'v', 'u'],
    });
    expect(pitch.headline).toBe('Top Kandidat');
    expect(pitch.paragraphs).toEqual(['a', 'b', 'c']); // capped at 3
    expect(pitch.highlights).toEqual(['x', 'y', 'z', 'w', 'v']); // capped at 5
  });

  it('FallbackPitch_WithMandateContext_AddsFitParagraph', () => {
    for (const lang of ['en', 'de'] as const) {
      const pitch = fallbackPitch(documents, 'Senior C++ role at a scale-up', lang);
      // skills → headline focus (83-84); education → highlights (98-100)
      expect(pitch.headline).toContain('C++');
      expect(pitch.highlights).toContain('M.Sc. Informatik');
      // mandate context present → the extra "fit" paragraph is appended (91)
      expect(pitch.paragraphs.length).toBe(3);
    }
  });

  it('PitchPrompt_WithMandateContext_ByLanguage', () => {
    expect(pitchPrompt(documents, 'A concrete mandate', 'en').system).toContain('English');
    expect(pitchPrompt(documents, 'A concrete mandate', 'de').system).toContain('Deutsch');
  });
});
