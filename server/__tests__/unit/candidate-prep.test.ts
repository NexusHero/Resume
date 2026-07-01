import {
  fallbackPrep,
  mergePrep,
  prepPrompt,
  prepResultSchema,
} from '../../src/domain/candidate-prep';
import { companyInterviewProfile } from '../../src/domain/company-archetype';
import { extractRequirements } from '../../src/domain/job-requirements';
import type { MandateContext } from '../../src/domain/match-explain';
import type { TalentDocuments } from '../../src/domain/talent-documents';

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

const mandate: MandateContext = { role: 'Frontend Engineer', location: 'Berlin', client: 'Google' };
const jobAd = [
  'Wir suchen Frontend Engineer (m/w/d)',
  '- Erfahrung mit React ist erforderlich',
  '- Führerschein Klasse B erforderlich',
  '- Der Prozess umfasst eine Coding-Challenge',
].join('\n');

const build = (documents: TalentDocuments | null = docs(), ad = jobAd) =>
  fallbackPrep(
    documents,
    mandate,
    companyInterviewProfile(mandate.client ?? '', mandate.role, ad),
    extractRequirements(ad),
    ad,
  );

describe('candidate-prep domain', () => {
  describe('fallbackPrep', () => {
    it('CarriesCompanyStyleWithProvenance', () => {
      const p = build();
      expect(p.companyLabel).toBe('US Big Tech'); // Google → curated
      expect(p.companySource).toBe('curated');
      expect(p.companyConfidence).toBe('high');
      expect(p.formats.join(' ')).toMatch(/Coding/);
    });

    it('SurfacesObligationsAndProcessFromAd', () => {
      const p = build();
      expect(p.obligations.some((o) => o.includes('Führerschein'))).toBe(true);
      expect(p.processHints.some((h) => h.includes('Coding-Challenge'))).toBe(true);
    });

    it('MarksRequirementCoverageAgainstCv', () => {
      const p = build();
      const react = p.requirementChecks.find((c) => c.text.includes('React'));
      expect(react?.covered).toBe(true); // CV shows React
    });

    it('ListsMatchingStrengthsFromCv', () => {
      const p = build();
      expect(p.strengths).toContain('React');
    });

    it('ProducesLikelyQuestionsStarAnswersAndCandidateQuestions', () => {
      const p = build();
      expect(p.likelyQuestions.length).toBeGreaterThan(0);
      expect(p.starAnswers.length).toBeGreaterThan(0);
      expect(p.starAnswers[0]?.scaffold).toMatch(/Situation:/);
      expect(p.candidateQuestions.length).toBeGreaterThan(0);
    });

    it('NullDocuments_StillProducesGroundedPack', () => {
      const p = build(null);
      expect(p.strengths).toEqual([]);
      expect(p.likelyQuestions.length).toBeGreaterThan(0);
      expect(p.starAnswers[0]?.scaffold).toContain('einer deiner Stationen');
    });

    it('NoAdOverlap_UsesOwnSkillsForQuestions', () => {
      // CV skill (Cobol) not mentioned in the ad → strengths empty, falls back to own skills
      const d = docs({ skillGroups: [{ label: 'x', items: ['Cobol'] }], experience: [] });
      const p = build(d, 'Frontend Engineer\n- React erforderlich');
      expect(p.strengths).toEqual([]);
      expect(p.likelyQuestions.some((q) => q.question.includes('Cobol'))).toBe(true);
    });

    it('StationWithCompanyOnly_UsedInStarScaffold', () => {
      const d = docs({
        experience: [
          { role: '', company: 'BetaCorp', period: '', location: '', bullets: [], skills: [] },
        ],
      });
      const p = build(d);
      expect(p.starAnswers.some((s) => s.scaffold.includes('BetaCorp'))).toBe(true);
    });

    it('MarksUncoveredRequirementAsToVerify', () => {
      const d = docs({ skillGroups: [{ label: 'x', items: ['React'] }] });
      const p = build(d, 'Rolle\n- Python erforderlich');
      const python = p.requirementChecks.find((c) => c.text.includes('Python'));
      expect(python?.covered).toBe(false);
    });

    it('CompanyWithoutEmphasis_UsesSafeFallbacks', () => {
      const bareCompany = {
        archetype: 'default' as const,
        label: 'Test',
        source: 'archetype' as const,
        confidence: 'low' as const,
        style: { formats: [], emphasis: [], rounds: '', tips: [] },
      };
      const p = fallbackPrep(docs(), mandate, bareCompany, extractRequirements(jobAd), jobAd);
      expect(p.likelyQuestions.some((q) => q.question.includes('deine Stärke'))).toBe(true);
      expect(p.candidateQuestions.some((q) => q.includes('Fachliches'))).toBe(true);
    });
  });

  describe('prepPrompt', () => {
    it('IncludesCompanyStyleAndCandidate', () => {
      const company = companyInterviewProfile('Google', 'Frontend Engineer', jobAd);
      const { system, prompt } = prepPrompt(docs(), mandate, company, ['React']);
      expect(system).toContain('JSON');
      expect(prompt).toContain('US Big Tech');
      expect(prompt).toContain('React');
    });

    it('BareInputs_OmitClientStrengthsAndSummary', () => {
      const company = companyInterviewProfile('', 'Engineer', '');
      const sparse = docs({ summary: '', experience: [] });
      const { prompt } = prepPrompt(sparse, { role: 'Engineer', location: '' }, company, []);
      expect(prompt).toContain('Rolle: Engineer\n'); // no " bei <client>"
      expect(prompt).not.toContain('Passende Stärken');
    });
  });

  describe('mergePrep', () => {
    it('ReplacesNarrativeButKeepsGroundedFields', () => {
      const base = build();
      const raw = prepResultSchema.parse({
        likelyQuestions: [{ category: 'Fachlich', question: 'Frage?', why: 'Grund' }],
        starAnswers: [{ competency: 'X', prompt: 'P', scaffold: 'Situation: ...' }],
        candidateQuestions: ['Frage an die Firma?'],
      });
      const merged = mergePrep(base, raw);
      expect(merged.likelyQuestions).toEqual([
        { category: 'Fachlich', question: 'Frage?', why: 'Grund' },
      ]);
      expect(merged.candidateQuestions).toEqual(['Frage an die Firma?']);
      // grounded fields untouched
      expect(merged.obligations).toEqual(base.obligations);
      expect(merged.strengths).toEqual(base.strengths);
    });

    it('EmptyLlmLists_KeepDeterministicBase', () => {
      const base = build();
      const merged = mergePrep(base, prepResultSchema.parse({}));
      expect(merged.likelyQuestions).toEqual(base.likelyQuestions);
      expect(merged.starAnswers).toEqual(base.starAnswers);
      expect(merged.candidateQuestions).toEqual(base.candidateQuestions);
    });
  });
});
