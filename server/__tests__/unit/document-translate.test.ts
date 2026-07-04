import {
  translatePrompt,
  translateResultSchema,
  translateRequestSchema,
} from '../../src/domain/document-translate.js';
import type { TalentDocuments } from '../../src/domain/talent-documents.js';

const docs = (): TalentDocuments => ({
  ownerId: 'team',
  talentId: 't1',
  contact: { name: 'Lena', role: 'Entwicklerin', email: '', phone: '', location: '', linkedin: '' },
  resume: {
    summary: 'Erfahrene Entwicklerin.',
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
    skillGroups: [{ label: 'Sprachen', items: ['TypeScript'] }],
  },
  letter: {
    firma: '',
    ansprechpartner: '',
    strasse: '',
    plzOrt: '',
    betreff: '',
    anrede: '',
    absaetze: ['Hallo'],
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

describe('document-translate', () => {
  describe('translateRequestSchema', () => {
    it('AcceptsKnownLangs', () => {
      expect(translateRequestSchema.parse({ targetLang: 'en' })).toEqual({ targetLang: 'en' });
      expect(translateRequestSchema.parse({ targetLang: 'de' })).toEqual({ targetLang: 'de' });
    });
    it('RejectsUnknownLang', () => {
      expect(() => translateRequestSchema.parse({ targetLang: 'fr' })).toThrow();
    });
  });

  describe('translatePrompt', () => {
    it('NamesTargetLanguageAndCarriesTheBody', () => {
      const { system, prompt } = translatePrompt(docs(), 'en');
      expect(system).toContain('English');
      expect(prompt).toContain('English');
      expect(prompt).toContain('Erfahrene Entwicklerin'); // the source text to translate
    });
    it('GermanTarget_NamesGerman', () => {
      expect(translatePrompt(docs(), 'de').system).toContain('German');
    });
  });

  describe('translateResultSchema', () => {
    it('ValidatesAndFillsDefaults', () => {
      const parsed = translateResultSchema.parse({
        resume: { summary: 'Experienced developer.' },
        letter: { absaetze: ['Hello'] },
      });
      expect(parsed.resume.summary).toBe('Experienced developer.');
      expect(parsed.resume.experience).toEqual([]); // defaulted
      expect(parsed.letter.absaetze).toEqual(['Hello']);
    });
  });
});
