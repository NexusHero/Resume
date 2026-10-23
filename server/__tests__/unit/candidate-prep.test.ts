import {
  prepFacts,
  mergePrep,
  prepPrompt,
  prepResultSchema,
} from '../../src/domain/candidate-prep.js';
import { companyInterviewProfile } from '../../src/domain/company-archetype.js';
import { extractRequirements } from '../../src/domain/job-requirements.js';
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

const mandate: MandateContext = { role: 'Frontend Engineer', location: 'Berlin', client: 'Google' };
const jobAd = [
  'Wir suchen Frontend Engineer (m/w/d)',
  '- Erfahrung mit React ist erforderlich',
  '- Führerschein Klasse B erforderlich',
  '- Der Prozess umfasst eine Coding-Challenge',
].join('\n');

const build = (documents: TalentDocuments | null = docs(), ad = jobAd) =>
  prepFacts(
    documents,
    companyInterviewProfile(mandate.client ?? '', mandate.role, ad),
    extractRequirements(ad),
    ad,
  );

describe('candidate-prep domain', () => {
  describe('prepFacts', () => {
    it('CarriesCompanyStyleWithProvenance', () => {
      const p = build();
      expect(p.companyLabel).toBe('US Big Tech'); // Google → curated
      expect(p.companySource).toBe('curated');
      expect(p.companyConfidence).toBe('high');
      expect(p.formats.join(' ')).toMatch(/coding/i);
    });

    it('SurfacesObligationsAndRequirementCoverage', () => {
      const p = build();
      expect(p.obligations.some((o) => o.includes('Führerschein'))).toBe(true);
      expect(p.requirementChecks.some((c) => c.text.includes('React') && c.covered)).toBe(true);
      expect(p.strengths).toContain('React');
    });

    it('LegacyDocumentWithoutRawText_IsAccepted', () => {
      const legacy = docs();
      delete (legacy.resume as { rawText?: string }).rawText;
      expect(() => build(legacy)).not.toThrow();
    });
  });

  describe('mergePrep', () => {
    it('CandidatePrep_MergePrepModelReturnsEmptyRequiredSections_ThrowsUpstreamProviderError', () => {
      expect(() =>
        mergePrep(build(), { likelyQuestions: [], starAnswers: [], candidateQuestions: [] }),
      ).toThrow('incomplete interview prep');
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
      expect(prompt).toContain('Role: Engineer\n'); // no " at <client>"
      expect(prompt).not.toContain('Matching strengths');
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
  });
});
