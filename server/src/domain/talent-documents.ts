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

/** The shared look — accent colour trio, font and scale (matches the editor). */
export interface DocumentStyle {
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
  accent: z.string().default('#2A6FDB'),
  strong: z.string().default('#1d4ed8'),
  onDark: z.string().default('#7aa7f5'),
  font: z.string().default('var(--font-display)'),
  size: z.number().default(1),
});

/** PUT /api/v1/talents/:id/documents — the whole editable set, all parts optional. */
export const saveDocumentsSchema = z.object({
  contact: contactSchema.default({}),
  resume: resumeSchema.default({}),
  letter: letterSchema.default({}),
  style: styleSchema.default({}),
});
export type SaveDocumentsInput = z.infer<typeof saveDocumentsSchema>;

export const defaultStyle: DocumentStyle = {
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
