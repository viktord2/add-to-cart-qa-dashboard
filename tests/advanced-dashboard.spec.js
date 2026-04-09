const { test, expect } = require('@playwright/test');

test.describe('Advanced Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advanced-dashboard.html');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Bug Status Report/i);
  });

  test('header shows title and back link', async ({ page }) => {
    await expect(page.locator('.header-title')).toContainText('Add to Cart');
    const backLink = page.locator('a.back-link');
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', 'index.html');
  });

  test('theme toggle switches data-theme attribute', async ({ page }) => {
    const initial = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.locator('[data-testid="theme-toggle"]').click();
    const next = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(next).not.toBe(initial);
  });

  test('four stat cards are visible', async ({ page }) => {
    for (const id of ['stat-open', 'stat-v1', 'stat-v3', 'stat-v1v3']) {
      await expect(page.locator(`[data-testid="${id}"]`)).toBeVisible({ timeout: 10000 });
    }
  });

  test('stat cards show numeric values', async ({ page }) => {
    for (const id of ['stat-open', 'stat-v1', 'stat-v3', 'stat-v1v3']) {
      const el = page.locator(`[data-testid="${id}"] .number`);
      await expect(el).not.toHaveText('—', { timeout: 10000 });
      const text = await el.innerText();
      expect(Number(text)).toBeGreaterThanOrEqual(0);
    }
  });

  test('open bugs count equals v1 + v3 + v1v3', async ({ page }) => {
    await page.locator('[data-testid="stat-open"] .number').waitFor({ timeout: 10000 });
    const open = Number(await page.locator('[data-testid="stat-open"] .number').innerText());
    const v1   = Number(await page.locator('[data-testid="stat-v1"] .number').innerText());
    const v3   = Number(await page.locator('[data-testid="stat-v3"] .number').innerText());
    const v1v3 = Number(await page.locator('[data-testid="stat-v1v3"] .number').innerText());
    expect(open).toBe(v1 + v3 + v1v3);
  });
});
