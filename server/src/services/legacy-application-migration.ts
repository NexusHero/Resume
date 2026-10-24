import type { ApplicationRepository } from '../ports/application-repository.js';
import type { JobPostingRepository } from '../ports/job-posting-repository.js';
import type { JobApplicationRepository } from '../ports/job-application-repository.js';
import type { DocumentRepository } from '../ports/document-repository.js';
import type { WorkspaceSettingsStore } from '../ports/workspace-settings-store.js';
import type { IdGenerator } from '../ports/id-generator.js';
import type { Clock } from '../ports/clock.js';
import type { Logger } from '../ports/logger.js';
import { normalizeUrl, type JobPosting } from '../domain/job-posting.js';
import { mapLegacyStatus, type JobApplication } from '../domain/job-application.js';
import {
  copyDocumentsForApplication,
  emptyContact,
  emptyDocuments,
} from '../domain/talent-documents.js';
import { DEFAULT_WORKSPACE_SETTINGS } from '../domain/workspace-settings.js';

export interface LegacyApplicationMigrationDeps {
  applicationRepository: ApplicationRepository;
  jobPostingRepository: JobPostingRepository;
  jobApplicationRepository: JobApplicationRepository;
  documentRepository: DocumentRepository;
  workspaceSettingsStore: WorkspaceSettingsStore;
  idGenerator: IdGenerator;
  clock: Clock;
  logger: Logger;
}

/**
 * Treat a legacy `reference` as a posting URL only when it parses as http(s);
 * otherwise it is a free-text reference (Owner Q4 → no URL, dedup by name).
 */
function parseUrl(reference: string): string | undefined {
  const raw = (reference ?? '').trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' ? raw : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Store-based "find or create" for the migrated posting (crash-resume, Owner Q4):
 * an aborted run that already persisted the posting — but not the workspace flag —
 * must not create a duplicate on the next boot. The raw reference URL is
 * normalised **before** dedup and before `add` (ADR-0058 §3.4: normalised URLs are
 * stored, so a later "Stelle einfügen per URL" recognises the migrated ad as a
 * duplicate). For a URL-bearing record the dedup key is the normalised URL;
 * otherwise it is `(company, title)` within the `migrated` source.
 */
async function findOrCreatePosting(
  scope: string,
  deps: LegacyApplicationMigrationDeps,
  app: { company: string; position: string; reference: string; createdAt: string },
  url: string | undefined,
): Promise<JobPosting> {
  const normalizedUrl = url ? normalizeUrl(url) : undefined;
  const existing = normalizedUrl
    ? await deps.jobPostingRepository.findDuplicate(scope, 'migrated', undefined, normalizedUrl)
    : (await deps.jobPostingRepository.list(scope)).find(
        (p) => p.source === 'migrated' && p.company === app.company && p.title === app.position,
      );
  if (existing) return existing;

  const posting: JobPosting = {
    id: deps.idGenerator.next(),
    ownerId: scope,
    source: 'migrated',
    ...(normalizedUrl ? { url: normalizedUrl } : {}),
    company: app.company,
    title: app.position,
    location: '',
    country: '',
    description: '',
    requirements: [],
    descriptionIncomplete: true,
    createdAt: app.createdAt,
  };
  await deps.jobPostingRepository.add(posting);
  return posting;
}

/**
 * Migrate the frozen pipeline `Application` records into the new
 * `JobPosting`/`JobApplication` entities (AK-2.7, Owner Q4/Q5). Read-only over
 * the legacy data — it writes only the new stores. Idempotent twice over:
 *
 * 1. A workspace flag `applicationsMigrated` in `WorkspaceSettings` short-circuits
 *    a second run (Owner Q5).
 * 2. The per-row steps are themselves idempotent (posting dedup by `url` or
 *    `(company, title)` + "exactly one application per (posting, talent)"), so an
 *    aborted run resumes cleanly on the next boot.
 */
export async function runLegacyApplicationMigration(
  scope: string,
  deps: LegacyApplicationMigrationDeps,
): Promise<void> {
  const stored = await deps.workspaceSettingsStore.get(scope);
  if (stored?.applicationsMigrated) return;

  const legacy = await deps.applicationRepository.list(scope);

  for (const app of legacy) {
    // A Bewerbung needs a Mandant — own dossiers (no talentId) stay frozen (Owner Q4).
    if (!app.talentId) continue;

    const url = parseUrl(app.reference);
    const posting = await findOrCreatePosting(scope, deps, app, url);

    const existing = await deps.jobApplicationRepository.findByPostingAndTalent(
      scope,
      posting.id,
      app.talentId,
    );
    if (existing) continue;

    const base = await deps.documentRepository.get(scope, app.talentId);
    const createdAt = app.createdAt || deps.clock.isoNow();
    const documents = base
      ? copyDocumentsForApplication(base)
      : emptyDocuments(scope, app.talentId, { ...emptyContact }, createdAt);

    const status = mapLegacyStatus(app.status);
    const application: JobApplication = {
      id: deps.idGenerator.next(),
      ownerId: scope,
      jobPostingId: posting.id,
      postingCompany: app.company,
      postingTitle: app.position,
      talentId: app.talentId,
      talentName: app.talentName ?? '',
      status,
      statusHistory: [{ status, at: createdAt }],
      documents,
      createdAt,
      updatedAt: createdAt,
    };
    await deps.jobApplicationRepository.add(application);
  }

  // Mark the workspace migrated so the next boot skips straight away (Owner Q5).
  const current = stored ?? DEFAULT_WORKSPACE_SETTINGS;
  await deps.workspaceSettingsStore.set(scope, { ...current, applicationsMigrated: true });
  deps.logger.info({ scope }, 'legacy application migration completed');
}
