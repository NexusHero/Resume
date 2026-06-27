import request from 'supertest';
import type { Express } from 'express';
import { loadConfig } from '../../src/config';
import { createApp } from '../../src/http/create-app';
import { ApplicationController } from '../../src/http/application-controller';
import { JobController } from '../../src/http/job-controller';
import { ApplicationService } from '../../src/services/application-service';
import { JobSearchService } from '../../src/services/job-search-service';
import { SampleJobSource } from '../../src/adapters/sample-job-source';
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

function makeApp(): Express {
  const service = new ApplicationService({
    applicationRepository: new InMemoryApplicationRepository(),
    auditLog: new InMemoryAuditLog(),
    pdfArchive: new InMemoryPdfArchive(),
    pdfRenderer: new FakePdfRenderer(),
    pdfMerger: new FakePdfMerger(),
    versioner: new FakeVersioner(null),
    clock: new FixedClock(),
    idGenerator: new SequenceIdGenerator(),
    logger: noopLogger,
  });
  const controller = new ApplicationController({ applicationService: service });
  const config = loadConfig({});
  const jobSearchService = new JobSearchService({
    jobSource: new SampleJobSource(),
    candidateProfile: config.candidateProfile,
    logger: noopLogger,
  });
  const jobController = new JobController({ jobSearchService, config });
  return createApp({
    applicationController: controller,
    jobController,
    config,
    logger: noopLogger,
  });
}

describe('REST API /api/v1', () => {
  let app: Express;
  beforeEach(() => {
    app = makeApp();
  });

  it('Health_Get_ReturnsOk', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('Applications_GetEmpty_ReturnsArray', async () => {
    const res = await request(app).get('/api/v1/applications');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('Applications_PostValid_Creates201', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .send({ company: 'Aurora', position: 'Engineer' });
    expect(res.status).toBe(201);
    expect(res.body.application).toMatchObject({
      id: 'id1',
      company: 'Aurora',
      position: 'Engineer',
    });

    const list = await request(app).post('/api/v1/applications').send({ company: 'Second' });
    expect(list.status).toBe(201);
  });

  it('Applications_PostMissingCompany_Returns400Problem', async () => {
    const res = await request(app).post('/api/v1/applications').send({ position: 'x' });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body).toMatchObject({ title: 'Validation failed', status: 400 });
  });

  it('Applications_PatchExisting_Updates', async () => {
    const created = await request(app).post('/api/v1/applications').send({ company: 'Aurora' });
    const id = created.body.application.id;
    const res = await request(app)
      .patch(`/api/v1/applications/${id}`)
      .send({ status: 'interview' });
    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe('interview');
  });

  it('Applications_PatchUnknown_Returns404Problem', async () => {
    const res = await request(app).patch('/api/v1/applications/nope').send({ status: 'hired' });
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ status: 404, title: 'NotFoundError' });
  });

  it('Build_Post_Returns201WithPdf', async () => {
    const res = await request(app)
      .post('/api/v1/applications/build')
      .send({ company: 'Aurora', language: 'en' });
    expect(res.status).toBe(201);
    expect(res.body.application.company).toBe('Aurora');
    expect(typeof res.body.pdfBase64).toBe('string');
  });

  it('History_Get_ReturnsArray', async () => {
    await request(app).post('/api/v1/applications').send({ company: 'Aurora' });
    const res = await request(app).get('/api/v1/history');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('Api_UnknownRoute_Returns404Problem', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ title: 'Not Found' });
  });

  it('Cors_Preflight_Returns204', async () => {
    const res = await request(app).options('/api/v1/applications');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('Jobs_GetNoParams_RunsPreconfiguredSearchInTwoTiers', async () => {
    const res = await request(app).get('/api/v1/jobs');
    expect(res.status).toBe(200);
    expect(res.body.threshold).toBe(80);
    expect(Array.isArray(res.body.top)).toBe(true);
    expect(Array.isArray(res.body.more)).toBe(true);
    // every top hit is >= threshold, every "more" is below it
    expect(res.body.top.every((j: { match: number }) => j.match >= 80)).toBe(true);
    expect(res.body.more.every((j: { match: number }) => j.match < 80)).toBe(true);
    // top tier is sorted best-first and carries skill explanations
    expect(res.body.top[0]).toHaveProperty('matchedSkills');
    expect(res.body.top[0]).toHaveProperty('missingSkills');
    expect(res.body.counts.total).toBe(res.body.counts.top + res.body.counts.more);
  });

  it('Jobs_GetWithKeyword_FiltersBySearchTerm', async () => {
    const res = await request(app).get('/api/v1/jobs').query({ q: 'Rust' });
    expect(res.status).toBe(200);
    const all = [...res.body.top, ...res.body.more];
    expect(all.length).toBeGreaterThan(0);
    expect(
      all.every((j: { role: string; skills: string[] }) =>
        `${j.role} ${j.skills.join(' ')}`.toLowerCase().includes('rust'),
      ),
    ).toBe(true);
  });

  it('Jobs_GetWithThreshold_MovesBoundary', async () => {
    const res = await request(app).get('/api/v1/jobs').query({ threshold: 100 });
    expect(res.status).toBe(200);
    expect(res.body.threshold).toBe(100);
    expect(res.body.top.every((j: { match: number }) => j.match === 100)).toBe(true);
  });

  it('Static_GetRoot_ServesLauncher', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/<!DOCTYPE html>/i);
  });
});
