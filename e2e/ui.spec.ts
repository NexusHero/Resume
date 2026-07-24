import { test, expect } from '@playwright/test';

test.describe('UI acceptance — the suite renders in German', () => {
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
    // The 2026 restructure collapses the primary nav to six German
    // destinations in the floating AppShell rail.
    await expect(nav).toContainText('Workspace');
    await expect(nav).toContainText('Mandate');
    await expect(nav).toContainText('Talent-Pool');
    await expect(nav).toContainText('Pipeline');
    await expect(nav).toContainText('Performance');
    await expect(nav).toContainText('Postfach');
    // Matching folds under Mandate, Placements under Performance, and the
    // CoRecruiter assistant + Settings are no longer primary nav items — so
    // none of them appear in the rail nav.
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
    await page.getByRole('button', { name: /Talent-Pool/ }).click();
    await expect(page.locator('main')).toContainText('Talent hinzufügen');
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
    await page.getByRole('button', { name: /Mandate/ }).click();
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
    await page.getByRole('button', { name: /Performance/ }).click();
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
    await page.getByRole('button', { name: /Talent-Pool/ }).click();
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
    await page.getByRole('button', { name: /Talent-Pool/ }).click();
    await page.getByText('Tobias Wirth').first().click();
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

  test('Recruiting_Mappe_UploadsAttachmentAndLists', async ({ page }) => {
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
            email: '',
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
    await page.route('**/api/v1/talents/t-api-1/documents', (route) => {
      const body = {
        documents: {
          contact: {
            name: 'Tobias Wirth',
            role: '',
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
            template: 'classic',
            accent: '#2A6FDB',
            strong: '#1d4ed8',
            onDark: '#7aa7f5',
            font: 'var(--font-display)',
            size: 1,
          },
          updatedAt: '2026-06-25T10:00:00.000Z',
        },
      };
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.route('**/api/v1/talents/t-api-1/attachments', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
      }
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          attachment: {
            id: 'att-1',
            name: 'Zeugnis.pdf',
            contentType: 'application/pdf',
            size: 2048,
            talentId: 't-api-1',
          },
        }),
      });
    });

    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    await page.getByRole('button', { name: /Talent-Pool/ }).click();
    await page.getByText('Tobias Wirth').first().click();
    await page
      .getByRole('button', { name: /Lebenslauf anlegen|Lebenslauf bearbeiten/ })
      .first()
      .click();
    await page.getByRole('button', { name: /Zur Mappe/ }).click();
    // upload a PDF via the hidden file input in the Mappe modal (the editor
    // also carries the resume-photo file input, so scope by accept type)
    await page.locator('input[type="file"][accept="application/pdf"]').setInputFiles({
      name: 'Zeugnis.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test'),
    });
    // the uploaded attachment now appears in the dossier contents
    await expect(page.getByText('Zeugnis.pdf')).toBeVisible({ timeout: 10000 });
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
    await page.getByRole('button', { name: /Mandate/ }).click();
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
    await page.getByRole('button', { name: /Mandate/ }).click();
    await expect(page.locator('main')).toContainText('Noch keine Mandate.');

    await page.getByRole('button', { name: 'Neues Mandat' }).click();
    await page.getByLabel('Klient', { exact: true }).fill('Helio GmbH');
    await page.getByLabel('Rolle', { exact: true }).fill('Principal Platform Engineer');
    await page.getByLabel('Standort', { exact: true }).fill('Hamburg · Remote');
    await page.getByRole('button', { name: 'Mandat anlegen' }).click();

    // the form closed and the new mandate is listed
    await expect(page.getByRole('button', { name: 'Mandat anlegen' })).toBeHidden();
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
    await page.getByRole('button', { name: /Mandate/ }).click();
    const main = page.locator('main');
    await expect(main).toContainText('active');

    // open the edit form pre-filled, change the status, save
    await main.getByText('Principal Platform Engineer').click();
    await expect(page.getByText('Mandat bearbeiten')).toBeVisible();
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
    await expect(main).toContainText('1 aktive Mandate');
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
    await expect(page.getByRole('button', { name: /Talent-Pool/ })).toBeVisible();
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
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    await page.getByRole('button', { name: /Einstellungen/ }).click();
    await expect(page.locator('main')).toContainText('Claude (Anthropic)');
    await expect(page.locator('main')).toContainText('Gemini (Google)');
    // switch the active model to Gemini → the backend is asked to switch.
    // Use click (not check): the radio is controlled and only flips once the
    // PUT resolves and state re-renders, which check() would race.
    await page.locator('input[type="radio"]').nth(1).click();
    await expect.poll(() => current).toBe('gemini');
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

  test('Recruiting_ApplyFromMatching_ShowsUpInThePipeline', async ({ page }) => {
    // End-to-end: search the live job boards, apply on the pinned "me"
    // candidate's behalf to one specific company's posting, then confirm the
    // application actually lands on the Pipeline board with that company and
    // role — the seam from ADR-0046/0048 that had no e2e coverage.
    const applications: Record<string, unknown>[] = [];
    await page.route('**/api/v1/jobs', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          top: [
            {
              id: 'j-nordwind-1',
              role: 'Backend Engineer',
              company: 'Nordwind Logistik AG',
              city: 'Hamburg',
              country: 'DE',
              source: 'Arbeitnow',
              mode: 'Vollzeit',
              salary: '',
              posted: '2026-07-01',
              url: 'https://example.de/jobs/j-nordwind-1',
              skills: ['Go', 'Kubernetes'],
            },
            {
              id: 'j-acme-1',
              role: 'Frontend Developer',
              company: 'Acme Corp',
              city: 'Berlin',
              country: 'DE',
              source: 'Arbeitnow',
              mode: 'Vollzeit',
              salary: '',
              posted: '2026-07-01',
              url: 'https://example.de/jobs/j-acme-1',
              skills: ['React'],
            },
          ],
          more: [],
          liveSourcesDown: false,
        }),
      });
    });
    await page.route('**/api/v1/applications', (route) => {
      const req = route.request();
      if (req.method() === 'POST') {
        const body = JSON.parse(req.postData() || '{}');
        const created = {
          id: 'app-new-1',
          company: body.company,
          position: body.position,
          talentId: body.talentId || null,
          talentName: body.talentName || '',
          status: body.status || 'sent',
          score: null,
          date: '2026-07-01',
          source: body.source || '',
        };
        applications.push(created);
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ application: created }),
        });
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(applications) });
    });
    await page.route('**/api/v1/talents', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/v1/mandates', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    });
    // ApplyModal loads the candidate's documents/attachments before letting the
    // recruiter submit; the pinned "me" candidate has none of either.
    await page.route('**/api/v1/talents/user1/documents', (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({}) }),
    );
    await page.route('**/api/v1/talents/user1/attachments', (route) => {
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

    // Matching folds under Mandate as the "Stellensuche" tab.
    await page.getByRole('button', { name: /Mandate/ }).click();
    await page.getByRole('tab', { name: 'Stellensuche' }).click();
    await page.getByRole('button', { name: 'Manuell' }).click();

    // Search narrows the live postings down to the one specific company.
    await page.getByPlaceholder(/Stelle suchen/).fill('Nordwind');
    await expect(page.locator('main')).toContainText('Nordwind Logistik AG');
    await expect(page.locator('main')).not.toContainText('Acme Corp');

    // "Bewerben" opens the ApplyModal (ZIP download + HTML parsing); submitting
    // there is what actually records the application.
    await page.getByRole('button', { name: /Nora bewerben/ }).click();
    const modal = page.getByRole('dialog', { name: 'Bewerbung vorbereiten' });
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Im System speichern' }).click();
    await expect(modal).toBeHidden();
    await expect(page.getByRole('button', { name: /Beworben · Nora/ })).toBeVisible();

    // The application is recorded and shows up on the Pipeline board.
    await page.getByRole('button', { name: /Pipeline/ }).click();
    await expect(page.locator('main')).toContainText('Nordwind Logistik AG');
    await expect(page.locator('main')).toContainText('Backend Engineer');
  });
});
