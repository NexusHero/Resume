import { test, expect, type Page, type Route } from '@playwright/test';
import path from 'node:path';
import { readFileSync } from 'node:fs';

/**
 * Tote-Buttons-Audit (AK-6.2, plan §4). Enumerates the eight main-path views
 * (Vermittlung **off**), applies the rule — `disabled` with `title`/`aria-label`
 * **or** declared in the per-view audit map **or** a click produces a visible
 * effect — and collects console/page errors plus an axe scan per view.
 *
 * The audit map is the declarative drift barrier: a new button without a declared
 * effect (and without `disabled`+`title`) fails the test. It lists the known
 * acting buttons per view so the audit does not need a hand-written click per
 * button (determinism, no flaky "click everything").
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
  skills: ['Go'],
};

const POSTING = {
  id: 'p1',
  ownerId: 'team',
  source: 'text',
  company: 'Nordwind Logistik AG',
  title: 'Backend Engineer',
  location: 'Hamburg',
  country: 'DE',
  description: 'We need distributed systems.',
  requirements: ['Go'],
  descriptionIncomplete: false,
  createdAt: '2026-06-25T10:00:00.000Z',
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
    resume: { summary: 'Backend.', experience: [], education: [], skillGroups: [], rawText: '' },
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

/** Declarative audit map: view → button labels that act (the audit trusts them). */
const AUDIT_MAP: Record<string, RegExp[]> = {
  Workspace: [/Add candidate/, /New job/, /^Agent$/, /^Settings$/],
  Candidates: [/Add candidate/, /Import CVs/],
  TalentProfile: [
    /(Create CV|Edit CV)/,
    /Back/,
    /^(CV|Attachments|Applications)$/,
    /^(All|Draft|Sent|Interview|Offer|Rejected)$/,
    // "Upload" opens the OS file chooser (plan §11.2.1: effect = file chooser,
    // covered by the existing attachment-upload e2e) — don't click (flaky).
    /Upload/,
  ],
  Jobs: [/Add job posting/, /Find jobs/, /Saved/, /^Jobs$/],
  Applications: [
    /Create application/,
    /^Applications$/,
    /^(All|Draft|Sent|Interview|Offer|Rejected)$/,
  ],
  BewerbungsEditor: [
    /Generate cover letter/,
    /Adjust everything for this job/,
    /Dossier as (PDF|ZIP)/,
    /Save attachments/,
    /Back to applications/,
    /Draft|Sent|Interview|Offer|Rejected/,
  ],
  Settings: [/AI connection/, /^Workspace$/, /Data & privacy/, /^(Light|Dark|System)$/],
  ChatPanel: [/^Send$/, /Cancel/],
};

function auditMapFor(view: string): RegExp[] {
  return AUDIT_MAP[view] ?? [];
}

/** Mock the main-path shell (Vermittlung off, AI configured, consent granted). */
async function mockShell(page: Page, opts: { populated: boolean }) {
  // Catch-all first (lowest priority): any API route we don't explicitly mock
  // returns 200/[] so an unmocked endpoint never 401s into the console collector.
  await page.route('**/api/v1/**', (route) => {
    const method = route.request().method();
    return method === 'GET'
      ? route.fulfill({ contentType: 'application/json', body: '[]' })
      : route.fulfill({ contentType: 'application/json', body: '{}' });
  });
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
  const list = (route: Route, items: unknown[]) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(items) });
  await page.route('**/api/v1/talents', (route) => list(route, opts.populated ? [TALENT] : []));
  await page.route('**/api/v1/talents/t-api-1/documents', (route) => list(route, DOCS));
  await page.route('**/api/v1/job-postings', (route) =>
    list(route, opts.populated ? [POSTING] : []),
  );
  await page.route('**/api/v1/job-applications', (route) => list(route, []));
  await page.route('**/api/v1/jobs', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ top: [], more: [], liveSourcesDown: false }),
    }),
  );
}

/** Collect console errors / page errors for a run. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/**
 * The audit rule for one view: every visible button is `disabled`+title/aria-label,
 * declared in the audit map, or a click produces a visible effect.
 */
async function auditView(
  page: Page,
  view: string,
  open: () => Promise<void>,
): Promise<{ label: string; reason: string }[]> {
  const problems: { label: string; reason: string }[] = [];
  const declared = auditMapFor(view);
  const buttons = page.locator('main button, main [role="button"]');
  const count = await buttons.count();
  for (let i = 0; i < count; i += 1) {
    const btn = buttons.nth(i);
    if (!(await btn.isVisible())) continue;
    const label = ((await btn.getAttribute('aria-label')) || (await btn.innerText()) || '').trim();
    const name = label || `(button ${i})`;

    if (await btn.isDisabled()) {
      const title = (await btn.getAttribute('title')) || '';
      const aria = (await btn.getAttribute('aria-label')) || '';
      if (!title && !aria)
        problems.push({ label: name, reason: 'disabled without title/aria-label' });
      continue;
    }
    if (declared.some((re) => re.test(name))) continue;

    // Click and observe a visible effect (dialog, toast, URL/tab change,
    // aria-selected/active-tab switch, DOM change).
    const before = await page.locator('main').innerText();
    const urlBefore = page.url();
    const tabStateBefore = await page.evaluate(() =>
      JSON.stringify(
        Array.from(document.querySelectorAll('[aria-selected]')).map((el) =>
          el.getAttribute('aria-selected'),
        ),
      ),
    );
    try {
      await btn.click({ timeout: 1500 });
      await page.waitForTimeout(200);
    } catch {
      problems.push({ label: name, reason: 'click threw' });
      continue;
    }
    const after = await page.locator('main').innerText();
    const dialogVisible = (await page.locator('[role="dialog"]').count()) > 0;
    const urlChanged = page.url() !== urlBefore;
    const tabStateAfter = await page.evaluate(() =>
      JSON.stringify(
        Array.from(document.querySelectorAll('[aria-selected]')).map((el) =>
          el.getAttribute('aria-selected'),
        ),
      ),
    );
    const tabChanged = tabStateBefore !== tabStateAfter;
    if (before === after && !dialogVisible && !urlChanged && !tabChanged) {
      problems.push({ label: name, reason: 'no visible effect on click' });
    }
    await page.keyboard.press('Escape').catch(() => undefined);
  }
  return problems;
}

test.describe('Button audit (AK-6.2)', () => {
  const runView = async (page: Page, view: string, open: () => Promise<void>) => {
    const errors = collectErrors(page);
    await mockShell(page, { populated: true });
    await page.goto(KIT);
    await open();
    const problems = await auditView(page, view, open);
    expect(problems, `${view}: every button acts or is disabled+title`).toEqual([]);
    expect(errors, `${view}: no console errors`).toEqual([]);
  };

  test('ButtonAudit_WorkspaceView_EveryButtonActsOrDisabled', async ({ page }) => {
    await runView(page, 'Workspace', async () => {
      await page
        .locator('nav')
        .getByRole('button', { name: /Workspace/ })
        .click();
    });
  });

  test('ButtonAudit_CandidatesView_EveryButtonActsOrDisabled', async ({ page }) => {
    await runView(page, 'Candidates', async () => {
      await page
        .locator('nav')
        .getByRole('button', { name: /Candidates/ })
        .click();
    });
  });

  test('ButtonAudit_TalentProfileView_EveryButtonActsOrDisabled', async ({ page }) => {
    await runView(page, 'TalentProfile', async () => {
      await page
        .locator('nav')
        .getByRole('button', { name: /Candidates/ })
        .click();
      await page.getByText('Tobias Wirth').first().click({ force: true });
    });
  });

  test('ButtonAudit_JobsView_EveryButtonActsOrDisabled', async ({ page }) => {
    await runView(page, 'Jobs', async () => {
      await page
        .locator('nav')
        .getByRole('button', { name: /^Jobs$/ })
        .click();
    });
  });

  test('ButtonAudit_ApplicationsView_EveryButtonActsOrDisabled', async ({ page }) => {
    await runView(page, 'Applications', async () => {
      await page
        .locator('nav')
        .getByRole('button', { name: /^Applications$/ })
        .click();
    });
  });

  test('ButtonAudit_BewerbungsEditorView_EveryButtonActsOrDisabled', async ({ page }) => {
    const errors = collectErrors(page);
    await mockShell(page, { populated: true });
    const app = {
      id: 'app-1',
      ownerId: 'team',
      jobPostingId: POSTING.id,
      postingCompany: POSTING.company,
      postingTitle: POSTING.title,
      talentId: TALENT.id,
      talentName: TALENT.name,
      status: 'draft',
      statusHistory: [{ status: 'draft', at: '2026-06-25T10:00:00.000Z' }],
      documents: DOCS.documents,
      selectedAttachmentIds: [],
      createdAt: '2026-06-25T10:00:00.000Z',
      updatedAt: '2026-06-25T10:00:00.000Z',
    };
    await page.route('**/api/v1/job-applications', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify([app]) }),
    );
    await page.route('**/api/v1/job-applications/app-1', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ jobApplication: app }),
      }),
    );
    await page.route('**/api/v1/job-applications/*/documents', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify(DOCS) }),
    );
    await page.route('**/api/v1/talents/t-api-1/attachments', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) }),
    );

    await page.goto(KIT);
    await page
      .locator('nav')
      .getByRole('button', { name: /^Applications$/ })
      .click();
    await page.getByText('Nordwind Logistik AG').first().click();
    await page.locator('[data-doc-hydrated="true"]').waitFor();

    const problems = await auditView(page, 'BewerbungsEditor', async () => undefined);
    expect(problems).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('ButtonAudit_SettingsView_EveryButtonActsOrDisabled', async ({ page }) => {
    await runView(page, 'Settings', async () => {
      await page
        .getByRole('button', { name: /Settings/ })
        .first()
        .click();
    });
  });

  test('ButtonAudit_ChatPanel_EveryButtonActsOrDisabled', async ({ page }) => {
    await runView(page, 'ChatPanel', async () => {
      await page.getByRole('button', { name: 'Agent' }).click();
    });
  });

  test('ButtonAudit_AllViews_NoConsoleErrors', async ({ page }) => {
    const errors = collectErrors(page);
    await mockShell(page, { populated: true });
    await page.goto(KIT);
    for (const view of ['Workspace', 'Candidates', 'Jobs', 'Applications']) {
      await page
        .locator('nav')
        .getByRole('button', { name: new RegExp(`^${view}$`) })
        .click();
      await page.waitForTimeout(150);
    }
    expect(errors).toEqual([]);
  });

  test('ButtonAudit_AllViews_AxeNoViolations', async ({ page }) => {
    // Inject axe via addInitScript (CSP-safe: the app sets `script-src 'self'`,
    // which blocks page.addScriptTag's inline <script>).
    const axeSource = readFileSync(
      path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'),
      'utf8',
    );
    await page.addInitScript({ content: axeSource });
    await mockShell(page, { populated: true });
    await page.goto(KIT);
    for (const view of ['Workspace', 'Candidates', 'Jobs', 'Applications']) {
      await page
        .locator('nav')
        .getByRole('button', { name: new RegExp(`^${view}$`) })
        .click();
      await page.waitForTimeout(150);
      const results = await page.evaluate(async () => {
        // @ts-expect-error axe is injected as a global
        return window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
        });
      });
      const violations = results.violations as Array<{ id: string; impact: string }>;
      expect(violations, `${view}: no axe violations`).toEqual([]);
    }
  });
});
