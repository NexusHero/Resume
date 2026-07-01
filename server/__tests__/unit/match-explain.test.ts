import {
  documentSkills,
  matchedForMandate,
  fallbackExplanation,
  explainPrompt,
  normalizeExplanation,
  explanationResultSchema,
  type MandateContext,
} from '../../src/domain/match-explain';
import type { TalentDocuments } from '../../src/domain/talent-documents';

const docs = (over: Partial<TalentDocuments['resume']> = {}, name = 'Lena'): TalentDocuments => ({
  ownerId: 'team',
  talentId: 't1',
  contact: { name, role: 'Frontend Engineer', email: '', phone: '', location: '', linkedin: '' },
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

describe('match-explain domain', () => {
  describe('documentSkills', () => {
    it('NullDocuments_ReturnsEmpty', () => {
      expect(documentSkills(null)).toEqual([]);
    });
    it('MergesGroupAndExperienceSkillsDeduped', () => {
      expect(documentSkills(docs())).toEqual(['React', 'TypeScript']);
    });
  });

  describe('matchedForMandate', () => {
    it('MatchesSemanticallyAgainstMandate', () => {
      // mandate mentions Vue → React/TypeScript answer via the frontend cluster
      expect(matchedForMandate(docs(), mandate).sort()).toEqual(['React', 'TypeScript']);
    });
    it('NullDocuments_NoMatches', () => {
      expect(matchedForMandate(null, mandate)).toEqual([]);
    });
  });

  describe('fallbackExplanation', () => {
    it('BuildsGroundedReasonsFromOverlap', () => {
      const matched = matchedForMandate(docs(), mandate);
      const e = fallbackExplanation(docs(), mandate, matched);
      expect(e.summary).toContain('Lena');
      expect(e.reasons.length).toBeGreaterThan(0);
      expect(e.reasons[0]).toContain('React');
      expect(e.matchedSkills).toEqual(matched);
    });

    it('NoOverlap_StillReturnsHonestReason', () => {
      const e = fallbackExplanation(null, mandate, []);
      expect(e.reasons.length).toBeGreaterThan(0);
      expect(e.summary).toContain('klären');
    });
  });

  describe('explainPrompt', () => {
    it('IncludesMandateAndCandidateFacts', () => {
      const { system, prompt } = explainPrompt(docs(), mandate, ['React']);
      expect(system).toContain('JSON');
      expect(prompt).toContain('Vue Frontend Engineer');
      expect(prompt).toContain('Lena');
    });

    it('BareMandateAndSparseCandidate_OmitsMissingParts', () => {
      const sparse = docs(
        { summary: '', experience: [], education: [], skillGroups: [] },
        '', // no name
      );
      sparse.contact.role = '';
      const { prompt } = explainPrompt(sparse, { role: 'Engineer', location: '' }, []);
      expect(prompt).toContain('Engineer');
      expect(prompt).not.toContain('bei '); // no client
      expect(prompt).not.toContain('Überschneidende Skills');
    });
  });

  describe('fallbackExplanation edge cases', () => {
    it('SingleSkill_UsesSingularSummary', () => {
      const e = fallbackExplanation(docs(), mandate, ['React']);
      expect(e.summary).toContain('1 passende Kompetenz ');
    });

    it('StationWithoutCompany_StillListsRole', () => {
      const d = docs({
        summary: '',
        experience: [
          { role: 'Lead', company: '', period: '', location: '', bullets: [], skills: [] },
        ],
      });
      const e = fallbackExplanation(d, mandate, []);
      expect(e.reasons.some((r) => r.includes('Lead'))).toBe(true);
    });

    it('StationWithoutRole_StillListsCompany', () => {
      const d = docs({
        summary: '',
        experience: [
          { role: '', company: 'Acme', period: '', location: '', bullets: [], skills: [] },
        ],
      });
      const e = fallbackExplanation(d, mandate, []);
      expect(e.reasons.some((r) => r.includes('Acme'))).toBe(true);
    });
  });

  describe('normalizeExplanation', () => {
    it('TrimsAndClampsToFourReasons', () => {
      const raw = explanationResultSchema.parse({
        summary: '  Passt gut  ',
        reasons: ['a', '', 'b', 'c', 'd', 'e'],
      });
      const e = normalizeExplanation(raw, ['React']);
      expect(e.summary).toBe('Passt gut');
      expect(e.reasons).toEqual(['a', 'b', 'c', 'd']);
      expect(e.matchedSkills).toEqual(['React']);
    });
  });
});
