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
    await page
      .locator('nav')
      .getByRole('button', { name: /Mandanten/ })
      .click();
    await page.getByText('Tobias Wirth').first().click({ force: true });
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
    await page.route('**/api/v1/job-postings', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.goto('/design/myjob/ui_kits/recruiting/dist/index.html');

    // Stellen opens the saved-postings list; the portal search is the "Stellen
    // finden" sub-tab.
    await page
      .locator('nav')
      .getByRole('button', { name: /^Stellen$/ })
      .click();
    await page.getByRole('tab', { name: 'Stellen finden' }).click();
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

    // The application is recorded and shows up on the Bewerbungen board.
    await page
      .locator('nav')
      .getByRole('button', { name: /^Bewerbungen$/ })
      .click();
    await expect(page.locator('main')).toContainText('Nordwind Logistik AG');
    await expect(page.locator('main')).toContainText('Backend Engineer');
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
