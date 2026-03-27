const { test, expect } = require('@playwright/test');

test.describe('Add to Cart Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads and displays GitHub issues', async ({ page }) => {
    const ticketList = page.getByTestId('ticket-list');
    await expect(ticketList).toBeVisible();

    // wait for skeleton loaders to be replaced by real rows
    await expect(page.locator('[data-testid="ticket-list"] .ticket-row').first()).toBeVisible({ timeout: 10000 });

    const rows = page.locator('[data-testid="ticket-list"] .ticket-row');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shows correct total ticket count in summary card', async ({ page }) => {
    const card = page.getByTestId('card-total');
    await expect(card).toBeVisible();

    // wait for the number to appear (skeleton replaced)
    const value = card.locator('.value');
    await expect(value).toBeVisible({ timeout: 10000 });

    const text = await value.innerText();
    expect(Number(text)).toBeGreaterThan(0);
  });

  test('shows To Triage and Done counts', async ({ page }) => {
    const triage = page.getByTestId('card-triage').locator('.value');
    const done = page.getByTestId('card-done').locator('.value');

    await expect(triage).toBeVisible({ timeout: 10000 });
    await expect(done).toBeVisible({ timeout: 10000 });

    expect(Number(await triage.innerText())).toBeGreaterThanOrEqual(0);
    expect(Number(await done.innerText())).toBeGreaterThanOrEqual(0);
  });

  test('Fixed % card displays a percentage', async ({ page }) => {
    const fixed = page.getByTestId('card-fixed').locator('.value');
    await expect(fixed).toBeVisible({ timeout: 10000 });
    await expect(fixed).toContainText('%');
  });

  test('theme toggle button is present and switches theme', async ({ page }) => {
    const btn = page.getByTestId('theme-toggle');
    await expect(btn).toBeVisible();

    const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    await btn.click();
    const newTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(newTheme).not.toBe(initialTheme);
  });

  test('refresh button is present and clickable', async ({ page }) => {
    const btn = page.getByTestId('refresh-btn');
    await expect(btn).toBeVisible();
    await btn.click();
    // spinner should appear briefly
    await expect(btn).toBeEnabled();
  });

  test('each ticket row links to the correct GitHub issue', async ({ page }) => {
    await page.locator('[data-testid="ticket-list"] .ticket-row').first().waitFor({ timeout: 10000 });

    const firstLink = page.locator('[data-testid="ticket-list"] .ticket-row a').first();
    await expect(firstLink).toBeVisible();

    const href = await firstLink.getAttribute('href');
    expect(href).toMatch(/github\.com\/wix-private\/.+\/issues\/\d+/);
  });
});
