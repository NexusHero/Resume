import {
  appendStatusChange,
  changeJobApplicationStatusSchema,
  createJobApplicationSchema,
  mapLegacyStatus,
} from '../../src/domain/job-application.js';

describe('createJobApplicationSchema', () => {
  it('CreateJobApplicationSchema_MissingPostingOrTalent_Rejected', () => {
    expect(createJobApplicationSchema.safeParse({}).success).toBe(false);
    expect(createJobApplicationSchema.safeParse({ jobPostingId: 'p' }).success).toBe(false);
    expect(createJobApplicationSchema.safeParse({ talentId: 't' }).success).toBe(false);
    expect(createJobApplicationSchema.safeParse({ jobPostingId: '', talentId: 't' }).success).toBe(
      false,
    );
    expect(createJobApplicationSchema.safeParse({ jobPostingId: 'p', talentId: 't' }).success).toBe(
      true,
    );
    // .strict(): unknown keys are rejected.
    expect(
      createJobApplicationSchema.safeParse({ jobPostingId: 'p', talentId: 't', extra: 1 }).success,
    ).toBe(false);
  });
});

describe('changeJobApplicationStatusSchema', () => {
  it('ChangeJobApplicationStatusSchema_InvalidStatus_Rejected', () => {
    expect(changeJobApplicationStatusSchema.safeParse({ status: 'nope' }).success).toBe(false);
    expect(changeJobApplicationStatusSchema.safeParse({ status: 'draft' }).success).toBe(true);
    expect(changeJobApplicationStatusSchema.safeParse({ status: 'rejected' }).success).toBe(true);
  });
});

describe('appendStatusChange', () => {
  it('AppendStatusChange_AppendsWithTimestamp', () => {
    const history = [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }];
    const next = appendStatusChange(history, 'sent', '2026-06-25T10:01:00.000Z');
    expect(next).toEqual([
      { status: 'draft', at: '2026-06-25T10:00:00.000Z' },
      { status: 'sent', at: '2026-06-25T10:01:00.000Z' },
    ]);
    // Invariant: status === statusHistory.at(-1).status.
    expect(next[next.length - 1].status).toBe('sent');
    // Append-only: the input history is not mutated.
    expect(history).toHaveLength(1);
  });
});

describe('legacy status mapping', () => {
  it('LegacyStatusMapping_MapsOldToNew', () => {
    expect(mapLegacyStatus('sent')).toBe('sent');
    expect(mapLegacyStatus('screening')).toBe('sent');
    expect(mapLegacyStatus('interview')).toBe('interview');
    expect(mapLegacyStatus('offer')).toBe('offer');
    expect(mapLegacyStatus('hired')).toBe('offer');
    expect(mapLegacyStatus('rejected')).toBe('rejected');
    // Unknown legacy statuses degrade to a safe draft.
    expect(mapLegacyStatus('bogus')).toBe('draft');
  });
});
