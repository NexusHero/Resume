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
    await page.goto('/design/myjob/ui_kits/recruiting/index.html');
    const nav = page.locator('nav button');
    await expect(nav.first()).toBeVisible();
    await expect(nav).toContainText(['Overview', 'Talent Pool', 'Applications']);
    await expect(page.locator('nav')).not.toContainText('Übersicht');
  });

  test('Recruiting_OpenTalentPool_ShowsTalents', async ({ page }) => {
    await page.goto('/design/myjob/ui_kits/recruiting/index.html');
    await page.getByRole('button', { name: /Talent Pool/ }).click();
    await expect(page.locator('main')).toContainText('Add talent');
    await expect(page.locator('main')).toContainText('Suhay Sevinc');
  });

  test('Karriere_Jobsuche_ShowsTwoMatchTiers', async ({ page }) => {
    await page.goto('/design/myjob/ui_kits/karriere/index.html');
    await page.getByRole('button', { name: /Jobsuche/ }).click();
    const main = page.locator('main');
    // pre-configured search ran on open → both tiers visible
    await expect(main).toContainText('Top-Treffer');
    await expect(main).toContainText('Weitere & Entwicklungschancen');
    // "Nur Top-Treffer" collapses the stretch tier
    await page.getByRole('button', { name: /Nur Top-Treffer/ }).click();
    await expect(main).not.toContainText('Weitere & Entwicklungschancen');
  });
});
