/* global process, console */
/* One-off screenshot capture for the README. Drives the (Vite-built) recruiting
   app with stubbed auth + sample data and saves PNGs to docs/images.
   Run locally:  node scripts/capture-screenshots.mjs
   Requires the server running on PORT 4188 and the web bundle built. */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(dir, '..', 'docs', 'images');
const BASE = 'http://127.0.0.1:4188';
const APP = `${BASE}/design/myjob/ui_kits/recruiting/dist/index.html`;
const EXEC = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const user = { id: 'user1', email: 'recruiter@aurora.example' };

const mandates = [
  {
    id: 'ma1',
    client: 'Aurora Systems GmbH',
    role: 'Senior C++ Engineer',
    location: 'Berlin · Hybrid',
    fee: '22%',
    feeValue: '17.160 €',
    deadline: '2026-07-30',
    priority: 'high',
    status: 'active',
    submitted: 4,
    interviews: 2,
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },
  {
    id: 'ma2',
    client: 'Aurora Systems GmbH',
    role: 'DevOps Engineer',
    location: 'Berlin',
    fee: '20%',
    feeValue: '14.000 €',
    deadline: '2026-08-15',
    priority: 'medium',
    status: 'active',
    submitted: 2,
    interviews: 1,
    createdAt: '2026-06-02T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },
  {
    id: 'ma3',
    client: 'Nordlicht Software',
    role: 'Backend Engineer',
    location: 'Hamburg',
    fee: '22%',
    feeValue: '16.500 €',
    deadline: '2026-07-20',
    priority: 'high',
    status: 'active',
    submitted: 3,
    interviews: 1,
    createdAt: '2026-06-03T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },
  {
    id: 'ma4',
    client: 'Meridian Labs',
    role: 'Distributed Systems Eng.',
    location: 'Remote',
    fee: '24%',
    feeValue: '19.800 €',
    deadline: '2026-08-01',
    priority: 'medium',
    status: 'active',
    submitted: 2,
    interviews: 1,
    createdAt: '2026-06-04T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },
];

const talents = [
  {
    id: 't2',
    name: 'Lena Brandt',
    role: 'Product Designer',
    headline: 'B2B-SaaS · Design Systems',
    location: 'Leipzig',
    email: 'lena.brandt@example.de',
    phone: '',
    availability: 'in 6 weeks',
    salary: '64.000 €',
    skills: ['Figma', 'Design Systems', 'Prototyping'],
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 't3',
    name: 'Marco Adler',
    role: 'DevOps Engineer',
    headline: 'Cloud · Automation',
    location: 'Munich',
    email: 'marco.adler@example.de',
    phone: '',
    availability: 'immediately',
    salary: '72.000 €',
    skills: ['Terraform', 'AWS', 'CI/CD', 'Go'],
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 't4',
    name: 'Aylin Demir',
    role: 'UX Researcher',
    headline: 'Qualitative Research',
    location: 'Berlin',
    email: 'aylin.demir@example.de',
    phone: '',
    availability: 'in 2 months',
    salary: '66.000 €',
    skills: ['User Research', 'Interviews', 'Figma'],
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
];

const placements = [
  {
    id: 'pl1',
    candidateName: 'Mara Vogel',
    candidateRole: 'Engineering Manager',
    client: 'Aurora Systems GmbH',
    start: '2026-07-01',
    fee: '19.000 €',
    status: 'invoiced',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'pl2',
    candidateName: 'Lena Brandt',
    candidateRole: 'Brand Designer',
    client: 'Nordlicht Software',
    start: '2026-06-15',
    fee: '12.600 €',
    status: 'paid',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'pl3',
    candidateName: 'Aylin Demir',
    candidateRole: 'UX Researcher',
    client: 'Meridian Labs',
    start: '2026-08-01',
    fee: '17.000 €',
    status: 'probation',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
];

const json = (body) => ({ contentType: 'application/json', body: JSON.stringify(body) });

async function stub(page) {
  await page.route('**/api/v1/auth/me', (r) => r.fulfill(json({ user })));
  await page.route('**/api/v1/auth/providers', (r) =>
    r.fulfill(json({ google: true, linkedin: true })),
  );
  await page.route('**/api/v1/mandates', (r) =>
    r.request().method() === 'GET' ? r.fulfill(json(mandates)) : r.continue(),
  );
  await page.route('**/api/v1/talents', (r) =>
    r.request().method() === 'GET' ? r.fulfill(json(talents)) : r.continue(),
  );
  await page.route('**/api/v1/placements', (r) =>
    r.request().method() === 'GET' ? r.fulfill(json(placements)) : r.continue(),
  );
  await page.route('**/api/v1/settings/llm', (r) =>
    r.fulfill(
      json({
        current: 'claude',
        providers: [
          { id: 'claude', label: 'Claude (Anthropic)', available: true },
          { id: 'gemini', label: 'Gemini (Google)', available: false },
        ],
      }),
    ),
  );
}

const shots = [
  { name: 'myjob-overview', nav: null },
  { name: 'myjob-mandates', nav: /Mandates/ },
  { name: 'myjob-talent-pool', nav: /Talent Pool/ },
  { name: 'myjob-placements', nav: /Placements/ },
  { name: 'myjob-reports', nav: /Reports/ },
];

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({
  viewport: { width: 1360, height: 880 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await stub(page);

for (const s of shots) {
  await page.goto(APP);
  await page.getByRole('button', { name: /Talent Pool/ }).waitFor();
  if (s.nav) await page.getByRole('button', { name: s.nav }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `${s.name}.png`) });
  console.log('captured', s.name);
}

// Login screen (no session)
const loginPage = await ctx.newPage();
await loginPage.route('**/api/v1/auth/me', (r) => r.fulfill(json({ user: null })));
await loginPage.route('**/api/v1/auth/providers', (r) =>
  r.fulfill(json({ google: true, linkedin: true })),
);
await loginPage.goto(APP);
await loginPage.getByRole('heading', { name: 'Welcome back' }).waitFor();
await loginPage.waitForTimeout(500);
await loginPage.screenshot({ path: path.join(OUT, 'myjob-login.png') });
console.log('captured myjob-login');

await browser.close();
