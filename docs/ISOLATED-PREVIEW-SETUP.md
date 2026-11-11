# Isolated development preview: owner setup (Phase 1)

**Status: Cloudflare deployment reported, browser verification outstanding.** The Cloudflare bot on [PR #65](https://github.com/Link9060/Resonant-Grove/pull/65) reports development deployments, but a bot success message is not proof that a browser can reach the site or that its content matches the latest PR SHA. This document does not authorize a new deployment, provider connection, or production change.

## Safety requirements

- Host only the `grove/release-platform-preview` branch from [PR #65](https://github.com/Link9060/Resonant-Grove/pull/65). Never use `main` as evidence of the development build.
- Use an isolated preview project with a distinct address. Disable production deployments and custom-domain binding for this project.
- No production credentials, Supabase service-role keys, payments, analytics, customer information, or production database access. Prefer local-only mode and a separate browser profile with disposable test data.
- Do not authorize public deployment or a third-party integration without separate informed owner approval. Confirm provider terms, age requirements, and free-tier quotas before any setup.
- A GitHub Actions artifact is downloadable test material, **not** a hosted preview.

## Candidate: isolated static-site preview

After owner approval and any required adult/account-owner participation, an owner may configure a free static-site host that supports Git branch previews. For example, Cloudflare Pages supports a Git-connected project. Use a *new isolated project* (not the production site), repository `Link9060/Resonant-Grove`, production branch set to the development branch **only if** the owner authorizes that deployment, and no build command for this static site. **Do not publish the repository root directly:** it contains development files outside the reviewed artifact. Configure a build step that copies only the allowlisted application assets into a dedicated output folder, and set the host's publish directory to that folder. The existing `.github/workflows/grove-preview.yml` is the reference allowlist; preserve its `REVIEW.txt`, `review.html`, and `SHA256SUMS.txt` provenance and integrity checks when preparing a hosted build. Verify that the host's deployed commit equals the current PR head SHA, and that no `.git`, `.github`, tests, or unreviewed files are published. A hosted preview is not verified solely by showing a SHA in HTML. Do not add secrets or enable automatic production promotion. Review the provider's access/public visibility behavior before enabling deployment.

This configuration is a **candidate**, not verified to be connected or deployed. The reviewer must verify the deployed output and its commit identity independently. If a host cannot guarantee branch isolation and an exact-head identity, do not call its URL a working preview.

## Safe local staging rehearsal (no hosting or publication)

Before configuring any provider, verify the allowlisted package locally using the existing exact-head Actions artifact. Download and extract the `grove-review-<SHA>` artifact into a disposable folder, then run from that folder:

```bash
python3 scripts/verify_review_artifact.py .
python3 scripts/serve_review.py . --expected-sha <FULL_CURRENT_PR_HEAD_SHA>
```

The first command must pass integrity and file-allowlist checks; the second serves **only on 127.0.0.1**, never the public internet. Inspect `review.html` and `index.html` in the browser. The packaged artifact root is the reviewed publishable file set; **do not point a host at the repository root**. The provider's eventual build/output configuration must reproduce this allowlisted set, without copying a ZIP or source directory wholesale. Do not copy local browser storage or credentials to a hosted environment. This rehearsal is not a hosted preview and does not authorize one.

## Exact-head verification

1. Record the full current PR head SHA from GitHub immediately before the deployment.
2. Confirm both source-validation and preview-package Actions checks passed on **that exact SHA**.
3. Verify the deployed files came from the development branch at that SHA, ideally using a build-provided full-SHA marker. A page title or manually typed SHA alone is not proof of provenance.
4. Open the unique preview URL in a fresh browser profile, check HTTP success and inspect actual application UI. Confirm it is not the main GitHub Pages URL.
5. Test Seed create/edit/refresh, Treasury and Journal persistence, backup export/import, mobile navigation, keyboard accessibility, and signed-out/offline behavior using only disposable data. Follow [PHASE1-ACCEPTANCE.md](PHASE1-ACCEPTANCE.md) for the full acceptance checklist.
6. On every subsequent commit, repeat exact-head verification. Mark prior URLs and artifacts stale until verified again.
7. Record the URL, SHA, provider, evidence, test results and blockers in PR #65's durable review queue. Never mark acceptance approved merely because a deployment or CI succeeds.

**Current blocker:** Cloudflare has reported development deployments, but independent DNS/HTTP access and deployed-content identity have not been verified for the current PR head. Do not describe the provider as unconfigured without checking the PR deployment status. Until an accessible URL is confirmed at the exact SHA, report **Preview unavailable** and use the exact-head downloadable Actions artifact for local testing only.

### Troubleshooting an already reported Cloudflare deployment

1. Read the latest Cloudflare bot comment and GitHub deployment/check records for the PR. Capture the reported deployment URL and commit SHA without assuming either is current.
2. Compare that SHA with the current PR head. A prior-head success is **stale** after any new commit.
3. From an independently network-connected browser, open the deployment URL and inspect HTTP response, the review page, and application assets. If DNS fails only in the worker runtime, record that as a **verification-environment limitation**, not proof that Cloudflare hosting is broken.
4. Verify the provider's deployment metadata associates the URL with the exact head and verify the served allowlisted asset set. A manually rendered SHA string alone does not establish content identity.
5. Record observed result, date, tested SHA, URL, and remaining blockers in the PR. If any evidence is missing, leave manual browser acceptance untested. Never redeploy, modify credentials, or promote production merely to resolve a verification limitation.
