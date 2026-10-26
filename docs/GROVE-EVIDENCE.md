# Grove owner-reported evidence ledger

Grove now has a public GitHub issue form for recording **actual, voluntary, privacy-safe** prototype observations after a test happens. This is not autonomous market research; it is a place for the owner to report what really happened.

## How to record a test

1. Open the **Grove Seed feedback** form from the GitHub New Issue menu or from the Autonomous Grove dashboard.
2. Replace the example week in the title with the actual `[GROVE-SEED] YYYY-Www` week, using the linked Seed plan issue.
3. Enter the weekly Seed's issue number, one evidence type, a reported outcome, and an honest non-identifying observation.
4. Acknowledge that GitHub issues are **public** and that your observation is owner-reported, not independently verified.
5. Submit. The owner-gated GitHub Actions job links one small, sanitized receipt to the matching weekly Seed issue. Original freeform notes are not copied into the receipt.

If a tester did not consent or a test was not performed, do not submit a test report. Use an internal note instead. Never include personal details, identifying participant data, bank/payment details, or private conversations.

## Outcomes and what they mean

- **Needs revision:** You report a problem with the draft.
- **Continue testing:** You report insufficient evidence and want another voluntary test.
- **Retire experiment:** You report that the experiment should stop.

All three statuses are **owner-reported**, not third-party audited. The ledger records your stated result but cannot substantiate it. No changes to a weekly Seed's claim of verified demand or sales are made. It does not automatically close, deploy, publish, contact customers, issue an ARRAY mission, or operate payments.

## Trust boundaries

- Only Link9060-created issues titled `[GROVE-FEEDBACK] YYYY-Www` are considered.
- The issue body must match the form's four bounded metadata fields and public-report acknowledgement.
- The linked weekly Seed must have been authored by GitHub Actions, match the week in the title, and carry `grove-seed-draft`.
- A bot-authored receipt marker prevents duplicate comments, with GitHub Actions concurrency on the feedback issue.
- Arbitrary freeform user text is never forwarded to executable commands or echoed into other GitHub issue comments.
- Only a scoped GitHub token with read access to code and issue-comment permission is used; no payment, Instagram, or external account credentials.

This is the evidence capture bridge, not a claim that the Grove system has independently evaluated a real customer.

**Source and review:** [Weekly Seed issues](https://github.com/Link9060/Resonant-Grove/issues?q=label%3Agrove-seed-draft) · [Feedback ledger workflow](https://github.com/Link9060/Resonant-Grove/actions/workflows/grove-evidence.yml)
