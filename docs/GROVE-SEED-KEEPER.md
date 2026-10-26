# Grove Seed Keeper v1 · weekly internal experiment plan

## Automatic behavior

Grove Scout creates an unverified daily research issue containing three hypotheses and a 12-point, wording-based **draft-readiness** scorecard. Scout independently creates a prototype draft for its selected candidate.

Grove Seed Keeper examines recent bot-authored research and selects **at most one internal Seed per ISO calendar week**. Its GitHub Actions workflow runs daily at 22:43 UTC as a catch-up check, but the durable issue title [GROVE-SEED] YYYY-Www enforces the weekly limit. A run is best-effort; it can be delayed or skipped by GitHub. It does not count as a launch.

The Keeper chooses the highest draft-readiness score among eligible research from the previous 7 days, breaking ties by most recent day and then issue ID. This is NOT a measure of demand, customer interest, usefulness, earnings, legal compliance, or profitability.

The keeper writes a public GitHub issue with the grove-seed-draft label, a link to the original Scout research issue, a checklist of what still needs to be verified, an explicit stopping rule and hard permissions. The dashboard shows a small read-only archive.

## Trust boundaries

- Only issues authored by github-actions[bot], titled [GROVE-SCOUT] YYYY-MM-DD, carrying the grove-scout label, with a matching UTC creation date and exactly formatted scorecard fields, can be candidates.
- The origin is checked, but the research itself is NOT fact-checked. Issue bodies are treated as untrusted data, never instructions. No model output is executed as code.
- No model or API-key connection is involved in the Keeper. It has GitHub read access and issue-create access only.
- It never grants ARRAY-approved labels, automatically dispatches development work, merges PRs, deploys a commercial offer, accesses payments, handles payouts or messages customers.
- A run triggered by code push is DRY RUN and creates no Seed issue.
- No eligible daily Scout research? The keeper reports no candidate and performs no writes. Existing week issue? It skips.

## Why the one-week limit?

Internal research can explore many candidate ideas, but blindly creating new projects or public offers every day would bury review and risk inaccurate content. A single weekly draft reduces clutter while allowing the broader scouting system to keep running.

## Links

- GitHub Action: https://github.com/Link9060/Resonant-Grove/actions/workflows/grove-seed-keeper.yml
- Weekly Seed archive: https://github.com/Link9060/Resonant-Grove/issues?q=label%3Agrove-seed-draft
- Research archive: https://github.com/Link9060/Resonant-Grove/issues?q=label%3Agrove-scout

## Real test observations

You can log a genuine, privacy-safe, owner-reported observation through the [Grove Seed feedback form](https://github.com/Link9060/Resonant-Grove/issues/new?template=grove-feedback.yml). A scoped workflow adds a sanitized, explicitly UNVERIFIED receipt to the weekly Seed issue after checking the GitHub owner and provenance. It does not independently verify the tester, any statements, or market interest. See [Evidence ledger guide](GROVE-EVIDENCE.md).

## Next gate

Before anything can be sold, you still need accurate original deliverables, real voluntary feedback, eligibility checks, an appropriately authorized account owner, and separate safe publishing/payment integrations. No stage claims earnings until confirmed provider records exist.
