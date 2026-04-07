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

  test.describe('Assignees', () => {
    test('every ticket row has an assignee cell', async ({ page }) => {
      await page.locator('[data-testid="ticket-list"] .ticket-row').first().waitFor({ timeout: 10000 });

      const rows = page.locator('[data-testid="ticket-list"] .ticket-row');
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        await expect(rows.nth(i).locator('.ticket-assignees')).toBeVisible();
      }
    });

    test('each ticket shows either an avatar or a dash placeholder', async ({ page }) => {
      await page.locator('[data-testid="ticket-list"] .ticket-row').first().waitFor({ timeout: 10000 });

      const rows = page.locator('[data-testid="ticket-list"] .ticket-row');
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        const cell = rows.nth(i).locator('.ticket-assignees');
        const hasAvatar = await cell.locator('.assignee-avatar').count() > 0;
        const hasDash  = await cell.locator('.assignee-unassigned').count() > 0;
        expect(hasAvatar || hasDash).toBe(true);
      }
    });

    test('assigned tickets show an avatar with login as title', async ({ page }) => {
      await page.locator('[data-testid="ticket-list"] .ticket-row').first().waitFor({ timeout: 10000 });

      const avatars = page.locator('.ticket-assignees .assignee-avatar');
      if (await avatars.count() > 0) {
        const title = await avatars.first().getAttribute('title');
        expect(title).toBeTruthy();
        const src = await avatars.first().getAttribute('src');
        expect(src).toMatch(/avatars\.githubusercontent\.com/);
      }
    });
  });

  test.describe('Test Environments block', () => {
    test('shows V3_CATALOG and V1_CATALOG entries', async ({ page }) => {
      await expect(page.locator('.env-block')).toBeVisible();
      await expect(page.locator('.env-block')).toContainText('V3_CATALOG');
      await expect(page.locator('.env-block')).toContainText('V1_CATALOG');
    });

    test('displays correct msid values', async ({ page }) => {
      await expect(page.locator('.env-block')).toContainText('e9eea3e8-a1f7-4efa-ba01-ff4a7f03d5cf');
      await expect(page.locator('.env-block')).toContainText('58526119-e8bc-4272-a980-1967a392eaf8');
    });

    test('displays correct URLs as links', async ({ page }) => {
      const v3Link = page.locator('.env-block a[href="https://www.addtocartcatalogv3.com/"]');
      const v1Link = page.locator('.env-block a[href="https://www.euro2024.shop/"]');
      await expect(v3Link).toBeVisible();
      await expect(v1Link).toBeVisible();
    });

    test('V3_CATALOG msid copy button copies to clipboard', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      const btn = page.getByTestId('copy-v3-msid');
      await expect(btn).toBeVisible();
      await btn.click();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      expect(copied).toBe('e9eea3e8-a1f7-4efa-ba01-ff4a7f03d5cf');
    });

    test('V1_CATALOG msid copy button copies to clipboard', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      const btn = page.getByTestId('copy-v1-msid');
      await expect(btn).toBeVisible();
      await btn.click();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      expect(copied).toBe('58526119-e8bc-4272-a980-1967a392eaf8');
    });

    test('copy button shows checkmark feedback after click', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      const btn = page.getByTestId('copy-v3-msid');
      await btn.click();
      await expect(btn).toContainText('✓');
      await expect(btn).toHaveClass(/copied/);
    });

    test('shows queen-peptides V3_CATALOG msid', async ({ page }) => {
      await expect(page.locator('.env-block')).toContainText('04c6f6c9-4fb0-4a6a-a95a-dd189d27cc08');
    });

    test('displays queen-peptides URL as a link', async ({ page }) => {
      const link = page.locator('.env-block a[href="https://viktord71.wixsite.com/v3-queenpeptides"]');
      await expect(link).toBeVisible();
    });

    test('queen-peptides V3_CATALOG name links to simulations page', async ({ page }) => {
      const link = page.locator('.env-block .env-name a[href="./docs/simulations/v3-queen-peptides-simulations.html"]');
      await expect(link).toBeVisible();
      await expect(link).toContainText('V3_CATALOG');
    });

    test('queen-peptides msid copy button copies correct value to clipboard', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      const btn = page.getByTestId('copy-v3-queenpeptides-msid');
      await expect(btn).toBeVisible();
      await btn.click();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      expect(copied).toBe('04c6f6c9-4fb0-4a6a-a95a-dd189d27cc08');
    });
  });
});
