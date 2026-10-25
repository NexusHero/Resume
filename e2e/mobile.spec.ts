import { test, expect, type Page } from '@playwright/test';

/* Mobile acceptance (#202) — runs under the `mobile-chromium` project (Pixel 5:
   393×851, hasTouch, mobile UA). Drives the core flow on a phone viewport and
   guards the two hard invariants: the bottom tab bar navigates by touch, and no
   main view scrolls the body sideways (boards scroll inside their own
   container). The desktop project ignores this file (playwright.config.ts). */

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
  skills: [],
  createdAt: '2026-06-25T10:00:00.000Z',
  updatedAt: '2026-06-25T10:00:00.000Z',
};

const DOCUMENTS = {
  documents: {
    contact: {
      name: 'Tobias Wirth',
      role: 'Staff Engineer',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
    },
    resume: { summary: '', experience: [], education: [], skillGroups: [] },
    letter: {
      firma: '',
      ansprechpartner: '',
      strasse: '',
      plzOrt: '',
      betreff: '',
      anrede: 'Sehr geehrte Damen und Herren,',
      absaetze: [''],
      gruss: 'Mit freundlichen Grüßen',
    },
    style: {
      accent: '#2A6FDB',
      strong: '#1d4ed8',
      onDark: '#7aa7f5',
      font: 'var(--font-display)',
      size: 1,
    },
    updatedAt: '2026-06-25T10:00:00.000Z',
  },
};

// Two applications in different stages so the board renders populated columns.
const APPLICATIONS = [
  {
    id: 'app-1',
    company: 'Aurora Systems',
    position: 'C++ Engineer',
    talentId: 't-api-1',
    talentName: 'Tobias Wirth',
    status: 'sent',
    score: 88,
  },
  {
    id: 'app-2',
    company: 'Helio GmbH',
    position: 'Backend Engineer',
    talentId: 't-api-1',
    talentName: 'Tobias Wirth',
    status: 'screening',
    score: 72,
  },
];

/** Wire the signed-in session + the resources the core flow reads. Returns the
 *  list of PATCH payloads sent to the applications endpoint so a test can assert
 *  a stage change actually persisted. */
async function mockSession(page: Page): Promise<string[]> {
  const patched: string[] = [];
  // Catch-all first (lowest priority): any unmocked resource returns an empty
  // collection so no view errors out. Specific routes registered after win.
  await page.route('**/api/v1/**', (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({ contentType: 'application/json', body: '[]' });
  });
  await page.route('**/api/v1/settings/workspace', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ vermittlung: true, aiConsent: true }),
    }),
  );
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'user1', email: 'nora@example.de' } }),
    }),
  );
  await page.route('**/api/v1/auth/providers', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ google: false, linkedin: false }),
    }),
  );
  await page.route('**/api/v1/talents', (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify([TALENT]) });
  });
  await page.route('**/api/v1/talents/t-api-1/documents', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(DOCUMENTS) }),
  );
  await page.route('**/api/v1/applications', (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(APPLICATIONS) });
  });
  await page.route('**/api/v1/applications/app-1', (route) => {
    patched.push(route.request().postData() || '');
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ...APPLICATIONS[0], status: 'interview' }),
    });
  });
  return patched;
}

/** On a phone the rail folds into the AppShell bottom TAB BAR (the first five
 *  destinations, always visible) — tap the tab directly, no drawer. */
async function navigate(page: Page, name: RegExp) {
  await page.locator('nav').last().getByRole('button', { name }).click();
}

/** The body must never scroll sideways — boards scroll inside their own box. */
async function expectNoHorizontalBodyScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
  expect(overflow, 'body should not scroll horizontally at 393px').toBeLessThanOrEqual(1);
}

test.describe('Mobile acceptance (#202)', () => {
  test('Mobile_NavWalk_NoHorizontalBodyScroll', async ({ page }) => {
    await mockSession(page);
    await page.goto(KIT);
    // Signed in → the Workspace shell with the bottom tab bar (first five
    // destinations). No off-canvas drawer in the Vivid AppShell tabs posture.
    await expect(page.locator('nav').last().getByRole('button', { name: /More/ })).toBeVisible();
    await expectNoHorizontalBodyScroll(page);

    await navigate(page, /Candidates/);
    await expect(page.locator('main')).toBeVisible();
    await expectNoHorizontalBodyScroll(page);

    await navigate(page, /Jobs/);
    await expect(page.locator('main')).toBeVisible();
    await expectNoHorizontalBodyScroll(page);

    await navigate(page, /Applications/);
    await expect(page.locator('main')).toBeVisible();
    await expectNoHorizontalBodyScroll(page);

    await navigate(page, /More/);
    await expect(page.locator('main')).toBeVisible();
    await page.getByRole('button', { name: /Mandates/ }).click();
    await expect(page.locator('main')).toBeVisible();
    await expectNoHorizontalBodyScroll(page);
  });

  test('Mobile_OpenTalent_OpensEditor', async ({ page }) => {
    await mockSession(page);
    await page.goto(KIT);
    await navigate(page, /Candidates/);
    await page.getByText('Tobias Wirth').first().click();
    await page
      .getByRole('button', { name: /(Edit CV|Create CV)/ })
      .first()
      .click();
    // The editor mounted and hydrated the stored document.
    await expect(page.locator('[data-doc-hydrated="true"]')).toBeVisible();
    await expectNoHorizontalBodyScroll(page);
  });

  test('Mobile_ApplicationsBoard_ScrollsAndStageChanges', async ({ page }) => {
    const patched = await mockSession(page);
    await page.goto(KIT);
    await navigate(page, /Applications/);
    // The frozen pipeline board is now a "Pipeline" sub-tab (Vermittlung on).
    await page.getByRole('tab', { name: 'Pipeline' }).click();

    // The board is a horizontal snap-scroller wider than the viewport, but it is
    // its OWN scroll container — the body stays put (the .board-scroll element).
    const board = page.locator('.board-scroll');
    await expect(board).toBeVisible();
    const metrics = await board.evaluate((el) => ({
      scroll: el.scrollWidth,
      client: el.clientWidth,
    }));
    expect(metrics.scroll, 'board content is wider than its container (scrolls)').toBeGreaterThan(
      metrics.client,
    );
    await expectNoHorizontalBodyScroll(page);

    // Touch fallback for drag-and-drop: change a card's stage via its dropdown.
    await page.getByLabel('Stage').first().selectOption('interview');
    await expect.poll(() => patched.length).toBeGreaterThan(0);
    expect(patched.some((b) => b.includes('interview'))).toBe(true);
  });
});

test('MobileNav_FreshWorkspace_ShowsOnlyFiveDestinations', async ({ page }) => {
  await mockSession(page);
  await page.route('**/api/v1/settings/workspace', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ vermittlung: false, aiConsent: true }),
    }),
  );
  await page.goto(KIT);
  const nav = page.locator('nav').last();
  await expect(nav.getByRole('button', { name: /Workspace/ })).toBeVisible();
  await expect(nav.getByRole('button', { name: /Candidates/ })).toBeVisible();
  await expect(nav.getByRole('button', { name: /Jobs/ })).toBeVisible();
  await expect(nav.getByRole('button', { name: /Applications/ })).toBeVisible();
  await expect(nav.getByRole('button', { name: /Settings/ })).toBeVisible();
  for (const label of ['Mandates', 'Pipeline', 'Performance', 'Inbox', 'More']) {
    await expect(nav.getByRole('button', { name: new RegExp(label) })).toHaveCount(0);
  }
  await expect(page.getByRole('button', { name: /CoRecruiter/ })).toHaveCount(0);
  await expectNoHorizontalBodyScroll(page);
});

test('MobileAiButton_NoKey_ShowsNotConfigured', async ({ page }) => {
  await mockSession(page);
  await page.route('**/api/v1/settings/llm', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ current: 'claude', providers: [] }),
    }),
  );
  await page.goto(KIT);
  await navigate(page, /Candidates/);
  await page.getByText('Tobias Wirth').first().click();
  await page
    .getByRole('button', { name: /(Edit CV|Create CV)/ })
    .first()
    .click();
  await expect(page.locator('[data-doc-hydrated="true"]')).toBeVisible();
  await expect(page.getByText('AI not configured')).toBeVisible();
  await expect(page.getByRole('button', { name: /Adapt with AI/ })).toBeDisabled();
  await expectNoHorizontalBodyScroll(page);
});

test('JobsViewMobile_ListAndDetail_Reachable', async ({ page }) => {
  await mockSession(page);
  await page.route('**/api/v1/job-postings', (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'p1',
          ownerId: 'team',
          source: 'text',
          company: 'Nordwind Logistik AG',
          title: 'Backend Engineer',
          location: 'Hamburg',
          country: 'DE',
          description: 'Full ad text.',
          requirements: ['Go'],
          descriptionIncomplete: false,
          createdAt: '2026-06-25T10:00:00.000Z',
        },
      ]),
    });
  });
  await page.goto(KIT);
  await navigate(page, /Jobs/);
  await expect(page.locator('main')).toContainText('Nordwind Logistik AG');
  await page.getByText('Nordwind Logistik AG').first().click();
  await expect(page.locator('main')).toContainText('Full ad text.');
  await expectNoHorizontalBodyScroll(page);
});

test('ApplicationsFlowMobile_ListAndEditor_Reachable', async ({ page }) => {
  await mockSession(page);
  await page.route('**/api/v1/job-applications', (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'app-1',
          ownerId: 'team',
          jobPostingId: 'p1',
          postingCompany: 'Nordwind Logistik AG',
          postingTitle: 'Backend Engineer',
          talentId: 't-api-1',
          talentName: 'Tobias Wirth',
          status: 'draft',
          statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
          documents: DOCUMENTS.documents,
          createdAt: '2026-06-25T10:00:00.000Z',
          updatedAt: '2026-06-25T10:00:00.000Z',
        },
      ]),
    });
  });
  await page.route('**/api/v1/job-applications/app-1/documents', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(DOCUMENTS) }),
  );
  await page.route('**/api/v1/job-applications/app-1', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        jobApplication: {
          id: 'app-1',
          ownerId: 'team',
          jobPostingId: 'p1',
          postingCompany: 'Nordwind Logistik AG',
          postingTitle: 'Backend Engineer',
          talentId: 't-api-1',
          talentName: 'Tobias Wirth',
          status: 'draft',
          statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
          documents: DOCUMENTS.documents,
          createdAt: '2026-06-25T10:00:00.000Z',
          updatedAt: '2026-06-25T10:00:00.000Z',
        },
      }),
    }),
  );

  await page.goto(KIT);
  await navigate(page, /Applications/);
  await expect(page.locator('main')).toContainText('Nordwind Logistik AG');
  await expectNoHorizontalBodyScroll(page);

  // Opening the application reaches the Bewerbungs-Editor (with the copy).
  await page.getByText('Nordwind Logistik AG').first().click();
  await expect(page.locator('[data-doc-hydrated="true"]')).toBeVisible();
  await expectNoHorizontalBodyScroll(page);
});

test('MagicPenFlowMobile_PenReachable', async ({ page }) => {
  await mockSession(page);
  await page.route('**/api/v1/settings/llm', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ configured: true, providers: [{ id: 'claude', available: true }] }),
    }),
  );
  await page.route('**/api/v1/job-applications', (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'app-1',
          ownerId: 'team',
          jobPostingId: 'p1',
          postingCompany: 'Nordwind Logistik AG',
          postingTitle: 'Backend Engineer',
          talentId: 't-api-1',
          talentName: 'Tobias Wirth',
          status: 'draft',
          statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
          documents: DOCUMENTS.documents,
          createdAt: '2026-06-25T10:00:00.000Z',
          updatedAt: '2026-06-25T10:00:00.000Z',
        },
      ]),
    });
  });
  await page.route('**/api/v1/job-applications/app-1/documents', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(DOCUMENTS) }),
  );
  await page.route('**/api/v1/job-applications/app-1', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        jobApplication: {
          id: 'app-1',
          ownerId: 'team',
          jobPostingId: 'p1',
          postingCompany: 'Nordwind Logistik AG',
          postingTitle: 'Backend Engineer',
          talentId: 't-api-1',
          talentName: 'Tobias Wirth',
          status: 'draft',
          statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
          documents: DOCUMENTS.documents,
          createdAt: '2026-06-25T10:00:00.000Z',
          updatedAt: '2026-06-25T10:00:00.000Z',
        },
      }),
    }),
  );
  await page.route('**/api/v1/job-applications/*/pen/summary', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        suggestion: {
          section: 'summary',
          before: 'Old',
          after: 'Tuned',
          provider: 'claude',
          usage: { inputTokens: 1, outputTokens: 1, costUsd: 0 },
          grounding: { grounded: true, unsupported: [] },
        },
      }),
    }),
  );

  await page.goto(KIT);
  await navigate(page, /Applications/);
  await page.getByText('Nordwind Logistik AG').first().click();
  await expect(page.locator('[data-doc-hydrated="true"]')).toBeVisible();

  // The Magic-Pen button is reachable at 393 px and drives the diff.
  await expect(page.getByTestId('pen-summary')).toBeVisible();
  await expectNoHorizontalBodyScroll(page);

  await page.getByTestId('pen-summary').click();
  await expect(page.getByText('Suggestion · not applied yet')).toBeVisible();
});

test('ApplicationsFlowMobile_MappeReachable', async ({ page }) => {
  await mockSession(page);
  await page.route('**/api/v1/job-applications', (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'app-1',
          ownerId: 'team',
          jobPostingId: 'p1',
          postingCompany: 'Nordwind Logistik AG',
          postingTitle: 'Backend Engineer',
          talentId: 't-api-1',
          talentName: 'Tobias Wirth',
          status: 'draft',
          statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
          documents: DOCUMENTS.documents,
          selectedAttachmentIds: [],
          createdAt: '2026-06-25T10:00:00.000Z',
          updatedAt: '2026-06-25T10:00:00.000Z',
        },
      ]),
    });
  });
  await page.route('**/api/v1/talents/t-api-1/attachments', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'att1',
          ownerId: 'team',
          talentId: 't-api-1',
          name: 'Zeugnis.pdf',
          contentType: 'application/pdf',
          size: 1024,
          createdAt: '2026-06-25T10:00:00.000Z',
        },
      ]),
    }),
  );
  await page.route('**/api/v1/job-applications/app-1/documents', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(DOCUMENTS) }),
  );
  await page.route('**/api/v1/job-applications/app-1', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        jobApplication: {
          id: 'app-1',
          ownerId: 'team',
          jobPostingId: 'p1',
          postingCompany: 'Nordwind Logistik AG',
          postingTitle: 'Backend Engineer',
          talentId: 't-api-1',
          talentName: 'Tobias Wirth',
          status: 'draft',
          statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
          documents: DOCUMENTS.documents,
          selectedAttachmentIds: [],
          createdAt: '2026-06-25T10:00:00.000Z',
          updatedAt: '2026-06-25T10:00:00.000Z',
        },
      }),
    }),
  );
  await page.route('**/api/v1/job-applications/app-1/dossier/pdf', (route) =>
    route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4' }),
  );

  await page.goto(KIT);
  await navigate(page, /Applications/);
  await page.getByText('Nordwind Logistik AG').first().click();
  await expect(page.locator('[data-doc-hydrated="true"]')).toBeVisible();

  // The Bewerbungsmappe download buttons are reachable at 393 px.
  await expect(page.getByTestId('mappe-pdf')).toBeVisible();
  await expect(page.getByTestId('mappe-zip')).toBeVisible();
  await expectNoHorizontalBodyScroll(page);
});

test.describe('Chat-Agent mobile (Phase 5)', () => {
  const SSE = [
    'event: session',
    'data: {"sessionId":"s1"}',
    '',
    'event: text',
    'data: {"delta":"Fertig."}',
    '',
    'event: done',
    '',
  ].join('\n');

  test('AgentFlowMobile_ChatPanelReachable', async ({ page }) => {
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
        body: JSON.stringify({ user: { id: 'user1', email: 'me@example.de', roles: ['admin'] } }),
      }),
    );
    for (const path of ['talents', 'job-postings', 'job-applications']) {
      await page.route(`**/api/v1/${path}`, (route) =>
        route.request().method() === 'GET'
          ? route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) })
          : route.continue(),
      );
    }
    await page.route('**/api/v1/agent/chat', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ contentType: 'text/event-stream', body: SSE });
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.goto(KIT);
    // The agent action is an icon-only button (aria-label) on the narrow app bar.
    await page.getByRole('button', { name: 'Agent' }).click();
    await expect(page.getByTestId('chat-panel')).toBeVisible();
    await page.getByTestId('chat-input').fill('Hallo');
    await page.getByTestId('chat-send').click();
    await expect(page.getByTestId('chat-messages')).toContainText('Fertig.');
  });
});
