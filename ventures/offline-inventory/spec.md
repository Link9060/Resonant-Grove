# Offline Inventory Worksheet: requirements and acceptance

**Stage:** isolated Phase 2 prototype, not released. **Data:** fictional local fixtures only. No demand or traction validated.

## Problem and audience
Small hobby projects and volunteer teams may need to tally non-sensitive supplies without an account or hosted database. This is an unverified product hypothesis, not evidence of demand.

## Current local workflow
1. Serve the repository on loopback and open `/ventures/offline-inventory/`. The in-memory sample starts with `bolts` (3) and `nuts` (5), total 8.
2. Add a unique lowercase alphanumeric/hyphen ID (1–40 characters), a name (1–80 trimmed characters), and an integer quantity (0–1,000,000).
3. Set a row quantity, rename it while preserving ID and count, or remove it after confirmation. Canceling prompts leaves the worksheet unchanged.
4. Search by name or ID (case-insensitive, maximum 80 characters). Only visible rows are filtered; the total and CSV still cover the full worksheet.
5. Download a local CSV snapshot with spreadsheet-formula escaping. The file is generated in the browser; no server upload.
6. Reset the sample worksheet after confirmation, which also clears the search. Cancel preserves the worksheet. Refresh also resets in-memory changes.

## Automated acceptance contracts
- **P2-INV-001:** Deterministic normalized worksheet and total for identical rows.
- **P2-INV-002:** Add and set-count return new snapshots without mutating the input.
- **P2-INV-003:** Reject duplicate/malformed IDs, invalid names, negative/fractional counts, and over 100 rows.
- **P2-INV-004:** Invalid updates do not mutate prior data.
- **P2-INV-021:** Resetting after edits reproduces the original fixture snapshot and CSV.
- **P2-INV-022:** Search by name/ID is case-insensitive, validates queries and leaves worksheet state unchanged.
- **P2-CONTRACT-009:** Removal in the browser requires confirmation.
- **P2-CONTRACT-010/011:** Reset requires confirmation and clears search only when confirmed.
- **P2-CONTRACT-012:** Search affects rendered rows but not total or CSV.

These IDs describe source/test contracts, **not a claim that the exact branch tests passed**.

## Manual browser acceptance (pending)
- **P2-UI-001:** Add `washers` quantity 2; see total 10.
- **P2-UI-002:** Set `bolts` to 4, then cancel a subsequent quantity prompt; total remains unchanged after cancel.
- **P2-UI-003:** Try duplicate ID and invalid quantity; see feedback and unchanged rows.
- **P2-UI-004:** Refresh; original two rows and total 8 return.
- **P2-UI-005:** Rename `nuts`; verify ID and quantity remain unchanged. Cancel rename; verify no change.
- **P2-UI-006:** Cancel Remove, then confirm Remove; verify only confirmed action changes total.
- **P2-UI-007:** Search `BOLT` and `absent`; verify filtered rows, unchanged total 8, and CSV still contains both fixtures.
- **P2-UI-008:** While search is active, cancel Reset and verify preservation; confirm Reset and verify two sample rows, total 8, and cleared search.
- **P2-UI-009:** Download CSV, inspect header, CRLF rows, and spreadsheet-safe escaping for a name beginning with `=`.

## Architecture, limits and verification
`src/inventory.mjs` is a dependency-free ES module exporting `createWorksheet`, `addItem`, `setCount`, `removeItem`, `renameItem`, `searchItems` and `toCsv`. `index.html` is a local browser interface. No persistence, collaboration, accounts, analytics, valuation, history, external API, or real customer data. Not appropriate for sensitive or mission-critical inventory.

From an exact checkout of `phase2/venture-engine`, run:
```sh
node --version
node --test tests/phase2-*.test.mjs ventures/offline-inventory/tests/*.test.mjs
python3 -m http.server 8000 --bind 127.0.0.1
```
Then visit `http://127.0.0.1:8000/ventures/offline-inventory/` and execute the manual IDs. Record the actual output and browser results in `phase2/STATUS.md` before marking any checks passed. No deployment or release is authorized.
