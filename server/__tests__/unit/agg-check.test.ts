import { checkAgg, aggCheckSchema, rewriteAgg } from '../../src/domain/agg-check.js';

describe('agg-check domain', () => {
  it('CleanText_NoMarker_ReportsNoneButHintsMarker', () => {
    const r = checkAgg('Wir suchen eine erfahrene Fachkraft für unser Team.');
    expect(r.riskLevel).toBe('none');
    expect(r.findings).toEqual([]);
    expect(r.hasGenderMarker).toBe(false);
    expect(r.summary).toContain('(m/w/d)');
  });

  it('CleanText_WithMarker_ReportsNoneNoHint', () => {
    const r = checkAgg('Softwareentwickler (m/w/d) mit Erfahrung gesucht.');
    expect(r.riskLevel).toBe('none');
    expect(r.hasGenderMarker).toBe(true);
    expect(r.summary).not.toContain('(m/w/d)');
  });

  it('FlagsAgeCodedTeamPhrase', () => {
    const r = checkAgg('Werde Teil von unserem jungen dynamischen Team!');
    const ages = r.findings.filter((f) => f.category === 'alter');
    expect(ages.length).toBeGreaterThan(0);
    expect(ages[0]?.suggestion).toBeTruthy();
  });

  it('FlagsExplicitGenderAsHighRisk', () => {
    const r = checkAgg('Gesucht wird ein männlicher Bewerber.');
    const gender = r.findings.find((f) => f.category === 'geschlecht');
    expect(gender?.severity).toBe('high');
    expect(r.riskLevel).toBe('high');
  });

  it('FlagsNativeSpeakerAsOriginRisk', () => {
    const r = checkAgg('Muttersprachler Deutsch zwingend erforderlich.');
    expect(r.findings.some((f) => f.category === 'herkunft')).toBe(true);
  });

  it('FlagsAgeRangeAsHighRisk', () => {
    const r = checkAgg('Bewerber zwischen 20-30 Jahre bevorzugt.');
    const age = r.findings.find((f) => f.category === 'alter' && f.severity === 'high');
    expect(age).toBeTruthy();
    expect(r.riskLevel).toBe('high');
  });

  it('FlagsBelastbarAsDisabilityRisk', () => {
    const r = checkAgg('Sie sind körperlich voll belastbar und gesund.');
    expect(r.findings.some((f) => f.category === 'behinderung')).toBe(true);
  });

  it('FlagsReligionRequirement', () => {
    const r = checkAgg('Christliche Werte werden vorausgesetzt.');
    expect(r.findings.some((f) => f.category === 'religion')).toBe(true);
  });

  it('DeduplicatesRepeatedPhrases', () => {
    const r = checkAgg('männlich männlich männlich');
    expect(r.findings.filter((f) => f.category === 'geschlecht')).toHaveLength(1);
  });

  it('SortsMostSevereFirst', () => {
    const r = checkAgg('Junges Team gesucht, männlicher Bewerber, jung.');
    expect(r.findings[0]?.severity).toBe('high'); // gender high before age medium/low
  });

  it('OnlyLowRule_ReportsLowRisk', () => {
    const r = checkAgg('Ein jung Bewerber gesucht.');
    expect(r.riskLevel).toBe('low');
    expect(r.findings.every((f) => f.severity === 'low')).toBe(true);
  });

  it('SingularSummary_WithMarker_EndsWithPeriod', () => {
    const r = checkAgg('männlich (m/w/d)');
    expect(r.hasGenderMarker).toBe(true);
    expect(r.summary).toBe('1 Hinweis gefunden.');
  });

  it('Schema_DefaultsEmptyText', () => {
    expect(aggCheckSchema.parse({})).toEqual({ text: '' });
  });
});

describe('rewriteAgg — the AGG writing aid', () => {
  it('Rewrite_ReplacesSafePhrases_ReportsEdits', () => {
    const r = rewriteAgg('Wir sind ein junges dynamisches Team und suchen Digital Natives.');
    expect(r.changed).toBe(true);
    expect(r.text).toContain('motiviertes Team');
    expect(r.text).toContain('sicherer Umgang mit digitalen Tools');
    expect(r.text).not.toMatch(/digital natives/i);
    expect(r.edits.map((e) => e.to)).toEqual(
      expect.arrayContaining(['motiviertes Team', 'sicherer Umgang mit digitalen Tools']),
    );
  });

  it('Rewrite_LeavesHardCasesUnresolved', () => {
    // an age limit has no safe mechanical rewrite — flagged, not changed
    const r = rewriteAgg('Bewerber max. 35 Jahre, keine Ausländer.');
    expect(r.changed).toBe(false);
    expect(r.unresolved.some((f) => f.category === 'alter')).toBe(true);
    expect(r.unresolved.some((f) => f.category === 'herkunft')).toBe(true);
  });

  it('Rewrite_CleanText_NoChange', () => {
    const r = rewriteAgg('Wir suchen eine erfahrene Fachkraft (m/w/d).');
    expect(r.changed).toBe(false);
    expect(r.edits).toEqual([]);
    expect(r.unresolved).toEqual([]);
  });

  it('Rewrite_ResolvedPhrasesLeaveNoResidualFinding', () => {
    const r = rewriteAgg('Muttersprachler Deutsch gewünscht.');
    expect(r.text).toContain('verhandlungssicheres Deutsch (C1)');
    expect(r.unresolved.some((f) => f.category === 'herkunft')).toBe(false);
  });
});
