import {
  rowToApplication,
  applicationToRow,
  rowToAuditEvent,
  auditEventToRow,
  rowToSavedSearch,
  savedSearchToRow,
  rowToMandate,
  mandateToRow,
  rowToTalent,
  talentToRow,
  rowToPlacement,
  placementToRow,
  rowToCandidacy,
  candidacyToRow,
  rowToUser,
  userToRow,
  rowToTalentDocuments,
  talentDocumentsToRow,
  rowToAttachment,
  attachmentToRow,
  rowToAssistantSuggestion,
  assistantSuggestionToRow,
  rowToArtifactLog,
  artifactLogToRow,
  rowToStageTransition,
  stageTransitionToRow,
} from '../../src/adapters/sql/mappers';
import type { Application, AuditEvent } from '../../src/domain/application';
import type { SavedSearch } from '../../src/domain/saved-search';
import type { Mandate } from '../../src/domain/mandate';
import type { Talent } from '../../src/domain/talent';
import type { Placement } from '../../src/domain/placement';
import type { Candidacy } from '../../src/domain/candidacy';
import type { User } from '../../src/domain/user';
import type { TalentDocuments } from '../../src/domain/talent-documents';
import type { Attachment } from '../../src/domain/attachment';

describe('application mappers', () => {
  it('Application_RoundTrips_PreservingNullAndUndefined', () => {
    const app: Application = {
      id: 'a1',
      date: '2026-06-25',
      company: 'Aurora',
      position: 'Engineer',
      address: 'Berlin',
      reference: '',
      status: 'sent',
      pdfPath: null,
      source: 'api',
      createdAt: '2026-06-25T10:00:00.000Z',
    };
    const row = applicationToRow(app);
    // optional fields become explicit null for Postgres
    expect(row.updatedAt).toBeNull();
    expect(row.commit).toBeNull();
    // and come back as undefined (not null) on the domain object
    const back = rowToApplication({ ...row, pdfPath: null, updatedAt: null, commit: null });
    expect(back).toEqual(app);
    expect('updatedAt' in back ? back.updatedAt : undefined).toBeUndefined();
  });

  it('Application_KeepsSetOptionalFields', () => {
    const row = applicationToRow({
      id: 'a2',
      date: '2026-06-25',
      company: 'X',
      position: '',
      address: '',
      reference: '',
      status: 'interview',
      pdfPath: 'bewerbungen/x.pdf',
      source: 'api',
      createdAt: 'now',
      updatedAt: 'later',
      commit: 'abc1234',
    });
    expect(row.updatedAt).toBe('later');
    expect(row.commit).toBe('abc1234');
    expect(row.pdfPath).toBe('bewerbungen/x.pdf');
  });
});

describe('audit mappers', () => {
  it('AuditEvent_RoundTrips_MappingAppIdAndJsonb', () => {
    const event: AuditEvent = {
      ts: 't1',
      action: 'update',
      id: 'a1',
      by: 'api',
      changed: { status: { from: 'sent', to: 'interview' } },
    };
    const row = auditEventToRow(event);
    expect(row.appId).toBe('a1');
    expect(row.data).toBeNull();
    const back = rowToAuditEvent({
      seq: 1,
      ts: row.ts,
      action: row.action,
      appId: row.appId,
      by: row.by ?? null,
      data: null,
      changed: row.changed ?? null,
      commit: row.commit ?? null,
    });
    expect(back).toEqual(event);
  });

  it('AuditEvent_WithDataAndCommit_PreservesValues', () => {
    const event: AuditEvent = {
      ts: 't3',
      action: 'create',
      id: 'a2',
      data: { company: 'Aurora', status: 'sent' },
      commit: 'abc1234',
    };
    const row = auditEventToRow(event);
    expect(row.data).toEqual({ company: 'Aurora', status: 'sent' });
    expect(row.commit).toBe('abc1234');
    const back = rowToAuditEvent({
      seq: 2,
      ts: row.ts,
      action: row.action,
      appId: row.appId,
      by: row.by ?? null,
      data: row.data ?? null,
      changed: row.changed ?? null,
      commit: row.commit ?? null,
    });
    expect(back).toEqual(event);
  });
});

describe('saved-search mappers', () => {
  it('SavedSearch_RoundTrips', () => {
    const search: SavedSearch = {
      id: 's1',
      name: 'Rust',
      query: { q: 'Rust', threshold: 80 },
      createdAt: 'now',
    };
    const row = savedSearchToRow(search);
    expect(rowToSavedSearch(row as Required<typeof row>)).toEqual(search);
  });
});

describe('mandate mappers', () => {
  it('Mandate_RoundTrips_PreservingOwnerAndNumbers', () => {
    const mandate: Mandate = {
      id: 'm1',
      ownerId: 'owner1',
      client: 'Aurora',
      role: 'C++ Engineer',
      location: 'Berlin',
      fee: '22%',
      feeValue: '17.160 €',
      deadline: '2026-07-30',
      priority: 'high',
      status: 'active',
      submitted: 4,
      interviews: 2,
      jobText: '',
      lang: 'en',
      createdAt: '2026-06-25T10:00:00.000Z',
      updatedAt: '2026-06-25T10:00:00.000Z',
    };
    expect(rowToMandate(mandateToRow(mandate) as Required<typeof mandate>)).toEqual(mandate);
  });
});

describe('talent mappers', () => {
  it('Talent_RoundTrips_PreservingOwnerAndSkills', () => {
    const talent: Talent = {
      id: 't1',
      ownerId: 'owner1',
      name: 'Lena Brandt',
      role: 'Product Designer',
      headline: '',
      location: 'Leipzig',
      email: '',
      phone: '',
      availability: 'immediately',
      salary: '64.000 €',
      skills: ['Figma', 'Design Systems'],
      createdAt: '2026-06-25T10:00:00.000Z',
      updatedAt: '2026-06-25T10:00:00.000Z',
    };
    expect(rowToTalent(talentToRow(talent) as Required<typeof talent>)).toEqual(talent);
  });
});

describe('user mappers', () => {
  it('User_RoundTrips', () => {
    const user: User = {
      id: 'u1',
      email: 'a@example.com',
      passwordHash: 'scrypt$salt$key',
      roles: ['admin', 'recruiter'],
      createdAt: '2026-06-25T10:00:00.000Z',
    };
    expect(rowToUser(userToRow(user) as Required<typeof user>)).toEqual(user);
  });

  it('User_RoundTrips_WithLlmProvider', () => {
    const user: User = {
      id: 'u2',
      email: 'b@example.com',
      passwordHash: 'scrypt$salt$key',
      roles: ['recruiter'],
      createdAt: '2026-06-25T10:00:00.000Z',
      llmProvider: 'gemini',
    };
    expect(rowToUser(userToRow(user) as Required<typeof user>)).toEqual(user);
  });
});

describe('placement mappers', () => {
  it('Placement_RoundTrips_PreservingOwner', () => {
    const placement: Placement = {
      id: 'p1',
      ownerId: 'owner1',
      candidateName: 'Mara Vogel',
      candidateRole: 'Engineering Manager',
      client: 'Aurora Systems GmbH',
      start: '2026-07-01',
      fee: '19.000 €',
      status: 'invoiced',
      createdAt: '2026-06-25T10:00:00.000Z',
      updatedAt: '2026-06-25T10:00:00.000Z',
    };
    expect(rowToPlacement(placementToRow(placement) as Required<typeof placement>)).toEqual(
      placement,
    );
  });
});

describe('candidacy mappers', () => {
  it('Candidacy_RoundTrips_PreservingOwner', () => {
    const candidacy: Candidacy = {
      id: 'c1',
      ownerId: 'owner1',
      mandateId: 'm1',
      talentId: 't1',
      stage: 'interview',
      note: 'strong on system design',
      order: 2,
      createdAt: '2026-06-25T10:00:00.000Z',
      updatedAt: '2026-06-25T10:00:00.000Z',
    };
    expect(rowToCandidacy(candidacyToRow(candidacy) as Required<typeof candidacy>)).toEqual(
      candidacy,
    );
  });
});

describe('talent-documents mappers', () => {
  it('TalentDocuments_RoundTrips_PreservingJsonbBlocks', () => {
    const documents: TalentDocuments = {
      ownerId: 'owner1',
      talentId: 't1',
      contact: {
        name: 'Lena Brandt',
        role: 'Designer',
        email: 'lena@x.de',
        phone: '',
        location: 'Leipzig',
        linkedin: 'linkedin.com/in/lena',
      },
      resume: {
        summary: 'A designer.',
        experience: [
          {
            role: 'Designer',
            company: 'Aurora',
            period: '2020—',
            location: 'Leipzig',
            bullets: ['x'],
            skills: ['Figma'],
          },
        ],
        education: [{ degree: 'B.A.', school: 'HfG', period: '2012—2016', note: '' }],
        skillGroups: [{ label: 'Tools', items: ['Figma'] }],
      },
      letter: {
        firma: 'Aurora',
        ansprechpartner: '',
        strasse: '',
        plzOrt: '',
        betreff: 'Bewerbung',
        anrede: 'Sehr geehrte Damen und Herren,',
        absaetze: ['Absatz.'],
        gruss: 'Mit freundlichen Grüßen',
      },
      style: {
        accent: '#1F8A5B',
        strong: '#15734a',
        onDark: '#6ee7b7',
        font: 'var(--font-body)',
        size: 1.1,
      },
      updatedAt: '2026-06-25T10:00:00.000Z',
    };
    expect(rowToTalentDocuments(talentDocumentsToRow(documents))).toEqual(documents);
  });
});

describe('attachment mappers', () => {
  it('Attachment_RoundTrips_MetadataAndCarriesBase64Data', () => {
    const attachment: Attachment = {
      id: 'a1',
      ownerId: 'owner1',
      talentId: 't1',
      name: 'Zeugnis.pdf',
      contentType: 'application/pdf',
      size: 1234,
      createdAt: '2026-06-25T10:00:00.000Z',
    };
    const row = attachmentToRow(attachment, 'ZGF0YQ==');
    expect(row.data).toBe('ZGF0YQ==');
    expect(rowToAttachment(row)).toEqual(attachment); // meta round-trips (no bytes)
  });
});

describe('assistant suggestion mappers', () => {
  it('Suggestion_RoundTrips_WithAllOptionals', () => {
    const suggestion = {
      id: 's1',
      ownerId: 'team',
      kind: 'shortlist-add' as const,
      title: 'Add Jonas',
      rationale: 'Match score 80/100',
      mandateId: 'm1',
      talentId: 't1',
      payload: { score: 80 },
      status: 'accepted' as const,
      createdAt: '2026-07-03T10:00:00.000Z',
      resolvedAt: '2026-07-03T11:00:00.000Z',
      runId: 'r1',
    };
    expect(
      rowToAssistantSuggestion(
        assistantSuggestionToRow(suggestion) as Required<
          ReturnType<typeof assistantSuggestionToRow>
        >,
      ),
    ).toEqual(suggestion);
  });

  it('Suggestion_RoundTrips_WithoutOptionals', () => {
    const suggestion = {
      id: 's2',
      ownerId: 'team',
      kind: 'data-gap' as const,
      title: 'Complete a profile',
      rationale: 'No skills on file',
      payload: {},
      status: 'proposed' as const,
      createdAt: '2026-07-03T10:00:00.000Z',
      runId: 'r1',
    };
    expect(
      rowToAssistantSuggestion(
        assistantSuggestionToRow(suggestion) as Required<
          ReturnType<typeof assistantSuggestionToRow>
        >,
      ),
    ).toEqual(suggestion);
  });
});

describe('stage transition mappers', () => {
  it('StageTransition_RoundTrips_WithAndWithoutFrom', () => {
    const move = {
      id: 's1',
      ownerId: 'team',
      candidacyId: 'c1',
      mandateId: 'm1',
      talentId: 't1',
      from: 'sourced' as const,
      to: 'interview' as const,
      at: '2026-07-03T10:00:00.000Z',
    };
    expect(rowToStageTransition(stageTransitionToRow(move) as never)).toEqual(move);
    const entry = { ...move, id: 's2', from: null, to: 'sourced' as const };
    expect(rowToStageTransition(stageTransitionToRow(entry) as never)).toEqual(entry);
  });
});

describe('artifact log mappers', () => {
  it('ArtifactLog_RoundTrips_WithAndWithoutOutcomeAt', () => {
    const stamped = {
      id: 'a1',
      ownerId: 'team',
      kind: 'outreach' as const,
      talentId: 't1',
      provider: 'gemini',
      channel: 'email',
      audience: 'candidate',
      outcome: 'replied' as const,
      createdAt: '2026-07-03T10:00:00.000Z',
      outcomeAt: '2026-07-03T11:00:00.000Z',
    };
    expect(
      rowToArtifactLog(artifactLogToRow(stamped) as Required<ReturnType<typeof artifactLogToRow>>),
    ).toEqual(stamped);
    const pending = { ...stamped, id: 'a2', outcome: 'pending' as const };
    delete (pending as { outcomeAt?: string }).outcomeAt;
    expect(
      rowToArtifactLog(artifactLogToRow(pending) as Required<ReturnType<typeof artifactLogToRow>>),
    ).toEqual(pending);
  });
});
