import { test, expect, type Page } from '@playwright/test';

/**
 * Golden-Path e2e (AK-6.1, plan §5). The full §1.8 flow in one Playwright run,
 * LLM mocked at the HTTP boundary. The Golden-Path mocks deliver
 * `aiConsent: true` (verbindlich, G2-Reviewer B) — the consent flow is covered
 * separately by `consent.spec.ts`, so this spec exercises only the §1.8 steps.
 */

const KIT = '/design/myjob/ui_kits/recruiting/dist/index.html';

const TALENT = {
  id: 't-api-1',
  name: 'Tobias Wirth',
  role: 'Staff Engineer',
  headline: '',
  location: 'Hamburg',
  email: 'tobias@example.de',
  phone: '',
  availability: '',
  salary: '',
  skills: ['Go', 'Kubernetes'],
};

const POSTING = {
  id: 'p1',
  ownerId: 'team',
  source: 'Arbeitnow',
  sourceId: 'j1',
  url: 'https://example.de/jobs/j1',
  company: 'Nordwind Logistik AG',
  title: 'Backend Engineer',
  location: 'Hamburg',
  country: 'DE',
  description: 'We need distributed systems and Kubernetes experience.',
  requirements: ['Go'],
  descriptionIncomplete: false,
  createdAt: '2026-06-25T10:00:00.000Z',
};

const DOCS = {
  contact: {
    name: 'Tobias Wirth',
    role: 'Staff Engineer',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
  },
  resume: {
    summary: 'Backend engineer.',
    experience: [
      {
        role: 'Backend Engineer',
        company: 'Acme',
        period: '2018–2022',
        location: '',
        bullets: ['Built APIs'],
        skills: [],
      },
    ],
    education: [],
    skillGroups: [{ label: 'Sprachen', items: ['Go'] }],
    rawText: '',
  },
  letter: {
    firma: '',
    ansprechpartner: '',
    strasse: '',
    plzOrt: '',
    betreff: '',
    anrede: '',
    absaetze: [''],
    gruss: '',
  },
  style: {
    accent: '#2A6FDB',
    strong: '#1d4ed8',
    onDark: '#7aa7f5',
    font: 'var(--font-display)',
    size: 1,
  },
};

const ATTACHMENTS = [
  {
    id: 'att1',
    ownerId: 'team',
    talentId: TALENT.id,
    name: 'Zeugnis.pdf',
    contentType: 'application/pdf',
    size: 1024,
    createdAt: '2026-06-25T10:00:00.000Z',
  },
];

const application = (id: string, status = 'draft') => ({
  id,
  ownerId: 'team',
  jobPostingId: POSTING.id,
  postingCompany: POSTING.company,
  postingTitle: POSTING.title,
  talentId: TALENT.id,
  talentName: TALENT.name,
  status,
  statusHistory: [{ status, at: '2026-06-25T10:00:00.000Z' }],
  documents: DOCS,
  selectedAttachmentIds: [],
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
});

/** Mock the whole main path at the HTTP boundary with an in-memory store. */
async function mockGoldenPath(page: Page) {
  const state = {
    talents: [] as (typeof TALENT)[],
    postings: [] as (typeof POSTING)[],
    applications: [] as ReturnType<typeof application>[],
    letterFetches: 0,
    penFetches: 0,
    dossierFetches: 0,
    statusPosts: [] as string[],
  };

  // G2-Reviewer B (verbindlich): the Golden-Path mocks deliver aiConsent: true.
  await page.route('**/api/v1/settings/workspace', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ vermittlung: false, aiConsent: true }),
    }),
  );
  await page.route('**/api/v1/settings/llm', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        configured: true,
        current: 'claude',
        providers: [{ id: 'claude', available: true }],
      }),
    }),
  );
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'user1', email: 'nora@example.de', roles: ['admin'] } }),
    }),
  );
  await page.route('**/api/v1/auth/providers', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ google: false, linkedin: false }),
    }),
  );

  await page.route('**/api/v1/talents', (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      const created = { ...TALENT, name: body.name || TALENT.name };
      state.talents.push(created);
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ talent: created }),
      });
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(state.talents) });
  });
  await page.route('**/api/v1/talents/t-api-1/documents', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ documents: DOCS }) }),
  );
  // CV import: AI mode returns a structured parse (key is mocked as configured).
  await page.route('**/api/v1/talents/t-api-1/documents/parse', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        parsed: {
          mode: 'ai',
          contact: { name: 'Tobias Wirth', role: 'Staff Engineer' },
          resume: { summary: 'Backend engineer.', experience: [], education: [], skillGroups: [] },
          provider: 'claude',
        },
      }),
    }),
  );
  await page.route('**/api/v1/talents/t-api-1/attachments', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(ATTACHMENTS) }),
  );

  await page.route('**/api/v1/jobs', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        top: [
          {
            id: 'j1',
            role: 'Backend Engineer',
            company: 'Nordwind Logistik AG',
            city: 'Hamburg',
            country: 'DE',
            source: 'Arbeitnow',
            mode: 'Vollzeit',
            salary: '',
            posted: '2026-07-01',
            url: 'https://example.de/jobs/j1',
            skills: ['Go'],
          },
        ],
        more: [],
        liveSourcesDown: false,
      }),
    }),
  );
  await page.route('**/api/v1/job-postings', (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      const created = {
        ...POSTING,
        company: body.company,
        title: body.title,
        description: body.description || '',
      };
      state.postings.push(created);
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ jobPosting: created, alreadySaved: false }),
      });
    }
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(state.postings),
    });
  });
  await page.route('**/api/v1/job-postings/extract', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        company: 'Nordwind Logistik AG',
        title: 'Backend Engineer',
        location: 'Hamburg',
        country: 'DE',
        requirements: ['Go'],
        description: 'We need distributed systems and Kubernetes experience.',
        source: 'text',
      }),
    }),
  );

  await page.route('**/api/v1/job-applications', (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      const existing = state.applications.find(
        (a) => a.jobPostingId === body.jobPostingId && a.talentId === body.talentId,
      );
      if (existing)
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jobApplication: existing, alreadyExisting: true }),
        });
      const created = application(`app-${state.applications.length + 1}`);
      state.applications.push(created);
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ jobApplication: created, alreadyExisting: false }),
      });
    }
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(state.applications),
    });
  });
  await page.route('**/api/v1/job-applications/*/documents', (route) => {
    if (route.request().method() === 'PUT') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ documents: JSON.parse(route.request().postData() || '{}') }),
      });
    }
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ documents: DOCS }),
    });
  });
  await page.route('**/api/v1/job-applications/*/letter', (route) => {
    state.letterFetches += 1;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        letter: {
          paragraphs: ['I apply to Nordwind Logistik AG as Backend Engineer.'],
          provider: 'claude',
          usage: { inputTokens: 10, outputTokens: 20, costUsd: 0.0001 },
          grounding: { grounded: true, unsupported: [] },
          checks: {
            mentionsCompany: true,
            mentionsTitle: true,
            wordCount: 8,
            references: 2,
            inAdLanguage: true,
          },
        },
      }),
    });
  });
  await page.route('**/api/v1/job-applications/*/pen/summary', (route) => {
    state.penFetches += 1;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        suggestion: {
          section: 'summary',
          before: 'Backend engineer.',
          after: 'Backend engineer with distributed-systems focus.',
          provider: 'claude',
          usage: { inputTokens: 10, outputTokens: 20, costUsd: 0.0001 },
          grounding: { grounded: true, unsupported: [] },
        },
      }),
    });
  });
  await page.route('**/api/v1/job-applications/*/dossier/pdf', (route) => {
    state.dossierFetches += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      headers: {
        'content-disposition':
          'attachment; filename="Bewerbung_Tobias_Wirth_Nordwind_Logistik_AG.pdf"',
      },
      body: '%PDF-1.4 dossier',
    });
  });
  await page.route('**/api/v1/job-applications/*/status', (route) => {
    const id = route.request().url().split('/job-applications/')[1].split('/')[0];
    const body = JSON.parse(route.request().postData() || '{}');
    state.statusPosts.push(body.status);
    const app = state.applications.find((a) => a.id === id) || application(id);
    const updated = {
      ...app,
      status: body.status,
      statusHistory: [
        ...app.statusHistory,
        { status: body.status, at: '2026-06-25T11:00:00.000Z' },
      ],
    };
    const idx = state.applications.findIndex((a) => a.id === id);
    if (idx >= 0) state.applications[idx] = updated;
    else state.applications.push(updated);
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ jobApplication: updated }),
    });
  });
  await page.route('**/api/v1/job-applications/*', (route) => {
    const id = route.request().url().split('/job-applications/')[1];
    const app = state.applications.find((a) => a.id === id);
    if (!app) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ jobApplication: app }),
    });
  });

  return state;
}

async function createMandant(page: Page) {
  await page
    .locator('nav')
    .getByRole('button', { name: /Mandanten/ })
    .click();
  await page.getByRole('button', { name: 'Mandant hinzufügen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mandant hinzufügen' });
  await dialog.getByLabel('Name').fill('Tobias Wirth');
  await dialog.getByRole('button', { name: 'Mandant hinzufügen' }).click();
  await expect(page.locator('main')).toContainText('Tobias Wirth');
}

async function insertStelle(page: Page) {
  // Step 2 via "Stelle einfügen per Text" (the plan §5.2 explicitly allows this
  // as the alternative to "Stelle übernehmen"). The Portal-Suche ("Stelle
  // übernehmen") is the recruiter Matching surface and not part of the
  // application-first main path that this spec walks.
  await page
    .locator('nav')
    .getByRole('button', { name: /^Stellen$/ })
    .click();
  await page.getByRole('button', { name: 'Stelle einfügen' }).click();
  await page
    .getByLabel('Anzeigentext')
    .fill('We need distributed systems and Kubernetes experience.');
  await page.getByRole('button', { name: 'Felder extrahieren' }).click();
  await expect(page.getByLabel('Unternehmen')).toHaveValue('Nordwind Logistik AG');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.locator('main')).toContainText('Nordwind Logistik AG');
}

async function createBewerbung(page: Page) {
  await page
    .locator('nav')
    .getByRole('button', { name: /^Stellen$/ })
    .click();
  await page.getByText('Nordwind Logistik AG').first().click();
  await page.getByRole('button', { name: 'Bewerbung erstellen' }).click();
  await page.getByRole('button', { name: /Tobias Wirth/ }).click();
  await expect(page.locator('[data-doc-hydrated="true"]')).toBeVisible();
}

test.describe('Golden path (AK-6.1)', () => {
  test('GoldenPath_Manual_Desktop_EndToEnd', async ({ page }) => {
    const state = await mockGoldenPath(page);
    await page.goto(KIT);

    // 1. Mandant anlegen
    await createMandant(page);
    // 2. Stelle einfügen per Text
    await insertStelle(page);
    // 3. Bewerbung erstellen
    await createBewerbung(page);
    // 4. KI-Anschreiben → Übernehmen
    await page.getByRole('button', { name: 'Anschreiben generieren' }).click();
    await expect(page.getByText('Anschreiben-Vorschlag · noch nicht übernommen')).toBeVisible();
    await page
      .getByRole('button', { name: 'Übernehmen' })
      .first()
      .evaluate((el) => (el as HTMLButtonElement).click());
    // 5. CV per Magic Pen (Profil)
    await page.getByTestId('pen-summary').click();
    await expect(page.getByText('Vorschlag · noch nicht übernommen')).toBeVisible();
    await page
      .getByRole('button', { name: 'Übernehmen' })
      .first()
      .evaluate((el) => (el as HTMLButtonElement).click());
    // 6. Mappe herunterladen (Anhang wählen + PDF)
    await page.getByTestId('attachment-att1').check();
    await page.getByTestId('attachments-save').click();
    await page.getByTestId('mappe-pdf').click();
    await expect.poll(() => state.dossierFetches).toBe(1);
    // 7. Status „versendet"
    await page.getByRole('button', { name: 'Versendet' }).click();
    await expect.poll(() => state.statusPosts).toContain('sent');
    await page.reload();
    await page
      .locator('nav')
      .getByRole('button', { name: /^Bewerbungen$/ })
      .click();
    await expect(page.locator('main')).toContainText('Nordwind Logistik AG');
    await expect(page.locator('main')).toContainText('Versendet');
    expect(state.letterFetches).toBe(1);
    expect(state.penFetches).toBe(1);
  });

  test('GoldenPath_Manual_Mobile_EndToEnd', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    const state = await mockGoldenPath(page);
    await page.goto(KIT);
    await createMandant(page);
    await insertStelle(page);
    await createBewerbung(page);
    await page.getByRole('button', { name: 'Anschreiben generieren' }).click();
    await expect(page.getByText('Anschreiben-Vorschlag · noch nicht übernommen')).toBeVisible();
    await page.getByRole('button', { name: 'Übernehmen' }).first().click();
    await page.getByTestId('pen-summary').click();
    await page.getByRole('button', { name: 'Übernehmen' }).click();
    await page.getByRole('button', { name: 'Versendet' }).click();
    await expect.poll(() => state.statusPosts).toContain('sent');
  });

  test('GoldenPath_Agent_Desktop_EndToEnd', async ({ page }) => {
    await mockGoldenPath(page);
    const SSE = [
      'event: session',
      'data: {"sessionId":"s1"}',
      '',
      'event: tool-call',
      'data: {"name":"create_application","args":{}}',
      '',
      'event: tool-result',
      'data: {"name":"create_application","ok":true}',
      '',
      'event: drafts',
      'data: [{"jobApplicationId":"a1","postingCompany":"Nordwind Logistik AG","postingTitle":"Backend Engineer"}]',
      '',
      'event: usage',
      'data: {"inputTokens":12,"outputTokens":30,"costUsd":0.0004}',
      '',
      'event: done',
      '',
    ].join('\n');
    await page.route('**/api/v1/agent/chat', (route) => {
      if (route.request().method() === 'POST')
        return route.fulfill({ contentType: 'text/event-stream', body: SSE });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/v1/job-applications/a1', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          jobApplication: {
            id: 'a1',
            postingCompany: 'Nordwind Logistik AG',
            postingTitle: 'Backend Engineer',
            talentName: 'Tobias Wirth',
            status: 'draft',
            documents: DOCS,
          },
        }),
      }),
    );

    await page.goto(KIT);
    await page.getByRole('button', { name: 'Agent' }).click();
    await page.getByTestId('chat-input').fill('Erstelle eine Bewerbung');
    await page.getByTestId('chat-send').click();
    await expect(page.getByTestId('draft-link')).toBeVisible();
    await page.getByTestId('draft-link').click();
    await expect(
      page.getByRole('heading', { name: 'Nordwind Logistik AG · Backend Engineer' }),
    ).toBeVisible();
  });
});
