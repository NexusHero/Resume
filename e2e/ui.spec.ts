import { test, expect } from '@playwright/test';

test.describe('UI acceptance — the suite renders in German', () => {
  // Phase 0 (ADR-0057): the intermediary features sit behind the workspace
  // switch. Keep it on for the agency-flow tests below; the fresh-workspace
  // tests override this route with `false`.
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/settings/workspace', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ vermittlung: true }),
      }),
    );
  });

  test('Root_Opens_RecruitingWorkspace', async ({ page }) => {
    // The app opens directly on the recruiting Workspace — the old launcher is
    // gone, so hitting the root redirects straight into the kit.
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ user: null }) }),
    );
    await page.route('**/api/v1/auth/providers', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ google: false, linkedin: false }),
      }),
    );
    await page.goto('/');
    await expect(page).toHaveURL(/\/design\/myjob\/ui_kits\/recruiting\/dist\/index\.html$/);
    // Not signed in → the branded Workspace login screen.
    await expect(page.getByRole('heading', { name: 'Willkommen zurück' })).toBeVisible();
  });

  test('Recruiting_Loads_NavigationIsGerman', async ({ page }) => {
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'me@example.de' } }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    const nav = page.locator('nav');
    await expect(nav.locator('button').first()).toBeVisible();
    // With the intermediary switch on, the rail carries the application-first
    // destinations plus the agency ones (ADR-0057).
    await expect(nav).toContainText('Workspace');
    await expect(nav).toContainText('Mandanten');
    await expect(nav).toContainText('Stellen');
    await expect(nav).toContainText('Bewerbungen');
    await expect(nav).toContainText('Suchaufträge');
    await expect(nav).toContainText('Performance');
    await expect(nav).toContainText('Postfach');
    // Matching/Placements are sub-tabs; CoRecruiter is a topbar action; Settings
    // is the foot utility — none are rail nav items.
    await expect(nav).not.toContainText('CoRecruiter');
    await expect(nav).not.toContainText('Matching');
    await expect(nav).not.toContainText('Platzierungen');
    await expect(nav).not.toContainText('Einstellungen');
    // No English (or old-IA) labels leaked into the navigation.
    await expect(nav).not.toContainText('Talent Pool');
    await expect(nav).not.toContainText('Mandates');
    await expect(nav).not.toContainText('Applications');
    await expect(nav).not.toContainText('Reports');
  });

  test('Recruiting_OpenTalentPool_ShowsTalents', async ({ page }) => {
    // The pool loads from the API (empty here) — the pinned "me" talent (derived
    // from the signed-in session, not fabricated data) and the Add-talent action
    // are always present.
    await page.route('**/api/v1/talents', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'nora@example.de' } }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    await page
      .locator('nav')
      .getByRole('button', { name: /Mandanten/ })
      .click();
    await expect(page.locator('main')).toContainText('Mandant hinzufügen');
    await expect(page.locator('main')).toContainText('Nora'); // session-derived "me"
  });

  test('Recruiting_DataError_ShowsErrorStateWithRetry', async ({ page }) => {
    // When the API fails, the view shows an error state (and a Retry) instead of
    // silently falling back to fabricated sample data.
    let attempt = 0;
    await page.route('**/api/v1/mandates', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      attempt += 1;
      if (attempt === 1) return route.fulfill({ status: 500, body: '' });
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ma1',
            client: 'Helio GmbH',
            role: 'Principal Platform Engineer',
            location: 'Hamburg',
            fee: '24%',
            feeValue: '31.000 €',
            deadline: '2026-09-01',
            priority: 'high',
            status: 'active',
            submitted: 3,
            interviews: 1,
            createdAt: '2026-06-30T10:00:00.000Z',
            updatedAt: '2026-06-30T10:00:00.000Z',
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
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    await page
      .locator('nav')
      .getByRole('button', { name: /Suchaufträge/ })
      .click();
    const main = page.locator('main');
    // first load failed → error state, no fabricated sample client
    await expect(main).toContainText('Etwas ist schiefgelaufen — erneut versuchen.');
    await expect(main).not.toContainText('Aurora Systems GmbH');
    // retry succeeds → the real mandate renders
    await page.getByRole('button', { name: 'Erneut versuchen' }).click();
    await expect(main).toContainText('Helio GmbH');
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
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    // Placements ("Platzierungen") folds under Performance — reach it via the
    // Performance view's sub-tab (Performance | Platzierungen).
    await page
      .locator('nav')
      .getByRole('button', { name: /Performance/ })
      .click();
    await page.getByRole('tab', { name: 'Platzierungen' }).click();
    await expect(page.locator('main')).toContainText('Tobias Wirth');
    await expect(page.locator('main')).toContainText('Helio GmbH');
    // the offline sample is replaced by the API data
    await expect(page.locator('main')).not.toContainText('Mara Vogel');
  });

  test('Recruiting_TalentPool_RendersApiTalentsWithMe', async ({ page }) => {
    // Stub the live talents endpoint with a candidate not in the sample; the
    // session-derived pinned "me" talent must still appear alongside it.
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
        body: JSON.stringify({ user: { id: 'user1', email: 'nora@example.de' } }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    await page
      .locator('nav')
      .getByRole('button', { name: /Mandanten/ })
      .click();
    await expect(page.locator('main')).toContainText('Tobias Wirth'); // from the API
    await expect(page.locator('main')).toContainText('Nora'); // session-derived "me"
  });

  test('Recruiting_Editor_LoadsAndAutosavesDocuments', async ({ page }) => {
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'me@example.de' } }),
      }),
    );
    await page.route('**/api/v1/talents', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          {
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
          },
        ]),
      });
    });
    let loaded = false;
    const puts: string[] = [];
    await page.route('**/api/v1/talents/t-api-1/documents', (route) => {
      const body = {
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
      if (route.request().method() === 'GET') {
        loaded = true;
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      }
      puts.push(route.request().postData() || '');
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    await page
      .locator('nav')
      .getByRole('button', { name: /Mandanten/ })
      .click();
    await page.getByText('Tobias Wirth').first().click({ force: true });
    await page
      .getByRole('button', { name: /Lebenslauf anlegen|Lebenslauf bearbeiten/ })
      .first()
      .click();
    // opening the editor loads the stored documents
    await expect.poll(() => loaded).toBe(true);
    // wait for the loaded document to be applied to the form before editing —
    // editing before hydration lands would race it (hydration re-applies the
    // stored contact and would clobber the typed value).
    await expect(page.locator('[data-doc-hydrated="true"]')).toBeVisible();
    // editing a field autosaves it (debounced) to the server
    const field = page.locator('main').getByRole('textbox').first();
    await field.fill('E2E-MARKER-NAME');
    await expect(page.locator('main').getByRole('status')).toContainText('Gespeichert', {
      timeout: 10000,
    });
    expect(puts.some((b) => b.includes('E2E-MARKER-NAME'))).toBe(true);
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
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    await page
      .locator('nav')
      .getByRole('button', { name: /Suchaufträge/ })
      .click();
    await expect(page.locator('main')).toContainText('Helio GmbH'); // client group header
    await expect(page.locator('main')).toContainText('Principal Platform Engineer'); // mandate row
    // the offline sample is replaced by the API data
    await expect(page.locator('main')).not.toContainText('Aurora Systems GmbH');
  });

  test('Recruiting_NewMandate_FormCreatesAndShowsRow', async ({ page }) => {
    // A real form (not window.prompt) creates the mandate via POST, then the
    // list reloads from the API and shows the new row.
    const mandates: Record<string, unknown>[] = [];
    await page.route('**/api/v1/mandates', (route) => {
      const req = route.request();
      if (req.method() === 'POST') {
        const body = JSON.parse(req.postData() || '{}');
        const created = {
          id: 'ma-new-1',
          client: body.client,
          role: body.role,
          location: body.location,
          fee: body.fee || '',
          feeValue: body.feeValue || '',
          deadline: body.deadline || '',
          priority: body.priority || 'medium',
          status: body.status || 'active',
          submitted: 0,
          interviews: 0,
          createdAt: '2026-06-30T10:00:00.000Z',
          updatedAt: '2026-06-30T10:00:00.000Z',
        };
        mandates.push(created);
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ mandate: created }),
        });
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(mandates) });
    });
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'me@example.de' } }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    await page
      .locator('nav')
      .getByRole('button', { name: /Suchaufträge/ })
      .click();
    await expect(page.locator('main')).toContainText('Noch keine Suchaufträge.');

    await page.getByRole('button', { name: 'Neuer Suchauftrag' }).click();
    await page.getByLabel('Klient', { exact: true }).fill('Helio GmbH');
    await page.getByLabel('Rolle', { exact: true }).fill('Principal Platform Engineer');
    await page.getByLabel('Standort', { exact: true }).fill('Hamburg · Remote');
    await page.getByRole('button', { name: 'Suchauftrag anlegen' }).click();

    // the form closed and the new mandate is listed
    await expect(page.getByRole('button', { name: 'Suchauftrag anlegen' })).toBeHidden();
    await expect(page.locator('main')).toContainText('Helio GmbH');
    await expect(page.locator('main')).toContainText('Principal Platform Engineer');
  });

  test('Recruiting_EditMandate_FormUpdatesRow', async ({ page }) => {
    // Clicking a mandate opens the edit form pre-filled; saving PATCHes it and
    // the list reloads with the new status.
    const mandate = {
      id: 'ma1',
      client: 'Helio GmbH',
      role: 'Principal Platform Engineer',
      location: 'Hamburg',
      fee: '24%',
      feeValue: '31.000 €',
      deadline: '2026-09-01',
      priority: 'high',
      status: 'active',
      submitted: 3,
      interviews: 1,
      createdAt: '2026-06-30T10:00:00.000Z',
      updatedAt: '2026-06-30T10:00:00.000Z',
    };
    await page.route('**/api/v1/mandates', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify([mandate]) }),
    );
    await page.route('**/api/v1/mandates/ma1', (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      mandate.status = body.status || mandate.status;
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ mandate }),
      });
    });
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'me@example.de' } }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    await page
      .locator('nav')
      .getByRole('button', { name: /Suchaufträge/ })
      .click();
    const main = page.locator('main');
    await expect(main).toContainText('active');

    // open the edit form pre-filled, change the status, save
    await main.getByText('Principal Platform Engineer').click();
    await expect(page.getByText('Suchauftrag bearbeiten')).toBeVisible();
    await expect(page.getByLabel('Klient', { exact: true })).toHaveValue('Helio GmbH');
    await page.getByLabel('Status', { exact: true }).selectOption('paused');
    await page.getByRole('button', { name: 'Änderungen speichern' }).click();

    await expect(page.getByRole('button', { name: 'Änderungen speichern' })).toBeHidden();
    await expect(main).toContainText('paused');
  });

  test('Recruiting_Dashboard_KpisAndMandatesReflectLiveData', async ({ page }) => {
    // The Übersicht (default view) must aggregate the live mandates/placements,
    // not the static sample — so KPIs and the active-mandates card track the
    // signed-in recruiter's own portfolio.
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
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    const main = page.locator('main');
    // greeting counts the live active mandates (exactly one)
    await expect(main).toContainText('1 aktive Suchaufträge');
    // the active-mandates card shows the live mandate's client and role
    await expect(main).toContainText('Helio GmbH');
    await expect(main).toContainText('Principal Platform Engineer');
    // the Fees KPI sums the live placement fee (24.000 € → "24 T€")
    await expect(main).toContainText('24 T€');
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
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    await expect(page.getByRole('heading', { name: 'Willkommen zurück' })).toBeVisible();
    await page.getByPlaceholder('you@example.com').fill('me@example.de');
    await page.getByPlaceholder('••••••••').fill('supersecret');
    await page.locator('button[type="submit"]').click();
    // signed in → the workspace navigation is shown
    await expect(page.locator('nav').getByRole('button', { name: /Mandanten/ })).toBeVisible();
  });

  test('Recruiting_PasswordReset_SetsNewPasswordFromTokenLink', async ({ page }) => {
    // Opened from the emailed link (?reset_token) → the set-new-password form.
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ user: null }) }),
    );
    await page.route('**/api/v1/auth/providers', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ google: false, linkedin: false }),
      }),
    );
    let confirmBody: unknown = null;
    await page.route('**/api/v1/auth/password-reset/confirm', (route) => {
      confirmBody = JSON.parse(route.request().postData() || '{}');
      route.fulfill({ status: 204, body: '' });
    });
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html?reset_token=tok-from-email');
    await expect(page.getByRole('heading', { name: 'Neues Passwort wählen' })).toBeVisible();
    const passwords = page.getByPlaceholder('••••••••');
    await passwords.nth(0).fill('brand-new-password');
    await passwords.nth(1).fill('brand-new-password');
    await page.locator('button[type="submit"]').click();
    // back to login with a success notice; the token was forwarded to the API
    await expect(page.getByRole('heading', { name: 'Willkommen zurück' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('zurückgesetzt');
    expect(confirmBody).toEqual({ token: 'tok-from-email', password: 'brand-new-password' });
  });

  test('Recruiting_Settings_ShowsCentralAiStatusNotPerUserKeys', async ({ page }) => {
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user1', email: 'me@example.de', roles: ['admin'] },
        }),
      }),
    );
    await page.route('**/api/v1/settings/llm', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          configured: true,
          current: 'claude',
          providers: [{ id: 'claude', label: 'Claude (Anthropic)', available: true }],
        }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    await page.getByRole('button', { name: /Einstellungen/ }).click();
    await expect(page.locator('main')).toContainText('KI-Anbindung');
    await expect(page.locator('main')).toContainText('KI eingerichtet');
    // The per-user key input is gone with the central-key model.
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByText('Schlüssel speichern')).toHaveCount(0);
  });

  test('Recruiting_Settings_ExportsAccountData', async ({ page }) => {
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'me@example.de' } }),
      }),
    );
    await page.route('**/api/v1/settings/llm', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ current: '', providers: [] }),
      }),
    );
    await page.route('**/api/v1/account/export', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          exportedAt: '2026-06-30T12:00:00.000Z',
          account: { id: 'user1', email: 'me@example.de' },
          mandates: [],
          talents: [],
          placements: [],
        }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    await page.getByRole('button', { name: /Einstellungen/ }).click();
    await expect(page.locator('main')).toContainText('Daten & Datenschutz');
    // clicking Export triggers a JSON file download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exportieren' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('myjob-export.json');
  });

  test('Recruiting_Settings_DeleteAccountReturnsToLogin', async ({ page }) => {
    let deleted = false;
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: deleted ? null : { id: 'user1', email: 'me@example.de' } }),
      }),
    );
    await page.route('**/api/v1/auth/providers', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ google: false, linkedin: false }),
      }),
    );
    await page.route('**/api/v1/settings/llm', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ current: '', providers: [] }),
      }),
    );
    await page.route('**/api/v1/account', (route) => {
      if (route.request().method() === 'DELETE') {
        deleted = true;
        return route.fulfill({ status: 204, body: '' });
      }
      return route.continue();
    });
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    await page.getByRole('button', { name: /Einstellungen/ }).click();
    // two-step confirm before the destructive call
    await page.getByRole('button', { name: 'Konto löschen' }).click();
    await page.getByRole('button', { name: 'Löschen bestätigen' }).click();
    // erasure ends the session → the app reloads to the login screen (the
    // reload re-fetches the bundle, so allow extra time for it to re-mount)
    await expect(page.getByRole('heading', { name: 'Willkommen zurück' })).toBeVisible({
      timeout: 15000,
    });
  });

  // --- Phase 0 (ADR-0057): the workspace switch + central-key UX -----------

  test('Navigation_FreshWorkspace_ShowsOnlyFiveDestinations', async ({ page }) => {
    await page.route('**/api/v1/settings/workspace', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ vermittlung: false }),
      }),
    );
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user1', email: 'me@example.de', roles: ['recruiter'] },
        }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    const nav = page.locator('nav');
    await expect(nav).toContainText('Workspace');
    await expect(nav).toContainText('Mandanten');
    await expect(nav).toContainText('Stellen');
    await expect(nav).toContainText('Bewerbungen');
    await expect(page.getByRole('button', { name: /Einstellungen/ })).toBeVisible();
    for (const label of ['Suchaufträge', 'Performance', 'Postfach']) {
      await expect(nav).not.toContainText(label);
    }
    await expect(page.getByRole('button', { name: /CoRecruiter/ })).toHaveCount(0);
  });

  test('Navigation_VermittlungOn_ShowsAgencyEntries', async ({ page }) => {
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'me@example.de', roles: ['admin'] } }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    const nav = page.locator('nav');
    await expect(nav).toContainText('Suchaufträge');
    await expect(nav).toContainText('Performance');
    await expect(nav).toContainText('Postfach');
    await expect(page.getByRole('button', { name: /CoRecruiter/ })).toBeVisible();
  });

  test('Settings_AsRecruiter_ToggleHidden', async ({ page }) => {
    await page.route('**/api/v1/settings/workspace', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ vermittlung: false }),
      }),
    );
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user1', email: 'me@example.de', roles: ['recruiter'] },
        }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    await page.getByRole('button', { name: /Einstellungen/ }).click();
    await expect(page.locator('main')).toContainText('KI-Anbindung');
    await expect(page.getByLabel('Vermittlung aktivieren')).toHaveCount(0);
  });

  test('Settings_AsAdmin_ToggleTurnsOnAgency', async ({ page }) => {
    let vermittlung = false;
    await page.route('**/api/v1/settings/workspace', (route) => {
      if (route.request().method() === 'PATCH') {
        vermittlung = !!JSON.parse(route.request().postData() || '{}').vermittlung;
      }
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ vermittlung }),
      });
    });
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'boss@example.de', roles: ['admin'] } }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    await page.getByRole('button', { name: /Einstellungen/ }).click();
    await page.getByLabel('Vermittlung aktivieren').click();
    await expect.poll(() => vermittlung).toBe(true);
    await expect(page.locator('nav')).toContainText('Suchaufträge');
  });

  test('AiButton_NoKey_ShowsNotConfiguredAndSendsNoRequest', async ({ page }) => {
    let aiCalls = 0;
    await page.route('**/api/v1/settings/workspace', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ vermittlung: false }),
      }),
    );
    await page.route('**/api/v1/settings/llm', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ current: 'claude', providers: [] }),
      }),
    );
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user1', email: 'me@example.de', roles: ['recruiter'] },
        }),
      }),
    );
    const talent = {
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
    await page.route('**/api/v1/talents', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([talent]) });
    });
    await page.route('**/api/v1/talents/t-api-1/documents/ai', (route) => {
      aiCalls += 1;
      return route.fulfill({ status: 503, contentType: 'application/problem+json', body: '{}' });
    });
    await page.route('**/api/v1/talents/t-api-1/documents', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
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
        }),
      }),
    );

    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    await page
      .locator('nav')
      .getByRole('button', { name: /Mandanten/ })
      .click();
    await page.getByText('Tobias Wirth').first().click({ force: true });
    await page
      .getByRole('button', { name: /Lebenslauf anlegen|Lebenslauf bearbeiten/ })
      .first()
      .click();

    await expect(page.locator('main')).toContainText('KI nicht eingerichtet');
    // The button is disabled, so the AI route is never hit.
    await expect(page.getByRole('button', { name: /KI anpassen/ })).toBeDisabled();
    expect(aiCalls).toBe(0);

    // AK-0.6: the hint is a real link that opens the settings page.
    const hint = page
      .locator('main')
      .getByText(/KI nicht eingerichtet/)
      .first();
    await expect(hint).toBeVisible();
    await page.locator('main').getByRole('button', { name: 'Einstellungen' }).first().click();
    await expect(page.locator('main')).toContainText('KI-Anbindung');
  });
});

test.describe('Phase 0 — central-key and vocabulary guarantees', () => {
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

  async function mockShell(
    page: import('@playwright/test').Page,
    opts: { vermittlung: boolean; aiConfigured: boolean },
  ) {
    await page.route('**/api/v1/settings/workspace', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ vermittlung: opts.vermittlung }),
      }),
    );
    await page.route('**/api/v1/settings/llm', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          configured: opts.aiConfigured,
          current: opts.aiConfigured ? 'claude' : null,
          providers: [{ id: 'claude', label: 'Claude', available: opts.aiConfigured }],
        }),
      }),
    );
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'me@example.de', roles: ['admin'] } }),
      }),
    );
    await page.route('**/api/v1/talents', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([TALENT]) });
    });
    await page.route('**/api/v1/talents/t-api-1/documents', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify(DOCS) }),
    );
    await page.route('**/api/v1/job-postings', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    });
  }

  async function openEditor(page: import('@playwright/test').Page) {
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

  test('LoginWithVermittlungOn_ShowsSuchauftraegeWithoutReload', async ({ page }) => {
    await mockShell(page, { vermittlung: true, aiConfigured: true });
    await page.goto(KIT);
    await expect(page.locator('nav').getByRole('button', { name: /Suchaufträge/ })).toBeVisible();
  });

  test('NoAiKey_HintLinkOpensSettingsEvenFromOpenEditor', async ({ page }) => {
    await mockShell(page, { vermittlung: false, aiConfigured: false });
    await openEditor(page);
    const hint = page
      .locator('main')
      .getByText(/KI nicht eingerichtet/)
      .first();
    await expect(hint).toBeVisible({ timeout: 10000 });
    await page.locator('main').getByRole('button', { name: 'Einstellungen' }).first().click();
    await expect(page.locator('main')).toContainText('KI-Anbindung');
  });

  test('NoAiKey_CvImportShowsTextImportNoticeAndImports', async ({ page }) => {
    await mockShell(page, { vermittlung: false, aiConfigured: false });
    await page.goto(KIT);
    await page
      .locator('nav')
      .getByRole('button', { name: /Mandanten/ })
      .click();
    // The grid names the mode before any upload (no silent AI expectation).
    await expect(
      page.getByRole('status').filter({ hasText: 'Text übernommen (ohne KI)' }),
    ).toBeVisible();

    await openEditor(page);
    await page.getByRole('button', { name: /CV importieren/ }).click();
    await expect(page.getByPlaceholder('CV-Text hier einfügen…')).toBeVisible();
    await expect(
      page.getByRole('status').filter({ hasText: 'Text übernommen (ohne KI)' }),
    ).toBeVisible();
    // The text path is usable without a key: the action enables once text exists.
    const analyze = page.getByRole('button', { name: 'Analysieren & übernehmen' });
    await expect(analyze).toBeDisabled();
    await page.getByPlaceholder('CV-Text hier einfügen…').fill('Voller CV-Text');
    await expect(analyze).toBeEnabled();
  });

  test('ConfiguredKey_AiSummaryAndLetterAreShown', async ({ page }) => {
    await mockShell(page, { vermittlung: false, aiConfigured: true });
    await page.route('**/api/v1/talents/t-api-1/documents/ai', (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      const suggestion =
        body.action === 'letter'
          ? { action: 'letter', paragraphs: ['Absatz eins.', 'Absatz zwei.'], provider: 'claude' }
          : { action: 'summary', text: 'Zusammenfassung von der KI.', provider: 'claude' };
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ suggestion }),
      });
    });
    await openEditor(page);
    await page.getByRole('button', { name: /KI anpassen/ }).click();
    await expect(page.locator('main')).toContainText('Zusammenfassung von der KI.');
    await page.getByRole('button', { name: 'Übernehmen' }).click();
    await expect(page.locator('main')).toContainText('Zusammenfassung von der KI.');
  });

  test('AllViews_VermittlungOnAndOff_ContainNoForbiddenTerms', async ({ page }) => {
    const forbidden = /(?<!\p{L})(Talent\w*|Mandat(?!ant)\w*)/u;
    for (const vermittlung of [false, true]) {
      await mockShell(page, { vermittlung, aiConfigured: true });
      await page.goto(KIT);
      const views = vermittlung
        ? [
            'Workspace',
            'Mandanten',
            'Stellen',
            'Bewerbungen',
            'Suchaufträge',
            'Performance',
            'Postfach',
          ]
        : ['Workspace', 'Mandanten', 'Stellen', 'Bewerbungen'];
      for (const label of views) {
        await page
          .locator('nav')
          .getByRole('button', { name: new RegExp(`^${label}$`) })
          .click();
        const text = await page.locator('main').innerText();
        expect(text, `${label} (vermittlung=${vermittlung})`).not.toMatch(forbidden);
      }
      // Settings is the foot utility, not a rail entry.
      await page
        .getByRole('button', { name: /Einstellungen/ })
        .first()
        .click();
      expect(await page.locator('main').innerText()).not.toMatch(forbidden);
    }
  });
});

test.describe('Fehler 1 — CV text import without a key', () => {
  const KIT = '/design/myjob/ui_kits/recruiting/dist/index.html';
  const TALENT = {
    id: 't-api-1',
    name: 'Tobias Wirth',
    role: 'Staff Engineer',
    headline: '',
    location: '',
    email: '',
    phone: '',
    availability: '',
    salary: '',
    skills: [],
    createdAt: '2026-06-25T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
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
      resume: {
        summary: 'Bestehendes Profil',
        experience: [
          {
            role: 'Senior Dev',
            company: 'Acme',
            period: '',
            location: '',
            bullets: [],
            skills: [],
          },
        ],
        education: [],
        skillGroups: [],
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
      style: { accent: '#000', strong: '#000', onDark: '#000', font: 'x', size: 1 },
      updatedAt: '2026-06-25T10:00:00.000Z',
    },
  };

  test('NoAiKey_CvTextImport_ShowsNoticeKeepsExistingStationAndFillsRawText', async ({ page }) => {
    const json = (route, body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    await page.route('**/api/v1/settings/workspace', (r) => json(r, { vermittlung: false }));
    await page.route('**/api/v1/settings/llm', (r) =>
      json(r, { configured: false, current: null, providers: [] }),
    );
    await page.route('**/api/v1/auth/me', (r) =>
      json(r, { user: { id: 'user1', email: 'me@example.de', roles: ['admin'] } }),
    );
    await page.route('**/api/v1/talents', (r) =>
      r.request().method() === 'GET' ? json(r, [TALENT]) : r.continue(),
    );
    await page.route('**/api/v1/talents/t-api-1/documents', (r) => json(r, DOCS));
    let parsed = 0;
    await page.route('**/api/v1/talents/t-api-1/documents/parse', (r) => {
      parsed += 1;
      return json(r, {
        parsed: { mode: 'text', contact: {}, resume: { rawText: 'VOLLER CV TEXT '.repeat(40) } },
      });
    });
    await page.route('**/api/v1/talents/t-api-1/documents', (r) =>
      r.request().method() === 'PUT' ? json(r, DOCS) : json(r, DOCS),
    );

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

    await page.getByRole('button', { name: /CV importieren/ }).click();
    await expect(page.getByText(/Text übernommen \(ohne KI\)/).first()).toBeVisible();
    await page.getByPlaceholder('CV-Text hier einfügen…').fill('VOLLER CV TEXT');
    await page.getByRole('button', { name: 'Analysieren & übernehmen' }).click();
    await expect.poll(() => parsed).toBe(1);
    await expect(page.getByText(/Text übernommen \(ohne KI\)/).first()).toBeVisible();

    await page.getByRole('button', { name: 'Übernehmen' }).click();
    await expect(page.getByText('Importierter Text (ohne KI)')).toBeVisible();
    // The existing station and profile are still in the form.
    await expect(page.locator('input[value="Senior Dev"]')).toBeVisible();
    expect(await page.locator('textarea').first().inputValue()).toContain('Bestehendes Profil');
  });
});

test.describe('Stellen (Phase 1)', () => {
  const KIT = '/design/myjob/ui_kits/recruiting/dist/index.html';
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
    description: 'Full ad text.',
    requirements: ['Go'],
    descriptionIncomplete: false,
    createdAt: '2026-06-25T10:00:00.000Z',
  };

  async function mockSession(page: import('@playwright/test').Page) {
    await page.route('**/api/v1/settings/workspace', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ vermittlung: true }),
      }),
    );
    await page.route('**/api/v1/settings/llm', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ configured: true, providers: [{ id: 'claude', available: true }] }),
      }),
    );
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'nora@example.de' } }),
      }),
    );
    await page.route('**/api/v1/jobs', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({
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
      });
    });
  }

  test('StellenView_AdoptFromSearch_PersistsAndAppearsInList', async ({ page }) => {
    const postings: Record<string, unknown>[] = [];
    await mockSession(page);
    await page.route('**/api/v1/job-postings', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(postings) });
    });
    await page.route('**/api/v1/job-postings/adopt', (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      const created = { ...POSTING, company: body.company, title: body.title };
      postings.push(created);
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ jobPosting: created, alreadySaved: false }),
      });
    });

    await page.goto(KIT);
    await page
      .locator('nav')
      .getByRole('button', { name: /^Stellen$/ })
      .click();
    await expect(page.locator('main')).toContainText('Noch keine gespeicherten Stellen.');

    await page.getByRole('tab', { name: 'Stellen finden' }).click();
    await expect(page.getByRole('button', { name: 'Stelle übernehmen' })).toBeVisible();
    await page.getByRole('button', { name: 'Stelle übernehmen' }).click();
    await expect(page.getByRole('button', { name: 'Übernommen' })).toBeVisible();

    // Reload-proof (AK-1.1): back to the saved list, then a full page reload.
    await page.getByRole('tab', { name: 'Gespeichert' }).click();
    await page.reload();
    await page
      .locator('nav')
      .getByRole('button', { name: /^Stellen$/ })
      .click();
    await expect(page.locator('main')).toContainText('Nordwind Logistik AG');
  });

  test('StellenView_InsertByText_ExtractsAndSaves', async ({ page }) => {
    const postings: Record<string, unknown>[] = [];
    await mockSession(page);
    await page.route('**/api/v1/job-postings', (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const created = {
          id: 'p2',
          ownerId: 'team',
          source: 'text',
          company: body.company,
          title: body.title,
          location: body.location || '',
          country: body.country || '',
          description: body.description || '',
          requirements: body.requirements || [],
          descriptionIncomplete: false,
          createdAt: '2026-06-25T10:00:00.000Z',
        };
        postings.push(created);
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ jobPosting: created, alreadySaved: false }),
        });
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(postings) });
    });
    await page.route('**/api/v1/job-postings/extract', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          company: 'Acme Corp',
          title: 'Frontend Developer',
          location: 'Berlin',
          country: 'DE',
          requirements: ['React'],
          description: 'React and TypeScript.',
          source: 'text',
        }),
      }),
    );

    await page.goto(KIT);
    await page
      .locator('nav')
      .getByRole('button', { name: /^Stellen$/ })
      .click();
    await page.getByRole('button', { name: 'Stelle einfügen' }).click();
    await page.getByLabel('Anzeigentext').fill('React and TypeScript.');
    await page.getByRole('button', { name: 'Felder extrahieren' }).click();

    await expect(page.getByLabel('Unternehmen')).toHaveValue('Acme Corp');
    await page.getByRole('button', { name: 'Speichern' }).click();

    await expect(page.locator('main')).toContainText('Frontend Developer');
  });

  test('StellenView_InsertByUrl_ExtractsAndSaves', async ({ page }) => {
    const postings: Record<string, unknown>[] = [];
    await mockSession(page);
    await page.route('**/api/v1/job-postings', (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const created = {
          id: 'p3',
          ownerId: 'team',
          source: 'url',
          url: body.url,
          company: body.company,
          title: body.title,
          location: body.location || '',
          country: body.country || '',
          description: body.description || '',
          requirements: body.requirements || [],
          descriptionIncomplete: false,
          createdAt: '2026-06-25T10:00:00.000Z',
        };
        postings.push(created);
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ jobPosting: created, alreadySaved: false }),
        });
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(postings) });
    });
    await page.route('**/api/v1/job-postings/extract', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          company: 'Helio GmbH',
          title: 'Backend Engineer',
          location: 'Remote',
          country: 'DE',
          requirements: ['Go'],
          description: 'Full ad text from the URL.',
          source: 'url',
          url: 'https://example.com/job/123',
        }),
      }),
    );

    await page.goto(KIT);
    await page
      .locator('nav')
      .getByRole('button', { name: /^Stellen$/ })
      .click();
    await page.getByRole('button', { name: 'Stelle einfügen' }).click();
    await page.getByRole('button', { name: 'Von URL' }).click();
    await page.getByLabel('URL der Stellenanzeige').fill('https://example.com/job/123');
    await page.getByRole('button', { name: 'Felder extrahieren' }).click();

    await expect(page.getByLabel('Unternehmen')).toHaveValue('Helio GmbH');
    await page.getByRole('button', { name: 'Speichern' }).click();

    await expect(page.locator('main')).toContainText('Backend Engineer');
  });

  test('StellenView_DuplicateAdopt_ShowsBereitsGespeichert', async ({ page }) => {
    await mockSession(page);
    await page.route('**/api/v1/job-postings', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/v1/job-postings/adopt', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ jobPosting: POSTING, alreadySaved: true }),
      }),
    );

    await page.goto(KIT);
    await page
      .locator('nav')
      .getByRole('button', { name: /^Stellen$/ })
      .click();
    await page.getByRole('tab', { name: 'Stellen finden' }).click();
    await expect(page.getByRole('button', { name: 'Stelle übernehmen' })).toBeVisible();
    await page.getByRole('button', { name: 'Stelle übernehmen' }).click();

    await expect(page.getByRole('button', { name: 'Bereits gespeichert → öffnen' })).toBeVisible();
  });

  test('StellenView_Delete_UndoRestores', async ({ page }) => {
    await mockSession(page);
    await page.route('**/api/v1/job-postings', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([POSTING]) });
    });

    await page.goto(KIT);
    await page
      .locator('nav')
      .getByRole('button', { name: /^Stellen$/ })
      .click();
    await expect(page.locator('main')).toContainText('Nordwind Logistik AG');

    // Open the detail, delete → the undo snackbar appears.
    await page.getByText('Nordwind Logistik AG').first().click();
    await page.getByRole('button', { name: 'Löschen' }).click();
    await expect(page.getByRole('status')).toContainText('entfernt');

    // Undo restores it.
    await page.getByRole('button', { name: 'Rückgängig' }).click();
    await expect(page.locator('main')).toContainText('Nordwind Logistik AG');
  });
});

test.describe('Bewerbungen (Phase 2)', () => {
  const KIT = '/design/myjob/ui_kits/recruiting/dist/index.html';

  const POSTING = {
    id: 'p1',
    ownerId: 'team',
    source: 'text',
    company: 'Nordwind Logistik AG',
    title: 'Backend Engineer',
    location: 'Hamburg',
    country: 'DE',
    description: 'We need distributed systems and Kubernetes experience.',
    requirements: ['Go'],
    descriptionIncomplete: false,
    createdAt: '2026-06-25T10:00:00.000Z',
  };

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

  const BASE_DOCS = {
    contact: {
      name: 'Tobias Wirth (Basis)',
      role: 'Staff Engineer',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
    },
    resume: {
      summary: 'Basis summary.',
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
      skillGroups: [],
      rawText: 'BASIS-RAW',
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

  const application = (id: string, status = 'draft') => ({
    id,
    ownerId: 'team',
    jobPostingId: 'p1',
    postingCompany: POSTING.company,
    postingTitle: POSTING.title,
    talentId: TALENT.id,
    talentName: TALENT.name,
    status,
    statusHistory: [{ status, at: '2026-06-25T10:00:00.000Z' }],
    documents: {
      ...BASE_DOCS,
      contact: { ...BASE_DOCS.contact, name: 'Tobias Wirth' },
      resume: { ...BASE_DOCS.resume, rawText: '' },
    },
    createdAt: '2026-06-25T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  });

  /**
   * Mock the Bewerbungen flow with an in-memory store that survives page.reload()
   * (the closures outlive the navigation). `basePuts` records any write to the
   * talent's base documents so tests can assert the copy never touches the base.
   */
  async function mockBewerbungen(
    page: import('@playwright/test').Page,
    opts: { vermittlung: boolean },
  ) {
    const state = {
      applications: [] as ReturnType<typeof application>[],
      basePuts: [] as string[],
      copyPuts: [] as string[],
    };
    await page.route('**/api/v1/settings/workspace', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ vermittlung: opts.vermittlung }),
      }),
    );
    await page.route('**/api/v1/settings/llm', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ configured: true, providers: [{ id: 'claude', available: true }] }),
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
    await page.route('**/api/v1/talents/t-api-1/documents', (route) => {
      if (route.request().method() === 'PUT') state.basePuts.push(route.request().postData() || '');
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ documents: BASE_DOCS }),
      });
    });
    await page.route('**/api/v1/job-postings', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([POSTING]) });
    });
    await page.route('**/api/v1/job-applications', (route) => {
      const req = route.request();
      if (req.method() === 'POST') {
        const body = JSON.parse(req.postData() || '{}');
        const existing = state.applications.find(
          (a) => a.jobPostingId === body.jobPostingId && a.talentId === body.talentId,
        );
        if (existing) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ jobApplication: existing, alreadyExisting: true }),
          });
        }
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
      const id = route.request().url().split('/job-applications/')[1].split('/')[0];
      const app = state.applications.find((a) => a.id === id);
      const body = { documents: (app && app.documents) || application('x').documents };
      if (route.request().method() === 'PUT') {
        state.copyPuts.push(route.request().postData() || '');
        const put = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ documents: put }),
        });
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.route('**/api/v1/job-applications/*/status', (route) => {
      const id = route.request().url().split('/job-applications/')[1].split('/')[0];
      const body = JSON.parse(route.request().postData() || '{}');
      const app = state.applications.find((a) => a.id === id) || application(id);
      const updated = {
        ...app,
        status: body.status,
        statusHistory: [
          ...app.statusHistory,
          { status: body.status, at: '2026-06-25T11:00:00.000Z' },
        ],
      };
      // Persist the change back into the in-memory store (which survives
      // page.reload()) — otherwise the list re-renders the stale "Entwurf" after
      // the reload and the assertion can only check the company, not the status.
      const idx = state.applications.findIndex((a) => a.id === id);
      if (idx >= 0) state.applications[idx] = updated;
      else state.applications.push(updated);
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ jobApplication: updated }),
      });
    });
    await page.route('**/api/v1/job-applications/*/letter', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          letter: {
            paragraphs: [
              'I apply to Nordwind Logistik AG as Backend Engineer with distributed systems experience.',
            ],
            provider: 'claude',
            usage: { inputTokens: 10, outputTokens: 20, costUsd: 0.0001 },
            grounding: { grounded: true, unsupported: [] },
            checks: {
              mentionsCompany: true,
              mentionsTitle: true,
              wordCount: 12,
              references: 2,
              inAdLanguage: true,
            },
          },
        }),
      }),
    );
    const penSuggestion = (section: string, over: Record<string, unknown> = {}) => ({
      section,
      before:
        section === 'experienceBullets'
          ? ['Built APIs']
          : section === 'skills'
            ? [{ label: 'Sprachen', items: ['Go'] }]
            : 'Old',
      after:
        section === 'experienceBullets'
          ? ['Built resilient APIs']
          : section === 'skills'
            ? [{ label: 'Sprachen', items: ['Go', 'Rust'] }]
            : 'Tuned',
      provider: 'claude',
      usage: { inputTokens: 10, outputTokens: 20, costUsd: 0.0001 },
      grounding: { grounded: true, unsupported: [] },
      ...over,
    });
    for (const section of ['headline', 'summary', 'skills']) {
      await page.route(`**/api/v1/job-applications/*/pen/${section}`, (route) =>
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ suggestion: penSuggestion(section) }),
        }),
      );
    }
    await page.route('**/api/v1/job-applications/*/pen/experience', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          suggestion: penSuggestion('experienceBullets', {
            experienceIndex: 0,
            station: { role: 'Backend Engineer', company: 'Acme', period: '2018–2022' },
          }),
        }),
      }),
    );
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

  async function openPosting(page: import('@playwright/test').Page) {
    await page.goto(KIT);
    await page
      .locator('nav')
      .getByRole('button', { name: /^Stellen$/ })
      .click();
    await page.getByText('Nordwind Logistik AG').first().click();
  }

  test('BewerbungenFlow_CreateFromPosting_OpensEditorWithCopy', async ({ page }) => {
    const state = await mockBewerbungen(page, { vermittlung: true });
    await openPosting(page);

    await page.getByRole('button', { name: 'Bewerbung erstellen' }).click();
    await page.getByRole('button', { name: /Tobias Wirth/ }).click();

    // The Bewerbungs-Editor opened with the copy hydrated (AK-2.1).
    await expect(page.locator('[data-doc-hydrated="true"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entwurf' })).toBeVisible();

    // Reload, then the list shows exactly one application (AK-2.2).
    await page.reload();
    await page
      .locator('nav')
      .getByRole('button', { name: /^Bewerbungen$/ })
      .click();
    await expect(page.locator('main')).toContainText('Nordwind Logistik AG');
    await expect(page.locator('main')).toContainText('Backend Engineer');
    expect(state.applications).toHaveLength(1);
  });

  test('BewerbungenFlow_DuplicateCreate_OpensExisting', async ({ page }) => {
    const state = await mockBewerbungen(page, { vermittlung: true });
    await openPosting(page);

    await page.getByRole('button', { name: 'Bewerbung erstellen' }).click();
    await page.getByRole('button', { name: /Tobias Wirth/ }).click();
    await expect(page.locator('[data-doc-hydrated="true"]')).toBeVisible();

    // Second attempt opens the existing application, no second record (AK-2.2).
    await openPosting(page);
    await page.getByRole('button', { name: 'Bewerbung erstellen' }).click();
    await page.getByRole('button', { name: /Tobias Wirth/ }).click();
    await expect(page.locator('[data-doc-hydrated="true"]')).toBeVisible();
    expect(state.applications).toHaveLength(1);
  });

  test('BewerbungenFlow_EditCopy_BaseUnchanged', async ({ page }) => {
    const state = await mockBewerbungen(page, { vermittlung: true });
    await openPosting(page);
    await page.getByRole('button', { name: 'Bewerbung erstellen' }).click();
    await page.getByRole('button', { name: /Tobias Wirth/ }).click();
    await expect(page.locator('[data-doc-hydrated="true"]')).toBeVisible();

    // Edit the copy's contact name (the editor autosaves to the application copy).
    await page.getByLabel('Name').fill('Tobias Wirth (angepasst)');

    // The copy was written via the application-documents endpoint, never the base.
    await expect.poll(() => state.basePuts.length).toBe(0);
  });

  test('BewerbungenFlow_GenerateLetter_MockProvider_ShowsStagedSuggestion', async ({ page }) => {
    await mockBewerbungen(page, { vermittlung: true });
    await openPosting(page);
    await page.getByRole('button', { name: 'Bewerbung erstellen' }).click();
    await page.getByRole('button', { name: /Tobias Wirth/ }).click();
    await expect(page.locator('[data-doc-hydrated="true"]')).toBeVisible();

    await page.getByRole('button', { name: 'Anschreiben generieren' }).click();
    await expect(page.getByText('Anschreiben-Vorschlag · noch nicht übernommen')).toBeVisible();
    await expect(page.getByText(/distributed systems/)).toBeVisible();
  });

  test('BewerbungenFlow_ChangeStatus_PersistsAfterReload', async ({ page }) => {
    const state = await mockBewerbungen(page, { vermittlung: true });
    await openPosting(page);
    await page.getByRole('button', { name: 'Bewerbung erstellen' }).click();
    await page.getByRole('button', { name: /Tobias Wirth/ }).click();
    await expect(page.locator('[data-doc-hydrated="true"]')).toBeVisible();

    await page.getByRole('button', { name: 'Versendet' }).click();
    expect(state.applications[0]).toBeDefined();

    await page.reload();
    await page
      .locator('nav')
      .getByRole('button', { name: /^Bewerbungen$/ })
      .click();
    await expect(page.locator('main')).toContainText('Nordwind Logistik AG');
    // The changed status survived the reload (the mock persisted it) and the
    // list badge shows "Versendet" rather than the initial "Entwurf".
    await expect(page.locator('main')).toContainText('Versendet');
  });

  test('BewerbungenFlow_PipelineSubTab_OnlyVisibleWhenVermittlungOn', async ({ page }) => {
    await mockBewerbungen(page, { vermittlung: false });
    await page.goto(KIT);
    await page
      .locator('nav')
      .getByRole('button', { name: /^Bewerbungen$/ })
      .click();
    await expect(page.getByRole('tab', { name: 'Pipeline' })).toHaveCount(0);

    await mockBewerbungen(page, { vermittlung: true });
    await page.reload();
    await page
      .locator('nav')
      .getByRole('button', { name: /^Bewerbungen$/ })
      .click();
    await expect(page.getByRole('tab', { name: 'Pipeline' })).toBeVisible();
  });

  test.describe('Magic Pen (Phase 3)', () => {
    async function openApplication(page: import('@playwright/test').Page) {
      await openPosting(page);
      await page.getByRole('button', { name: 'Bewerbung erstellen' }).click();
      await page.getByRole('button', { name: /Tobias Wirth/ }).click();
      await expect(page.locator('[data-doc-hydrated="true"]')).toBeVisible();
    }

    test('MagicPenFlow_PerSection_ShowsDiffAndAcceptWritesCopy', async ({ page }) => {
      const state = await mockBewerbungen(page, { vermittlung: true });
      await openApplication(page);

      await page.getByTestId('pen-summary').click();
      await expect(page.getByText('Vorschlag · noch nicht übernommen')).toBeVisible();
      // The before/after diff marks the change (the browser-side jsdiff renderer).
      await expect(page.locator('[data-testid="editor-diff"] ins').first()).toBeVisible();

      await page.getByRole('button', { name: 'Übernehmen' }).click();
      await expect.poll(() => state.copyPuts.length).toBeGreaterThan(0);
      // Accept writes only the copy, never the base CV (AK-2.3/3.1).
      expect(state.basePuts).toHaveLength(0);
    });

    test('MagicPenFlow_BaseUnchanged_AfterAccept', async ({ page }) => {
      const state = await mockBewerbungen(page, { vermittlung: true });
      await openApplication(page);

      await page.getByTestId('pen-summary').click();
      await expect(page.getByText('Vorschlag · noch nicht übernommen')).toBeVisible();
      await page.getByRole('button', { name: 'Übernehmen' }).click();

      // The base CV stays byte-identical: no write to the talent documents route.
      expect(state.basePuts).toHaveLength(0);
    });

    test('MagicPenFlow_GroundingWarning_BlocksUnreviewedAccept', async ({ page }) => {
      await mockBewerbungen(page, { vermittlung: true });
      await page.route('**/api/v1/job-applications/*/pen/summary', (route) =>
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            suggestion: {
              section: 'summary',
              before: 'Old',
              after: 'I use Kubernetes.',
              provider: 'claude',
              usage: { inputTokens: 10, outputTokens: 20, costUsd: 0.0001 },
              grounding: { grounded: false, unsupported: [{ kind: 'skill', text: 'Kubernetes' }] },
            },
          }),
        }),
      );
      await openApplication(page);

      await page.getByTestId('pen-summary').click();
      await expect(page.getByText(/nicht belegte Angabe/)).toBeVisible();

      await page.getByRole('button', { name: 'Übernehmen' }).click();
      // The explicit "Trotzdem übernehmen" confirm appears (AK-3.4).
      await expect(page.getByRole('button', { name: 'Trotzdem übernehmen' })).toBeVisible();
    });

    test('MagicPenFlow_AllesAnpassen_ShowsProgressAndAggregatedDiff', async ({ page }) => {
      const state = await mockBewerbungen(page, { vermittlung: true });
      await openApplication(page);

      await page.getByRole('button', { name: 'Alles für diese Stelle anpassen' }).click();
      // The aggregate tiles render with per-section accept buttons (AK-3.5).
      await expect(page.getByText('Alles anpassen')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Übernehmen' }).first()).toBeVisible();

      // Accept one section individually → the copy is written (never the base).
      // `.evaluate` bypasses the sticky app banner that can cover the tile row.
      await page
        .getByRole('button', { name: 'Übernehmen' })
        .first()
        .evaluate((el) => (el as HTMLButtonElement).click());
      await expect.poll(() => state.copyPuts.length).toBeGreaterThan(0);
      expect(state.basePuts).toHaveLength(0);
    });

    test('MagicPenFlow_AllesAnpassen_TileGrounding_RequiresConfirm', async ({ page }) => {
      await mockBewerbungen(page, { vermittlung: true });
      // One fan-out section (Profil) violates grounding.
      await page.route('**/api/v1/job-applications/*/pen/summary', (route) =>
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            suggestion: {
              section: 'summary',
              before: 'Old',
              after: 'I use Kubernetes.',
              provider: 'claude',
              usage: { inputTokens: 10, outputTokens: 20, costUsd: 0.0001 },
              grounding: { grounded: false, unsupported: [{ kind: 'skill', text: 'Kubernetes' }] },
            },
          }),
        }),
      );
      await openApplication(page);

      await page.getByRole('button', { name: 'Alles für diese Stelle anpassen' }).click();
      await expect(page.getByText(/nicht belegte Angabe/)).toBeVisible();

      // The violating tile's accept requires the explicit confirm step (OQ6).
      await page
        .getByTestId('all-accept-summary')
        .evaluate((el) => (el as HTMLButtonElement).click());
      await expect(page.getByText('Trotzdem übernehmen')).toBeVisible();
    });
  });
});

test.describe('Bewerbungen (Phase 4)', () => {
  const KIT = '/design/myjob/ui_kits/recruiting/dist/index.html';

  const POSTING = {
    id: 'p1',
    ownerId: 'team',
    source: 'text',
    company: 'Nordwind Logistik AG',
    title: 'Backend Engineer',
    location: 'Hamburg',
    country: 'DE',
    description: 'We need distributed systems and Kubernetes experience.',
    requirements: ['Go'],
    descriptionIncomplete: false,
    createdAt: '2026-06-25T10:00:00.000Z',
  };

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
    contact: {
      name: 'Tobias Wirth',
      role: 'Staff Engineer',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
    },
    resume: { summary: 'Basis.', experience: [], education: [], skillGroups: [], rawText: '' },
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

  const application = (id: string, status = 'draft', selected = []) => ({
    id,
    ownerId: 'team',
    jobPostingId: 'p1',
    postingCompany: POSTING.company,
    postingTitle: POSTING.title,
    talentId: TALENT.id,
    talentName: TALENT.name,
    status,
    statusHistory: [{ status, at: '2026-06-25T10:00:00.000Z' }],
    documents: { ...DOCS, contact: { ...DOCS.contact, name: 'Tobias Wirth' } },
    selectedAttachmentIds: selected,
    createdAt: '2026-06-25T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  });

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
    {
      id: 'att2',
      ownerId: 'team',
      talentId: TALENT.id,
      name: 'Referenz.pdf',
      contentType: 'application/pdf',
      size: 2048,
      createdAt: '2026-06-25T10:00:00.000Z',
    },
    {
      id: 'img1',
      ownerId: 'team',
      talentId: TALENT.id,
      name: 'portrait.png',
      contentType: 'image/png',
      size: 512,
      createdAt: '2026-06-25T10:00:00.000Z',
    },
  ];

  async function mockPhase4(
    page: import('@playwright/test').Page,
    apps: ReturnType<typeof application>[],
  ) {
    const state = {
      apps,
      attachmentPuts: [] as string[],
      unfreezePuts: [] as string[],
      dossierPdfFetches: 0,
      dossierZipFetches: 0,
    };
    await page.route('**/api/v1/settings/workspace', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ vermittlung: true }),
      }),
    );
    await page.route('**/api/v1/settings/llm', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ configured: true, providers: [{ id: 'claude', available: true }] }),
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
    await page.route('**/api/v1/talents', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify([TALENT]) }),
    );
    await page.route('**/api/v1/talents/t-api-1/documents', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ documents: DOCS }) }),
    );
    await page.route('**/api/v1/talents/t-api-1/attachments', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify(ATTACHMENTS) }),
    );
    await page.route('**/api/v1/job-postings', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify([POSTING]) }),
    );
    // Status filter is server-side: parse ?status= and return the matching apps.
    await page.route('**/api/v1/job-applications*', (route) => {
      const req = route.request();
      if (req.method() !== 'GET') return route.continue();
      const url = new URL(req.url());
      const status = url.searchParams.get('status');
      const list = status ? state.apps.filter((a) => a.status === status) : state.apps;
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(list) });
    });
    await page.route('**/api/v1/job-applications/*/documents*', (route) => {
      const id = route.request().url().split('/job-applications/')[1].split('/')[0];
      const app = state.apps.find((a) => a.id === id) || application(id);
      if (route.request().method() === 'PUT') {
        const url = new URL(route.request().url());
        if (app.status !== 'draft' && url.searchParams.get('unfreeze') !== '1') {
          return route.fulfill({
            status: 409,
            contentType: 'application/problem+json',
            body: JSON.stringify({
              type: 'about:blank#frozen',
              title: 'Frozen',
              status: 409,
              detail: 'frozen',
            }),
          });
        }
        state.unfreezePuts.push(route.request().postData() || '');
        return route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ documents: JSON.parse(route.request().postData() || '{}') }),
        });
      }
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ documents: app.documents }),
      });
    });
    await page.route('**/api/v1/job-applications/*/attachments*', (route) => {
      const id = route.request().url().split('/job-applications/')[1].split('/')[0];
      const app = state.apps.find((a) => a.id === id) || application(id);
      if (route.request().method() === 'PUT') {
        const url = new URL(route.request().url());
        if (app.status !== 'draft' && url.searchParams.get('unfreeze') !== '1') {
          return route.fulfill({
            status: 409,
            contentType: 'application/problem+json',
            body: JSON.stringify({
              type: 'about:blank#frozen',
              title: 'Frozen',
              status: 409,
              detail: 'frozen',
            }),
          });
        }
        const { attachmentIds } = JSON.parse(route.request().postData() || '{}');
        state.attachmentPuts.push(JSON.stringify(attachmentIds));
        return route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            jobApplication: { ...app, selectedAttachmentIds: attachmentIds },
          }),
        });
      }
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    });
    await page.route('**/api/v1/job-applications/*/dossier/pdf', (route) => {
      state.dossierPdfFetches += 1;
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
    await page.route('**/api/v1/job-applications/*/dossier/zip', (route) => {
      state.dossierZipFetches += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/zip',
        headers: {
          'content-disposition':
            'attachment; filename="Bewerbung_Tobias_Wirth_Nordwind_Logistik_AG.zip"',
        },
        body: 'PKdossier',
      });
    });
    await page.route('**/api/v1/job-applications/*/status', (route) => {
      const id = route.request().url().split('/job-applications/')[1].split('/')[0];
      const body = JSON.parse(route.request().postData() || '{}');
      const app = state.apps.find((a) => a.id === id) || application(id);
      const updated = {
        ...app,
        status: body.status,
        statusHistory: [
          ...app.statusHistory,
          { status: body.status, at: '2026-06-25T11:00:00.000Z' },
        ],
      };
      const idx = state.apps.findIndex((a) => a.id === id);
      if (idx >= 0) state.apps[idx] = updated;
      else state.apps.push(updated);
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ jobApplication: updated }),
      });
    });
    await page.route('**/api/v1/job-applications/*', (route) => {
      const id = route.request().url().split('/job-applications/')[1];
      const app = state.apps.find((a) => a.id === id);
      if (!app) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ jobApplication: app }),
      });
    });
    return state;
  }

  async function openApplication(page: import('@playwright/test').Page) {
    await page.goto(KIT);
    await page
      .locator('nav')
      .getByRole('button', { name: /^Bewerbungen$/ })
      .click();
    await page.getByText('Nordwind Logistik AG').first().click();
    await expect(page.locator('[data-doc-hydrated="true"]')).toBeVisible();
  }

  test('BewerbungenFlow_SelectAttachments_DownloadMappe', async ({ page }) => {
    const state = await mockPhase4(page, [application('app-1')]);
    await openApplication(page);

    // The non-PDF attachment is never offered (OQ3).
    await expect(page.getByText('Zeugnis.pdf')).toBeVisible();
    await expect(page.getByText('Referenz.pdf')).toBeVisible();
    await expect(page.getByText('portrait.png')).toHaveCount(0);

    await page.getByTestId('attachment-att1').check();
    await page.getByTestId('attachments-save').click();
    await expect.poll(() => state.attachmentPuts.length).toBe(1);
    expect(state.attachmentPuts[0]).toContain('att1');

    await page.getByTestId('mappe-pdf').click();
    await expect.poll(() => state.dossierPdfFetches).toBe(1);
    await page.getByTestId('mappe-zip').click();
    await expect.poll(() => state.dossierZipFetches).toBe(1);
  });

  test('BewerbungenFlow_FilterByStatus_ShowsOnlySelected', async ({ page }) => {
    const app1 = application('app-1', 'draft');
    const app2 = { ...application('app-2', 'sent'), postingTitle: 'Frontend Engineer' };
    await mockPhase4(page, [app1, app2]);
    await page.goto(KIT);
    await page
      .locator('nav')
      .getByRole('button', { name: /^Bewerbungen$/ })
      .click();
    await expect(page.locator('main')).toContainText('Backend Engineer');
    await expect(page.locator('main')).toContainText('Frontend Engineer');

    // Server-side filter: only the "Versendet" application survives.
    await page.getByTestId('status-filter-Versendet').click();
    await expect(page.locator('main')).toContainText('Frontend Engineer');
    await expect(page.locator('main')).not.toContainText('Backend Engineer');

    // The sent application's status survives a reload (persisted server-side).
    await page.reload();
    await page
      .locator('nav')
      .getByRole('button', { name: /^Bewerbungen$/ })
      .click();
    await expect(page.locator('main')).toContainText('Frontend Engineer');
    await expect(page.locator('main')).toContainText('Versendet');
  });

  test('BewerbungenFlow_FrozenEdit_ConfirmsUnfreeze', async ({ page }) => {
    const state = await mockPhase4(page, [application('app-1', 'sent')]);
    await openApplication(page);

    // Editing the frozen copy triggers a 409 → the freeze dialog appears.
    await page.getByLabel('Name').fill('Tobias Wirth (geändert)');
    await expect(page.getByTestId('unfreeze-confirm')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('unfreeze-confirm').click();

    // The confirmation resends with ?unfreeze=1 (recorded by the mock).
    await expect.poll(() => state.unfreezePuts.length).toBeGreaterThan(0);
  });
});

test.describe('Chat-Agent (Phase 5)', () => {
  const KIT = '/design/myjob/ui_kits/recruiting/dist/index.html';
  const SSE = [
    'event: session',
    'data: {"sessionId":"s1"}',
    '',
    'event: text',
    'data: {"delta":"Ich lege eine Bewerbung an."}',
    '',
    'event: tool-call',
    'data: {"name":"create_application","args":{"jobPostingId":"p1","talentId":"t1"}}',
    '',
    'event: tool-result',
    'data: {"name":"create_application","ok":true}',
    '',
    'event: drafts',
    'data: [{"jobApplicationId":"a1","postingCompany":"Acme Corp","postingTitle":"Backend Engineer"}]',
    '',
    'event: usage',
    'data: {"inputTokens":12,"outputTokens":30,"costUsd":0.0004}',
    '',
    'event: done',
    '',
  ].join('\n');

  async function mockShell(
    page: import('@playwright/test').Page,
    opts: { vermittlung?: boolean } = {},
  ) {
    await page.route('**/api/v1/settings/workspace', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ vermittlung: opts.vermittlung ?? false }),
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
  }

  test('AgentFlow_SendMessage_StreamsAndShowsToolSteps', async ({ page }) => {
    await mockShell(page);
    await page.route('**/api/v1/agent/chat', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ contentType: 'text/event-stream', body: SSE });
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.goto(KIT);
    // The Agent action is a main-path companion: visible even with vermittlung off.
    await page.getByRole('button', { name: 'Agent' }).click();
    await expect(page.getByTestId('chat-panel')).toBeVisible();
    await page.getByTestId('chat-input').fill('Erstelle eine Bewerbung');
    await page.getByTestId('chat-send').click();

    await expect(page.getByTestId('chat-messages')).toContainText('Ich lege eine Bewerbung an.');
    await expect(page.getByTestId('chat-messages')).toContainText('Bewerbung anlegen');
    await expect(page.getByTestId('usage-footer')).toBeVisible();
  });

  test('AgentFlow_DraftLink_OpensBewerbungsEditor', async ({ page }) => {
    await mockShell(page);
    await page.route('**/api/v1/agent/chat', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ contentType: 'text/event-stream', body: SSE });
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/v1/job-applications/a1', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          jobApplication: {
            id: 'a1',
            postingCompany: 'Acme Corp',
            postingTitle: 'Backend Engineer',
            talentName: 'Tobias Wirth',
            status: 'draft',
            documents: {},
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
    // The panel closes and the Bewerbungs-Editor opens for the fetched application.
    await expect(page.getByTestId('agent-panel')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Acme Corp · Backend Engineer' })).toBeVisible();
  });
});
