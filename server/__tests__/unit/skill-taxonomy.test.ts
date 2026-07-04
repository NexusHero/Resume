import { canonicalizeSkill, canonicalizeSkills } from '../../src/domain/skill-taxonomy.js';

describe('skill-taxonomy', () => {
  describe('canonicalizeSkill', () => {
    it('MapsSpellingVariantsToOneForm', () => {
      expect(canonicalizeSkill('react.js')).toBe('React');
      expect(canonicalizeSkill('ReactJS')).toBe('React');
      expect(canonicalizeSkill('REACT')).toBe('React');
      expect(canonicalizeSkill('nodejs')).toBe('Node.js');
      expect(canonicalizeSkill('k8s')).toBe('Kubernetes');
      expect(canonicalizeSkill('postgres')).toBe('PostgreSQL');
    });

    it('PreservesUnknownSkillsTrimmed', () => {
      expect(canonicalizeSkill('  COBOL  ')).toBe('COBOL');
      expect(canonicalizeSkill('Salesforce Apex')).toBe('Salesforce Apex');
    });

    it('HandlesNullishAndEmpty', () => {
      expect(canonicalizeSkill('')).toBe('');
      expect(canonicalizeSkill(undefined as unknown as string)).toBe('');
    });
  });

  describe('canonicalizeSkills', () => {
    it('DedupesVariantsThatCollapse', () => {
      expect(canonicalizeSkills(['React', 'react.js', 'ReactJS'])).toEqual(['React']);
    });

    it('KeepsDistinctSkillsAndOrder', () => {
      expect(canonicalizeSkills(['react', 'TypeScript', 'k8s', 'COBOL'])).toEqual([
        'React',
        'TypeScript',
        'Kubernetes',
        'COBOL',
      ]);
    });

    it('DropsBlanks', () => {
      expect(canonicalizeSkills(['React', '', '   '])).toEqual(['React']);
    });
  });
});
