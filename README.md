# 🌱 Grove, by Resonant

**Plant small ideas. Grow what works. Fund what comes next.**

Grove is the venture ecosystem for experiments that could eventually fund larger Resonant projects such as ARROW, RAVIN, and Resonant Bikes.

## Prototype

A responsive, single-page Grove workspace designed around the idea that a Seed should **earn, teach, or retire**.

- **Overview:** live local summary, first-dollar milestone, recent activity, and a next-action suggestion.
- **Seeds:** create, edit, archive/restore, delete, and manage steps for experimental ventures.
- **Treasury:** manually record income and expenses, track net available funds, see a six-month cash-flow chart, and associate records with Seeds.
- **Journal:** event history and personal notes.
- **Settings:** import/export JSON backup and reset the local workspace.
- **Grove Cloud:** optional Supabase account sign-in and owner-scoped cross-device workspace sync, with explicit resolution when local and remote copies differ.
- **Mobile:** responsive dashboard and navigation.

The starter Seed, **The First Dollar**, begins with three editable steps and a $1 revenue goal. All financial values start at $0, not fabricated demo transactions.

## Live prototype

Once the GitHub Pages Action is deployed: **https://link9060.github.io/Resonant-Grove/**

## Deployment

The repository includes a workflow in `.github/workflows/deploy.yml`. In **Settings → Pages**, set **Build and deployment → Source: GitHub Actions**. Every push to `main` then automatically publishes the static website. The workflow can also be triggered manually.

## Run locally

Open `index.html` with a modern browser, or serve this folder using any simple local HTTP server. No npm install or build step is needed. The browser can work locally without cloud sign-in; Supabase sync is optional.

## Important prototype limits

- Grove saves a local browser copy and can optionally sync the workspace and explorer drafts to an authenticated Supabase account. Signed-out offline data is device-specific and can be lost if storage is cleared.
- The **Keeper** is a transparent rules-based suggestion panel, **not** an AI agent or GitHub controller yet.
- Transactions are **manual records**; there is no payment processing, banking, invoicing, or financial account connection.
- Future ARROW, RAVIN, and Bikes projects appear as a **vision**, not existing funded investments.
- Never store sensitive financial information or secrets in local notes; this is an early prototype.

## Roadmap

1. Validate Seed 001 with the first real dollar.
2. [Implemented foundation] Optional Supabase authentication and owner-scoped workspace sync. See [SUPABASE.md](SUPABASE.md) for setup, limitations, and testing.
3. Introduce an approval-based Keeper that can plant, update, and retire Seeds and use authorized integrations.
4. Add real revenue and expense integrations, budget guardrails, and investment planning.
5. Expand Grove into its distinctive venture forest visualization.

**Design philosophy:** organic, quiet, precise, and focused. Grow deliberately.
