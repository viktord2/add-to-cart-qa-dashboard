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

  test('three version sections are present', async ({ page }) => {
    for (const id of ['sec-v1v3', 'sec-v1', 'sec-v3']) {
      await expect(page.locator(`[data-testid="${id}"]`)).toBeVisible();
    }
  });

  test('sections populate with rows after load', async ({ page }) => {
    // wait for at least one tbody to have content
    await page.waitForFunction(() => {
      return document.querySelector('#tbody-v1v3 tr') ||
             document.querySelector('#tbody-v1 tr') ||
             document.querySelector('#tbody-v3 tr');
    }, { timeout: 10000 });
    // at least one section should have rows
    const totalRows =
      await page.locator('#tbody-v1v3 tr.bug-row').count() +
      await page.locator('#tbody-v1 tr.bug-row').count() +
      await page.locator('#tbody-v3 tr.bug-row').count();
    expect(totalRows).toBeGreaterThan(0);
  });

  test('section headers toggle collapse on click', async ({ page }) => {
    const section = page.locator('[data-testid="sec-v1v3"]');
    await expect(section).not.toHaveClass(/collapsed/);

    await section.locator('.section-header').click();
    await expect(section).toHaveClass(/collapsed/);

    await section.locator('.section-header').click();
    await expect(section).not.toHaveClass(/collapsed/);
  });

  test('each bug row links to the correct GitHub issue URL', async ({ page }) => {
    await page.waitForFunction(() => document.querySelector('.bug-row'), { timeout: 10000 });
    const links = page.locator('.bug-row .issue-num a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 5); i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).toMatch(/github\.com\/wix-private\/.+\/issues\/\d+/);
    }
  });

  test('rows within each section are sorted by priority (Critical first)', async ({ page }) => {
    await page.waitForFunction(() => document.querySelector('.bug-row'), { timeout: 10000 });
    const RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    for (const tbodyId of ['tbody-v1v3', 'tbody-v1', 'tbody-v3']) {
      const badges = await page.locator(`#${tbodyId} .bug-row .priority-pill`).allInnerTexts();
      const ranks = badges.filter(b => b in RANK).map(b => RANK[b]);
      for (let i = 1; i < ranks.length; i++) {
        expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1]);
      }
    }
  });

  test('section badges show correct issue counts', async ({ page }) => {
    await page.locator('[data-testid="stat-open"] .number').waitFor({ timeout: 10000 });
    await expect(page.locator('[data-testid="stat-open"] .number')).not.toHaveText('—', { timeout: 10000 });
    const v1Badge   = await page.locator('#badge-v1').innerText();
    const v3Badge   = await page.locator('#badge-v3').innerText();
    const v1v3Badge = await page.locator('#badge-v1v3').innerText();
    expect(v1Badge).toMatch(/\d+ issues/);
    expect(v3Badge).toMatch(/\d+ issues/);
    expect(v1v3Badge).toMatch(/\d+ issues/);
  });
});
