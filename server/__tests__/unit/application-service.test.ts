import { ApplicationService } from '../../src/services/application-service';
import { slug } from '../../src/domain/slug';
import {
  createApplicationSchema,
  updateApplicationSchema,
  buildApplicationSchema,
} from '../../src/domain/application';
import { NotFoundError } from '../../src/domain/errors';
import {
  InMemoryApplicationRepository,
  InMemoryAuditLog,
  InMemoryPdfArchive,
  FakePdfRenderer,
  FakePdfMerger,
  FakeVersioner,
  FixedClock,
  SequenceIdGenerator,
  noopLogger,
} from '../support/fakes';

function makeService(versioner: FakeVersioner = new FakeVersioner('abc1234')) {
  const repo = new InMemoryApplicationRepository();
  const audit = new InMemoryAuditLog();
  const archive = new InMemoryPdfArchive();
  const renderer = new FakePdfRenderer();
  const service = new ApplicationService({
    applicationRepository: repo,
    auditLog: audit,
    pdfArchive: archive,
    pdfRenderer: renderer,
    pdfMerger: new FakePdfMerger(),
    versioner,
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator(),
    logger: noopLogger,
  });
  return { service, repo, audit, archive, renderer, versioner };
}

describe('ApplicationService.create', () => {
  it('Create_MinimalInput_PersistsWithDefaultsAndCommit', async () => {
    const { service, repo, audit } = makeService();
    const app = await service.create(createApplicationSchema.parse({ company: 'Aurora' }));

    expect(app).toMatchObject({
      id: 'id1',
      date: '2026-06-25',
      company: 'Aurora',
      status: 'sent',
      pdfPath: null,
      commit: 'abc1234',
      createdAt: '2026-06-25T10:00:00.000Z',
    });
    expect(await repo.list()).toHaveLength(1);
    expect(audit.events.map((e) => e.action)).toEqual(['create', 'commit']);
  });

  it('Create_WithPdf_ArchivesAndStoresPath', async () => {
    const { service, archive } = makeService();
    const app = await service.create(
      createApplicationSchema.parse({
        company: 'Aurora',
        pdfBase64: Buffer.from('hi').toString('base64'),
      }),
    );
    expect(archive.saved).toHaveLength(1);
    expect(app.pdfPath).toBe('bewerbungen/2026-06-25_aurora_id1.pdf');
  });

  it('Create_AddressParts_AreComposed', async () => {
    const { service } = makeService();
    const app = await service.create(
      createApplicationSchema.parse({
        company: 'Aurora',
        contactName: 'Jane',
        postalCodeCity: '10115 Berlin',
      }),
    );
    expect(app.address).toBe('Jane, 10115 Berlin');
  });

  it('Create_VersionerReturnsNull_OmitsCommit', async () => {
    const { service, audit } = makeService(new FakeVersioner(null));
    const app = await service.create(createApplicationSchema.parse({ company: 'Aurora' }));
    expect(app.commit).toBeUndefined();
    expect(audit.events.map((e) => e.action)).toEqual(['create']);
  });
});

describe('ApplicationService.build', () => {
  it('Build_NoAttachments_MergesLetterAndCv', async () => {
    const { service, renderer } = makeService();
    const { application, pdfBase64 } = await service.build(
      buildApplicationSchema.parse({ company: 'Aurora', position: 'Engineer', language: 'en' }),
    );
    expect(renderer.lastCoverLetter).toMatchObject({ company: 'Aurora', position: 'Engineer' });
    expect(Buffer.from(pdfBase64, 'base64').toString()).toBe('lettercv');
    expect(application.pdfPath).toBe('bewerbungen/2026-06-25_aurora_id1.pdf');
  });

  it('Build_WithAttachments_AreAppendedToMerge', async () => {
    const { service } = makeService();
    const { pdfBase64 } = await service.build(
      buildApplicationSchema.parse({
        company: 'Aurora',
        attachments: [{ name: 'cert', base64: Buffer.from('X').toString('base64') }],
      }),
    );
    expect(Buffer.from(pdfBase64, 'base64').toString()).toBe('lettercvX');
  });
});

describe('ApplicationService.update', () => {
  it('Update_ChangedField_PersistsAndAuditsAndVersions', async () => {
    const { service, versioner, audit } = makeService();
    const created = await service.create(createApplicationSchema.parse({ company: 'Aurora' }));
    versioner.calls.length = 0;
    audit.events.length = 0;

    const updated = await service.update(
      created.id,
      updateApplicationSchema.parse({ status: 'interview' }),
    );

    expect(updated.status).toBe('interview');
    expect(updated.updatedAt).toBe('2026-06-25T10:00:00.000Z');
    expect(audit.events.map((e) => e.action)).toEqual(['update', 'commit']);
    expect(versioner.calls).toHaveLength(1);
  });

  it('Update_NoEffectiveChange_IsNoOp', async () => {
    const { service, versioner } = makeService();
    const created = await service.create(
      createApplicationSchema.parse({ company: 'Aurora', status: 'sent' }),
    );
    versioner.calls.length = 0;

    const result = await service.update(
      created.id,
      updateApplicationSchema.parse({ status: 'sent' }),
    );

    expect(result.updatedAt).toBeUndefined();
    expect(versioner.calls).toHaveLength(0);
  });

  it('Update_VersionerReturnsNull_OmitsCommitAudit', async () => {
    const { service, audit } = makeService(new FakeVersioner(null));
    const created = await service.create(createApplicationSchema.parse({ company: 'Aurora' }));
    audit.events.length = 0;
    await service.update(created.id, updateApplicationSchema.parse({ status: 'interview' }));
    expect(audit.events.map((e) => e.action)).toEqual(['update']);
  });

  it('Update_UnknownId_ThrowsNotFound', async () => {
    const { service } = makeService();
    await expect(
      service.update('nope', updateApplicationSchema.parse({ status: 'hired' })),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ApplicationService reads', () => {
  it('ListAndHistory_DelegateToPorts', async () => {
    const { service } = makeService();
    await service.create(createApplicationSchema.parse({ company: 'Aurora' }));
    expect(await service.list()).toHaveLength(1);
    expect((await service.history()).length).toBeGreaterThan(0);
  });
});

describe('slug', () => {
  it.each([
    ['Müller & Co', 'mueller-co'],
    ['  Aurora  ', 'aurora'],
    ['', 'application'],
    ['Öko Groß GmbH', 'oeko-gross-gmbh'],
  ])('Slug_%s_IsAsciiSafe', (input, expected) => {
    expect(slug(input)).toBe(expected);
  });
});
