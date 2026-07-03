import { pgTable, text, serial, integer, jsonb, primaryKey } from 'drizzle-orm/pg-core';
import type {
  DocumentContact,
  ResumeContent,
  LetterContent,
  DocumentStyle,
  TalentDocuments,
} from '../../domain/talent-documents';
import type { Role } from '../../domain/user';
import type { AssistantSettings } from '../../domain/assistant';
import type { RetentionPolicy } from '../../domain/retention';

/** Registered accounts (mirrors domain `User`). */
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  roles: jsonb('roles').$type<Role[]>().notNull(),
  createdAt: text('created_at').notNull(),
  tenantId: text('tenant_id'),
  verifiedAt: text('verified_at'),
  llmProvider: text('llm_provider'),
});

/** Opaque server-side sessions: a token maps to a user id, with a creation time. */
export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: text('created_at').notNull(),
});

/** One-time, expiring email-verification tokens — separate from reset tokens on purpose. */
export const emailVerificationTokens = pgTable('email_verification_tokens', {
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

/** Client search mandates (mirrors domain `Mandate`). Team-scoped (`owner_id` holds the team scope). */
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
  jobText: text('job_text').notNull().default(''),
  lang: text('lang').notNull().default('en'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/** Represented candidates (mirrors domain `Talent`). Team-scoped (`owner_id` holds the team scope). */
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
  anonymizedAt: text('anonymized_at'),
});

/** Files attached to a talent (base64 bytes + metadata). Team-scoped. */
export const attachments = pgTable('attachments', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  talentId: text('talent_id').notNull(),
  name: text('name').notNull(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  data: text('data').notNull(), // base64
  createdAt: text('created_at').notNull(),
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
    translations: jsonb('translations').$type<TalentDocuments['translations']>(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.ownerId, t.talentId] }) }),
);

/** Pipeline candidacies (talent ↔ mandate links with a stage). Team-scoped. */
export const candidacies = pgTable('candidacies', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  mandateId: text('mandate_id').notNull(),
  talentId: text('talent_id').notNull(),
  stage: text('stage').notNull(),
  note: text('note').notNull(),
  order: integer('order').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/** Recorded interview experiences (mirrors domain `InterviewObservation`). Team-scoped. */
export const interviewObservations = pgTable('interview_observations', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  companyKey: text('company_key').notNull(),
  company: text('company').notNull(),
  mandateId: text('mandate_id').notNull(),
  talentId: text('talent_id').notNull(),
  rounds: integer('rounds').notNull(),
  formats: jsonb('formats').$type<string[]>().notNull(),
  difficulty: text('difficulty').notNull(),
  notes: text('notes').notNull(),
  at: text('at').notNull(),
});

/** The assistant's team configuration (mirrors domain `AssistantSettings`). */
export const assistantSettings = pgTable('assistant_settings', {
  ownerId: text('owner_id').primaryKey(),
  settings: jsonb('settings').$type<AssistantSettings>().notNull(),
});

/** The team's DSGVO retention policy (mirrors domain `RetentionPolicy`). */
export const retentionPolicies = pgTable('retention_policies', {
  ownerId: text('owner_id').primaryKey(),
  policy: jsonb('policy').$type<RetentionPolicy>().notNull(),
});

/** The assistant's suggestion queue (mirrors domain `AssistantSuggestion`). Team-scoped. */
export const assistantSuggestions = pgTable('assistant_suggestions', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  rationale: text('rationale').notNull(),
  mandateId: text('mandate_id'),
  talentId: text('talent_id'),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
  resolvedAt: text('resolved_at'),
  runId: text('run_id').notNull(),
});

/** The AI-artifact outcome log (mirrors domain `ArtifactLog`). Team-scoped. */
export const artifactLogs = pgTable('artifact_logs', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  kind: text('kind').notNull(),
  talentId: text('talent_id').notNull(),
  provider: text('provider').notNull(),
  channel: text('channel').notNull(),
  audience: text('audience').notNull(),
  outcome: text('outcome').notNull(),
  createdAt: text('created_at').notNull(),
  outcomeAt: text('outcome_at'),
});

/** Pipeline stage-transition log (mirrors domain `StageTransition`). Team-scoped. */
export const stageTransitions = pgTable('stage_transitions', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  candidacyId: text('candidacy_id').notNull(),
  mandateId: text('mandate_id').notNull(),
  talentId: text('talent_id').notNull(),
  fromStage: text('from_stage'),
  toStage: text('to_stage').notNull(),
  at: text('at').notNull(),
});

/** Append-only meter of LLM calls (mirrors domain `UsageEvent`). Per user. */
export const usageEvents = pgTable('usage_events', {
  seq: serial('seq').primaryKey(),
  // Domain field is `userId`; the column keeps its legacy name `owner_id` to avoid a migration.
  userId: text('owner_id').notNull(),
  provider: text('provider').notNull(),
  feature: text('feature').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  at: text('at').notNull(),
});

/** Booked placements (mirrors domain `Placement`). Team-scoped (`owner_id` holds the team scope). */
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
