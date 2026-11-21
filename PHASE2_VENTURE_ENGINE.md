# Grove Phase 2: Venture Engine (Independent Development Track)

**Status:** Development authorized in isolation. **Production launch, live sales and merging remain approval-gated.**

## Purpose

Build a real, testable venture-creation engine in parallel with the Phase 1 Grove frontend. The engine should research promising low-cost, lawful ideas and create functional **offline/local prototypes** plus honest documentation and sale-readiness drafts. The Phase 1 UI does not need to be finished before this work starts.

## Branch ownership and coordination

- Source branch: `phase2/venture-engine`, created from `main`.
- The Phase 2 automated builder owns only this branch and any explicitly Phase-2-prefixed work branches. Do not edit Phase 1's development PR or release queue.
- Treat `main` as the accepted baseline. Avoid pulling unapproved Phase 1 PR changes into Phase 2.
- Use a durable Phase 2 draft pull request against `main` to track review items and actual commits. Never merge it automatically.
- If a Phase 1 feature becomes a dependency, document the contract and build an adapter or stub until the owner approves integration. Coordinate through clearly labeled issues/PR notes, without changing Phase 1 scope.
- If another task or human updated this branch, inspect differences and avoid overwriting their work.

## Build targets (in order)

1. **Idea evaluation:** Evidence-cited venture candidates with a scoring rubric: user problem, demand signals, original differentiation, feasibility, zero-cost build path, upkeep, legal/privacy risk, potential organic discovery, uncertainty and assumptions. Research is not proof of market validation.
2. **Venture specs:** Turn promising candidates into explicit product requirements, success criteria, user workflows, build plan and known limitations.
3. **Prototype engine:** Generate or construct runnable self-contained digital products or small websites using repository code, reproducible dependencies and mocked/local test data. Save an inventory of created assets.
4. **Automated validation:** Static checks, lint/tests when available, functional smoke tests for real behavior, content/accessibility/privacy reviews and reproducible local preview instructions. No claiming tests ran unless evidenced by a test command or workflow result.
5. **Sale-readiness (draft only):** Setup and handoff docs, IP/dependency audit, transparent data on traction or its absence, estimated operating needs, candidate customer positioning and unpublished listing copy.

## Suggested modular interfaces

- `ventures/<slug>/idea.md`: user problem, source links and dates, hypotheses, evidence vs assumptions.
- `ventures/<slug>/spec.md`: acceptance criteria and product architecture.
- `ventures/<slug>/src/`: actual product source, safe test fixtures and runnable code.
- `ventures/<slug>/tests/`: automatic tests and documented manual checks.
- `ventures/<slug>/handoff.md`: setup, constraints, dependencies, maintenance and sale-readiness status.
- `phase2/`: reusable evaluation rubric, test tooling, data schemas and orchestrator modules.
- `phase2/STATUS.md`: maintained cumulative review queue with stable IDs, specific test steps, verification evidence, blocked items, links and phase/version status.

Adapt this layout to the repository after inspecting existing code; do not duplicate mature tools already present.

## Nonnegotiable gates

**Allowed without additional approval:** researching and evaluating opportunities; making local/offline fixtures; writing code, docs, draft product copy and tests; producing isolated review branches and preview builds where there is no production change, real customer data or external publication.

**Separate owner approval required:** merging to `main`; live product launches; public posting/listings, outreach, account or domain registration; spending or subscriptions; connecting payment processors, real financial funds or customer data; collecting personal information; selling or transferring assets; and changing secrets or security settings. Any legally required adult/account-owner participation remains required. No circumventing age, service, or platform restrictions.

A green CI check, draft PR, or informal chat response is **not** authorization for the activities above. Preserve existing Grove production and release approval rules. Never fabricate revenue, users, purchases, market validation, or operational capabilities.

## First acceptance checkpoint

Complete a reliable **idea -> documented requirements -> functioning local prototype -> tests -> handoff package** path for one small original venture, with source and test artifacts visible on a Phase 2 draft PR. Show exactly how to run and test it, identify any mocked components, and leave it unlaunched pending explicit owner approval.

**Reporting:** The dedicated Phase 2 hourly builder records progress in its branch/PR; the existing Phase 1 builder and Grove Review Reports are not to be modified without a separate instruction.
