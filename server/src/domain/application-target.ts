import type { OutputLang } from './language';
import { detectLanguage } from './language';
import type { Mandate } from './mandate';
import type { Job } from './job';

/**
 * The auto-apply agent applies candidates to two kinds of opening — the
 * recruiter's own client mandates, or job postings received from the boards.
 * For building an application both are the same thing: an ad text, a language,
 * a role/company/location, and a stable reference. Normalizing them to one
 * `ApplicationTarget` lets the whole orchestration (match → tailor → dossier →
 * pipeline) be written once and reused for both sources (ADR-0019).
 */
export const APPLICATION_SOURCES = ['mandates', 'jobs'] as const;
export type ApplicationSource = (typeof APPLICATION_SOURCES)[number];

export interface ApplicationTarget {
  source: ApplicationSource;
  /** The mandate id, or the job posting id — stable within its source. */
  ref: string;
  role: string;
  company: string;
  location: string;
  /** The employer's requirements — drives matching, tailoring and the language. */
  jobText: string;
  lang: OutputLang;
}

/** A client mandate as an application target (language already derived from its ad). */
export function mandateToTarget(mandate: Mandate): ApplicationTarget {
  return {
    source: 'mandates',
    ref: mandate.id,
    role: mandate.role,
    company: mandate.client,
    location: mandate.location,
    jobText: mandate.jobText,
    lang: mandate.lang,
  };
}

/** A received job posting as an application target (language detected from the ad). */
export function jobToTarget(job: Job): ApplicationTarget {
  const jobText = [job.role, job.snippet ?? '', job.skills.join(', ')].filter(Boolean).join('\n');
  return {
    source: 'jobs',
    ref: job.id,
    role: job.role,
    company: job.company,
    location: [job.city, job.country].filter(Boolean).join(', '),
    jobText,
    lang: detectLanguage(jobText),
  };
}
