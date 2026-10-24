import {
  rowToApplication,
  applicationToRow,
  rowToAuditEvent,
  auditEventToRow,
  rowToSavedSearch,
  savedSearchToRow,
  rowToJobPosting,
  jobPostingToRow,
  rowToJobApplication,
  jobApplicationToRow,
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
  rowToChatSession,
  chatSessionToRow,
} from '../../src/adapters/sql/mappers.js';
import type { Application, AuditEvent } from '../../src/domain/application.js';
import type { SavedSearch } from '../../src/domain/saved-search.js';
import type { JobPosting } from '../../src/domain/job-posting.js';
import type { JobApplication } from '../../src/domain/job-application.js';
import type { Mandate } from '../../src/domain/mandate.js';
import type { Talent } from '../../src/domain/talent.js';
import type { Placement } from '../../src/domain/placement.js';
import type { Candidacy } from '../../src/domain/candidacy.js';
import type { User } from '../../src/domain/user.js';
import type { TalentDocuments } from '../../src/domain/talent-documents.js';
import type { Attachment } from '../../src/domain/attachment.js';
import type { ChatSession } from '../../src/domain/chat-agent.js';

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
      ownerId: 'team',
      name: 'Rust',
      query: { q: 'Rust', threshold: 80 },
      createdAt: 'now',
    };
    const row = savedSearchToRow(search);
    expect(rowToSavedSearch(row as Required<typeof row>)).toEqual(search);
  });

  it('SavedSearchToRow_RoundTripsIncludingOwnerId', () => {
    const search: SavedSearch = {
      id: 's2',
      ownerId: 'acme',
      name: 'Go',
      query: { threshold: 60 },
      createdAt: 'later',
    };
    const row = savedSearchToRow(search);
    expect(row.ownerId).toBe('acme');
    expect(rowToSavedSearch(row as Required<typeof row>)).toEqual(search);
  });
});

describe('job-posting mappers', () => {
  const posting: JobPosting = {
    id: 'p1',
    ownerId: 'team',
    source: 'Arbeitnow',
    sourceId: 'slug-1',
    url: 'https://example.com/job',
    company: 'Acme',
    title: 'Engineer',
    location: 'Berlin',
    country: 'DE',
    description: 'Full ad text',
    requirements: ['Rust', 'gRPC'],
    descriptionIncomplete: false,
    createdAt: '2026-06-25T10:00:00.000Z',
  };

  it('JobPostingToRow_RoundTrips', () => {
    const row = jobPostingToRow(posting);
    expect(row.requirements).toEqual(['Rust', 'gRPC']);
    expect(rowToJobPosting(row as Required<typeof row>)).toEqual(posting);
  });

  it('RowToJobPosting_HandlesIncompleteFlag', () => {
    const row = jobPostingToRow({ ...posting, sourceId: undefined, url: undefined });
    expect(row.sourceId).toBeNull();
    expect(row.url).toBeNull();
    const back = rowToJobPosting({ ...row, sourceId: null, url: null });
    expect(back.descriptionIncomplete).toBe(false);
    expect('sourceId' in back ? back.sourceId : undefined).toBeUndefined();
    expect('url' in back ? back.url : undefined).toBeUndefined();
  });
});

describe('job-application mappers', () => {
  it('JobApplicationToRow_RoundTrips', () => {
    const application: JobApplication = {
      id: 'a1',
      ownerId: 'team',
      jobPostingId: 'p1',
      postingCompany: 'Acme',
      postingTitle: 'Engineer',
      talentId: 't1',
      talentName: 'Ada',
      status: 'sent',
      statusHistory: [
        { status: 'draft', at: '2026-06-25T10:00:00.000Z' },
        { status: 'sent', at: '2026-06-25T11:00:00.000Z' },
      ],
      documents: {
        ownerId: 'team',
        talentId: 't1',
        contact: { name: 'Ada', role: '', email: '', phone: '', location: '', linkedin: '' },
        resume: { summary: 'S.', experience: [], education: [], skillGroups: [], rawText: '' },
        letter: {
          firma: '',
          ansprechpartner: '',
          strasse: '',
          plzOrt: '',
          betreff: '',
          anrede: '',
          absaetze: ['p'],
          gruss: '',
        },
        style: {
          template: 'classic',
          accent: '#2A6FDB',
          strong: '#1d4ed8',
          onDark: '#7aa7f5',
          font: 'var(--font-display)',
          size: 1,
        },
        updatedAt: '2026-06-25T11:00:00.000Z',
      },
      selectedAttachmentIds: [],
      createdAt: '2026-06-25T10:00:00.000Z',
      updatedAt: '2026-06-25T11:00:00.000Z',
    };
    const row = jobApplicationToRow(application);
    expect(row.statusHistory).toEqual(application.statusHistory);
    expect(row.documents).toEqual(application.documents);
    expect(row.selectedAttachmentIds).toEqual([]);
    expect(rowToJobApplication(row as Required<typeof row>)).toEqual(application);
  });

  it('JobApplicationToRow_RoundTripsSelectedAttachmentIds', () => {
    const application: JobApplication = {
      id: 'a2',
      ownerId: 'team',
      jobPostingId: 'p1',
      postingCompany: 'Acme',
      postingTitle: 'Engineer',
      talentId: 't1',
      talentName: 'Ada',
      status: 'draft',
      statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
      documents: {
        ownerId: 'team',
        talentId: 't1',
        contact: { name: 'Ada', role: '', email: '', phone: '', location: '', linkedin: '' },
        resume: { summary: '', experience: [], education: [], skillGroups: [], rawText: '' },
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
        style: { template: 'classic', accent: '', strong: '', onDark: '', font: '', size: 1 },
        updatedAt: '2026-06-25T10:00:00.000Z',
      },
      selectedAttachmentIds: ['att1', 'att2'],
      createdAt: '2026-06-25T10:00:00.000Z',
      updatedAt: '2026-06-25T10:00:00.000Z',
    };
    const row = jobApplicationToRow(application);
    expect(row.selectedAttachmentIds).toEqual(['att1', 'att2']);
    expect(rowToJobApplication(row as Required<typeof row>).selectedAttachmentIds).toEqual([
      'att1',
      'att2',
    ]);
  });

  it('RowToJobApplication_NullSelectedAttachmentIds_DefaultsEmpty', () => {
    const application = jobApplicationToRow({
      id: 'a3',
      ownerId: 'team',
      jobPostingId: 'p1',
      postingCompany: 'Acme',
      postingTitle: 'Engineer',
      talentId: 't1',
      talentName: 'Ada',
      status: 'draft',
      statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
      documents: {
        ownerId: 'team',
        talentId: 't1',
        contact: { name: 'Ada', role: '', email: '', phone: '', location: '', linkedin: '' },
        resume: { summary: '', experience: [], education: [], skillGroups: [], rawText: '' },
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
        style: { template: 'classic', accent: '', strong: '', onDark: '', font: '', size: 1 },
        updatedAt: '2026-06-25T10:00:00.000Z',
      },
      selectedAttachmentIds: [],
      createdAt: '2026-06-25T10:00:00.000Z',
      updatedAt: '2026-06-25T10:00:00.000Z',
    });
    // A row read back from a legacy column with null should default to [].
    const back = rowToJobApplication({
      ...(application as Required<typeof application>),
      selectedAttachmentIds: null as unknown as string[],
    });
    expect(back.selectedAttachmentIds).toEqual([]);
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

  it('User_RoundTrips_WithTenantId', () => {
    const user: User = {
      id: 'u3',
      email: 'c@example.com',
      passwordHash: 'scrypt$salt$key',
      roles: ['recruiter'],
      createdAt: '2026-06-25T10:00:00.000Z',
      tenantId: 'acme',
    };
    const row = userToRow(user);
    expect(row.tenantId).toBe('acme');
    expect(rowToUser(row as Required<typeof user>)).toEqual(user);
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

describe('chat-session mappers', () => {
  it('ChatSessionToRow_RoundTripsMessagesAndUsage', () => {
    const session: ChatSession = {
      id: 's1',
      ownerId: 'team',
      userId: 'u1',
      title: 'Hallo',
      messages: [
        { role: 'user', text: 'hi', createdAt: '2026-06-25T10:00:00.000Z' },
        {
          role: 'assistant',
          toolCall: { id: 'c1', name: 'search_jobs', args: { q: 'rust' } },
          createdAt: '2026-06-25T10:00:01.000Z',
        },
        {
          role: 'tool',
          toolResult: { toolCallId: 'c1', name: 'search_jobs', content: '[]', isError: false },
          createdAt: '2026-06-25T10:00:02.000Z',
        },
      ],
      status: 'done',
      usage: { inputTokens: 10, outputTokens: 20, costUsd: 0.0001 },
      createdAt: '2026-06-25T10:00:00.000Z',
      updatedAt: '2026-06-25T10:00:02.000Z',
    };
    const row = chatSessionToRow(session);
    expect(row.title).toBe('Hallo');
    expect(row.messages).toEqual(session.messages);
    expect(row.usage).toEqual(session.usage);
    expect(rowToChatSession(row as Required<typeof row>)).toEqual(session);
  });

  it('RowToChatSession_NullMessages_DefaultsEmpty', () => {
    const row = chatSessionToRow({
      id: 's2',
      ownerId: 'team',
      userId: 'u1',
      messages: [],
      status: 'done',
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      createdAt: 'x',
      updatedAt: 'y',
    });
    const back = rowToChatSession({
      ...(row as Required<typeof row>),
      messages: null as unknown as never,
    });
    expect(back.messages).toEqual([]);
    expect(back.title).toBeUndefined();
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
