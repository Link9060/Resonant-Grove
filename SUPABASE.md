# Grove Cloud (Supabase)

Grove optionally syncs the full local workspace and idea explorer to Supabase. **Local browser storage still works without an account or an internet connection.**

## Current connection

Grove's live GitHub Pages site has switched to the ARROW/Relay Supabase project. The owner explicitly chose to begin with empty cloud storage instead of migrating old RAVIN project data. No old records were deleted.

## ARROW/Relay database

- Destination project: `cnorozrjugxpanpfmssa` (ARROW/Relay Supabase project).
- Table: `public.grove_workspaces` (owner-specific JSON workspace + explorer snapshot).
- Auth: the existing ARROW/Relay account, reusing its browser session when Grove and Relay run on the same GitHub Pages origin. Email/password or Google provider availability depends on ARROW's authentication configuration.
- This integration uses only a public Supabase **publishable key** in browser code. It must never use a service-role or secret key.

A separate `grove_array_relay_owner_scoped_storage` migration has been applied to ARROW/Relay. The original project's data has **not** been copied automatically. RLS is enabled, with four owner-only policies for each table. Anonymous clients have no table SELECT permission.

## Using it

1. Open the live Grove site and click **Cloud sign in**.
2. Sign in using a Supabase account belonging to this project (or create an account).
3. If there is no destination workspace, Grove does not upload anything automatically. Use the migration tool at `/migration/`, or verify the local copy and choose **Upload this device** explicitly.
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

## Migration status and caveats

The optional transfer tool remains accessible at `/migration/` but copying old data is not required for the approved fresh start. Real-account, cross-device sign-in and sync still need end-to-end browser verification. If Relay is on a different web origin than Grove, authentication storage cannot be shared across origins and a separate sign-in may be necessary. The old RAVIN Supabase project was not deleted; Supabase currently refuses to pause it because its internal state is hibernating, despite the project listing as `ACTIVE_HEALTHY`. ARRAY's legacy RAVIN 1.1 live-mission API was intentionally disabled by default during migration.
