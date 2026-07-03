import { MatchService } from '../../src/services/match-service';
import { HashedEmbeddingProvider } from '../../src/adapters/hashed-embedding-provider';
import { NotFoundError } from '../../src/domain/errors';
import {
  InMemoryMandateRepository,
  InMemoryTalentRepository,
  InMemoryDocumentRepository,
  InMemoryCandidacyRepository,
} from '../support/fakes';
import type { Talent } from '../../src/domain/talent';
import type { Mandate } from '../../src/domain/mandate';
import type { Candidacy } from '../../src/domain/candidacy';

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
