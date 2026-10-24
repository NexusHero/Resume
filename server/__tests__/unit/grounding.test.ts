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

    it('CheckGrounding_FabricatedYear_Flagged', () => {
      const src = groundingSource(
        docs({
          experience: [
            {
              role: 'Dev',
              company: 'Acme',
              period: '2014–2018',
              location: '',
              bullets: [],
              skills: [],
            },
          ],
        }),
      );
      const r = checkGrounding('Seit 2019 im Unternehmen tätig.', src);
      expect(r.unsupported.some((u) => u.kind === 'year' && u.text === '2019')).toBe(true);
    });

    it('CheckGrounding_YearInsideBasePeriodRange_NotFlagged', () => {
      const src = groundingSource(
        docs({
          experience: [
            {
              role: 'Dev',
              company: 'Acme',
              period: '2014–2018',
              location: '',
              bullets: [],
              skills: [],
            },
          ],
        }),
      );
      const r = checkGrounding('Zwischen 2016 und 2017 verantwortlich.', src);
      expect(r.unsupported.filter((u) => u.kind === 'year')).toEqual([]);
    });

    it('CheckGrounding_YearInOversizedRange_Flagged', () => {
      // A range wider than 50 years only evidences its endpoints (defensive cap).
      const src = groundingSource(
        docs({
          experience: [
            {
              role: 'Dev',
              company: 'Acme',
              period: '1900–2099',
              location: '',
              bullets: [],
              skills: [],
            },
          ],
        }),
      );
      const r = checkGrounding('Started in 1950.', src);
      expect(r.unsupported.some((u) => u.kind === 'year' && u.text === '1950')).toBe(true);
    });

    it('CheckGrounding_FabricatedDegree_Flagged', () => {
      const src = groundingSource(
        docs({
          education: [{ degree: 'Bachelor of Science', school: 'TU', period: '2010', note: '' }],
        }),
      );
      const r = checkGrounding('Abschluss: Master of Science.', src);
      expect(r.unsupported.some((u) => u.kind === 'degree' && u.text === 'Master')).toBe(true);
    });

    it('CheckGrounding_DegreeEvidencedByBase_NotFlagged', () => {
      const src = groundingSource(
        docs({
          education: [{ degree: 'Bachelor of Science', school: 'TU', period: '2010', note: '' }],
        }),
      );
      const r = checkGrounding('Abschluss: Bachelor of Science.', src);
      expect(r.unsupported.filter((u) => u.kind === 'degree')).toEqual([]);
    });

    it('CheckGrounding_ExistingNumberAndSkill_StillPass', () => {
      const src = groundingSource(docs());
      const r = checkGrounding('7 Jahre Erfahrung mit React.', src);
      expect(r.grounded).toBe(true);
      expect(r.unsupported).toEqual([]);
    });
  });
});
