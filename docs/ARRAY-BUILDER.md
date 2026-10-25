# ARRAY Builder: free local Ollama first run

The GitHub Actions workflow at `.github/workflows/array-builder.yml` runs a **small open-source coding model locally on GitHub's runner** with a carefully limited, structured-JSON copy editor. This initial version can revise one sentence, not autonomously refactor arbitrary source code. It is manual, bounded and review-only. No model subscription, provider API key, or credit card is needed for the local model.

## Launch a first test

1. In GitHub, go to **Resonant-Grove > Settings > Actions > General**.
2. Under **Workflow permissions**, enable **Allow GitHub Actions to create and approve pull requests** and save. This only lets the explicitly scoped publish job create a **draft** PR; it does not approve or merge anything automatically.
3. Go to **Resonant-Grove > Actions** and choose **ARRAY Builder (local Ollama, review-only)**.
4. Click **Run workflow**, select the `main` branch, enter the objective below, then click **Run workflow** again.

First objective:
> Improve the empty-state text in Grove's Seed area to make it clearer how to add the first Seed. Keep the change small; do not alter behavior or visual layout.

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

## Later upgrades

For higher intelligence, OpenCode also supports account-based ChatGPT sign-in for eligible personal terminal sessions. That interactive login is separate from this unattended GitHub Actions job and is not wired into this workflow. The read-only ARRAY MCP bridge still needs separate HTTPS hosting and an eligible custom MCP connection.
