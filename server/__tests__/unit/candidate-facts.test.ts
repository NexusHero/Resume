import { candidateFacts, documentSkills } from '../../src/domain/candidate-facts.js';
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
    summary: 'Senior C++ engineer.',
    experience: [
      {
        role: 'Lead',
        company: 'Acme',
        period: '',
        location: '',
        bullets: [],
        skills: ['grpc'],
      },
      { role: 'Dev', company: '', period: '', location: '', bullets: [], skills: [] },
    ],
    education: [{ degree: 'M.Sc.', school: 'TU Berlin', period: '', note: '' }],
    skillGroups: [{ label: 'Lang', items: ['C++', 'Rust'] }],
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

describe('candidate-facts', () => {
  it('EnglishDefault_RendersAllFactLinesWithCanonicalSkills', () => {
    expect(candidateFacts(documents)).toBe(
      [
        'Name: Max Mustermann',
        'Role: C++ Engineer',
        'Profile: Senior C++ engineer.',
        'Experience: Lead @ Acme; Dev',
        'Skills: C++, Rust, gRPC', // experience skill "grpc" canonicalized and merged in
      ].join('\n'),
    );
  });

  it('GermanLabels_WhenLangIsDe', () => {
    const block = candidateFacts(documents, { lang: 'de', education: true });
    expect(block).toBe(
      [
        'Name: Max Mustermann',
        'Rolle: C++ Engineer',
        'Profil: Senior C++ engineer.',
        'Stationen: Lead @ Acme; Dev',
        'Skills: C++, Rust, gRPC',
        'Ausbildung: M.Sc., TU Berlin',
      ].join('\n'),
    );
  });

  it('Education_OnlyIncludedWhenRequested', () => {
    expect(candidateFacts(documents)).not.toContain('Education:');
    expect(candidateFacts(documents, { education: true })).toContain('Education: M.Sc., TU Berlin');
  });

  it('EmptyFields_AreSkippedWithoutBlankLines', () => {
    const bare: TalentDocuments = {
      ...documents,
      contact: { ...documents.contact, name: '', role: '' },
      resume: { summary: '', experience: [], education: [], skillGroups: [] },
    };
    expect(candidateFacts(bare, { education: true })).toBe('');
    const nameOnly = { ...bare, contact: { ...bare.contact, name: 'Lena' } };
    expect(candidateFacts(nameOnly)).toBe('Name: Lena');
  });

  it('DocumentSkills_NullDocuments_ReturnsEmpty', () => {
    expect(documentSkills(null)).toEqual([]);
  });

  it('DocumentSkills_DedupesAcrossGroupsAndExperience', () => {
    const d: TalentDocuments = {
      ...documents,
      resume: {
        ...documents.resume,
        skillGroups: [{ label: 'x', items: ['React', ' reactjs '] }],
        experience: [
          {
            role: '',
            company: '',
            period: '',
            location: '',
            bullets: [],
            skills: ['react.js', 'TypeScript'],
          },
        ],
      },
    };
    expect(documentSkills(d)).toEqual(['React', 'TypeScript']);
  });
});
