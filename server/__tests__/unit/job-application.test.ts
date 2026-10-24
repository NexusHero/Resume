import {
  appendStatusChange,
  changeJobApplicationStatusSchema,
  createJobApplicationSchema,
  jobApplicationQuerySchema,
  mapLegacyStatus,
  recipientForMappe,
  updateJobApplicationAttachmentsSchema,
  type JobApplication,
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

  it('AppendStatusChange_WithNote_AppendsTimestampedEntryWithNote', () => {
    const history = [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }];
    const next = appendStatusChange(
      history,
      'sent',
      '2026-06-25T10:01:00.000Z',
      'changed after freeze',
    );
    expect(next).toEqual([
      { status: 'draft', at: '2026-06-25T10:00:00.000Z' },
      { status: 'sent', at: '2026-06-25T10:01:00.000Z', note: 'changed after freeze' },
    ]);
  });

  it('JobApplicationStatusChange_WithoutNote_StillValid', () => {
    // Backward compatibility: a status change without `note` is still a valid entry.
    const next = appendStatusChange([], 'draft', '2026-06-25T10:00:00.000Z');
    expect(next[0]).not.toHaveProperty('note');
  });
});

describe('updateJobApplicationAttachmentsSchema', () => {
  it('UpdateJobApplicationAttachmentsSchema_NonStringOrTooMany_Rejected', () => {
    expect(updateJobApplicationAttachmentsSchema.safeParse({ attachmentIds: 'x' }).success).toBe(
      false,
    );
    expect(updateJobApplicationAttachmentsSchema.safeParse({ attachmentIds: [1] }).success).toBe(
      false,
    );
    expect(
      updateJobApplicationAttachmentsSchema.safeParse({
        attachmentIds: Array.from({ length: 51 }, (_, i) => `id${i}`),
      }).success,
    ).toBe(false);
    // .strict(): unknown keys rejected.
    expect(
      updateJobApplicationAttachmentsSchema.safeParse({ attachmentIds: [], extra: 1 }).success,
    ).toBe(false);
    // Valid: empty and populated selections.
    expect(updateJobApplicationAttachmentsSchema.safeParse({ attachmentIds: [] }).success).toBe(
      true,
    );
    expect(
      updateJobApplicationAttachmentsSchema.safeParse({ attachmentIds: ['a1', 'a2'] }).success,
    ).toBe(true);
  });
});

describe('jobApplicationQuerySchema', () => {
  it('JobApplicationQuerySchema_InvalidStatus_Rejected', () => {
    expect(jobApplicationQuerySchema.safeParse({ status: 'nope' }).success).toBe(false);
    expect(jobApplicationQuerySchema.safeParse({ status: 'draft' }).success).toBe(true);
    expect(jobApplicationQuerySchema.safeParse({}).success).toBe(true);
    expect(jobApplicationQuerySchema.safeParse({ talentId: 't1' }).success).toBe(true);
    expect(jobApplicationQuerySchema.safeParse({ talentId: 't1', status: 'sent' }).success).toBe(
      true,
    );
  });
});

describe('recipientForMappe', () => {
  const app = (firma: string): JobApplication =>
    ({
      id: 'a1',
      ownerId: 'team',
      jobPostingId: 'p1',
      postingCompany: 'Acme GmbH',
      postingTitle: 'Engineer',
      talentId: 't1',
      talentName: 'Ada',
      status: 'draft',
      statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
      documents: {
        ownerId: 'team',
        talentId: 't1',
        contact: { name: '', role: '', email: '', phone: '', location: '', linkedin: '' },
        resume: { summary: '', experience: [], education: [], skillGroups: [], rawText: '' },
        letter: {
          firma,
          ansprechpartner: '',
          strasse: '',
          plzOrt: '',
          betreff: '',
          anrede: '',
          absaetze: [],
          gruss: '',
        },
        style: { template: 'classic', accent: '', strong: '', onDark: '', font: '', size: 1 },
        updatedAt: '',
      },
      selectedAttachmentIds: [],
      createdAt: '',
      updatedAt: '',
    }) as JobApplication;

  it('RecipientForMappe_EmptyFirma_UsesPostingCompany', () => {
    expect(recipientForMappe(app(''))).toEqual({ company: 'Acme GmbH' });
  });

  it('RecipientForMappe_WhitespaceFirma_UsesPostingCompany', () => {
    expect(recipientForMappe(app('   \n\t'))).toEqual({ company: 'Acme GmbH' });
  });

  it('RecipientForMappe_NonEmptyFirma_LeavesLetterUntouched', () => {
    // A deliberately worded address is authoritative (no injection of postingCompany).
    expect(recipientForMappe(app('Muster GmbH, z. Hd. Frau Vogel'))).toEqual({});
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
