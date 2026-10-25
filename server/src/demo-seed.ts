import type { Talent } from './domain/talent.js';
import type { JobPosting } from './domain/job-posting.js';
import type { JobApplication } from './domain/job-application.js';
import type { TalentDocuments } from './domain/talent-documents.js';
import { emptyDocuments } from './domain/talent-documents.js';
import type { TalentRepository } from './ports/talent-repository.js';
import type { JobPostingRepository } from './ports/job-posting-repository.js';
import type { JobApplicationRepository } from './ports/job-application-repository.js';
import type { WorkspaceSettingsStore } from './ports/workspace-settings-store.js';
import type { WorkspaceSettings } from './domain/workspace-settings.js';
import { DEFAULT_WORKSPACE_SETTINGS } from './domain/workspace-settings.js';

/**
 * Demo-workspace seeding (AK-6.6, plan §6). Pure, decorator-free and side-effect
 * light: it composes the same persistence ports the app uses (fs or sql via
 * `persistence-factory.ts`), so the seed is fs/sql-symmetric and idempotent.
 *
 * All data is **synthetically fictional** (no real PII, `demo-`/`Example`
 * markers): §6.2 verboten — never real names, emails, phones, addresses or
 * companies. `aiConsent` stays unset by default (OQ4); `--with-consent` presets
 * it to `true` for a consent-free golden path.
 */

export const DEMO_TALENT_ID = 'demo-mandant-1';
export const DEMO_POSTING_ID = 'demo-stelle-1';
export const DEMO_APPLICATION_ID = 'demo-bewerbung-1';

const ISO = '2026-06-25T10:00:00.000Z';

/** The synthetic demo Mandant (code: Talent). */
export function demoTalent(): Omit<Talent, 'ownerId'> {
  return {
    id: DEMO_TALENT_ID,
    name: 'Jamie Carter',
    role: 'Software Engineer',
    headline: 'M.Sc. Software Engineer',
    location: 'Springfield',
    email: 'demo-mandant@example.invalid',
    phone: '',
    availability: '',
    salary: '',
    skills: ['TypeScript', 'Node.js', 'PostgreSQL'],
    createdAt: ISO,
    updatedAt: ISO,
  };
}

/** The synthetic demo Stelle (code: JobPosting), source `text`. */
export function demoPosting(): Omit<JobPosting, 'ownerId'> {
  return {
    id: DEMO_POSTING_ID,
    source: 'text',
    company: 'Example Ltd.',
    title: 'Senior Software Engineer',
    location: 'Berlin',
    country: 'DE',
    description:
      'Synthetic demo posting. Example Ltd. is looking for a Senior Software ' +
      'Engineer for distributed systems with TypeScript, Node.js and PostgreSQL.',
    requirements: ['TypeScript', 'Node.js', 'PostgreSQL'],
    descriptionIncomplete: false,
    createdAt: ISO,
  };
}

/** The document copy for the demo Bewerbung (synthetic base CV). */
export function demoDocuments(ownerId: string): TalentDocuments {
  const docs = emptyDocuments(
    ownerId,
    DEMO_TALENT_ID,
    {
      name: 'Jamie Carter',
      role: 'Software Engineer',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
    },
    ISO,
  );
  docs.resume = {
    summary: 'Synthetic demo profile — Software Engineer with a focus on backend.',
    experience: [
      {
        role: 'Software Engineer',
        company: 'Example Ltd.',
        period: '2021—2026',
        location: 'Springfield',
        bullets: ['Maintaining distributed backend services'],
        skills: ['TypeScript', 'Node.js'],
      },
    ],
    education: [],
    skillGroups: [{ label: 'Backend', items: ['TypeScript', 'Node.js', 'PostgreSQL'] }],
    rawText: '',
  };
  return docs;
}

/** The synthetic demo Bewerbung (code: JobApplication), status `draft`. */
export function demoApplication(ownerId: string): JobApplication {
  return {
    id: DEMO_APPLICATION_ID,
    ownerId,
    jobPostingId: DEMO_POSTING_ID,
    postingCompany: 'Example Ltd.',
    postingTitle: 'Senior Software Engineer',
    talentId: DEMO_TALENT_ID,
    talentName: 'Jamie Carter',
    status: 'draft',
    statusHistory: [{ status: 'draft', at: ISO }],
    documents: demoDocuments(ownerId),
    selectedAttachmentIds: [],
    createdAt: ISO,
    updatedAt: ISO,
  };
}

/** The persistence ports the seed needs (a subset of `Persistence`). */
export interface DemoSeedDeps {
  scope: string;
  talentRepository: TalentRepository;
  jobPostingRepository: JobPostingRepository;
  jobApplicationRepository: JobApplicationRepository;
  workspaceSettingsStore: WorkspaceSettingsStore;
}

export interface DemoSeedResult {
  talent: Talent;
  posting: JobPosting;
  application: JobApplication;
  created: { talent: boolean; posting: boolean; application: boolean };
}

/**
 * Idempotently upsert the three demo entities. Fixed ids + a `findById` look-up
 * mean a re-run creates no duplicates; `--with-consent` additionally presets
 * `aiConsent: true` (OQ4).
 */
export async function seedDemo(
  deps: DemoSeedDeps,
  opts: { withConsent?: boolean } = {},
): Promise<DemoSeedResult> {
  const { scope } = deps;
  const talent: Talent = { ...demoTalent(), ownerId: scope };
  const posting: JobPosting = { ...demoPosting(), ownerId: scope };
  const application = demoApplication(scope);

  const created = { talent: false, posting: false, application: false };
  if (!(await deps.talentRepository.findById(scope, DEMO_TALENT_ID))) {
    await deps.talentRepository.add(talent);
    created.talent = true;
  }
  if (!(await deps.jobPostingRepository.findById(scope, DEMO_POSTING_ID))) {
    await deps.jobPostingRepository.add(posting);
    created.posting = true;
  }
  if (!(await deps.jobApplicationRepository.findById(scope, DEMO_APPLICATION_ID))) {
    await deps.jobApplicationRepository.add(application);
    created.application = true;
  }

  if (opts.withConsent) {
    const current: WorkspaceSettings = (await deps.workspaceSettingsStore.get(scope)) ?? {
      ...DEFAULT_WORKSPACE_SETTINGS,
    };
    await deps.workspaceSettingsStore.set(scope, { ...current, aiConsent: true });
  }

  return { talent, posting, application, created };
}

/**
 * The synthetic-data deny list (plan §6.3 `SeedDemo_Synthetic_NoRealPii`):
 * no real email domains, no real person/firm names in the fixtures.
 */
export const DEMO_PII_DENYLIST = [
  '@gmail',
  '@yahoo',
  '@outlook',
  '@web.de',
  '@gmx',
  'Suhay',
  'Sevinc',
  'Aurora',
  'Helio',
  'Nordwind',
  'Celonis',
];
