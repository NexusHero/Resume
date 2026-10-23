import 'reflect-metadata';
import request from 'supertest';
import type { Server } from 'http';
import { loadConfig } from '../../src/config.js';
import { makeNestApp, closeNestApps } from '../support/nest-app.js';
import { FakeLlmProvider } from '../support/fakes.js';
import { TEXT_IMPORT_ROUTES } from '../support/route-inventory.js';

/**
 * T01–T03: the CV import works without a central key as the named text mode
 * ("Text übernehmen (ohne KI)") — it never answers 503 and never invents
 * structure — while a configured key parses with AI and a failure is a 502
 * without falling back to text.
 */
const pdf = (label: string) => Buffer.from(`%PDF-1.4 ${label}`).toString('base64');

async function appWith(
  opts: { available?: boolean; pdfText?: string | Error; plan?: 'free' | 'pro' } = {},
) {
  const provider = new FakeLlmProvider(
    'claude',
    opts.available ?? false,
    JSON.stringify({ contact: { name: 'Ada Lovelace' }, resume: { summary: 'Senior Engineer.' } }),
  );
  const app = await makeNestApp(loadConfig(opts.plan ? { PLAN: opts.plan } : {}), {
    vermittlung: true,
    llmProviders: [provider],
    ...(opts.pdfText !== undefined ? { pdfText: opts.pdfText } : {}),
  });
  const agent = request.agent(app);
  await agent
    .post('/api/v1/auth/register')
    .send({ email: 'import@phase0.test', password: 'correct-horse-battery' });
  return { app, agent, provider };
}

async function talentId(app: Server): Promise<string> {
  const agent = request.agent(app);
  await agent
    .post('/api/v1/auth/register')
    .send({ email: `t${Math.random()}@phase0.test`, password: 'correct-horse-battery' });
  const created = await agent.post('/api/v1/talents').send({ name: 'Max Beispiel' });
  return created.body.talent.id as string;
}

describe('Text import mode (T01–T03)', () => {
  afterEach(async () => {
    await closeNestApps();
  });

  it('ImportRoute_NoKey_ReturnsTextModeWithoutProvider (T01 POST /talents/:id/documents/parse)', async () => {
    const { app, agent } = await appWith();
    const id = await talentId(app);
    const text = 'Berufserfahrung. '.repeat(300);
    const res = await agent.post(`/api/v1/talents/${id}/documents/parse`).send({ text });
    expect(res.status).toBe(200);
    expect(res.body.parsed.mode).toBe('text');
    expect(res.body.parsed.provider).toBeUndefined();
    expect(res.body.parsed.usage).toBeUndefined();
    expect(res.body.parsed.resume.rawText).toHaveLength(text.trim().length);
    expect(res.body.parsed.resume.summary).toBe('');
  });

  it('ImportRoute_NoKey_DoesNotReturn503 (T02 POST /talents/:id/documents/parse-pdf)', async () => {
    const { app, agent } = await appWith();
    const id = await talentId(app);
    const res = await agent
      .post(`/api/v1/talents/${id}/documents/parse-pdf`)
      .send({ dataBase64: pdf('text') });
    expect(res.status).not.toBe(503);
    expect(res.status).toBe(200);
    expect(res.body.parsed.mode).toBe('text');
  });

  it('ImportRoute_NoKey_TextImportStoresRawTextAndBulkAttachment (T03 POST /talents/import)', async () => {
    const { agent } = await appWith();
    const res = await agent.post('/api/v1/talents/import').send({
      items: [
        { dataBase64: pdf('a'), filename: 'ada_lovelace.pdf' },
        { dataBase64: pdf('b'), filename: 'grace_hopper.pdf' },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.results.every((r: { mode?: string }) => r.mode === 'text')).toBe(true);
    expect(res.body.results[0]).toMatchObject({ mode: 'text', name: 'Ada Lovelace' });
    expect(res.body.results[0].attachmentId).toBeTruthy();
    expect(res.body.results[0].provider).toBeUndefined();
    const docs = await agent.get(`/api/v1/talents/${res.body.results[0].talentId}/documents`);
    expect(docs.body.documents.resume.rawText).toContain('Extracted CV text');
    const attachments = await agent.get(
      `/api/v1/talents/${res.body.results[0].talentId}/attachments`,
    );
    expect(attachments.body).toHaveLength(1);
  });

  it('ImportRoute_WithKey_ReturnsAiModeWithProviderAndUsage (T01/T03)', async () => {
    const { app, agent } = await appWith({ available: true });
    const id = await talentId(app);
    const parse = await agent
      .post(`/api/v1/talents/${id}/documents/parse`)
      .send({ text: 'Ada Lovelace — Engineer' });
    expect(parse.status).toBe(200);
    expect(parse.body.parsed).toMatchObject({ mode: 'ai', provider: 'claude' });
    expect(parse.body.parsed.usage).toBeDefined();

    const bulk = await agent
      .post('/api/v1/talents/import')
      .send({ items: [{ dataBase64: pdf('a'), filename: 'ada.pdf' }] });
    expect(bulk.body.results[0]).toMatchObject({ mode: 'ai', provider: 'claude' });
  });

  it('ImportRoute_WithKeyProviderFails_Returns502AndDoesNotDowngrade (T02)', async () => {
    const { app, agent, provider } = await appWith({ available: true });
    provider.failWith = new Error('upstream down');
    const id = await talentId(app);
    const res = await agent
      .post(`/api/v1/talents/${id}/documents/parse-pdf`)
      .send({ dataBase64: pdf('text') });
    expect(res.status).toBe(502);
    expect(res.body.type).toBe('about:blank#upstream-provider');
    expect(res.body.parsed).toBeUndefined();
  });

  it('ParsePdf_ScannedPdfWithoutTextLayer_Returns422NoTextLayer (T02 both modes)', async () => {
    for (const available of [false, true]) {
      const { app, agent } = await appWith({ available, pdfText: 'short' });
      const id = await talentId(app);
      const res = await agent
        .post(`/api/v1/talents/${id}/documents/parse-pdf`)
        .send({ dataBase64: pdf('scan') });
      expect(res.status).toBe(422);
      expect(res.body.type).toBe('about:blank#no-text-layer');
    }
  });

  it('TalentImport_ScannedPdfAmongOthers_ReportsNoTextLayerForThatFileOnly', async () => {
    const { agent } = await appWith({ pdfText: 'short' });
    const res = await agent.post('/api/v1/talents/import').send({
      items: [{ dataBase64: pdf('a'), filename: 'scan.pdf' }],
    });
    expect(res.body.results[0]).toMatchObject({ ok: false, error: 'no-text-layer' });
  });

  it('ParseNoKey_LongCv_ReturnsFullTextNotTruncatedTo600Characters', async () => {
    const { app, agent } = await appWith();
    const id = await talentId(app);
    const text = 'x'.repeat(5_000);
    const res = await agent.post(`/api/v1/talents/${id}/documents/parse`).send({ text });
    expect(res.body.parsed.resume.rawText).toHaveLength(5_000);
  });

  it('CvImport_RawTextOverLimit_IsTruncatedNotRejected', async () => {
    // A CV longer than the 50k cap is truncated server-side (and flagged), not
    // rejected with a 400.
    const { app, agent } = await appWith();
    const id = await talentId(app);
    const text = 'x'.repeat(60_000);
    const res = await agent.post(`/api/v1/talents/${id}/documents/parse`).send({ text });
    expect(res.status).toBe(200);
    expect(res.body.parsed.mode).toBe('text');
    expect(res.body.parsed.resume.rawText).toHaveLength(50_000);
    expect(res.body.parsed.truncated).toBe(true);
  });

  it('ParsePdfNoKey_DoesNotStoreAnAttachment (T02)', async () => {
    const { app, agent } = await appWith();
    const id = await talentId(app);
    await agent.post(`/api/v1/talents/${id}/documents/parse-pdf`).send({ dataBase64: pdf('text') });
    const attachments = await agent.get(`/api/v1/talents/${id}/attachments`);
    expect(attachments.body).toEqual([]);
  });

  it('ImportRoute_NoLogin_Returns401 (Tnn …)', async () => {
    const { app } = await appWith();
    const id = await talentId(app);
    for (const route of TEXT_IMPORT_ROUTES) {
      const path = route.path.replace(':id', id);
      const res = await request(app).post(path).send({ text: 'cv', items: [] });
      expect(res.status).toBe(401);
    }
  });

  it('ImportRoute_FreePlan_Returns402 (Tnn …)', async () => {
    const { app, agent } = await appWith({ plan: 'free' });
    const id = await talentId(app);
    for (const route of TEXT_IMPORT_ROUTES) {
      const path = route.path.replace(':id', id);
      const body =
        route.id === 'T01'
          ? { text: 'cv' }
          : route.id === 'T02'
            ? { dataBase64: pdf('a') }
            : { items: [{ dataBase64: pdf('a'), filename: 'a.pdf' }] };
      const res = await agent.post(path).send(body);
      expect(res.status).toBe(402);
    }
  });
});
