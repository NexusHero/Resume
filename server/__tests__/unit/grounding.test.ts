import { checkGrounding, groundingSource } from '../../src/domain/grounding.js';
import type { TalentDocuments } from '../../src/domain/talent-documents.js';

const docs = (over: Partial<TalentDocuments['resume']> = {}): TalentDocuments => ({
  ownerId: 'team',
  talentId: 't1',
  contact: { name: 'Lena', role: '', email: '', phone: '', location: '', linkedin: '' },
  resume: {
    summary: 'Software Engineer mit 7 Jahren Erfahrung.',
    experience: [
      {
        role: 'Dev',
        company: 'Acme',
        period: '',
        location: '',
        bullets: ['React genutzt'],
        skills: ['React'],
      },
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

describe('grounding', () => {
  describe('groundingSource', () => {
    it('NullDocuments_ReturnsExtraOnly', () => {
      expect(groundingSource(null, 'mandate text')).toBe('mandate text');
    });
    it('CollectsSummarySkillsAndExperience', () => {
      const s = groundingSource(docs());
      expect(s).toContain('React');
      expect(s).toContain('Acme');
      expect(s).toContain('7 Jahren');
    });
  });

  describe('checkGrounding', () => {
    it('FullySupportedText_IsGrounded', () => {
      const src = groundingSource(docs());
      const r = checkGrounding('Lena hat 7 Jahre Erfahrung mit React und TypeScript.', src);
      expect(r.grounded).toBe(true);
      expect(r.unsupported).toEqual([]);
    });

    it('FlagsInflatedYears', () => {
      const src = groundingSource(docs()); // CV says 7 years
      const r = checkGrounding('Verfügt über 12 Jahre Erfahrung.', src);
      expect(r.grounded).toBe(false);
      expect(r.unsupported.some((u) => u.kind === 'number' && u.text.includes('12'))).toBe(true);
    });

    it('FlagsFabricatedSkill', () => {
      const src = groundingSource(docs()); // no Kubernetes in CV
      const r = checkGrounding('Erfahrener Entwickler mit Kubernetes und Docker.', src);
      const skills = r.unsupported.filter((u) => u.kind === 'skill').map((u) => u.text);
      expect(skills).toEqual(expect.arrayContaining(['kubernetes', 'docker']));
    });

    it('DoesNotFlagSupportedSkill', () => {
      const src = groundingSource(docs());
      const r = checkGrounding('Stark in React.', src);
      expect(r.unsupported.filter((u) => u.kind === 'skill')).toEqual([]);
    });

    it('DeduplicatesRepeatedClaims', () => {
      const src = groundingSource(docs());
      const r = checkGrounding('Kubernetes, Kubernetes, Kubernetes.', src);
      expect(r.unsupported).toHaveLength(1);
    });

    it('SupportedPercentIsGrounded', () => {
      const r = checkGrounding('Quote von 50 % erreicht.', 'Ergebnis: 50 % Steigerung.');
      expect(r.grounded).toBe(true);
    });
  });
});
