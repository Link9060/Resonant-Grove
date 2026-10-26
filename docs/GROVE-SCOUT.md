# Autonomous Grove Scout v1

## What runs by itself

The trusted scheduled workflow .github/workflows/grove-scout.yml attempts one research batch at 14:23 UTC, with a second catch-up window at 20:23 UTC if the morning job was delayed or skipped. GitHub schedules are best-effort and may be delayed or skipped. A preflight journal check skips model setup for the second run once that UTC date already has an entry.

The workflow uses a locally hosted Ollama qwen2.5:3b model on a GitHub Actions runner. It asks for THREE different zero-upfront-spend digital-product hypotheses in an explicitly allowlisted category. Code validates the output schema, content lengths, basic red-flag language and duplication. If model output fails, the workflow publishes explicitly labeled **curated fallback templates**, not something misrepresented as model-created work.

Before prototyping, a separate **deterministic Seed Evaluator** scores all three drafts using an explicit 12-point rubric: audience specificity, ease of making an offline prototype, consent-based feedback plan and uncertainty disclosure. It picks the highest-scoring draft, breaking ties by candidate number. These are text-only readiness indicators, **not evidence of demand, quality, legality, revenue or likelihood of success**. The selected idea becomes an *internal* Seed plan, not a launched business.

Each new research batch exports `seed-evaluation.json` and `seed-plan.md` alongside the worksheet. The plan lists what remains unverified, review requirements and the stopping rule. No AI output can grant permission to publish, spend, contact customers, dispatch ARRAY, or change payout settings.

After ideation, the same free local model attempts a second bounded task: drafting one original three-section printable worksheet/checklist with nine actionable items for the first idea. A validator rejects malformed or suspicious output, substituting a clearly labeled curated planning template when needed. The draft stays in the research issue for review; nothing is automatically marketed, sold, or claimed tested. Each successful new daily research batch also produces a 14-day GitHub Actions artifact containing a print-ready offline HTML worksheet, a Markdown draft and a plain-language READ-ME-FIRST note. This is a **review-only draft**, not a listed or sold product. Open the successful Scout workflow run → Artifacts to inspect the files.

A batch is a PUBLIC GitHub issue titled [GROVE-SCOUT] YYYY-MM-DD. It includes target audience hypotheses, possible helpful deliverables, prototype steps, ethical validation suggestions and caveats. No verified customers, demand, sales or revenue are claimed.

The label is grove-scout. The dashboard at https://link9060.github.io/Resonant-Grove/#autonomous reads a small public GitHub API journal feed and links to the source issue and Actions run. GitHub API reads have normal unauthenticated rate limits.

### Mission rules enforced

- No payments, withdrawals, bank credentials, ad purchases, subscriptions, Instagram posts, customer DMs or contact lists.
- No external API keys or paid OpenAI API. This job does not use ChatGPT subscription capacity or secretly access an open ChatGPT conversation.
- Not more than one journal issue per UTC day. A second check immediately before creation helps prevent duplicates.
- A model can propose a hypothesis but cannot change the source code, alter workflow permissions or issue itself an ARRAY-approved mission.
- Internal research is not market evidence. Any product/public commercial activity must follow platform rules and age/guardian requirements where applicable.
- No guarantees of revenue or autonomous monetization. GitHub Actions and Ollama compute are bounded by GitHub's normal account and runner policies, not infinite.

### Automated prototype QA and feedback evidence

After drafting a prototype, Scout performs five **static** checks: bounded 3×3 structure, action-oriented prompts, rough topic relevance, excessive repeated openings, and obvious unsupported promotional language. Its output is only **Needs human review** or **Needs revision**, never approved or verified. These checks are superficial and may miss factual mistakes, plagiarism, copyright issues, safety problems or poor product design.

If a local-model draft triggers warnings and the local model is available, Scout may try **one additional rewrite**, accepting the revision only if it reduces the number of static warnings. No extra costs or API keys are introduced. When the model fails or its output is rejected, the existing labeled planning fallback remains available.

Each new batch also includes `prototype-quality-audit.json` and a blank `evidence-and-feedback.md` worksheet in the existing GitHub Actions artifact. The worksheet is not evidence of an actual user test: a real person must consent, try the draft, and supply genuine observations before any demand claim. Do not put private participant details into public GitHub issues. Grove cannot certify originality or real market demand on its own.

### Model failures

If the local model cannot be installed, started, or downloaded within the bounded startup window, the workflow still attempts a **clearly labeled curated fallback** research issue and a planning worksheet. If the model returns invalid output, it also falls back. If GitHub API access itself fails, the job fails rather than assuming a clean state. View the Actions run for the exact source and error details.

### First complete pipeline rehearsal

When the owner opens a GitHub issue titled exactly `[GROVE-RUN] First research batch`, the trusted Scout Action is allowed to run its **actual issue-creation path** immediately. To keep the first full integration check quick and resilient, this special kickoff skips optional model installation and explicitly uses the curated-template fallback; it is not represented as model-generated research.

The run checks for an existing daily research journal, generates three explicitly unverified research hypotheses, evaluates their draft readiness, exports its printable internal worksheet plus quality report and blank evidence form, creates one public Scout journal issue, and then runs the weekly Seed Keeper **in the same GitHub Actions job**. The Keeper creates at most one weekly internal plan linking the new Scout issue. Artifacts have a 14-day retention period; owner can download them via the successful Actions run. No real user feedback is asserted.

Ordinary scheduled Scout runs and owner-triggered `workflow_dispatch` runs still attempt a bounded local Ollama model before falling back. Opening any other issue, or a matching issue opened by another account, cannot start the special kickoff. Reopening the title cannot retrigger it because only `issues.opened` is enabled, and the daily/weekly guards prevent duplicates.

This is a real end-to-end workflow rehearsal, not a venture launch. An issue-triggered curated fallback is not proof the local AI model can run; that must be confirmed by a later scheduled or manual Ollama-enabled run.

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
