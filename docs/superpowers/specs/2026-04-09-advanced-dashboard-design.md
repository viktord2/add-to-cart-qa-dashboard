---
title: Advanced Dashboard Page — Bug Status Report
date: 2026-04-09
branch: advanced-dashboard-page
---

## Summary

Create `advanced-dashboard.html`: a stakeholder-facing bug status report for the "Add to Cart" feature. It mirrors the structure of the April 9 deck (version breakdown by V1/V3) while being fully dynamic — data pulled from the same `data/data.json` pipeline as `index.html`. It is bidirectionally linked to the main dashboard.

---

## Page Structure

### Header (sticky)
- Left: title "Add to Cart · Bug Status Report", subtitle "Ai Site Chat Engine · {updatedAt date}"
- Right: "← Main Dashboard" link to `index.html`, dark/light theme toggle (same localStorage key pattern as `index.html`)

### Stat Cards (4 cards, grid)
| Card | Value | Color |
|------|-------|-------|
| Open Bugs | count of all classified tickets | default text |
| V1 Only | tickets with V1 label but not V3 | `#f78166` (red-orange) |
| V3 Only | tickets with V3 label but not V1 | `#79c0ff` (blue) |
| V1 + V3 | tickets with both V1 and V3 labels | `#d2a8ff` (purple) |

Tickets without any V1/V3 label are excluded from the report entirely.

### Three Collapsible Sections
Order: Cross-Version (V1+V3) → V1 Only → V3 Only.

Each section has:
- **Header**: section title (color-coded per version) + issue count badge + collapse/expand chevron
- **Table columns**: Issue # (monospace, links to GitHub issue) · Title · Priority · Status · ↗ (GitHub link)
- **Row sort order within section**: Critical → High → Medium → Low → no priority (ascending number as tiebreaker)

### Footer
- Last updated timestamp (Warsaw timezone, same as `index.html`)
- "← Main Dashboard" link to `index.html`

---

## Version Classification (from labels)

```
V1+V3  → labels includes "V1" AND "V3"
V1     → labels includes "V1", does NOT include "V3"
V3     → labels includes "V3", does NOT include "V1"
(none) → excluded from this page entirely
```

---

## Priority

Priority is fetched from the GitHub Project #365 "Priority" custom field (a `ProjectV2ItemFieldSingleSelectValue`).

### Data pipeline changes required

**`serve-dashboard.mjs`** — extend the field extraction logic to also read the "Priority" field:
```js
const priority = item.fieldValues.nodes
  .find(fv => fv?.field?.name === 'Priority')?.name ?? null;
```
Add `priority` to the returned ticket object.

**`scripts/fetch-data.py`** — same update: extract "Priority" alongside "Status" and include it in each ticket object written to `data/data.json`.

After the pipeline runs, `data/data.json` tickets will have a `priority` field (string or null).

### Display

| Priority value | Badge color (dark) | Badge color (light) |
|----------------|--------------------|---------------------|
| Critical | red `#ff7b72` on `#5a1b1b` | red on `#ffe0e0` |
| High | orange `#f0883e` on `#3d2000` | orange on `#fff0e0` |
| Medium | yellow `#e3b341` on `#2d2a00` | amber on `#fffbe0` |
| Low | green `#56d364` on `#1a2a1a` | green on `#e6ffe6` |
| null | `—` in muted color | same |

---

## Visual Style

Matches `index.html` exactly:
- CSS custom properties: `--bg`, `--surface`, `--surface2`, `--border`, `--text`, `--muted`, `--link`
- Dark default, light toggle via `data-theme` attribute on `<html>`
- Theme persisted in `localStorage` (same key as `index.html`: `'qa-dashboard-theme'`)
- Font: system-ui / -apple-system stack
- GitHub-inspired palette (dark: `#0d1117` bg, `#161b22` surface)

---

## Connection to Main Dashboard

| Direction | Implementation |
|-----------|----------------|
| `advanced-dashboard.html` → `index.html` | "← Main Dashboard" anchor in sticky header + footer |
| `index.html` → `advanced-dashboard.html` | "View Report →" button added to `index.html` header |

The "View Report →" button in `index.html` sits alongside the existing theme toggle in the header right area.

---

## File

- New file: `advanced-dashboard.html` (project root, same level as `index.html`)
- No new JS files, no new CSS files — all inline, consistent with existing pages

---

## Out of Scope

- Bug cluster analysis (slide 5 of deck) — excluded
- Tickets without V1/V3 labels — excluded, not shown in an "Unclassified" section
- QA-style filtering, assignee management, status grouping — those remain in `index.html`
