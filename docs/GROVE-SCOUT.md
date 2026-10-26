# Autonomous Grove Scout v1

## What runs by itself

The trusted scheduled workflow .github/workflows/grove-scout.yml attempts one research batch daily at 14:23 UTC. GitHub schedules are best-effort and may be delayed or skipped.

The workflow uses a locally hosted Ollama qwen2.5:3b model on a GitHub Actions runner. It asks for THREE different zero-upfront-spend digital-product hypotheses in an explicitly allowlisted category. Code validates the output schema, content lengths, basic red-flag language and duplication. If model output fails, the workflow publishes explicitly labeled **curated fallback templates**, not something misrepresented as model-created work.

A batch is a PUBLIC GitHub issue titled [GROVE-SCOUT] YYYY-MM-DD. It includes target audience hypotheses, possible helpful deliverables, prototype steps, ethical validation suggestions and caveats. No verified customers, demand, sales or revenue are claimed.

The label is grove-scout. The dashboard at https://link9060.github.io/Resonant-Grove/#autonomous reads a small public GitHub API journal feed and links to the source issue and Actions run. GitHub API reads have normal unauthenticated rate limits.

### Mission rules enforced

- No payments, withdrawals, bank credentials, ad purchases, subscriptions, Instagram posts, customer DMs or contact lists.
- No external API keys or paid OpenAI API. This job does not use ChatGPT subscription capacity or secretly access an open ChatGPT conversation.
- Not more than one journal issue per UTC day. A second check immediately before creation helps prevent duplicates.
- A model can propose a hypothesis but cannot change the source code, alter workflow permissions or issue itself an ARRAY-approved mission.
- Internal research is not market evidence. Any product/public commercial activity must follow platform rules and age/guardian requirements where applicable.
- No guarantees of revenue or autonomous monetization. GitHub Actions and Ollama compute are bounded by GitHub's normal account and runner policies, not infinite.

### Model failures

If the local model cannot be installed, the job may fail before the fallback stage. If the model service is available but returns invalid output, it falls back to curated templates and makes that explicit in the issue. View the Actions run for error details.

### Commands and configuration

To inspect runs, visit:
https://github.com/Link9060/Resonant-Grove/actions/workflows/grove-scout.yml

To view completed research batches:
https://github.com/Link9060/Resonant-Grove/issues?q=label%3Agrove-scout

Running the workflow manually is supported for repo owners, and checks if a batch for the day already exists.

To pause the scout, disable the workflow in GitHub Actions. To resume, re-enable it. The startup push check is observe-only and creates no issue or model work.

### What remains before full hands-off venture execution

A future private authenticated research store, originality checks, human oversight for public promotions, original deliverable production, real demand evidence, secure eligible payment processor and transaction reconciliation, and a far more capable bounded worker.

ARRAY Supervisor and the Grove Scout are independent. The Scout can plan while Builder is blocked by review PRs. The current Builder is intentionally not authorized to turn arbitrary generated business ideas into code or public sales.

## Safety principle

A research note is not proof of market demand. A displayed revenue number is not actual money without verified payment-provider records. Agents must not be given bank access or authority to spend, transfer or withdraw.
