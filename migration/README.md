# Grove / ARRAY transfer into ARROW Supabase

## Status

The destination tables were created additively in the ARROW/Relay Supabase project:
- public.grove_workspaces
- public.array_saved_missions

Both tables use owner_id = auth.uid(), four RLS policies each, and no anon grants. As of first setup, both were empty. The *original RAVIN project remains unchanged*.

## Why this needs two accounts

The old RAVIN project and ARROW/Relay are separate Supabase Auth projects. Identical email addresses do not imply identical user UUIDs or sessions. The transfer remaps each row to the **currently authenticated ARROW user ID**. Only the old user's records can be read using their old sign-in. No direct access to the service-role key is required.

## Controlled migration page

Once deployed through GitHub Pages, visit:
https://link9060.github.io/Resonant-Grove/migration/

1. On the **same GitHub Pages origin**, sign in to https://link9060.github.io/Resonant-Relay/ with the desired ARROW account.
2. Return to the migration page and click **Check ARROW account**. Check the displayed account is correct.
3. Enter the **old RAVIN account** email and password into the migration page. It calls that project's Supabase Auth over HTTPS and holds the session in browser memory only.
4. Click **Inspect my old data**. The page reads only that user's Grove workspace and ARRAY mission snapshots. If the old database is unavailable, it fails closed without copying anything.
5. Save the private JSON backup to a trusted device. This backup can include private task notes and mission outputs. Never commit it or upload it publicly.
6. Explicitly approve copying and use **Copy to ARROW**. It inserts the Grove workspace only if the destination has none, and inserts ARRAY mission history without overwriting matching mission IDs.
7. Verify the displayed destination counts and your data in both apps after their code is switched to ARROW Supabase.

This page **never deletes old records**, never starts or authorizes an ARRAY worker, and never automatically overwrites an existing destination workspace. If a batch fails, retry only after inspecting the destination; the transfer can be partially complete.

## Not finished by this tool

- Existing old source data has not been copied automatically. The source Postgres connection from the management API timed out during preflight. A user sign-in and successful browser read are needed.
- The existing Grove app and ARRAY cloud client still point at the old Supabase project until the separate app code cutover is tested and deployed.
- ARRAY's **live mission API** still uses the older RAVIN 1.1 JWT. Its server-side configuration/authentication path must migrate before shutting down the old project, or live missions must be retired explicitly.
- Authentication may require manual login on each *different web origin*, even if both applications use the same Supabase project. Sharing the localStorage storage key only works on the same origin.

## Safety

Do not pause the old Supabase project until migration has been checked end-to-end, ARRAY's live API dependency is resolved, and account-specific data backups have been verified. Keep Relay's existing tables and security policies unchanged.
