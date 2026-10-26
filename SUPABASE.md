# Grove Cloud (Supabase)

Grove optionally syncs the full local workspace and idea explorer to Supabase. **Local browser storage still works without an account or an internet connection.**

## Deployed connection

- Project: `bzjudqhjrbwglxdfbkmj` (existing RAVIN Supabase project).
- Table: `public.grove_workspaces` (owner-specific JSON workspace + explorer snapshot).
- Auth: Supabase email/password sign-in, registration, and Google OAuth sign-in **when Google is configured**.
- This integration uses only a public Supabase **publishable key** in browser code. It must never use a service-role or secret key.

The SQL migration `grove_array_owner_scoped_storage` has already been applied to that project. RLS is enabled, with four owner-only policies for each table. Anonymous clients have no table SELECT permission.

## Using it

1. Open the live Grove site and click **Cloud sign in**.
2. Sign in using a Supabase account belonging to this project (or create an account).
3. If there is no existing cloud workspace, Grove uploads the current local workspace automatically.
4. If this device and the cloud have different workspaces, you **must explicitly choose** to load the cloud copy or upload the device copy. This avoids silent overwrites.
5. After choosing, edits to seeds, transactions, journal, and explorer drafts automatically sync on a short debounce.

**Important:** Cloud sync uses a whole-workspace snapshot, not real-time per-record collaboration or offline conflict merging. Concurrent editing on two devices can overwrite changes. Use one active device at a time and export backups for important data. A browser copy remains on the device after sign-out.

Google sign-in requires Google as an enabled Supabase Auth provider and these allowed redirect URLs:

- `https://link9060.github.io/Resonant-Grove/`
- The local development origin if needed (for example `http://localhost:8080/`).

Google OAuth will not work until the provider is enabled with its credentials in the Supabase dashboard.

## Intentionally not connected

Grove still does **not** have payment processing, payouts, bank credentials, scheduled agents, or unattended real-world actions. The autonomous explorer remains a local idea-generation prototype; only its state is synchronized.

## Technical files

- `grove-cloud.js`: Supabase client, login, conflict handling, save/load.
- `grove-cloud.css`: account UI.
- `app.js`: `window.GroveWorkspace` load/save bridge.
- `autonomous-grove.js`: `window.GroveExplorer` load/save bridge.
- `index.html`: pinned Supabase SDK CDN and cloud UI script.

## Verification

The database was verified with SQL after the migration: RLS true, anonymous SELECT false, and four owner-only policies on `grove_workspaces`.

End-to-end browser sign-in and cross-device synchronization still need a test with a real user account.
