# Advanced Dashboard Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `advanced-dashboard.html`, a stakeholder-facing bug status report that classifies tickets by V1/V3 version, sorts by priority, and links bidirectionally with `index.html`.

**Architecture:** Single inline HTML file (no external JS/CSS). Data loaded via the same endpoint pattern as `index.html` (`/api/data` on localhost, `./data/data.json` in production). The data pipeline (`serve-dashboard.mjs` + `fetch-data.py`) is extended to extract a `priority` field from the GitHub Project's Priority custom field.

**Tech Stack:** Vanilla HTML/CSS/JS, Playwright (tests), Node.js (`serve-dashboard.mjs`), Python (`fetch-data.py`)

---

## File Map

| Action | File | What changes |
|--------|------|--------------|
| Modify | `serve-dashboard.mjs` | Extract `Priority` project field alongside `Status` |
| Modify | `scripts/fetch-data.py` | Same — extract `priority` and write it to `data/data.json` |
| Create | `advanced-dashboard.html` | New report page |
| Create | `tests/advanced-dashboard.spec.js` | Playwright tests for the new page |
| Modify | `index.html` | Add "View Report →" link to `.header-actions` |

---

## Task 1: Extend data pipeline with Priority field

**Files:**
- Modify: `serve-dashboard.mjs` (line 59 — field extraction block)
- Modify: `scripts/fetch-data.py` (line 14 — field extraction block)

- [ ] **Step 1: Write the failing test**

Add a new describe block to `tests/dashboard.spec.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
yarn test --grep "each ticket has a priority field"
```

Expected: FAIL — `priority` property missing from ticket objects.

- [ ] **Step 3: Update serve-dashboard.mjs**

Replace the `status` extraction block (lines 59–60) with:

```js
const status = item.fieldValues.nodes
  .find(fv => fv?.field?.name === 'Status')?.name ?? 'No Status';
const priority = item.fieldValues.nodes
  .find(fv => fv?.field?.name === 'Priority')?.name ?? null;
```

Then add `priority` to the returned object (after `status`):

```js
return {
  number: item.content.number,
  title: item.content.title,
  url: item.content.url,
  repo: item.content.repository.name,
  labels: item.content.labels.nodes.map(l => l.name),
  assignees: item.content.assignees.nodes.map(a => ({ login: a.login, avatarUrl: a.avatarUrl })),
  status,
  priority,
};
```

- [ ] **Step 4: Update scripts/fetch-data.py**

Replace the `status` extraction (lines 14–18) with:

```python
status = next(
    (fv['name'] for fv in item['fieldValues']['nodes']
     if fv.get('field', {}).get('name') == 'Status'),
    'No Status'
)
priority = next(
    (fv['name'] for fv in item['fieldValues']['nodes']
     if fv.get('field', {}).get('name') == 'Priority'),
    None
)
```

Then add `priority` to the ticket dict (after `'status': status`):

```python
tickets.append({
    'number': content['number'],
    'title': content['title'],
    'url': content['url'],
    'repo': content['repository']['name'],
    'labels': labels,
    'assignees': assignees,
    'status': status,
    'priority': priority,
})
```

- [ ] **Step 5: Run test to verify it passes**

```bash
yarn test --grep "each ticket has a priority field"
```

Expected: PASS. (`priority` will be `null` for all tickets if the GitHub Project has no Priority field configured — that's correct behaviour.)

- [ ] **Step 6: Run full test suite to confirm no regressions**

```bash
yarn test
```

Expected: all existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add serve-dashboard.mjs scripts/fetch-data.py tests/dashboard.spec.js
git commit -m "feat: extract priority field from GitHub Project in data pipeline"
```

---

## Task 2: Build advanced-dashboard.html (skeleton + stat cards)

**Files:**
- Create: `tests/advanced-dashboard.spec.js`
- Create: `advanced-dashboard.html`

- [ ] **Step 1: Write the failing tests**

Create `tests/advanced-dashboard.spec.js`:

```js
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
      const text = await page.locator(`[data-testid="${id}"] .number`).innerText({ timeout: 10000 });
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn test tests/advanced-dashboard.spec.js
```

Expected: all FAIL — `advanced-dashboard.html` does not exist yet.

- [ ] **Step 3: Create advanced-dashboard.html**

Create `advanced-dashboard.html` in the project root:

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="robots" content="noindex, nofollow"/>
<title>Add to Cart — Bug Status Report</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root, [data-theme="dark"] {
    --bg: #0d1117; --surface: #161b22; --surface2: #21262d; --border: #30363d;
    --text: #e6edf3; --muted: #8b949e; --link: #58a6ff;
    --v1: #f78166; --v3: #79c0ff; --v1v3: #d2a8ff;
    --btn-bg: #21262d; --btn-hover: #30363d;
  }
  [data-theme="light"] {
    --bg: #f6f8fa; --surface: #ffffff; --surface2: #f0f2f5; --border: #d0d7de;
    --text: #1f2328; --muted: #656d76; --link: #0969da;
    --v1: #cf222e; --v3: #0550ae; --v1v3: #6639ba;
    --btn-bg: #f3f4f6; --btn-hover: #e9ecef;
  }

  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; min-height: 100vh; transition: background .2s, color .2s; }

  /* Header */
  .page-header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
  .header-title { font-size: 15px; font-weight: 600; }
  .header-subtitle { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .header-right { display: flex; align-items: center; gap: 12px; }
  a.back-link { font-size: 12px; color: var(--link); text-decoration: none; }
  a.back-link:hover { text-decoration: underline; }
  .btn { background: var(--btn-bg); border: 1px solid var(--border); color: var(--text); font-size: 13px; padding: 5px 10px; border-radius: 6px; cursor: pointer; }
  .btn:hover { background: var(--btn-hover); }

  /* Main */
  .main { max-width: 1000px; margin: 0 auto; padding: 24px; }

  /* Error */
  .error-banner { background: #5a1b1b; color: #ff7b72; border-radius: 6px; padding: 10px 16px; margin-bottom: 20px; display: none; }

  /* Stat cards */
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; }
  .stat-card .number { font-size: 28px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
  .stat-card .label { font-size: 12px; color: var(--muted); }
  .stat-card.v1-card .number { color: var(--v1); }
  .stat-card.v3-card .number { color: var(--v3); }
  .stat-card.v1v3-card .number { color: var(--v1v3); }

  /* Sections */
  .section { margin-bottom: 24px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  .section-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: var(--surface2); cursor: pointer; user-select: none; border-bottom: 1px solid var(--border); }
  .section-header:hover { filter: brightness(1.08); }
  .section-header-left { display: flex; align-items: center; gap: 10px; }
  .section-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
  .section-badge { font-size: 11px; font-weight: 600; border-radius: 20px; padding: 2px 8px; }
  .chevron { font-size: 12px; color: var(--muted); transition: transform .2s; }
  .section.collapsed .chevron { transform: rotate(-90deg); }
  .section.collapsed .section-body { display: none; }

  .v1v3-title { color: var(--v1v3); }
  .v1v3-badge { background: color-mix(in srgb, var(--v1v3) 15%, transparent); color: var(--v1v3); }
  .v1-title { color: var(--v1); }
  .v1-badge { background: color-mix(in srgb, var(--v1) 15%, transparent); color: var(--v1); }
  .v3-title { color: var(--v3); }
  .v3-badge { background: color-mix(in srgb, var(--v3) 15%, transparent); color: var(--v3); }

  /* Table */
  .bug-table { width: 100%; border-collapse: collapse; }
  .bug-table th { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); padding: 7px 14px; text-align: left; background: var(--surface); border-bottom: 1px solid var(--border); }
  .bug-table th.col-issue { width: 76px; }
  .bug-table th.col-priority { width: 90px; }
  .bug-table th.col-status { width: 110px; }
  .bug-table th.col-link { width: 36px; }
  .bug-table td { padding: 9px 14px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: middle; background: var(--surface); }
  .bug-table tr:last-child td { border-bottom: none; }
  .bug-table tr:hover td { background: var(--surface2); }
  .bug-row .issue-num { font-family: monospace; font-size: 12px; font-weight: 600; }
  .bug-row .issue-num a { color: var(--link); text-decoration: none; }
  .bug-row .issue-num a:hover { text-decoration: underline; }
  .link-icon { color: var(--muted); text-decoration: none; display: block; text-align: center; }
  .link-icon:hover { color: var(--link); }

  /* Priority badges */
  .priority-pill { font-size: 10px; font-weight: 700; border-radius: 4px; padding: 2px 6px; display: inline-block; }
  .priority-critical { background: #5a1b1b; color: #ff7b72; }
  .priority-high     { background: #3d2000; color: #f0883e; }
  .priority-medium   { background: #2d2a00; color: #e3b341; }
  .priority-low      { background: #1a2a1a; color: #56d364; }
  .priority-none     { color: var(--muted); font-size: 11px; }
  [data-theme="light"] .priority-critical { background: #ffe0e0; color: #c00; }
  [data-theme="light"] .priority-high     { background: #fff0e0; color: #c44; }
  [data-theme="light"] .priority-medium   { background: #fffbe0; color: #886600; }
  [data-theme="light"] .priority-low      { background: #e6ffe6; color: #276; }

  /* Status badges */
  .status-pill { font-size: 10px; font-weight: 600; border-radius: 20px; padding: 2px 8px; display: inline-block; }
  .status-triage     { background: color-mix(in srgb, #f78166 15%, transparent); color: #f78166; }
  .status-backlog    { background: color-mix(in srgb, #8b949e 15%, transparent); color: #8b949e; }
  .status-ready      { background: color-mix(in srgb, #58a6ff 15%, transparent); color: #58a6ff; }
  .status-inprogress { background: color-mix(in srgb, #e3b341 15%, transparent); color: #e3b341; }
  .status-inreview   { background: color-mix(in srgb, #d2a8ff 15%, transparent); color: #d2a8ff; }
  .status-done       { background: color-mix(in srgb, #3fb950 15%, transparent); color: #3fb950; }

  /* Footer */
  .footer { text-align: center; padding: 24px; color: var(--muted); font-size: 12px; border-top: 1px solid var(--border); margin-top: 8px; }
  .footer a { color: var(--link); text-decoration: none; }

  @media (max-width: 600px) {
    .stat-grid { grid-template-columns: repeat(2, 1fr); }
    .bug-table th.col-priority, .bug-table td.col-priority { display: none; }
  }
</style>
</head>
<body>

<header class="page-header">
  <div>
    <div class="header-title">Add to Cart · Bug Status Report</div>
    <div class="header-subtitle" id="header-subtitle">Ai Site Chat Engine</div>
  </div>
  <div class="header-right">
    <a class="back-link" href="index.html">← Main Dashboard</a>
    <button class="btn" data-testid="theme-toggle" onclick="toggleTheme()">☀ / ☾</button>
  </div>
</header>

<main class="main">
  <div id="error-banner" class="error-banner"></div>

  <div class="stat-grid">
    <div class="stat-card" data-testid="stat-open">
      <div class="number" id="stat-open">—</div>
      <div class="label">Open Bugs</div>
    </div>
    <div class="stat-card v1-card" data-testid="stat-v1">
      <div class="number" id="stat-v1-val">—</div>
      <div class="label">V1 Only</div>
    </div>
    <div class="stat-card v3-card" data-testid="stat-v3">
      <div class="number" id="stat-v3-val">—</div>
      <div class="label">V3 Only</div>
    </div>
    <div class="stat-card v1v3-card" data-testid="stat-v1v3">
      <div class="number" id="stat-v1v3-val">—</div>
      <div class="label">V1 + V3</div>
    </div>
  </div>

  <div class="section" id="sec-v1v3" data-testid="sec-v1v3">
    <div class="section-header" onclick="toggleSection('sec-v1v3')">
      <div class="section-header-left">
        <span class="section-title v1v3-title">Cross-Version</span>
        <span class="section-badge v1v3-badge" id="badge-v1v3">V1 + V3</span>
      </div>
      <span class="chevron">▾</span>
    </div>
    <div class="section-body">
      <table class="bug-table">
        <thead><tr><th class="col-issue">Issue</th><th>Title</th><th class="col-priority">Priority</th><th class="col-status">Status</th><th class="col-link"></th></tr></thead>
        <tbody id="tbody-v1v3"></tbody>
      </table>
    </div>
  </div>

  <div class="section" id="sec-v1" data-testid="sec-v1">
    <div class="section-header" onclick="toggleSection('sec-v1')">
      <div class="section-header-left">
        <span class="section-title v1-title">V1 Only</span>
        <span class="section-badge v1-badge" id="badge-v1">V1</span>
      </div>
      <span class="chevron">▾</span>
    </div>
    <div class="section-body">
      <table class="bug-table">
        <thead><tr><th class="col-issue">Issue</th><th>Title</th><th class="col-priority">Priority</th><th class="col-status">Status</th><th class="col-link"></th></tr></thead>
        <tbody id="tbody-v1"></tbody>
      </table>
    </div>
  </div>

  <div class="section" id="sec-v3" data-testid="sec-v3">
    <div class="section-header" onclick="toggleSection('sec-v3')">
      <div class="section-header-left">
        <span class="section-title v3-title">V3 Only</span>
        <span class="section-badge v3-badge" id="badge-v3">V3</span>
      </div>
      <span class="chevron">▾</span>
    </div>
    <div class="section-body">
      <table class="bug-table">
        <thead><tr><th class="col-issue">Issue</th><th>Title</th><th class="col-priority">Priority</th><th class="col-status">Status</th><th class="col-link"></th></tr></thead>
        <tbody id="tbody-v3"></tbody>
      </table>
    </div>
  </div>
</main>

<footer class="footer">
  <span id="last-updated"></span> &nbsp;·&nbsp; <a href="index.html">← Main Dashboard</a>
</footer>

<script>
  const THEME_KEY = 'qa-dashboard-theme';
  const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };

  // Restore saved theme on load
  (function () {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) document.documentElement.dataset.theme = saved;
  })();

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
  }

  function toggleSection(id) {
    document.getElementById(id).classList.toggle('collapsed');
  }

  function priorityRank(p) {
    return p !== null && p in PRIORITY_RANK ? PRIORITY_RANK[p] : 4;
  }

  function byPriority(a, b) {
    return priorityRank(a.priority) - priorityRank(b.priority) || a.number - b.number;
  }

  function classify(tickets) {
    return {
      v1v3: tickets.filter(t => t.labels.includes('V1') && t.labels.includes('V3')).sort(byPriority),
      v1:   tickets.filter(t => t.labels.includes('V1') && !t.labels.includes('V3')).sort(byPriority),
      v3:   tickets.filter(t => t.labels.includes('V3') && !t.labels.includes('V1')).sort(byPriority),
    };
  }

  function priorityBadge(p) {
    if (!p) return '<span class="priority-none">—</span>';
    return `<span class="priority-pill priority-${p.toLowerCase()}">${p}</span>`;
  }

  function statusBadge(s) {
    const cls = { 'To triage': 'triage', 'Backlog': 'backlog', 'Ready': 'ready', 'In progress': 'inprogress', 'In review': 'inreview', 'Done': 'done' }[s] || 'backlog';
    return `<span class="status-pill status-${cls}">${s}</span>`;
  }

  function renderRows(tickets) {
    if (!tickets.length) return '<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:16px">No issues</td></tr>';
    return tickets.map(t => `
      <tr class="bug-row">
        <td class="issue-num"><a href="${t.url}" target="_blank" rel="noopener">#${t.number}</a></td>
        <td>${t.title}</td>
        <td class="col-priority">${priorityBadge(t.priority)}</td>
        <td>${statusBadge(t.status)}</td>
        <td><a class="link-icon" href="${t.url}" target="_blank" rel="noopener">↗</a></td>
      </tr>`).join('');
  }

  async function loadData() {
    try {
      const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      const endpoint = isLocal ? '/api/data' : `./data/data.json?t=${Date.now()}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const tickets   = Array.isArray(payload) ? payload : payload.tickets;
      const updatedAt = Array.isArray(payload) ? new Date() : new Date(payload.updatedAt);
      render(tickets, updatedAt);
    } catch (e) {
      const banner = document.getElementById('error-banner');
      banner.textContent = 'Failed to load data: ' + e.message;
      banner.style.display = 'block';
    }
  }

  function render(tickets, updatedAt) {
    const { v1v3, v1, v3 } = classify(tickets);
    const total = v1v3.length + v1.length + v3.length;

    document.getElementById('stat-open').textContent    = total;
    document.getElementById('stat-v1-val').textContent  = v1.length;
    document.getElementById('stat-v3-val').textContent  = v3.length;
    document.getElementById('stat-v1v3-val').textContent = v1v3.length;

    document.getElementById('badge-v1v3').textContent = `V1 + V3 · ${v1v3.length} issues`;
    document.getElementById('badge-v1').textContent   = `V1 · ${v1.length} issues`;
    document.getElementById('badge-v3').textContent   = `V3 · ${v3.length} issues`;

    document.getElementById('tbody-v1v3').innerHTML = renderRows(v1v3);
    document.getElementById('tbody-v1').innerHTML   = renderRows(v1);
    document.getElementById('tbody-v3').innerHTML   = renderRows(v3);

    const dateStr = updatedAt.toLocaleString('pl-PL', {
      timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit',
      year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    document.getElementById('last-updated').textContent = 'Updated ' + dateStr;
    document.getElementById('header-subtitle').textContent = `Ai Site Chat Engine · ${updatedAt.toISOString().slice(0, 10)}`;
  }

  loadData();
</script>
</body>
</html>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn test tests/advanced-dashboard.spec.js
```

Expected: all PASS.

> **Note:** `data-testid="stat-open"` is on the card wrapper div. The `.number` child gets `id="stat-open"` and is where the count is written. The selector `[data-testid="stat-open"] .number` targets the inner span. Make sure the HTML has both attributes on the correct elements as shown above.

- [ ] **Step 5: Commit**

```bash
git add advanced-dashboard.html tests/advanced-dashboard.spec.js
git commit -m "feat: add advanced dashboard page with header and stat cards"
```

---

## Task 3: Implement version sections (tables, priority sort, collapse)

**Files:**
- Modify: `tests/advanced-dashboard.spec.js` — add section + sort tests

The rendering logic for sections was already written in Task 2 (the `renderRows`, `classify`, `byPriority` functions). This task adds the tests that verify those behaviours work correctly.

- [ ] **Step 1: Add section tests to tests/advanced-dashboard.spec.js**

Append inside the `test.describe('Advanced Dashboard', ...)` block:

```js
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
    const v1Badge   = await page.locator('#badge-v1').innerText();
    const v3Badge   = await page.locator('#badge-v3').innerText();
    const v1v3Badge = await page.locator('#badge-v1v3').innerText();
    expect(v1Badge).toMatch(/\d+ issues/);
    expect(v3Badge).toMatch(/\d+ issues/);
    expect(v1v3Badge).toMatch(/\d+ issues/);
  });
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
yarn test tests/advanced-dashboard.spec.js
```

Expected: all PASS. The rendering logic was already written in Task 2; these tests verify it works end-to-end.

- [ ] **Step 3: Run full suite for regressions**

```bash
yarn test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/advanced-dashboard.spec.js
git commit -m "test: add section, sort, and collapse tests for advanced dashboard"
```

---

## Task 4: Add "View Report →" link to index.html

**Files:**
- Modify: `index.html` (line 272 — `.header-actions` div)
- Modify: `tests/dashboard.spec.js` — add link test

- [ ] **Step 1: Write the failing test**

Append to `tests/dashboard.spec.js` inside the main `test.describe('Add to Cart Dashboard', ...)` block:

```js
  test('"View Report" link points to advanced-dashboard.html', async ({ page }) => {
    const link = page.locator('a[href="./advanced-dashboard.html"]');
    await expect(link).toBeVisible();
    await expect(link).toContainText('View Report');
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
yarn test --grep "View Report"
```

Expected: FAIL — link not found.

- [ ] **Step 3: Add the link to index.html**

In `index.html`, find the `.header-actions` div (line 272). Add the link as the first child:

```html
<div class="header-actions">
  <a href="./advanced-dashboard.html" class="btn" style="text-decoration:none">View Report →</a>
  <button class="btn theme-btn" id="themeBtn" data-testid="theme-toggle" onclick="toggleTheme()" title="Toggle theme">🌙</button>
  <button class="btn" id="refreshBtn" data-testid="refresh-btn" onclick="loadData()">
```

- [ ] **Step 4: Run test to verify it passes**

```bash
yarn test --grep "View Report"
```

Expected: PASS.

- [ ] **Step 5: Run full test suite**

```bash
yarn test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add index.html tests/dashboard.spec.js
git commit -m "feat: add View Report link from main dashboard to advanced dashboard"
```

---

## Self-Review Notes

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|-----------|
| Sticky header with title + date | Task 2 — `header-subtitle` updated in `render()` |
| 4 stat cards (Open / V1 / V3 / V1+V3) | Task 2 — stat cards + `render()` writes counts |
| V1/V3 classification from labels | Task 2 — `classify()` function |
| Exclude tickets without V1/V3 | Task 2 — `classify()` only includes V1/V3-labelled |
| Three collapsible sections | Task 2 (HTML structure) + Task 3 (tests) |
| Rows sorted by priority within section | Task 2 — `byPriority()` + `sort(byPriority)` |
| Priority badge colored by level | Task 2 — `priorityBadge()` + CSS classes |
| GitHub link per row (issue # + ↗) | Task 2 — `renderRows()` uses `t.url` |
| Dark/light theme toggle + localStorage | Task 2 — `toggleTheme()` + `THEME_KEY` |
| "← Main Dashboard" in header + footer | Task 2 — static HTML |
| "View Report →" link in index.html | Task 4 |
| Priority extracted from data pipeline | Task 1 |
| Warsaw timezone for last-updated | Task 2 — `render()` uses `Europe/Warsaw` |

All spec requirements covered. No gaps found.

**data-testid note:** The stat card wrappers use `data-testid` (e.g. `data-testid="stat-open"`) but the `.number` element inside gets `id="stat-open"`. The tests use `[data-testid="stat-open"] .number` to find the count — verify the HTML structure matches exactly as written in Task 2, Step 3.
