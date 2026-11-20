# Offline Inventory Worksheet: requirements and acceptance

**Stage:** isolated Phase 2 prototype, not released. **Data:** fictional local fixtures only. No demand or traction validated.

## Problem and audience
Small hobby projects and volunteer teams may need to tally non-sensitive supplies without an account or hosted database. This is an unverified product hypothesis, not evidence of demand.

## Current local workflow
1. Serve the repository on loopback and open `/ventures/offline-inventory/`. The in-memory sample starts with `bolts` (3) and `nuts` (5), total 8.
2. Add a unique lowercase alphanumeric/hyphen ID (1–40 characters), a name (1–80 trimmed characters), and an integer quantity (0–1,000,000).
3. Set a row quantity, rename it while preserving ID and count, or remove it after confirmation. Canceling prompts leaves the worksheet unchanged.
4. Search by name or ID (case-insensitive, maximum 80 characters). Only visible rows are filtered; the total and CSV still cover the full worksheet.
5. Run **Low-stock check** with an integer threshold from 0 to 1,000,000 to list all items at or below that quantity in worksheet order. Results are snapshots, not saved alerts; changing inventory clears the previous result and requires a new check. Searching only filters the table and preserves the previous stock-check result.
6. Download a local CSV snapshot with spreadsheet-formula escaping. The file is generated in the browser; no server upload.
7. Reset the sample worksheet after confirmation, which also clears the search. Cancel preserves the worksheet. Refresh also resets in-memory changes.

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
- **P2-INV-049–052:** Low-stock threshold validation, ordering, snapshot isolation, full-capacity boundary and mutation lifecycle regression contracts.
- **P2-UI-013:** Inventory mutations clear stale low-stock results.
- **P2-UI-015:** Search-only filtering preserves stock-check results while worksheet mutations invalidate them.
- **P2-UI-016:** Editing the stock threshold clears old stock-check results until Check stock is activated again.
- **P2-UI-017:** Invalid search input is rejected before clearing the currently visible inventory table.
- **P2-UI-018:** Invalid search input also preserves the most recent low-stock result and its announcement; neither table nor stock snapshot changes on validation failure.
- **P2-INV-034/035/036:** Versioned deterministic JSON backup/restore, schema integrity and UTF-8 byte-size boundary.
- **P2-CONTRACT-015/016/022/023:** Browser backup/restore, cancellation feedback, successful reset/restore focus, and add-item focus.

These IDs describe source/test contracts. A historical CI pass is not evidence for a newer commit; verify the exact current head.

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
- **P2-UI-010:** Download JSON; add or rename a fixture item; restore the original backup and confirm. Verify original rows/total, cleared search and focus on Find item.
- **P2-UI-011:** Cancel a valid JSON restore, then submit malformed JSON, a tampered total, and a file larger than 64 KiB. Verify unchanged worksheet and clear error/cancellation feedback. Use fictional fixtures only.
- **P2-UI-012:** With a search hiding a new item, add it and verify search clears, row becomes visible and keyboard focus moves to Find item. Invalid add must preserve filter and focus.

- **P2-UI-014 (pending):** Run Low-stock check at threshold 3 on the original fixture; expect only `bolts` (3). At threshold 5 expect `bolts` and `nuts` in that order. Set `bolts` to 6; verify the old result clears, then rerun threshold 5 and expect only `nuts`. Try a negative, fractional, and over-1,000,000 threshold; verify clear error feedback and no inventory mutation. Use fictional data only.

- **P2-UI-015 (pending):** Run threshold 5 on the original fixture, then search for `BOLT`. Verify the stock-check result still lists both original items while the table shows only `bolts`. Clear the search and verify stock results persist. Change `bolts` quantity to 6 and verify stock results clear; rerun threshold 5 and expect only `nuts`.

- **P2-UI-016 (pending):** Run a threshold 3 stock check, then change the threshold to 5 without clicking Check stock. Confirm the prior list disappears and the live summary requests a fresh check. Click Check stock and verify both sample items appear. Repeat after changing the threshold to an invalid value and verify no old result remains.

- **P2-UI-017 (pending):** Run a valid `BOLT` search, then enter an invalid search value (for example, paste more than 80 characters using a browser console to set the input value and dispatch an `input` event). Confirm the existing visible row is preserved, the error is announced, and the worksheet and total are unchanged. Restore a valid query and verify rendering resumes.

- **P2-UI-018 (pending):** On the original fixture, run Low-stock check at threshold 5 and confirm both items appear. Search for `BOLT`, confirming only the bolts table row appears while both low-stock entries remain. Set the search input programmatically to 81 characters and dispatch an `input` event (bypassing the HTML `maxlength` limit). Confirm the invalid-search error is announced, the bolts table row remains visible, both stock results remain intact, and the worksheet total remains 8. Restore a valid search and confirm normal filtering resumes. Do not use real inventory data.

- **P2-UI-019 (pending):** Test asynchronous JSON restore conflict protection using fictional data. In a local browser test harness, delay the selected file's `text()` promise, then change the worksheet (for example add `washers` quantity 2) before resolving the original valid backup text. Verify restore rejects the stale selection, no replacement confirmation appears, the edited worksheet remains intact (total 10), an error requests reselecting the file, and the file input resets. Repeat without an intervening edit and verify a confirmed restore succeeds. A regular manual upload without a controlled delayed read does **not** verify this race. Automated source-contract coverage and real browser acceptance are distinct; record both independently.


- **P2-UI-020 (pending):** With fictional fixtures, start restoring backup A with its `File.text()` promise deliberately delayed, then select backup B before A finishes. Resolve A first. Verify A never opens a confirmation dialog, never replaces the worksheet and never clears the newer B selection. Resolve B, confirm it, and verify only B's data is restored. Repeat with reverse completion order. This requires a controlled browser harness, not an ordinary manual upload.
- **P2-UI-021 (pending):** With the same delayed-file harness, start restore A, select B, then let A finish and enter its cleanup path. Verify the file input still points to B until B's own operation completes, including when A rejects or throws. Verify the UI's error/confirmation feedback corresponds to the current selection and no stale operation mutates inventory. Use local fictional JSON files only.

## Architecture, limits and verification
`src/inventory.mjs` is a dependency-free ES module exporting `createWorksheet`, `addItem`, `setCount`, `removeItem`, `renameItem`, `searchItems`, `lowStockItems`, `toCsv`, `toJson` and `fromJson`. `index.html` is a local browser interface. No persistence, collaboration, accounts, analytics, valuation, history, external API, or real customer data. Not appropriate for sensitive or mission-critical inventory.

From an exact checkout of `phase2/venture-engine`, run:
```sh
node --version
node --test tests/phase2-*.test.mjs ventures/offline-inventory/tests/*.test.mjs
python3 -m http.server 8000 --bind 127.0.0.1
```
Then visit `http://127.0.0.1:8000/ventures/offline-inventory/` and execute the manual IDs. Record the actual output and browser results in `phase2/STATUS.md` before marking any checks passed. No deployment or release is authorized.
