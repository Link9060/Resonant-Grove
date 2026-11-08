# Grove Phase 1 release acceptance guide

This guide applies to the **unmerged development branch** in PR #65. It does not authorize a merge, deployment, or Phase 2.

## Obtain an exact-head build

1. Open PR #65 and copy its full head commit SHA.
2. Open the successful **Grove development preview package** workflow run for that SHA, download the `grove-review-<SHA>` artifact, and extract it.
3. **Verify package integrity before serving.** From the extracted artifact root, run `sha256sum --check SHA256SUMS.txt` on Linux or an environment with GNU coreutils. On macOS or Windows with Python 3, use this equivalent cross-platform verification command:

   ```bash
   python3 - <<'PY'
   import hashlib
   from pathlib import Path

   root = Path.cwd().resolve()
   lines = (root / "SHA256SUMS.txt").read_text().splitlines()
   expected = {p.relative_to(root).as_posix() for p in root.rglob("*")
               if p.is_file() and p.name != "SHA256SUMS.txt"}
   seen = set()
   passed = True
   for line in lines:
       digest, separator, name = line.partition("  ")
       target = (root / name).resolve()
       valid = (bool(separator) and len(digest) == 64
                and all(c in "0123456789abcdef" for c in digest)
                and target.is_relative_to(root) and target.is_file()
                and target.is_relative_to(root)
                and target.relative_to(root).as_posix() not in seen)
       normalized_name = target.relative_to(root).as_posix() if target.is_relative_to(root) else name
       seen.add(normalized_name)
       if valid:
           valid = hashlib.sha256(target.read_bytes()).hexdigest() == digest
       print(("OK: " if valid else "FAIL: ") + name)
       passed = passed and valid
   if not passed or seen != expected:
       raise SystemExit("Integrity verification failed or manifest incomplete")
   print("All packaged files verified")
   PY
   ```

   All entries must report OK, and the manifest must cover every extracted file other than itself. If any check fails, stop and obtain a fresh artifact. For GROVE-035/036, alter a **copy** of an extracted file and confirm verification fails; never test tampering against the only copy.
4. In a terminal in the extracted folder, run `python3 -m http.server 8765 --bind 127.0.0.1`. Visit `http://127.0.0.1:8765/review.html`.
5. Verify the full SHA on `review.html` and `REVIEW.txt` matches the PR head. If it differs, stop: the artifact is stale.
6. Use a separate browser profile so test data cannot overwrite your everyday Grove workspace. Do not enter real customer, banking, or confidential data.

**Hosted preview:** unavailable until an isolated, authorized branch deployment is configured. A downloadable Actions artifact is not a hosted URL. The main GitHub Pages URL is production, not this release.

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
