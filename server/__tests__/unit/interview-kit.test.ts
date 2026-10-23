import {
  interviewKitPrompt,
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
