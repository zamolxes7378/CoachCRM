# tables.live.md — Track D cross-reference rationale

**Generated:** 2026-04-21
**Authored by:** Track D agent (SNAPSHOT-BASED variant)
**Live-verified:** 2026-04-21 via Supabase Management API introspection (see
[`audit/live_db_verification_2026-04-21.md`](../live_db_verification_2026-04-21.md)
for the evidence pack and raw query results).

This file records the column-by-column reasoning used to author
`supabase/migrations/20260401000000_baseline_schema.sql`. Every row is
now reconciled against live DB introspection — the `Confidence` column
reflects the outcome, not the pre-verification inference.

Sources:

- **Live** = `information_schema.columns` / `pg_policies` / `pg_indexes` /
  `pg_constraints` read-only introspection on 2026-04-21
- **A** = `src/data/adapters.js` (read + write maps)
- **S** = `src/services/*.js` Supabase call sites
- **D** = `docs/MON_ARCHITECTURE_DONNEES.md`

Confidence: **Live-verified** > **Static-only** (inference without DB evidence).

---

## New tables

### `therapy_cycles`

| Column | Type | Confidence | Sources |
|---|---|---|---|
| `id` | `uuid PK DEFAULT gen_random_uuid()` | Live-verified | Live |
| `client_id` | `uuid FK→clients(id) ON DELETE CASCADE` | Live-verified | Live |
| `user_id` | `uuid FK→users(id) **ON DELETE NO ACTION**` ⚠ | Live-verified | Live — stricter than §04 inferred (not CASCADE) |
| `start_date` | `date NOT NULL DEFAULT now()` | Live-verified | Live |
| `rate` | `numeric NOT NULL` | Live-verified | Live |
| `total_sessions` | `integer NOT NULL DEFAULT 20` | Live-verified | Live |
| `phase` | `text NOT NULL DEFAULT 'debut'` | Live-verified | Live |
| `created_at` | `timestamptz DEFAULT now()` | Live-verified | Live |

**Open:** no `updated_at` column live. The app updates via
`dataService.updateTherapyCycle` without touching an `updated_at`.

---

### `invoices`

| Column | Type | Confidence | Sources |
|---|---|---|---|
| `id` | `uuid PK DEFAULT gen_random_uuid()` | Live-verified | Live |
| `user_id` | `uuid NOT NULL FK→users(id) ON DELETE CASCADE` | Live-verified | Live |
| `client_id` | `uuid NOT NULL FK→clients(id) ON DELETE CASCADE` | Live-verified | Live |
| `invoice_date` | `date NOT NULL DEFAULT CURRENT_DATE` | Live-verified | Live |
| `sent` | `boolean NOT NULL DEFAULT false` | Live-verified | Live |
| `sent_at` | `timestamptz` (nullable) | Live-verified | Live — `unemitInvoice` writes NULL |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | Live-verified | Live |

**⚠ Structural gap vs §06 R-05 (French invoicing law L441-9 / 242 nonies A CGI):**
no `invoice_number` sequence, no `amount`, no `tva_rate` / `tva_amount`,
no issuer/recipient snapshots, no `status` column. The live table is a
thin "group of sessions by date" rather than a legal invoice. Factur-X
implementation (Track L scoping) will require a schema redesign.

---

### `invoice_sessions`

| Column | Type | Confidence | Sources |
|---|---|---|---|
| `invoice_id` | `uuid NOT NULL FK→invoices(id) ON DELETE CASCADE` | Live-verified | Live |
| `session_id` | `uuid NOT NULL FK→sessions(id) ON DELETE CASCADE` | Live-verified | Live |
| `PRIMARY KEY (invoice_id, session_id)` | composite | Live-verified | Live |
| `UNIQUE (session_id)` ⚠ | single-column | Live-verified | Live — **stricter than §04 H-7 assumed**: a session can belong to at most ONE invoice ever |

**⚠ Flag to product:** the `UNIQUE(session_id)` constraint forbids
re-invoicing a session under a corrective invoice. Confirm that matches
the intended billing domain rule — if not, this constraint needs to be
dropped or replaced with a partial unique (e.g. `WHERE NOT cancelled`).

---

## Drifted columns on existing tables

### `clients` — 11 live-verified drifted columns

| Column | Type | Confidence | Sources |
|---|---|---|---|
| `deleted_at` | `timestamptz` (nullable) | Live-verified | Live + A |
| `billing_address` | `text` (nullable) | Live-verified | Live + A |
| `client_links` | `jsonb` (nullable) | Live-verified | Live + A + sponsorshipService.js |
| `external_referrer` | `jsonb` (nullable) | Live-verified | Live + A |
| `session_rate` | `numeric` (nullable) | Live-verified | Live + A |
| `session_frequency` | `integer` (nullable) | Live-verified | Live + A |
| `ai_synthesis` | `text` (nullable) | Live-verified | Live + A |
| `note_dynamique` | `text` (nullable) | Live-verified | Live + A |
| `note_axes` | `text` (nullable) | Live-verified | Live + A |
| `note_vigilance` | `text` (nullable) | Live-verified | Live + A |
| `note_objectifs` | `text` (nullable) | Live-verified | Live + A |

**Live-absent doc-only ghosts (DO NOT add to the baseline):**
`axes_travail`, `points_vigilance`, `objectifs`, `dynamique_relationnelle`.
All four appear in `docs/MON_ARCHITECTURE_DONNEES.md` but NOT in live DB
and NOT in adapter read/write maps. They are a documentation artifact
from an earlier column generation that was never migrated. **Correct
fix: patch the doc, not the DB.**

`client_links` default: live has no column default (nullable, no DEFAULT).
The baseline's earlier `DEFAULT '[]'` inference was removed.

---

### `sessions` — 5 live-verified drifted columns

| Column | Type | Confidence | Sources |
|---|---|---|---|
| `cancellation_reason` | `text` (nullable) | Live-verified | Live + A |
| `payment_date` | `date` (nullable) | Live-verified | Live + A |
| `invoice_date` | `date` (nullable) | Live-verified | Live + A |
| `invoice_covered_session_ids` | `jsonb` (nullable) | Live-verified | Live + A |
| `covered_session_ids` | `jsonb` (nullable) | Live-verified | Live + A |

**Open questions (not blockers, tracked for post-Phase-0 cleanup):**

- `sessions.invoice_date` vs `invoices.invoice_date`: denorm or independent?
- `invoice_covered_session_ids` vs `covered_session_ids`: redundant?
  Neither is dropped by any observed code path.

---

### `reports`

| Column | Type | Confidence | Sources |
|---|---|---|---|
| `client_name` | `text` (nullable) | Live-verified | Live + A + D |

---

### `settings`

| Column | Type | Confidence | Sources |
|---|---|---|---|
| `therapy_phases` | `jsonb` (nullable) | Live-verified | Live + A |
| `default_therapy_config` | `jsonb` (nullable) | Live-verified | Live + A |

---

### `professionals`

| Column | Type | Confidence | Sources |
|---|---|---|---|
| `referrals` | `jsonb` (nullable) | Live-verified | Live + D |

The column exists live but is not read by `adapters.js` nor written by
`dataService.updateProfessional` — orphan but harmless. Track F / M can
decide whether to wire or retire.

---

## Tables in `supabase/migration.sql` that are ABSENT from live

- `client_links` (table form) — live uses `clients.client_links` JSONB instead
- `professional_referrals` — equivalent data lives in `clients.client_links[].type='parrainage-pro'`

**Baseline does NOT re-declare these** (per live-verification §4 corrections).
`supabase/migration.sql` is divergent from live, not a superset; long-term
plan is to retire `migration.sql` and treat the baseline + timestamped
patches as the sole source of truth.

---

## CHECK constraints observed live (NOT re-declared by the baseline)

| Table | Constraint | Allowed values |
|---|---|---|
| `clients` | `clients_status_check` | `{active, inactive, completed}` ⚠ `'completed'` still valid live — `remove_completed_status.sql` was never applied |
| `clients` | `clients_type_check` | `{client, individual, family}` ⚠ `'couple'` is NOT a valid value — see H-1 / Track F landmine |
| `sessions` | `sessions_status_check` | `{scheduled, completed, cancelled}` |

These are captured for future tightening migrations (post-data-cleanup).
Baseline's `CREATE TABLE IF NOT EXISTS` is a no-op on existing tables, so
it neither drops nor re-declares constraints.

---

## Triggers / functions / storage

Zero user-defined functions, zero non-internal triggers, zero storage
buckets across the whole project (live-verified 2026-04-21). Baseline
declares none. See live_db_verification §3 for the zero-result queries.

---

## Discrepancies between doc and live (for the doc-patch follow-up)

1. `docs/MON_ARCHITECTURE_DONNEES.md` lists four ghost columns on
   `clients` that don't exist live (§clients above). Doc should be
   patched to remove them.
2. Doc §143 mentions `sessions.invoice_date` — confirmed present live.
3. Doc §243 mentions `professionals.referrals` — confirmed present live.
4. `docs/MON_ARCHITECTURE_DONNEES.md:55` still documents `'completed'`
   as an allowed `clients.status` value — matches live, but the team's
   intent per `remove_completed_status.sql` was to drop it. Doc +
   migration state needs reconciling post-data-cleanup.

---

## For Track M

Track M's verification pack is `audit/live_db_verification_2026-04-21.md`.
Use it as the baseline's diff target when running `pg_dump --schema-only`
against prod post-merge. If Track M finds any divergence from the shapes
documented above, update **both** this file and the baseline migration
in the same commit.
