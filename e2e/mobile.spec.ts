import { test, expect, type Page } from '@playwright/test';

/* Mobile acceptance (#202) — runs under the `mobile-chromium` project (Pixel 5:
   393×851, hasTouch, mobile UA). Drives the core flow on a phone viewport and
   guards the two hard invariants: the navigation drawer works by touch, and no
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

/** On a phone the rail is an off-canvas drawer: open it, then tap a destination. */
async function navigate(page: Page, name: RegExp) {
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name }).click();
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
    // Signed in → the Workspace shell with the hamburger (mobile) menu.
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
    await expectNoHorizontalBodyScroll(page);

    await navigate(page, /Applications/);
    await expect(page.locator('main')).toBeVisible();
    await expectNoHorizontalBodyScroll(page);

    await navigate(page, /Matching/);
    await expect(page.locator('main')).toBeVisible();
    await expectNoHorizontalBodyScroll(page);

    await navigate(page, /Placements/);
    await expectNoHorizontalBodyScroll(page);
  });

  test('Mobile_OpenTalent_OpensEditor', async ({ page }) => {
    await mockSession(page);
    await page.goto(KIT);
    await navigate(page, /Talent Pool/);
    await page.getByText('Tobias Wirth').first().click();
    await page
      .getByRole('button', { name: /Create resume|Edit resume/ })
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
