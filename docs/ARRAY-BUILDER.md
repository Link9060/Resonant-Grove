# ARRAY Builder: Grove proof of concept

The workflow at `.github/workflows/array-builder.yml` adds a **real, manual, review-only** coding worker. It does not alter the live site unless its pull request is reviewed and merged.

## One-time owner setup

1. Open Grove > Settings > Secrets and variables > Actions.
2. Add an **Actions secret** named `OPENROUTER_API_KEY` using a key for your own account. Never paste a key into source or chat.
3. Add an **Actions variable** named `ARRAY_MODEL`, containing a currently available OpenCode model ID, e.g. `openrouter/<provider>/<model>`. Verify model availability and pricing with your provider before selecting it. Model inference is **not** guaranteed free.
4. Under Settings > Actions > General, ensure workflows have permission to create pull requests, if GitHub presents that control.
5. Merge this workflow PR after review. GitHub only offers `workflow_dispatch` from a workflow present on the default branch.
6. Open Actions > **ARRAY Builder (review-only)** > Run workflow, enter a single small objective such as "Make the Grove Seed empty-state instructions clearer."

## What happens

- Only manual runs from the repository owner's GitHub account execute this job.
- OpenCode runs on a temporary GitHub Actions runner. The workflow limits runtime to 25 minutes.
- Only the allowlisted site files can be staged; workflow/credential edits cannot be published.
- The job checks staged whitespace, verifies `app.js` syntax, and ensures primary site files exist.
- If changes are made and checks pass, a **draft** pull request is created for review. No merge or Pages deploy is triggered by the agent itself.
- Failure details are available under the Actions run's logs.

## What is NOT live yet

- ARRAY's Launch button does not start this job. For now, launch from GitHub Actions.
- Free-tier models have quotas, and may disappear or become rate-limited. GitHub Actions also has limits.
- This is one bounded job, not a perpetual agent. There is no automatic retry.
- The ARRAY Flight Monitor will display GitHub-reported runs separately from simulated and RAVIN text missions.
- Approval, model credentials, and the first end-to-end successful run are still needed.
