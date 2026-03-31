---
title: Add Third Test Environment Entry
date: 2026-03-31
---

## Summary

Add a third entry to the Test Environments bar in `index.html` with the same UX and functionality as the existing two entries.

## New Entry

| Field | Value |
|-------|-------|
| Name  | `V3_CATALOG` |
| msid  | `04c6f6c9-4fb0-4a6a-a95a-dd189d27cc08` |
| URL   | `https://viktord71.wixsite.com/v3-queenpeptides` |

## Change

In `index.html`, append a separator (`env-sep`) and a new `env-entry` block after the existing `V1_CATALOG` entry, inside the `.env-entries` div. The new entry reuses the identical HTML structure: name label, msid row with inline copy button, and URL row with an anchor tag.

No JavaScript, CSS, server, or test changes are required.
