# Offline Inventory Worksheet: requirements and acceptance

**Stage:** isolated Phase 2 prototype, not released. **Data:** fictional local fixtures only.

## Problem and audience
Small hobby projects and volunteer teams sometimes need to tally quantities without creating an account or maintaining a hosted database. This is a product hypothesis, **not validated demand**. The intended reviewer is someone tracking a short list of non-sensitive supplies on one device.

## Scope and workflow
1. Open the local development page served from a local HTTP server; see two clearly fictional fixture items.
2. Enter a lowercase alphanumeric/hyphen ID, a display name and a whole-number quantity; add an item.
3. Select **Set quantity** for a row and enter a new whole-number count.
4. Read the recalculated total; refresh to reset the in-memory sample.

## Acceptance criteria
- **P2-INV-001:** Deterministic total and normalized worksheet from the same rows.
- **P2-INV-002:** Adding/updating returns a new worksheet and leaves prior state intact.
- **P2-INV-003:** Reject duplicate IDs, malformed names, fractional/negative quantities and more than 100 rows.
- **P2-INV-004:** Reject invalid updates without mutating prior data.
- **P2-UI-001 (manual, not verified):** Adding a valid item adds a row and increases the displayed total.
- **P2-UI-002 (manual, not verified):** Changing a quantity recalculates the total; cancel leaves it unchanged.
- **P2-UI-003 (manual, not verified):** Duplicate IDs and invalid values display feedback without modifying rows.
- **P2-UI-004 (manual, not verified):** Refresh restores the original two sample rows.

## Architecture and limits
`src/inventory.mjs` is a dependency-free ES module with pure `createWorksheet`, `addItem` and `setCount` functions. `index.html` provides a local-only browser view. Nothing persists; there is no export, collaboration, authentication, inventory valuation, audit history, external data, analytics or network API. Quantity limit is 1,000,000 per row; maximum 100 rows. It is not appropriate for sensitive or mission-critical records.

## Verification plan
Run `node --test ventures/offline-inventory/tests/inventory.test.mjs` from the repository root on Node 22+. Then serve the repository root with `python3 -m http.server 8000 --bind 127.0.0.1` and open `http://127.0.0.1:8000/ventures/offline-inventory/` to perform P2-UI-001 through P2-UI-004. Do not mark manual browser checks passed until actually performed.
