# CoachCRM — Audit Remediation Implementation Plan

**Companion docs:** [`INDEX.md`](INDEX.md) (findings overview), `01_*.md`…`07_*.md` (domain reports).

**Goal:** close the ≈ 44 Critical / High audit findings across dimensions 01–07 using **parallel agent execution**, minimising merge conflicts and human-in-the-loop bottlenecks.

**Convention:** agent & skill names refer to the Claude Code harness available in this environment: sub-agents include `feature-dev:code-architect`, `feature-dev:code-explorer`, `feature-dev:code-reviewer`, `general-purpose`, `Explore`, `code-simplifier`, `mermaid-docs-updater`. Skills include `simplify`, `security-review`, `review`, `commit-commands:commit`, `commit-commands:commit-push-pr`, `feature-dev:feature-dev`, `code-review:code-review`, `andrej-karpathy-skills:karpathy-guidelines`.

> **2026-04-21 update — read [`live_db_verification_2026-04-21.md`](live_db_verification_2026-04-21.md) before dispatching Tracks C, D, F, M.** A read-only live-DB introspection pass resolved §04's `[Unverified]` findings and corrected several assumptions this plan was authored against. Corrections to each track are inlined below with `⚠ live-verified` markers. Headline deltas: `client_links` / `professional_referrals` tables are *not* live (C-6 refuted), `invoice_sessions` already has the needed UNIQUE constraints (H-7 refuted), `users` has ghost RLS policies but no admin-read (new finding — AdminPage is silently broken under RLS), `reports` has a live INSERT-forgery hole via duplicate permissive policies (H-4 confirmed), 11 drifted `clients` columns not 14.

Throughout this plan, **Track** = a disjoint workspace that can run in its own worktree and be owned by a separate agent run. Tracks that touch the same files are serialised; everything else runs simultaneously.

---

## 0bis · MCP guardrails — read before dispatching any track that uses Supabase MCP

The Supabase MCP currently available in this audit environment is **bound to a different project (`kotech-cra`), not to `ncjdvohafipisjcslrkk` (CoachCRM)**. Before dispatching Tracks C, D, or any live-DB verification, the driver **must** reconnect the MCP to the CoachCRM project (`ncjdvohafipisjcslrkk`, `eu-west-2`, London). Confirm the binding by running `mcp__supabase__list_tables` and verifying that the table set matches `audit/live_schema/tables.md` (not the cra-app `profiles` / `time_entries` / `absences` shape).

**Agents with MCP access MUST:**

1. **Prefer read-only introspection.** Queries on `pg_catalog`, `pg_policies`, `pg_proc`, `pg_trigger`, `storage.buckets`, `cron.job` — safe; run freely.
2. **Never echo secrets into the transcript.** `service_role_key`, JWT secrets, user-specific OAuth tokens, contents of `vault.decrypted_secrets`. Reference by name, not by value.
3. **Stop and confirm before any destructive action in the table below.** "Confirm" means surface the exact SQL/API call plus its expected effect to the driver, and wait for a `go/no-go` reply. No auto-retry on denial.
4. **Prefer Supabase branches over prod writes** when the management API supports it (baseline migration authoring in Track D, schema changes in Track C). Default to applying against a branch, diff-check, then promote.

| Destructive action | Why it's fenced | Confirm pattern |
|---|---|---|
| `POST /v1/projects/{ref}/api-keys/legacy` (anon key reset, Track A) | Kills every live session across the pilot | Print command + expected user-visible effect; wait for explicit "proceed". |
| `auth.admin.deleteUser(...)` / mass `signOut` | Irreversible for delete; disruptive for signOut | Limit signOut to the single `userId` named by the triggering action; never batch. |
| `ALTER TABLE` / `DROP` / `TRUNCATE` / any DDL on prod outside a branch | Could corrupt therapy data or break the invoice service | Apply DDL against a Supabase branch first; promote only on green. |
| Any `UPDATE`/`DELETE` on `users`, `clients`, `sessions`, `reports`, `contacts`, `invoices` | Irreversible loss of Art. 9 health data | Never done by the agent unless part of a track explicitly authored for it. |
| `storage.buckets.public = false` on a bucket with existing public URLs | Would break any client-visible file link | Cross-check frontend call sites before flipping. |

**Non-destructive MCP actions the agent may do freely:**
- Introspect schema, policies, functions, triggers, indexes.
- Read (but not mutate) `users` / `clients` etc. when required to verify a finding.
- Create a Supabase branch, apply candidate migrations, diff branch vs prod.
- Inspect `storage.buckets` config (not objects).

When in doubt: read, don't write. Escalate.

---

## 0 · Execution strategy at a glance

```
           ┌─────────────────────────────────────────────────────────┐
           │  H-0 (human)                                            │
           │   • rotate Supabase anon key (agent triggers via MCP)   │
           │   • confirm signup-allowlist policy (whitelist vs open) │
           │   • re-bind Supabase MCP to ncjdvohafipisjcslrkk        │
           └───────────────────────────┬─────────────────────────────┘
                                       │
  ┌────────────────────────────────────┼──────────────────────────────────────────┐
  │                                    │                                          │
  ▼                                    ▼                                          ▼
Track A                         Track C                                     Track E
repo-hygiene                     db-migrations-code-only                      dataContext-reform
(30 min)                         (half day)                                   (1 day)
  │                                    │                                          │
  │                                    ▼                                          │
  │                              Track D (MCP-driven)                             │
  │                              db-migrations-baseline                           │
  │                              (half day, merge after C)                        │
  │                                                                               │
  └──────────────── independent ──────────────── independent ─────────────────────┤
                                                                                  │
Track B                Track F               Track G           Track H             │
frontend-security      frontend-perf         error-handling    legal-pages        │
(PKCE, gate, headers)  (chunks, cascade)     contract          scaffold           │
(1 day)                (1 day)               (half day)        (half day)         │
                                                                                  │
Track I                Track J               Track K           Track L             │
accessibility          baseline-CI           DPIA-kickoff       AI-Act /           │
phase0 (1 day)         (lint+test+actions)   (human)            Factur-X           │
                       (half day)            (2-3 d org)        scoping (human)    │
                                                                                  │
   └──────────────────────────── Integration & review ────────────────────────────┤
                                       │                                          │
                                       ▼                                          │
                         feature-dev:code-reviewer pass                            │
                         + /review + /security-review                              │
                         per-track PR                                              │
                                       │                                          │
                                       ▼                                          │
                                 Track M (MCP-driven)                              │
                                 live-prod-verification                            │
                                 (half day, after A/B/C/D/G merge)                 │
                                       │                                          │
                                       ▼                                          │
                             audit/phase0_verification.md ─────────────────────────┘
                             all ✅ → Phase 0 closed, pilot green-light
```

**Estimated wall-clock for Phase 0:** ~2–3 days of concurrent agent work once H-0 is done, assuming ~4 parallel agent slots. MCP access shrinks the human gate to under half a day of decisions.

---

## 1 · Pre-flight (driver — you — do this before dispatch)

1. **Confirm H-0 humans tasks are scheduled**:
   - **H-0.1 — Anon-key rotation.** Decide whether to rotate via Supabase dashboard (manual) or via MCP `/v1/projects/{ref}/api-keys/legacy` (agent-triggered with your `proceed` confirmation). Either way, plan for a `.env` + Vercel env-var update in the same window.
   - **H-0.2 — Signup allowlist policy.** Pick one: (a) whitelist file committed to VCS (easy, low-friction), (b) `invites` table with admin-issued tokens (slightly more work, audit-friendly), (c) Supabase Dashboard invite flow. Track B needs this decision to lock.
   - **H-0.3 — MCP rebinding.** Re-point the Supabase MCP to `ncjdvohafipisjcslrkk`. Verify by running `mcp__supabase__list_tables` and cross-checking against `audit/live_schema/tables.md`.
   - **H-0.4 — Legal-page copy sourcing.** Decide who drafts the FR-language `/mentions-legales`, `/confidentialite`, `/cgu` content (Kotech counsel? external counsel?). Track H scaffolds the routes; the copy itself is a content task.
2. **Create a worktree per track** so agents don't collide:
   ```
   cd /home/zamolxes/devs/coach-crm
   git worktree add ../cc-track-A audit/track-A-repo-hygiene
   git worktree add ../cc-track-B audit/track-B-frontend-security
   git worktree add ../cc-track-C audit/track-C-db-migrations
   git worktree add ../cc-track-E audit/track-E-datacontext-reform
   # etc. for each track you plan to run concurrently.
   ```
   Agents can also use `isolation: "worktree"` on their Agent invocation; both work.
3. **Driver responsibilities**:
   - Dispatch the tracks (see §3 for prompts).
   - When each track reports back, open a PR for that track (one PR per track keeps reviews focused).
   - Run `/code-review:code-review` + `/security-review` on each PR *before* merging.
   - Merge in the order suggested in §4 to avoid trivial conflicts.

---

## 2 · Track catalogue

Each track is described with: **goal, files it touches (exclusive), sub-agent, skill, findings closed, deliverables, exit criteria, dependencies.**

### Track A — Repo hygiene & secret purge
- **Goal:** remove committed credentials and real PII from git; prevent re-commit.
- **Files (exclusive):**
  - `.gitignore` (already excludes `.env` — confirm scope)
  - `docs/SETUP_GUIDE.md` (strip the anon key + URL from §3; replace with placeholders referencing `.env.example`)
  - `.env.example` (NEW — documents `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
  - `supabase/seed.sql` (move to `supabase/_archive/seed.sql.example` with ANONYMISED fixtures; strip real emails)
  - `supabase/transfer_data.sql` (delete — this was a one-shot prod migration that has no business living in `supabase/`)
  - **History rewrite** (using `git filter-repo` or `BFG`): purge the anon-JWT string, `anne-chantal.meyer@gmail.com`, and `claudia@kotech.ai` from all historical commits. **Coordinate with the team on a hard reset** — this is destructive and invalidates every existing clone.
- **Sub-agent:** `general-purpose` (small ops-style task).
- **Skill:** `commit-commands:commit` at the end; **no `commit-push-pr`** — history rewrite needs explicit human push.
- **Findings closed:** **S-01, S-06, C-07, C-4, G-05**.
- **Deliverables:**
  - `.env.example` with placeholder values.
  - Rewritten `docs/SETUP_GUIDE.md` §3 that references `.env.example` and cites the Supabase dashboard as the source for the anon key.
  - `supabase/_archive/seed.sql.example` with anonymised fixtures (`therapist-01@example.invalid`, synthetic partner names).
  - A `scripts/history-purge.sh` runbook documenting the BFG / filter-repo invocation so the team can replay it.
- **Exit criteria:** `git log -p | grep -i "eyJhbGciOiJIUzI1NiIs"` returns nothing; `git log -p | grep -i "anne-chantal.meyer\|claudia@kotech.ai"` returns nothing; `.env.example` exists; no tracked `.env`.
- **Depends on:** **H-0.1 (anon-key rotation)** must complete before the history rewrite is pushed — otherwise attackers with the old key could still read prod between the rewrite push and the rotation.

### Track B — Frontend security hardening
- **Goal:** close the four perimeter holes — OAuth flow, signup gate, admin gate, HTTP security headers — and fix the false-marketing claim.
- **Files (exclusive):**
  - `src/lib/supabase.js` (change `flowType: 'implicit'` → `'pkce'`; S-03)
  - `src/App.jsx` (add allowlist check in `syncUser` before `upsertUser`; surface a French "En attente d'invitation" screen if the Google email is not whitelisted; S-02)
  - `src/pages/AdminPage.jsx` (replace the raw `users` SELECT with an RPC `get_admin_user_list()` that is `SECURITY DEFINER` + role-gated — added in Track C; S-04)
  - `src/pages/LoginPage.jsx` (line 274: remove or correct "Données hébergées en France"; line 305-307: make the footer links real `<a href="/confidentialite">` + `<a href="/mentions-legales">` — content by Track H; G-02 / R-01 / A-08)
  - `vercel.json` (add `headers[]` — CSP, HSTS, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy, X-Content-Type-Options nosniff; S-07)
- **Sub-agent:** `feature-dev:code-architect` (for the allowlist design + CSP builder), then `general-purpose` for edits.
- **Skill:** `security-review` at the end.
- **Findings closed:** **S-02, S-03, S-04, S-07, G-02, R-01, R-10**.
- **Deliverables:**
  - `vercel.json` with explicit `Content-Security-Policy` tuned for Supabase (`connect-src 'self' https://*.supabase.co https://accounts.google.com`), Google Fonts, Google OAuth, `default-src 'self'`, `script-src 'self'` (nonce-based ideally — Vercel supports this via Edge Middleware; if out of scope, `'unsafe-inline'` with a tracking issue).
  - `src/App.jsx` allowlist: read from a `allowed_emails` table (Track C adds it) or from `import.meta.env.VITE_ALLOWED_EMAILS` comma-separated as a stopgap.
  - Updated `syncUser` that **never** creates a row for a non-allowlisted email; instead stores a `pending_invites` row for admin review.
  - `LoginPage.jsx:274` rewritten to the factually-true version ("Hébergement Supabase · région UE (eu-west-2, Londres — GDPR-adéquat)"). Update `docs/template_consentement_patient.md` §7 accordingly.
  - `LoginPage.jsx:305-307` footer links point to real routes defined in Track H.
- **Exit criteria:** `curl -I https://<staging>` shows all 5 security headers; attempting Google OAuth with a non-allowlisted email lands on a "pending invitation" screen, no row written to `users`; `/admin` redirects to `/` for non-admin roles even if JS is disabled-and-reloaded (because the RPC in Track C enforces it).
- **Depends on:** **H-0.2 (signup allowlist policy decision)** + Track C (for the RPC + table). Can start the non-DB parts immediately.

### Track C — Database migrations (code-only, tightening & drift closure)
- **Goal:** add new migrations that tighten RLS (`WITH CHECK` everywhere), add missing policies for `users` / `therapy_cycles` / `invoices` / `invoice_sessions`, add composite indexes, and add the admin RPC + allowlist table that Track B depends on.
- **Files (exclusive — all NEW migration files):**
  - `supabase/migrations/20260421_tighten_rls_with_check.sql` ⚠ live-verified — reframe (see below)
  - `supabase/migrations/20260421_rls_users_therapy_cycles_invoices.sql` ⚠ live-verified — ratifier + admin-read policy
  - `supabase/migrations/20260421_composite_indexes.sql` ⚠ live-verified — narrower than first authored
  - `supabase/migrations/20260421_admin_rpc.sql`
  - `supabase/migrations/20260421_allowed_emails.sql`
  - ~~`supabase/migrations/20260421_invoice_sessions_unique.sql`~~ ⚠ **DROPPED** — live PK already covers `(invoice_id, session_id)` + `UNIQUE(session_id)` alone. H-7 refuted.
  - `supabase/migrations/20260421_deleted_at_index.sql`
- **Sub-agent:** `feature-dev:code-architect` (architectural review) then `general-purpose` to author.
- **Skill:** `code-review:code-review` at the end.
- **Findings closed:** **S-05 (partial), G-07, H-4, H-5 (partial), H-7, C-2, C-3, P-05.**
- **Migration details (⚠ all revised against live DB 2026-04-21):**
  - `20260421_tighten_rls_with_check.sql` — **reframe**: Postgres auto-fills WITH CHECK from USING on `FOR ALL` policies when absent, so most tables are already safe. The real hole is `reports`, which has **two** permissive policies — one joining `sessions`, one checking only `client_id` — OR'd together they allow INSERT of a report with a foreign `session_id`. This migration should `DROP POLICY "Users can view own reports"` (the client_id-only one) and leave the session-joined "Users can manage own reports". For other tables with duplicate `FOR ALL` policies (`clients`, `sessions`, `settings`, `contacts`), consolidate to a single explicit policy with both USING + WITH CHECK for clarity. Closes H-4 + G-07.
  - `20260421_rls_users_therapy_cycles_invoices.sql` — **ratifier**: all four tables already have RLS policies live (see `live_db_verification_2026-04-21.md §3.2`). This migration should `CREATE POLICY IF NOT EXISTS` mirroring live, **plus add the missing admin-read policy on `users`** — without it, `AdminPage.jsx`'s `select * from users` silently returns only the admin's own row. Use either `(EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role='admin'))` or route through `get_admin_user_list()` RPC (see below).
  - `20260421_composite_indexes.sql` — **narrowed to three statements** (originals removed: `idx_reports_client_id` already lives, `idx_invoice_sessions_invoice` covered by the PK's left prefix, `idx_contacts_user_date` was nice-to-have not a blocker):
    - `CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions (user_id, date DESC);`
    - `CREATE INDEX IF NOT EXISTS idx_sessions_client_date ON sessions (client_id, date DESC);`
    - `CREATE INDEX IF NOT EXISTS idx_clients_active ON clients (user_id) WHERE deleted_at IS NULL;`  -- (fuses the old `deleted_at_index` migration)
  - `20260421_admin_rpc.sql` — `CREATE OR REPLACE FUNCTION get_admin_user_list() RETURNS TABLE(...) SECURITY DEFINER LANGUAGE sql AS $$ SELECT ... FROM users WHERE EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') $$; GRANT EXECUTE TO authenticated;` — server-side gate, called from AdminPage.
  - `20260421_allowed_emails.sql` — `CREATE TABLE allowed_emails (email text primary key, invited_by uuid, invited_at timestamptz default now())` with admin-only RLS.
  - ~~`20260421_invoice_sessions_unique.sql`~~ — **DROPPED**. Live schema already has `invoice_sessions_pkey (invoice_id, session_id)` + `invoice_sessions_session_id_key UNIQUE (session_id)`. The latter is *stricter* than the plan assumed — one session can belong to at most one invoice ever. Flag to product: is that the intended domain rule?
  - ~~`20260421_deleted_at_index.sql`~~ — **folded into** `composite_indexes.sql` above.
- **Exit criteria:** all new migrations apply cleanly on a fresh Supabase branch (agent creates the branch via MCP, applies, diffs, destroys the branch). `pg_policies` query shows every table has `WITH CHECK` populated.
- **Depends on:** none (no live-DB introspection needed — these are additive).

### Track D — Database baseline migration (self-service via Supabase MCP)
- **Goal:** capture the actual live schema — the 14+ drifted columns on `clients`, the three fully-undocumented tables (`therapy_cycles`, `invoices`, `invoice_sessions`), and any triggers/functions — into VCS so the DB becomes reproducible.
- **Files (exclusive):**
  - `supabase/migrations/20260401000000_baseline_schema.sql` (NEW, stamped before any other migration — `20260401` predates existing migrations)
  - `audit/live_schema/tables.live.md` (optional — raw introspection snapshot for reviewer diff context)
- **Sub-agent:** `feature-dev:code-explorer` (cross-reference with `migration.sql` + `adapters.js` to avoid duplication), then `general-purpose` to author.
- **Skill:** `review` / `code-review:code-review` at the end.
- **MCP usage (read-only, safe):**
  - `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position`.
  - `SELECT * FROM pg_policies WHERE schemaname='public'` for every RLS policy.
  - `SELECT pg_get_functiondef(oid) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public'`.
  - `SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgisinternal=false`.
  - `SELECT indexdef FROM pg_indexes WHERE schemaname='public'`.
- **Findings closed:** **C-1, C-2, C-3, S-05 (verifies live posture).**
- **Deliverables (⚠ all live-verified 2026-04-21 — use shapes from `live_db_verification_2026-04-21.md §3.1` verbatim):**
  - `20260401000000_baseline_schema.sql` with `CREATE TABLE IF NOT EXISTS …` for `therapy_cycles`, `invoices`, `invoice_sessions`, `ALTER TABLE … ADD COLUMN IF NOT EXISTS …` for every drifted column on `clients`, `sessions`, `reports`, `settings`, `professionals`, all existing policies re-authored with their live names. Idempotent (`IF NOT EXISTS`) so it can apply on both a fresh DB and the current prod.
  - **DO NOT include** `client_links` or `professional_referrals` as tables — **they are not in live DB**. `migration.sql` is divergent, not superset. The baseline migration must match live; `migration.sql` itself should be retired (superseded by the baseline + timestamped patches).
  - **Specific live shapes to honour exactly** (all surprises vs §04 inference):
    - `therapy_cycles.user_id` has `ON DELETE NO ACTION` (not CASCADE). Intentional or not?
    - `therapy_cycles.rate` is `NOT NULL`; `therapy_cycles.total_sessions NOT NULL DEFAULT 20`; `therapy_cycles.phase NOT NULL DEFAULT 'debut'`.
    - `invoices` is a 7-column skeleton: no `invoice_number`, no `amount`, no TVA fields, no `status` column. §06 R-05 (L441-9 non-compliance) is confirmed at the DB level — this is a "link of sessions grouped by date" not an invoice.
    - `invoice_sessions` has no `created_at` — the join is minimal.
    - `clients_status_check` still accepts `{active, inactive, completed}` — `remove_completed_status.sql` was never applied. The baseline captures live truth; a separate migration can tighten later (post-data-cleanup).
    - `clients_type_check` is `{client, individual, family}` — `'couple'` is *not* a valid value. This is a live landmine for Track F (H-1 fix must not write `'couple'`).
    - Eleven drifted columns on `clients`, not fourteen — four doc-only ghosts (`axes_travail`, `points_vigilance`, `objectifs`, `dynamique_relationnelle`) are not live. Do not add them; patch `docs/MON_ARCHITECTURE_DONNEES.md` to remove them.
    - Zero functions, zero triggers, zero storage buckets across the whole project. The baseline need not declare any.
  - Explicit docstring: "This migration captures the baseline applied via Supabase Studio before migration history was complete. Authored from live Supabase Management API introspection on 2026-04-21 — see `audit/live_db_verification_2026-04-21.md` for the evidence pack."
  - Cross-reference check: if the agent finds any column/table used by `src/services/**.js` but absent from the live DB, raise it — it is live code pointing at nothing.
  - **Verification via Supabase branch (preferred path):** create a Supabase branch, apply the baseline, diff branch vs prod — zero drift before merging.
- **Exit criteria:** `pg_dump --schema-only` against a fresh DB that has only `20260401000000_baseline_schema.sql` applied is identical (modulo ordering) to prod.
- **Depends on:** **H-0.3 (MCP rebound to coach-crm project)**. Merge order: after Track C so filename timestamps `20260421_*` already exist; the baseline's `20260401` timestamp sorts first at apply-time.

### Track E — DataContext reform (optimistic updates)
- **Goal:** stop the "reload everything after every mutation" pattern that compounds with scale (P-02, C-01). Introduce optimistic local updates.
- **Files (exclusive):**
  - `src/context/DataContext.jsx` (full rewrite of the 20 mutation helpers — preserve the external API, swap `await loadData()` for `setRawClients(prev => ...)`, `setRawSessions(prev => ...)`, etc.)
  - `src/services/dataService.js`, `src/services/invoiceService.js` (ensure every mutation returns the full updated row via `.select().single()` — most already do)
- **Sub-agent:** `feature-dev:code-architect` (design the update-pattern helper) + `code-simplifier` for the mechanical conversion.
- **Skill:** `andrej-karpathy-skills:karpathy-guidelines` (surgical changes), then `code-review:code-review`.
- **Findings closed:** **C-01, P-02.**
- **Deliverables:**
  - A small helper `applyUpdate(list, id, updatedRow)` → `applyDelete(list, id)` → `applyInsert(list, row)` inside `DataContext.jsx` or lifted to `src/data/listUpdaters.js`.
  - Each mutation: `await ds.updateClient(...)` → on success, `setRawClients(prev => applyUpdate(prev, id, row))`. On error, surface via `showToast` (depends on Track G), keep the previous state.
  - Alliance transitions (`checkAllianceTransition`, `checkAllianceAfterBatchDelete`) need refactoring so they no longer *depend* on the refetch for the subsequent read. Pass in the optimistically-updated snapshot.
  - `loadData()` is kept and called on boot + on explicit `refreshData()` (already exposed) — not on every mutation.
- **Exit criteria:** on a 100-client tenant, updating one session triggers **one** Supabase request (the mutation), not nine (mutation + 8-query reload).
- **Depends on:** Track G (to surface failed mutations properly). Can start in parallel but cannot merge before Track G.

### Track F — Frontend performance (bundle + indexes + misc)
- **Goal:** halve first-load bundle, cut over-fetching, fix the `family` pricing bug, fix the `deleted_at` filter leaks.
- **Files (exclusive):**
  - `vite.config.js` — replace the single-`vendor` `manualChunks` with an explicit split: `react-vendor` (react + react-dom + react-router-dom), `supabase-vendor`, `exceljs-vendor` (lazy), `ui-vendor` (lucide-react).
  - `src/services/exportService.js` — convert to `export async function exportClientDossierExcel(...)` that dynamic-imports `exceljs` inside the function. Or push the import into the call site in `ClientDetailPage.jsx:241`.
  - `src/services/dataService.js:145` — rewrite `getReports` to drop the `sessions!inner(user_id)` join; filter by `client_id` join (requires Track C's `idx_reports_client_id`). **Column shortlisting**: list-views should `select('id, user_id, partner_a->>firstName, partner_a->>lastName, phase, status, start_date, deleted_at')`, not `select('*')`.
  - `src/services/allianceService.js:115-125` — replace the per-client `for { await ds.updateClient(...) }` loop with a single `supabase.from('clients').update({ phase: 'prospect' }).in('id', prospectIds)`.
  - `src/data/constants.js:sessionRates` — add `family` entry mirroring `client` (H-1).
  - `src/services/allianceService.js:19,65` — branch on `type === 'individual'` vs `type === 'client' || type === 'family'` to pick the right rate key. ⚠ **live-verified**: `clients_type_check` forbids `'couple'` — the live type set is `{client, individual, family}`. Grep the repo first; any write path emitting `'couple'` will hit a CHECK violation against the live DB (currently the app avoids this, probably by `adapters.js` emitting `'client'` for couple records — confirm and document).
  - `src/services/dataService.js:getClients` — add `.is('deleted_at', null)` (H-6). Add equivalent server-side filter to `getSessions` and `getReports` via a join.
  - `src/services/dataService.js:deleteClient` — remove the manual reports/sessions/contacts DELETEs; rely on the `ON DELETE CASCADE` that migration.sql already declares (H-5).
  - `src/pages/AdminPage.jsx:132` `<img>` — add `loading="lazy"` + `referrerPolicy="no-referrer"`.
- **Sub-agent:** `feature-dev:code-architect` for the chunking + column-shortlist design; `general-purpose` for the edits.
- **Skill:** `code-review:code-review`.
- **Findings closed:** **P-01, P-03, P-04, P-06, P-11, H-1, H-5, H-6.**
- **Deliverables:**
  - `npm run build` shows the `exceljs-vendor` chunk in a separate file that is **not** loaded on `/`, `/clients`, or `/dashboard`.
  - `ClientDetailPage.jsx` export button shows a spinner while the `exceljs` chunk downloads (first time) or is instant (second time).
  - Soft-deleted clients no longer appear in `useData().clients` unless explicitly requested via `DeletedClientsPage`.
  - Selecting a "family" session type charges the correct rate (no silent fallback to couple).
- **Exit criteria:** first-paint bundle ≤ 300 KB gz (target, rough); no regression on the golden path.
- **Depends on:** Track C (for `idx_reports_client_id`). Everything else can start immediately.

### Track G — Error-handling contract
- **Goal:** surface every failed Supabase write so the user (and Sentry, when added) sees it. Kill the 74-of-77 "console.error and return null" anti-pattern.
- **Files (exclusive):**
  - `src/services/dataService.js`, `src/services/invoiceService.js`, `src/services/allianceService.js`, `src/services/sponsorshipService.js`, `src/services/exportService.js`
  - `src/context/DataContext.jsx` (wire `try/catch` + `showToast` to every mutation wrapper — most already do; audit and complete)
- **Sub-agent:** `general-purpose`.
- **Skill:** `andrej-karpathy-skills:karpathy-guidelines` (surgical) + `code-review:code-review`.
- **Findings closed:** **C-04, G-incident-partial.**
- **Deliverables:**
  - Every service function either (a) throws the Supabase error on failure, or (b) returns a `Result<T, SupabaseError>` typed tuple. Pick one and apply uniformly.
  - Callers in `DataContext.jsx` wrap in `try/catch` and call `showToast('Erreur lors de …', 'error')`.
  - French error messages are kept exactly as currently worded (avoid churn).
- **Exit criteria:** a manually-forced 500 on any Supabase call shows a French toast *and* leaves the UI in a consistent state (no orphan optimistic updates — ties to Track E).
- **Depends on:** nothing. Track E depends on Track G for its rollback-on-error path.

### Track H — Legal pages & public routes
- **Goal:** publish the mandatory public pages; wire `LoginPage` footer links.
- **Files (exclusive):**
  - `src/App.jsx` — add `/mentions-legales`, `/confidentialite`, `/cgu`, `/cookies`, `/accessibilite` as **public** routes (before the auth guard)
  - `src/pages/public/MentionsLegalesPage.jsx` (NEW)
  - `src/pages/public/ConfidentialitePage.jsx` (NEW)
  - `src/pages/public/CguPage.jsx` (NEW)
  - `src/pages/public/CookiesPage.jsx` (NEW)
  - `src/pages/public/AccessibilitePage.jsx` (NEW)
  - `docs/legal/mentions-legales.md`, `docs/legal/confidentialite.md`, `docs/legal/cgu.md`, `docs/legal/cookies.md`, `docs/legal/accessibilite.md` (NEW — Markdown source of truth, loaded by the page components via `import ?raw`)
- **Sub-agent:** `general-purpose` for the scaffolding.
- **Skill:** `code-review:code-review`.
- **Findings closed:** **G-01, R-02 (structural), A-08.**
- **Deliverables:**
  - Five route components, each rendering a `<article class="legal-page">` with a minimalist header and the Markdown body.
  - The five `docs/legal/*.md` files with **placeholder** content and a `<!-- TODO: legal review needed -->` banner. Real content comes from H-0.4.
  - `LoginPage.jsx:305-307` updated to real `<a href="...">` (Track B also edits this file — merge Track H first).
  - A minimal **accessibility statement** in `accessibilite.md` declaring current RGAA conformance level (will be "partielle" until Track I lands).
- **Exit criteria:** visiting `/mentions-legales` when logged-out shows the page; all five pages are crawlable by Google bot (no JS-only rendering — React 19 static routes work here).
- **Depends on:** H-0.4 (legal-copy decision) for final content; structural work can start now with `TODO` placeholders.

### Track I — Accessibility Phase-0
- **Goal:** close the Critical a11y findings. Does not try to reach RGAA conformance — that's Phase 1.
- **Files (exclusive):**
  - `src/index.css` — add `:focus-visible` rule on every focusable element; remove `outline: none` on inputs or replace with a visible ring; add `prefers-reduced-motion` media query around animations; update contrast-failing tokens (`--text-tertiary`, `--text-secondary`, `--success`, `--warning`, `--info`)
  - Every page file — add `htmlFor` to every `<label>`; add unique `id` to the associated input; add `autoComplete` on login/contact inputs.
  - Every modal file (`SessionDetailModal.jsx`, `EditIdentityModal.jsx`, `NotesModal.jsx`, `DeleteConfirmModal.jsx`, `DuplicateAlert.jsx`, `ConfirmContext.jsx`, `DashboardPage` new-session modal, `FinancesPage` drawer) — add `role="dialog"`, `aria-modal="true"`, `aria-labelledby="..."`, focus trap, Escape handler.
  - `src/context/ToastContext.jsx` — add `role="status"` + `aria-live="polite"` to the toast container.
  - `src/components/layout/Sidebar.jsx:27` — demote `<h1>Coach/CRM</h1>` to `<span>` OR conditionally hide it on pages that already have their own `<h1>`.
  - `src/components/layout/Layout.jsx` — add `<a href="#main-content" class="skip-link">Aller au contenu</a>` at the top; `<main id="main-content">` wraps children.
  - `src/pages/ReseauProPage.jsx:130` — replace `window.confirm()` with `ConfirmContext.confirm()`.
  - Every icon-only button — add `aria-label="Fermer"` etc.
  - `src/pages/LoginPage.jsx:306` — dead `<span>`s become real `<a href="...">` links (Track H provides the routes).
- **Sub-agent:** `general-purpose` for the mechanical fixes; `feature-dev:code-architect` for the focus-trap utility.
- **Skill:** `code-review:code-review` + `review`.
- **Findings closed:** **A-01, A-02, A-03, A-04, A-05, A-06, A-07, A-08, C-08, R-08 (partial).**
- **Deliverables:**
  - A reusable `useFocusTrap(ref, isOpen)` hook + `useEscapeKey(handler, isOpen)` hook in `src/hooks/`.
  - Contrast-token changes committed to `docs/MA_CHARTE_GRAPHIQUE.md` (per `.agents/rules/doc.md §5`).
  - All modals keyboard-operable; Escape closes them; focus returns to the opener.
- **Exit criteria:** `axe DevTools` run on staging reports 0 Critical issues on login, dashboard, client-list, and session-modal flows.
- **Depends on:** Track H (for the footer-link fix, to avoid conflict). Can start all other work immediately.

### Track J — Baseline CI (lint + test + GitHub Actions)
- **Goal:** get the minimum safety net a compliance app needs — flat ESLint config, Vitest runner, one GitHub Actions workflow that runs `npm run build && npm run lint && npm test`.
- **Files (exclusive):**
  - `eslint.config.js` (NEW — flat config, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`)
  - `vitest.config.js` (NEW)
  - `src/__tests__/` (NEW — at least one smoke test: `App.test.jsx` renders `<LoginPage>` when unauthenticated)
  - `package.json` (add `scripts.lint`, `scripts.test`, devDeps: `eslint`, `@eslint/js`, `vitest`, `@testing-library/react`, `jsdom`, the three plugins)
  - `.github/workflows/ci.yml` (NEW — runs `npm ci`, `npm run lint`, `npm test`, `npm run build` on pull requests)
- **Sub-agent:** `general-purpose`.
- **Skill:** `code-review:code-review`.
- **Findings closed:** **C-03 (partial; more tests come in Phase 1).**
- **Deliverables:**
  - `npm run lint` passes on the current codebase (after Tracks B/E/F/G/I are merged — may need a pre-merge `// eslint-disable-next-line` sweep to unblock CI).
  - `npm test` runs > 0 tests.
  - `ci.yml` green on a trivial PR.
- **Exit criteria:** branch protection on `main` requires CI to pass.
- **Depends on:** nothing structural, but **should merge last** so it does not block other tracks on lint errors.

### Track K — DPIA kickoff (human-led, documented here)
- **Not a code track.** Flags the work Kotech must do in parallel to the Phase-0 coding work so that a DPIA draft is in hand when the first real therapist signs up.
- **Deliverables (all in `docs/dpia/` — a new folder):**
  - `dpia-scope.md` — defines processing perimeter, data categories, flows.
  - `dpia-lawful-basis.md` — explicit consent (Art. 9(2)(a)) for patient data; contract (Art. 6(1)(b)) for therapist subscription data.
  - `dpia-risks.md` — risks to data subjects (patients): cross-tenant leak, supplier breach, audio transcription leak, LLM prompt exfiltration.
  - `dpia-measures.md` — references the technical controls added by Tracks A/B/C/D/E/F/G.
  - `dpia-residual-risk.md` — what remains after all Phase-0 controls.
  - Reviewed by counsel, signed off by Kotech before first external launch.
- **Findings closed:** **G-04.**
- **Depends on:** nothing — can start today; the quicker this starts, the less schedule risk for the 5-therapist pilot.

### Track L — Factur-X & EU AI Act scoping (human + technical)
- **Goal:** make the 2026-08-02 (AI Act) and 2026-09-01 (Factur-X) deadlines achievable.
- **Deliverables (a `docs/compliance/roadmap.md`):**
  - **AI Act Art. 50 (2026-08-02):** define the UI labelling pattern for AI-generated content ("✨ Généré par IA — vérifiez avant utilisation"), the AI system card text, and the data-retention promise for LLM prompts (30 days default, user-configurable). Stub component `<AiTransparencyBanner>` + `<AiDisclaimerFooter>`.
  - **Factur-X (2026-09-01 reception):** scope decision — integrate with Docoon / Iopole / Chorus PPF? Estimate 4–6 weeks of integration work. If the decision is "we invoice via Stripe Billing which handles it", document that with a DPA reference.
  - **Factur-X (2027-09-01 emission):** longer runway; scope the `invoices` table redesign that will be needed (invoice_number sequence, issuer/recipient snapshots, TVA fields, PDF + XML generation).
- **Findings closed:** **R-04, R-05 (scoped), R-06 (scoped).**
- **Depends on:** nothing.

### Track M — Live-DB Phase-0 verification (MCP-driven)
- **Goal:** confirm that the code changes in A/B/C/D/E/F/G have landed correctly in prod and produce an evidence pack.
- **Sub-agent:** `general-purpose` (MCP-equipped).
- **Findings closed:** none directly — closes Phase 0 with evidence.
- **Deliverables (`audit/phase0_verification.md`):**
  - Rotated anon key is live (no pre-rotation calls succeed).
  - `SELECT policyname, tablename, cmd, with_check FROM pg_policies WHERE schemaname='public'` — every table has `with_check` populated (explicit, post-Track-C consolidation).
  - `reports` has exactly **one** policy (the session-joined one); the loose `client_id`-only policy has been dropped (H-4 closure).
  - `users` has an **admin-read policy** and `AdminPage.jsx` shows the full user list when logged in as admin (⚠ new smoke test — pre-Track-C this silently rendered a 1-row list).
  - `therapy_cycles`, `invoices`, `invoice_sessions` RLS unchanged from pre-Phase-0 live (ratifier migration only).
  - `allowed_emails` table exists; admin insert/delete works; non-admin can't read.
  - `get_admin_user_list` RPC exists and is callable only by admins.
  - `idx_sessions_user_date`, `idx_sessions_client_date`, `idx_clients_active` exist.
  - `pg_dump --schema-only | diff -u <baseline>` shows zero drift.
  - Smoke test: log in as a test therapist, create a client, update a session — the Network tab shows **1** request per mutation, not 9.
- **Exit criteria:** every item above ✅.
- **Depends on:** A/B/C/D/E/F/G merged.

---

## 3 · Dispatch prompts (abbreviated)

For each track, dispatch via `Agent(subagent_type=…, prompt=…, isolation="worktree")` with a prompt that contains:

1. A one-paragraph context identical to Track's §2 "Goal" plus the findings codes.
2. The "Files (exclusive)" list verbatim — agents must not touch files outside this list.
3. The "Deliverables" list verbatim.
4. A pointer to the relevant audit section(s) for evidence.
5. "Do not modify tests; do not run `npm install` unless `package.json` changed in this track; leave a commit message in imperative mood that starts with `fix(security):`, `fix(db):`, `perf(context):`, etc. per the existing commit style."

---

## 4 · Merge order (minimises conflicts)

1. **A** — repo hygiene, in its own PR, merged first. History rewrite coordinated.
2. **C** — migrations (code-only). Adds the RPC + allowlist table + indexes.
3. **D** — baseline migration. Sorts at apply-time before C but merges after C (filename-timestamp trick).
4. **G** — error-handling contract. Needed by E.
5. **E** — DataContext reform.
6. **H** — legal pages scaffold. Needed by B (footer links).
7. **B** — frontend security (PKCE, gate, headers, marketing-claim fix).
8. **F** — frontend performance (cascade fix, family type, dynamic exceljs).
9. **I** — accessibility Phase-0.
10. **J** — baseline CI. Last so it does not block the others on lint churn.
11. **M** — verification. Produces the green-light evidence pack.

Tracks K (DPIA) and L (AI Act / Factur-X scoping) are human-driven, run in parallel to everything, and do not merge code.

---

## 5 · Phase 1 preview (after Phase 0 lands)

Not dispatched here — captured for scheduling:

- **Security hardening:** idle timeout, MFA for admins, audit-log table + `audit_log_insert` trigger, Sentry wiring, supply-chain watch (npm audit in CI), XLSX-export ACL + audit entry.
- **DB clean-up:** drop the dead `client_links` / `professional_referrals` tables OR pivot the app to them (decide one way); deprecate the `*notes_*` vs `axes_travail`/`points_vigilance` duplicate columns on `clients`; add `deleted_at` filter to every service that reads clients.
- **Performance:** route-aware `DataProvider` (don't fetch `invoices` for the dashboard), server-side view `clients_with_stats` to avoid client-side joins, dedup inline styles into CSS classes, rewrite mega-pages (`ClientsPage` 1 160 LOC → container + panels).
- **Code quality:** centralise `MONTHS_FR`, phase colours, `clientTypeLabels`; fix the two hook-order violations; gate debug logs behind `import.meta.env.DEV`; `.github/workflows/` add Lighthouse CI + axe.
- **Accessibility:** complete the A-09..A-40 backlog, RGAA conformance statement.
- **Regulatory:** full DPIA signed; RoPA published; DPAs signed with Supabase / Vercel / Google; AI-content-labelling component live; Factur-X decision implemented.

---

*Plan authored 2026-04-21. Companion: [`INDEX.md`](INDEX.md) and seven domain audits (`01_*.md`…`07_*.md`).*
