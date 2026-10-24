import { promises as fs } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runLegacyApplicationMigration } from '../../src/services/legacy-application-migration.js';
import type { AppConfig } from '../../src/config.js';
import type { Application } from '../../src/domain/application.js';
import {
  defaultStyle,
  emptyContact,
  type TalentDocuments,
} from '../../src/domain/talent-documents.js';
import { FsApplicationRepository } from '../../src/adapters/fs-application-repository.js';
import { FsJobPostingRepository } from '../../src/adapters/fs-job-posting-repository.js';
import { FsJobApplicationRepository } from '../../src/adapters/fs-job-application-repository.js';
import { FsDocumentRepository } from '../../src/adapters/fs-document-repository.js';
import { FsWorkspaceSettingsStore } from '../../src/adapters/fs-workspace-settings-store.js';
import {
  FixedClock,
  InMemoryApplicationRepository,
  InMemoryDocumentRepository,
  InMemoryJobApplicationRepository,
  InMemoryJobPostingRepository,
  InMemoryWorkspaceSettingsStore,
  SequenceIdGenerator,
  noopLogger,
} from '../support/fakes.js';

const legacy = (id: string, over: Partial<Application> = {}): Application => ({
  id,
  ownerId: 'team',
  date: '2026-06-25',
  company: 'Acme',
  position: 'Engineer',
  address: '',
  reference: 'https://example.com/job/1',
  status: 'sent',
  pdfPath: null,
  source: 'matching',
  talentId: 't1',
  talentName: 'Ada Lovelace',
  createdAt: '2026-06-25T10:00:00.000Z',
  ...over,
});

const baseDocuments = (ownerId: string, talentId: string): TalentDocuments => ({
  ownerId,
  talentId,
  contact: { ...emptyContact, name: 'Ada Lovelace' },
  resume: { summary: 'Base.', experience: [], education: [], skillGroups: [], rawText: 'RAW' },
  letter: {
    firma: '',
    ansprechpartner: '',
    strasse: '',
    plzOrt: '',
    betreff: '',
    anrede: '',
    absaetze: [],
    gruss: '',
  },
  style: defaultStyle,
  updatedAt: '2026-06-25T10:00:00.000Z',
});

function makeDeps() {
  const applications = new InMemoryApplicationRepository();
  const postings = new InMemoryJobPostingRepository();
  const jobApplications = new InMemoryJobApplicationRepository();
  const documents = new InMemoryDocumentRepository();
  const settings = new InMemoryWorkspaceSettingsStore();
  const ids = new SequenceIdGenerator('mig');
  return {
    applications,
    postings,
    jobApplications,
    documents,
    settings,
    deps: {
      applicationRepository: applications,
      jobPostingRepository: postings,
      jobApplicationRepository: jobApplications,
      documentRepository: documents,
      workspaceSettingsStore: settings,
      idGenerator: ids,
      clock: new FixedClock(),
      logger: noopLogger,
    },
  };
}

describe('runLegacyApplicationMigration', () => {
  it('LegacyMigration_ApplicationWithTalent_CreatesPostingAndApplication', async () => {
    const { applications, postings, jobApplications, deps } = makeDeps();
    applications.apps = [legacy('a1')];

    await runLegacyApplicationMigration('team', deps);

    const ps = await postings.list('team');
    expect(ps).toHaveLength(1);
    expect(ps[0]).toMatchObject({
      source: 'migrated',
      company: 'Acme',
      title: 'Engineer',
      url: 'https://example.com/job/1',
    });

    const apps = await jobApplications.list('team');
    expect(apps).toHaveLength(1);
    expect(apps[0]).toMatchObject({
      jobPostingId: ps[0].id,
      talentId: 't1',
      talentName: 'Ada Lovelace',
      postingCompany: 'Acme',
      postingTitle: 'Engineer',
      status: 'sent',
    });
  });

  it('LegacyMigration_DeduplicatesPostingsByCompanyTitleOrUrl', async () => {
    const { applications, postings, jobApplications, deps } = makeDeps();
    // Two records: same company/title but no URL → one posting; plus one URL record.
    applications.apps = [
      legacy('a1', { reference: '', talentId: 't1' }),
      legacy('a2', { reference: '', talentId: 't2' }),
      legacy('a3', { reference: 'https://other.test/x', talentId: 't3' }),
    ];

    await runLegacyApplicationMigration('team', deps);

    // Postings dedup: (Acme, Engineer) collapses into one; the URL record is separate.
    expect(await postings.list('team')).toHaveLength(2);
    // Applications: one per (posting, talent) → 3.
    expect(await jobApplications.list('team')).toHaveLength(3);
  });

  it('LegacyMigration_MapsStatusAndCopiesCurrentBaseCv', async () => {
    const { applications, postings, jobApplications, documents, deps } = makeDeps();
    await documents.save(baseDocuments('team', 't1'));
    applications.apps = [legacy('a1', { status: 'hired', talentId: 't1' })];

    await runLegacyApplicationMigration('team', deps);

    const apps = await jobApplications.list('team');
    expect(apps[0].status).toBe('offer'); // hired → offer
    expect(apps[0].documents.resume.rawText).toBe(''); // copy strips rawText
    expect(apps[0].documents.resume.summary).toBe('Base.'); // copy of current base CV
    expect((await documents.get('team', 't1'))?.resume.rawText).toBe('RAW'); // base untouched
    await postings.list('team');
  });

  it('LegacyMigration_ApplicationWithoutTalent_IsSkipped', async () => {
    const { applications, postings, jobApplications, deps } = makeDeps();
    applications.apps = [legacy('a1', { talentId: undefined, source: 'api' })];

    await runLegacyApplicationMigration('team', deps);

    expect(await postings.list('team')).toHaveLength(0);
    expect(await jobApplications.list('team')).toHaveLength(0);
  });

  it('LegacyMigration_NonUrlReference_IsTreatedAsNoUrl', async () => {
    const { applications, postings, deps } = makeDeps();
    // Free text (not a URL) and a non-http scheme both fall back to (company, title) dedup.
    applications.apps = [
      legacy('a1', { reference: 'just free text', talentId: 't1' }),
      legacy('a2', { reference: 'ftp://example.test/a', talentId: 't2' }),
    ];

    await runLegacyApplicationMigration('team', deps);

    const ps = await postings.list('team');
    // Same (Acme, Engineer) for both → one posting, and neither record carried a url.
    expect(ps).toHaveLength(1);
    expect(ps[0].url).toBeUndefined();
  });

  it('LegacyMigration_SameTalentSamePosting_DoesNotDuplicateApplication', async () => {
    const { applications, postings, jobApplications, deps } = makeDeps();
    // Two records for the same talent and same (company, title): the posting is
    // deduplicated and the second record skips (exactly one application).
    applications.apps = [
      legacy('a1', { reference: '', talentId: 't1' }),
      legacy('a2', { reference: '', talentId: 't1' }),
    ];

    await runLegacyApplicationMigration('team', deps);

    expect(await postings.list('team')).toHaveLength(1);
    expect(await jobApplications.list('team')).toHaveLength(1);
  });

  it('LegacyMigration_EmptyCreatedAtAndMissingTalentName_UsesFallbacks', async () => {
    const { applications, jobApplications, deps } = makeDeps();
    applications.apps = [legacy('a1', { createdAt: '', talentName: undefined })];

    await runLegacyApplicationMigration('team', deps);

    const apps = await jobApplications.list('team');
    expect(apps[0].talentName).toBe(''); // talentName ?? ''
    expect(apps[0].createdAt).toBe('2026-06-25T10:00:00.000Z'); // clock fallback
    expect(apps[0].statusHistory[0].at).toBe('2026-06-25T10:00:00.000Z');
  });

  it('LegacyMigration_RunTwice_IsIdempotent', async () => {
    const { applications, postings, jobApplications, deps } = makeDeps();
    applications.apps = [legacy('a1')];

    await runLegacyApplicationMigration('team', deps);
    await runLegacyApplicationMigration('team', deps);

    expect(await postings.list('team')).toHaveLength(1);
    expect(await jobApplications.list('team')).toHaveLength(1);
  });

  it('LegacyMigration_NormalizesUrlBeforeDedup', async () => {
    // A posting already persisted with the NORMALISED url — exactly what
    // "Stelle einfügen per URL" stores. A legacy record whose raw reference
    // normalises to the same URL (host-case + trailing slash) must hit that
    // posting and create no second one (ADR-0058 §3.4: normalise before dedup
    // and before add).
    const { applications, postings, jobApplications, deps } = makeDeps();
    postings.postings.push({
      id: 'p-existing',
      ownerId: 'team',
      source: 'migrated',
      url: 'https://example.com/job/1',
      company: 'Acme',
      title: 'Engineer',
      location: '',
      country: '',
      description: '',
      requirements: [],
      descriptionIncomplete: true,
      createdAt: '2026-06-25T10:00:00.000Z',
    });
    applications.apps = [legacy('a1', { reference: 'https://EXAMPLE.com/job/1/', talentId: 't1' })];

    await runLegacyApplicationMigration('team', deps);

    const ps = await postings.list('team');
    expect(ps).toHaveLength(1);
    expect(ps[0].url).toBe('https://example.com/job/1');
    expect(await jobApplications.list('team')).toHaveLength(1);
  });

  it('LegacyMigration_RerunAfterPartialRun_DoesNotDuplicatePostings', async () => {
    // Simulate an aborted run: the postings were persisted but the workspace flag
    // was NOT. A second boot re-runs the migration and must not create duplicate
    // postings (or ghost references) — the posting dedup reads the store, not
    // only in-memory state (crash-resume, Owner Q4).
    const { applications, postings, jobApplications, settings, deps } = makeDeps();
    applications.apps = [
      legacy('a1', { reference: 'https://example.com/job/1' }),
      legacy('a2', { reference: 'https://example.com/job/2', company: 'Beta', position: 'Other' }),
      legacy('a3', { reference: '', company: 'Gamma', position: 'No URL' }),
    ];

    await runLegacyApplicationMigration('team', deps);
    expect(await postings.list('team')).toHaveLength(3);
    expect(await jobApplications.list('team')).toHaveLength(3);

    // "Aborted" state: the flag is dropped (never persisted), the postings stay.
    await settings.set('team', { vermittlung: false });

    await runLegacyApplicationMigration('team', deps);
    expect(await postings.list('team')).toHaveLength(3);
    expect(await jobApplications.list('team')).toHaveLength(3);
  });

  it('LegacyMigration_Fs_SeedsLogAndWorkspaceSettings_MigratesAndSecondRunIdempotent', async () => {
    const rootDir = mkdtempSync(path.join(os.tmpdir(), 'legacy-migration-'));
    const storeDir = path.join(rootDir, 'bewerbungen');
    const config = {
      logFile: path.join(storeDir, 'log.json'),
      jobPostingsFile: path.join(storeDir, 'job-postings.json'),
      jobApplicationsFile: path.join(storeDir, 'job-applications.json'),
      documentsFile: path.join(storeDir, 'documents.json'),
      workspaceSettingsFile: path.join(storeDir, 'workspace-settings.json'),
    } as AppConfig;
    await fs.mkdir(storeDir, { recursive: true });
    await fs.writeFile(
      config.logFile,
      JSON.stringify([
        legacy('a1', { talentId: 't1' }),
        legacy('a2', { talentId: undefined, source: 'api', company: 'Skip', position: 'X' }),
      ]),
    );
    await fs.writeFile(
      config.workspaceSettingsFile,
      JSON.stringify({ team: { vermittlung: false } }),
    );

    const deps = {
      applicationRepository: new FsApplicationRepository({ config }),
      jobPostingRepository: new FsJobPostingRepository({ config }),
      jobApplicationRepository: new FsJobApplicationRepository({ config }),
      documentRepository: new FsDocumentRepository({ config }),
      workspaceSettingsStore: new FsWorkspaceSettingsStore({ config }),
      idGenerator: new SequenceIdGenerator('mig'),
      clock: new FixedClock(),
      logger: noopLogger,
    };

    await runLegacyApplicationMigration('team', deps);
    await runLegacyApplicationMigration('team', deps); // second run is a no-op (flag)

    const postings = JSON.parse(await fs.readFile(config.jobPostingsFile, 'utf8'));
    const applications = JSON.parse(await fs.readFile(config.jobApplicationsFile, 'utf8'));
    expect(postings).toHaveLength(1);
    expect(applications).toHaveLength(1);
    // The old log is untouched (only new stores are written, Owner Q4).
    const log = JSON.parse(await fs.readFile(config.logFile, 'utf8'));
    expect(log).toHaveLength(2);
    // The flag is persisted.
    const settings = JSON.parse(await fs.readFile(config.workspaceSettingsFile, 'utf8'));
    expect(settings.team.applicationsMigrated).toBe(true);
  });
});
