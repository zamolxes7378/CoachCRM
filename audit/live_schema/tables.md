# Tables (static inventory)

Legend:
- **M** = declared in `supabase/migration.sql`
- **P** = referenced in one of the small patch files (`add_family_type.sql`,
  `remove_completed_status.sql`, `dev_rls.sql`, `transfer_data.sql`,
  `update_roles.sql`)
- **A** = inferred from `src/data/adapters.js` read/write maps
- **S** = referenced in `src/services/**.js` via `.from('…')`
- **D** = declared in `docs/MON_ARCHITECTURE_DONNEES.md`

## Tables referenced at runtime

| Table | M | P | A | S | D | Base-schema migration committed? |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `users` | ✔ | ✔ | — | ✔ | ✔ | yes (`migration.sql`) |
| `clients` | ✔ | ✔ | ✔ | ✔ | ✔ | yes (`migration.sql`) |
| `sessions` | ✔ | — | ✔ | ✔ | ✔ | yes (`migration.sql`) |
| `reports` | ✔ | — | ✔ | ✔ | ✔ | yes (`migration.sql`) |
| `contacts` | ✔ | ✔ | ✔ | ✔ | ✔ | yes (`migration.sql`) |
| `professionals` | ✔ | — | ✔ | ✔ | ✔ | yes (`migration.sql`) |
| `client_links` | ✔ | — | — | — | partial | yes, **but also stored inline as `clients.client_links` JSONB** — two sources of truth |
| `professional_referrals` | ✔ | — | — | — | — | yes, **but never queried by the app** — likely dead |
| `settings` | ✔ | — | — | ✔ | ✔ | yes |
| `therapy_cycles` | — | — | ✔ | ✔ | ✔ | **NO** (referenced by docs + app, no migration) |
| `invoices` | — | — | ✔ | ✔ | — | **NO** (referenced by app, not in docs or migrations) |
| `invoice_sessions` | — | — | — | ✔ | — | **NO** (join table, no migration) |

## Columns observed at runtime (from adapters/services) that are NOT in `migration.sql`

### `clients` — columns added outside version control

- `billing_address` text
- `client_links` JSONB
- `external_referrer` JSONB
- `deleted_at` timestamptz (soft delete)
- `session_rate` numeric
- `session_frequency` integer
- `ai_synthesis` text (JSON-encoded)
- `note_dynamique` / `note_axes` / `note_vigilance` / `note_objectifs` text
- `axes_travail` / `points_vigilance` / `objectifs` / `dynamique_relationnelle` text
  (per `docs/MON_ARCHITECTURE_DONNEES.md` §2 — duplicative with `note_*` above)
- `type` `'family'` (added by `add_family_type.sql`; **same logic is inconsistent**
  in `dataService.js` and `allianceService.js`, which still switch on
  `client|individual|couple`)

### `sessions` — columns added outside version control

- `cancellation_reason` text
- `payment_date` date
- `invoice_covered_session_ids` JSONB
- `covered_session_ids` JSONB

### `reports` — columns added outside version control

- `client_name` text (snapshot)

### `settings` — columns added outside version control

- `therapy_phases` JSONB
- `default_therapy_config` JSONB

### `professionals` — columns added outside version control

- `referrals` JSONB (per docs; not seen in adapter)

### `users`

- No drift observed — base migration matches runtime.

## Tables present in `migration.sql` but never used by the app

| Table | Impact |
|---|---|
| `professional_referrals` | Dead table. Equivalent data lives in `clients.client_links` (type `parrainage-pro`). Confusion risk. |

## Migration files on disk

| File | Status | Notes |
|---|---|---|
| `migration.sql` | base schema | Comprehensive but stale vs runtime |
| `seed.sql` | dev seed | **Hard-coded prod email** `claudia@kotech.ai` (line 49 of `transfer_data.sql`); seed.sql seeds a real-person email `anne-chantal.meyer@gmail.com` (personal data) |
| `dev_rls.sql` | RLS hardening | Drops insecure `Dev: public access` policies and reapplies per-user policies — but only on 6 tables; `professionals` / `client_links` / `professional_referrals` / `therapy_cycles` / `invoices` / `invoice_sessions` are not re-covered |
| `add_family_type.sql` | patch | CHECK constraint expansion |
| `remove_completed_status.sql` | patch | CHECK constraint contraction |
| `transfer_data.sql` | one-shot migration | moves data from one real user to another — should NOT live in `supabase/` long-term |
| `update_roles.sql` | one-shot patch | role update based on name match |

## RLS policies declared in version control

Only those in `migration.sql` + `dev_rls.sql`:

| Table | Policy | FOR | USING |
|---|---|---|---|
| `clients` | "Users can view own clients" | ALL | `user_id = auth.uid()` |
| `sessions` | "Users can view own sessions" | ALL | `user_id = auth.uid()` |
| `contacts` | "Users can view own contacts" | ALL | `user_id = auth.uid()` |
| `reports` | "Users can view own reports" | ALL | `client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())` |
| `settings` | "Users can view own settings" | ALL | `user_id = auth.uid()` |
| `professionals` | "Users can view own professionals" | ALL | `user_id = auth.uid()` |
| `client_links` | "Users can view own client_links" | ALL | `client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())` |
| `professional_referrals` | "Users can view own professional_referrals" | ALL | `professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid())` |
| `users` | **none in VCS** | — | — |
| `therapy_cycles` | **none in VCS** | — | — |
| `invoices` | **none in VCS** | — | — |
| `invoice_sessions` | **none in VCS** | — | — |

## RLS vulnerability flags (static inference, pending live confirmation)

1. `users` — RLS is `ENABLE`d by `dev_rls.sql` but **no policy** is declared →
   if this ran as-is, nobody can read `users`, yet `AdminPage.jsx:15` does a
   raw select. Either (a) the policy exists in the DB but not in VCS, or
   (b) `users` is not actually RLS-on, or (c) anon key gets service-role
   treatment on this table. All three are problems.
2. `therapy_cycles`, `invoices`, `invoice_sessions` — no RLS policy in VCS.
   Queries filter by `user_id` client-side (`invoiceService.getInvoices`) but
   `invoice_sessions` never filters — if RLS is off, any authenticated
   therapist can enumerate every invoice→session link across all tenants.
3. `reports` policy uses `client_id IN (SELECT id FROM clients …)` which is
   correct but slow; also, `INSERT`s on `reports` can be submitted with any
   `client_id`/`session_id`, and the USING clause allows it (policy is ALL
   and does not restrict WITH CHECK). Forgery possible unless a separate
   WITH CHECK exists at the DB level.

Verify all of the above against the live DB before shipping.
