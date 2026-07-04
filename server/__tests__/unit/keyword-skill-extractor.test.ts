import {
  KeywordSkillExtractor,
  type SkillDefinition,
} from '../../src/adapters/keyword-skill-extractor.js';

const extractor = new KeywordSkillExtractor();

describe('KeywordSkillExtractor', () => {
  it('Extract_PlainMentions_AreFound', () => {
    expect(extractor.extract('We use Rust and Kubernetes daily')).toEqual(
      expect.arrayContaining(['Rust', 'Kubernetes']),
    );
  });

  it('Extract_MultiWordSkill_IsFound', () => {
    expect(extractor.extract('experience with distributed systems')).toContain(
      'Distributed Systems',
    );
  });

  it('Extract_Aliases_MapToCanonicalName', () => {
    expect(extractor.extract('Golang microservice on k8s')).toEqual(
      expect.arrayContaining(['Go', 'Microservices', 'Kubernetes']),
    );
  });

  it('Extract_SymbolSkills_CppAndCSharp', () => {
    const skills = extractor.extract('Strong C++ and C# background');
    expect(skills).toContain('C++');
    expect(skills).toContain('C#');
  });

  it('Extract_JavaInsideJavaScript_DoesNotFalseMatchJava', () => {
    const skills = extractor.extract('Frontend in JavaScript only');
    expect(skills).toContain('JavaScript');
    expect(skills).not.toContain('Java');
  });

  it('Extract_GoBoundaries_NoFalsePositiveInGoogle', () => {
    expect(extractor.extract('We love Google and good food')).not.toContain('Go');
    expect(extractor.extract('Backend in Go')).toContain('Go');
  });

  it('Extract_CaseInsensitive', () => {
    expect(extractor.extract('built on POSTGRES')).toContain('PostgreSQL');
  });

  it('Extract_EmptyOrBlank_ReturnsEmpty', () => {
    expect(extractor.extract('')).toEqual([]);
    expect(extractor.extract('   ')).toEqual([]);
  });

  it('Extract_NoKnownSkills_ReturnsEmpty', () => {
    expect(extractor.extract('Sachbearbeiter im Vertrieb')).toEqual([]);
  });

  it('Extract_CustomTaxonomy_IsHonoured', () => {
    const taxonomy: SkillDefinition[] = [{ name: 'COBOL' }];
    const custom = new KeywordSkillExtractor(taxonomy);
    expect(custom.extract('Maintain COBOL on Rust')).toEqual(['COBOL']);
  });
});
