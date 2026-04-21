# tables.live.md — Track D cross-reference rationale

**Generated:** 2026-04-21 (static cross-reference only — no live MCP available)
**Authored by:** Track D agent (SNAPSHOT-BASED variant)
**For:** Track M reviewer — diff this against `pg_dump` output before marking Track D authoritative

This file records the column-by-column reasoning used to author
`supabase/migrations/20260401000000_baseline_schema.sql`. Every claim is
sourced from one or more of:

- **A** = `src/data/adapters.js` (read + write maps)
- **S** = `src/services/*.js` Supabase call sites
- **D** = `docs/MON_ARCHITECTURE_DONNEES.md`
- **Audit** = `audit/04_database_schema.md`
- **TM** = `audit/live_schema/tables.md` (the seed inventory)

Confidence levels: **High** = confirmed by A+S, **Medium** = A or S only, **Low** = D or Audit reasoning only.

---

## New tables

### `therapy_cycles`

| Column | Type | Confidence | Sources |
|---|---|---|---|
| `id` | `uuid PK DEFAULT gen_random_uuid()` | High | Pattern from all other tables |
| `client_id` | `uuid FK→clients(id) ON DELETE CASCADE` | High | S: `dataService.getTherapyCycles` filtered by `user_id`; adaptTherapyCycle maps `tc.client_id`; unadaptTherapyCycle maps `clientId→client_id` |
| `user_id` | `uuid FK→users(id) ON DELETE CASCADE` | High | S: `getTherapyCycles(userId).eq('user_id', userId)` — direct DB filter; unadaptTherapyCycle maps `userId→user_id` |
| `start_date` | `date` | High | A: `unadaptTherapyCycle` maps `startDate→start_date`; S: `dataService.getTherapyCycles` orders by `start_date DESC` |
| `rate` | `numeric` | Low | Audit only: `audit/04_database_schema.md §reverse-engineered schema`; not in adapters.js |
| `total_sessions` | `integer` | High | A: `unadaptTherapyCycle` maps `totalSessions→total_sessions`; `adaptTherapyCycle` reads `tc.total_sessions` |
| `phase` | `text` | Low | Audit only: `audit/04_database_schema.md §reverse-engineered schema` |
| `created_at` | `timestamptz DEFAULT now()` | High | Pattern from all other tables |

**Track M questions:**
- Confirm `rate` column exists (only in audit inference, not in adapter maps).
- Confirm `phase` column exists (same).
- Confirm ON DELETE CASCADE on both FKs.
- Is there an `updated_at` column?
- Are there any additional columns not visible from static analysis?

---

### `invoices`

| Column | Type | Confidence | Sources |
|---|---|---|---|
| `id` | `uuid PK DEFAULT gen_random_uuid()` | High | A: `adaptInvoice` maps `inv.id` |
| `user_id` | `uuid FK→users(id) ON DELETE CASCADE` | High | S: `invoiceService.getInvoices(.eq('user_id', userId))`; A: `adaptInvoice` maps `inv.user_id` |
| `client_id` | `uuid FK→clients(id) ON DELETE CASCADE` | High | S: `invoiceService.getInvoicesByClient(.eq('client_id', clientId))`; A: `adaptInvoice` maps `inv.client_id`. FK status [Unverified] per Audit |
| `invoice_date` | `date` | High | S: `createInvoice` inserts `invoice_date`; A: `adaptInvoice` maps `inv.invoice_date` |
| `sent` | `boolean DEFAULT false` | High | S: `createInvoice` inserts `sent:false`; `emitInvoice` updates `sent:true`; `unemitInvoice` updates `sent:false`; A: `adaptInvoice` maps `inv.sent` |
| `sent_at` | `timestamptz` (nullable) | High | S: `emitInvoice` sets `sent_at: new Date().toISOString()`; `unemitInvoice` sets `sent_at: null` — must be nullable; A: `adaptInvoice` maps `inv.sent_at` |
| `created_at` | `timestamptz DEFAULT now()` | High | A: `adaptInvoice` maps `inv.created_at`; S: `getInvoices` orders by `created_at DESC` |

**Track M questions:**
- Confirm FK on `user_id → users(id)` (audit flags as [Unverified]).
- Confirm FK on `client_id → clients(id)` (audit flags as [Unverified]).
- Confirm ON DELETE behavior on both FKs.
- Is `sent_at` nullable at the DB level (required for `unemitInvoice`)?
- Any additional columns (e.g. invoice number, amount total)?

---

### `invoice_sessions`

| Column | Type | Confidence | Sources |
|---|---|---|---|
| `invoice_id` | `uuid NOT NULL FK→invoices(id) ON DELETE CASCADE` | High | S: `invoiceService` all CRUD operations use `invoice_id`; `deleteInvoice` comment says "cascade" |
| `session_id` | `uuid NOT NULL FK→sessions(id) ON DELETE CASCADE` | High | S: `invoiceService` all CRUD operations use `session_id`; A: `adaptInvoice` reads `inv.invoice_sessions.map(is=>is.session_id)` |
| `PRIMARY KEY (invoice_id, session_id)` | composite | Low | Baseline declares this to prevent duplicates (H-7); actual live DB PK/UNIQUE status [Unverified] |

**Track M questions:**
- Does the live table have a PK or UNIQUE constraint on `(invoice_id, session_id)`? Track C adds one via `20260421_invoice_sessions_unique.sql`; if the live DB already has it, that migration will fail — Track M must check and gate accordingly.
- Confirm ON DELETE CASCADE on `invoice_id → invoices(id)`.
- Are there any additional columns (e.g. `added_at`, `position`)?

---

## Drifted columns on existing tables

### `clients`

| Column | Type | Confidence | Sources |
|---|---|---|---|
| `deleted_at` | `timestamptz` | High | A: adapters.js:46,47 (read+write); ClientsPage.jsx, ClientDetailPage.jsx |
| `billing_address` | `text` | High | A: adapters.js:43,163 (read+write) |
| `client_links` | `jsonb DEFAULT '[]'` | High | A: adapters.js:44,164 (read+write); sponsorshipService.js (entire feature) |
| `external_referrer` | `jsonb` | High | A: adapters.js:45,165 (read+write) |
| `session_rate` | `numeric` | High | A: adapters.js:48,167 (read+write); S: allianceService.js:20 uses `client.session_rate` |
| `session_frequency` | `integer` | High | A: adapters.js:49,168 (read+write) |
| `ai_synthesis` | `text` | High | A: adapters.js:50-52,169-172 (read+write with JSON.parse/stringify) |
| `note_dynamique` | `text` | High | A: adapters.js:53,173 (read+write) |
| `note_axes` | `text` | High | A: adapters.js:54,174 (read+write) |
| `note_vigilance` | `text` | High | A: adapters.js:55,175 (read+write) |
| `note_objectifs` | `text` | High | A: adapters.js:56,176 (read+write) |
| `axes_travail` | `text` | Low | D: docs/MON_ARCHITECTURE_DONNEES.md:76 only; NOT in adapters.js — orphan candidate |
| `points_vigilance` | `text` | Low | D only; NOT in adapters.js — orphan candidate |
| `objectifs` | `text` | Low | D only; NOT in adapters.js — orphan candidate |
| `dynamique_relationnelle` | `text` | Low | D only; NOT in adapters.js — orphan candidate |

**Track M questions:**
- Do `axes_travail`, `points_vigilance`, `objectifs`, `dynamique_relationnelle` actually exist in the live DB? They appear only in docs, not in adapter read/write maps. If they exist, they are orphan columns. If not, remove the ALTER statements from the baseline.
- What DEFAULT does `client_links` have on the live DB? We infer `'[]'` (empty array) but it could be `NULL`.

---

### `sessions`

| Column | Type | Confidence | Sources |
|---|---|---|---|
| `cancellation_reason` | `text` | High | A: adapters.js:85,200 (read+write) |
| `payment_date` | `date` | High | A: adapters.js:84,199 (read+write) |
| `invoice_date` | `date` | High | A: adapters.js:88,203 (read+write); D: docs/MON_ARCHITECTURE_DONNEES.md:143. NOTE: tables.md §sessions lists only 4 drifted columns; this is a 5th found in adapters.js |
| `invoice_covered_session_ids` | `jsonb` | High | A: adapters.js:89,204 (read+write) |
| `covered_session_ids` | `jsonb` | High | A: adapters.js:90,205 (read+write) |

**Track M questions:**
- `invoice_date` on `sessions`: is this a denorm of `invoices.invoice_date`, or a separate field? Its purpose relative to the `invoices` table is ambiguous.
- Do `invoice_covered_session_ids` and `covered_session_ids` serve different purposes, or are they redundant? Neither is removed by any observed code path.

---

### `reports`

| Column | Type | Confidence | Sources |
|---|---|---|---|
| `client_name` | `text` | High | A: adapters.js:101 (read: `r.client_name`); D: docs/MON_ARCHITECTURE_DONNEES.md:159 |

---

### `settings`

| Column | Type | Confidence | Sources |
|---|---|---|---|
| `therapy_phases` | `jsonb` | High | S: DataContext.jsx:51 `settings?.therapy_phases`; SettingsPage.jsx:35 `upsertSettings({ therapy_phases: phases })` |
| `default_therapy_config` | `jsonb` | High | S: DataContext.jsx:52 `settings?.default_therapy_config`; SettingsPage.jsx:40 `upsertSettings({ default_therapy_config: { totalSessions: total } })` |

---

### `professionals`

| Column | Type | Confidence | Sources |
|---|---|---|---|
| `referrals` | `jsonb` | Low | D: docs/MON_ARCHITECTURE_DONNEES.md:243 only; NOT in adapters.js (adaptProfessional does not map it); NOT in dataService.js |

**Track M question:** Does `referrals` exist in the live DB? Low confidence. If not, the ALTER TABLE in the baseline is a no-op (IF NOT EXISTS) and safe to leave.

---

## Discrepancies found between sources

1. **`sessions` column count:** `audit/live_schema/tables.md §sessions` lists 4 drifted columns. `src/data/adapters.js` reveals a 5th: `invoice_date` (adapters.js:88/203). The migration adds all 5.

2. **`axes_travail` / `points_vigilance` / `objectifs` / `dynamique_relationnelle`:** listed in both `tables.md` and `docs/MON_ARCHITECTURE_DONNEES.md` as drifted columns on `clients`, but `adapters.js` does NOT include them in either `adaptClient` or `unadaptClient`. These are orphan candidates — they may exist in the live DB without being read or written by the current application code. Two generations of "notes" columns appear to coexist (`note_*` in adapters vs. the older `axes_travail`/`points_vigilance`/`objectifs`/`dynamique_relationnelle` in docs).

3. **`therapy_cycles.rate` and `therapy_cycles.phase`:** present in `audit/04_database_schema.md §reverse-engineered schema` but absent from `adapters.js` (neither `adaptTherapyCycle` nor `unadaptTherapyCycle` maps these). They may exist in the live DB without adapter coverage, or may be absent entirely.

4. **`professionals.referrals`:** docs-only evidence. No adapter, no service call site. Either it exists in the DB and was never wired to the UI, or it was planned but never created.

5. **`invoice_sessions` PK/UNIQUE:** `audit/04_database_schema.md H-7` explicitly flags this as unknown. The baseline declares `PRIMARY KEY (invoice_id, session_id)`. If the live DB has no constraint, this will add one on a fresh DB but cannot retroactively add it to production without Track C's migration (which handles it). If the live DB already has a UNIQUE but no PK, the baseline's CREATE TABLE IF NOT EXISTS is a no-op on prod (table already exists), so no conflict.

6. **`client_links` JSONB default:** `adapters.js` reads `c.client_links || c.clientLinks || []` (falls back to empty array), suggesting the column can be NULL. We declare `DEFAULT '[]'` as a reasonable guess. Track M should confirm.

---

## Open questions for Track M (live introspection)

Run the following against the live DB (`ncjdvohafipisjcslrkk`, eu-west-2):

```sql
-- 1. Full column inventory (compare against this file)
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 2. Confirm therapy_cycles columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'therapy_cycles'
ORDER BY ordinal_position;

-- 3. Confirm invoices FK + nullable sent_at
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'invoices'
ORDER BY ordinal_position;

-- 4. Confirm invoice_sessions PK/UNIQUE
SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' AND tc.table_name = 'invoice_sessions';

-- 5. Confirm orphan columns on clients
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'clients'
  AND column_name IN ('axes_travail', 'points_vigilance', 'objectifs', 'dynamique_relationnelle');

-- 6. All RLS policies
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename;

-- 7. Triggers and functions
SELECT pg_get_functiondef(oid) FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public';

SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgisinternal = false;

-- 8. Indexes
SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;

-- 9. FK constraints on invoices and invoice_sessions
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table,
       ccu.column_name AS foreign_column, rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('invoices', 'invoice_sessions', 'therapy_cycles')
ORDER BY tc.table_name;
```

After running the above, update `supabase/migrations/20260401000000_baseline_schema.sql` to remove or correct any statements that diverge from the live DB, then remove the `[Unverified]` labels from confirmed statements.
