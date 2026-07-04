import { detectLanguage } from '../../src/domain/language.js';

describe('detectLanguage', () => {
  it('GermanJobAd_DetectsDe', () => {
    const text =
      'Wir suchen eine erfahrene Softwareentwicklerin mit fundierten Kenntnissen in C++ ' +
      'und mehrjähriger Erfahrung. Zu Ihren Aufgaben gehört die Entwicklung neuer Module.';
    expect(detectLanguage(text)).toBe('de');
  });

  it('EnglishJobAd_DetectsEn', () => {
    const text =
      'We are looking for an experienced software engineer with strong skills in C++ ' +
      'and several years of experience. Your tasks will include building new modules.';
    expect(detectLanguage(text)).toBe('en');
  });

  it('Umlauts_TipToGerman', () => {
    expect(detectLanguage('Softwareentwickler für Steuerungssysteme, üöä')).toBe('de');
  });

  it('EmptyOrTooShort_UsesFallback', () => {
    expect(detectLanguage('')).toBe('en');
    expect(detectLanguage('  ', 'de')).toBe('de');
    expect(detectLanguage('ok')).toBe('en');
  });

  it('NoSignal_UsesFallback', () => {
    // Proper nouns / codes with no stopwords in either language.
    expect(detectLanguage('React TypeScript Kubernetes AWS', 'de')).toBe('de');
  });

  it('Nullish_IsSafe', () => {
    expect(detectLanguage(undefined as unknown as string)).toBe('en');
  });
});
