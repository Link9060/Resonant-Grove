# Isolated development preview: owner setup (Phase 1)

**Status: not deployed.** This document is a setup proposal, not permission to create an account, connect a provider, publish a site, or change production.

## Safety requirements

- Host only the `grove/release-platform-preview` branch from [PR #65](https://github.com/Link9060/Resonant-Grove/pull/65). Never use `main` as evidence of the development build.
- Use an isolated preview project with a distinct address. Disable production deployments and custom-domain binding for this project.
- No production credentials, Supabase service-role keys, payments, analytics, customer information, or production database access. Prefer local-only mode and a separate browser profile with disposable test data.
- Do not authorize public deployment or a third-party integration without separate informed owner approval. Confirm provider terms, age requirements, and free-tier quotas before any setup.
- A GitHub Actions artifact is downloadable test material, **not** a hosted preview.

## Candidate: isolated static-site preview

After owner approval and any required adult/account-owner participation, an owner may configure a free static-site host that supports Git branch previews. For example, Cloudflare Pages supports a Git-connected project. Use a *new isolated project* (not the production site), repository `Link9060/Resonant-Grove`, production branch set to the development branch **only if** the owner authorizes that deployment, and no build command for this static site. The output directory is the repository root if the provider supports it. Do not add secrets or enable automatic production promotion. Review the provider's access/public visibility behavior before enabling deployment.

This configuration is a **candidate**, not verified to be connected or deployed. The reviewer must verify the deployed output and its commit identity independently. If a host cannot guarantee branch isolation and an exact-head identity, do not call its URL a working preview.

## Exact-head verification

1. Record the full current PR head SHA from GitHub immediately before the deployment.
2. Confirm both source-validation and preview-package Actions checks passed on **that exact SHA**.
3. Verify the deployed files came from the development branch at that SHA, ideally using a build-provided full-SHA marker. A page title or manually typed SHA alone is not proof of provenance.
4. Open the unique preview URL in a fresh browser profile, check HTTP success and inspect actual application UI. Confirm it is not the main GitHub Pages URL.
5. Test Seed create/edit/refresh, Treasury and Journal persistence, backup export/import, mobile navigation, keyboard accessibility, and signed-out/offline behavior using only disposable data. Follow [PHASE1-ACCEPTANCE.md](PHASE1-ACCEPTANCE.md) for the full acceptance checklist.
6. On every subsequent commit, repeat exact-head verification. Mark prior URLs and artifacts stale until verified again.
7. Record the URL, SHA, provider, evidence, test results and blockers in PR #65's durable review queue. Never mark acceptance approved merely because a deployment or CI succeeds.

**Current blocker:** no authorized isolated branch-hosting destination or verified URL is configured. Until one exists, report **Preview unavailable** and use the exact-head downloadable Actions artifact for local testing only.
