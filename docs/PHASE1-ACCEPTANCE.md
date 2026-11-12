# Grove Phase 1 release acceptance guide

This guide applies to the **unmerged development branch** in PR #65. It does not authorize a merge, deployment, or Phase 2.

## Obtain an exact-head build

1. Open PR #65 and copy its full head commit SHA.
2. Open the successful **Grove development preview package** workflow run for that SHA, download the `grove-review-<SHA>` artifact, and extract it.
3. **Verify package integrity before serving.** The downloaded artifact includes its own portable verifier. In the extracted artifact root, run:

   ```bash
   python3 scripts/verify_review_artifact.py .
   ```

   Require `PASS: ... files verified`. This checks SHA-256 hashes, complete manifest coverage, duplicate paths, hidden `.nojekyll`, unexpected files, symlinks and path traversal. On Linux, `sha256sum --check SHA256SUMS.txt` is an additional optional check, not a substitute for the strict verifier. If verification fails, stop and obtain a fresh artifact. To test tampering, modify a **copy** of the extracted artifact and require the verifier to fail. Never modify the only copy.
4. **Preferred:** in a terminal in the extracted folder run `python3 scripts/serve_review.py . --expected-sha <FULL_CURRENT_PR_HEAD_SHA>`. The bundled launcher rejects a stale SHA, checks the exact SHA marker and runs the strict integrity verifier **before** opening a loopback-only HTTP server. Visit `http://127.0.0.1:8765/review.html`. If verification fails, it refuses to serve. The alternative `python3 -m http.server 8765 --bind 127.0.0.1` does **not** verify the artifact automatically, so complete step 3 first.
5. Verify the full SHA on `review.html` and `REVIEW.txt` matches the PR head. If it differs, stop: the artifact is stale.
6. Use a separate browser profile so test data cannot overwrite your everyday Grove workspace. Do not enter real customer, banking, or confidential data.

**Hosted preview evidence (2026-11-12):** The Cloudflare Pages GitHub bot reports successful deployment of PR head `bfdc08aea2060e2676a7fbcc22646bba57822966` at [immutable deployment](https://eff8aa80.resonant-grove.pages.dev/) and [development branch alias](https://grove-release-platform-previ.resonant-grove.pages.dev/), in [PR comment](https://github.com/Link9060/Resonant-Grove/pull/65#issuecomment-6776058606). **Bot deployment status is not independent HTTP/browser verification.** The builder's direct retrieval attempts failed at DNS resolution in its execution environment. The URLs are *candidate* review endpoints, not verified working previews. Verify `review.html` and the full head SHA in an external browser before marking GROVE-002 passed. The main GitHub Pages URL remains production, not this release.

### Hosted-preview verification (GROVE-002, still blocked until observed)

1. Copy the **current full PR head SHA** from PR #65, not a previous report. Check whether the Cloudflare bot's latest deployment comment identifies that commit. If not, mark the hosted preview **STALE/BLOCKED**, and use the exact-head Actions artifact locally instead.
2. Open the immutable deployment URL in a normal browser, then `/review.html`. Record HTTP/network result, browser/device, date and time. Verify the full displayed SHA equals the **current PR head** and matches `REVIEW.txt` if exposed. Do not infer SHA from a short hash in the deployment comment alone.
3. Repeat with the development branch alias. Confirm the alias resolves to the same current SHA. A working immutable deployment does not prove the moving alias is current.
4. Confirm `index.html` loads the real Grove workspace and expected static assets. Confirm no repository internals such as `/.github/workflows/deploy.yml`, `/tests/test_review_server_host.py`, or `/.git/config` are publicly served. A 404/403 is acceptable for those internals.
5. In a disposable browser profile, run navigation, Seed persistence, mobile menu, backup, and offline checks below. Compare the production main site separately without writing test data there.
6. Record PASS/FAIL/BLOCKED in the durable PR checklist with tested full SHA and observations. **Only verified exact-head browser evidence** can close the hosted-preview acceptance blocker; a successful deployment bot comment alone cannot.

## End-to-end acceptance

Record **pass/fail/blocked** and browser/device for each step. A passing CI run alone does not satisfy these tests.

1. **Navigation and accessibility:** open dashboard, Seeds, Treasury, Journal, Agent Desk, Settings; navigate by keyboard, check visible focus and readable labels, and test at narrow phone width without horizontal clipping. At phone width, verify the menu button starts with `aria-expanded="false"` and `aria-controls="sidebar"`; opening it changes expanded to `true`, and closing it via the toggle, backdrop, or a navigation selection restores `false`. Open the menu with the keyboard, press Escape, and verify the sidebar closes, the shade disappears, expanded returns to `false`, and focus returns to the menu button. With the menu already closed, focus another control and press Escape; focus must not jump to the menu button. Record the screen-reader announcement. At 700px width, open the menu with the keyboard and verify focus moves to the first navigation link. Press Tab repeatedly: focus must wrap from the final sidebar control to the first, never entering background content; Shift+Tab must wrap from first to last. Press Escape and verify focus returns to the menu button. With the menu closed, normal Tab traversal must work. Repeat after resizing from 700px to 800px and back: the menu must remain closed, the shade hidden, and `aria-expanded` false.
2. **Persistence:** create a disposable Seed with two steps, edit its title, toggle one step, refresh, and verify all values persist. Archive and restore it; verify the state survives another refresh.
3. **Treasury:** enter disposable income and expense entries linked to the Seed. Verify totals, transaction types, and Seed attribution. No real payments should occur.
4. **Journal:** add a note and verify it survives refresh. Confirm the activity feed still renders after the Seed and Treasury changes.
5. **Backup round trip:** export JSON, make a second copy for test modifications, import the unmodified backup, and verify Seed title, status, goal, steps, transactions and journal records remain unchanged.
6. **Invalid backup safety:** using copies of the export, test the precise malformed values listed in GROVE-003 through GROVE-010 and GROVE-014 through GROVE-015 on PR #65. For GROVE-014, replace a Seed description/category, transaction description, or journal title/description with a non-string value. For GROVE-015, replace a Seed/task/transaction/journal identifier, creation timestamp, or transaction Seed reference with a non-string value. Each malformed import must fail without changing the existing workspace. Check the original data after refresh.
7. **Cloud sync:** only if a pre-existing authorized test account is available, verify signed-in conflict resolution and signed-out local operation. Do not create accounts or store secrets for this test.
8. **Duplicate identifiers (GROVE-017):** export a backup containing at least two Seeds, two tasks in one Seed, two transactions, and two journal records. In separate copies duplicate an explicit Seed ID, a task ID within one Seed, a transaction ID, and a journal ID. Each import must reject without changing the existing workspace, including after refresh. Confirm that the same task ID in *different* Seeds is allowed and that older records without IDs still import.
9. **Identifier length and truncation (GROVE-018):** in separate backup copies, set a Seed ID, task ID, transaction ID, journal ID, or transaction Seed reference to 91 characters; each import must reject without changing the workspace. Test two distinct IDs with the same first 90 characters and verify they cannot collide after import. Confirm a valid 90-character ID survives an export/import round trip unchanged.
10. **Text-field length boundaries (GROVE-029):** In separate backup copies, test Seed title (100), description (1000), category (60), task text (300), transaction description (300), journal title (150), and journal description (500) characters. Each exact-limit value must survive import and export unchanged; one character beyond each limit must reject the entire import. After every rejection, refresh and verify the original workspace is intact.
11. **Timestamp length boundaries (GROVE-030):** For Seed, transaction, and journal `created` fields, verify a 50-character string is preserved exactly through import/export. Test 51-character values separately: every import must reject without altering the workspace, including after refresh. These are storage-boundary tests, not proof of valid calendar timestamps.
12. **Mobile navigation focus (GROVE-028):** At <=720px, open the sidebar using the keyboard, activate a navigation link with Enter, and verify the selected view opens, the menu closes, `aria-expanded` becomes false, and focus moves to the visible menu button rather than remaining in hidden sidebar content. When the menu is closed or viewport is desktop width, verify navigation does not unexpectedly steal focus.
13. **Offline fallback:** after loading the page, disconnect network and verify local Seed viewing/editing where supported. Record which remote Agent Desk/cloud features are unavailable.
14. **Preview isolation:** verify the test site is the unmerged SHA and does not overwrite the production deployment. A hosted URL is required to close GROVE-002.

## Release gates

Keep every existing GROVE-001+ checklist entry open until the precise tested release is approved and merged. Only an owner-authored PR comment `GROVE-MERGE-APPROVED <full current head SHA>` authorizes the builder to consider merging after rechecking checks, blockers and SHA. Phase 2 separately requires `GROVE-PHASE2-APPROVED <full accepted platform SHA>`. Do not interpret this guide as either approval.
