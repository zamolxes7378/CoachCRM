# 03 — Performance & Scalability Audit

_Audit date: 2026-04-21 · Reviewer: automated static analysis · Build state: not executed (static review only) · Branch: `main`_

## Executive Summary

- **Overall risk**: **High**
- **Scalability headroom**: **risky** (fine at the current 5-pilot load; severely degraded beyond ~30 therapists with accumulated history)
- **Production-ready from perf standpoint**: **Conditional** — safe to deploy to the 5-pilot cohort today, but several items below become actively painful by ~50 therapists or ~2 years of session history. Two issues are cheap to fix now and should be.

Headline findings:

- **Every single CRUD mutation reloads the entire per-tenant dataset**. `DataContext.jsx:167–438` implements 20+ action methods, and every one of them does `await mutation(...)` followed by `await loadData()`. `loadData()` fires 8 parallel `select('*')` queries across `clients`, `sessions`, `reports`, `settings`, `professionals`, `contacts`, `therapy_cycles`, `invoices`. For a mature single therapist with 100 clients / 2 000 sessions / 2 000 reports, this refetches ~5–8 MB per click, just to update one row. **Single biggest scalability bomb in the app.** (Finding P-02.)
- **Manual bundle chunking lumps everything into `vendor`**. `vite.config.js:13–15` returns `'vendor'` for any `node_modules` id. That puts `exceljs` (≈1 MB unpacked), `@supabase/supabase-js`, `lucide-react`, `react-router-dom`, `react`, `react-dom` in one file. **`exceljs` is only used by `ClientDetailPage` export** (`exportService.js:1`), but it ships on every first load because it is in the common vendor chunk. React's per-page `lazy()` (`App.jsx:13–22`) does not help.
- **`getReports` joins the whole `sessions` table on every load**. `dataService.js:145–153` — `select('*, sessions!inner(user_id)')`. At 2 000 sessions × 2 000 reports this is already ~4 MB and the join is pointless: `reports.client_id` plus a single client→user lookup would serve the same purpose.
- **`select('*')` everywhere** — 11 of 12 query sites. On `clients` this pulls the four widest JSONB columns in the schema (`partner_a`, `partner_b`, `emotional_maturity_history`, `exercises`, `client_links`, `ai_synthesis`) even on list views that display only name + phase.
- **N+1 writes in the alliance service**. `allianceService.js:115–125` loops `for (const clientId of affectedClientIds) { … await ds.updateClient(…) }`. On a batch-delete of 10 sessions that affects 5 clients, that's 5 sequential round-trips after the delete and before the refetch.
- **Missing indexes on the hottest future query shape**. `supabase/migration.sql:148–159` declares FK-like single-column indexes but **no composite** on `sessions(user_id, date)`, which is the exact shape of `getSessions` (`dataService.js:84–91`) — the query that will return 200 000 rows at the 2-year projection.
- **No route-level network boundary**. Lazy-loading the page component is good, but `DataProvider` wraps `<BrowserRouter>` (`App.jsx:209–211`), so every successful login fires all 8 `loadData` queries before any route is visible. `therapyCycles`, `invoices`, `professionals`, `contacts` aren't needed for the dashboard route.
- **1 376 inline `style={{…}}` sites across 42 files** — each creates a fresh object identity per render, defeating `React.memo` and making leaf-component memoisation impossible without an object comparator. Only two components in the codebase are memoised (`ClientTypeBadge`, `SessionCard`) and both receive inline-style ancestors, so the memoisation is largely defeated in practice.
- **Startup cost**: `main.jsx:8–19` attaches a **capture-phase `input` listener on `document`**. Fires on every keystroke in any `<input>` on the page — including ones not of type `number`. For a form-heavy page like `ClientDetailPage` or `SettingsPage`, this is several thousand micro-dispatches per session.
- **No Supabase Realtime / polling** (verified — zero `setInterval` on mutation, zero `channel.subscribe`). That's a _gap_, not a _win_, given the "reload everything after any change" pattern. With Realtime, the server could push deltas instead of the client downloading everything.
- **`<img>` tags for therapist photos**: `AdminPage.jsx:132` renders Google-hosted avatars with no `loading="lazy"`, no `referrerPolicy="no-referrer"`. At 100 therapists every admin visit loads every photo synchronously in the DOM.

---

## Scope & Methodology

**What was examined**

- `package.json` — runtime deps, no build-tool preset, no test runner, no lint
- `vite.config.js` — `manualChunks` logic
- `src/App.jsx` + `src/main.jsx` — boot sequence, auth listener, global `input` handler, router
- `src/context/DataContext.jsx` — 443 lines of data provider, every mutation's post-side-effect
- `src/services/*.js` — every Supabase call site (12 distinct query shapes)
- `src/pages/*.jsx` + `src/components/**/*.jsx` — render hot paths, inline-style density, memoisation density
- `supabase/migration.sql` — declared indexes and RLS
- `audit/live_schema/tables.md` — known drift between declared schema and runtime

**What was NOT examined** — no build was run, no profile was taken, no source files were modified. All findings are static.

**Targeted files**

| Page | File | LOC |
|---|---|---|
| Client list (core hot path) | `src/pages/ClientsPage.jsx` | 1 160 |
| Finances (heavy aggregation) | `src/pages/FinancesPage.jsx` | 933 |
| Session detail modal | `src/components/client/SessionDetailModal.jsx` | 905 |
| Dashboard | `src/pages/DashboardPage.jsx` | 771 |
| Edit identity modal | `src/components/client/EditIdentityModal.jsx` | 767 |
| Réseau pro | `src/pages/ReseauProPage.jsx` | 622 |
| Settings | `src/pages/SettingsPage.jsx` | 569 |
| Client detail | `src/pages/ClientDetailPage.jsx` | 512 |
| Timeline panel | `src/components/client/ClientTimelinePanel.jsx` | 451 |
| Data provider | `src/context/DataContext.jsx` | 443 |
| Data service | `src/services/dataService.js` | 332 |
| Index CSS | `src/index.css` | 1 484 |

Total: ~9 000 LOC of first-party frontend.

---

## Bundle Analysis (static review — no build run)

No dist was built; sizes below are published unpacked sizes from npm for the versions in `package.json` (approximate — compressed bundle will be smaller once Rollup tree-shakes).

| Dependency | Version | Approx. raw size (estimated) | Usage | Lazy-loaded? |
|---|---|---|---|---|
| `react` + `react-dom` | ^19.2.4 | ~130 KB min+gz combined | Core | No (required at root) |
| `react-router-dom` | ^7.13.1 | ~40 KB min+gz | Router | No |
| `@supabase/supabase-js` | ^2.99.3 | ~95 KB min+gz | Singleton client `src/lib/supabase.js` | No |
| `lucide-react` | ^0.577.0 | ~20–30 KB gz tree-shaken per-icon (~3 MB source). Wildcard imports kill tree-shake; usage pattern is named (`import { Users, Plus } from 'lucide-react'`) — OK in principle. | Every page | No — but tree-shakeable. |
| `exceljs` | ^4.4.0 | **~1 MB min / ~280 KB gz** (estimated) | Only `services/exportService.js:1`, invoked exclusively from `ClientDetailPage:241` "export dossier" button | **No — eagerly imported by `exportService.js` which is imported at module scope from `ClientDetailPage.jsx:29`.** |
| `file-saver` | ^2.0.5 | ~15 KB | `exportService.js:2` | No |

### Bundle-level findings

1. **`vite.config.js:11–17` puts every `node_modules` entry into a single `vendor` chunk.** That chunk includes `exceljs` (~1 MB unpacked) even though the export path is reached only on `/clients/:id` and only when the user clicks the dossier-export button. Effect: the login page, the dashboard, and every mobile first-visit download a megabyte of Excel runtime they will likely never execute.

   **Fix**: switch to named chunks and dynamic-import `exceljs`:

   ```js
   // vite.config.js
   build: {
     rollupOptions: {
       output: {
         manualChunks: {
           'react-vendor': ['react', 'react-dom', 'react-router-dom'],
           'supabase': ['@supabase/supabase-js'],
           'icons': ['lucide-react'],
           // exceljs intentionally omitted — let Vite create a split chunk
           // for the dynamic import below
         },
       },
     },
   },
   ```

   ```js
   // ClientDetailPage.jsx — defer until the user clicks "Export"
   const handleExport = async () => {
     const { exportClientDossierExcel } = await import('../services/exportService')
     return exportClientDossierExcel(client, sessions, allReports.filter(r => r.clientId === id), formatDate, getPhaseLabel)
   }
   ```

   This alone is expected to cut the initial JS payload by **~25–30 %** (estimated).

2. **`lucide-react` named imports are fine**, but the sheer number of icons across the app (scanned ~40 distinct names) adds up. No immediate fix required.

3. **Route-level code-splitting is already in place** (`App.jsx:13–22`). This is the one thing done right in this bundle story — preserve it.

4. **`index.css` at 1 484 lines, single file** — ~35 KB unminified, ~8 KB gzipped. Ships on every page. Acceptable.

5. **No images in `public/`** — app relies on Google-hosted avatar URLs for therapists. Avoids a static asset pipeline issue but creates a referrer-policy/lazy-loading concern (see P-11 below).

---

## Query Hot Spots

The five most expensive query paths, ranked by frequency × row-count × lack of index.

### 1. `DataContext.loadData()` — the full-tenant reload

`DataContext.jsx:55–86`, called on mount **and after every mutation**:

```js
const [c, s, r, st, p, ct, tc, inv] = await Promise.all([
  ds.getClients(user.id),       // clients.select('*')
  ds.getSessions(user.id),      // sessions.select('*')
  ds.getReports(user.id),       // reports.select('*, sessions!inner(user_id)')  ← joins sessions
  ds.getSettings(user.id),      // settings.select('*')
  ds.getProfessionals(user.id), // professionals.select('*')
  ds.getContacts(user.id),      // contacts.select('*')
  ds.getTherapyCycles(user.id), // therapy_cycles.select('*')
  invService.getInvoices(user.id) // invoices.select('*, invoice_sessions(session_id)')
])
```

- **Projected rows per therapist at 2 years**: 100 clients, 2 000 sessions, 2 000 reports, ~1 500 contacts, ~50 professionals, ~40 therapy cycles, ~200 invoices. With the JSONB bloat listed in `audit/live_schema/tables.md:29–56`, that's a reasonable 5–10 MB payload per reload.
- **Frequency**: after **every** `updateClient`, `createClient`, `deleteClient`, `updateSession`, `createSession`, `deleteSession`, `deleteSessions`, `upsertSettings`, `createProfessional`, `updateProfessional`, `deleteProfessional`, `deleteProfessionals`, `createTherapyCycle`, `updateTherapyCycle`, `deleteTherapyCycle`, `createInvoice`, `updateInvoice`, `emitInvoice`, `unemitInvoice`, `deleteInvoice`, `setInvoiceSessions`, `createContact`, `updateContact`, `deleteContact`. That's **20+ distinct mutation actions** that all end in `await loadData()`.
- **Quantified impact**: at the 100-client / 2 000-session scale, every "mark session paid" click downloads ~5 MB. On a 50 Mbps home connection that's ~1 second per click; on 4G it's 3–5 s. Battery, data plan, and server egress all pay the cost.
- **Root cause**: no per-entity `setRawSessions(prev => prev.map(…))` / `prev.concat(…)` logic; simplest correct-by-default approach is "refetch everything".

### 2. `getReports` cross-join (reports × sessions)

`dataService.js:145–153`:

```js
const { data, error } = await supabase
  .from('reports')
  .select('*, sessions!inner(user_id)')
  .eq('sessions.user_id', userId)
  .order('date', { ascending: false })
```

- `select('*, sessions!inner(user_id)')` forces Postgres to hash-join reports against sessions and stream a row-per-report with an embedded `sessions` subobject, even though all that is wanted is a filter by tenant.
- `reports.client_id` already exists (`migration.sql:66`). A simpler shape: `.select('*').in('client_id', knownClientIds)` after `getClients`, or an RLS-side subselect on `client_id`.
- **Projected cost**: at 2 000 reports × joined 2 000-session table scan, this becomes one of the heaviest queries. Add `select('*')` on the already-JSONB-heavy reports table (9 JSONB columns per `migration.sql:73–80`) and the payload balloons.

### 3. `getSessions` — unindexed composite query

`dataService.js:84–91`:

```js
const { data, error } = await supabase
  .from('sessions')
  .select('*')
  .eq('user_id', userId)
  .order('date', { ascending: false })
```

- Ordered by `date DESC` after filtering by `user_id`. The declared indexes `idx_sessions_user_id` and `idx_sessions_date` are both single-column; the planner will typically use one and then sort, which is fine at small scale but scans lots of rows when sessions cross the 10–20 k threshold.
- At the 2-year projection (100 therapists × 100 clients × 20 sessions = 200 000 rows in `sessions` globally, **2 000 rows per RLS-visible tenant**), the query plan under RLS will be: filter by `user_id` via index, then sort 2 000 rows — acceptable. BUT: `getSessions` is called 20+ times per user session (once on mount + once after every mutation). Each call returns 2 000 rows. 2 000 × 20 mutations × 100 users × 50 MB/day ≈ 100 GB Supabase egress **per day at scale**. That's a cost concern more than a latency one.
- `(user_id, date DESC)` composite supports both filter and sort with zero disk sort.

### 4. `getInvoices` deep select

`invoiceService.js:10–21`:

```js
.select(`
  *,
  invoice_sessions ( session_id )
`)
```

- `invoice_sessions` has no declared index on `invoice_id` in `migration.sql` (neither table is in `migration.sql` at all per `audit/live_schema/tables.md:26`). The nested select joins back for every invoice row.
- `auth.uid()` RLS for `invoice_sessions` is **undeclared in VCS** (per `live_schema/tables.md:105`), so this query may be unsafe cross-tenant in addition to unindexed.
- At 200 invoices per therapist × 10 sessions each = 2 000 join rows — still cheap today, but trends badly.

### 5. Alliance-service loop of UPDATEs

`allianceService.js:115–125`, invoked from `DataContext.deleteSessions` (`:282–294`):

```js
for (const clientId of affectedClientIds) {
  const client = rawClients.find(c => c.id === clientId)
  if (!client || client.phase === 'prospect') continue
  const validCount = remainingSessions.filter(
    s => s.client_id === clientId && isAllianceValidated(s, sessionRates, client)
  ).length
  if (validCount === 0) {
    await ds.updateClient(clientId, { phase: 'prospect' })
  }
}
```

- Sequential `await` inside the loop. On a 10-session batch delete that affects 5 different clients, that's 5 sequential 100–200 ms round-trips = **0.5–1 s serial delay** before the final `loadData()` even starts.
- And then `updateClient` (`dataService.js:59–68`) does its own roundtrip + returns the updated row.
- Follow-up: the outer `deleteSessions` in `DataContext.jsx:280–295` does `await checkAllianceAfterBatchDelete(…)` then `await loadData()` — so the user sees 5 updates + 1 delete + 1 full reload = 7 serial round-trips for a single batch delete action.

Honourable mentions:

- **`App.jsx:71–89`** (`syncUser`) fires a SELECT then an UPDATE on `users` on every `SIGNED_IN` or `INITIAL_SESSION` event. Supabase Auth fires `INITIAL_SESSION` on every tab open and `SIGNED_IN` on token refresh. That's ~2 round-trips per tab per hour per user, even when nothing changed. Gate on "is there a diff between meta and existing?" before the UPDATE.
- **`checkAllianceTransition`** (`allianceService.js:53–89`) does one more `updateClient` per session write — so every `createSession` / `updateSession` becomes: `ds.updateSession` + `ds.updateClient (if alliance flip)` + `loadData()`. Three round-trips per click, minimum.

---

## Index Audit Table

**IMPORTANT**: This table was produced by diffing query shapes in `src/**` against `supabase/migration.sql`. The Supabase dashboard may contain additional indexes created outside migrations; those are invisible to this audit. Before acting on the "Recommendation" column, query `pg_indexes` in the live DB and confirm.

| Table | Query shape (where used) | Existing index in migrations? | Recommendation |
|---|---|---|---|
| `sessions` | `user_id = ? ORDER BY date DESC` (`dataService.js:84`) — called after every mutation | `idx_sessions_user_id` + `idx_sessions_date` (single-column each) | Add `CREATE INDEX idx_sessions_user_date ON sessions (user_id, date DESC);` to avoid sort step. **Critical at projected scale.** |
| `sessions` | `client_id = ? ORDER BY date ASC` (`dataService.js:94`) | `idx_sessions_client_id` (single-column) | Add `CREATE INDEX idx_sessions_client_date ON sessions (client_id, date);` |
| `reports` | joined to `sessions!inner(user_id = ?)` ORDER BY date (`dataService.js:145`) | `idx_reports_session_id` only | Add `CREATE INDEX idx_reports_client_id ON reports (client_id);` — even if the query stays join-based, the RLS `client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())` policy from `migration.sql:178` depends on it. |
| `contacts` | `user_id = ? ORDER BY date DESC` (`dataService.js:213`) | `idx_contacts_client_id` only (FK, single-col) | Add `CREATE INDEX idx_contacts_user_date ON contacts (user_id, date DESC);` |
| `contacts` | `client_id = ? ORDER BY date DESC` (`dataService.js:223`) | `idx_contacts_client_id` — but **no covering index for `(client_id, date)`** | Add `CREATE INDEX idx_contacts_client_date ON contacts (client_id, date DESC);` |
| `clients` | `user_id = ? ORDER BY created_at DESC` (`dataService.js:29`) | `idx_clients_user_id` single-col | Add `CREATE INDEX idx_clients_user_created ON clients (user_id, created_at DESC);` |
| `therapy_cycles` | `user_id = ? ORDER BY start_date DESC` (`dataService.js:168`) | **No migration** for the table, let alone index (`live_schema/tables.md:25`) | Create migration for the table itself; include `CREATE INDEX idx_therapy_cycles_user_start ON therapy_cycles (user_id, start_date DESC);` |
| `professionals` | `user_id = ? ORDER BY created_at DESC` (`dataService.js:287`) | `idx_professionals_user_id` single-col | Acceptable at scale; optionally add composite. |
| `invoices` | `user_id = ? ORDER BY created_at DESC` (`invoiceService.js:11`) | **No migration** for the table | Create migration; `CREATE INDEX idx_invoices_user_created ON invoices (user_id, created_at DESC);` |
| `invoices` | `client_id = ? ORDER BY created_at DESC` (`invoiceService.js:27`) | None | `CREATE INDEX idx_invoices_client ON invoices (client_id, created_at DESC);` |
| `invoice_sessions` | `invoice_id = ?` (`invoiceService.js:101, 111, 125, 132`) | **No migration** | `CREATE INDEX idx_invoice_sessions_invoice ON invoice_sessions (invoice_id);` — also **add RLS** |
| `invoice_sessions` | `session_id = ?` (nested select from `getInvoices`) | None | `CREATE INDEX idx_invoice_sessions_session ON invoice_sessions (session_id);` |
| `users` | `email = ?` (`dataService.js:11`, `App.jsx:74`) | `UNIQUE(email)` from `migration.sql:9` — gives a free unique index | Good. |
| `settings` | `user_id = ?` (`dataService.js:267`) | `UNIQUE(user_id)` on `settings` from `migration.sql:137` | Good. |

### Summary of proposed indexes (8 critical, 5 recommended)

**Critical — add before production scale-up:**

```sql
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON public.sessions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_client_date ON public.sessions (client_id, date);
CREATE INDEX IF NOT EXISTS idx_reports_client_id ON public.reports (client_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_date ON public.contacts (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_client_date ON public.contacts (client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_clients_user_created ON public.clients (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_sessions_invoice ON public.invoice_sessions (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_sessions_session ON public.invoice_sessions (session_id);
```

**Recommended — add once active users exceed ~30 or cumulative sessions exceed ~10 k per tenant:**

```sql
CREATE INDEX IF NOT EXISTS idx_therapy_cycles_user_start ON public.therapy_cycles (user_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_user_created ON public.invoices (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON public.invoices (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_professionals_user_created ON public.professionals (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_deleted ON public.clients (user_id) WHERE deleted = true;
```

---

## Query-Cost Table at Projected Scale

Scale assumption: **100 therapists × 100 clients × 20 sessions/year × 2 years = 200 000 rows globally in `sessions`**; per-RLS-tenant: 100 clients, 2 000 sessions, 2 000 reports, 1 500 contacts.

| Query | Called from | Per-call rows (est.) | Per-call payload (est.) | Calls/day/user (est.) | Daily cost/user (est.) |
|---|---|---|---|---|---|
| `getSessions` `select('*').eq(user_id).order(date DESC)` | `DataContext.loadData` | 2 000 | 600 KB (raw JSON) | 20–50 mutations/day × reload | 12–30 MB |
| `getClients` `select('*').eq(user_id)` | same | 100 | 400 KB (wide JSONB) | 20–50 | 8–20 MB |
| `getReports` join | same | 2 000 | 1.5 MB (9 JSONB cols + sessions join) | 20–50 | 30–75 MB |
| `getContacts` `select('*').eq(user_id)` | same | 1 500 | 250 KB | 20–50 | 5–12 MB |
| `getTherapyCycles` | same | ~40 | 10 KB | 20–50 | ~0.3 MB |
| `getProfessionals` | same | ~50 | 25 KB | 20–50 | ~1 MB |
| `getInvoices` with nested select | same | ~200 | 80 KB | 20–50 | ~2–4 MB |
| `getSettings` single row | same | 1 | 5 KB | 20–50 | ~0.2 MB |
| **Total per active user per day** |  |  | **~3 MB/reload** | **~30 reloads** | **~60–150 MB/user/day** |

At 100 therapists: ~6–15 GB/day of Supabase egress just from the "reload after mutation" pattern. Supabase's free tier is 5 GB/month egress; paid plans are $0.09/GB. The current architecture is roughly **$40–130/month in egress alone** at 100 therapists — economically manageable, but needlessly spent.

Any one of three fixes eliminates 80 %+ of that cost:
1. Replace `loadData()` after mutation with local array patching (`prev.map(s => s.id === updated.id ? updated : s)`).
2. Subscribe to Supabase Realtime on `sessions`, `clients`, `reports` — let the DB push deltas.
3. Select narrower columns (omit JSONB fields from list views).

---

## Findings

### Critical

#### P-01 — `exceljs` in the shared vendor chunk; ships on every first load

**Location**: `vite.config.js:11–17`, `services/exportService.js:1`, `pages/ClientDetailPage.jsx:29`.

`vite.config.js` uses `manualChunks(id)` that returns `'vendor'` for any `node_modules` id. `exportService.js` is imported at module scope from `ClientDetailPage.jsx`, which is itself `React.lazy()`-ed — so the chunk splits at the `ClientDetailPage` boundary... but because `exceljs` is categorised as "vendor", Rollup hoists it to the common vendor chunk, **inverting the lazy gain**. The user logs in, the dashboard loads, and `vendor.js` (~1 MB estimated, including exceljs + file-saver + supabase-js + react + icons) downloads in one go.

Verified: `Grep 'import.*exceljs'` returns **only** `exportService.js:1`. There is no other consumer.

**Impact**: ~25–30 % of the initial JS payload is dead code for 95 %+ of sessions. Time-to-interactive on 4G is noticeably worse than it needs to be. Battery + data plan impact on mobile.

**Fix**: (1) Remove `exceljs` and `file-saver` from the "vendor" categorisation — let Vite put them in a split chunk. (2) Convert `import { exportClientDossierExcel }` to a dynamic `await import('../services/exportService')` at the click handler in `ClientDetailPage.jsx:241`.

---

#### P-02 — Global `loadData()` after every mutation (the scalability bomb)

**Location**: `src/context/DataContext.jsx:167–438`.

Every mutation method in `DataContext` ends with `await loadData()`. `loadData` (`:55–86`) fires 8 parallel selects with `Promise.all` — which is correct for parallelism but doesn't fix the problem: **each mutation triggers a full-tenant refetch**.

Concrete call sites that do this:

| Method | Line | Mutation | Post-mutation reload |
|---|---|---|---|
| `updateClient` | 166–174 | `ds.updateClient` | `await loadData()` |
| `createClient` | 176–193 | `ds.createClient` | `await loadData()` |
| `deleteClient` | 194–203 | `ds.deleteClient` | `await loadData()` |
| `updateSession` | 204–230 | `ds.updateSession` + alliance check | `await loadData()` |
| `createSession` | 231–250 | `ds.createSession` + alliance check | `await loadData()` |
| `createContact` / `updateContact` / `deleteContact` | 251–265 | ds.* | `await loadData()` |
| `deleteSession` | 266–279 | `ds.deleteSession` + alliance batch | `await loadData()` |
| `deleteSessions` | 280–295 | `ds.deleteSessions` + alliance batch | `await loadData()` |
| `upsertSettings` | 296–305 | `ds.upsertSettings` | **only** `setSettings(result)` — **good example** of the pattern elsewhere |
| `createProfessional` / `updateProfessional` / `deleteProfessional` / `deleteProfessionals` | 306–348 | ds.* | `await loadData()` |
| `createTherapyCycle` / `updateTherapyCycle` / `deleteTherapyCycle` | 349–378 | ds.* | `await loadData()` |
| `createInvoice` / `updateInvoice` / `emitInvoice` / `unemitInvoice` / `deleteInvoice` / `setInvoiceSessions` | 380–439 | invService.* | `await loadData()` |

Note that `upsertSettings` uses the correct pattern (`setSettings(result)` — update local state from the returned row). Every other action ignores the returned row and refetches.

**Quantified impact at 100 clients / 2 000 sessions / 2 000 reports:**

- Per-mutation payload: ~3 MB (see query-cost table above)
- Active-user mutation frequency: 20–50 clicks/day (confirm a payment, add a contact, tick a checkbox, reschedule a session)
- Per-user daily data: 60–150 MB
- 100-user fleet: 6–15 GB/day, ~180–450 GB/month Supabase egress

**Perceived latency**: at 100 Mbps on wired broadband, 3 MB downloads in 250 ms — barely noticeable today at 100 sessions but becomes 5× slower at 2 000. On mobile (10 Mbps), 3 MB is 2.5 s — every click feels heavy.

**Fix**:

1. **Minimum viable**: each mutation already returns the updated row (all the `dataService.update*` methods end with `.select().single()`). Update the local raw state in place. Example for `updateSession`:

   ```js
   updateSession: async (id, updates) => {
     const result = await ds.updateSession(id, unadaptSession(updates))
     if (result) {
       setRawSessions(prev => prev.map(s => s.id === id ? result : s))
       await checkAllianceTransition(result, updates, rawClients, rawSessions, sessionRates, defaultPhaseKey)
     }
     return result
   }
   ```

2. **Better**: subscribe to Supabase Realtime on `sessions`, `clients`, `reports`, `contacts`, `invoices`, `invoice_sessions` filtered by the current `user_id`. Let the DB push deltas.

3. **Best**: combine (1) for optimistic update + (2) for cross-device consistency.

---

#### P-03 — `getReports` cross-join pulls the whole sessions table

**Location**: `src/services/dataService.js:145–153`.

```js
.select('*, sessions!inner(user_id)')
.eq('sessions.user_id', userId)
```

The `sessions!inner(user_id)` join is used **only** to filter reports by tenant. But `reports` already has a `client_id` foreign key (`migration.sql:66`), and `clients` has `user_id`. A two-step lookup (clients → client_ids → reports) avoids the join entirely.

Alternatively: RLS policy `migration.sql:178` (`client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())`) already scopes reports correctly. The app-layer filter on `sessions.user_id` is redundant _and_ expensive.

**Impact**: at 2 000 reports + 2 000 sessions, the join materialises 2 000 (report, {user_id}) tuples and streams them back. ~1.5 MB payload, several hundred ms to serialise.

**Fix**: `.select('*').order('date', { ascending: false })` and trust RLS. If RLS is unreliable (see `live_schema/tables.md:108–125`), fix RLS first — but do not double-up at the app layer.

---

#### P-04 — `select('*')` on JSONB-heavy tables

**Location**: 11 of 12 query sites in `src/services/*.js` use `select('*')` or an equivalent wildcard.

`clients` carries at least 6 JSONB columns (`partner_a`, `partner_b`, `emotional_maturity_history`, `exercises`, `client_links`, plus undeclared `ai_synthesis` text per `live_schema/tables.md:32`). On list views (`ClientsPage.jsx`, `DashboardPage.jsx`) the UI reads only `partner_a.firstName`, `partner_a.lastName`, `phase`, `status`, `source` — ~10 % of the payload.

`reports` has 9 JSONB columns (`migration.sql:73–80`) — `themes`, `emotions_a`, `emotions_b`, `patterns`, `progress`, `vigilance`, `exercises`, `pedagogical_content`, plus `narrative` text. These are only displayed in `ReportDetailPage`, never in list views.

**Fix**: explicit column list in `dataService`. Two-tier selection:

- "Light" select for list context: `id, user_id, partner_a, partner_b, type, phase, status, source, start_date, created_at, updated_at, deleted, deleted_at`.
- "Full" select for detail context: current `select('*')`, loaded on `getClient(id)` only.

Expected reduction at 100 clients: 400 KB → ~60 KB per call. Same ratio for reports.

---

#### P-05 — Missing critical indexes on the hottest queries

See the Index Audit Table above. Eight critical composite indexes are absent.

**Impact**: at the current 5-pilot scale, the tables are tiny (a few hundred rows) and sequential scan beats any index. Past ~5 000 `sessions` per tenant, the `(user_id) → sort` plan for `getSessions` starts to show measurable lag — first noticed on `loadData()` being slow (cold cache) or on dashboard filter interactions (`DashboardPage.jsx:55–80`, several `.filter().sort()` chains derived from `sessions`).

**Fix**: apply the 8 critical DDL statements in a single new migration file `supabase/migrations/YYYYMMDD_add_perf_indexes.sql`.

---

### High

#### P-06 — N+1 UPDATE loop in alliance batch-delete

**Location**: `src/services/allianceService.js:101–127`.

```js
for (const clientId of affectedClientIds) {
  // ...compute validCount from in-memory data...
  if (validCount === 0) {
    await ds.updateClient(clientId, { phase: 'prospect' })
  }
}
```

- Sequential `await` in loop. 5 affected clients = 5 serial round-trips.
- After this loop, `DataContext.deleteSessions` (`:280–295`) then calls `await loadData()` — the already-serialised work is followed by a full reload.

**Impact**: a batch delete of "this client's last 10 sessions" currently takes (1 × DELETE) + (5 × UPDATE client) + (8 × SELECT in loadData) = **14 round-trips**. At 150 ms RTT, that's ~2 s of spinner time.

**Fix**:
1. Replace the loop with `supabase.from('clients').update({ phase: 'prospect' }).in('id', idsToFlip)` — one round-trip.
2. Replace `loadData()` with per-collection local patching (see P-02).

---

#### P-07 — Global `input` event listener on `document` for number input sanitisation

**Location**: `src/main.jsx:8–19`.

```js
document.addEventListener('input', (e) => {
  if (e.target.type === 'number' && !e.target._stripLz) {
    ...
  }
}, true)
```

- Capture-phase listener on every keystroke in every `<input>`.
- Inside the handler, checks `e.target.type` first — so non-number inputs are cheap, but the listener still runs. On a large form like `EditIdentityModal.jsx` (767 LOC with 40+ input fields), this is hundreds of handler invocations per form session.
- The `_stripLz` flag on the DOM element is set and then reset, and the handler dispatches a synthetic `input` event via `nativeSet.call` — **recursive re-entry through the same listener**. Works because of the flag, but brittle.

**Impact**: conceptually — main-thread time. A rough estimate: each handler run is ~10 μs, so 100 keystrokes on a form = 1 ms total. Not a user-perceptible issue today, but it is a global stateful hook at the document level that runs forever and is tedious to debug when it interacts badly with a controlled `<input type="number">`.

**Fix**: either (a) use a local `onChange` handler on each number input via a shared `useStripLeadingZeros` hook, or (b) add `:not([data-allow-leading-zero])` filtering, or (c) delete this entirely — modern browsers already handle most of the "007 → 7" concern via the `valueAsNumber` accessor.

---

#### P-08 — `DataProvider` mounts before routing, blocks everything

**Location**: `src/App.jsx:205–231`.

```jsx
<DataProvider user={user}>
  <BrowserRouter>
    ...
  </BrowserRouter>
</DataProvider>
```

`DataProvider.loadData` (`DataContext.jsx:55–86`) fires its 8 queries **on mount**, i.e. before the user sees any route. Total blocking time: max(8 parallel queries). On a cold tenant that's ~300–500 ms; on a 2-year tenant it's 1–3 s.

Half the data (invoices, therapy cycles, professionals, contacts) is not used by the dashboard route at all.

**Impact**: time-to-interactive on return visits is dominated by this, not by React hydration.

**Fix**:
1. Split `DataContext` into two providers: `CoreDataProvider` (clients + sessions + settings) loaded eagerly, and `ExtendedDataProvider` (invoices + therapy cycles + professionals + contacts) loaded per-route via `useEffect` in the pages that need them.
2. Or: wrap each query in its own route-owned React Query-style suspense boundary. Requires adding a data-fetching lib (not currently in scope).
3. Minimum viable: in `loadData`, prioritise clients+sessions+settings via a separate `Promise.all`, show the UI when those resolve, fire the other 5 in the background.

---

#### P-09 — `syncUser` hits the DB on every auth event including idle `INITIAL_SESSION`

**Location**: `src/App.jsx:65–106`, `App.jsx:132–155`.

On every `SIGNED_IN` or `INITIAL_SESSION`, the code:
1. `supabase.from('users').select('*').eq('email', authUser.email).maybeSingle()` (`:71–75`)
2. If exists: `supabase.from('users').update({...}).eq('id', existing.id).select().maybeSingle()` (`:80–88`)

Both fire unconditionally, without checking whether `meta.full_name` / `meta.avatar_url` actually changed.

`INITIAL_SESSION` fires on every tab open / refresh; Supabase Auth also refreshes tokens ~hourly and emits `SIGNED_IN`. For a user with the app open across 3 tabs, that's 6+ DB calls per hour just to confirm no metadata changed.

**Impact**: trivial today (small `users` table, light update), but stacks on top of the `loadData` fan-out (`DataContext.jsx:88` reacts to `user?.id`). If both run on every session event, each tab activation = 1 users-select + 1 users-update + 8 data loads = 10 round-trips.

**Fix**:
1. Early-return when `existing.name === (meta.full_name || meta.name)` and `existing.photo_url === (meta.avatar_url || meta.picture)`.
2. Skip the update on `INITIAL_SESSION` unless this is the first ever sign-in.

---

### Medium

#### P-10 — Render cascades on `sessions` + `clients` + `sessionRates`

**Location**: `src/context/DataContext.jsx:92–111`.

```js
const sessions = useMemo(() => {
  return rawSessions.map(adaptSession).map(s => {
    const now = new Date()
    const endTime = new Date(new Date(s.date).getTime() + (s.duration || 60) * 60000)
    const isCompleted = now >= endTime
    const client = clients?.find(c => c.id === s.clientId)
    ...
  })
}, [rawSessions, clients, sessionRates])
```

- The `useMemo` depends on `rawSessions`, `clients`, `sessionRates`.
- `clients` is itself a `useMemo` over `rawClients.map(adaptClient)` (`:91`) — identity changes whenever any client changes.
- Any tiny mutation (e.g. "toggle payment on one session") causes:
  1. `setRawSessions` → new `rawSessions` identity
  2. `sessions` memo re-runs: N rounds of `.map().map()` + per-session `clients.find(...)` — **quadratic in (sessions × clients)** when clients also changed
  3. Every consumer of `sessions` re-renders
  4. Every inline-style `style={{...}}` in those consumers emits a fresh object
- With `loadData` being called after every mutation (P-02), `rawSessions` **identity** changes on every click, regardless of whether any session actually differs. So the memo is effectively disabled.

**Impact**: on a 2 000-session tenant, each mutation triggers 2 000 × 100 = 200 000 find() comparisons before any paint. Modern JS does that in ~10 ms; noticeable on low-end devices.

**Fix**:
1. Fix P-02 first — stop re-creating `rawSessions` on every mutation.
2. Build a `Map` of clients by id once (`useMemo` over `clients`), then lookup by `get()` instead of `find()`. O(N) instead of O(N²).

#### P-11 — `<img>` avatars in `AdminPage` with no lazy loading or referrer policy

**Location**: `src/pages/AdminPage.jsx:132, 172` (admin row), plus any other user avatars not yet grepped.

```jsx
{a.photo_url && <img src={a.photo_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />}
```

- No `loading="lazy"` — above-fold and below-fold images fetch eagerly.
- No `referrerPolicy="no-referrer"` — Google Photos will sometimes 403 without this.
- At 100 therapists that's 100 HTTP GETs to `lh*.googleusercontent.com` on every admin page open.

**Impact**: admin-page load is N × image round-trips in addition to the `select` on `users`.

**Fix**: add `loading="lazy" referrerPolicy="no-referrer" decoding="async"` to all user-photo `<img>` tags. Consider pre-signing avatars via Supabase Storage if the Google URL stability is a concern (already seen in the CRA-app audit as a pattern).

#### P-12 — 1 376 inline `style={{…}}` objects across 42 files

**Location**: most pages and components. Offenders (count per file):

| File | inline styles |
|---|---|
| `ClientsPage.jsx` | 128 |
| `SessionDetailModal.jsx` | 112 |
| `ReseauProPage.jsx` | 104 |
| `EditIdentityModal.jsx` | 82 |
| `DashboardPage.jsx` | 74 |
| `SettingsPage.jsx` | 72 |
| `OnboardingWizard.jsx` | 65 |
| `HelpPage.jsx` | 62 |
| `LoginPage.jsx` | 57 |
| `ClientStatsPanel.jsx` | 46 |
| `ClientFinancialPanel.jsx` | 42 |
| `ClientTimelinePanel.jsx` | 39 |
| `DuplicateAlert.jsx` | 33 |
| `SessionCard.jsx` | 32 |
| `DeletedClientsPage.jsx` | 27 |
| all others | < 30 each |

Each `style={{…}}` literal creates a new object on every render. `SessionCard.jsx:293` is wrapped in `React.memo` but receives inline-style props from the parent — the memo bails out every render because prop identity changed.

**Impact**: real impact is mostly "React.memo doesn't work as expected". Rendering cost of inline styles themselves is negligible. More important as a **code-quality pattern** that compounds with P-10 (the render cascade).

**Fix**: extract common patterns to `index.css` classes. Keep truly dynamic values (conditional colors) in style; move static layout (flex, gap, padding) to CSS. Alternatively: lift style objects outside the component body (`const rowStyle = { ... }` at module level).

#### P-13 — `FinancesPage.jsx` aggregation runs on every render, not memoised

**Location**: `src/pages/FinancesPage.jsx:96–167`.

- `sessionsInMonth(m, y)` at line 96: invoked inside `monthlyStats(m, y)` at line 103.
- `monthlyStats` is called via `useMemo(currentStats)` (`:138`), `useMemo(prevStats)` (`:143`), and inside `chartData`'s `useMemo` loop (`:152`) — 12 times.
- But `yearStats(y)` / `monthlyBreakdown(y)` (`:219, 241`) are defined **inside the JSX render IIFE** (`:215`), so they aren't memoised at all. They run on every render of the page.
- Each `yearStats` does a full `sessions.filter(...)` (2 000 rows) + 5 more derived filters + 2 nested `.find/.sort/.filter` chains.
- Nested loop: `newClients` at `:229` does `sessions.filter(...).sort(...)` **inside a `.filter((cid) => …)`** — O(clients × sessions).

**Impact**: the page is cheap today but scales quadratically. At 100 clients × 2 000 sessions, each render does ~200 000 comparisons. Sluggish, especially on filter-bar clicks.

**Fix**: wrap `yearStats`, `monthlyBreakdown`, `sessionsInMonth` in `useMemo` keyed on `[sessions, year, month]`. Replace `clients.filter().sort()` with a pre-built Map.

#### P-14 — `ClientsPage.jsx` filter/sort/find pipeline on every render

**Location**: `src/pages/ClientsPage.jsx:82–135`.

- `activeClients = clients.filter(c => !c.deleted)` at `:82` — every render.
- `sessionsByClient` built by `sessions.forEach(...)` at `:89` — rebuilt every render.
- `getNextSession(clientId)` at `:96` does `s.future.sort(...)` — called inside `.map()` during JSX render; O(N log N) per row rendered.
- `filtered` at `:107` chains `.filter().filter()` on every render.
- Inside the card `.map()`, each card runs another `sessions.filter(s => s.clientId === client.id && s.status !== 'cancelled')` at `:290`, plus a phase-by-phase count loop.

At 100 clients × 2 000 sessions: ~200 000 comparisons **per render**, plus 100 sort calls on `s.future`. React re-renders this entire thing on any state change in the page (search query, filter tab, sort mode).

**Fix**: `useMemo` around the pipeline. Pre-build `sessionsByClient` as a Map keyed by `clientId`. Move the per-card phase counts to a `useMemo` keyed by `[sessions, therapyPhasesData]`.

#### P-15 — `ClientDetailPage` recomputes derived data on every render without memo

**Location**: `src/pages/ClientDetailPage.jsx:122–165`.

- `sessions` at `:122` does `allSessions.filter(...).map(...).sort(...)` — not memoised. Runs on every render. At 2 000 sessions in `allSessions` and a moderately used client this is cheap, but for a heavy client it becomes N × filter iterations.
- `sortedSessions` at `:136` — another `.filter().sort()` per render.
- `sessionNumbers` at `:137`: forEach loop computing cycle numbers — rebuilt every render.
- `pastSessions`/`futureSessions` at `:162–163` — two more filters.
- `nextSessionDate` / `lastSessionDate` — further sort calls.

`useMemo` is applied to `sanitizedClientLinks` and `therapyCycles` (`:43–52`) and `[completedCount, reportsCount, pendingReportsCount]` (`:149`) — but not to the session pipeline.

**Fix**: wrap the derived session arrays in `useMemo` with dependencies on `[allSessions, id, therapyCycles, activeCycle]`.

#### P-16 — No AbortController on async fetches inside `useEffect`

**Location**: throughout; `DataContext.loadData`, `AdminPage.fetchUsers`, etc.

No fetch is cancellable. Rapid navigation (click Dashboard → Admin → Dashboard) can produce out-of-order `setState` calls on an unmounted component. React will warn in dev; in prod it silently bloats memory with stale closures.

**Fix**: pass an `AbortSignal` through the Supabase client options where supported, or guard `setState` behind an `isMounted` ref.

---

### Low / Informational

#### P-17 — `index.css` at 1 484 lines is monolithic but small (~35 KB)

Ships on every page. Gzipped ~8 KB. Not urgent.

#### P-18 — Two memoised leaf components, no strategy for the rest

`ClientTypeBadge.jsx:89` and `SessionCard.jsx:293` use `React.memo`. None of the large per-row renderers (`ClientsPage` cards, `ClientTimelinePanel`, `ClientFinancialPanel`) are memoised. Given P-12 (inline styles), memoisation requires a concerted rework, not just adding `React.memo`.

#### P-19 — 20+ `setTimeout` calls as state-machine glue

Scattered across the codebase: `ClientDetailPage.jsx:109–115`, `useSessionModalState.js:38–49`, `SettingsPage.jsx:59`, `NotesModal.jsx:99, 126`, `SessionDetailModal.jsx:359`, `OnboardingWizard.jsx:21, 23`, `App.jsx:125` (10 s auth timeout), plus all the `onBlur={() => setTimeout(…, 200)}` patterns. Mostly for animation sequencing or for focus-management tricks. Brittle but currently benign.

#### P-20 — `App.jsx:125` hardcoded 10 s loading safety timeout

The timeout exists because the auth flow has no certain "done" signal. It works, but means a cold page load can hang for 10 seconds before the user sees the login screen if something upstream fails silently.

#### P-21 — `console.log` and `console.error` statements in production code

`AdminPage.jsx:13, 20, 24, 27` has always-on `console.log`. Many services log errors to console (good for dev, minor perf hit in prod). Not a blocker.

#### P-22 — No polling, no Realtime subscriptions (verified)

`Grep setInterval|channel\(|subscribe\(` returns only `setTimeout` (for animations and toasts) and `App.jsx:160` (`subscription.unsubscribe()` on auth channel only). No data polling — **good**; no data realtime — **bad**, given P-02. Product decision, not a defect, but worth flagging: the "reload everything after mutation" workaround is a symptom of not having a subscription layer.

#### P-23 — `dev_rls.sql` enables RLS on `users` without declaring a policy

Per `audit/live_schema/tables.md:110`, this blocks reads. `AdminPage.jsx:15` does `supabase.from('users').select(...)` — either the live DB has an undeclared policy, RLS is off, or admin reads are broken. **Cross-referenced from the security audit**; mentioned here because a broken admin read-path has a perf side effect (the page spins for 10 s then errors).

#### P-24 — StrictMode in `main.jsx:22` doubles renders in dev

Expected and correct. No action.

#### P-25 — No Web Worker for Excel export

`exportService.js:90` does `workbook.xlsx.writeBuffer()` on the main thread. For a client with 100 sessions this is ~50 ms; for a heavy client with 300 sessions + narrative reports, could be 500 ms of synchronous work. Acceptable for a single-user click action; move to a worker if UX ever feels sluggish.

---

## Quick Wins Table

Each entry: **effort** (person-hours), **expected impact** (perf dimension).

| # | Quick win | Effort | Expected impact |
|---|---|---|---|
| QW-1 | Dynamic-import `exceljs` at the Export button (`ClientDetailPage.jsx:241`) + remove `exceljs`/`file-saver` from the vendor bucket in `vite.config.js` | 1 h | -25–30 % initial JS size. Time-to-interactive improves visibly on mobile. [P-01] |
| QW-2 | Ship the 8 critical DB indexes as a new migration `YYYYMMDD_add_perf_indexes.sql` | 1 h | Eliminates sequential-scan risk at 2-year scale for `getSessions`, `getReports`, `getContacts`. No app changes required. [P-05] |
| QW-3 | Replace `loadData()` after single-row mutations with in-place state patches — start with `updateSession`, `updateClient`, `updateContact` (the three hottest mutations) | 2–3 h per method (incl. keeping alliance logic correct) | -80 % network egress per mutation. Sub-100 ms click-to-done latency instead of multi-second. [P-02] |
| QW-4 | Replace `getReports` join with `select('*').in('client_id', knownClientIds)` driven off `clients` | 0.5 h | -70 % of reports payload; removes one full-table cross-join. [P-03] |
| QW-5 | Replace `select('*')` with explicit column lists on `clients`, `sessions`, `reports` list paths | 2 h | -60–80 % payload on list screens; cuts JSONB serialisation cost. [P-04] |
| QW-6 | Add `loading="lazy" referrerPolicy="no-referrer"` to all `<img src={user.photo_url}>` tags | 0.2 h | Admin page TTFB down by N × avatar-fetch time. [P-11] |
| QW-7 | Memoise `ClientsPage` filter+sort pipeline + build `sessionsByClient` Map once via `useMemo` | 1 h | No user-visible effect today; eliminates a latent O(N²) at ~500 clients. [P-14] |
| QW-8 | Gate `syncUser` UPDATE on actual metadata diff; skip on `INITIAL_SESSION` if user row already exists with same values | 0.5 h | Eliminates ~6 DB calls/hour/tab at idle. [P-09] |
| QW-9 | Replace the alliance batch-delete `for … await` loop with one bulk `update().in('id', [...])` | 0.5 h | Batch-delete round-trips drops from 5+ to 1. [P-06] |
| QW-10 | Remove the global `document.addEventListener('input', …)` and add an `<NumberInput>` component or a simple `onBeforeInput` prop where needed | 2 h | Removes a document-wide listener; cleaner code; removes a subtle re-entrancy risk. [P-07] |

**Total quick-wins effort**: ~11–15 person-hours. Moves the risk score from **High** to **Medium** on its own.

---

## What's Done Well

- **Route-level code splitting**: `App.jsx:13–22` uses `React.lazy()` for every page. The CRA-app audit flags the _absence_ of this as a critical issue; coach-crm got it right from the start.
- **`Promise.all` in `loadData`**: `DataContext.jsx:59` parallelises the 8 initial queries. The problem is how often `loadData` is called (P-02), not how it fetches.
- **`useMemo` applied to light derivations in `DataContext`**: `sessionRates`, `recruitmentSources`, `therapyPhases`, `defaultTherapyConfig`, `invoiceBySessionId`. Good discipline.
- **Singleton Supabase client** (`src/lib/supabase.js`).
- **`upsertSettings` uses the correct local-state-update pattern** (`DataContext.jsx:299` — `setSettings(result)`). This is the model every other mutation should follow.
- **Error boundary at the app root**: `App.jsx:27–56`. Prevents white-screen crashes even if a page component throws.
- **10-second auth-loading safety timeout** (`App.jsx:125`). Prevents infinite spinner if OAuth hangs.
- **FK-style single-column indexes present**: `migration.sql:148–159` — `idx_clients_user_id`, `idx_sessions_user_id`, `idx_sessions_client_id`, `idx_sessions_date`, `idx_reports_session_id`, etc. Good starting point; just missing composites.
- **Lazy loading via `Suspense`** (`App.jsx:211–215`) with a spinner fallback. Correct pattern.
- **No `setInterval` polling anywhere** — avoids the classic notification-bell trap seen in the CRA-app audit (which polls every 60 s on every tab).

---

## Remediation Plan (prioritized)

### P0 — do before 10-user milestone (~6 person-hours)

1. **Ship the 8 critical indexes** as `supabase/migrations/YYYYMMDD_add_perf_indexes.sql`. [QW-2, P-05]
2. **Dynamic-import `exceljs`** from `ClientDetailPage.jsx` + fix `vite.config.js` to let it chunk separately. [QW-1, P-01]
3. **Patch `getReports`** to drop the cross-join and rely on client-id filter or RLS. [QW-4, P-03]
4. **Replace `select('*')`** with explicit column lists on `getClients`, `getSessions`, `getReports`. [QW-5, P-04]
5. **Gate `syncUser` UPDATE** on metadata diff. [QW-8, P-09]

### P1 — within 2 weeks of production roll-out (~10 person-hours)

6. **Stop refetching-everything on mutation**. Start with `updateSession`, `updateClient`, `updateContact` — use the returned row to patch local state. Leave `loadData` as a fallback for `deleteClient` cascade (which genuinely touches multiple tables). [QW-3, P-02]
7. **Bulk-update in alliance** batch delete. [QW-9, P-06]
8. **Memoise the ClientsPage + FinancesPage aggregation pipelines**. [QW-7, P-13, P-14]
9. **Add `loading="lazy"`** to avatar `<img>` tags. [QW-6, P-11]
10. **Build a `clientById` Map** in `DataContext` and expose it; use instead of `.find()` in `sessions` memo. [P-10]

### P2 — when pilot passes 30 users or 2 years of history (~15 person-hours)

11. **Introduce Supabase Realtime subscriptions** on `sessions`, `clients`, `reports` filtered by `user_id`. Replace remaining `loadData` calls with delta application. [P-02]
12. **Split `DataProvider` into core vs. extended** so the dashboard doesn't block on invoices/therapy-cycles/professionals. [P-08]
13. **Remove the global `input` listener** in `main.jsx`; replace with a local `<NumberInput>` component. [QW-10, P-07]
14. **Extract repeated inline styles** to `index.css` classes, starting with the top 5 files by style density. [P-12]
15. **Add `AbortController` to async fetches** to clean up on unmount. [P-16]

### P3 — nice-to-have

16. Consider `react-window` for `SessionCard` list on heavy clients (>100 sessions).
17. Web-Worker-ify `exceljs.writeBuffer` for users who export huge dossiers.
18. Remove stray `console.log` statements in `AdminPage.jsx` and services. [P-21]

---

## Conclusion

At its current 5-pilot scale the app runs fine; the 5 therapists will not notice most of what this audit describes. **But the performance posture has a single-point-of-failure shape**: every mutation triggers a full-tenant reload, so the "perf wall" scales exactly with the number of clients/sessions a therapist accumulates. The first heavy pilot user (say, 50 clients over 18 months) will start feeling the 2–3 s click latency well before the fleet reaches 30 therapists.

The good news is that the **P0 list is genuinely cheap** (~6 hours of work) and moves the risk from **High** to **Medium**. The P1 list (another ~10 hours) addresses the scalability bomb (`loadData` after every mutation) surgically — there is a clean fix pattern already demonstrated in `upsertSettings`, which just needs to be applied to the other 20 mutation methods.

The architectural choices are otherwise sound: React 19, lazy routes, singleton Supabase client, RLS per tenant, `useMemo` discipline in `DataContext`. What's missing is a discipline around (a) not reloading everything, (b) not selecting every column, and (c) adding composite indexes where the query shape demands them. None of these require architectural changes — just focused cleanup before the pilot expands.

_End of report._
