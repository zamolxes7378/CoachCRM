# 04 — Database Schema & Data Integrity Audit

## Executive Summary

- **Overall risk**: High
- **Production-ready from DB standpoint**: No (conditional — requires remediation)

Key summary:

- **Schema drift is the defining issue.** Three entire production tables (`therapy_cycles`, `invoices`, `invoice_sessions`) are CRUDed by the React app with zero migration coverage in `supabase/`. An additional ~19 columns across `clients`, `sessions`, `reports`, `settings`, `professionals` are live in production but absent from `supabase/migration.sql`. A fresh clone of this repository cannot rebuild the production database.
- **Dual source of truth for sponsorship links.** `client_links` exists both as a dedicated table (migration-declared, FK-protected) *and* as a JSONB column on `clients.client_links`. The app uses only the JSONB (verified in `src/data/adapters.js:44`, `src/services/sponsorshipService.js`). The FK-protected table is dead; the JSONB version has no referential integrity whatsoever. Likewise, the `professional_referrals` table is declared but never queried — equivalent data lives inside `clients.client_links[].type='parrainage-pro'`.
- **RLS gaps for three tables and one suspicious ENABLE-without-policy.** `users` is `ALTER TABLE … ENABLE ROW LEVEL SECURITY` in `dev_rls.sql` but has **no policy in VCS**, yet `AdminPage.jsx:15` performs a raw select and the app functions. This means either (a) a ghost policy exists in the live DB that is not in version control, or (b) `users` is not actually locked in production — either case is a security/compliance finding. `therapy_cycles`, `invoices`, `invoice_sessions` have no VCS RLS at all. `[Unverified]` until live DB is confirmed.
- **Logical drift between the `family` client type and pricing code.** `add_family_type.sql` extended `clients.type` to `{couple, individual, family}`, but `src/services/allianceService.js:19,65` still branches on `type === 'individual'` vs implicit `'client'`, treating `family` as the couple fallback. `src/data/constants.js` shows `sessionRates = { client: 75, individual: 60 }` — no `family` rate.
- **Doc drift on client status.** `remove_completed_status.sql` contracted `clients.status` to `{active, inactive}`, but `docs/MON_ARCHITECTURE_DONNEES.md:55` still documents `'completed'` as an allowed value, and `seed.sql:55` actively inserts `status='completed'` — the seed will fail against the tightened CHECK constraint.
- **Redundant manual cascade deletes.** `dataService.deleteClient` issues four separate DELETEs (reports → sessions → contacts → client) even though `migration.sql` declares `ON DELETE CASCADE` on every child FK. Either the cascade isn't trusted, or the extra round-trips are a net-negative on latency and reliability.
- **Inconsistent temporal handling.** `sessions.date` and `contacts.date` are `TIMESTAMPTZ`, but `reports.date` is `DATE`. `adapters.js:71` strips the `+hh:mm` / `Z` suffix client-side with a regex, silently discarding timezone information for any session whose rows were written with a non-local offset.
- **Real PII committed to the repository.** `seed.sql:8` contains `anne-chantal.meyer@gmail.com` (personal Gmail, real practitioner); `transfer_data.sql:19,22` hardcodes two real email addresses for a production data move; both files are under version control and public-cloneable. This is a GDPR/compliance finding, not merely a data-hygiene issue.
- **No triggers or functions declared in VCS.** `[Unverified]` — any live DB trigger/function is invisible to this audit.

---

## Scope & Methodology

Static extraction only. The Supabase MCP available in this environment is bound to a different project (`kotech-cra`), not `ncjdvohafipisjcslrkk` (CoachCRM), so **live-DB verification was not possible**. All findings were derived from:

- `supabase/migration.sql` — base schema, committed
- Five patch files in `supabase/`: `dev_rls.sql`, `add_family_type.sql`, `remove_completed_status.sql`, `update_roles.sql`, `transfer_data.sql`, plus `seed.sql`
- `docs/MON_ARCHITECTURE_DONNEES.md` — the team's own live-schema documentation
- Every `from('…')` call tracked in `src/services/**.js`, `src/pages/**.jsx`, `src/App.jsx`, `src/context/DataContext.jsx`
- `src/data/adapters.js` — canonical reader/writer column map

Findings flagged `[Unverified]` must be confirmed against the live Supabase dashboard (project `ncjdvohafipisjcslrkk`, eu-west-2) before remediation — most concern RLS policies and triggers that can only be observed in the live DB.

---

## Schema Inventory

| Table | In `migration.sql`? | Purpose | Runtime use | RLS in VCS | Drift vs. runtime |
|---|---|---|---|---|---|
| `users` | Yes | Therapists | `dataService.getCurrentUser/upsertUser`, `AdminPage.jsx`, `App.jsx` | `ENABLE` but **no policy** in VCS | None observed |
| `clients` | Yes | Couple/individual/family case files | Full CRUD via `dataService` | Yes (own via `user_id`) | 14+ columns added outside VCS |
| `sessions` | Yes | Therapy sessions | Full CRUD | Yes (own via `user_id`) | 4 columns added outside VCS |
| `reports` | Yes | AI-generated session reports | Read/create only | Yes (via `client_id` subquery) | 1 column added outside VCS |
| `contacts` | Yes | Communication log | Full CRUD | Yes (own via `user_id`) | None observed |
| `professionals` | Yes | Professional network | Full CRUD | Yes (own via `user_id`) | 1 column (`referrals` JSONB) per docs |
| `client_links` | Yes | Sponsorship links (table form) | **Never queried** | Yes (via `client_id` subquery) | Dead — replaced by JSONB on `clients` |
| `professional_referrals` | Yes | Pro → client referrals (table form) | **Never queried** | Yes (via `professional_id` subquery) | Dead — replaced by JSONB `client_links[].type='parrainage-pro'` |
| `settings` | Yes | Per-user preferences | Read + upsert | Yes (own via `user_id`) | 2 JSONB columns added outside VCS |
| `therapy_cycles` | **NO** | Therapy cycles per client | Full CRUD via `dataService.getTherapyCycles/createTherapyCycle/updateTherapyCycle/deleteTherapyCycle` | **None in VCS** | Entire table absent from migrations |
| `invoices` | **NO** | Invoice header | Full CRUD via `invoiceService` | **None in VCS** | Entire table absent |
| `invoice_sessions` | **NO** | Invoice ↔ session join | CRUD via `invoiceService` | **None in VCS** | Entire table absent |

### Column drift — full breakdown

Columns present at runtime (read/written by `adapters.js` or `services/*.js`) but not declared in `supabase/migration.sql` nor in any of the 5 patch files:

**`clients`** — 14 drifted columns:

| Column | Inferred type | First evidence | Notes |
|---|---|---|---|
| `deleted_at` | `timestamptz` | `adapters.js:46,47`, `ClientsPage.jsx:519`, `ClientDetailPage.jsx:479` | Soft-delete column; **no partial index** documented; **no cascade semantics** for children |
| `billing_address` | `text` | `adapters.js:43,163` | Falls back to `partner_a.billingAddress` if column missing |
| `client_links` | `jsonb` | `adapters.js:44,164`; `sponsorshipService.js` | Shadows the dedicated `client_links` table (dual source of truth) |
| `external_referrer` | `jsonb` | `adapters.js:45,165` | Free-form, no schema |
| `session_rate` | `numeric` | `adapters.js:48,167`; `ClientDetailPage.jsx:47` | Per-client override of global rate |
| `session_frequency` | `integer` | `adapters.js:49,168` | |
| `ai_synthesis` | `text` (JSON-encoded) | `adapters.js:50-52,169-172` | Stored as text, parsed client-side; no constraint that it is valid JSON |
| `note_dynamique` | `text` | `adapters.js:53,173` | |
| `note_axes` | `text` | `adapters.js:54,174` | |
| `note_vigilance` | `text` | `adapters.js:55,175` | |
| `note_objectifs` | `text` | `adapters.js:56,176` | |
| `axes_travail` | `text` | `docs/MON_ARCHITECTURE_DONNEES.md:76` | Documented by docs but never read by adapter — **orphan column** |
| `points_vigilance` | `text` | docs only | Same |
| `objectifs` | `text` | docs only | Same |
| `dynamique_relationnelle` | `text` | docs only | Same |

Note the four orphan `axes_travail` / `points_vigilance` / `objectifs` / `dynamique_relationnelle` overlap semantically with `note_axes` / `note_vigilance` / `note_objectifs` / `note_dynamique` — two generations of columns may coexist in the live DB.

**`sessions`** — 4 drifted columns:

| Column | Inferred type | First evidence |
|---|---|---|
| `cancellation_reason` | `text` | `adapters.js:85,200`; `sessions.status='cancelled'` path |
| `payment_date` | `date` | `adapters.js:84,199` |
| `invoice_date` | `date` | `adapters.js:88,203`; `docs/MON_ARCHITECTURE_DONNEES.md:143` |
| `invoice_covered_session_ids` | `jsonb` | `adapters.js:89,204` |
| `covered_session_ids` | `jsonb` | `adapters.js:90,205` |

**`reports`** — 1 drifted column:

| Column | Inferred type | First evidence |
|---|---|---|
| `client_name` | `text` | `adapters.js:101`, `MON_ARCHITECTURE_DONNEES.md:159` — snapshot of client display name |

**`settings`** — 2 drifted columns:

| Column | Inferred type | First evidence |
|---|---|---|
| `therapy_phases` | `jsonb` | `DataContext.jsx:51`, `SettingsPage.jsx:35` |
| `default_therapy_config` | `jsonb` | `DataContext.jsx:52`, `SettingsPage.jsx:40` |

**`professionals`** — 1 drifted column (per docs only, not read by adapter):

| Column | Inferred type | First evidence |
|---|---|---|
| `referrals` | `jsonb` | `docs/MON_ARCHITECTURE_DONNEES.md:243` |

**Reverse-engineered schema for the three fully-undocumented tables** (derived strictly from `invoiceService.js` + `dataService.js` + adapter maps):

```sql
-- therapy_cycles  (not in VCS; inferred)
CREATE TABLE therapy_cycles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      uuid REFERENCES clients(id)  ON DELETE CASCADE, -- inferred
  user_id        uuid REFERENCES users(id)    ON DELETE CASCADE, -- inferred
  start_date     date,
  rate           numeric,          -- per-cycle rate override
  total_sessions integer,
  phase          text,
  created_at     timestamptz DEFAULT now()
);

-- invoices  (not in VCS; inferred)
CREATE TABLE invoices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid,                      -- filtered client-side; FK unknown
  client_id    uuid,                      -- filtered client-side; FK unknown
  invoice_date date,
  sent         boolean DEFAULT false,
  sent_at      timestamptz,               -- nullable (unemitInvoice sets null)
  created_at   timestamptz DEFAULT now()
);

-- invoice_sessions  (not in VCS; inferred join table)
CREATE TABLE invoice_sessions (
  invoice_id uuid,                        -- FK to invoices(id)
  session_id uuid                         -- FK to sessions(id)
  -- PRIMARY KEY / UNIQUE (invoice_id, session_id) ??? — unknown
);
```

**Unanswered questions (cannot be determined without live DB access):**

- Does `invoice_sessions` have a PRIMARY KEY or `UNIQUE (invoice_id, session_id)`? `addSessionToInvoice()` will insert duplicates if not.
- Is `invoices.sent_at` declared NULLABLE? `unemitInvoice` sets it to NULL — relied upon.
- Are `ON DELETE CASCADE` FKs declared on `invoice_sessions.invoice_id` / `invoice_sessions.session_id`? `deleteInvoice` comments say "cascade" but does not cascade-clean manually.
- Is RLS enabled on any of the three drifted tables? If OFF, any authenticated user can enumerate every tenant's invoices.

---

## Schema-Drift Matrix

| Table | Columns in VCS | Columns live (inferred) | Drift count | Severity |
|---|---|---|---|---|
| `users` | 6 | 6 | 0 | — |
| `clients` | 18 | 32+ | **14+** | Critical |
| `sessions` | 16 | 21 | 5 | High |
| `reports` | 15 | 16 | 1 | Medium |
| `contacts` | 8 | 8 | 0 | — |
| `professionals` | 13 | 14 (per docs) | 1 | Medium |
| `client_links` | 7 | 7 | 0 | N/A (dead table) |
| `professional_referrals` | 6 | 6 | 0 | N/A (dead table) |
| `settings` | 7 | 9 | 2 | High |
| `therapy_cycles` | — | 8 (inferred) | **Entire table** | Critical |
| `invoices` | — | 7 (inferred) | **Entire table** | Critical |
| `invoice_sessions` | — | 2 (inferred) | **Entire table** | Critical |

---

## RLS Policy Matrix

`[Unverified]` denotes rows where VCS does not give a complete picture and live-DB confirmation is required.

| Table | RLS enabled? | SELECT policy | INSERT policy | UPDATE policy | DELETE policy | Notes |
|---|---|---|---|---|---|---|
| `users` | `ENABLE` declared in `dev_rls.sql:14`; no policy in VCS | **None** | **None** | **None** | **None** | `[Unverified]` — either a ghost policy exists in the live DB (not in VCS) or `AdminPage.jsx:15` could not read. Since the app runs, the live DB diverges from VCS. |
| `clients` | Yes (`migration.sql:165`) | `FOR ALL USING (user_id = auth.uid())` | Same (ALL covers all DML) | Same | Same | `WITH CHECK` is implicitly USING — acceptable. No policy respects `deleted_at`; soft-deleted clients remain visible. |
| `sessions` | Yes | `FOR ALL USING (user_id = auth.uid())` | Same | Same | Same | |
| `contacts` | Yes | `FOR ALL USING (user_id = auth.uid())` | Same | Same | Same | |
| `reports` | Yes | `FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()))` | Same | Same | Same | **INSERT forgery risk**: `FOR ALL` applies `USING` as `WITH CHECK` on insert, but the subquery only verifies that the `client_id` belongs to the current user — not that `session_id` does. A user could INSERT a report row pointing at another user's session if they own a client. |
| `settings` | Yes | `FOR ALL USING (user_id = auth.uid())` | Same | Same | Same | |
| `professionals` | Yes | `FOR ALL USING (user_id = auth.uid())` | Same | Same | Same | Not in `dev_rls.sql` — base policy from `migration.sql` only. |
| `client_links` | Yes | `FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()))` | Same | Same | Same | Policy exists but the table is **never used** by the app. Dead code. |
| `professional_referrals` | Yes | `FOR ALL USING (professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()))` | Same | Same | Same | Same — dead table. |
| `therapy_cycles` | `[Unverified]` | **None in VCS** | **None in VCS** | **None in VCS** | **None in VCS** | If RLS is OFF in live DB, any authenticated user can read every tenant's therapy cycles. |
| `invoices` | `[Unverified]` | **None in VCS** | **None in VCS** | **None in VCS** | **None in VCS** | Service filters `user_id` client-side only — RLS OFF would allow enumeration across tenants. |
| `invoice_sessions` | `[Unverified]` | **None in VCS** | **None in VCS** | **None in VCS** | **None in VCS** | Worst case: `invoiceService.getInvoices` pulls `invoice_sessions(session_id)` via the join — if RLS OFF, every tenant's invoice→session mapping is visible. |

---

## Trigger & Function Inventory

| Name | Definition in VCS | Notes |
|---|---|---|
| — | — | **No triggers or functions are declared in any file under `supabase/`.** |

`[Unverified]` — any BEFORE/AFTER triggers, `updated_at` auto-update functions, validation functions, or SECURITY DEFINER helpers that live in the production DB are invisible to this audit. The `clients.updated_at` and `professionals.updated_at` columns both default to `now()` but have no trigger declared to refresh them on UPDATE; services set them manually in application code (`dataService.js:62,310`) — which works but is fragile.

**Remediation**: run `pg_dump --schema-only --no-owner --no-acl -n public` against the live DB, diff against `migration.sql`, and commit the delta.

---

## Referential-Integrity Map

### FKs declared in `migration.sql`

| Child | Column | Parent | ON DELETE |
|---|---|---|---|
| `clients` | `user_id` | `users(id)` | CASCADE |
| `clients` | `referred_by` | `clients(id)` | (no clause — defaults to NO ACTION) |
| `sessions` | `client_id` | `clients(id)` | CASCADE |
| `sessions` | `user_id` | `users(id)` | CASCADE |
| `reports` | `session_id` | `sessions(id)` | CASCADE |
| `reports` | `client_id` | `clients(id)` | CASCADE |
| `contacts` | `client_id` | `clients(id)` | CASCADE |
| `contacts` | `user_id` | `users(id)` | CASCADE |
| `professionals` | `user_id` | `users(id)` | CASCADE |
| `client_links` | `client_id` | `clients(id)` | CASCADE |
| `client_links` | `linked_client_id` | `clients(id)` | CASCADE |
| `client_links` | `linked_professional_id` | `professionals(id)` | SET NULL |
| `professional_referrals` | `professional_id` | `professionals(id)` | CASCADE |
| `professional_referrals` | `client_id` | `clients(id)` | CASCADE |
| `settings` | `user_id` | `users(id)` | CASCADE (with `UNIQUE`) |

### FKs NOT enforced because they live in JSONB

| "Logical FK" | Stored as | Integrity |
|---|---|---|
| `clients.client_links[].clientId` → `clients.id` | JSONB (`clients.client_links`) | None — a client can be deleted while still referenced as parrain elsewhere; orphaned links will return `null` from `getParrain()` (`sponsorshipService.js:178`). |
| `clients.client_links[].proName` (semantically → `professionals.id`) | JSONB string | None |
| `clients.external_referrer` free-form person blob | JSONB | None — `firstName`/`lastName` only; not linked to any table |
| `clients.exercises[].id` ad-hoc IDs | JSONB | **Collision risk**: `sponsorshipService.js:148` uses `` `contact-parrainage-${Date.now()}` `` — two rapid creates within the same millisecond produce identical IDs. `adapters.js` does not regenerate these on read. |
| `clients.emotional_maturity_history` JSONB array | JSONB | No invariant enforced — nothing prevents a write that shortens or reorders the history; no append-only trigger. |
| `sessions.invoice_covered_session_ids` / `covered_session_ids` | JSONB arrays of UUIDs | None — deleted sessions remain referenced in surviving invoice rows |
| `invoices.user_id` / `invoices.client_id` | FK status unknown | `[Unverified]` |
| `invoice_sessions.invoice_id` / `session_id` | FK status unknown | `[Unverified]` |

### Redundant manual cascade deletes

`dataService.deleteClient` (`dataService.js:70-79`) issues four DELETEs sequentially:

```
DELETE FROM reports    WHERE client_id = $1;
DELETE FROM sessions   WHERE client_id = $1;
DELETE FROM contacts   WHERE client_id = $1;
DELETE FROM clients    WHERE id       = $1;
```

But `migration.sql` declares `ON DELETE CASCADE` on every one of those child FKs. Either:

- the cascade is present but the author didn't trust it → 4× round-trips for a single logical operation, and no transaction wraps them (partial failure after the first DELETE will leave the client alive but orphaned of reports);
- or a trigger/RLS blocks the cascade → then the `DELETE FROM clients` itself would fail unless the manual cleanup happens first, which silently masks the root cause;
- or `ON DELETE CASCADE` is not actually live on the DB (drift from `migration.sql`).

All three cases are findings.

Note also: `dataService.deleteSession` and `dataService.deleteSessions` manually DELETE child `reports` before deleting the session — again redundant vs. the declared cascade on `reports.session_id → sessions(id) ON DELETE CASCADE`.

---

## Findings

### Critical

**C-1: Three entire production tables have zero migration coverage**

Evidence: `supabase/migration.sql` (full text), `src/services/dataService.js:170,180,190,201`, `src/services/invoiceService.js:12,28,45,60,73,101,112,126,135,147`.

`therapy_cycles`, `invoices`, and `invoice_sessions` are CRUDed by the shipped app but exist nowhere in `supabase/`. A new Supabase project bootstrapped from this repository cannot run the app. Their schemas (FKs, CHECK constraints, defaults, indexes, RLS) are undocumented and cannot be reviewed. Their RLS posture is unknown; cross-tenant data leakage cannot be ruled out.

**Remediation**: run `pg_dump --schema-only --table=therapy_cycles --table=invoices --table=invoice_sessions` against the live DB, review, and commit as `supabase/002_therapy_and_invoices.sql`.

---

**C-2: `users` has `ENABLE ROW LEVEL SECURITY` in VCS with no policy in VCS**

Evidence: `supabase/dev_rls.sql:14` enables RLS; no `CREATE POLICY ... ON users` exists anywhere in VCS. Yet `src/pages/AdminPage.jsx:15` performs `supabase.from('users').select('id, name, email, role, photo_url, created_at').order(...)` and returns data in production.

Three scenarios, all findings:

- A policy exists only in the live DB and not in VCS → schema drift, uncontrolled RLS surface.
- The policy applied from VCS locked out all non-superuser reads and `AdminPage` works only for admins whose reads are mediated by a service-role key → mask.
- RLS was re-disabled in production and the `dev_rls.sql` ENABLE is ineffective → the worst case: the `users` table with `role = 'admin'` values is readable by all authenticated users.

`[Unverified]` — resolve by running `SELECT rowsecurity FROM pg_tables WHERE tablename='users'` and `SELECT * FROM pg_policies WHERE tablename='users'` against the live DB.

**Remediation**: either add `CREATE POLICY "Users can read own row" ON users FOR SELECT USING (id = auth.uid())` plus a `FOR SELECT … USING (role='admin' AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin')` for admin listing, or route admin reads through a SECURITY DEFINER function. Commit to VCS.

---

**C-3: `therapy_cycles`, `invoices`, `invoice_sessions` have no RLS policy in VCS**

Evidence: absence of `CREATE POLICY ... ON therapy_cycles` / `invoices` / `invoice_sessions` anywhere under `supabase/`.

`invoiceService.getInvoices` filters by `user_id` **client-side** (`eq('user_id', userId)`). If RLS is not enabled on the live DB, any authenticated user bypassing that filter (e.g. `from('invoices').select('*')` in a browser console) can enumerate every tenant's invoices. Worse, `invoice_sessions` has no `user_id` column — it is secured only by the RLS of its parent `invoices`; if the parent has no policy, the join table is completely open.

`[Unverified]` — the team's own doc (`MON_ARCHITECTURE_DONNEES.md:270`) claims "all tables have RLS enabled," but this claim is not reproducible from VCS for these three tables.

**Remediation**:
- Add `ALTER TABLE therapy_cycles ENABLE ROW LEVEL SECURITY;` + `CREATE POLICY ... USING (user_id = auth.uid())`.
- Same for `invoices`.
- For `invoice_sessions`, gate on the parent: `USING (invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()))`.
- Also add explicit `WITH CHECK` clauses on all INSERT-capable policies.

---

**C-4: Real production PII committed to the repository**

Evidence: `supabase/seed.sql:8` — `('Anne-Chantal Meyer', 'anne-chantal.meyer@gmail.com', 'admin')`. `supabase/transfer_data.sql:19,22` — `'anne-chantal.meyer@gmail.com'` and `'claudia@kotech.ai'` as hardcoded literals, the former being a non-corporate personal Gmail. Both files are version-controlled and redistributed with any clone or fork.

This violates GDPR "data minimisation" and "purpose limitation" — committing personal data to a source-control system creates a permanent replica beyond the authorised processing context. It also blocks any future open-sourcing of the repo.

**Remediation**:
- Replace real emails with synthetic ones (`test-admin@example.com`, `test-user@example.com`).
- Move `transfer_data.sql` out of `supabase/` to `scripts/` or `ops/` — it is a one-shot data operation, not a migration.
- Purge the files' history (`git filter-repo --replace-text`) — pushed to the remote, the emails are already archived in the log.

---

**C-5: `seed.sql` violates the tightened `clients.status` CHECK constraint**

Evidence: `supabase/remove_completed_status.sql:13` restricts `status IN ('active','inactive')`. `supabase/seed.sql:55` INSERTs a client row with `status='completed'`:

```
('00000000-…-000000000106', ..., 'individual', ..., 'completed', 'referral', 'completed', ...)
```

(the second `'completed'` is the `status` column, the first is `phase`). Applied in the documented order (migration → remove_completed_status → seed), this INSERT will fail with a CHECK violation and the seed will abort mid-run.

**Remediation**: rewrite `seed.sql` to use `'active'` or `'inactive'`; also fix the `phase='completed'` value (phase has no CHECK constraint but `remove_completed_status.sql:9` rewrites existing `'completed'` → `'bilan_final'`).

---

**C-6: Dual source of truth for `client_links`**

Evidence: `supabase/migration.sql:114` declares a `client_links` table with FKs and RLS. `src/data/adapters.js:44` reads `c.client_links || c.clientLinks || []` from the `clients` row (JSONB). `src/services/sponsorshipService.js` — the entire sponsorship feature — mutates only the JSONB (lines 58-68 push into `client.clientLinks` in memory; `updateClient` persists it to the JSONB column via `adapters.js:164`).

The `client_links` table is therefore dead code. The JSONB version has no referential integrity — a sponsored client can be deleted and the parrain's JSONB array will still reference the deleted UUID forever. `getParrain()` (`sponsorshipService.js:178`) silently returns `null` for orphaned links. Likewise, the `professional_referrals` table is dead — the equivalent data lives in `clients.client_links[].type='parrainage-pro'`.

**Remediation**: drop the unused tables in a new migration, or migrate the JSONB to the table and remove the JSONB column. Choose one model. Document.

---

### High

**H-1: `family` type breaks pricing in `allianceService`**

Evidence: `supabase/add_family_type.sql:3` — `CHECK (type IN ('couple', 'individual', 'family'))`. `src/services/allianceService.js:19` — `const typeKey = client.type === 'individual' ? 'individual' : 'client'` — the ternary maps both `couple` and `family` to the `client` rate. `src/data/constants.js:31-34` — `sessionRates = { client: 75, individual: 60 }` defines only two keys.

A family client with `payment_amount` unset will fall through to `sessionRates['client']` (75 €) — silently billed at the couple rate. The alliance-validation logic (`isAllianceValidated`, line 13-24) uses this to decide whether a session is "paid or free," so a family session intended as free might be mis-classified as unpaid because the code uses a rate the product never agreed to.

Also note the migration column value (`'family'`) conflicts with the UI label mapping in `src/data/constants.js:39` — `clientTypeLabels = { individual: 'Individuel', client: 'Couple', family: 'Famille' }` — here `client` is the key for "couple" but `allianceService.js` treats `'client'` as the fallback string for *both* `'couple'` and `'family'`. Three different mental models coexist: DB enum (`couple`, `individual`, `family`), settings key (`client`, `individual`), and UI label key (`client`, `individual`, `family`).

**Remediation**: add a `family` entry to `sessionRates` defaults; rewrite the ternary as a lookup table; align the three vocabularies (pick one — `couple` everywhere, or `client` everywhere — and migrate).

---

**H-2: Documentation drift on `clients.status`**

Evidence: `supabase/remove_completed_status.sql:13` — CHECK restricts `status` to `('active','inactive')`. `docs/MON_ARCHITECTURE_DONNEES.md:55` still states "`active`, `inactive`, ou `completed`."

**Remediation**: update the doc.

---

**H-3: `clients.phase` has no CHECK constraint**

Evidence: `supabase/migration.sql:22` — `phase TEXT DEFAULT 'debut'` — no CHECK. Phases are user-configurable via `settings.therapy_phases` (JSONB) per `src/context/DataContext.jsx:51`. `src/data/constants.js:5-10` documents the default set (`debut`, `analyse`, `integration`, `bilan_final`) plus `prospect` used throughout the alliance code. `remove_completed_status.sql:9` rewrites `phase='completed'` → `'bilan_final'` but adds no enforcement.

Any string is accepted at INSERT/UPDATE. A typo or a client mutating their own settings to remove phases does not prevent existing `clients.phase` rows from pointing at now-nonexistent keys. Referential integrity is "by convention."

**Remediation**: either add a CHECK (but settings.therapy_phases would break that) or add an application-level guard in `updateClient` that rejects phases not in the user's active `settings.therapy_phases`. Not a strict database fix unless you accept static enumeration.

---

**H-4: `reports` INSERT has no `WITH CHECK` on `session_id`**

Evidence: `supabase/migration.sql:178` — `CREATE POLICY "Users can view own reports" ON reports FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()))`.

The policy validates `client_id` only. A malicious INSERT can submit a row with its own `client_id` but a `session_id` belonging to another tenant. Report rows then end up cross-linked. `getReports` reads via `sessions!inner(user_id)` (`dataService.js:148-149`) and filters on `sessions.user_id = userId` — which means the forged row is hidden from the attacker's listing, but persists in the database, taking storage and potentially surfacing through other query paths (raw joins, exports).

**Remediation**: rewrite the policy to split SELECT and INSERT:

```sql
CREATE POLICY "reports_select"
  ON reports FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "reports_insert"
  ON reports FOR INSERT
  WITH CHECK (
    client_id  IN (SELECT id FROM clients  WHERE user_id = auth.uid())
    AND session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );
```

---

**H-5: Redundant (and risky) manual cascade deletes**

Evidence: `src/services/dataService.js:70-79` (`deleteClient`), `src/services/dataService.js:125-139` (`deleteSession`, `deleteSessions`).

`migration.sql` declares `ON DELETE CASCADE` on `reports.client_id`, `reports.session_id`, `sessions.client_id`, `contacts.client_id`. The service code manually DELETEs children anyway, in four independent, untransacted round-trips. Partial failure (network blip after DELETE #2) leaves the client alive but without its reports and sessions — an inconsistent state.

If the cascade works: every delete wastes 3 round-trips and 3 row-scan DELETEs. If it doesn't: the team shouldn't have written it as CASCADE in the migration without a test that proves it.

**Remediation**: either wrap the sequence in a single RPC that runs inside a transaction, or delete only the parent row and trust the cascade. Write a single-session integration test that inserts a client + children and deletes only the client, asserting cleanup.

---

**H-6: Soft-delete (`clients.deleted_at`) is not applied by most consumers**

Evidence: `src/services/dataService.js:29-37` — `getClients` does **not** filter `deleted_at IS NULL`. The filter happens client-side:

| Consumer | File | Applies deleted filter? |
|---|---|---|
| `ClientsPage` listing | `src/pages/ClientsPage.jsx:82` | Yes (`!c.deleted`) |
| Dashboard charts | `src/pages/DashboardPage.jsx:563` | Partially (only in one loop) |
| `DeletedClientsPage` (admin) | `src/pages/DeletedClientsPage.jsx:14` | Yes (positive filter `c.deleted`) |
| `useUrgencies` hook | `src/hooks/useUrgencies.js:36` | Yes |
| `ReferrerSection` | `src/components/client/ReferrerSection.jsx:184` | Yes |
| `ClientHeaderPanel` client picker | `src/components/client/ClientHeaderPanel.jsx:234` | Yes |
| `EditIdentityModal` client picker | `src/components/client/EditIdentityModal.jsx:552` | Yes |
| **Alliance pipeline** | `src/services/allianceService.js` | **No** — iterates `rawClients` and `rawSessions` without checking |
| **Sponsorship CSV export** | `src/services/sponsorshipService.js:235-279` | **No** |
| **Invoice listing** | `src/services/invoiceService.js:10-37` | **No** — pulls all invoices including those for deleted clients |
| `DataContext` session derivation | `src/context/DataContext.jsx:92-111` | **No** |

Soft-deleted clients still appear in sponsorship CSV exports and still participate in alliance state transitions. Worse, `sessions` and `contacts` have no `deleted_at` of their own — when a client is soft-deleted, all their sessions remain fully active in the sessions list (likely surfacing through `SessionsPage`). There is no cascading soft-delete rule.

**Remediation**: push the filter server-side (`getClients` adds `.is('deleted_at', null)`) plus a separate `getDeletedClients`. Add a partial index `CREATE INDEX ON clients (user_id) WHERE deleted_at IS NULL`. Decide: should child sessions inherit deletion, or stay queryable for historical reporting? Implement one and document.

---

**H-7: `invoice_sessions` join table has no documented uniqueness constraint**

Evidence: `src/services/invoiceService.js:99-105` — `addSessionToInvoice()` is a naked INSERT. Without `UNIQUE(invoice_id, session_id)` or a PK on that pair, nothing prevents adding the same session twice to the same invoice. Downstream, `DataContext.jsx:119-125` builds `invoiceBySessionId` as a flat map (overwrites on collision) — a double-linked session would silently point at the last-inserted invoice, and `getInvoicesByClient` would show the same session listed twice in each.

**Remediation** (once the table is committed to VCS): `PRIMARY KEY (invoice_id, session_id)` or at minimum `UNIQUE (invoice_id, session_id)`.

---

### Medium

**M-1: Inconsistent temporal types (`date` vs. `timestamptz`)**

Evidence: `sessions.date timestamptz NOT NULL` (`migration.sql:45`), `contacts.date timestamptz NOT NULL` (`migration.sql:90`), but `reports.date DATE` (`migration.sql:69`). The app's `adaptReport` does no date normalisation — it forwards the `DATE` as-is. Meanwhile `adapters.js:71` defines `stripTz = (d) => d.replace(/([+-]\d{2}:\d{2}|Z)$/, '')` and uses it for sessions and contacts: the timezone offset is dropped client-side before the string hits the React tree.

Consequences:
- A therapist in CET inserting a session at 09:00 Paris winter time writes `2026-01-15T09:00:00+01:00`; Supabase stores it as `2026-01-15T08:00:00Z`. On read, `stripTz` returns `2026-01-15T08:00:00` — the same string, **one hour earlier** than the displayed time. Any UI that parses this via `new Date(s.date)` will then re-apply the local offset, shifting it back. The round-trip only happens to be correct when the practitioner's timezone matches the DB row's offset.
- Daylight-saving transitions: a session stored during CEST (`+02:00`) then edited during CET (`+01:00`) will read back at the wrong hour.
- Summer-versus-winter computation of "is this session overdue?" in `isAllianceValidated` (`allianceService.js:14-16`) depends on `new Date(session.date).getTime()`. Dropping the TZ silently shifts this by ±3600 s.
- `reports.date` as `DATE` cannot reconstruct the session's actual time; a session spanning 22:00 UTC on one day → 23:00 local the next day will have the wrong `date` if the app ever writes `new Date().toISOString().slice(0,10)` for the current timezone.

**Remediation**: decide a convention. Recommend: always `timestamptz`, always store with offset, display via `Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris' })`. Remove `stripTz` and fix any consumer that assumes "naked ISO." Keep `reports.date` if it is truly a calendar date, but document that explicitly.

---

**M-2: Ad-hoc IDs in JSONB (`Date.now()` collision risk)**

Evidence: `src/services/sponsorshipService.js:148` — `` id: `contact-parrainage-${Date.now()}` ``. `src/components/client/EditIdentityModal.jsx:698` — `` 'pro-' + Date.now() ``. `supabase/seed.sql:18` — `{"id":"e1"..."id":"e2"..."id":"e3"}` for exercises (pre-generated).

`Date.now()` is milliseconds. Two clicks dispatched in the same tick produce the same ID. The exercises JSONB array on `clients.exercises` has no constraint that its IDs are unique. Two rapid creates → two identical `id` fields. `clientLinks` and exercise UIs that key React lists on these IDs will have undefined behaviour, and any batch operation that filters "remove exercise with id=e1" will remove both.

**Remediation**: use `crypto.randomUUID()` (available everywhere in the app's target browsers). No migration; code-only.

---

**M-3: `emotional_maturity_history` JSONB has no append-only invariant**

Evidence: `clients.emotional_maturity_history JSONB DEFAULT '[]'` (`migration.sql:31`). The seed data (`seed.sql:15-16,22-24,30-33,…`) writes arrays of 3-16 integers. No trigger, no CHECK, no application code that I can locate guards against overwriting or truncating the history on a subsequent UPDATE. A typo in the update payload (`updateClient(id, { emotionalMaturityHistory: [currentScore] })` — forgetting to spread the prior array) will silently replace the full history with a one-element array.

Notably, no file in `src/` currently writes this column (`Grep emotional_maturity` only finds the adapter). It may be dormant — or it may be written by an endpoint or Edge Function outside of this repo. `[Unverified]`.

**Remediation**: either add a trigger that rejects length-decreasing writes, or move to an append-only child table `emotional_maturity_events(client_id, score, recorded_at)`.

---

**M-4: `clients.exercises` JSONB has no schema validation**

Evidence: `migration.sql:33` — `exercises JSONB DEFAULT '[]'`. Seed (`seed.sql:18`) implies shape `{ id, title, status, dueDate }`. No CHECK constraint, no JSON Schema extension, no application validator. A buggy write could replace the array with a string, a number, or a misshapen object, breaking every downstream list render.

---

**M-5: `professional_referrals` table shadowed by JSONB**

Evidence: `migration.sql:125` declares the table with FKs. `src/` contains zero `.from('professional_referrals')` matches. `clients.client_links[].type='parrainage-pro'` is the live source (`sponsorshipService.js:11,99,137,260-265`).

**Remediation**: drop the table, or migrate the JSONB data in. Same category as C-6 for `client_links`.

---

**M-6: `dev_rls.sql` re-enables RLS on only 6 of 11 tables**

Evidence: `supabase/dev_rls.sql:14-19` — enables RLS on `users`, `clients`, `sessions`, `contacts`, `reports`, `settings`. Omits `professionals`, `client_links`, `professional_referrals`, `therapy_cycles`, `invoices`, `invoice_sessions`.

For `professionals`/`client_links`/`professional_referrals`, the base `migration.sql` already enabled RLS — so `dev_rls.sql` is simply incomplete, not harmful. But for the three drifted tables, `dev_rls.sql` + `migration.sql` combined still leave them uncovered, exactly reproducing C-3 above.

---

**M-7: `sessions.status` CHECK omits values observed in adapter logic**

Evidence: `migration.sql:48` — `CHECK (status IN ('scheduled', 'completed', 'cancelled'))`. `src/services/allianceService.js:86` transitions clients based on `updates.status`, and the derived `DataContext.jsx:101,108` computes a virtual `isConfirmed` and reassigns `status = 'completed'` client-side. No drift from the constraint, but the Kanban/alliance pipeline depends on exact string values; any new status (`'no_show'`, `'rescheduled'`) added to the UI without the CHECK extension will raise an error in production.

---

**M-8: `seed.sql` mixes `'referral'` and `'parrainage'` as sources inconsistently**

Evidence: `seed.sql:31,55` use `'referral'`. `sponsorshipService.js:117` treats `'parrainage'` and `'referral'` as synonyms; line 241 filters export by either. `constants.js:26` canonicalises as `{ key: 'referral', label: 'Parrainage' }`. Long-term, two keys for one concept — historical data will have mixed values and all filters will need defensive synonym handling forever.

---

### Low / Informational

**L-1: No triggers to maintain `updated_at`**

`migration.sql` declares `updated_at timestamptz DEFAULT now()` on `clients`, `professionals`, `settings`. No `BEFORE UPDATE` trigger updates it; `dataService.updateClient:62` and `dataService.updateProfessional:310` set it manually. Any future writer that forgets will leave stale timestamps. Trigger recommended.

---

**L-2: `transfer_data.sql` lives in `supabase/`**

It is a one-shot operation moving data between two specific emails. It should live in `scripts/` or `ops/`, not in the schema directory that ought to be reproducible. On a fresh DB (no matching users) it `RAISE EXCEPTION`s — preventing bootstrap.

---

**L-3: `update_roles.sql` is idempotent by accident only**

`UPDATE users SET role = 'therapist' WHERE name ILIKE '%sebastian%pavel%'` is a one-shot data fix. On a fresh DB the WHERE matches nothing — noop. But if a later user is named "Sebastian Pavel Junior," this will unintentionally demote them on re-apply. Move out of `supabase/`.

---

**L-4: `seed.sql:55` writes `phase='completed'` even though `remove_completed_status.sql:9` rewrites it**

Seeded row ends up with `phase='bilan_final'` after migration sequence, not the written `'completed'` — the seed's intent is silently lost. This is self-correcting but obscure.

---

**L-5: Partial indexes missing**

The team's own doc (`MON_ARCHITECTURE_DONNEES.md:278`) promises "Index partiel sur `deleted_at IS NULL`." No such index is in `migration.sql`. As tables grow this becomes expensive.

---

**L-6: No FK on `clients.referred_by` cascade rule**

`migration.sql:35` — `referred_by UUID REFERENCES clients(id)` with no `ON DELETE` clause → defaults to `NO ACTION`. Deleting a parrain client with filleuls will raise an FK violation. But the app uses the JSONB `client_links` for sponsorship, so `referred_by` is likely unused (zero `referred_by` references in `src/` except the adapter mapping). Another dead column candidate.

---

**L-7: `clients.type` default is `'couple'` but UI/service treat it as `'client'`**

`migration.sql:19` — `DEFAULT 'couple'`. `constants.js:38` — the UI-key for couple is `'client'`. `allianceService.js:19,65` uses `'client'` as the fallback string. The DB stores `'couple'`; the code tests `'individual'` vs. "not-individual". Since any non-`'individual'` falls through to `'client'` in the services' rate lookups, the bug is latent but the vocabulary is split.

---

**L-8: `settings.recruitment_sources` stored as labels, used as keys**

`migration.sql:139` stores `'["Site web", "Téléphone", ...]'` — human labels. `DataContext.jsx:46-48` converts each label to a pseudo-key via `label.toLowerCase().replace(/\s+/g, '_')`. So "Site web" becomes `"site_web"` in memory, but the DB still holds the label. Round-tripping through edits in `SettingsPage` can accidentally change a label and invalidate every `clients.source` row referencing the old key. There is no migration path for renames.

---

**L-9: No `updated_at` on `sessions`**

`sessions` has `created_at` but no `updated_at` (`migration.sql:59`). Any "when was this session last modified?" query is impossible without an audit log. Low impact but worth noting for compliance.

---

**L-10: `dev_rls.sql` drops "Dev: public access" policies that are not declared anywhere in VCS**

`DROP POLICY IF EXISTS "Dev: public access" ON ...` on 6 tables — but no `CREATE POLICY "Dev: public access"` lives in the repo. Either these policies were created interactively in the Supabase dashboard (drift) or they were present in an earlier VCS file that was since purged. Either way, the drop statements are orphans and the earlier state is undocumented.

---

## What's done well

- **Strict `user_id` isolation**: the single-tenant-per-row model with `user_id = auth.uid()` RLS is simple, auditable, and hard to get subtly wrong — much easier than the multi-role RLS lattices seen in most CRMs.
- **`ON DELETE CASCADE` declared on every parent→child FK** in `migration.sql` — even if the services then re-do the work manually, the declarative safety net exists.
- **`UNIQUE(user_id)` on `settings`** — one-to-one enforcement at the DB level.
- **`client_links.role CHECK IN ('parrain','filleul')`** — bidirectional sponsorship constraint is explicit (even if the table is dead).
- **Composite indexes on common join paths**: `client_links(client_id)` and `client_links(linked_client_id)` both indexed; `professional_referrals` similarly. Even for the dead tables, the hygiene is there.
- **`payment_amount NUMERIC(10,2)`** on `sessions` — exact monetary arithmetic, not float.
- **Adapter indirection** (`adapters.js`) is a clean boundary between DB snake_case and UI camelCase — the design survives the drift.
- **Sponsorship validation code** (`sponsorshipService.js:24-44`) correctly rejects self-sponsorship and direct loops.

---

## Remediation Plan (Prioritised)

| Priority | Item | Action | Effort |
|---|---|---|---|
| 1 (Critical) | Export live schema for `therapy_cycles`, `invoices`, `invoice_sessions` | `pg_dump --schema-only --table=…` → commit as `supabase/002_therapy_invoices.sql` | Small |
| 2 (Critical) | Export live policies + trigger inventory for every table; commit the delta | `pg_dump --schema-only` full-public + diff against `migration.sql` | Medium |
| 3 (Critical) | Confirm or fix `users` RLS posture | Run `SELECT … FROM pg_policies WHERE tablename='users'`; add explicit policies; commit | Small |
| 4 (Critical) | Verify RLS is enabled + scoped on `therapy_cycles`, `invoices`, `invoice_sessions` | Same; apply `ENABLE ROW LEVEL SECURITY` + policies; commit | Small |
| 5 (Critical) | Purge real PII from `seed.sql` and `transfer_data.sql` | Replace with synthetic emails; move `transfer_data.sql` and `update_roles.sql` out of `supabase/`; rewrite history | Small |
| 6 (Critical) | Fix `seed.sql` `status='completed'` → `'active'` (or `'inactive'`) | Edit literal | Trivial |
| 7 (Critical) | Decide: `client_links` JSONB or table? Drop the other | Migration + adapter rewrite | Medium |
| 8 (High) | Split `reports` RLS into SELECT + INSERT with `WITH CHECK` on `session_id` | Migration | Small |
| 9 (High) | Add `family` → rate mapping in `sessionRates` and replace the `'individual' ? … : 'client'` ternary with a lookup | Code + constants change | Small |
| 10 (High) | Move `deleted_at IS NULL` filter into `getClients` (server-side) and decide soft-delete cascade for child sessions/contacts | `dataService.js` edit + new partial index | Small |
| 11 (High) | Replace manual cascade deletes with a single transactional RPC, or trust the declared CASCADE and remove the 3-step code path | RPC or refactor | Medium |
| 12 (High) | Add `UNIQUE (invoice_id, session_id)` to `invoice_sessions` | Migration | Trivial |
| 13 (Medium) | Decide timezone convention; remove `stripTz`; regression-test session time display across DST | Code + tests | Medium |
| 14 (Medium) | Replace `Date.now()` ad-hoc IDs with `crypto.randomUUID()` in `sponsorshipService` and `EditIdentityModal` | Code | Trivial |
| 15 (Medium) | Add `BEFORE UPDATE` trigger to maintain `updated_at` on `clients`, `professionals`, `settings`; remove manual `new Date().toISOString()` in services | Migration | Small |
| 16 (Medium) | Drop `professional_referrals` table (or migrate JSONB into it and drop the JSONB) | Migration | Small |
| 17 (Medium) | Update `docs/MON_ARCHITECTURE_DONNEES.md:55` — remove `completed` from `status` enum | Docs | Trivial |
| 18 (Medium) | Document the `note_*` vs `axes_travail`/`points_vigilance`/`objectifs`/`dynamique_relationnelle` column overlap; pick one set; migrate | Docs + migration | Medium |
| 19 (Low) | Add partial index `CREATE INDEX ON clients (user_id) WHERE deleted_at IS NULL` | Migration | Trivial |
| 20 (Low) | Remove orphan `DROP POLICY IF EXISTS "Dev: public access"` from `dev_rls.sql` or document the historical state | Cleanup | Trivial |
| 21 (Low) | Drop `clients.referred_by` if the JSONB replaces it | Migration | Trivial |
| 22 (Low) | Add `updated_at` column + trigger on `sessions` | Migration | Small |
| 23 (Low) | Document `settings.recruitment_sources` as labels (not keys); write a renaming procedure | Docs | Trivial |
| 24 (Low) | Add JSONB shape constraint for `clients.exercises`, `emotional_maturity_history`, `client_links` via CHECK + `jsonb_typeof` guards or GIN schema validation | Migration | Medium |

---

## Conclusion

The CoachCRM schema is conceptually simple — single-tenant-per-row, one FK lattice, one `user_id = auth.uid()` policy shape — and this simplicity is its main strength. But the repository-level invariant ("`supabase/` rebuilds production") is broken: three tables are missing, fifteen-plus columns are missing, real PII is committed, and the most-sensitive table (`users`) has an RLS `ENABLE` with no accompanying policy in VCS.

The `client_links` dual-source-of-truth (one JSONB, one table with FKs, only the JSONB used) and the `professional_referrals` dead table both indicate an architectural decision that was made in code but never cleaned up in the schema — a common sign of rapid iteration, not of a deliberate design. The `family` client-type drift in pricing code (H-1) is the most visible runtime bug: a family client is silently billed at the couple rate.

Before CoachCRM is ready for compliance-sensitive production:

- C-1 through C-6 must all be closed (full schema committed, RLS confirmed on the three drifted tables, PII purged, `users` RLS hardened, status CHECK reconciled with seed, dual-source-of-truth resolved for `client_links`).
- H-1, H-4, H-6, H-7 are blocking at the app level — they affect real money (pricing), real data integrity (report forgery, soft-delete leakage), and real listing correctness (duplicate invoice lines).

After that, the medium and low items are steady-state hygiene.

---

## Essential Files for Understanding This Topic

- `/home/zamolxes/devs/coach-crm/supabase/migration.sql` — base schema, committed (the only complete one of the three)
- `/home/zamolxes/devs/coach-crm/supabase/dev_rls.sql` — the `users`-ENABLE-without-policy and the "Dev: public access" drops
- `/home/zamolxes/devs/coach-crm/supabase/add_family_type.sql` — CHECK extension creating H-1
- `/home/zamolxes/devs/coach-crm/supabase/remove_completed_status.sql` — CHECK contraction breaking seed (C-5)
- `/home/zamolxes/devs/coach-crm/supabase/seed.sql` — real PII + CHECK-violating row
- `/home/zamolxes/devs/coach-crm/supabase/transfer_data.sql` — one-shot data move + hardcoded real emails (C-4)
- `/home/zamolxes/devs/coach-crm/src/data/adapters.js` — canonical read/write map — lines 44-56 document the `clients` JSONB/column drift; `stripTz` is on line 71 (M-1); `adaptInvoice` on line 135 reveals the inferred `invoices` shape
- `/home/zamolxes/devs/coach-crm/src/services/dataService.js` — runtime `from('therapy_cycles')` calls (C-1); redundant manual cascade (H-5)
- `/home/zamolxes/devs/coach-crm/src/services/invoiceService.js` — the only definition of `invoices` / `invoice_sessions` anywhere (C-1); missing `UNIQUE` (H-7)
- `/home/zamolxes/devs/coach-crm/src/services/allianceService.js` — `family` branch collapse (H-1) on lines 19, 65
- `/home/zamolxes/devs/coach-crm/src/services/sponsorshipService.js` — JSONB-only `client_links` usage (C-6); `Date.now()` ID collision on line 148 (M-2)
- `/home/zamolxes/devs/coach-crm/src/pages/AdminPage.jsx` — the raw `users` SELECT that contradicts VCS's RLS ENABLE-without-policy (C-2)
- `/home/zamolxes/devs/coach-crm/docs/MON_ARCHITECTURE_DONNEES.md` — internal documentation with drift vs. VCS on client status, plus the only reference to several drifted columns
- `/home/zamolxes/devs/coach-crm/audit/live_schema/tables.md` — the seed inventory this audit extends
