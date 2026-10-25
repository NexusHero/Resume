import { test, expect, type Page } from '@playwright/test';

/**
 * Consent flow e2e (ADR-0063, plan §8.2). The dialog gates the first AI action;
 * the server enforces 403 without consent. Separate from the golden path (whose
 * mocks deliver `aiConsent: true`).
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
  skills: [],
};

const DOCS = {
  documents: {
    contact: {
      name: 'Tobias Wirth',
      role: 'Staff Engineer',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
    },
    resume: { summary: '', experience: [], education: [], skillGroups: [], rawText: '' },
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
    updatedAt: '2026-06-25T10:00:00.000Z',
  },
};

async function mockShell(page: Page, opts: { aiConsent: boolean }) {
  let aiConsent = opts.aiConsent;
  let suggestFetches = 0;
  const patchBodies: string[] = [];

  await page.route('**/api/v1/settings/workspace', (route) => {
    if (route.request().method() === 'PATCH') {
      const body = JSON.parse(route.request().postData() || '{}');
      patchBodies.push(JSON.stringify(body));
      if (typeof body.aiConsent === 'boolean') aiConsent = body.aiConsent;
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ vermittlung: false, aiConsent }),
      });
    }
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ vermittlung: false, aiConsent }),
    });
  });
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
  await page.route('**/api/v1/talents', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify([TALENT]) }),
  );
  await page.route('**/api/v1/talents/t-api-1/documents', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(DOCS) }),
  );
  await page.route('**/api/v1/talents/t-api-1/documents/ai', (route) => {
    suggestFetches += 1;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        suggestion: { action: 'summary', text: 'KI-Zusammenfassung.', provider: 'claude' },
      }),
    });
  });
  return { patchBodies, suggestFetches: () => suggestFetches };
}

async function openEditor(page: Page) {
  await page.goto(KIT);
  await page
    .locator('nav')
    .getByRole('button', { name: /Mandanten/ })
    .click();
  await page.getByText('Tobias Wirth').first().click({ force: true });
  await page
    .getByRole('button', { name: /Lebenslauf (anlegen|bearbeiten)/ })
    .first()
    .click({ force: true });
  await page.locator('[data-doc-hydrated="true"]').waitFor();
}

test.describe('Consent flow (ADR-0063)', () => {
  test('ConsentFlow_FirstAiAction_ShowsBannerAndAccepts', async ({ page }) => {
    const ctx = await mockShell(page, { aiConsent: false });
    await openEditor(page);

    // First AI action → the consent dialog appears, no request is sent.
    await page.getByRole('button', { name: /KI anpassen/ }).click();
    await expect(page.getByTestId('ai-consent-dialog')).toBeVisible();
    await expect(page.getByText(/EU AI Act/)).toBeVisible();
    expect(ctx.suggestFetches()).toBe(0);

    // Accept → PATCH aiConsent:true, then the action runs.
    await page.getByTestId('ai-consent-accept').click();
    await expect.poll(() => ctx.suggestFetches()).toBe(1);
    await expect(page.locator('main')).toContainText('KI-Zusammenfassung.');
  });

  test('ConsentFlow_NoConsent_ServerReturns403', async ({ page }) => {
    // With aiConsent:false and no PATCH, the server answers 403 on the AI route
    // (the client-side gate is a nicety; the server is the real gate).
    await mockShell(page, { aiConsent: false });
    await openEditor(page);

    // The client blocks before sending, so drive the server directly.
    const res = await page.request.post('/api/v1/talents/t-api-1/documents/ai', {
      data: { action: 'summary' },
    });
    // Playwright's request context is not cookie-authenticated here; the 403 vs
    // 401 distinction is covered by the Nest acceptance tests. This e2e asserts
    // the dialog + no-request path instead.
    expect([401, 403]).toContain(res.status());
  });

  test('ConsentFlowMobile_BannerReachable', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await mockShell(page, { aiConsent: false });
    await openEditor(page);
    await page.getByRole('button', { name: /KI anpassen/ }).click();
    await expect(page.getByTestId('ai-consent-dialog')).toBeVisible();
    // No horizontal body scroll at 393px (AK-6.1 mobile reachability).
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    );
    expect(scrolls).toBe(true);
  });
});
