/* Pure-logic tests for the data layer's dashboard/report aggregates (ADR-0023).
   These need no DOM and no React — data.js publishes the helpers with
   `Object.assign(window, …)`, so the test imports the module for its side effect
   and reads the functions off `window`. This is the cheapest, highest-ROI shape
   of frontend test: deterministic domain logic with zero rendering. */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';

let computeVermittlerKpis;
let deriveReportClients;

beforeAll(async () => {
  await import('../data.js'); // side effect: Object.assign(window, { … })
  computeVermittlerKpis = window.computeVermittlerKpis;
  deriveReportClients = window.deriveReportClients;
});

describe('computeVermittlerKpis', () => {
  it('ComputeKpis_LiveRecords_CountsActiveMandatesPoolAndPlacements', () => {
    const mandates = [
      { status: 'active' },
      { status: 'active' },
      { status: 'archived' },
    ];
    const talents = [{}, {}, {}, {}];
    const placements = [{ fee: '12.000 €' }, { fee: '8000' }];

    const [active, pool, placed, fees] = computeVermittlerKpis(mandates, talents, placements);

    expect(active).toMatchObject({ label: 'Aktive Suchaufträge', value: '2' });
    expect(pool).toMatchObject({ label: 'Mandanten im Pool', value: '4' });
    expect(placed).toMatchObject({ label: 'Platzierungen', value: '2' });
    // 12000 + 8000 = 20000 → compact "20 T€"
    expect(fees).toMatchObject({ label: 'Honorar', value: '20 T€' });
  });

  it('ComputeKpis_FeesBelowOneThousand_FormatsInEuroNotThousands', () => {
    const [, , , fees] = computeVermittlerKpis([], [], [{ fee: '540 €' }]);
    expect(fees.value).toBe('540 €');
  });

  it('ComputeKpis_NullInputs_ReturnsZeroedKpisWithoutThrowing', () => {
    const kpis = computeVermittlerKpis(null, null, null);
    expect(kpis.map((k) => k.value)).toEqual(['0', '0', '0', '0 €']);
  });
});

describe('deriveReportClients', () => {
  it('DeriveClients_MandatesAndPlacements_UnionsAndDedupesByName', () => {
    const mandates = [{ client: 'Helio GmbH' }, { client: 'Aurora Systems' }];
    const placements = [{ client: 'Helio GmbH' }, { client: 'Nimbus AG' }];

    const clients = deriveReportClients(mandates, placements).map((c) => c.name);

    expect(clients).toEqual(['Helio GmbH', 'Aurora Systems', 'Nimbus AG']);
  });

  it('DeriveClients_RowsWithoutClient_AreIgnored', () => {
    const clients = deriveReportClients([{ client: '' }, {}, { client: 'Helio GmbH' }], null);
    expect(clients).toEqual([{ name: 'Helio GmbH' }]);
  });

  it('DeriveClients_NullInputs_ReturnsEmpty', () => {
    expect(deriveReportClients(null, null)).toEqual([]);
  });
});

describe('RecruitApi AI status cache', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.RecruitApi.invalidateAiStatus();
  });

  it('AiConfigured_AfterSettingsObservedStatus_RefetchesNewStatus', async () => {
    // Regression (G5): the cache was permanent, so after a server restart with a
    // key added the editor kept saying "KI nicht eingerichtet" until reload.
    let available = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ providers: [{ id: 'claude', available }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    window.RecruitApi.invalidateAiStatus();
    expect(await window.RecruitApi.aiConfigured()).toBe(false);
    available = true;
    expect(await window.RecruitApi.aiConfigured()).toBe(false); // still cached

    // The settings surface observed the new status and dropped the cache.
    window.dispatchEvent(new CustomEvent('myjob:aistatuschange'));
    expect(await window.RecruitApi.aiConfigured()).toBe(true);
  });
});

describe('CV import without a key (Fehler 1)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('DataParseDocument_NoAiKey_CallsServerWithoutRequireAi', async () => {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ parsed: { mode: 'text', resume: { rawText: 'CV' } } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }));
    window.RecruitApi.invalidateAiStatus();

    const parsed = await window.RecruitApi.parseDocument('t1', 'Mein CV');

    expect(parsed.mode).toBe('text');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('/talents/t1/documents/parse');
    expect(calls.some((u) => u.includes('/settings/llm'))).toBe(false);
  });

  it('DataParseDocumentPdf_NoAiKey_CallsServerWithoutRequireAi', async () => {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ parsed: { mode: 'text', resume: { rawText: 'PDF' } } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }));
    window.RecruitApi.invalidateAiStatus();

    const parsed = await window.RecruitApi.parseDocumentPdf('t1', 'JVBERg==');

    expect(parsed.mode).toBe('text');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('/talents/t1/documents/parse-pdf');
    expect(calls.some((u) => u.includes('/settings/llm'))).toBe(false);
  });
});

describe('RecruitApi — job posting endpoints', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('RecruitApi_JobPostingMethods_UseCorrectEndpoints', async () => {
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        calls.push({ url: String(url), method: (init && init.method) || 'GET' });
        return new Response(JSON.stringify({ jobPosting: { id: 'p1' }, alreadySaved: false }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );

    await window.RecruitApi.listJobPostings('rust');
    expect(calls[0].url).toContain('/job-postings?q=rust');
    expect(calls[0].method).toBe('GET');

    await window.RecruitApi.getJobPosting('p1');
    expect(calls[1].url).toContain('/job-postings/p1');

    await window.RecruitApi.adoptJobPosting({ source: 'A', sourceId: '1', company: 'x', title: 'y' });
    expect(calls[2].url).toContain('/job-postings/adopt');
    expect(calls[2].method).toBe('POST');

    await window.RecruitApi.extractJobPosting({ text: 'ad' });
    expect(calls[3].url).toContain('/job-postings/extract');

    await window.RecruitApi.createJobPosting({ source: 'text', company: 'x', title: 'y' });
    expect(calls[4].url.endsWith('/job-postings')).toBe(true);
    expect(calls[4].method).toBe('POST');

    await window.RecruitApi.updateJobPosting('p1', { description: 'x' });
    expect(calls[5].url).toContain('/job-postings/p1');
    expect(calls[5].method).toBe('PATCH');

    await window.RecruitApi.deleteJobPosting('p1');
    expect(calls[6].url).toContain('/job-postings/p1');
    expect(calls[6].method).toBe('DELETE');
  });
});

describe('RecruitApi — job application endpoints', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('RecruitApi_JobApplicationMethods_UseCorrectEndpoints', async () => {
    const calls = [];
    // jsdom ships no URL.createObjectURL; the download seam (saveBlob) needs one.
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => 'blob:mock';
    URL.revokeObjectURL = () => {};
    try {
      vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        calls.push({ url: String(url), method: (init && init.method) || 'GET' });
        return new Response(
          JSON.stringify({
            configured: true,
            jobApplication: { id: 'a1' },
            alreadyExisting: false,
            documents: {},
            letter: { paragraphs: ['p'] },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }),
    );
    window.RecruitApi.invalidateAiStatus();

    await window.RecruitApi.listJobApplications({ talentId: 't1' });
    expect(calls.some((c) => c.url.includes('/job-applications?talentId=t1') && c.method === 'GET')).toBe(true);

    await window.RecruitApi.listJobApplications({ status: 'sent' });
    expect(calls.some((c) => c.url.includes('/job-applications?status=sent'))).toBe(true);

    await window.RecruitApi.listJobApplications();
    expect(calls.some((c) => c.url.endsWith('/job-applications') && c.method === 'GET')).toBe(true);

    await window.RecruitApi.createJobApplication({ jobPostingId: 'p1', talentId: 't1' });
    const createCall = calls.find(
      (c) => c.url.endsWith('/job-applications') && c.method === 'POST',
    );
    expect(createCall).toBeTruthy();

    await window.RecruitApi.getJobApplication('a1');
    expect(calls.some((c) => c.url.includes('/job-applications/a1') && c.method === 'GET')).toBe(true);

    await window.RecruitApi.getJobApplicationDocuments('a1');
    expect(calls.some((c) => c.url.includes('/job-applications/a1/documents') && c.method === 'GET')).toBe(true);

    await window.RecruitApi.saveJobApplicationDocuments('a1', {});
    expect(calls.some((c) => c.url.includes('/job-applications/a1/documents') && c.method === 'PUT')).toBe(true);

    await window.RecruitApi.saveJobApplicationDocuments('a1', {}, true);
    expect(calls.some((c) => c.url.includes('/job-applications/a1/documents?unfreeze=1') && c.method === 'PUT')).toBe(true);

    await window.RecruitApi.updateJobApplicationAttachments('a1', ['att1']);
    expect(calls.some((c) => c.url.includes('/job-applications/a1/attachments') && c.method === 'PUT')).toBe(true);

    await window.RecruitApi.downloadJobApplicationDossierPdf('a1');
    expect(calls.some((c) => c.url.includes('/job-applications/a1/dossier/pdf'))).toBe(true);

    await window.RecruitApi.downloadJobApplicationDossierZip('a1');
    expect(calls.some((c) => c.url.includes('/job-applications/a1/dossier/zip'))).toBe(true);

    await window.RecruitApi.generateJobApplicationLetter('a1');
    const letterCall = calls.find((c) => c.url.endsWith('/job-applications/a1/letter'));
    expect(letterCall).toBeTruthy();
    expect(letterCall.method).toBe('POST');

    await window.RecruitApi.changeJobApplicationStatus('a1', 'sent');
    const statusCall = calls.find((c) => c.url.endsWith('/job-applications/a1/status'));
    expect(statusCall).toBeTruthy();
    expect(statusCall.method).toBe('POST');

    await window.RecruitApi.deleteJobApplication('a1');
    const deleteCall = calls.find(
      (c) => c.url.endsWith('/job-applications/a1') && c.method === 'DELETE',
    );
    expect(deleteCall).toBeTruthy();
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
  });
});

describe('RecruitApi — Magic Pen endpoints', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('RecruitApi_PenMethods_UseCorrectEndpoints', async () => {
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        calls.push({ url: String(url), method: (init && init.method) || 'GET' });
        return new Response(
          JSON.stringify({ configured: true, suggestion: { section: 'summary' }, sections: [] }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }),
    );
    window.RecruitApi.invalidateAiStatus();

    await window.RecruitApi.penHeadline('a1');
    expect(calls.find((c) => c.url.endsWith('/job-applications/a1/pen/headline') && c.method === 'POST')).toBeTruthy();

    await window.RecruitApi.penSummary('a1');
    expect(calls.find((c) => c.url.endsWith('/job-applications/a1/pen/summary') && c.method === 'POST')).toBeTruthy();

    await window.RecruitApi.penExperience('a1', 2);
    const exp = calls.find((c) => c.url.endsWith('/job-applications/a1/pen/experience') && c.method === 'POST');
    expect(exp).toBeTruthy();

    await window.RecruitApi.penSkills('a1');
    expect(calls.find((c) => c.url.endsWith('/job-applications/a1/pen/skills') && c.method === 'POST')).toBeTruthy();

    await window.RecruitApi.penAll('a1');
    expect(calls.find((c) => c.url.endsWith('/job-applications/a1/pen/all') && c.method === 'POST')).toBeTruthy();
  });
});

