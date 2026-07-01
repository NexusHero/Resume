import { pgTable, text, serial, integer, jsonb, primaryKey } from 'drizzle-orm/pg-core';
import type {
  DocumentContact,
  ResumeContent,
  LetterContent,
  DocumentStyle,
} from '../../domain/talent-documents';

/** Registered accounts (mirrors domain `User`). */
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull(),
});

/** Opaque server-side sessions: a token maps to a user id, with a creation time. */
export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: text('created_at').notNull(),
});

/** One-time, expiring password-reset tokens: an opaque token maps to a user id. */
export const passwordResetTokens = pgTable('password_reset_tokens', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: text('created_at').notNull(),
});

/** Per-user LLM API keys, encrypted at rest. PK is (owner_id, provider). */
export const apiKeys = pgTable(
  'api_keys',
  {
    ownerId: text('owner_id').notNull(),
    provider: text('provider').notNull(),
    value: text('value').notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.ownerId, t.provider] }) }),
);

/** Recorded job applications (mirrors domain `Application`). */
export const applications = pgTable('applications', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  company: text('company').notNull(),
  position: text('position').notNull(),
  address: text('address').notNull(),
  reference: text('reference').notNull(),
  status: text('status').notNull(),
  pdfPath: text('pdf_path'),
  source: text('source').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
  commit: text('commit'),
});

/** Append-only audit trail (mirrors domain `AuditEvent`; `seq` keeps insertion order). */
export const auditEvents = pgTable('audit_events', {
  seq: serial('seq').primaryKey(),
  ts: text('ts').notNull(),
  action: text('action').notNull(),
  appId: text('app_id').notNull(),
  by: text('by'),
  data: jsonb('data'),
  changed: jsonb('changed').$type<Record<string, { from: unknown; to: unknown }>>(),
  commit: text('commit'),
});

/** Named, reusable job searches (mirrors domain `SavedSearch`). */
export const savedSearches = pgTable('saved_searches', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  query: jsonb('query').$type<SavedSearchQueryRow>().notNull(),
  createdAt: text('created_at').notNull(),
});

export interface SavedSearchQueryRow {
  q?: string;
  city?: string;
  country?: string;
  threshold: number;
}

/** Client search mandates (mirrors domain `Mandate`). Owner-scoped per recruiter. */
export const mandates = pgTable('mandates', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  client: text('client').notNull(),
  role: text('role').notNull(),
  location: text('location').notNull(),
  fee: text('fee').notNull(),
  feeValue: text('fee_value').notNull(),
  deadline: text('deadline').notNull(),
  priority: text('priority').notNull(),
  status: text('status').notNull(),
  submitted: integer('submitted').notNull(),
  interviews: integer('interviews').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/** Represented candidates (mirrors domain `Talent`). Owner-scoped per recruiter. */
export const talents = pgTable('talents', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  headline: text('headline').notNull(),
  location: text('location').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  availability: text('availability').notNull(),
  salary: text('salary').notNull(),
  skills: jsonb('skills').$type<string[]>().notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/** A talent's document set (resume + cover letter + style). One row per (owner, talent). */
export const talentDocuments = pgTable(
  'talent_documents',
  {
    ownerId: text('owner_id').notNull(),
    talentId: text('talent_id').notNull(),
    contact: jsonb('contact').$type<DocumentContact>().notNull(),
    resume: jsonb('resume').$type<ResumeContent>().notNull(),
    letter: jsonb('letter').$type<LetterContent>().notNull(),
    style: jsonb('style').$type<DocumentStyle>().notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.ownerId, t.talentId] }) }),
);

/** Booked placements (mirrors domain `Placement`). Owner-scoped per recruiter. */
export const placements = pgTable('placements', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  candidateName: text('candidate_name').notNull(),
  candidateRole: text('candidate_role').notNull(),
  client: text('client').notNull(),
  start: text('start').notNull(),
  fee: text('fee').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
