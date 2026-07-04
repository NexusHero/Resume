import { extractRequirements } from '../../src/domain/job-requirements.js';

describe('job-requirements extraction', () => {
  it('EmptyText_AllBucketsEmpty', () => {
    expect(extractRequirements('')).toEqual({
      musts: [],
      shoulds: [],
      obligations: [],
      processHints: [],
    });
  });

  it('ClassifiesMustShouldObligationAndProcess', () => {
    const ad = [
      'Ihr Profil:',
      '- Abgeschlossenes Studium der Informatik ist erforderlich',
      '- Mindestens 5 Jahre Erfahrung in C++',
      '- Kenntnisse in Rust sind von Vorteil',
      '- Führerschein Klasse B erforderlich',
      '- Verhandlungssicheres Deutsch (C1)',
      '- Der Prozess umfasst eine technische Arbeitsprobe',
    ].join('\n');
    const r = extractRequirements(ad);
    expect(r.musts.some((m) => m.includes('Studium'))).toBe(true);
    expect(r.musts.some((m) => m.includes('5 Jahre'))).toBe(true);
    expect(r.shoulds.some((s) => s.includes('Rust'))).toBe(true);
    expect(r.obligations.some((o) => o.includes('Führerschein'))).toBe(true);
    expect(r.obligations.some((o) => o.includes('Deutsch'))).toBe(true);
    expect(r.processHints.some((p) => p.includes('Arbeitsprobe'))).toBe(true);
  });

  it('StripsBulletMarkersAndSkipsShortLines', () => {
    const r = extractRequirements('•  Reisebereitschaft erforderlich\n\nok');
    expect(r.obligations).toEqual(['Reisebereitschaft erforderlich']);
  });

  it('SoftFlagOutranksBareMust', () => {
    // "von Vorteil" (should) wins over the "erforderlich" token in the same line
    const r = extractRequirements('Zertifikat wäre von Vorteil, aber nicht zwingend erforderlich');
    expect(r.shoulds.length).toBe(1);
    expect(r.obligations).toEqual([]);
    expect(r.musts).toEqual([]);
  });

  it('DeduplicatesRepeatedLines', () => {
    const r = extractRequirements('C++ erforderlich\nC++ erforderlich');
    expect(r.musts).toHaveLength(1);
  });

  it('CapsEachBucketAtEight', () => {
    const many = Array.from({ length: 12 }, (_, i) => `Skill ${i} ist erforderlich`).join('\n');
    expect(extractRequirements(many).musts).toHaveLength(8);
  });
});
