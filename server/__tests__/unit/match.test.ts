import { candidateSkills, scoreTalent, matchRequestSchema } from '../../src/domain/match';
import type { Talent } from '../../src/domain/talent';
import type { TalentDocuments } from '../../src/domain/talent-documents';

const talent = (over: Partial<Talent> = {}): Talent => ({
  id: 't1',
  ownerId: 'team',
  name: 'Ada Lovelace',
  role: 'Engineer',
  headline: '',
  location: 'Berlin',
  email: '',
  phone: '',
  availability: '',
  salary: '',
  skills: [],
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
  ...over,
});

const docs = (over: Partial<TalentDocuments['resume']> = {}): TalentDocuments => ({
  ownerId: 'team',
  talentId: 't1',
  contact: { name: '', role: '', email: '', phone: '', location: '', linkedin: '' },
  resume: {
    summary: '',
    experience: [],
    education: [],
    skillGroups: [],
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

describe('match domain', () => {
  describe('candidateSkills', () => {
    it('WithNullDocuments_ReturnsCanonicalTalentSkills', () => {
      // Node → Node.js via the taxonomy
      expect(candidateSkills(talent({ skills: ['React', 'Node'] }), null)).toEqual([
        'React',
        'Node.js',
      ]);
    });

    it('MergesTalentAndDocumentSkills', () => {
      const t = talent({ skills: ['React'] });
      const d = docs({
        skillGroups: [{ label: 'Frontend', items: ['TypeScript', 'CSS'] }],
        experience: [
          {
            role: 'Dev',
            company: 'Acme',
            period: '',
            location: '',
            bullets: [],
            skills: ['GraphQL'],
          },
        ],
      });
      expect(candidateSkills(t, d)).toEqual(['React', 'TypeScript', 'CSS', 'GraphQL']);
    });

    it('DeduplicatesCaseInsensitively_KeepingFirstCasing', () => {
      const t = talent({ skills: ['React'] });
      const d = docs({ skillGroups: [{ label: 'x', items: ['react', 'REACT'] }] });
      expect(candidateSkills(t, d)).toEqual(['React']);
    });

    it('TrimsAndDropsBlankEntries', () => {
      const t = talent({ skills: ['  Go  ', '', '   '] });
      expect(candidateSkills(t, null)).toEqual(['Go']);
    });
  });

  describe('scoreTalent', () => {
    it('NoSkills_ScoresZero', () => {
      expect(scoreTalent(talent({ skills: [] }), null, 'anything')).toEqual({
        score: 0,
        matched: [],
      });
    });

    it('MatchesRelatedSkillsSemantically', () => {
      const t = talent({ role: 'Designer', skills: ['React', 'TypeScript', 'COBOL'] });
      // React matches exactly; TypeScript via the frontend cluster; COBOL is unrelated
      const { score, matched } = scoreTalent(t, null, 'We need React developers');
      expect(matched.sort()).toEqual(['React', 'TypeScript']);
      expect(score).toBe(67); // 2 of 3 skills
    });

    it('AddsRoleBonusWhenRoleWordAppearsInJob', () => {
      const t = talent({ role: 'Engineer', skills: ['React'] });
      const { score } = scoreTalent(t, null, 'Senior React Engineer wanted');
      // base 1/1 = 1 → clamped to 100 even with the bonus
      expect(score).toBe(100);
    });

    it('MatchesViaJobTokenSubstring', () => {
      const t = talent({ role: 'x', skills: ['Kubernetes'] });
      // 'kubernetes' is not a job token, but job token 'kube' is a substring of it
      const { matched } = scoreTalent(t, null, 'kube cluster experience');
      expect(matched).toEqual(['Kubernetes']);
    });
  });

  describe('matchRequestSchema', () => {
    it('AppliesDefaults', () => {
      expect(matchRequestSchema.parse({})).toEqual({ jobText: '', limit: 10 });
    });

    it('RejectsLimitAboveMax', () => {
      expect(() => matchRequestSchema.parse({ limit: 51 })).toThrow();
    });
  });
});
