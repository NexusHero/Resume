import { buildRetentionReport, RETENTION_REVIEW_DAYS } from '../../src/domain/retention.js';
import { anonymizeTalent, ANONYMIZED_NAME } from '../../src/domain/talent.js';
import type { Talent } from '../../src/domain/talent.js';
import type { Candidacy } from '../../src/domain/candidacy.js';

const NOW = '2026-07-01T00:00:00.000Z';

const talent = (id: string, updatedAt: string, over: Partial<Talent> = {}): Talent => ({
  id,
  ownerId: 'team',
  name: `Talent ${id}`,
  role: 'Engineer',
  headline: 'h',
  location: 'Berlin',
  email: `${id}@x.de`,
  phone: '123',
  availability: 'now',
  salary: '80k',
  skills: ['C++'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt,
  ...over,
});

const candidacy = (talentId: string, stage: Candidacy['stage'], updatedAt: string): Candidacy => ({
  id: `c-${talentId}`,
  ownerId: 'team',
  mandateId: 'm1',
  talentId,
  stage,
  note: '',
  order: 0,
  createdAt: updatedAt,
  updatedAt,
});

describe('retention domain', () => {
  it('BuildReport_FlagsInactiveNonAnonymized_OldestFirst', () => {
    const talents = [
      talent('t1', '2025-01-01T00:00:00.000Z'), // ~1.5y inactive → due
      talent('t2', '2024-06-01T00:00:00.000Z'), // older → first
      talent('t3', NOW), // fresh → not due
    ];
    const report = buildRetentionReport(talents, new Map(), NOW);
    expect(report.map((r) => r.talentId)).toEqual(['t2', 't1']); // oldest first, t3 excluded
    expect(report[0]?.inactiveDays).toBeGreaterThan(RETENTION_REVIEW_DAYS);
  });

  it('BuildReport_ExcludesTalentsWithActivePipeline', () => {
    const talents = [talent('t1', '2025-01-01T00:00:00.000Z')];
    const byTalent = new Map([['t1', [candidacy('t1', 'interview', '2025-01-01T00:00:00.000Z')]]]);
    expect(buildRetentionReport(talents, byTalent, NOW)).toEqual([]);
  });

  it('BuildReport_IncludesTalentsWithOnlyTerminalCandidacies', () => {
    const talents = [talent('t1', '2025-01-01T00:00:00.000Z')];
    const byTalent = new Map([['t1', [candidacy('t1', 'rejected', '2025-01-01T00:00:00.000Z')]]]);
    const report = buildRetentionReport(talents, byTalent, NOW);
    expect(report).toHaveLength(1);
    expect(report[0]?.lastActivity).toBe('2025-01-01T00:00:00.000Z');
  });

  it('BuildReport_ExcludesAlreadyAnonymized', () => {
    const talents = [talent('t1', '2025-01-01T00:00:00.000Z', { anonymizedAt: NOW })];
    expect(buildRetentionReport(talents, new Map(), NOW)).toEqual([]);
  });

  it('BuildReport_RespectsReviewWindow', () => {
    const talents = [talent('t1', '2026-06-01T00:00:00.000Z')]; // ~30 days inactive
    expect(buildRetentionReport(talents, new Map(), NOW, 180)).toEqual([]); // under window
    expect(buildRetentionReport(talents, new Map(), NOW, 10)).toHaveLength(1); // over a 10d window
  });

  it('AnonymizeTalent_ClearsPiiKeepsRoleAndSkills', () => {
    const anon = anonymizeTalent(talent('t1', '2025-01-01T00:00:00.000Z'), NOW);
    expect(anon.name).toBe(ANONYMIZED_NAME);
    expect(anon.email).toBe('');
    expect(anon.phone).toBe('');
    expect(anon.salary).toBe('');
    expect(anon.role).toBe('Engineer'); // kept
    expect(anon.skills).toEqual(['C++']); // kept
    expect(anon.anonymizedAt).toBe(NOW);
  });
});
