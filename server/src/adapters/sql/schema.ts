import { pgTable, text, serial, jsonb } from 'drizzle-orm/pg-core';

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
