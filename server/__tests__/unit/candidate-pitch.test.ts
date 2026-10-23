import {
  pitchPrompt,
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

  it('PitchPrompt_WithMandateContext_ByLanguage', () => {
    expect(pitchPrompt(documents, 'A concrete mandate', 'en').system).toContain('English');
    expect(pitchPrompt(documents, 'A concrete mandate', 'de').system).toContain('Deutsch');
  });
});
