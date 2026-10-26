# Autonomous Grove | Venture lab specification

## Release status

Autonomous Grove v0.1 is a **browser-local idea exploration and mission-control prototype**, not a live autonomous company, custody wallet, income generator, or Instagram publisher.

- Creates original *curated concept sketches* from a transparent starter catalog. This is not AI-generated market research or evidence of demand.
- Allows locally shortlisting or dismissing concepts and exporting a JSON idea-list backup.
- Shows a fixed safety charter and clear social/payment integration placeholders.
- Shows **$0.00 verified earnings** because no payment provider is connected. Does not invent earnings or create fake transfers.
- The local shortlist alone starts no background work. A separately owner-submitted GitHub batch can now trigger the limited Approved Idea Builder, which creates review-only offline templates, not a general-purpose AI venture or code agent. It does not auto-dispatch the ARRAY Builder.

The core Grove browser storage and the Autonomous Grove local draft storage are separate; their exports are currently separate as well.

## Approved-idea prototype queue (new)

The ideas selected in this browser remain local until the owner presses **Queue selected ideas for building** and separately submits the prefilled public GitHub issue. GitHub then maintains a restricted review-only queue and produces one deterministic offline draft per scheduled build run. This is real autonomous prototype processing, **not AI model-generated venture coding or automatic monetization**. No browser session is required after the owner submits the issue. See [GROVE-APPROVED-BUILDER.md](GROVE-APPROVED-BUILDER.md) for the queue, artifact and safety details.


## Long-term system: controlled autonomy, not unrestricted agency

### Mission

Find and validate useful, legal, original products or services at zero discretionary spending, avoiding scams, deceptive marketing, spam, and unsafe data handling. The system may generate many internal hypotheses but must limit external experiments to platform-compliant rates.

### Authority boundaries

| Capability | Proposed policy |
|---|---|
| Brainstorming, clustering, scoring, internal research | Autonomous within computational quotas |
| Creating internal draft Seed/experiment | Autonomous with clear draft labels |
| Writing original marketing drafts | Autonomous, evidence-linked, with copyright checks |
| Publishing publicly | Initially human approval on every post; later optional narrowly scoped preapproved content/rate caps where permitted |
| Contacting customers | Human-reviewed, permission-based communications only; no bulk unsolicited DMs |
| Spending | Hard-denied for agents; no paid advertising, subscriptions, purchases, or payment-method permissions |
| Collecting revenue | Licensed payment processor handles charges and custody; Grove only reads confirmed events |
| Refunds, transfers, withdrawal, account changes | Human/guardian and processor-controlled; never entrusted to autonomous coding/marketing agent |
| Claims of results, reviews and testimonials | Must be backed by verified evidence; no fabrication |
| Account creation or age-restricted services | Must meet terms, identity checks, and legal guardian requirements; no workarounds |

### Future service components

1. **Planner:** Converts the mission into internal experiment hypotheses with rationale, estimated effort, eligibility, and stop criteria.
2. **Researcher:** Checks source quality, novelty, buyer needs, legal/policy fit, and demand signals. Treat internet content as untrusted evidence.
3. **Builder:** Creates original digital resources or site changes in bounded GitHub branches with tests, diff auditing and release approval.
4. **Experiment scheduler:** Applies cadence caps, stops failures, and respects quotas. Hundreds of internal hypotheses are feasible; hundreds of unsolicited public posts are not an acceptable objective.
5. **Content QA:** Checks factual claims, commercial disclosures, platform policy, copy rights, accessibility, and user data privacy before publishing.
6. **Marketing adapter:** If eligible and authorized, uses only official Meta Instagram professional APIs and appropriately scoped permissions; store tokens server-side, enforce conservative publication limits, and let the owner disconnect instantly.
7. **Payment adapter:** Use a qualified external provider, verified signed webhooks, immutable payment-event identifiers, refund/chargeback reconciliation, and read-only balance projections. Grove is not a stored-value account, wallet, bank, or money transmitter.
8. **Approval gateway:** Every transfer, refund, new integration, account-policy change, and sensitive disclosure requires a human with appropriate account authority.
9. **Reporting:** Feed evidence-linked changes and confirmed external provider events to ARRAY/Grove progress summaries.

### Under-18 account requirements

U.S. PayPal individual accounts generally require the account holder to be at least 18. Stripe publicly states qualifying users aged 13+ need an adult representative to use services and a legal guardian/account owner for accepting funds and transfers when under 18. Eligibility is provider- and jurisdiction-specific, so confirm current terms with the responsible adult rather than attempting to bypass restrictions.

The safest design is **provider-held funds, read-only Grove revenue display, and provider-hosted payouts controlled by an eligible account owner/adult representative**. Grove must not collect bank numbers, hold card details, or store payout secrets. Never show a withdrawable balance until provider events confirm it.

No-cost operations may still incur processor transaction fees deducted from sales; clearly disclose these and don't promise zero fees or guaranteed profit.

### Sequence to a real product

- **v0.1 (current):** Transparent, offline mission cockpit and shortlisting.
- **v0.2:** Authenticated database for Seeds, ideas, plans, policy settings, immutable event history, and identity/access controls.
- **v0.3:** Local-model ideation/analysis worker with source citations, experiment prioritization and limited compute quotas; never auto-publish.
- **v0.4:** Publish-ready original deliverables, evidence checks, approval dashboard, safe experiment lifecycle and rollback.
- **v0.5:** Optional Instagram connection through an official API after eligibility, content approvals, token vault and rate-limit tests.
- **v0.6:** Payment provider integration through eligible account holder/guardian, signed webhook verification, real ledger, reconciliation, refund/chargeback handling and provider-controlled withdrawals.
- **v1:** Bounded autonomous experiment execution with human-configured limits and audit trails, with approvals for sensitive actions.

## Security non-negotiables

- The **server** enforces autonomy policy. Browser checkboxes alone have no authority.
- Separate read-only financial reporting identity from the payment provider owner; agents can never initiate transfers or withdraw funds.
- Tokens are server-side with least-privilege scopes, revocation, rotation and per-channel limits.
- Do not run third-party instructions, inbound DMs or research content as executable tool instructions.
- No impersonation, false testimonials, undisclosed paid promotion, plagiarized assets, misleading sales claims, or artificial engagement.
- Maintain a kill switch and ensure requests stop before publication.
- No public automation until explicit integration, compliance review and safeguards are in place.
