import {
  summaryPrompt,
  letterPrompt,
  toParagraphs,
  fallbackSummary,
  fallbackLetter,
} from '../../src/domain/document-ai';
import type { TalentDocuments } from '../../src/domain/talent-documents';

const documents: TalentDocuments = {
  ownerId: 'o',
  talentId: 't1',
  contact: {
    name: 'Lena',
    role: 'Product Designer',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
  },
  resume: {
    summary: 'Alt.',
    experience: [
      { role: 'Designer', company: 'Aurora', period: '', location: '', bullets: [], skills: [] },
    ],
    education: [],
    skillGroups: [{ label: 'Tools', items: ['Figma', 'Sketch'] }],
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
    accent: '#2A6FDB',
    strong: '#1d4ed8',
    onDark: '#7aa7f5',
    font: 'var(--font-display)',
    size: 1,
  },
};

describe('document-ai prompts', () => {
  it('SummaryPrompt_IncludesCandidateFacts', () => {
    const { system, prompt } = summaryPrompt(documents);
    expect(system).toContain('resume');
    expect(prompt).toContain('Designer @ Aurora');
    expect(prompt).toContain('Figma, Sketch');
  });

  it('LetterPrompt_WeavesTargetRoleAndCompany', () => {
    const { prompt } = letterPrompt(documents, { role: 'Lead Designer', company: 'Helio' });
    expect(prompt).toContain('Lead Designer');
    expect(prompt).toContain('Helio');
  });

  it('LetterPrompt_WithoutTarget_StillValid', () => {
    const { prompt } = letterPrompt(documents);
    expect(prompt).toContain('not specified');
  });

  it('ToParagraphs_SplitsOnBlankLines', () => {
    expect(toParagraphs('One.\n\nTwo.\n\nThree.')).toEqual(['One.', 'Two.', 'Three.']);
    expect(toParagraphs('   Single.   ')).toEqual(['Single.']);
  });
});

describe('document-ai fallbacks', () => {
  it('FallbackSummary_UsesRoleAndSkills', () => {
    const text = fallbackSummary(documents);
    expect(text).toContain('Product Designer');
    expect(text).toContain('Figma');
  });

  it('FallbackLetter_ReturnsThreeParagraphsTargeted', () => {
    const paras = fallbackLetter(documents, { role: 'Lead Designer', company: 'Helio' });
    expect(paras).toHaveLength(3);
    expect(paras[0]).toContain('Lead Designer');
    expect(paras[0]).toContain('Helio');
  });
});
