import { summaryPrompt, letterPrompt, toParagraphs } from '../../src/domain/document-ai.js';
import type { TalentDocuments } from '../../src/domain/talent-documents.js';

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

  it('Prompts_DefaultToEnglishDirective', () => {
    expect(summaryPrompt(documents).system).toContain('Respond in English only.');
    expect(letterPrompt(documents).system).toContain('Respond in English only.');
  });

  it('Prompts_German_CarryGermanDirective', () => {
    expect(summaryPrompt(documents, 'de').system).toContain('Antworte ausschließlich auf Deutsch.');
    expect(letterPrompt(documents, {}, 'de').system).toContain(
      'Antworte ausschließlich auf Deutsch.',
    );
  });

  it('ToParagraphs_SplitsOnBlankLines', () => {
    expect(toParagraphs('One.\n\nTwo.\n\nThree.')).toEqual(['One.', 'Two.', 'Three.']);
    expect(toParagraphs('   Single.   ')).toEqual(['Single.']);
  });
});
