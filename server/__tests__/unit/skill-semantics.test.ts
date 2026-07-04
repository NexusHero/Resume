import {
  trigramSimilarity,
  jobClusters,
  skillMatchesJob,
} from '../../src/domain/skill-semantics.js';
import { tokenize } from '../../src/domain/ats-ai.js';

const tokens = (s: string) => tokenize(s);

describe('skill-semantics', () => {
  describe('trigramSimilarity', () => {
    it('IdenticalStrings_ScoreOne', () => {
      expect(trigramSimilarity('react', 'react')).toBe(1);
    });
    it('SpellingVariants_ScoreHigh', () => {
      expect(trigramSimilarity('typescript', 'typescript')).toBe(1);
      expect(trigramSimilarity('nodejs', 'node.js')).toBeGreaterThan(0.5);
    });
    it('UnrelatedStrings_ScoreLow', () => {
      expect(trigramSimilarity('react', 'cobol')).toBeLessThan(0.3);
    });
    it('ShortStrings_ExactOnly', () => {
      expect(trigramSimilarity('go', 'go')).toBe(1);
      expect(trigramSimilarity('go', 'r')).toBe(0);
      expect(trigramSimilarity('a', 'a')).toBe(1); // single char, equal
    });
  });

  describe('skillMatchesJob', () => {
    const jt = (s: string) => {
      const t = tokens(s);
      return { t, c: jobClusters(t) };
    };

    it('ExactTokenMatch', () => {
      const { t, c } = jt('senior react engineer');
      expect(skillMatchesJob('React', t, c)).toBe(true);
    });

    it('OntologyClusterMatch_ReactAnswersFrontend', () => {
      const { t, c } = jt('we build a vue frontend');
      // candidate has React; job mentions Vue → same cluster
      expect(skillMatchesJob('React', t, c)).toBe(true);
    });

    it('OntologyClusterMatch_PostgresAnswersSql', () => {
      const { t, c } = jt('strong sql skills required');
      expect(skillMatchesJob('PostgreSQL', t, c)).toBe(true);
    });

    it('FuzzyMatch_SpellingVariant', () => {
      const { t, c } = jt('experience with kubernetes');
      expect(skillMatchesJob('kubernets', t, c)).toBe(true); // typo still matches
    });

    it('NoMatch_UnrelatedSkill', () => {
      const { t, c } = jt('react frontend role');
      expect(skillMatchesJob('COBOL', t, c)).toBe(false);
    });
  });

  describe('jobClusters', () => {
    it('CollectsClustersFromTokens', () => {
      const c = jobClusters(tokens('react and postgres'));
      expect(c.size).toBe(2); // frontend + database clusters
    });
    it('EmptyForUnknownTokens', () => {
      expect(jobClusters(tokens('lorem ipsum dolor')).size).toBe(0);
    });
  });
});
