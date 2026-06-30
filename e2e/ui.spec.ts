import { test, expect } from '@playwright/test';

test.describe('UI acceptance — the suite renders in English', () => {
  test('Launcher_Loads_ShowsEnglishEntryPoints', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText('Application Suite');
    await expect(page.locator('body')).toContainText('myJob Workspace');
    await expect(page.locator('body')).toContainText('myJob for applicants');
    // No German leaked into the launcher.
    await expect(page.locator('body')).not.toContainText('Bewerbungs-Suite');
  });

  test('Recruiting_Loads_NavigationIsEnglish', async ({ page }) => {
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'me@example.de' } }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/index.html');
    const nav = page.locator('nav');
    await expect(nav.locator('button').first()).toBeVisible();
    // The unified recruiting nav renders these destinations in English.
    await expect(nav).toContainText('Workspace');
    await expect(nav).toContainText('Talent Pool');
    await expect(nav).toContainText('Applications');
    // No German leaked into the navigation.
    await expect(nav).not.toContainText('Übersicht');
  });

  test('Recruiting_OpenTalentPool_ShowsTalents', async ({ page }) => {
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'me@example.de' } }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/index.html');
    await page.getByRole('button', { name: /Talent Pool/ }).click();
    await expect(page.locator('main')).toContainText('Add talent');
    await expect(page.locator('main')).toContainText('Suhay Sevinc');
  });

  test('Recruiting_Placements_RenderFromApi', async ({ page }) => {
    // Stub the live placements endpoint with a candidate that is NOT in the
    // offline sample, so a pass proves the view rendered API data.
    await page.route('**/api/v1/placements', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'pl-api-1',
            candidateName: 'Tobias Wirth',
            candidateRole: 'Staff Engineer',
            client: 'Helio GmbH',
            start: '2026-08-01',
            fee: '24.000 €',
            status: 'paid',
            createdAt: '2026-06-25T10:00:00.000Z',
            updatedAt: '2026-06-25T10:00:00.000Z',
          },
        ]),
      });
    });
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'me@example.de' } }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/index.html');
    await page.getByRole('button', { name: /Placements/ }).click();
    await expect(page.locator('main')).toContainText('Tobias Wirth');
    await expect(page.locator('main')).toContainText('Helio GmbH');
    // the offline sample is replaced by the API data
    await expect(page.locator('main')).not.toContainText('Mara Vogel');
  });

  test('Recruiting_TalentPool_RendersApiTalentsWithMe', async ({ page }) => {
    // Stub the live talents endpoint with a candidate not in the sample; the
    // pinned "me" talent (Suhay Sevinc) must still appear alongside it.
    await page.route('**/api/v1/talents', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 't-api-1',
            name: 'Tobias Wirth',
            role: 'Staff Engineer',
            headline: 'Platform · Reliability',
            location: 'Hamburg',
            email: 'tobias@example.de',
            phone: '',
            availability: 'in 2 months',
            salary: '95.000 €',
            skills: ['Go', 'Kubernetes'],
            createdAt: '2026-06-25T10:00:00.000Z',
            updatedAt: '2026-06-25T10:00:00.000Z',
          },
        ]),
      });
    });
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'me@example.de' } }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/index.html');
    await page.getByRole('button', { name: /Talent Pool/ }).click();
    await expect(page.locator('main')).toContainText('Tobias Wirth'); // from the API
    await expect(page.locator('main')).toContainText('Suhay Sevinc'); // pinned "me"
  });

  test('Recruiting_Mandates_RenderFromApiGroupedByClient', async ({ page }) => {
    // Stub the live mandates endpoint with a client/role not in the sample, so a
    // pass proves MandateView grouped and rendered API data.
    await page.route('**/api/v1/mandates', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ma-api-1',
            client: 'Helio GmbH',
            role: 'Principal Platform Engineer',
            location: 'Hamburg · Remote',
            fee: '24%',
            feeValue: '31.000 €',
            deadline: '2026-09-01',
            priority: 'high',
            status: 'active',
            submitted: 3,
            interviews: 1,
            createdAt: '2026-06-25T10:00:00.000Z',
            updatedAt: '2026-06-25T10:00:00.000Z',
          },
        ]),
      });
    });
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'me@example.de' } }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/index.html');
    await page.getByRole('button', { name: /Mandates/ }).click();
    await expect(page.locator('main')).toContainText('Helio GmbH'); // client group header
    await expect(page.locator('main')).toContainText('Principal Platform Engineer'); // mandate row
    // the offline sample is replaced by the API data
    await expect(page.locator('main')).not.toContainText('Aurora Systems GmbH');
  });

  test('Recruiting_Login_SignsInAndShowsWorkspace', async ({ page }) => {
    // No session → the branded login screen; after submit → the workspace.
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ user: null }) }),
    );
    await page.route('**/api/v1/auth/providers', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ google: false, linkedin: false }),
      }),
    );
    await page.route('**/api/v1/auth/login', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'me@example.de' } }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/index.html');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await page.getByPlaceholder('you@example.com').fill('me@example.de');
    await page.getByPlaceholder('••••••••').fill('supersecret');
    await page.locator('button[type="submit"]').click();
    // signed in → the workspace navigation is shown
    await expect(page.getByRole('button', { name: /Talent Pool/ })).toBeVisible();
  });

  test('Recruiting_Settings_LoadsProvidersAndSwitchesModel', async ({ page }) => {
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'me@example.de' } }),
      }),
    );
    let current = 'claude';
    await page.route('**/api/v1/settings/llm', (route) => {
      if (route.request().method() === 'PUT') {
        current = JSON.parse(route.request().postData() || '{}').provider;
      }
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          current,
          providers: [
            { id: 'claude', label: 'Claude (Anthropic)', available: true },
            { id: 'gemini', label: 'Gemini (Google)', available: false },
          ],
        }),
      });
    });
    await page.goto('/design/myjob/ui_kits/recruiting/index.html');
    await page.getByRole('button', { name: /Settings/ }).click();
    await expect(page.locator('main')).toContainText('Claude (Anthropic)');
    await expect(page.locator('main')).toContainText('Gemini (Google)');
    // switch the active model to Gemini → the backend is asked to switch
    await page.locator('input[type="radio"]').nth(1).check();
    await expect.poll(() => current).toBe('gemini');
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
    await page.getByRole('button', { name: /Jobsuche/ }).click();
    const main = page.locator('main');
    // search filters + source chips derived from the API results
    await expect(main).toContainText('Suchbegriffe');
    await expect(main).toContainText('Quellen');
    // the fetched posting is listed, source-attributed, with its match score
    await expect(main).toContainText('Senior C++ Engineer');
    await expect(main).toContainText('via Bundesagentur für Arbeit');
    await expect(main).toContainText('94%');
    // open the posting → the real apply link is present
    await page.getByText('Senior C++ Engineer').first().click();
    await expect(page.getByRole('link', { name: /Stellenausschreibung öffnen/ })).toHaveAttribute(
      'href',
      'https://careers.celonis.com/job/123',
    );
    // build an application from it (sending is for later)
    await page.getByRole('button', { name: 'Bewerbung erstellen' }).click();
    await expect(page.locator('body')).toContainText('Unterlagen für die Mappe');
    await expect(page.getByRole('button', { name: 'Vormerken' })).toBeVisible();
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
    await page.getByRole('button', { name: /KI-Modell wählen/ }).click();
    const dialog = page.locator('body');
    await expect(dialog).toContainText('KI-Modell');
    await expect(dialog).toContainText('Claude');
    await expect(dialog).toContainText('Gemini');
    await page.getByText('Gemini', { exact: true }).click();
    // the backend was asked to switch
    await expect.poll(() => current).toBe('gemini');
  });
});
