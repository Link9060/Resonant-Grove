# Grove Phase 1 release acceptance guide

This guide applies to the **unmerged development branch** in PR #65. It does not authorize a merge, deployment, or Phase 2.

## Obtain an exact-head build

1. Open PR #65 and copy its full head commit SHA.
2. Open the successful **Grove development preview package** workflow run for that SHA, download the `grove-review-<SHA>` artifact, and extract it.
3. In a terminal in the extracted folder, run `python3 -m http.server 8765 --bind 127.0.0.1`. Visit `http://127.0.0.1:8765/review.html`.
4. Verify the full SHA on `review.html` and `REVIEW.txt` matches the PR head. If it differs, stop: the artifact is stale.
5. Use a separate browser profile so test data cannot overwrite your everyday Grove workspace. Do not enter real customer, banking, or confidential data.

**Hosted preview:** unavailable until an isolated, authorized branch deployment is configured. A downloadable Actions artifact is not a hosted URL. The main GitHub Pages URL is production, not this release.

## End-to-end acceptance

Record **pass/fail/blocked** and browser/device for each step. A passing CI run alone does not satisfy these tests.

1. **Navigation and accessibility:** open dashboard, Seeds, Treasury, Journal, Agent Desk, Settings; navigate by keyboard, check visible focus and readable labels, and test at narrow phone width without horizontal clipping.
2. **Persistence:** create a disposable Seed with two steps, edit its title, toggle one step, refresh, and verify all values persist. Archive and restore it; verify the state survives another refresh.
3. **Treasury:** enter disposable income and expense entries linked to the Seed. Verify totals, transaction types, and Seed attribution. No real payments should occur.
4. **Journal:** add a note and verify it survives refresh. Confirm the activity feed still renders after the Seed and Treasury changes.
5. **Backup round trip:** export JSON, make a second copy for test modifications, import the unmodified backup, and verify Seed title, status, goal, steps, transactions and journal records remain unchanged.
6. **Invalid backup safety:** using copies of the export, test the precise malformed values listed in GROVE-003 through GROVE-010 and GROVE-014 through GROVE-015 on PR #65. For GROVE-014, replace a Seed description/category, transaction description, or journal title/description with a non-string value. For GROVE-015, replace a Seed/task/transaction/journal identifier, creation timestamp, or transaction Seed reference with a non-string value. Each malformed import must fail without changing the existing workspace. Check the original data after refresh.
7. **Cloud sync:** only if a pre-existing authorized test account is available, verify signed-in conflict resolution and signed-out local operation. Do not create accounts or store secrets for this test.
8. **Offline fallback:** after loading the page, disconnect network and verify local Seed viewing/editing where supported. Record which remote Agent Desk/cloud features are unavailable.
9. **Preview isolation:** verify the test site is the unmerged SHA and does not overwrite the production deployment. A hosted URL is required to close GROVE-002.

## Release gates

Keep every existing GROVE-001+ checklist entry open until the precise tested release is approved and merged. Only an owner-authored PR comment `GROVE-MERGE-APPROVED <full current head SHA>` authorizes the builder to consider merging after rechecking checks, blockers and SHA. Phase 2 separately requires `GROVE-PHASE2-APPROVED <full accepted platform SHA>`. Do not interpret this guide as either approval.
