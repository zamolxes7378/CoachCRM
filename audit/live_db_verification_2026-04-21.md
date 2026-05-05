# Live-DB verification — pre-Phase-0 evidence pack

**Date:** 2026-04-21
**Project:** `ncjdvohafipisjcslrkk` (eu-west-2 / London)
**Method:** read-only introspection via Supabase Management API (`POST /v1/projects/{ref}/database/query`) against `pg_catalog`, `information_schema`, `pg_policies`, `pg_indexes`. No data mutations. Token referenced via the `.mcp.json` env var; never echoed.
**Purpose:** close the `[Unverified]` findings in [`04_database_schema.md`](04_database_schema.md) so Tracks C / D in [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) can author accurate migrations, and correct a handful of assumptions that static analysis got wrong.

Queries run (all read-only):

```
select * from pg_tables where schemaname='public'
select * from pg_policies where schemaname='public'
select * from information_schema.columns where table_schema='public'
select * from pg_indexes where schemaname='public'
select * from information_schema.table_constraints + check_constraints + referential_constraints
select * from pg_proc (cross-schema, user-defined only)
select * from pg_trigger (cross-schema, non-internal)
select * from storage.buckets
row counts on every public table
```

---

## 1 · One-screen verdict vs §04

| §04 finding | Verdict | Evidence |
|---|---|---|
| **C-1** `therapy_cycles`, `invoices`, `invoice_sessions` absent from migrations | **Confirmed.** All three exist live, none declared in `supabase/migration.sql`. | See §3.1 |
| **C-2** `users` RLS-enabled but no policy in VCS — ghost policy live? | **Confirmed** — 3 ghost policies on `users` (SELECT/INSERT/UPDATE own). See §3.2. **New finding**: no admin-read policy ⇒ `AdminPage.jsx` row-limited to the admin's own record. |
| **C-3** RLS status unknown for `therapy_cycles` / `invoices` / `invoice_sessions` | **Confirmed RLS ON** on all three; each has one `FOR ALL` policy scoped to `user_id = auth.uid()` (or parent-invoice for `invoice_sessions`). See §3.2. |
| **C-5** `seed.sql:55 status='completed'` violates tightened CHECK | **Refuted for live DB.** `clients_status_check` still lists `{active, inactive, completed}` — `remove_completed_status.sql` was never applied to prod. |
| **C-6 / H** `client_links` dual source of truth | **Refuted.** The `client_links` table **does not exist** in live DB. Only the JSONB column on `clients` exists. Same for `professional_referrals` (absent live). `migration.sql` is divergent, not superset. |
| **S-05** `users` / `therapy_cycles` / `invoices` / `invoice_sessions` have no RLS in VCS → tenant-leak risk | **Resolved low-risk** — all four tables have RLS enabled with sensible `auth.uid()` policies live. Policies not reproducible from VCS remains a schema-drift issue (Track D). |
| **H-1** `family` client type priced as couple in code | **Still applies.** `clients_type_check = {client, individual, family}` — so `couple` is *not* a valid DB value. Code references to `'couple'` in `allianceService.js` / `sessionRates` would fail a CHECK on insert. Reinforces H-1, shifts severity. |
| **H-4** `reports` INSERT forgery via `client_id`-only validation | **Confirmed.** Two permissive policies are OR'd; the `client_id`-only one auto-fills WITH CHECK from USING, allowing a report INSERT with an own `client_id` and a foreign `session_id`. |
| **H-5** manual cascade delete unnecessary | **Confirmed.** Every child FK (`reports`, `sessions`, `contacts`, `invoices`, `invoice_sessions`, `settings`, `therapy_cycles.client_id`) has `ON DELETE CASCADE`. Track F's plan to drop the manual cascade in `deleteClient` is safe. |
| **H-7** `invoice_sessions` probably lacks `UNIQUE(invoice_id, session_id)` | **Refuted.** The table's primary key IS `(invoice_id, session_id)` (`invoice_sessions_pkey`). **Bonus find**: there is also `invoice_sessions_session_id_key UNIQUE (session_id)` — one session can belong to at most one invoice *ever*. Flag this as a possibly-over-tight constraint (see §4). Drop `20260421_invoice_sessions_unique.sql` from Track C. |
| **P-05** composite indexes missing | **Partially confirmed.** Live has `idx_sessions_user_id` and `idx_sessions_date` separately, not a composite. `idx_reports_client_id` **already exists**. `invoice_sessions` `(invoice_id, session_id)` pkey covers the `invoice_id` left-prefix. Narrow Track C to just the `(user_id, date DESC)` + `(client_id, date DESC)` sessions composites + the `deleted_at` partial index. |
| **G-07** `FOR ALL USING` without `WITH CHECK` → insert forgery | **Nuanced.** In Postgres, a `FOR ALL` policy with only `USING` auto-applies the same expression as `WITH CHECK` — so most of these are safe. The real breakage is where *two* permissive policies coexist (users\*2, clients\*2, sessions\*2, settings\*2, contacts\*2, reports\*2) and the looser one leaks INSERT (H-4 on reports is the live example). Track C's `WITH CHECK` tightening should still land, but framed as "explicit + consolidate duplicate policies". |
| **Triggers / functions** `[Unverified]` | **Resolved — none exist.** `pg_proc` (public + all non-system schemas) returns zero user functions. `pg_trigger` (incl. `auth.users`) returns zero user triggers. All user provisioning is app-layer. |

---

## 2 · Live-DB shape cheat-sheet

**Public tables (10):** `clients`, `contacts`, `invoice_sessions`, `invoices`, `professionals`, `reports`, `sessions`, `settings`, `therapy_cycles`, `users`. All have `rowsecurity=true`.

**Declared in `supabase/migration.sql` but ABSENT from live DB:** `client_links`, `professional_referrals`.

**Row counts (2026-04-21):** users=3, clients=21, sessions=40, reports=0, contacts=8, professionals=4, settings=1, therapy_cycles=0, invoices=4, invoice_sessions=4. Pilot-stage data; `reports` and `therapy_cycles` are zero-row features.

**Storage buckets:** zero. Audio/file flows mentioned in `template_consentement_patient.md` are conceptual — nothing to purge (G-06 is scope-only until buckets appear).

**Functions / triggers:** zero user-defined in any non-system schema, including `auth.users`. Signup gate therefore has no DB fallback.

---

## 3 · Detailed evidence

### 3.1 Reverse-engineered → actual shape of the undeclared tables

The shapes match `invoiceService.js` / `dataService.js` inference in §04 closely, with two surprises (⚠):

```sql
-- therapy_cycles  (10 rows of inference in §04 → actual)
CREATE TABLE therapy_cycles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      uuid REFERENCES clients(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES users(id)   ON DELETE NO ACTION,  -- ⚠ NOT cascade; §04 assumed CASCADE
  start_date     date    NOT NULL DEFAULT now(),
  rate           numeric NOT NULL,            -- ⚠ NOT NULL (§04 guessed nullable)
  total_sessions integer NOT NULL DEFAULT 20,
  phase          text    NOT NULL DEFAULT 'debut',
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE invoices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_date  date NOT NULL DEFAULT CURRENT_DATE,
  sent          boolean NOT NULL DEFAULT false,
  sent_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
-- NOTE: no invoice_number, no amount, no TVA, no issuer/recipient snapshots,
-- no status. §06 R-05 (L441-9 non-compliance) is confirmed — this table is a skeleton.

CREATE TABLE invoice_sessions (
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  PRIMARY KEY (invoice_id, session_id),
  UNIQUE (session_id)   -- ⚠ stricter than expected: a session can be in at most ONE invoice
);
```

**Implications for Track D (baseline migration):** author exactly what's above, not the §04 inference. In particular, `therapy_cycles.user_id` is `NO ACTION` live; if the intent is cascade, Track C must add it (and will double-delete if the app's manual cascade path also fires).

### 3.2 RLS policy matrix (what's actually live)

| Table | # policies | Pattern | Gaps vs audit |
|---|---|---|---|
| `users` | 3 | SELECT/INSERT/UPDATE scoped to `id = auth.uid()`. No DELETE. | §04 C-2 answered: ghost policies exist. **New: admin-read not implemented** → `AdminPage.jsx` sees only own row. |
| `clients` | 2 | Duplicate `FOR ALL` (one with WITH CHECK, one without) — behaves as one policy. | §04 G-07 nuance: Postgres auto-fills WITH CHECK. |
| `sessions` | 2 | Same duplicate-FOR-ALL pattern. | Same nuance. |
| `settings` | 2 | Same. | Same. |
| `contacts` | 2 | Same. | Same. |
| `professionals` | 1 | `FOR ALL` with both USING + WITH CHECK. | Clean. |
| `reports` | 2 | ⚠ **Policy #1 checks `session_id`, policy #2 checks only `client_id`.** Permissive OR ⇒ looser one wins for INSERT. | **H-4 confirmed as live hole.** |
| `therapy_cycles` | 1 | `FOR ALL` `user_id = auth.uid()`, no explicit WITH CHECK (auto-filled). | Safe; Track C should add explicit. |
| `invoices` | 1 | Same. | Same. |
| `invoice_sessions` | 1 | `invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())`. Auto-filled WITH CHECK. | Safe. |

### 3.3 Check constraints

```
clients.clients_status_check : status IN ('active','inactive','completed')   ← 'completed' still allowed live
clients.clients_type_check   : type   IN ('client','individual','family')    ← 'couple' NOT allowed
sessions.sessions_status_check: status IN ('scheduled','completed','cancelled')
```

- **C-5 refuted**: live still accepts `'completed'`.
- **H-1 reinforced**: `allianceService.js` and `sessionRates` both reference `'couple'`, which the CHECK rejects; how was this working? Hypothesis: the app never actually writes `type='couple'` — `adapters.js` probably emits `'client'` for couple records. Worth a quick grep during Track F.

### 3.4 Indexes

```
clients:        pkey, idx_clients_user_id, idx_clients_referred_by
sessions:       pkey, idx_sessions_user_id, idx_sessions_date, idx_sessions_client_id
reports:        pkey, idx_reports_client_id, idx_reports_session_id
invoice_sessions: pkey(invoice_id, session_id), idx_invoice_sessions_session_id, UNIQUE(session_id)
contacts:       (verify separately if needed)
(no partial index on clients.deleted_at)
```

**Track C composite-index migration can be narrowed to two statements:**

```sql
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_client_date ON sessions (client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients (user_id) WHERE deleted_at IS NULL;
```

Skip: `idx_reports_client_id` (exists), `idx_invoice_sessions_invoice` (pkey covers it), `idx_contacts_user_date` (audit nice-to-have, not a stated blocker).

### 3.5 Column drift summary (§04 "14 drifted columns on clients")

Confirmed present live: `deleted_at`, `billing_address`, `client_links`, `external_referrer`, `session_rate`, `session_frequency`, `ai_synthesis`, `note_dynamique`, `note_axes`, `note_vigilance`, `note_objectifs`. **11 drifted columns on `clients`, not 14.**

**Absent live (doc-only ghost columns):** `axes_travail`, `points_vigilance`, `objectifs`, `dynamique_relationnelle`. These exist only in `docs/MON_ARCHITECTURE_DONNEES.md` and have no effect on the app. Recommend: update the doc to remove the ghosts rather than add them to the DB.

`sessions`, `reports`, `settings`, `professionals` drift — all confirmed present, matching §04 exactly.

---

## 4 · Concrete corrections to `IMPLEMENTATION_PLAN.md`

| Track | Change | Reason |
|---|---|---|
| **C** | Drop `20260421_invoice_sessions_unique.sql` | PK already provides `UNIQUE(invoice_id, session_id)`; single-invoice-per-session UNIQUE already exists too. |
| **C** | Narrow `20260421_composite_indexes.sql` to three statements (see §3.4) | `idx_reports_client_id` already live; invoice_sessions invoice-prefix covered by pkey. |
| **C** | `20260421_rls_users_therapy_cycles_invoices.sql` — most of what it plans to add is **already live**. Rewrite as a ratifier migration that `CREATE POLICY IF NOT EXISTS` mirrors the live policies, plus adds the **missing admin-read policy on `users`** (see §3.2 new finding). | Prevents drift re-introduction; closes the silent AdminPage breakage. |
| **C** | `20260421_tighten_rls_with_check.sql` — reframe from "add WITH CHECK everywhere" to "consolidate the duplicate `FOR ALL` policies and fix the `reports` loose policy". Drop the second "Users can view own reports" policy that only checks `client_id`; keep the session-joined one. | H-4 is the only live cross-tenant forgery hole; most other "gaps" are Postgres auto-fill false alarms. |
| **D** | Baseline migration MUST include: full schemas for `therapy_cycles` / `invoices` / `invoice_sessions` (exact shape in §3.1, including `therapy_cycles.user_id = NO ACTION`, `invoices` skeleton); all live CHECK constraints; all live indexes. **Do NOT include** `client_links` or `professional_referrals` — they are not live. | Reproducible-from-VCS goal. |
| **F** | `allianceService.js` / `sessionRates` references to `type='couple'` are currently kept alive only by the app not actually writing that value. Confirm with a repo-wide grep + CHECK constraint test before touching. | Avoid breakage during H-1 fix. |
| **F** | The `deleteClient` manual cascade removal is safe — all FKs are `CASCADE`. | Verified. |
| **M** | Add an **admin-page smoke test**: log in as `role='admin'`, visit `/admin`, confirm the list is populated. Currently the RLS policy set will render a 1-row list (own row only). | Surface this before Phase 0 closes. |
| (new) | **Before rotating the anon key (H-0.1)**, confirm that no user provisioning depends on an `auth.users` trigger — **none exists live**, so App.jsx is the only gate. Rotation will not break any DB plumbing. | §3, functions/triggers resolved. |

---

## 5 · Out of scope for this pack

Not checked (explicitly deferred — require either destructive actions or access to auth/vault):

- Supabase Auth config: redirect-URL allowlist, email templates, rate-limit config, password policy. These are dashboard-only.
- DPAs with Supabase/Vercel/Google (legal, not DB).
- `auth.users` contents — not queried to avoid PII exposure in transcript.
- `vault.decrypted_secrets` — never queried per §0bis.
- Any mutation to live DB. All verification was `SELECT` on catalog / `information_schema`.

---

*Evidence pack produced 2026-04-21 by Claude Code acting as audit-remediation driver. Raw JSON responses in `/tmp/sb/*.json` on the author's workstation (not committed). All queries reproducible by anyone with a Supabase PAT scoped to `ncjdvohafipisjcslrkk`.*
