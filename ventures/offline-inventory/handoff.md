# Offline Inventory Worksheet: draft handoff (NOT FOR SALE)

**Status:** Phase 2 isolated development artifact. No permission to publish, market, sell, deploy or collect customer data.

## What is included
- `index.html`: local browser interface with fictional Bolts (3) and Nuts (5) fixtures.
- `src/inventory.mjs`: deterministic, pure worksheet calculations and validation.
- `tests/*.test.mjs`: Node regressions covering core inventory operations, rename, schema integrity, capacity/CSV safety and multi-step workflows (including P2-INV-017 through P2-INV-019).
- `spec.md`: user flow, scope, acceptance and manual browser checks.

## Local setup
Requires a browser with ES modules, Node 22+ for tests, and Python 3 for the optional local HTTP server. No package installation or paid services required.

From repository root:

```sh
node --version
node --test ventures/offline-inventory/tests/*.test.mjs tests/phase2-*.test.mjs
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/ventures/offline-inventory/` on the same computer. Stop the server with Ctrl+C. Do not host this prototype publicly.

## Manual review
Check P2-UI-001 through P2-UI-022 in `spec.md`, including delayed `File.text()` restore races (P2-UI-019–022) in a controlled local browser harness. Add and rename fictional items, update counts, cancel removal and verify nothing changes, then confirm removal and inspect the CSV. Check Unicode direction-mark and line-separator rejection. Inspect browser console for errors. Verify refresh resets data and that the page makes no outbound network requests. Record browser version, test output and any failures in `phase2/STATUS.md`. Browser verification has **not** been established by this document.

## Dependencies, rights and operations
The source currently imports no third-party runtime packages. Verify the repository's license and any third-party assets before distribution; this handoff does **not** assert transferable IP ownership or a license grant. No external fonts, imagery or analytics are required by this prototype. There are no credentials, hosting, billing or customer-data integrations.

Maintenance would involve browser compatibility, accessibility review, input validation and regression tests. The browser supports explicit JSON export/restore and CSV export, but has no automatic persistence or synchronization; refreshing without an exported backup loses edits. The fixture generator `tests/restore-fixtures.mjs` creates four **fictional** local JSON test inputs when given an explicit fresh directory, refuses overwrites and symlinked output directories, and is not a substitute for browser acceptance. Security review and real-device testing remain open.

## Fixture and restore verification (development only)
Generate fixtures only in a fresh local path, for example `node ventures/offline-inventory/tests/restore-fixtures.mjs /tmp/grove-p2-restore-review`. Confirm the four fictional files; rerun the command and confirm overwrite refusal. Run `node --test tests/phase2-*.test.mjs ventures/offline-inventory/tests/*.test.mjs` at the exact checked-out commit. Automated checks do not establish browser accessibility, restore race behavior or a deployable product. Record each manual browser ID separately in `phase2/STATUS.md`.

## Commercial evidence and claims
**Customers:** none verified. **Traction:** none verified. **Revenue:** none verified. **Valuation:** none established. **Demand:** unvalidated hypothesis. No outreach, listing, sale, or real-world launch has occurred under this handoff.

## Approval gates
A separate, informed owner decision and all applicable legal/account-owner requirements are mandatory before any publication, production deployment, public listing, customer-data collection, spending, payment processing or asset transfer. A passing test suite is not launch authorization.
