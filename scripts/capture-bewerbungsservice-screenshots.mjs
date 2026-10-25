/* global fetch, console */
/* Screenshot capture for the Bewerbungsservice README (Phases 0-6).
   Drives the real app: registers a demo admin, walks the application-first
   views and saves PNGs to docs/images.
   Requires: server on PORT 4188 (STORE=fs, AGENT_FAKE=1, a dummy LLM key so
   the AI buttons are enabled) and `npm run seed:demo`.
   Run: node scripts/capture-bewerbungsservice-screenshots.mjs */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(dir, '..', 'docs', 'images');
const BASE = 'http://127.0.0.1:4188';
const APP = `${BASE}/design/myjob/ui_kits/recruiting/dist/index.html`;

async function register() {
  const res = await fetch(`${BASE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'screenshots@example.com', password: 'Screenshots123!' }),
  });
  if (res.status >= 400) {
    const login = await fetch(`${BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'screenshots@example.com', password: 'Screenshots123!' }),
    });
    if (login.status >= 400) throw new Error(`auth failed: ${login.status}`);
    return login.headers.getSetCookie().map((c) => c.split(';')[0]);
  }
  return res.headers.getSetCookie().map((c) => c.split(';')[0]);
}

const browser = await chromium.launch();
try {
  const cookies = await register();
  console.log('session cookie obtained');

  // 1) Login screen (fresh context, no cookie).
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(APP);
    await page.getByRole('button', { name: 'Anmelden' }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, 'bewerbungsservice-login.png') });
    await ctx.close();
  }

  // 2) Authenticated context for the rest.
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await ctx.addCookies(
    cookies.map((c) => {
      const [name, ...rest] = c.split('=');
      return { name, value: rest.join('='), domain: '127.0.0.1', path: '/' };
    }),
  );
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${e.stack || ''}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });

  const openView = async (label) => {
    await page
      .getByRole('button', { name: new RegExp(`^${label}$`) })
      .first()
      .click();
    await page.waitForTimeout(900);
  };
  const shot = async (file) => {
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, file) });
    console.log(`  ✓ ${file}`);
  };

  await page.goto(APP);
  await page.getByRole('button', { name: 'Workspace' }).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);
  await shot('bewerbungsservice-workspace.png');

  await openView('Stellen');
  await shot('bewerbungsservice-stellen.png');

  // Chat agent (AGENT_FAKE drives a deterministic script).
  await openView('Workspace');
  await page.getByTestId('agent-action').click();
  await page.getByTestId('agent-panel').waitFor({ timeout: 15000 });
  const input = page.getByTestId('chat-input');
  await input.fill('Bereite eine Bewerbung für Max Mustermann vor');
  await page.getByTestId('chat-send').click();
  await page.waitForTimeout(6000);
  await shot('bewerbungsservice-agent.png');
  await page.getByTestId('agent-close').click();
  await page.waitForTimeout(600);

  await openView('Bewerbungen');
  await shot('bewerbungsservice-bewerbungen.png');

  // Editor: open the seeded draft application.
  await page.getByText('Senior Software Engineer').first().click();
  await page.getByTestId('mappe-pdf').waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  await shot('bewerbungsservice-editor.png');

  // Consent dialog: first AI action (Magic Pen on the summary).
  await page.locator('[data-testid="pen-summary"]').first().click();
  await page.getByTestId('ai-consent-dialog').waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  await shot('bewerbungsservice-consent.png');
  // Close without accepting: the screenshots must not depend on a live LLM
  // (the dummy key would answer 502 and pollute the console-error check).
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);

  // Reload back to the Workspace shell (session cookie persists), then settings.
  await page.goto(APP);
  await page.getByRole('button', { name: 'Workspace' }).first().waitFor({ timeout: 30000 });
  await openView('Einstellungen');
  await shot('bewerbungsservice-einstellungen.png');

  await ctx.close();
  console.log(
    errors.length ? `Console/Page-Errors:\n${errors.join('\n')}` : 'No console/page errors.',
  );
} finally {
  await browser.close();
}
