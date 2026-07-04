import {
  interviewKitPrompt,
  fallbackInterviewKit,
  normalizeInterviewKit,
  interviewKitResultSchema,
} from '../../src/domain/interview-kit.js';
import type { MandateContext } from '../../src/domain/match-explain.js';
import type { TalentDocuments } from '../../src/domain/talent-documents.js';

const docs = (over: Partial<TalentDocuments['resume']> = {}): TalentDocuments => ({
  ownerId: 'team',
  talentId: 't1',
  contact: {
    name: 'Lena',
    role: 'Frontend Engineer',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
  },
  resume: {
    summary: 'Erfahrene Entwicklerin.',
    experience: [
      { role: 'Dev', company: 'Acme', period: '', location: '', bullets: [], skills: ['React'] },
    ],
    education: [],
    skillGroups: [{ label: 'x', items: ['React', 'TypeScript'] }],
    ...over,
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
    accent: '#000',
    strong: '#000',
    onDark: '#000',
    font: 'x',
    size: 1,
  },
  updatedAt: '2026-06-25T10:00:00.000Z',
});

const mandate: MandateContext = {
  role: 'Vue Frontend Engineer',
  location: 'Berlin',
  client: 'Acme',
};

describe('interview-kit domain', () => {
  describe('interviewKitPrompt', () => {
    it('IncludesMandateAndCandidate', () => {
      const { system, prompt } = interviewKitPrompt(docs(), mandate);
      expect(system).toContain('JSON');
      expect(prompt).toContain('Vue Frontend Engineer');
      expect(prompt).toContain('Lena');
    });

    it('SparseCandidateAndBareMandate_OmitsMissingParts', () => {
      const sparse = docs({ summary: '', experience: [], education: [], skillGroups: [] });
      sparse.contact.name = '';
      const { prompt } = interviewKitPrompt(sparse, { role: 'Engineer', location: '' });
      expect(prompt).toContain('Engineer');
      expect(prompt).not.toContain(' at '); // no client
    });
  });

  describe('fallbackInterviewKit', () => {
    it('BuildsSkillQuestionsAndScorecard', () => {
      const kit = fallbackInterviewKit(docs(), mandate);
      expect(kit.questions.length).toBeGreaterThanOrEqual(3);
      // a skill question references a matched skill
      expect(kit.questions.some((q) => q.question.includes('React'))).toBe(true);
      // always has a motivation question referencing the role
      expect(kit.questions.some((q) => q.category === 'Motivation')).toBe(true);
      expect(kit.scorecard.length).toBeGreaterThan(0);
      expect(kit.focus).toBeTruthy();
    });

    it('EmptyDocuments_StillProducesGenericKit', () => {
      const kit = fallbackInterviewKit(null, mandate);
      expect(kit.questions.length).toBeGreaterThan(0);
      expect(kit.questions.some((q) => q.category === 'Culture')).toBe(true);
      expect(kit.focus).toContain('basic suitability');
    });

    it('IncludesStationQuestionWhenExperiencePresent', () => {
      const kit = fallbackInterviewKit(docs(), mandate);
      expect(kit.questions.some((q) => q.category === 'Experience')).toBe(true);
    });

    it('StationWithCompanyOnly_StillAsksExperienceQuestion', () => {
      const d = docs({
        experience: [
          { role: '', company: 'BetaCorp', period: '', location: '', bullets: [], skills: [] },
        ],
      });
      const kit = fallbackInterviewKit(d, mandate);
      expect(
        kit.questions.some((q) => q.category === 'Experience' && q.question.includes('BetaCorp')),
      ).toBe(true);
    });

    it('NoSkillOverlap_FallsBackToOwnSkills_AndNoClientInQuestion', () => {
      // mandate unrelated to the candidate's skills → matched empty, use own skills
      const kit = fallbackInterviewKit(docs(), { role: 'Data Scientist', location: '' });
      expect(kit.questions.some((q) => q.question.includes('React'))).toBe(true);
      const motivation = kit.questions.find((q) => q.category === 'Motivation');
      expect(motivation?.question).not.toContain(' at ');
      expect(kit.focus).toContain('basic suitability');
    });
  });

  describe('normalizeInterviewKit', () => {
    it('TrimsClampsAndDropsEmptyQuestions', () => {
      const raw = interviewKitResultSchema.parse({
        focus: '  Fokus  ',
        questions: [
          { category: 'Fachlich', question: '  Frage 1  ', lookFor: 'x' },
          { category: 'X', question: '', lookFor: 'y' }, // dropped (no question)
        ],
        scorecard: ['A', '', 'B'],
      });
      const kit = normalizeInterviewKit(raw);
      expect(kit.focus).toBe('Fokus');
      expect(kit.questions).toEqual([{ category: 'Fachlich', question: 'Frage 1', lookFor: 'x' }]);
      expect(kit.scorecard).toEqual(['A', 'B']);
    });
  });
});
