import { test, expect } from '@playwright/test';

test.describe('UI acceptance — the suite renders in English', () => {
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
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('Recruiting_Loads_NavigationIsEnglish', async ({ page }) => {
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user1', email: 'me@example.de' } }),
      }),
    );
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');
    const nav = page.locator('nav');
    await expect(nav.locator('button').first()).toBeVisible();
    // The unified recruiting nav renders these destinations in English.
    await expect(nav).toContainText('Workspace');
    await expect(nav).toContainText('Talent Pool');
    await expect(nav).toContainText('Mandates');
    // Applications is hidden until it has a live data source.
    await expect(nav).not.toContainText('Applications');
    // No German leaked into the navigation.
    await expect(nav).not.toContainText('Übersicht');
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
    await page.getByRole('button', { name: /Talent Pool/ }).click();
    await expect(page.locator('main')).toContainText('Add talent');
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
    await page.getByRole('button', { name: /Mandates/ }).click();
    const main = page.locator('main');
    // first load failed → error state, no fabricated sample client
    await expect(main).toContainText("We couldn't load this data.");
    await expect(main).not.toContainText('Aurora Systems GmbH');
    // retry succeeds → the real mandate renders
    await page.getByRole('button', { name: 'Retry' }).click();
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
    await page.getByRole('button', { name: /Placements/ }).click();
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
    await page.getByRole('button', { name: /Talent Pool/ }).click();
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
    await page.getByRole('button', { name: /Talent Pool/ }).click();
    await page.getByText('Tobias Wirth').first().click();
    await page
      .getByRole('button', { name: /Create resume|Edit resume/ })
      .first()
      .click();
    // opening the editor loads the stored documents
    await expect.poll(() => loaded).toBe(true);
    // editing a field autosaves it (debounced) to the server
    const field = page.locator('main').getByRole('textbox').first();
    await field.fill('E2E-MARKER-NAME');
    await expect(page.locator('main').getByRole('status')).toContainText('Saved', {
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
    await page.getByRole('button', { name: /Talent Pool/ }).click();
    await page.getByText('Tobias Wirth').first().click();
    await page
      .getByRole('button', { name: /Create resume|Edit resume/ })
      .first()
      .click();
    await page.getByRole('button', { name: /To dossier/ }).click();
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
    await page.getByRole('button', { name: /Mandates/ }).click();
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
    await page.getByRole('button', { name: /Mandates/ }).click();
    await expect(page.locator('main')).toContainText('No mandates yet.');

    await page.getByRole('button', { name: 'New mandate' }).click();
    await page.getByLabel('Client', { exact: true }).fill('Helio GmbH');
    await page.getByLabel('Role', { exact: true }).fill('Principal Platform Engineer');
    await page.getByLabel('Location', { exact: true }).fill('Hamburg · Remote');
    await page.getByRole('button', { name: 'Create mandate' }).click();

    // the form closed and the new mandate is listed
    await expect(page.getByRole('button', { name: 'Create mandate' })).toBeHidden();
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
    await page.getByRole('button', { name: /Mandates/ }).click();
    const main = page.locator('main');
    await expect(main).toContainText('active');

    // open the edit form pre-filled, change the status, save
    await main.getByText('Principal Platform Engineer').click();
    await expect(page.getByText('Edit mandate')).toBeVisible();
    await expect(page.getByLabel('Client', { exact: true })).toHaveValue('Helio GmbH');
    await page.getByLabel('Status', { exact: true }).selectOption('paused');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByRole('button', { name: 'Save changes' })).toBeHidden();
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
    await expect(main).toContainText('1 active mandates');
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
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await page.getByPlaceholder('you@example.com').fill('me@example.de');
    await page.getByPlaceholder('••••••••').fill('supersecret');
    await page.locator('button[type="submit"]').click();
    // signed in → the workspace navigation is shown
    await expect(page.getByRole('button', { name: /Talent Pool/ })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    const passwords = page.getByPlaceholder('••••••••');
    await passwords.nth(0).fill('brand-new-password');
    await passwords.nth(1).fill('brand-new-password');
    await page.locator('button[type="submit"]').click();
    // back to login with a success notice; the token was forwarded to the API
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('password has been reset');
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
    await page.getByRole('button', { name: /Settings/ }).click();
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
    await page.getByRole('button', { name: /Settings/ }).click();
    await expect(page.locator('main')).toContainText('Data & privacy');
    // clicking Export triggers a JSON file download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export' }).click(),
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
    await page.getByRole('button', { name: /Settings/ }).click();
    // two-step confirm before the destructive call
    await page.getByRole('button', { name: 'Delete account' }).click();
    await page.getByRole('button', { name: 'Confirm delete' }).click();
    // erasure ends the session → the app reloads to the login screen (the
    // reload re-fetches the bundle, so allow extra time for it to re-mount)
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({
      timeout: 15000,
    });
  });
});
