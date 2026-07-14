import { MatchService } from '../../src/services/match-service.js';
import { HashedEmbeddingProvider } from '../../src/adapters/hashed-embedding-provider.js';
import { NotFoundError } from '../../src/domain/errors.js';
import {
  InMemoryMandateRepository,
  InMemoryTalentRepository,
  InMemoryDocumentRepository,
  InMemoryCandidacyRepository,
} from '../support/fakes.js';
import type { Talent } from '../../src/domain/talent.js';
import type { Mandate } from '../../src/domain/mandate.js';
import type { Candidacy } from '../../src/domain/candidacy.js';
import type { EmbeddingProvider } from '../../src/ports/embedding-provider.js';

/** Wraps a real provider but counts calls per distinct text, for cache assertions. */
function countingEmbeddingProvider(inner: EmbeddingProvider) {
  const callsByText = new Map<string, number>();
  const provider: EmbeddingProvider = {
    embed: async (text) => {
      callsByText.set(text, (callsByText.get(text) ?? 0) + 1);
      return inner.embed(text);
    },
  };
  return { provider, callsFor: (text: string) => callsByText.get(text) ?? 0 };
}

const SCOPE = 'team';

const talent = (id: string, over: Partial<Talent> = {}): Talent => ({
  id,
  ownerId: SCOPE,
  name: `Talent ${id}`,
  role: 'Engineer',
  headline: '',
  location: 'Berlin',
  email: '',
  phone: '',
  availability: '',
  salary: '',
  skills: [],
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
  ...over,
});

const mandate = (id: string, over: Partial<Mandate> = {}): Mandate => ({
  id,
  ownerId: SCOPE,
  client: 'Acme',
  role: 'React Engineer',
  location: 'Berlin',
  fee: '',
  feeValue: '',
  deadline: '',
  priority: 'medium',
  status: 'active',
  submitted: 0,
  interviews: 0,
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
  ...over,
});

const candidacy = (id: string, talentId: string, mandateId: string): Candidacy => ({
  id,
  ownerId: SCOPE,
  mandateId,
  talentId,
  stage: 'sourced',
  order: 0,
  note: '',
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
});

function ctx() {
  const mandates = new InMemoryMandateRepository();
  const talents = new InMemoryTalentRepository();
  const documents = new InMemoryDocumentRepository();
  const candidacies = new InMemoryCandidacyRepository();
  const service = new MatchService({
    mandateRepository: mandates,
    talentRepository: talents,
    documentRepository: documents,
    candidacyRepository: candidacies,
    embeddingProvider: new HashedEmbeddingProvider(),
  });
  return { service, mandates, talents, documents, candidacies };
}

describe('MatchService.rankForMandate', () => {
  it('UnknownMandate_Throws404', async () => {
    const c = ctx();
    await expect(c.service.rankForMandate(SCOPE, 'missing', '', 10)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('RanksPoolByFitDescending', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1', { skills: ['React', 'TypeScript'] })); // strong
    await c.talents.add(talent('t2', { skills: ['COBOL'] })); // weak
    const matches = await c.service.rankForMandate(SCOPE, 'm1', 'Looking for React TypeScript', 10);
    expect(matches.map((m) => m.talentId)).toEqual(['t1', 't2']);
    expect(matches[0]?.score).toBeGreaterThan(matches[1]?.score ?? 0);
    expect(matches[0]?.matched.sort()).toEqual(['React', 'TypeScript']);
  });

  it('RankForJobText_RanksPoolWithoutMandate_InPipelineAlwaysFalse', async () => {
    const c = ctx();
    // no mandate needed — the ad text drives the ranking (job-board path)
    await c.talents.add(talent('t1', { skills: ['React', 'TypeScript'] }));
    await c.talents.add(talent('t2', { skills: ['COBOL'] }));
    const matches = await c.service.rankForJobText(SCOPE, 'Looking for React TypeScript', 10);
    expect(matches.map((m) => m.talentId)).toEqual(['t1', 't2']);
    expect(matches.every((m) => m.inPipeline === false)).toBe(true);
  });

  it('FlagsTalentsAlreadyInPipeline', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1', { skills: ['React'] }));
    await c.candidacies.add(candidacy('c1', 't1', 'm1'));
    const matches = await c.service.rankForMandate(SCOPE, 'm1', 'React', 10);
    expect(matches[0]?.inPipeline).toBe(true);
  });

  it('ExcludesAnonymizedTalents', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1', { skills: ['React'] }));
    await c.talents.add(
      talent('t2', { skills: ['React'], anonymizedAt: '2026-06-30T00:00:00.000Z' }),
    );
    const matches = await c.service.rankForMandate(SCOPE, 'm1', 'React', 10);
    expect(matches.map((m) => m.talentId)).toEqual(['t1']);
  });

  it('EmptyJobText_MatchesOnMandateRoleAndLocation', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1', { role: 'React Engineer', location: 'Berlin' }));
    await c.talents.add(talent('t1', { role: 'React Engineer', skills: ['React'] }));
    const matches = await c.service.rankForMandate(SCOPE, 'm1', '   ', 10);
    // 'React' matched from the mandate role; role bonus applies too
    expect(matches[0]?.matched).toContain('React');
    expect(matches[0]?.score).toBeGreaterThan(0);
  });

  it('RespectsLimit', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1', { skills: ['React'] }));
    await c.talents.add(talent('t2', { skills: ['React'] }));
    await c.talents.add(talent('t3', { skills: ['React'] }));
    const matches = await c.service.rankForMandate(SCOPE, 'm1', 'React', 2);
    expect(matches).toHaveLength(2);
  });

  it('PullsSkillsFromDocuments', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1', { skills: [] }));
    await c.documents.save({
      ownerId: SCOPE,
      talentId: 't1',
      contact: { name: '', role: '', email: '', phone: '', location: '', linkedin: '' },
      resume: {
        summary: '',
        experience: [],
        education: [],
        skillGroups: [{ label: 'x', items: ['GraphQL'] }],
      },
      letter: {
        firma: '',
        ansprechpartner: '',
        strasse: '',
        plzOrt: '',
        betreff: '',
        anrede: '',
        absaetze: [],
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
    const matches = await c.service.rankForMandate(SCOPE, 'm1', 'GraphQL federation', 10);
    expect(matches[0]?.matched).toContain('GraphQL');
  });
});

describe('MatchService hybrid ranking (v2)', () => {
  it('Rank_ExposesScoreBreakdown', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1', { skills: ['React'] }));
    const [top] = await c.service.rankForMandate(SCOPE, 'm1', 'React frontend role', 10);
    expect(top).toMatchObject({
      skillScore: expect.any(Number),
      semanticScore: expect.any(Number),
    });
    expect(top!.score).toBeLessThanOrEqual(100);
    expect(top!.semanticScore).toBeGreaterThan(0); // "React" appears in role + skills
  });

  it('Rank_SemanticSimilarityBreaksSkillTies', async () => {
    const c = ctx();
    await c.mandates.add(mandate('m1'));
    // Same (empty) skill list — v1 scored both identically. The headline text
    // now separates them: one profile talks about the ad's domain.
    await c.talents.add(
      talent('fit', { role: '', headline: 'Kubernetes platform engineering in Go' }),
    );
    await c.talents.add(talent('other', { role: '', headline: 'Wedding florist and decorator' }));
    const ranked = await c.service.rankForMandate(
      SCOPE,
      'm1',
      'We run Kubernetes platforms written in Go',
      10,
    );
    expect(ranked.map((r) => r.talentId)).toEqual(['fit', 'other']);
    expect(ranked[0]!.semanticScore).toBeGreaterThan(ranked[1]!.semanticScore);
  });
});

describe('MatchService profile-embedding cache (#228)', () => {
  function ctxCounting() {
    const mandates = new InMemoryMandateRepository();
    const talents = new InMemoryTalentRepository();
    const documents = new InMemoryDocumentRepository();
    const candidacies = new InMemoryCandidacyRepository();
    const { provider, callsFor } = countingEmbeddingProvider(new HashedEmbeddingProvider());
    const service = new MatchService({
      mandateRepository: mandates,
      talentRepository: talents,
      documentRepository: documents,
      candidacyRepository: candidacies,
      embeddingProvider: provider,
    });
    return { service, mandates, talents, documents, candidacies, callsFor };
  }

  it('ReusesAProfileVector_AcrossRepeatedRankingCalls', async () => {
    const c = ctxCounting();
    await c.mandates.add(mandate('m1'));
    await c.mandates.add(mandate('m2'));
    await c.talents.add(talent('t1', { skills: ['React'] }));
    const profileText = 'Engineer\nReact';

    // Simulates the assistant evaluating multiple mandates against the same
    // pool in one run: each call previously re-embedded every profile.
    await c.service.rankForMandate('team', 'm1', 'React frontend', 10);
    await c.service.rankForMandate('team', 'm2', 'React frontend', 10);
    await c.service.rankForJobText('team', 'React frontend', 10);

    expect(c.callsFor(profileText)).toBe(1);
  });

  it('ReEmbedsWhenTheTalentRecordChanges', async () => {
    const c = ctxCounting();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1', { skills: ['React'], updatedAt: '2026-06-25T10:00:00.000Z' }));
    await c.service.rankForMandate('team', 'm1', 'React', 10);

    await c.talents.add(
      talent('t1', { skills: ['React', 'GraphQL'], updatedAt: '2026-06-26T10:00:00.000Z' }),
    );
    await c.service.rankForMandate('team', 'm1', 'React', 10);

    const oldProfileText = 'Engineer\nReact';
    const newProfileText = 'Engineer\nReact GraphQL';
    expect(c.callsFor(oldProfileText)).toBe(1);
    expect(c.callsFor(newProfileText)).toBe(1);
  });

  it('PrunesCacheEntriesForTalentsNoLongerInThePool', async () => {
    const c = ctxCounting();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1', { skills: ['React'] }));
    await c.service.rankForMandate('team', 'm1', 'React', 10);
    expect(c.callsFor('Engineer\nReact')).toBe(1);

    // t1 leaves the pool; its cache entry is pruned on the very next rank —
    // t2 (same profile text, but its own cache key) is a fresh miss.
    await c.talents.remove('team', 't1');
    await c.talents.add(talent('t2', { skills: ['React'] }));
    await c.service.rankForMandate('team', 'm1', 'React', 10);
    expect(c.callsFor('Engineer\nReact')).toBe(2);

    // t1 reappears (e.g. un-anonymized, or a fresh record with the same id
    // reused): since its old entry was pruned, this is a miss too, not a
    // silently-reused stale vector from a different talent lifecycle.
    await c.talents.add(talent('t1', { skills: ['React'] }));
    await c.service.rankForMandate('team', 'm1', 'React', 10);
    expect(c.callsFor('Engineer\nReact')).toBe(3);

    // Steady state: both t1 and t2 are now cached — a further rank adds no calls.
    await c.service.rankForMandate('team', 'm1', 'React', 10);
    expect(c.callsFor('Engineer\nReact')).toBe(3);
  });

  it('RankingResultsAreUnaffectedByTheCache', async () => {
    // The cache must be transparent: identical inputs still produce identical
    // scores whether the vector came from cache or a fresh embed() call.
    const c = ctxCounting();
    await c.mandates.add(mandate('m1'));
    await c.talents.add(talent('t1', { skills: ['React', 'TypeScript'] }));
    await c.talents.add(talent('t2', { skills: ['COBOL'] }));
    const first = await c.service.rankForMandate('team', 'm1', 'React TypeScript', 10);
    const second = await c.service.rankForMandate('team', 'm1', 'React TypeScript', 10);
    expect(second).toEqual(first);
  });
});
