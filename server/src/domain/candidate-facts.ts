import type { OutputLang } from './language.js';
import type { TalentDocuments } from './talent-documents.js';
import { canonicalizeSkills } from './skill-taxonomy.js';

/**
 * The one canonical "candidate facts" block that every LLM prompt builds on
 * (pitch, outreach, match explanation, interview kit, document AI). One
 * implementation means one format: the same labels, the same canonicalized
 * skills and the same empty-field handling everywhere.
 */

/** Skills a candidate demonstrably has, taken from their document set. */
export function documentSkills(documents: TalentDocuments | null): string[] {
  if (!documents) return [];
  const all = [
    ...documents.resume.skillGroups.flatMap((g) => g.items),
    ...documents.resume.experience.flatMap((e) => e.skills),
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  return canonicalizeSkills(all);
}

const LABELS: Record<
  OutputLang,
  { name: string; role: string; profile: string; roles: string; skills: string; education: string }
> = {
  en: {
    name: 'Name',
    role: 'Role',
    profile: 'Profile',
    roles: 'Experience',
    skills: 'Skills',
    education: 'Education',
  },
  de: {
    name: 'Name',
    role: 'Rolle',
    profile: 'Profil',
    roles: 'Stationen',
    skills: 'Skills',
    education: 'Ausbildung',
  },
};

/**
 * Render the candidate's facts as a compact labelled block. Empty fields are
 * skipped entirely (no blank lines). Labels are English by default and German
 * when `opts.lang === 'de'`; education is included only on request.
 */
export function candidateFacts(
  documents: TalentDocuments,
  opts: { lang?: OutputLang; education?: boolean } = {},
): string {
  const { contact, resume } = documents;
  const L = LABELS[opts.lang ?? 'en'];
  const roles = resume.experience
    .map((e) => [e.role, e.company].filter(Boolean).join(' @ '))
    .filter(Boolean);
  const skills = documentSkills(documents);
  const education = opts.education
    ? resume.education.map((e) => [e.degree, e.school].filter(Boolean).join(', ')).filter(Boolean)
    : [];
  return [
    contact.name ? `${L.name}: ${contact.name}` : '',
    contact.role ? `${L.role}: ${contact.role}` : '',
    resume.summary ? `${L.profile}: ${resume.summary}` : '',
    roles.length ? `${L.roles}: ${roles.join('; ')}` : '',
    skills.length ? `${L.skills}: ${skills.join(', ')}` : '',
    education.length ? `${L.education}: ${education.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
