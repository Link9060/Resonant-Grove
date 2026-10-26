# Grove Approved Idea Builder v1

This bridges the **browser-local ideas you already shortlisted** to a real, limited GitHub Actions build queue. It does not synchronize browser data silently, and it does not use your ChatGPT subscription as a model API.

## Use the existing shortlist

1. Open [Autonomous Grove](https://link9060.github.io/Resonant-Grove/#autonomous) **in the same browser** where you shortlisted ideas.
2. Beneath **Ideas & experiments**, press **Queue N selected ideas for building**.
3. The page opens a **prefilled GitHub issue**. Sign in as `Link9060`, review the public list of catalog indices, and click **Submit new issue**. Merely opening the GitHub page does not authorize or queue a build.
4. Opening a valid issue titled `[GROVE-BATCH] Approved idea prototypes` starts the first offline build. The Actions workflow then wakes hourly (best-effort) and builds **one unbuilt approved idea per run** until the batch is complete.
5. Each successful run archives the files for 30 days under GitHub Actions and then creates a bot-authored `[GROVE-PROTOTYPE] #<batch> / <catalogId>` issue linked to the run. Review the `prototype.html`, README and quality report there. The dashboard's Approved Idea Builder panel shows recent drafts.

The exact issue body looks like:

```
GROVE-APPROVAL-BATCH-V1
Catalog IDs: 1,4,6
Internal drafts only: YES
```

The selected catalog titles are public in the repository, and the GitHub issue is public. **Do not paste passwords, customer details, private records, API keys or financial information**. Only the twelve catalog concepts currently ship through this bridge; arbitrary custom ideas are not silently executed. The UI maps previously selected idea titles to their fixed catalog indices. To stop remaining work, close the owner-created `[GROVE-BATCH]` issue. Completed drafts remain recorded for transparency.

## What is actually built

Twelve distinct, original and printable *starter templates* covering bike maintenance, student planning, trail preparation, inventory counts, piano journals, yard estimation, volunteer events, beginner CAD exercise sketches, study planners, no-budget experiments, home labels and software changelogs.

Some prototypes are more interactive than others:

- Yard estimator: working offline area/depth-to-cubic-yard volume calculation for rectangular areas, with uncertainty disclosed.
- Inventory tracker: printable stock-count sheet and blank editable CSV.
- CAD exercise: basic SVG learning sketches and dimensions; not manufacturing or structural engineering data.
- Changelog: editable Markdown example.
- Others: tailored checklists, blank notes and printable grids.

**No generative AI model currently writes these drafts.** This first implementation uses deterministic original templates so it can run on GitHub's free Actions runner, is auditable, has zero discretionary spend, and cannot execute untrusted issue text. A later separate bounded AI revision worker could enhance the drafts, but cannot be assumed available from the presence of a ChatGPT chat subscription.

## Durable queue mechanics

- GitHub, not localStorage, holds the durable **submitted batch** and each per-item completed record.
- Owner identity and exact bounded body format are verified by the server. A third-party issue, forged title or uncontrolled instructions are not authorization.
- The worker processes oldest eligible batch, then lowest unbuilt catalog ID. No multiple simultaneous builds; 1 per successful workflow run.
- GitHub Actions workflow uses concurrency serialization, a read-only code checkout and scoped issue-write access. An upload must succeed **before** the completion journal issue is created.
- The builder rechecks that the owner batch is still open before recording. It uses public bot-authored, label-identified build issues to mark completion.
- If the issue collection fills GitHub's first 100 issues, worker **stops safely** rather than forgetting earlier completions. Pagination is a necessary future scaling upgrade, not an invisible workaround.
- A push-triggered smoke test is dry-run only. GitHub hourly schedules may be delayed or skipped. A repo owner can use Actions > Grove Approved Idea Builder > Run workflow for a single additional batch step.
- A build issue is not a storefront, committed website deployment, sale, verified original work or completed customer validation.

## Hard approval boundaries

All output is **offline internal review material**. No automatic website merge, Instagram/social post, contact to customers, subscriptions, spending, payment credentials, transfers, payouts or ARRAY Builder queue tasks. Quality checks only verify limited static criteria, not accuracy, safety, demand, copyrights or originality. A real human must inspect and decide whether to improve, test, retire or separately authorize any actual public venture.

Links: [Builder Actions](https://github.com/Link9060/Resonant-Grove/actions/workflows/grove-approved-builder.yml) · [Prototype issue journal](https://github.com/Link9060/Resonant-Grove/issues?q=label%3Agrove-prototype-draft)
