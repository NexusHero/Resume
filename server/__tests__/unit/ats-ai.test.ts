import { atsPrompt, fallbackAts, normalizeAts } from '../../src/domain/ats-ai';
import type { TalentDocuments } from '../../src/domain/talent-documents';

const documents: TalentDocuments = {
  ownerId: 'o',
  talentId: 't1',
  contact: { name: 'Max', role: 'C++ Engineer', email: '', phone: '', location: '', linkedin: '' },
  resume: {
    summary: 'Senior C++ engineer.',
    experience: [
      {
        role: 'Engineer',
        company: 'Acme',
        period: '',
        location: '',
        bullets: [],
        skills: ['gRPC'],
      },
    ],
    education: [],
    skillGroups: [{ label: 'Lang', items: ['C++', 'Rust', 'Python'] }],
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

describe('ats-ai', () => {
  it('AtsPrompt_IncludesCandidateSkillsAndJob', () => {
    const { system, prompt } = atsPrompt(documents, 'We need a C++ and gRPC expert');
    expect(system).toContain('JSON');
    expect(prompt).toContain('C++, Rust, Python');
    expect(prompt).toContain('We need a C++ and gRPC expert');
  });

  it('FallbackAts_ScoresKeywordOverlap', () => {
    const res = fallbackAts(documents, 'Looking for strong C++ and Rust skills.');
    expect(res.score).toBeGreaterThan(0);
    expect(res.score).toBeLessThanOrEqual(100);
    expect(res.matched).toEqual(expect.arrayContaining(['C++', 'Rust']));
    expect(res.suggestions.length).toBeGreaterThan(0);
  });

  it('FallbackAts_NoMatch_ScoresLow', () => {
    const res = fallbackAts(documents, 'We need a florist and a barista.');
    expect(res.score).toBe(0);
  });

  it('NormalizeAts_ClampsScoreTo0to100', () => {
    expect(normalizeAts({ score: 250, matched: [], missing: [], suggestions: [] }).score).toBe(100);
    expect(normalizeAts({ score: -5, matched: [], missing: [], suggestions: [] }).score).toBe(0);
  });
});
