import { test, expect } from '@playwright/test';

test.describe('UI acceptance — the suite renders in English', () => {
  test('Root_LandsOnWorkspace_NotLauncher', async ({ page }) => {
    // Stub the live job board so the workspace's Job search is deterministic.
    await page.route('**/api/v1/jobs**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          threshold: 80,
          counts: { total: 0, top: 0, more: 0 },
          top: [],
          more: [],
        }),
      }),
    );
    await page.goto('/');
    // Redirected straight into the unified workspace (no launcher page).
    await expect(page).toHaveURL(/recruiting\/index\.html$/);
    const nav = page.locator('nav');
    await expect(nav).toContainText('Workspace');
    await expect(nav).toContainText('Job search');
    await expect(nav).toContainText('Talent Pool');
    await expect(page.locator('body')).not.toContainText('Application Suite');
  });

  test('Workspace_JobSearch_FetchesLiveJobs', async ({ page }) => {
    await page.route('**/api/v1/jobs**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          threshold: 80,
          counts: { total: 1, top: 1, more: 0 },
          top: [
            {
              id: 'j1',
              company: 'Acme',
              role: 'Backend Engineer',
              city: 'Berlin',
              country: 'Germany',
              mode: 'remote',
              salary: '€80k',
              posted: '2026-06-29',
              skills: ['Go'],
              snippet: 'Build things.',
              source: 'Arbeitnow',
              url: 'https://acme.test/job',
              match: 90,
              matchedSkills: ['Go'],
              missingSkills: [],
            },
          ],
          more: [],
        }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/index.html');
    await page.getByRole('button', { name: /Job search/ }).click();
    const main = page.locator('main');
    await expect(main).toContainText('Backend Engineer');
    await expect(main).toContainText('via Arbeitnow');
  });

  test('Recruiting_Loads_NavigationIsEnglish', async ({ page }) => {
    await page.goto('/design/myjob/ui_kits/recruiting/index.html');
    const nav = page.locator('nav button');
    await expect(nav.first()).toBeVisible();
    await expect(nav).toContainText(['Workspace', 'Talent Pool', 'Applications']);
    await expect(page.locator('nav')).not.toContainText('Übersicht');
  });

  test('Recruiting_OpenTalentPool_ShowsTalents', async ({ page }) => {
    await page.goto('/design/myjob/ui_kits/recruiting/index.html');
    await page.getByRole('button', { name: /Talent Pool/ }).click();
    await expect(page.locator('main')).toContainText('Add talent');
    await expect(page.locator('main')).toContainText('Suhay Sevinc');
  });

  test('Karriere_Jobsuche_FetchesJobsFromApiAndCreatesApplication', async ({ page }) => {
    // The Jobsuche now fetches live from the REST API; stub it so the flow is
    // deterministic regardless of which job boards are configured on the server.
    await page.route('**/api/v1/jobs**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          threshold: 80,
          counts: { total: 1, top: 1, more: 0 },
          top: [
            {
              id: 'j1',
              company: 'Celonis',
              role: 'Senior C++ Engineer',
              city: 'München',
              country: 'Deutschland',
              mode: 'hybrid',
              salary: '85.000 – 98.000 €',
              posted: '2026-06-26',
              skills: ['C++', 'gRPC'],
              snippet: 'Kerngeschäftslogik der Process-Mining-Engine.',
              source: 'Bundesagentur für Arbeit',
              url: 'https://careers.celonis.com/job/123',
              match: 94,
              matchedSkills: ['C++', 'gRPC'],
              missingSkills: [],
            },
          ],
          more: [],
        }),
      }),
    );
    // Cover letter is generated via the backend when the create dialog opens.
    await page.route('**/api/v1/cover-letter', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ text: 'Sehr geehrtes Team von Celonis, …', provider: 'template' }),
      }),
    );

    await page.goto('/design/myjob/ui_kits/karriere/index.html');
    await page.getByRole('button', { name: /Job search/ }).click();
    const main = page.locator('main');
    // search filters + source chips derived from the API results
    await expect(main).toContainText('Keywords');
    await expect(main).toContainText('Sources');
    // the fetched posting is listed, source-attributed, with its match score
    await expect(main).toContainText('Senior C++ Engineer');
    await expect(main).toContainText('via Bundesagentur für Arbeit');
    await expect(main).toContainText('94%');
    // open the posting → the real apply link is present
    await page.getByText('Senior C++ Engineer').first().click();
    await expect(page.getByRole('link', { name: /Open job posting/ })).toHaveAttribute(
      'href',
      'https://careers.celonis.com/job/123',
    );
    // build an application from it (sending is for later)
    await page.getByRole('button', { name: 'Create application' }).click();
    await expect(page.locator('body')).toContainText('Documents for the bundle');
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  });

  test('Karriere_Settings_SwitchesLlmProvider', async ({ page }) => {
    await page.route('**/api/v1/jobs**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          threshold: 80,
          counts: { total: 0, top: 0, more: 0 },
          top: [],
          more: [],
        }),
      }),
    );
    let current = 'claude';
    await page.route('**/api/v1/settings/llm', (route) => {
      if (route.request().method() === 'PUT')
        current = JSON.parse(route.request().postData() || '{}').provider;
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          current,
          providers: [
            { id: 'claude', label: 'Claude (Anthropic)', available: true },
            { id: 'gemini', label: 'Gemini (Google)', available: true },
          ],
        }),
      });
    });

    await page.goto('/design/myjob/ui_kits/karriere/index.html');
    await page.getByRole('button', { name: /Choose AI model/ }).click();
    const dialog = page.locator('body');
    await expect(dialog).toContainText('AI model');
    await expect(dialog).toContainText('Claude');
    await expect(dialog).toContainText('Gemini');
    await page.getByText('Gemini', { exact: true }).click();
    // the backend was asked to switch
    await expect.poll(() => current).toBe('gemini');
  });
});
