import 'reflect-metadata';
import AdmZip from 'adm-zip';
import request from 'supertest';
import { loadConfig } from '../../src/config.js';
import { makeNestApp, closeNestApps } from '../support/nest-app.js';
import {
  FakeLlmProvider,
  FakePdfRenderer,
  InMemoryAttachmentStore,
  InMemoryJobApplicationRepository,
} from '../support/fakes.js';

const LETTER_REPLY =
  '{"paragraphs":["I am writing to apply to Acme Corp for the Senior Engineer role. ' +
  'My background in distributed systems and Kubernetes matches your posting."]}';

describe('JobApplications API (AK-2.1/2.2/2.3/2.4/2.5)', () => {
  afterEach(async () => {
    await closeNestApps();
  });

  const register = async (agent: ReturnType<typeof request.agent>, email: string) => {
    await agent.post('/api/v1/auth/register').send({ email, password: 'correct-horse-battery' });
  };

  const seedTalent = async (agent: ReturnType<typeof request.agent>, name = 'Ada Lovelace') =>
    (await agent.post('/api/v1/talents').send({ name })).body.talent;

  const seedPosting = async (
    agent: ReturnType<typeof request.agent>,
    over: Record<string, unknown> = {},
  ) =>
    (
      await agent.post('/api/v1/job-postings').send({
        source: 'text',
        company: 'Acme Corp',
        title: 'Senior Engineer',
        description: 'We need distributed systems and Kubernetes experience.',
        ...over,
      })
    ).body.jobPosting;

  const seedApplication = async (
    agent: ReturnType<typeof request.agent>,
    jobPostingId: string,
    talentId: string,
  ) =>
    (await agent.post('/api/v1/job-applications').send({ jobPostingId, talentId })).body
      .jobApplication;

  it('JobApplications_NoLogin_Returns401', async () => {
    const app = await makeNestApp();
    const req = request(app);
    const cases: Array<{ method: 'get' | 'post' | 'put' | 'delete'; path: string; body?: object }> =
      [
        { method: 'get', path: '/api/v1/job-applications' },
        { method: 'get', path: '/api/v1/job-applications/id1' },
        { method: 'post', path: '/api/v1/job-applications', body: {} },
        { method: 'get', path: '/api/v1/job-applications/id1/documents' },
        { method: 'put', path: '/api/v1/job-applications/id1/documents', body: {} },
        { method: 'put', path: '/api/v1/job-applications/id1/attachments', body: {} },
        { method: 'get', path: '/api/v1/job-applications/id1/dossier/pdf' },
        { method: 'get', path: '/api/v1/job-applications/id1/dossier/zip' },
        { method: 'post', path: '/api/v1/job-applications/id1/letter' },
        { method: 'post', path: '/api/v1/job-applications/id1/status', body: {} },
        { method: 'delete', path: '/api/v1/job-applications/id1' },
      ];
    for (const c of cases) {
      const res = await req[c.method](c.path).send(c.body);
      expect(`${c.method} ${c.path}`).toBe(`${c.method} ${c.path}`);
      expect(res.status).toBe(401);
    }
  });

  it('Create_ValidPostingAndTalent_CreatesCopyAndListsIt', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'create@phase2.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);

    const created = await agent
      .post('/api/v1/job-applications')
      .send({ jobPostingId: posting.id, talentId: talent.id });
    expect(created.status).toBe(201);
    expect(created.body.alreadyExisting).toBe(false);
    expect(created.body.jobApplication.status).toBe('draft');
    expect(created.body.jobApplication.documents.resume).toBeDefined();
    expect(created.body.jobApplication.documents.resume.rawText).toBe('');

    const list = await agent.get('/api/v1/job-applications');
    expect(list.status).toBe(200);
    expect(list.body.map((a: { id: string }) => a.id)).toContain(created.body.jobApplication.id);
  });

  it('Create_SnapshotsPostingCompanyAndTitle', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'snapshot@phase2.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent, { company: 'Snap Corp', title: 'Staff Engineer' });

    const created = await agent
      .post('/api/v1/job-applications')
      .send({ jobPostingId: posting.id, talentId: talent.id });
    expect(created.body.jobApplication.postingCompany).toBe('Snap Corp');
    expect(created.body.jobApplication.postingTitle).toBe('Staff Engineer');
  });

  it('Create_DuplicatePostingTalent_ReturnsAlreadyExisting', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'dup@phase2.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);

    const first = await agent
      .post('/api/v1/job-applications')
      .send({ jobPostingId: posting.id, talentId: talent.id });
    const second = await agent
      .post('/api/v1/job-applications')
      .send({ jobPostingId: posting.id, talentId: talent.id });
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.alreadyExisting).toBe(true);
    expect(second.body.jobApplication.id).toBe(first.body.jobApplication.id);
  });

  it('Create_UnknownPosting_Returns404', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'nopost@phase2.test');
    const talent = await seedTalent(agent);
    const res = await agent
      .post('/api/v1/job-applications')
      .send({ jobPostingId: 'nope', talentId: talent.id });
    expect(res.status).toBe(404);
    expect(res.body.type).toBe('about:blank#not-found');
  });

  it('Create_UnknownTalent_Returns404', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'notalent@phase2.test');
    const posting = await seedPosting(agent);
    const res = await agent
      .post('/api/v1/job-applications')
      .send({ jobPostingId: posting.id, talentId: 'nope' });
    expect(res.status).toBe(404);
    expect(res.body.type).toBe('about:blank#not-found');
  });

  it('Create_TwoApplicationsSameTalent_IndependentDocuments', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'independent@phase2.test');
    const talent = await seedTalent(agent);
    const postingA = await seedPosting(agent);
    const postingB = await seedPosting(agent, { company: 'Other', title: 'Other role' });

    const a1 = await seedApplication(agent, postingA.id, talent.id);
    const a2 = await seedApplication(agent, postingB.id, talent.id);
    expect(a1.documents).not.toBe(a2.documents);

    const put = await agent.put(`/api/v1/job-applications/${a1.id}/documents`).send({
      contact: a1.documents.contact,
      resume: { ...a1.documents.resume, summary: 'Changed summary' },
      letter: a1.documents.letter,
      style: a1.documents.style,
    });
    expect(put.status).toBe(200);

    const a2after = await agent.get(`/api/v1/job-applications/${a2.id}`);
    expect(a2after.body.jobApplication.documents.resume.summary).not.toBe('Changed summary');
  });

  it('PutDocuments_StripsRawTextAndTranslations', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'strip@phase2.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const put = await agent.put(`/api/v1/job-applications/${application.id}/documents`).send({
      contact: application.documents.contact,
      resume: { ...application.documents.resume, rawText: 'INJECTED' },
      letter: application.documents.letter,
      style: application.documents.style,
    });
    expect(put.status).toBe(200);
    expect(put.body.documents.resume.rawText).toBe('');
    expect(put.body.documents.translations).toBeUndefined();
  });

  it('ChangeStatus_AppendsHistoryWithTimestamp', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'status@phase2.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const res = await agent
      .post(`/api/v1/job-applications/${application.id}/status`)
      .send({ status: 'sent' });
    expect(res.status).toBe(200);
    expect(res.body.jobApplication.status).toBe('sent');
    expect(res.body.jobApplication.statusHistory).toHaveLength(2);
    expect(res.body.jobApplication.statusHistory[1].status).toBe('sent');
    expect(res.body.jobApplication.statusHistory[1].at).toBeTruthy();
  });

  it('Delete_RemovesApplication_SubsequentGet404s', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'del@phase2.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    expect((await agent.delete(`/api/v1/job-applications/${application.id}`)).status).toBe(204);
    expect((await agent.get(`/api/v1/job-applications/${application.id}`)).status).toBe(404);
  });

  it('DeletePosting_ThenListAndGet_ApplicationStillIntact', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'deletedpost@phase2.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    await agent.delete(`/api/v1/job-postings/${posting.id}`);

    const get = await agent.get(`/api/v1/job-applications/${application.id}`);
    expect(get.status).toBe(200);
    expect(get.body.jobApplication.postingCompany).toBe('Acme Corp');
    expect(get.body.jobApplication.postingTitle).toBe('Senior Engineer');
    expect(get.body.jobApplication.documents).toBeDefined();
    const list = await agent.get('/api/v1/job-applications');
    expect(list.body.map((a: { id: string }) => a.id)).toContain(application.id);
  });

  it('Letter_NoKey_Returns503AiNotConfigured', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'nokey@phase2.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const res = await agent.post(`/api/v1/job-applications/${application.id}/letter`);
    expect(res.status).toBe(503);
    expect(res.body.type).toBe('about:blank#ai-not-configured');
  });

  it('Letter_NoPlanGuard_WorksForNonProUser', async () => {
    const app = await makeNestApp(loadConfig({ PLAN: 'free' }), {
      llmProviders: [new FakeLlmProvider('claude', true, LETTER_REPLY)],
    });
    const agent = request.agent(app);
    await register(agent, 'noplan@phase2.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const res = await agent.post(`/api/v1/job-applications/${application.id}/letter`);
    expect(res.status).toBe(200);
    expect(res.body.letter.paragraphs.length).toBeGreaterThan(0);
  });

  it('Letter_FakeProvider_ReturnsParagraphsAndChecks', async () => {
    const app = await makeNestApp(loadConfig({}), {
      llmProviders: [new FakeLlmProvider('claude', true, LETTER_REPLY)],
    });
    const agent = request.agent(app);
    await register(agent, 'letter@phase2.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const res = await agent.post(`/api/v1/job-applications/${application.id}/letter`);
    expect(res.status).toBe(200);
    expect(res.body.letter.paragraphs).toHaveLength(1);
    expect(res.body.letter.provider).toBe('claude');
    expect(res.body.letter.grounding).toBeDefined();
    expect(res.body.letter.checks).toMatchObject({ mentionsCompany: true, mentionsTitle: true });
  });

  it('Letter_UsesSnapshotWhenPostingDeleted', async () => {
    const provider = new FakeLlmProvider('claude', true, LETTER_REPLY);
    const app = await makeNestApp(loadConfig({}), { llmProviders: [provider] });
    const agent = request.agent(app);
    await register(agent, 'snapshotletter@phase2.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    await agent.delete(`/api/v1/job-postings/${posting.id}`);

    const res = await agent.post(`/api/v1/job-applications/${application.id}/letter`);
    expect(res.status).toBe(200);
    // The ad text is now empty → references is an honest 0, no 500.
    expect(res.body.letter.checks.references).toBe(0);
    // Company/title still come from the snapshots, so the check still passes.
    expect(res.body.letter.checks.mentionsCompany).toBe(true);
    expect(res.body.letter.checks.mentionsTitle).toBe(true);
  });

  it('Letter_ProviderGarbage_Returns502', async () => {
    const app = await makeNestApp(loadConfig({}), {
      llmProviders: [new FakeLlmProvider('claude', true, 'not json at all')],
    });
    const agent = request.agent(app);
    await register(agent, 'garbageletter@phase2.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const res = await agent.post(`/api/v1/job-applications/${application.id}/letter`);
    expect(res.status).toBe(502);
    expect(res.body.type).toBe('about:blank#upstream-provider');
  });

  it('JobApplications_VermittlungOff_StillVisible', async () => {
    const app = await makeNestApp(loadConfig({}), { vermittlung: false });
    const agent = request.agent(app);
    await register(agent, 'visible@phase2.test');
    expect((await agent.get('/api/v1/job-applications')).status).toBe(200);
  });

  it('JobApplications_VermittlungOff_DossierAndAttachmentsReachable', async () => {
    // No VermittlungGuard on B09–B11 (the Bewerbung is the main path, ADR-0059).
    const app = await makeNestApp(loadConfig({}), { vermittlung: false });
    const agent = request.agent(app);
    await register(agent, 'vermittlung-off@phase4.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);
    expect((await agent.get(`/api/v1/job-applications/${application.id}/dossier/pdf`)).status).toBe(
      200,
    );
    expect(
      (
        await agent
          .put(`/api/v1/job-applications/${application.id}/attachments`)
          .send({ attachmentIds: [] })
      ).status,
    ).toBe(200);
  });

  it('JobApplications_TwoWorkspaces_AreIsolated', async () => {
    const app = await makeNestApp(loadConfig({ SELF_SERVE_TENANTS: 'true' }));
    const a = request.agent(app);
    const b = request.agent(app);
    await register(a, 'ws-a@phase2.test');
    await register(b, 'ws-b@phase2.test');

    const talentA = await seedTalent(a);
    const postingA = await seedPosting(a);
    const created = await a
      .post('/api/v1/job-applications')
      .send({ jobPostingId: postingA.id, talentId: talentA.id });

    expect(
      (await a.get('/api/v1/job-applications')).body.map((x: { id: string }) => x.id),
    ).toContain(created.body.jobApplication.id);
    expect(
      (await b.get('/api/v1/job-applications')).body.map((x: { id: string }) => x.id),
    ).not.toContain(created.body.jobApplication.id);
  });

  it('JobApplications_ForeignId_GetPutDeleteLetterStatus_Return404', async () => {
    const app = await makeNestApp(loadConfig({ SELF_SERVE_TENANTS: 'true' }), {
      llmProviders: [new FakeLlmProvider('claude', true, LETTER_REPLY)],
    });
    const a = request.agent(app);
    const b = request.agent(app);
    await register(a, 'foreign-a@phase2.test');
    await register(b, 'foreign-b@phase2.test');

    const talentA = await seedTalent(a);
    const postingA = await seedPosting(a);
    const created = await a
      .post('/api/v1/job-applications')
      .send({ jobPostingId: postingA.id, talentId: talentA.id });
    const id = created.body.jobApplication.id;
    const docs = created.body.jobApplication.documents;

    expect((await b.get(`/api/v1/job-applications/${id}`)).status).toBe(404);
    expect((await b.get(`/api/v1/job-applications/${id}/documents`)).status).toBe(404);
    expect(
      (
        await b.put(`/api/v1/job-applications/${id}/documents`).send({
          contact: docs.contact,
          resume: docs.resume,
          letter: docs.letter,
          style: docs.style,
        })
      ).status,
    ).toBe(404);
    expect(
      (await b.post(`/api/v1/job-applications/${id}/status`).send({ status: 'sent' })).status,
    ).toBe(404);
    expect((await b.post(`/api/v1/job-applications/${id}/letter`)).status).toBe(404);
    expect((await b.delete(`/api/v1/job-applications/${id}`)).status).toBe(404);
  });

  it('JobApplications_TwoWorkspaces_DossierAndAttachmentsAreIsolated', async () => {
    const app = await makeNestApp(loadConfig({ SELF_SERVE_TENANTS: 'true' }));
    const a = request.agent(app);
    const b = request.agent(app);
    await register(a, 'iso-a@phase4.test');
    await register(b, 'iso-b@phase4.test');

    const talentA = await seedTalent(a);
    const postingA = await seedPosting(a);
    const created = await a
      .post('/api/v1/job-applications')
      .send({ jobPostingId: postingA.id, talentId: talentA.id });
    const id = created.body.jobApplication.id;

    expect((await b.get(`/api/v1/job-applications/${id}/dossier/pdf`)).status).toBe(404);
    expect((await b.get(`/api/v1/job-applications/${id}/dossier/zip`)).status).toBe(404);
    expect(
      (await b.put(`/api/v1/job-applications/${id}/attachments`).send({ attachmentIds: [] }))
        .status,
    ).toBe(404);
  });

  const seedPdfAttachment = async (agent: ReturnType<typeof request.agent>, talentId: string) =>
    (
      await agent.post(`/api/v1/talents/${talentId}/attachments`).send({
        name: 'Zeugnis.pdf',
        contentType: 'application/pdf',
        dataBase64: Buffer.from('%PDF-1.4 zeugnis').toString('base64'),
      })
    ).body.attachment;

  const seedNonPdfAttachment = async (agent: ReturnType<typeof request.agent>, talentId: string) =>
    (
      await agent.post(`/api/v1/talents/${talentId}/attachments`).send({
        name: 'portrait.png',
        contentType: 'image/png',
        dataBase64: Buffer.from('PNG-bytes').toString('base64'),
      })
    ).body.attachment;

  it('UpdateAttachments_SelectsPdfAttachment_ReturnsUpdatedApplication', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'attachments@phase4.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);
    const att = await seedPdfAttachment(agent, talent.id);

    const res = await agent
      .put(`/api/v1/job-applications/${application.id}/attachments`)
      .send({ attachmentIds: [att.id] });
    expect(res.status).toBe(200);
    expect(res.body.jobApplication.selectedAttachmentIds).toEqual([att.id]);
  });

  it('UpdateAttachments_ForeignTalentAttachment_Returns404', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'foreign-att@phase4.test');
    const talent = await seedTalent(agent);
    const otherTalent = await seedTalent(agent, 'Grace Hopper');
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);
    const foreign = await seedPdfAttachment(agent, otherTalent.id);

    const res = await agent
      .put(`/api/v1/job-applications/${application.id}/attachments`)
      .send({ attachmentIds: [foreign.id] });
    expect(res.status).toBe(404);
  });

  it('UpdateAttachments_NonPdfAttachment_Returns400', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'nonpdf@phase4.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);
    const png = await seedNonPdfAttachment(agent, talent.id);

    const res = await agent
      .put(`/api/v1/job-applications/${application.id}/attachments`)
      .send({ attachmentIds: [png.id] });
    expect(res.status).toBe(400);
    expect(res.body.type).toBe('about:blank#validation-error');
  });

  it('SaveDocuments_Frozen_Returns409_AndUnfreezeAppendsHistory', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'frozen-docs@phase4.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    await agent.post(`/api/v1/job-applications/${application.id}/status`).send({ status: 'sent' });
    const docs = application.documents;

    const frozen = await agent
      .put(`/api/v1/job-applications/${application.id}/documents`)
      .send({ contact: docs.contact, resume: docs.resume, letter: docs.letter, style: docs.style });
    expect(frozen.status).toBe(409);
    expect(frozen.body.type).toBe('about:blank#frozen');

    const unfrozen = await agent
      .put(`/api/v1/job-applications/${application.id}/documents?unfreeze=1`)
      .send({ contact: docs.contact, resume: docs.resume, letter: docs.letter, style: docs.style });
    expect(unfrozen.status).toBe(200);

    const after = await agent.get(`/api/v1/job-applications/${application.id}`);
    const history = after.body.jobApplication.statusHistory;
    expect(history[history.length - 1].note).toBe('Dokumente nach Einfrieren geändert');
  });

  it('UpdateAttachments_Frozen_Returns409_AndUnfreezeAppendsHistory', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'frozen-att@phase4.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);
    const att = await seedPdfAttachment(agent, talent.id);

    await agent.post(`/api/v1/job-applications/${application.id}/status`).send({ status: 'sent' });

    const frozen = await agent
      .put(`/api/v1/job-applications/${application.id}/attachments`)
      .send({ attachmentIds: [att.id] });
    expect(frozen.status).toBe(409);

    const unfrozen = await agent
      .put(`/api/v1/job-applications/${application.id}/attachments?unfreeze=1`)
      .send({ attachmentIds: [att.id] });
    expect(unfrozen.status).toBe(200);
    expect(unfrozen.body.jobApplication.selectedAttachmentIds).toEqual([att.id]);
    expect(
      unfrozen.body.jobApplication.statusHistory[
        unfrozen.body.jobApplication.statusHistory.length - 1
      ].note,
    ).toBeTruthy();
  });

  it('List_FilterByStatus_ReturnsOnlyThatStatus', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'filter@phase4.test');
    const talent = await seedTalent(agent);
    const postingA = await seedPosting(agent);
    const postingB = await seedPosting(agent, { company: 'Other', title: 'Other role' });
    const a1 = await seedApplication(agent, postingA.id, talent.id);
    await seedApplication(agent, postingB.id, talent.id);
    await agent.post(`/api/v1/job-applications/${a1.id}/status`).send({ status: 'sent' });

    const sent = await agent.get('/api/v1/job-applications?status=sent');
    expect(sent.status).toBe(200);
    expect(sent.body.map((x: { id: string }) => x.id)).toEqual([a1.id]);

    const invalid = await agent.get('/api/v1/job-applications?status=nope');
    expect(invalid.status).toBe(400);
  });

  it('DossierPdf_ReturnsPdfWithFilename', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'dossier-pdf@phase4.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const res = await agent.get(`/api/v1/job-applications/${application.id}/dossier/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('Bewerbung_Ada_Lovelace_Acme_Corp.pdf');
  });

  it('DossierPdf_EmptyFirma_FallsBackToPostingCompany', async () => {
    const renderer = new FakePdfRenderer();
    const app = await makeNestApp(loadConfig({}), { pdfRenderer: renderer });
    const agent = request.agent(app);
    await register(agent, 'fallback@phase4.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    await agent.get(`/api/v1/job-applications/${application.id}/dossier/pdf`);
    // Empty letter.firma → postingCompany is used as the recipient in the header.
    expect(renderer.lastHtml).toContain('Acme Corp');
  });

  it('DossierPdf_NonEmptyFirma_LeavesLetterUntouched', async () => {
    const renderer = new FakePdfRenderer();
    const app = await makeNestApp(loadConfig({}), { pdfRenderer: renderer });
    const agent = request.agent(app);
    await register(agent, 'firma-set@phase4.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    await agent.put(`/api/v1/job-applications/${application.id}/documents`).send({
      contact: application.documents.contact,
      resume: application.documents.resume,
      letter: { ...application.documents.letter, firma: 'Custom GmbH' },
      style: application.documents.style,
    });

    await agent.get(`/api/v1/job-applications/${application.id}/dossier/pdf`);
    // A non-empty firma is authoritative — postingCompany must not leak in.
    expect(renderer.lastHtml).toContain('Custom GmbH');
    expect(renderer.lastHtml).not.toContain('Acme Corp');
  });

  it('DossierZip_ReturnsZipWithFilenameAndMergedPdf', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'dossier-zip@phase4.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);
    const att = await seedPdfAttachment(agent, talent.id);
    await agent
      .put(`/api/v1/job-applications/${application.id}/attachments`)
      .send({ attachmentIds: [att.id] });

    const res = await agent
      .get(`/api/v1/job-applications/${application.id}/dossier/zip`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
    expect(res.headers['content-disposition']).toContain('Bewerbung_Ada_Lovelace_Acme_Corp.zip');
    const zip = new AdmZip(res.body as Buffer);
    const names = zip.getEntries().map((e) => e.entryName);
    expect(names).toEqual(['Bewerbung.pdf', 'Zeugnis.pdf']);
  });

  it('DossierZip_NoContentLength_StreamsChunked', async () => {
    const app = await makeNestApp();
    const agent = request.agent(app);
    await register(agent, 'zip-chunked@phase4.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    const res = await agent.get(`/api/v1/job-applications/${application.id}/dossier/zip`);
    expect(res.status).toBe(200);
    expect(res.headers['content-length']).toBeUndefined();
    expect(res.headers['transfer-encoding']).toContain('chunked');
  });

  it('DossierPdf_ForeignAttachment_Returns404', async () => {
    const repo = new InMemoryJobApplicationRepository();
    const store = new InMemoryAttachmentStore();
    const app = await makeNestApp(loadConfig({}), {
      jobApplicationRepository: repo,
      attachmentStore: store,
    });
    const agent = request.agent(app);
    await register(agent, 'dossier-foreign@phase4.test');
    const talent = await seedTalent(agent);
    const posting = await seedPosting(agent);
    const application = await seedApplication(agent, posting.id, talent.id);

    // A selected attachment id that belongs to another talent (foreign) → 404.
    await store.add(
      {
        id: 'foreign',
        ownerId: 'team',
        talentId: 'someone-else',
        name: 'foreign.pdf',
        contentType: 'application/pdf',
        size: 5,
        createdAt: '2026-06-25T10:00:00.000Z',
      },
      Buffer.from('%PDF-'),
    );
    const seeded = repo.applications.find((a) => a.id === application.id);
    if (seeded) seeded.selectedAttachmentIds = ['foreign'];

    const res = await agent.get(`/api/v1/job-applications/${application.id}/dossier/pdf`);
    expect(res.status).toBe(404);
  });
});
