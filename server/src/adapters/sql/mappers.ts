import type { Application, AuditEvent } from '../../domain/application';
import type { SavedSearch } from '../../domain/saved-search';
import type { Mandate, MandatePriority, MandateStatus } from '../../domain/mandate';
import type { Talent } from '../../domain/talent';
import type { Placement, PlacementStatus } from '../../domain/placement';
import type { Candidacy, CandidacyStage } from '../../domain/candidacy';
import type { User, Role } from '../../domain/user';
import type { TalentDocuments } from '../../domain/talent-documents';
import type { Attachment } from '../../domain/attachment';
import {
  applications,
  auditEvents,
  savedSearches,
  mandates,
  talents,
  placements,
  candidacies,
  users,
  talentDocuments,
  attachments,
} from './schema';

type ApplicationRow = typeof applications.$inferSelect;
type ApplicationInsert = typeof applications.$inferInsert;
type AuditRow = typeof auditEvents.$inferSelect;
type AuditInsert = typeof auditEvents.$inferInsert;
type SavedSearchRow = typeof savedSearches.$inferSelect;
type SavedSearchInsert = typeof savedSearches.$inferInsert;
type MandateRow = typeof mandates.$inferSelect;
type MandateInsert = typeof mandates.$inferInsert;
type TalentRow = typeof talents.$inferSelect;
type TalentInsert = typeof talents.$inferInsert;
type PlacementRow = typeof placements.$inferSelect;
type PlacementInsert = typeof placements.$inferInsert;
type CandidacyRow = typeof candidacies.$inferSelect;
type CandidacyInsert = typeof candidacies.$inferInsert;
type UserRow = typeof users.$inferSelect;
type UserInsert = typeof users.$inferInsert;
type TalentDocumentsRow = typeof talentDocuments.$inferSelect;
type TalentDocumentsInsert = typeof talentDocuments.$inferInsert;
type AttachmentRow = typeof attachments.$inferSelect;
type AttachmentInsert = typeof attachments.$inferInsert;

// Postgres stores absent optional values as NULL; the domain uses `undefined`.
const orUndef = <T>(v: T | null): T | undefined => v ?? undefined;

export function rowToApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    date: row.date,
    company: row.company,
    position: row.position,
    address: row.address,
    reference: row.reference,
    status: row.status as Application['status'],
    pdfPath: row.pdfPath,
    source: row.source,
    createdAt: row.createdAt,
    updatedAt: orUndef(row.updatedAt),
    commit: orUndef(row.commit),
  };
}

export function applicationToRow(app: Application): ApplicationInsert {
  return {
    id: app.id,
    date: app.date,
    company: app.company,
    position: app.position,
    address: app.address,
    reference: app.reference,
    status: app.status,
    pdfPath: app.pdfPath,
    source: app.source,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt ?? null,
    commit: app.commit ?? null,
  };
}

export function rowToAuditEvent(row: AuditRow): AuditEvent {
  return {
    ts: row.ts,
    action: row.action as AuditEvent['action'],
    id: row.appId,
    by: orUndef(row.by),
    data: orUndef(row.data),
    changed: orUndef(row.changed),
    commit: orUndef(row.commit),
  };
}

export function auditEventToRow(event: AuditEvent): AuditInsert {
  return {
    ts: event.ts,
    action: event.action,
    appId: event.id,
    by: event.by ?? null,
    data: event.data ?? null,
    changed: event.changed ?? null,
    commit: event.commit ?? null,
  };
}

export function rowToSavedSearch(row: SavedSearchRow): SavedSearch {
  return {
    id: row.id,
    name: row.name,
    query: row.query,
    createdAt: row.createdAt,
  };
}

export function savedSearchToRow(search: SavedSearch): SavedSearchInsert {
  return {
    id: search.id,
    name: search.name,
    query: search.query,
    createdAt: search.createdAt,
  };
}

export function rowToMandate(row: MandateRow): Mandate {
  return {
    id: row.id,
    ownerId: row.ownerId,
    client: row.client,
    role: row.role,
    location: row.location,
    fee: row.fee,
    feeValue: row.feeValue,
    deadline: row.deadline,
    priority: row.priority as MandatePriority,
    status: row.status as MandateStatus,
    submitted: row.submitted,
    interviews: row.interviews,
    jobText: row.jobText,
    lang: (row.lang as Mandate['lang']) ?? 'en',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mandateToRow(mandate: Mandate): MandateInsert {
  return {
    id: mandate.id,
    ownerId: mandate.ownerId,
    client: mandate.client,
    role: mandate.role,
    location: mandate.location,
    fee: mandate.fee,
    feeValue: mandate.feeValue,
    deadline: mandate.deadline,
    priority: mandate.priority,
    status: mandate.status,
    submitted: mandate.submitted,
    interviews: mandate.interviews,
    jobText: mandate.jobText,
    lang: mandate.lang,
    createdAt: mandate.createdAt,
    updatedAt: mandate.updatedAt,
  };
}

export function rowToTalent(row: TalentRow): Talent {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    role: row.role,
    headline: row.headline,
    location: row.location,
    email: row.email,
    phone: row.phone,
    availability: row.availability,
    salary: row.salary,
    skills: row.skills,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    anonymizedAt: orUndef(row.anonymizedAt),
  };
}

export function talentToRow(talent: Talent): TalentInsert {
  return {
    id: talent.id,
    ownerId: talent.ownerId,
    name: talent.name,
    role: talent.role,
    headline: talent.headline,
    location: talent.location,
    email: talent.email,
    phone: talent.phone,
    availability: talent.availability,
    salary: talent.salary,
    skills: talent.skills,
    createdAt: talent.createdAt,
    updatedAt: talent.updatedAt,
    anonymizedAt: talent.anonymizedAt ?? null,
  };
}

export function rowToPlacement(row: PlacementRow): Placement {
  return {
    id: row.id,
    ownerId: row.ownerId,
    candidateName: row.candidateName,
    candidateRole: row.candidateRole,
    client: row.client,
    start: row.start,
    fee: row.fee,
    status: row.status as PlacementStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function placementToRow(placement: Placement): PlacementInsert {
  return {
    id: placement.id,
    ownerId: placement.ownerId,
    candidateName: placement.candidateName,
    candidateRole: placement.candidateRole,
    client: placement.client,
    start: placement.start,
    fee: placement.fee,
    status: placement.status,
    createdAt: placement.createdAt,
    updatedAt: placement.updatedAt,
  };
}

export function rowToCandidacy(row: CandidacyRow): Candidacy {
  return {
    id: row.id,
    ownerId: row.ownerId,
    mandateId: row.mandateId,
    talentId: row.talentId,
    stage: row.stage as CandidacyStage,
    note: row.note,
    order: row.order,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function candidacyToRow(candidacy: Candidacy): CandidacyInsert {
  return {
    id: candidacy.id,
    ownerId: candidacy.ownerId,
    mandateId: candidacy.mandateId,
    talentId: candidacy.talentId,
    stage: candidacy.stage,
    note: candidacy.note,
    order: candidacy.order,
    createdAt: candidacy.createdAt,
    updatedAt: candidacy.updatedAt,
  };
}

export function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    roles: (Array.isArray(row.roles) && row.roles.length ? row.roles : ['recruiter']) as Role[],
    createdAt: row.createdAt,
  };
}

export function userToRow(user: User): UserInsert {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    roles: user.roles,
    createdAt: user.createdAt,
  };
}

export function rowToTalentDocuments(row: TalentDocumentsRow): TalentDocuments {
  return {
    ownerId: row.ownerId,
    talentId: row.talentId,
    contact: row.contact,
    resume: row.resume,
    letter: row.letter,
    style: row.style,
    ...(row.translations ? { translations: row.translations } : {}),
    updatedAt: row.updatedAt,
  };
}

export function talentDocumentsToRow(documents: TalentDocuments): TalentDocumentsInsert {
  return {
    ownerId: documents.ownerId,
    talentId: documents.talentId,
    contact: documents.contact,
    resume: documents.resume,
    letter: documents.letter,
    style: documents.style,
    translations: documents.translations ?? null,
    updatedAt: documents.updatedAt,
  };
}

export function rowToAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    ownerId: row.ownerId,
    talentId: row.talentId,
    name: row.name,
    contentType: row.contentType,
    size: row.size,
    createdAt: row.createdAt,
  };
}

export function attachmentToRow(attachment: Attachment, dataBase64: string): AttachmentInsert {
  return {
    id: attachment.id,
    ownerId: attachment.ownerId,
    talentId: attachment.talentId,
    name: attachment.name,
    contentType: attachment.contentType,
    size: attachment.size,
    data: dataBase64,
    createdAt: attachment.createdAt,
  };
}
