# ARRAY Builder: free local Ollama first run

The GitHub Actions workflow at `.github/workflows/array-builder.yml` runs a **small open-source coding model locally on GitHub's runner** with a carefully limited, structured-JSON copy editor. This initial version can revise one sentence, not autonomously refactor arbitrary source code. It is manual, bounded and review-only. No model subscription, provider API key, or credit card is needed for the local model.

## Launch a first test

1. In GitHub, go to **Resonant-Grove > Settings > Actions > General**.
2. Under **Workflow permissions**, enable **Allow GitHub Actions to create and approve pull requests** and save. This only lets the explicitly scoped publish job create a **draft** PR; it does not approve or merge anything automatically.
3. Go to **Resonant-Grove > Actions** and choose **ARRAY Builder (local Ollama, review-only)**.
4. Click **Run workflow**, select the `main` branch, enter the objective below, then click **Run workflow** again.

First objective:
> Improve the empty-state text in Grove's Seed area to make it clearer how to add the first Seed. Keep the change small; do not alter behavior or visual layout.

## ChatGPT-driven missions (via your existing GitHub plugin)

ARRAY can also start from a **GitHub issue created by the repository owner**. This allows ChatGPT, using the installed GitHub plugin, to request one limited Builder task without you opening the Actions launch form.

- Ask ChatGPT to create a Grove issue with a title starting with `[ARRAY] `, for example `[ARRAY] Clarify Seed empty state`.
- The **issue body** is the short task objective (1 to 1200 bytes).
- The issue must be created by GitHub user `Link9060`. Tasks opened by anyone else, or with a title missing the exact `[ARRAY] ` prefix, do not start model jobs.
- On opening the ticket, GitHub Actions starts the exact same **review-only** Builder workflow that passed the first manual test.
- Successful edits are presented in a **draft pull request**, linked back to the source issue. The issue stays open until someone reviews the result.
- You can view execution progress from Grove's Actions tab or the ARRAY Flight Monitor.

**Important:** Grove issues are public. Do not include passwords, API keys, private plans, medical information, or other personal data in task objectives. Issuing a task is not a command to deploy or merge code. The current model can edit one existing user-visible sentence only, not implement arbitrary application features.

Example user request to ChatGPT:

> Give ARRAY Builder a task: improve Grove's empty-state guidance so new users know where to begin. Open the owner-scoped [ARRAY] issue and monitor its run, but don't merge any AI-generated code.

This workflow is a useful bridge for GPT-assisted task delegation, but it does not give ARRAY access to an unlimited GPT-6 model. GitHub runs the local Ollama model.

## What it does

- Runs **Ollama with Qwen2.5-Coder 3B** on a GitHub Actions virtual machine. There is **no OpenRouter key**.
- The model may be slow or unsuccessful because it runs on CPU and is small; keep first tasks tiny.
- The local model proposes one exact old-text/new-text replacement in `app.js` or `index.html`. Trusted code validates the replacement, refuses full-file overwrites, and only then applies it.
- A dedicated unprivileged job prepares website files but has **no GitHub write token**.
- A separate publish job checks the proposed website source and, if there is a real change, creates a **draft** pull request for human review.
- Nothing merges or publishes the AI-written website changes without subsequent human action.
- The workflow has a 25-minute worker limit. No recurring model runs are enabled by this setup.

## Troubleshooting

- **Workflow not visible:** reload Actions and check you are on the repository's default branch.
- **Pull request permission denied:** revisit Settings > Actions > General > Workflow permissions. Some accounts or repository rules can disallow it.
- **Ollama install or model download fails:** open the failed step's logs. A transient network issue may be retried once.
- **No source changes / validation rejected:** the model did not produce a correct existing-text match. Inspect the safe-editor error and use a more specific objective. Never force an arbitrary file overwrite.
- **First historical run failed:** run `40152042921` exposed OpenCode displaying a pretend `write` tool call as text. The structured editor bypasses that unreliable tool-calling path. **Start a new run**, not a rerun of that old run.
- **Slow processing:** the model is running locally on CPU, with no dedicated GPU.

The ARRAY Flight Monitor shows public GitHub Actions status. The ChatGPT hourly watchdog checks actual run outcomes but cannot guarantee an unattended successful fix. Do not add any provider keys, payment details, or credentials to the repository.

## ARRAY Builder v2: bounded code mode (experimental)

The original copy editor remains the default and is unchanged. A separate **code mode** has been added for tiny, review-only logic or presentation improvements:

- **From ChatGPT:** open a task issue titled `[ARRAY-CODE] Specific task name` from the owner GitHub account. The issue body is the full objective, maximum 1200 bytes.
- **From Actions:** choose `mode = code` under the existing manual workflow form.
- **From ordinary `[ARRAY] ...` issues:** continue using copy mode.

In code mode, local Qwen2.5-Coder 3B proposes **1 to 3 exact find/replace hunks**, touching at most **two of app.js, index.html, styles.css**. The trusted runner refuses missing/ambiguous matches, disallowed files, oversized patches, several high-risk code patterns, broken JavaScript syntax, unexpected CSS brace changes, and malformed HTML structure. The runner tries one corrected proposal if validation fails.

After a passing local validation, the separate publisher can open a **draft PR only**. The AI model never receives GitHub write credentials. **There is no automatic merge or deployment.** This is not yet a general coding assistant: no new files, dependencies, complex refactoring, arbitrary commands, or guarantee that the 3B model will produce a usable patch.

Suggested first code-mode test task:

> Improve the visible styling of the New Seed card using a very small CSS adjustment, such as slightly refining its existing spacing. Preserve layout and behavior. Make one targeted change to styles.css only.

If both model proposals fail verification, the worker can now recover **only explicitly specified CSS spacing changes**: the task must name one unique class selector and an exact old-to-new declaration (for example, `gap:13px` to `gap:14px`). A trusted code path locates the selector in the actual stylesheet, validates a small numeric change, and passes the same code checks. This is **deterministic recovery**, not successful model tool use. Every proposed change still needs a human-reviewed PR. Other invalid proposals fail without changing the live site. Inspect the run logs and refine the task. A passing workflow is evidence that the bounded checks succeeded, not proof of full functional or security correctness.

## Later upgrades

For higher intelligence, OpenCode also supports account-based ChatGPT sign-in for eligible personal terminal sessions. That interactive login is separate from this unattended GitHub Actions job and is not wired into this workflow. The read-only ARRAY MCP bridge still needs separate HTTPS hosting and an eligible custom MCP connection.
