import { parsePrompt, extractJson, fallbackParsed } from '../../src/domain/document-parse';

describe('document-parse', () => {
  it('ParsePrompt_AsksForStrictJsonWithSchema', () => {
    const { system, prompt } = parsePrompt('Max Mustermann, C++ Engineer');
    expect(system).toContain('JSON');
    expect(system).toContain('skillGroups');
    expect(prompt).toContain('Max Mustermann');
  });

  it('ExtractJson_ParsesFencedOrPaddedReplies', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Hier:\n{"b":2} — fertig')).toEqual({ b: 2 });
    expect(extractJson('no json here')).toBeNull();
    expect(extractJson('{broken')).toBeNull();
  });

  it('FallbackParsed_KeepsTextAsSummary', () => {
    const out = fallbackParsed('  Erfahrener   Ingenieur.  ');
    expect(out.resume.summary).toBe('Erfahrener Ingenieur.');
  });
});
