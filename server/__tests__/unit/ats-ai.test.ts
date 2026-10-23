import { atsPrompt, normalizeAts } from '../../src/domain/ats-ai.js';
import type { TalentDocuments } from '../../src/domain/talent-documents.js';

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

  it('AtsPrompt_IncludesSkillsListedOnlyUnderARole', () => {
    // "gRPC" is a tag on an experience entry, not in the top-level skill groups —
    // it must still reach the analyst so it is not reported as a missing keyword.
    const { prompt } = atsPrompt(documents, 'We need a C++ and gRPC expert');
    expect(prompt).toContain('gRPC');
  });

  it('NormalizeAts_ClampsScoreTo0to100', () => {
    expect(normalizeAts({ score: 250, matched: [], missing: [], suggestions: [] }).score).toBe(100);
    expect(normalizeAts({ score: -5, matched: [], missing: [], suggestions: [] }).score).toBe(0);
  });
});
