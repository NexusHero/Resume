import { cosine, embed, similarityScore, EMBEDDING_DIM } from '../../src/domain/embedding';
import { hybridScore, matchText, HYBRID_WEIGHTS } from '../../src/domain/match';
import type { Talent } from '../../src/domain/talent';

const talent = (over: Partial<Talent>): Talent => ({
  id: 't1',
  ownerId: 'team',
  name: 'Jane Dev',
  role: 'Backend Engineer',
  headline: 'Distributed systems',
  location: 'Berlin',
  email: '',
  phone: '',
  availability: '',
  salary: '',
  skills: ['Go', 'Kubernetes'],
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  ...over,
});

describe('embedding domain', () => {
  it('Embed_IsDeterministicAndNormalized', () => {
    const a = embed('Senior React developer with TypeScript');
    const b = embed('Senior React developer with TypeScript');
    expect(a).toEqual(b);
    expect(a).toHaveLength(EMBEDDING_DIM);
    const norm = Math.sqrt(a.reduce((acc, x) => acc + x * x, 0));
    expect(norm).toBeCloseTo(1, 6);
  });

  it('Embed_EmptyText_ZeroVector_ScoresZero', () => {
    const zero = embed('');
    expect(zero.every((x) => x === 0)).toBe(true);
    expect(similarityScore(zero, embed('anything at all'))).toBe(0);
  });

  it('Cosine_RelatedTextsScoreHigherThanUnrelated', () => {
    const ad = embed('We build Kubernetes platforms in Go for cloud infrastructure');
    const platformEngineer = embed('Go engineer running Kubernetes clusters and cloud tooling');
    const florist = embed('Wedding bouquets, seasonal flowers and shop decoration');
    expect(cosine(ad, platformEngineer)).toBeGreaterThan(cosine(ad, florist));
    expect(similarityScore(ad, platformEngineer)).toBeGreaterThan(similarityScore(ad, florist));
  });

  it('Cosine_SurvivesInflectionsAndCompounds_ViaCharTrigrams', () => {
    // Pure token matching finds no overlap here; shared trigrams do.
    const a = embed('Datenbankentwicklung PostgreSQL');
    const b = embed('Entwicklung von Datenbanken mit Postgres');
    expect(cosine(a, b)).toBeGreaterThan(0.1);
  });

  it('SimilarityScore_NegativeCosine_ClampsToZero', () => {
    expect(similarityScore([-1, 0], [1, 0])).toBe(0);
  });
});

describe('hybrid matching (v2)', () => {
  it('HybridScore_BlendsWithDocumentedWeights', () => {
    expect(hybridScore(100, 0)).toBe(Math.round(HYBRID_WEIGHTS.skills * 100));
    expect(hybridScore(0, 100)).toBe(Math.round(HYBRID_WEIGHTS.semantic * 100));
    expect(hybridScore(100, 100)).toBe(100);
    expect(hybridScore(0, 0)).toBe(0);
  });

  it('MatchText_CollectsRoleHeadlineSkillsAndResume', () => {
    const text = matchText(talent({}), null);
    expect(text).toContain('Backend Engineer');
    expect(text).toContain('Distributed systems');
    expect(text).toContain('Go Kubernetes');
  });

  it('MatchText_EmptyProfile_IsEmpty', () => {
    const bare = talent({ role: '', headline: '', skills: [] });
    expect(matchText(bare, null)).toBe('');
  });
});
