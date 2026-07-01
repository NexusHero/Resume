import { z } from 'zod';

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
export type DocumentTemplate = 'classic' | 'modern' | 'compact';
export const documentTemplates: DocumentTemplate[] = ['classic', 'modern', 'compact'];

/** The shared look — layout template, accent colour trio, font and scale. */
export interface DocumentStyle {
  template: DocumentTemplate;
  accent: string;
  strong: string;
  onDark: string;
  font: string;
  size: number;
}

/** The persisted aggregate: one document set per (owner, talent). */
export interface TalentDocuments {
  ownerId: string;
  talentId: string;
  contact: DocumentContact;
  resume: ResumeContent;
  letter: LetterContent;
  style: DocumentStyle;
  updatedAt: string; // ISO 8601
}

const contactSchema = z.object({
  name: z.string().default(''),
  role: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  location: z.string().default(''),
  linkedin: z.string().default(''),
});

const resumeSchema = z.object({
  summary: z.string().default(''),
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

const letterSchema = z.object({
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
  template: z.enum(['classic', 'modern', 'compact']).default('classic'),
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
};

export const emptyLetter: LetterContent = {
  firma: '',
  ansprechpartner: '',
  strasse: '',
  plzOrt: '',
  betreff: '',
  anrede: 'Sehr geehrte Damen und Herren,',
  absaetze: [''],
  gruss: 'Mit freundlichen Grüßen',
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
