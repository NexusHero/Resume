import {
  parsePrompt,
  extractJson,
  fallbackParsed,
  parsePdfRequestSchema,
} from '../../src/domain/document-parse.js';

describe('document-parse', () => {
  it('ParsePdfRequest_RequiresNonEmptyData', () => {
    expect(parsePdfRequestSchema.safeParse({ dataBase64: 'AAAA' }).success).toBe(true);
    expect(parsePdfRequestSchema.safeParse({ dataBase64: '' }).success).toBe(false);
    expect(parsePdfRequestSchema.safeParse({}).success).toBe(false);
  });

  it('ParsePrompt_AsksForStrictJsonWithSchema', () => {
    const { system, prompt } = parsePrompt('Max Mustermann, C++ Engineer');
    expect(system).toContain('JSON');
    expect(system).toContain('skillGroups');
    expect(prompt).toContain('Max Mustermann');
  });

  it('ParsePrompt_InstructionsAreEnglish', () => {
    const { system, prompt } = parsePrompt('irrelevant');
    expect(system).toContain('You are a resume parser');
    expect(system).toContain('Do not invent anything');
    expect(system).not.toContain('Lebensläufe');
    expect(prompt).toContain('Resume text:');
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
