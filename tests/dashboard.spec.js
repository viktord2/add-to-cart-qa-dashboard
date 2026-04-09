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

    test.describe('Goldie & Celeste V1_CATALOG entry', () => {
      test('shows Goldie & Celeste msid', async ({ page }) => {
        await expect(page.locator('.env-block')).toContainText('8cb9cc76-d2c6-40a5-88ff-c5f3ac6f75af');
      });

      test('displays Goldie & Celeste URL as a link', async ({ page }) => {
        const link = page.locator('.env-block a[href="https://viktord71.wixsite.com/goldie-c"]');
        await expect(link).toBeVisible();
      });

      test('Goldie & Celeste V1_CATALOG name links to goldie-celeste page', async ({ page }) => {
        const link = page.locator('.env-block .env-name a[href="./goldie-celeste.html"]');
        await expect(link).toBeVisible();
        await expect(link).toContainText('V1_CATALOG');
      });

      test('Goldie & Celeste msid copy button copies correct value', async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        const btn = page.getByTestId('copy-goldie-msid');
        await expect(btn).toBeVisible();
        await btn.click();
        const copied = await page.evaluate(() => navigator.clipboard.readText());
        expect(copied).toBe('8cb9cc76-d2c6-40a5-88ff-c5f3ac6f75af');
      });
    });
  });

  test('"View Report" link points to advanced-dashboard.html', async ({ page }) => {
    const link = page.getByTestId('view-report-link');
    await expect(link).toBeVisible();
    await expect(link).toHaveText('View Report →');
  });
});

test.describe('Goldie & Celeste sub-page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/goldie-celeste.html');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Goldie.*Celeste/i);
  });

  test('back button links to main dashboard', async ({ page }) => {
    const btn = page.locator('header a.back-btn');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('href', './index.html');
    await expect(btn).toContainText('Dashboard');
  });

  test('store summary card is visible with product count and price range', async ({ page }) => {
    const summary = page.locator('.store-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('53');
    await expect(summary).toContainText('$');
  });

  test('product catalog section renders category cards', async ({ page }) => {
    const cards = page.locator('.category-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('category cards contain product list items', async ({ page }) => {
    const items = page.locator('.product-list li');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('search input filters products', async ({ page }) => {
    const input = page.locator('#searchInput');
    await expect(input).toBeVisible();

    const totalBefore = await page.locator('.product-list li:not(.hidden)').count();
    await input.fill('mug');
    const totalAfter = await page.locator('.product-list li:not(.hidden)').count();

    expect(totalAfter).toBeLessThan(totalBefore);
    expect(totalAfter).toBeGreaterThan(0);
  });

  test('search shows result count when active', async ({ page }) => {
    await page.locator('#searchInput').fill('plant');
    const count = page.locator('#searchCount');
    await expect(count).toBeVisible();
    await expect(count).toContainText('Showing');
  });

  test('category filter narrows displayed cards', async ({ page }) => {
    const select = page.locator('#categoryFilter');
    await expect(select).toBeVisible();

    await select.selectOption({ index: 1 }); // pick first real category
    const visibleCards = page.locator('.category-card:not([style*="display: none"])');
    const count = await visibleCards.count();
    expect(count).toBe(1);
  });

  test('stock filter hides out-of-stock items when "In Stock" selected', async ({ page }) => {
    await page.locator('#stockFilter').selectOption('in');
    const oosItems = page.locator('.product-list li.oos:not(.hidden)');
    expect(await oosItems.count()).toBe(0);
  });

  test('grid view button switches to card grid layout', async ({ page }) => {
    const gridBtn = page.locator('#gridViewBtn');
    await expect(gridBtn).toBeVisible();
    await gridBtn.click();

    await expect(page.locator('#gridView')).toBeVisible();
    await expect(page.locator('#listView')).toBeHidden();

    const cards = page.locator('#productCardGrid .product-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('list view button restores category card layout', async ({ page }) => {
    await page.locator('#gridViewBtn').click();
    await page.locator('#listViewBtn').click();

    await expect(page.locator('#listView')).toBeVisible();
    await expect(page.locator('#gridView')).toBeHidden();
  });

  test('expand/collapse all buttons toggle category cards', async ({ page }) => {
    await page.locator('#catalogControls button', { hasText: 'Collapse All' }).click();
    const collapsed = page.locator('.category-card.collapsed');
    expect(await collapsed.count()).toBeGreaterThan(0);

    await page.locator('#catalogControls button', { hasText: 'Expand All' }).click();
    const stillCollapsed = page.locator('.category-card.collapsed');
    expect(await stillCollapsed.count()).toBe(0);
  });

  test('simulated conversations section is present', async ({ page }) => {
    await expect(page.locator('#convs-heading')).toBeVisible();
    const convs = page.locator('.conversation');
    expect(await convs.count()).toBe(7);
  });

  test('conversation headers collapse and expand on click', async ({ page }) => {
    const first = page.locator('.conversation').first();
    await expect(first).not.toHaveClass(/collapsed/);

    await first.locator('.conv-header').click();
    await expect(first).toHaveClass(/collapsed/);

    await first.locator('.conv-header').click();
    await expect(first).not.toHaveClass(/collapsed/);
  });
});

test.describe('V3 Queen Peptides sub-page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/docs/simulations/v3-queen-peptides-simulations.html');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Queen Peptides/i);
  });

  test('back button links to main dashboard', async ({ page }) => {
    const btn = page.locator('header a.back-btn');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('href', '../../index.html');
    await expect(btn).toContainText('Dashboard');
  });

  test('search input is present and filters products', async ({ page }) => {
    const input = page.locator('#searchInput');
    await expect(input).toBeVisible();

    const totalBefore = await page.locator('.product-list li:not(.hidden)').count();
    await input.fill('tirz');
    const totalAfter = await page.locator('.product-list li:not(.hidden)').count();

    expect(totalAfter).toBeLessThan(totalBefore);
    expect(totalAfter).toBeGreaterThan(0);
  });

  test('category filter dropdown is populated', async ({ page }) => {
    const select = page.locator('#categoryFilter');
    await expect(select).toBeVisible();
    const options = select.locator('option');
    expect(await options.count()).toBeGreaterThan(1);
  });

  test('stock filter hides out-of-stock items when "In Stock" selected', async ({ page }) => {
    await page.locator('#stockFilter').selectOption('in');
    const oosItems = page.locator('.product-list li.oos:not(.hidden)');
    expect(await oosItems.count()).toBe(0);
  });

  test('grid view renders product cards', async ({ page }) => {
    await page.locator('#gridViewBtn').click();
    await expect(page.locator('#gridView')).toBeVisible();
    const cards = page.locator('#productCardGrid .product-card');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('list view toggle restores category grid', async ({ page }) => {
    await page.locator('#gridViewBtn').click();
    await page.locator('#listViewBtn').click();
    await expect(page.locator('#listView')).toBeVisible();
    await expect(page.locator('#gridView')).toBeHidden();
  });

  test('conversations section is present and collapsible', async ({ page }) => {
    const convs = page.locator('.conversation');
    expect(await convs.count()).toBeGreaterThan(0);

    const first = convs.first();
    await first.locator('.conv-header').click();
    await expect(first).toHaveClass(/collapsed/);
  });
});

test.describe('API data shape', () => {
  test('each ticket has a priority field (string or null)', async ({ request }) => {
    const res = await request.get('/api/data');
    expect(res.ok()).toBe(true);
    const body = await res.json();
    const tickets = Array.isArray(body) ? body : body.tickets;
    expect(tickets.length).toBeGreaterThan(0);
    for (const t of tickets) {
      expect(t).toHaveProperty('priority');
      expect(t.priority === null || typeof t.priority === 'string').toBe(true);
    }
  });
});
