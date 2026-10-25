# ARRAY Auditor v1

ARRAY now has a separate automated GitHub review workflow that classifies completed Builder pull requests. By default, it is review-only: no automatic merges. The coding model cannot approve itself.

## How it works

1. The trusted GitHub workflow_run event fires after ARRAY Builder completes successfully.
2. Auditor reads the original run, its matching array/builder-(run-id) PR, changed-file list, and actual base/head CSS source.
3. It checks that the original run came from the repo owner, that the PR changed only one allowed CSS declaration, and that the change matches the original owner task exactly.
4. It adds a clear review report to GitHub Actions and a PR comment for eligible changes.

It NEVER checks out or executes unreviewed PR code. It uses trusted main-branch source and reads GitHub metadata and code as DATA.

## Automatic merge: optional and OFF by default

To enable automatic merging of the extremely small allowlisted changes, add a repository Actions variable:

- Name: ARRAY_AUTO_MERGE
- Value: true
- Repository: Link9060/Resonant-Grove
- Location: Settings > Secrets and variables > Actions > Variables

Do not enable until you have inspected a trial audit and are comfortable with the exact policy.

Only a verified owner-run Builder PR with exactly ONE 1–2px change of gap, row-gap, column-gap, padding, margin, or border-radius in .new-seed-card or .new-seed-plus qualifies. It must match the original requested selector/property/values exactly. The independent reviewer rechecks GitHub run provenance, changed files, unique source matches, and PR head SHA just before merging. No authentication, payments, databases, JS/HTML, dependencies, or other files are auto-merge eligible.

This is a deterministic, narrow auditor, not a general-purpose AI security reviewer. Human review still applies to larger changes.

## Test an existing draft PR

Open Grove > Actions > ARRAY Auditor (review-only by default) > Run workflow and enter the numeric Builder run ID shown in the draft PR's array/builder-(run-id) branch. Manual tests NEVER auto-merge, even with the toggle enabled.

## Disable and recover

Set ARRAY_AUTO_MERGE to false or remove it to stop automatic merges. There is no automatic rollback in this version. To undo an unwanted change, revert the merge commit and let the normal Pages deploy run.

## Security considerations

- A green Builder run is not by itself proof of safe code.
- GitHub workflow_run jobs can be privileged. Never execute untrusted PR head code or downloaded model artifacts in the Auditor.
- The Auditor only trusts code from main, checks live GitHub source bytes, and does not send data to any outside model.
- GitHub Actions availability and repository settings still apply.
