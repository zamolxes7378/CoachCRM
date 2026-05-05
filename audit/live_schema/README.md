# CoachCRM — Schema snapshot

Static extraction from `supabase/` migration files + `src/data/adapters.js` +
`src/services/**.js` + `docs/MON_ARCHITECTURE_DONNEES.md`.

**Live-DB verification was not possible** from this audit environment — the
Supabase MCP available was bound to a different project (`kotech-cra`), not to
`ncjdvohafipisjcslrkk` (CoachCRM). Any finding tagged `[Unverified]` must be
confirmed against the live Supabase dashboard before remediation.

Project coordinates (from `docs/SETUP_GUIDE.md`, committed to git):

| Field | Value |
|---|---|
| Organisation | CoachCRM |
| Plan | Free |
| Project | claudia@kotech.ai's Project |
| Project ID | `ncjdvohafipisjcslrkk` |
| Region | `eu-west-2` (London) |
| API URL | `https://ncjdvohafipisjcslrkk.supabase.co` |
| PostgreSQL | v17 |

See `tables.md` for the full table inventory built from static sources.
