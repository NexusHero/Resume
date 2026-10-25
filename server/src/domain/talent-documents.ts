import { z } from 'zod';
import type { OutputLang } from './language.js';

/**
 * The two documents an agency prepares for a candidate — a Lebenslauf (resume)
 * and an Anschreiben (cover letter) — plus the shared style. Owned by a
 * recruiter and attached to one talent. The field shapes mirror exactly what
 * the Workspace editor already edits, so the UI can persist without reshaping.
 */
export interface DocumentContact {
  name: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  /** Optional portrait as a data URI (image/*), shown in the resume header. */
  photo?: string;
}

export interface ResumeExperience {
  role: string;
  company: string;
  period: string;
  location: string;
  bullets: string[];
  skills: string[];
}

export interface ResumeEducation {
  degree: string;
  school: string;
  period: string;
  note: string;
}

export interface ResumeSkillGroup {
  label: string;
  items: string[];
}

export interface ResumeContent {
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skillGroups: ResumeSkillGroup[];
  /**
   * The raw CV text kept by the text-only import ("Text übernehmen (ohne KI)").
   * Internal source only: exported in the GDPR export, never rendered in the
   * Mappe/PDF, never sent in an AI prompt, cleared on anonymisation.
   */
  rawText: string;
}

export interface LetterContent {
  firma: string;
  ansprechpartner: string;
  strasse: string;
  plzOrt: string;
  betreff: string;
  anrede: string;
  absaetze: string[];
  gruss: string;
}

/** Layout templates for the printed documents. */
export type DocumentTemplate = 'classic' | 'modern' | 'compact' | 'ink';

/** The shared look — layout template, accent colour trio, font and scale. */
export interface DocumentStyle {
  template: DocumentTemplate;
  accent: string;
  strong: string;
  onDark: string;
  font: string;
  size: number;
}

/**
 * A translated variant of the documents — the resume + cover letter rendered in
 * another language. Stored alongside the primary set so a recruiter can present
 * the same candidate to a client in the job ad's language without re-typing.
 */
export interface DocumentTranslation {
  resume: ResumeContent;
  letter: LetterContent;
  provider: string; // 'claude' | 'gemini' | 'template' — which backend produced it
  updatedAt: string; // ISO 8601
}

/** The persisted aggregate: one document set per (owner, talent). */
export interface TalentDocuments {
  ownerId: string;
  talentId: string;
  contact: DocumentContact;
  resume: ResumeContent;
  letter: LetterContent;
  style: DocumentStyle;
  /** Optional language variants keyed by language (e.g. `en`, `de`). */
  translations?: Partial<Record<OutputLang, DocumentTranslation>>;
  updatedAt: string; // ISO 8601
}

const contactSchema = z.object({
  name: z.string().default(''),
  role: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  location: z.string().default(''),
  linkedin: z.string().default(''),
  // ~220 KB of base64 — enough for a decent portrait, small enough to live
  // inside the document row. Must be an image data URI (never a remote URL).
  photo: z
    .string()
    .max(300_000)
    .regex(/^data:image\//, 'photo must be an image data URI')
    .optional(),
});

export const resumeSchema = z.object({
  summary: z.string().default(''),
  rawText: z.string().max(50_000).default(''),
  experience: z
    .array(
      z.object({
        role: z.string().default(''),
        company: z.string().default(''),
        period: z.string().default(''),
        location: z.string().default(''),
        bullets: z.array(z.string()).default([]),
        skills: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        degree: z.string().default(''),
        school: z.string().default(''),
        period: z.string().default(''),
        note: z.string().default(''),
      }),
    )
    .default([]),
  skillGroups: z
    .array(z.object({ label: z.string().default(''), items: z.array(z.string()).default([]) }))
    .default([]),
});

export const letterSchema = z.object({
  firma: z.string().default(''),
  ansprechpartner: z.string().default(''),
  strasse: z.string().default(''),
  plzOrt: z.string().default(''),
  betreff: z.string().default(''),
  anrede: z.string().default(''),
  absaetze: z.array(z.string()).default([]),
  gruss: z.string().default(''),
});

const styleSchema = z.object({
  template: z.enum(['classic', 'modern', 'compact', 'ink']).default('classic'),
  accent: z.string().default('#2A6FDB'),
  strong: z.string().default('#1d4ed8'),
  onDark: z.string().default('#7aa7f5'),
  font: z.string().default('var(--font-display)'),
  size: z.number().default(1),
});

export const emptyContact: DocumentContact = {
  name: '',
  role: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
};

export const defaultStyle: DocumentStyle = {
  template: 'classic',
  accent: '#2A6FDB',
  strong: '#1d4ed8',
  onDark: '#7aa7f5',
  font: 'var(--font-display)',
  size: 1,
};

export const emptyResume: ResumeContent = {
  summary: '',
  experience: [],
  education: [],
  skillGroups: [],
  rawText: '',
};

export const emptyLetter: LetterContent = {
  firma: '',
  ansprechpartner: '',
  strasse: '',
  plzOrt: '',
  betreff: '',
  anrede: 'Dear Sir or Madam,',
  absaetze: [''],
  gruss: 'Kind regards',
};

/**
 * PUT /api/v1/talents/:id/documents — the whole editable set, all parts
 * optional. An entirely-absent part falls back to its default; a partial part
 * is filled in field-by-field by the sub-schemas' own defaults. (zod 4's
 * `.default` takes the resolved output, hence the explicit fallbacks.)
 */
export const saveDocumentsSchema = z.object({
  contact: contactSchema.default(emptyContact),
  resume: resumeSchema.default(emptyResume),
  letter: letterSchema.default(emptyLetter),
  style: styleSchema.default(defaultStyle),
});
export type SaveDocumentsInput = z.infer<typeof saveDocumentsSchema>;

/** A copy of the documents with the internal raw CV text blanked. */
export function withoutRawText(documents: TalentDocuments): TalentDocuments {
  return { ...documents, resume: { ...documents.resume, rawText: '' } };
}

/**
 * The document copy for a job application (ADR-0059). Copies the **structured**
 * fields (`contact`, `resume` without `rawText`, `letter`, `style`) deeply so an
 * edit to the copy never mutates the base CV (AK-2.3). Two things are deliberately
 * **not** copied:
 *
 * - `resume.rawText` — the internal raw source of the base-CV import (ADR-0057
 *   §4): never rendered, never sent, only the AI-import's own input. Duplicating
 *   up to 50 KB of personal raw data per application would be data-minimisation
 *   questionable; the application works on the structured fields.
 * - `translations` — language variants of the **base** dataset. The copy is the
 *   single-language working copy for exactly one posting; translating stays a
 *   base-editor concern.
 *
 * `ownerId`/`talentId` are kept (provenance) so every rendering/editor path that
 * expects a `TalentDocuments` keeps working unchanged.
 */
export function copyDocumentsForApplication(documents: TalentDocuments): TalentDocuments {
  const base = withoutRawText(documents);
  const { translations: _translations, ...clean } = base;
  void _translations;
  return {
    ownerId: clean.ownerId,
    talentId: clean.talentId,
    contact: { ...clean.contact },
    resume: {
      summary: clean.resume.summary,
      experience: clean.resume.experience.map((e) => ({
        ...e,
        bullets: [...e.bullets],
        skills: [...e.skills],
      })),
      education: clean.resume.education.map((e) => ({ ...e })),
      skillGroups: clean.resume.skillGroups.map((g) => ({ ...g, items: [...g.items] })),
      rawText: '',
    },
    letter: { ...clean.letter, absaetze: [...clean.letter.absaetze] },
    style: { ...clean.style },
    updatedAt: clean.updatedAt,
  };
}

/**
 * An empty document set for a talent that has no saved base documents yet. The
 * `contact` block is seeded by the caller (from the talent for `create`, or blank
 * during the legacy migration where the talent may be gone).
 */
export function emptyDocuments(
  ownerId: string,
  talentId: string,
  contact: DocumentContact,
  updatedAt: string,
): TalentDocuments {
  return {
    ownerId,
    talentId,
    contact,
    resume: { ...emptyResume },
    letter: { ...emptyLetter },
    style: { ...defaultStyle },
    updatedAt,
  };
}

/** Normalise legacy documents (no `rawText`) read straight from a repository. */
export function normalizeDocuments(documents: TalentDocuments): TalentDocuments {
  if (typeof documents.resume.rawText === 'string') return documents;
  return { ...documents, resume: { ...documents.resume, rawText: '' } };
}

/**
 * Fixed name of the imported original CV (mass import and editor text import).
 * It is a reference attachment only: never preselected for an application and
 * never attached automatically (ADR-0057).
 */
export const ORIGINAL_CV_ATTACHMENT_NAME = 'Original-Lebenslauf (Import).pdf';
