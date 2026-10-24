import {
  copyDocumentsForApplication,
  defaultStyle,
  type TalentDocuments,
} from '../../src/domain/talent-documents.js';

const base: TalentDocuments = {
  ownerId: 'team',
  talentId: 'tal1',
  contact: {
    name: 'Ada',
    role: 'Engineer',
    email: 'ada@x.test',
    phone: '',
    location: '',
    linkedin: '',
  },
  resume: {
    summary: 'Seasoned engineer.',
    experience: [
      {
        role: 'SWE',
        company: 'Acme',
        period: '2020-2024',
        location: '',
        bullets: ['shipped'],
        skills: ['Rust'],
      },
    ],
    education: [{ degree: 'M.Sc.', school: 'Uni', period: '2016-2020', note: '' }],
    skillGroups: [{ label: 'Languages', items: ['Rust', 'Go'] }],
    rawText: 'TOPSECRET-RAW-CV',
  },
  letter: {
    firma: 'Acme',
    ansprechpartner: '',
    strasse: '',
    plzOrt: '',
    betreff: '',
    anrede: 'Sehr geehrte Damen und Herren,',
    absaetze: ['Paragraph one.'],
    gruss: 'Mit freundlichen Grüßen',
  },
  style: defaultStyle,
  translations: {
    en: {
      resume: { summary: '', experience: [], education: [], skillGroups: [], rawText: '' },
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
      provider: 'claude',
      updatedAt: '2026-06-25T10:00:00.000Z',
    },
  },
  updatedAt: '2026-06-25T10:00:00.000Z',
};

describe('copyDocumentsForApplication', () => {
  it('CopyDocumentsForApplication_BlanksRawTextAndDropsTranslations', () => {
    const copy = copyDocumentsForApplication(base);
    expect(copy.resume.rawText).toBe('');
    expect(copy.translations).toBeUndefined();
    // Provenance is kept (ADR-0059): rendering/editor paths still see a TalentDocuments.
    expect(copy.ownerId).toBe('team');
    expect(copy.talentId).toBe('tal1');
  });

  it('CopyDocumentsForApplication_DeepCopiesStructuredFields', () => {
    const copy = copyDocumentsForApplication(base);
    // Top-level structured fields are distinct objects, not shared references.
    expect(copy.resume).not.toBe(base.resume);
    expect(copy.contact).not.toBe(base.contact);
    expect(copy.letter).not.toBe(base.letter);
    expect(copy.style).not.toBe(base.style);
    // Nested arrays are deep-copied too.
    expect(copy.resume.experience).not.toBe(base.resume.experience);
    expect(copy.resume.experience[0]).not.toBe(base.resume.experience[0]);
    expect(copy.resume.skillGroups).not.toBe(base.resume.skillGroups);
    expect(copy.resume.skillGroups[0].items).not.toBe(base.resume.skillGroups[0].items);
    expect(copy.letter.absaetze).not.toBe(base.letter.absaetze);

    // Mutating the copy leaves the base byte-identical (AK-2.3).
    copy.resume.experience[0].bullets.push('NEW');
    copy.resume.skillGroups[0].items.push('NEW');
    copy.letter.absaetze.push('NEW');
    expect(base.resume.experience[0].bullets).toEqual(['shipped']);
    expect(base.resume.skillGroups[0].items).toEqual(['Rust', 'Go']);
    expect(base.letter.absaetze).toEqual(['Paragraph one.']);
  });
});
