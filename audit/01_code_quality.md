# 01 — Code Quality, Architecture & Operational Readiness

*CoachCRM — pre-production audit*
*Date: 2026-04-21 · Branch: `main` · Commit: `dd1cef6` · Auditor scope: code quality, architecture, operational readiness only (see §02 for security, §03 for data/schema, etc.)*

---

## Executive Summary

- **Overall risk**: **High**
- **Production-ready**: **No — conditional on items C-01 through C-08 below.** The app is functionally thoughtful, clearly shaped by domain conversations with practitioners, and the top-level `GlobalErrorBoundary` plus React.lazy route splitting show the author knows what a mature SPA looks like. But it ships today with **no tests, no lint script, no CI, zero `aria-*` attributes across 13 868 JSX lines, a `DataContext` that refetches every row on every mutation, services that log-and-swallow every Supabase error, two hook-order violations of the project's own written rules, direct state mutation in production code paths that the project's own `MES_REGLES_TECHNIQUES.md` §2 forbids, and a `supabase/migration.sql` that is missing three of the tables the app queries every session**. For a SaaS that stores *French therapy health data* under RGPD, this is below baseline.
- **Top findings**:
  - **C-01**: `DataContext.loadData()` is called after **every** `updateX / createX / deleteX` — ~20 full-dataset refetches per bulk operation. `src/context/DataContext.jsx:166-439`. See §C-01.
  - **C-02**: `supabase/migration.sql` does not declare `therapy_cycles`, `invoices`, `invoice_sessions`, nor the `clients.client_links / external_referrer / deleted_at / session_rate / ai_synthesis / note_*` columns the app reads and writes every render. Rebuilding the DB from git is impossible. See §C-02.
  - **C-03**: No automated safety net at all — no `test` script, no `lint` script, no `.github/workflows/`, no `eslint.config.js`. `package.json` has three scripts: `dev`, `build`, `preview`.
  - **C-04**: Every service in `src/services/dataService.js` and `invoiceService.js` does `if (error) console.error(...)` and then returns `data || []` — **74 of the 77 Supabase calls swallow errors silently**. A failed write returns `null`, the caller treats it as success.
  - **C-05**: `OnboardingWizard.jsx:39,50` **mutates the imported `therapyPhases` and `recruitmentSources` arrays in place** via `.push(...)`. This violates the project's own `MES_REGLES_TECHNIQUES.md §2` ("Immuabilité — Ne JAMAIS muter l'état directement").
  - **C-06**: `SessionDetailModal.jsx:22-24` has the exact hook-order violation the project's own rules explicitly forbid — `if (!session) return null` sits before `useConfirm()` and `useData()`.
  - **C-07**: `docs/SETUP_GUIDE.md:62-63` commits the full live Supabase **anon JWT** to git in plaintext. Even though anon keys are "public", this freezes the project identity in history and is flagged here for cross-reference with §02 (security) and §06 (secret hygiene).
  - **C-08**: No `aria-*`, `role=`, or `aria-label` attribute anywhere — 0 matches across `src/**/*.jsx`. For a product targeted at accredited health-adjacent professionals in France, this is an RGAA / European Accessibility Act exposure.
  - **H-01 / H-02 / H-03**: Six files > 500 lines carry virtually all business logic (`ClientsPage.jsx` 1 160, `FinancesPage.jsx` 933, `SessionDetailModal.jsx` 905, `DashboardPage.jsx` 771, `EditIdentityModal.jsx` 767, `ReseauProPage.jsx` 622). 1 376 inline `style={{…}}` sites directly contradict `.agents/rules/doc.md §5` ("Interdiction de styles ad-hoc"). Helpers and constants duplicated across 5+ files.

---

## Scope & Methodology

**Scope.** Frontend source tree under `src/**` (57 files, 13 868 LOC), project-level hygiene (`package.json`, `vite.config.js`, `vercel.json`, `.gitignore`, `index.html`), operational posture (tests, lint, CI, envs, observability), and the `supabase/` migration files insofar as they are the contract the frontend depends on. Security, RLS policies, OAuth configuration, and data model correctness are covered in sibling reports (`02_security.md`, `03_data.md`) and are only referenced here when they directly affect code-quality findings.

**Method.** Read every file mentioned by finding, plus the full `src/context/`, `src/services/`, `src/data/`, `src/hooks/`, `src/App.jsx`, `src/main.jsx`, `src/lib/supabase.js`, and `supabase/migration.sql`. Ran mechanical greps for anti-patterns (`style={{`, `console.*`, `{false &&`, `useEffect`, `.single()` vs. `.maybeSingle()`, `window.confirm / alert / prompt`, `aria-*`, `PropTypes`, `Sentry/Rollbar/Datadog`, `ErrorBoundary / componentDidCatch`). Cross-checked the project's own `.agents/rules/doc.md`, `docs/MES_REGLES_TECHNIQUES.md`, `docs/MES_REGLES_METIER.md` against the code.

**Quantitative baseline.**

| Metric | Value |
|---|---|
| Total JSX/JS source lines | 13 868 across 57 files |
| Files > 500 lines | 10 |
| Files > 1 000 lines | 1 (`ClientsPage.jsx` — 1 160) |
| Largest single file | `ClientsPage.jsx` — 1 160 lines |
| Inline `style={{…}}` occurrences | **1 376** across 23 files |
| Top inline-style files | `FinancesPage.jsx` 161 · `ClientsPage.jsx` 128 · `SessionDetailModal.jsx` 112 · `ReseauProPage.jsx` 104 · `EditIdentityModal.jsx` 82 · `DashboardPage.jsx` 74 · `SettingsPage.jsx` 72 · `OnboardingWizard.jsx` 65 · `HelpPage.jsx` 62 · `LoginPage.jsx` 57 |
| `useEffect` occurrences | 16 |
| `console.*` occurrences | **75** across 9 files |
| Supabase calls (`supabase.from / auth / rpc / storage`) | **77** across 10 files |
| Explicit error handling (`if (error)`) | ~30 — mostly `console.error` and continue |
| `.single()` calls | 18 (services) |
| `.maybeSingle()` calls | 2 (App.jsx only) |
| `ErrorBoundary` / `componentDidCatch` | 1 (`GlobalErrorBoundary` in `App.jsx`) — single top-level, no per-route fallback |
| `PropTypes` / TypeScript | 0 |
| `aria-*` / `role=` | **0** across `src/**/*.jsx` |
| Test files | 0 |
| Test runner | not configured |
| Lint `npm` script | not defined |
| `eslint.config.js` | **does not exist** |
| CI workflows | **0** (`.github/` does not exist) |
| Sentry / Rollbar / Datadog / Bugsnag | 0 dependencies |
| Runtime deps (`package.json`) | 7 (react, react-dom, react-router-dom, @supabase/supabase-js, lucide-react, exceljs, file-saver) |
| Dev deps | 2 (`@vitejs/plugin-react`, `vite`) |
| Business-rule docs | `MES_REGLES_METIER.md` 617 lines · `MES_REGLES_TECHNIQUES.md` 231 lines · `MON_ARCHITECTURE_DONNEES.md` 297 lines · `MA_CHARTE_GRAPHIQUE.md` 1 060 lines |

---

## Findings

### Critical (must fix before production)

#### C-01: `DataContext.loadData()` refetches every dataset after every CRUD — O(n) writes amplified to O(n²) network

- **Location**: `src/context/DataContext.jsx:166-439` — every one of 20 mutation helpers ends with `if (result) await loadData()`. Confirmed call sites:
  - `updateClient:169`, `createClient:185`, `deleteClient:197`
  - `updateSession:223`, `createSession:241`, `deleteSession:271`, `deleteSessions:287`
  - `createContact:253`, `updateContact:258`, `deleteContact:263`
  - `createProfessional:309`, `updateProfessional:319`, `deleteProfessional:329`, `deleteProfessionals:340`
  - `createTherapyCycle:352`, `updateTherapyCycle:372`, `deleteTherapyCycle:362`
  - `createInvoice:383`, `updateInvoice:393`, `emitInvoice:403`, `unemitInvoice:413`, `deleteInvoice:423`, `setInvoiceSessions:433`
- `loadData()` itself (line 55-86) fires **eight parallel queries**: `getClients`, `getSessions`, `getReports`, `getSettings`, `getProfessionals`, `getContacts`, `getTherapyCycles`, `getInvoices`. Every single update re-downloads the therapist's entire working dataset.
- **Amplification**: a real-world bulk action makes this painful.
  - `DeletedClientsPage.jsx:47-49` — `for (const id of selected) { await deleteClient(id) }` → N sequential round-trips + **N × 8 queries** of refetch. Selecting 10 clients to purge runs 80 queries.
  - `ClientsPage.jsx:518-520` — same pattern, bulk archive via `for (const id of selected) { await updateClient(id, { deletedAt: ... }) }`.
- **Risk**: At current scale (a single therapist, ~200 clients) this is invisible. At the "V2 multi-therapist clinic" the docs hint at, it breaks. More concretely, **it also hides bugs** — every failed write is papered over by the next successful refetch showing the pre-write state, and the caller never knows the write failed (compounds C-04).
- **Recommendation**: Replace `await loadData()` with **optimistic local state updates**. Each mutation already returns the updated row from `.select().single()`. Pattern:
  ```js
  updateClient: async (id, updates) => {
    const result = await ds.updateClient(id, unadaptClient(updates))
    if (!result) { showToast('Erreur', 'error'); return null }
    setRawClients(prev => prev.map(c => c.id === id ? result : c))
    return result
  }
  ```
  For deletions: `setRawClients(prev => prev.filter(c => c.id !== id))`. For bulk operations, single setState at end. Keep `refreshData: loadData` exposed as a manual escape hatch. This is a one-afternoon refactor and is essentially a prerequisite for multi-user deployment.

---

#### C-02: `supabase/migration.sql` is stale — `therapy_cycles`, `invoices`, `invoice_sessions` are not declared anywhere in git

- **Location**: `supabase/migration.sql:1-183` declares only nine tables: `users`, `clients`, `sessions`, `reports`, `contacts`, `professionals`, `client_links`, `professional_referrals`, `settings`. Yet:
  - `src/data/adapters.js:60-70` has `adaptTherapyCycle` reading `client_id`, `user_id`, `start_date`, `total_sessions`.
  - `src/services/dataService.js:168-206` implements full CRUD on `therapy_cycles`.
  - `src/services/invoiceService.js:10-152` implements full CRUD on `invoices` and its join table `invoice_sessions`.
  - `src/context/DataContext.jsx:67` calls `invService.getInvoices` on every page load.
- Additionally, `migration.sql` does not declare these **columns** that the code reads/writes on `clients`:
  - `billing_address`, `client_links` (JSONB), `external_referrer` (JSONB), `deleted_at`, `session_rate`, `session_frequency`, `ai_synthesis`, `note_dynamique`, `note_axes`, `note_vigilance`, `note_objectifs` — all in `adapters.js:29-58`.
- **Risk**:
  1. A fresh `supabase db reset` → `psql -f migration.sql` gives a non-working app. "It works on my machine" is the only functioning environment.
  2. RLS policies for the missing tables do not exist in version control — so the security guarantee of `CREATE POLICY "Users can view own…"` is not auditable for `therapy_cycles`, `invoices`, `invoice_sessions`.
  3. A disaster-recovery restore to a new Supabase project would silently drop therapy-cycle and invoice functionality.
- See also `audit/live_schema/tables.md` (this audit's schema snapshot) for the full diff.
- **Recommendation**: Export the live DDL of the three missing tables and their RLS policies from Supabase (`pg_dump --schema-only` or the dashboard) and commit as `supabase/002_therapy_cycles_invoices.sql`. Add a pre-commit smoke test that `psql -f migration.sql -f 002_*.sql` against an empty DB succeeds and `npm run build` passes. Adopt a numbered-migration convention (`001_init.sql`, `002_…`) and delete or rewrite the loose patch files (`add_family_type.sql`, `remove_completed_status.sql`, `update_roles.sql`, `dev_rls.sql`, `transfer_data.sql`) which have unclear apply-order semantics. Cross-reference: see §03 Data for the full inventory of schema drift.

---

#### C-03: No tests, no lint script, no CI — safety net is zero

- **Location**:
  - `package.json:8-12` — scripts block is `{ "dev": "vite", "build": "vite build", "preview": "vite preview" }`. No `lint`, `test`, `typecheck`, `format`.
  - Neither `/home/zamolxes/devs/coach-crm/eslint.config.js` nor any `.eslintrc*` exists.
  - `/home/zamolxes/devs/coach-crm/.github/` does not exist.
  - `git ls-files | grep -E "\\.(test|spec)\\."` returns nothing.
- **Risk**: The app performs **financial calculations** (CA realized / expected / collected in `FinancesPage.jsx:102-136`), **alliance-therapy state transitions** (`allianceService.js:53-127` auto-promotes/demotes prospects ↔ clients based on payment method and session status), **duplicate detection with Levenshtein fuzzy matching** (`utils/duplicateUtils.js:49-108`), and **session-number numbering per therapy cycle** (`ClientDetailPage.jsx:137-145`). None of these are tested. Any of them can silently change under refactor (for example: `isAllianceValidated`, line 13, hard-codes the free-session threshold at `effectiveAmount === 0` — a cent-off drift would demote a paying client back to prospect without notice).
- For a product that computes billable CA on live customer data and drives the "prospect → client" state the whole app is organised around, this is below baseline.
- **Recommendation**:
  1. Add `vitest` (native Vite integration, zero config). Start with the pure functions that are trivially testable and high-stakes: `allianceService.isAllianceValidated`, `allianceService.checkAllianceTransition`, `allianceService.checkAllianceAfterBatchDelete`, `sponsorshipService.validateSponsorship`, `duplicateUtils.levenshtein`, `duplicateUtils.findDuplicateClients`, `data/helpers.getClientName`, `data/helpers.getComputedStatus`, `data/adapters.*`, `FinancesPage.monthlyStats`. Target ~40 tests before go-live.
  2. Add ESLint with `@eslint/js` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`. Wire `npm run lint` and make it exit-1 on `no-undef`, `react-hooks/exhaustive-deps`, `no-unused-vars`.
  3. Add `.github/workflows/ci.yml`: on push/PR run `npm ci && npm run lint && npm run build && npm test`. Protect `main` in GitHub: require PR + passing checks. Enable Vercel preview deployments (they're free on the Hobby plan).
  4. Add `npm audit --production` to CI.

---

#### C-04: Silent-failure services — 74 of 77 Supabase calls log-and-continue

- **Location**:
  - `src/services/dataService.js:6-331` — every single exported function (getCurrentUser, upsertUser, getClients, createClient, updateClient, deleteClient, getSessions, createSession, updateSession, deleteSession, deleteSessions, getReports, createReport, getTherapyCycles, createTherapyCycle, updateTherapyCycle, deleteTherapyCycle, getContacts, createContact, updateContact, deleteContact, getSettings, upsertSettings, getProfessionals, createProfessional, updateProfessional, deleteProfessional, deleteProfessionals) follows the identical pattern:
    ```js
    const { data, error } = await supabase.from('x').<op>(…).select().single()
    if (error) console.error('…error:', error.message)
    return data
    ```
    Caller gets `null` on error with no way to distinguish from "no data". Example: `dataService.js:59-68` (`updateClient`).
  - `src/services/invoiceService.js:10-152` — same pattern, 14 calls.
- **`DataContext.jsx:166-439` compounds this**: the wrappers do `try/catch` and `showToast('Erreur...', 'error')` — but the service never throws, so the catch never fires. The toast is dead code. The user sees nothing, the write silently failed, and (C-01) `loadData()` refetches and restores the pre-write UI state — making the bug invisible.
- **Concrete path to data loss**:
  1. User edits a client. `updateClient` call hits RLS, returns `{error: "permission denied"}`.
  2. Service logs to console, returns `null`.
  3. `DataContext.updateClient` line 168 — `const result = await ds.updateClient(...)`. Result is `null`.
  4. Line 169: `if (result) await loadData()` — falsy, no refetch.
  5. No toast fires (no exception thrown).
  6. UI retains the user's edited state locally, nothing hit the DB, user navigates away, edit lost.
- **Risk**: For a therapy CRM this is a data-integrity red flag. This is exactly the failure mode the project's own `MES_REGLES_TECHNIQUES.md §4` forbids ("Blocage sur Erreur : Si la base de données renvoie une erreur, l'interface DOIT rester ouverte ou afficher une alerte bloquante").
- **Recommendation**: Rewrite the services to throw:
  ```js
  export async function updateClient(clientId, updates) {
    const { data, error } = await supabase.from('clients').update({...updates, updated_at: new Date().toISOString()})
      .eq('id', clientId).select().single()
    if (error) throw new Error(`updateClient: ${error.message}`)
    return data
  }
  ```
  The `DataContext` try/catch wrappers (e.g. `:171-174`) then actually run and fire `showToast`. Apply to all 77 call sites — a one-day mechanical refactor. Bonus: remove C-04 dead code and un-break the toast UX.

---

#### C-05: `OnboardingWizard.jsx` mutates imported constants in place — violates project's own rules

- **Location**: `src/components/OnboardingWizard.jsx:34-53`
  ```js
  const addPhase = () => {
    const label = newPhaseLabel.trim()
    if (!label) return
    const key = label.toLowerCase().…
    if (therapyPhases.some(p => p.key === key)) return
    therapyPhases.push({ key, label, color: newPhaseColor, bg: newPhaseColor + '18' })  // line 39
    setNewPhaseLabel('')
    setNewPhaseColor('#718096')
    setPhasesVersion(n => n + 1)
  }

  const addSource = () => {
    …
    recruitmentSources.push({ key, label })  // line 50
    setNewSourceLabel('')
    setSourcesVersion(n => n + 1)
  }
  ```
  Both `therapyPhases` and `recruitmentSources` are imported from `src/data/constants.js:5, 23` as `export const` arrays. The wizard mutates the shared module-level reference directly.
- The `setPhasesVersion(n => n + 1)` / `setSourcesVersion(n => n + 1)` state bumps reveal this is intentional — the author knows React won't re-render because the array reference did not change, and uses a version counter as a workaround. That workaround confirms the anti-pattern.
- **Risk**:
  1. Hot-module reload does not reset the mutations — reloading the wizard shows the old +1 user-added phase/source forever until full page refresh.
  2. Any other component importing `therapyPhases` (`DataContext.jsx:10`, `SettingsPage.jsx:3`, `ClientsPage.jsx:20`) sees the mutation retroactively — not a bug today because `therapyPhases` is merged with `settings.therapy_phases` in `DataContext:51`, but a latent hazard.
  3. `MES_REGLES_TECHNIQUES.md §2` says verbatim: "*Immuabilité : Ne JAMAIS muter l'état directement. Utiliser systématiquement le pattern de spread `[...prev]` ou `{...prev}`.*" This is a direct rule violation in a file the rule-writers should have been able to grep.
- **Recommendation**: Convert to local component state. `const [draftPhases, setDraftPhases] = useState(therapyPhases)` at the top, then `setDraftPhases(prev => [...prev, { key, label, ... }])`. On final submit, persist via `upsertSettings({ therapy_phases: draftPhases })`. Delete the `phasesVersion` / `sourcesVersion` counters.

---

#### C-06: `SessionDetailModal.jsx:22-24` — hook-order violation, explicitly forbidden by the project's own `MES_REGLES_TECHNIQUES.md §7`

- **Location**: `src/components/client/SessionDetailModal.jsx:22-24`
  ```js
  export default function SessionDetailModal({ session, client, ... }) {
    if (!session) return null                                         // line 22
    const confirm = useConfirm()                                      // line 23
    const { getInvoiceForSession, createInvoice, updateInvoice: updateInv,
            emitInvoice, unemitInvoice, deleteInvoice,
            setInvoiceSessions, sessions: allSessions } = useData()   // line 24
    ...
  }
  ```
- `MES_REGLES_TECHNIQUES.md §7` says: *"Règle d'or sur l'ordre des Hooks — Pour éviter les crashes de type « Rendered more hooks than during the previous render », il est strictement interdit de placer un retour anticipé (`if (!data) return ...`) avant la déclaration de TOUS les hooks du composant".*
- **Risk**: If `session` is ever non-null on first render and null on a subsequent render (e.g. after a delete), React throws `Rendered fewer hooks than during the previous render` and the whole modal tree bricks. Today the modal only mounts when `session` is already set (driven by `expandedSessionId`), so it's latent — but any refactor that passes an optional session via props surfaces the bug immediately.
- Similar latent pattern in `ClientDetailPage.jsx:156` — `if (!client) return` sits after all declared hooks, which is *allowed* by the rule; however `activeCycle.id` is referenced on line 148 without optional chaining and will crash if `therapyCycles` ever returns `[]` (it currently can't, but the guardrail is missing).
- **Recommendation**: Move hook calls above the early return:
  ```js
  export default function SessionDetailModal({ session, ... }) {
    const confirm = useConfirm()
    const { getInvoiceForSession, ... } = useData()
    if (!session) return null
    …
  }
  ```
  Once C-03's lint step is live, `react-hooks/rules-of-hooks` catches this automatically.

---

#### C-07: Supabase anon JWT committed in `docs/SETUP_GUIDE.md`

- **Location**: `docs/SETUP_GUIDE.md:62-63` — the full `VITE_SUPABASE_URL` (`https://ncjdvohafipisjcslrkk.supabase.co`) and `VITE_SUPABASE_ANON_KEY` JWT (valid `iat: 1774193763` / `exp: 2089769763`, i.e. **until 2036**) are hard-coded in a committed markdown file. Additionally `docs/SETUP_GUIDE.md:77-79` publishes the Supabase **project ID**, **region**, and the **DB host** FQDN.
- **Risk**: The anon key is technically a public token (it ships in every bundle). But committing it to markdown has three concrete downsides:
  1. It permanently ties the project to this repo's history — rotating the Supabase JWT secret means rewriting git history or leaving the old key in the graph forever. This is now an operational liability the moment the repo goes public or is shared.
  2. It publishes the project-ref, which simplifies targeted attacks on RLS (an attacker can test every table for missing policies without having to register).
  3. It normalises committing secrets in prose files. The day someone adds a **service-role key** to the same doc the compromise is permanent.
- See §02 Security S-01 (duplicate cross-reference).
- **Recommendation**: `git rm docs/SETUP_GUIDE.md` and rewrite as a template using `<YOUR_SUPABASE_URL>` / `<YOUR_ANON_KEY>` placeholders. Cross-ref §02 for rotation plan. Add `pattern: "eyJhbGci"` to a pre-commit secret-scan hook (e.g. `gitleaks`).

---

#### C-08: Zero accessibility — 0 `aria-*`, 0 `role=`, 0 labels on icon-only buttons

- **Location**: grep across `src/**/*.jsx` for `aria-` or `role=` returns zero matches. The sidebar logout button (`Sidebar.jsx:126-132`), the sidebar navigation icons (`Sidebar.jsx:32-43`), the toast close button (`ToastContext.jsx:72-80`), the modal close buttons in every modal, the urgency-action cards in `DashboardPage`, all the `<button><Icon /></button>` patterns in the clients/sessions/finance pages are **unannounced** to screen readers.
- For a product aimed at *French accredited therapists* serving patients who may include people with visual impairment, this carries direct RGAA (French accessibility law, transposition of EN 301 549) and European Accessibility Act (EAA, applies to B2C digital services from 2025-06-28) exposure.
- **Risk**: Non-technical but regulatory. An accessibility complaint to the *Défenseur des Droits* or a DDA (dispositif d'accessibilité) audit would produce an immediate finding for a product at this level of inline-style + icon-button density.
- **Recommendation**:
  1. Add `aria-label` to every `<button>` that contains only an Icon. A focused pass from the top: `Sidebar`, `Layout`, `LoginPage` Google button (already has text), toast close, all modal close buttons, urgency cards (`UrgencyCard.jsx`), `AddSessionButton`, `NewClientButton`.
  2. `aria-live="polite"` on the `ToastContext.jsx:47` container so screen-readers announce new toasts.
  3. `role="dialog"` + `aria-modal="true"` + `aria-labelledby` on the `confirm-dialog` in `ConfirmContext.jsx:29`.
  4. `role="alert"` on the `createError` banner in `ClientsPage.jsx:1140` area and the `LoginPage.jsx:188-203` error blocks.
  5. Fix colour-contrast violations in `LoginPage.jsx` — white-on-dark at `color: 'rgba(255,255,255,0.3)'` (line 112) fails WCAG AA.
  6. Long-term, add `eslint-plugin-jsx-a11y` to the ESLint config from C-03.

---

### High

#### H-01: Mega-pages carry all logic — 6 files > 500 lines, no shared data hooks

- **Location**:
  - `src/pages/ClientsPage.jsx` — 1 160 lines, 128 inline styles
  - `src/pages/FinancesPage.jsx` — 933 lines, 161 inline styles (largest inline-style concentration in the codebase)
  - `src/components/client/SessionDetailModal.jsx` — 905 lines, 112 inline styles
  - `src/pages/DashboardPage.jsx` — 771 lines, 74 inline styles
  - `src/components/client/EditIdentityModal.jsx` — 767 lines, 82 inline styles
  - `src/pages/ReseauProPage.jsx` — 622 lines, 104 inline styles
  - `src/pages/SettingsPage.jsx` — 569 lines, 72 inline styles
  - `src/pages/ClientDetailPage.jsx` — 512 lines, plus delegates to 8+ panel components (~2 000 more lines collectively)
- `ClientsPage.jsx` alone destructures **28 values** from `useData()` in one line (`:20`) and declares 26 `useState`s in the first 50 lines. No extracted hooks (`useClients`, `useFilteredClients`, `useNewClientDraft`) — every page reinvents filtering, sorting, paging, bulk-selection.
- `DashboardPage.jsx:20` destructures 30+ values from `useData()` on a single line.
- `FinancesPage.jsx:102-136` declares `monthlyStats`, `yearStats`, `sessionsInMonth`, `getDefaultRate` inline as closures — never memoised, rebuilt on every render. Line 138's `useMemo` depends on `[selectedMonth, selectedYear, sessions]` but captures `clients`, `sessionRates`, `getDefaultRate` from closure with no dep declared.
- **Risk**: The top-level risk is **cost of change**. Every feature branch touches one of the mega-files, triggers a 1 000-line diff, and the reviewer has no separate unit to reason about. Performance also degrades: `FinancesPage.monthlyStats` iterates every session 12 times (one per month in the rolling chart at `:146-156`) and is not memoised — fine at 500 sessions, measurable at 5 000.
- **Recommendation**: Mechanical, incremental, one-PR-per-extraction:
  1. Pull data hooks first (zero risk): `useClients()`, `useSessions()`, `useMonthlyStats(month, year)`, `useInvoiceForClient(clientId)` — thin wrappers around `useData()` with local `useMemo`. Each is < 30 lines.
  2. Extract filter state: `useClientsFilters()` owns `search`, `sortMode`, `activeTab`, `statusFilter`, `viewMode` in `ClientsPage`.
  3. Break `SessionDetailModal` into `SessionHeader`, `SessionPayment`, `SessionReport`, `SessionInvoicing` sub-components.
  4. Break `FinancesPage` into `FinancesChart`, `FinancesAlerts`, `FinancesMonthlyTable`, `FinancesYearlyRollup`.
  5. Target: no file > 800 lines within two months. Do not go below 300 lines — there is genuine co-location value, don't over-extract.

---

#### H-02: 1 376 inline `style={{…}}` sites — violates `.agents/rules/doc.md §5` verbatim

- **Location** (top 10 offenders):
  - `FinancesPage.jsx` — 161
  - `ClientsPage.jsx` — 128
  - `SessionDetailModal.jsx` — 112
  - `ReseauProPage.jsx` — 104
  - `EditIdentityModal.jsx` — 82
  - `DashboardPage.jsx` — 74
  - `SettingsPage.jsx` — 72
  - `OnboardingWizard.jsx` — 65
  - `HelpPage.jsx` — 62
  - `LoginPage.jsx` — 57
- `.agents/rules/doc.md §5` says literally: *"Interdiction de styles ad-hoc : ne jamais utiliser de valeurs de couleurs, de marges, ou de polices arbitraires dans le CSS. […] Utilisation des variables globales : prioriser systématiquement les CSS variables du projet (ex: `var(--primary-500)`, `var(--space-md)`, `var(--radius-md)`)."* The same file (§5 last paragraph) makes it an **absolute commit rule**: *"Ne jamais committer un changement visuel ou graphique de l'interface sans avoir mis à jour `/docs/MA_CHARTE_GRAPHIQUE.md`."*
- Many inline styles are hard-coded hex values bypassing the CSS-variable system entirely:
  - `LoginPage.jsx:40-54` — `#1A2332`, `#0F1923`, `#162133`, `#DAA520`, `rgba(218,165,32,0.06)` — at least 25 magic colours, none from `var(--…)`.
  - `DashboardPage.jsx:127` — `gridTemplateColumns: '65% 35%'` hard-coded layout.
  - `AdminPage.jsx:86, 95` — `#F0FFF4`, `#38A169` for success-green duplicated from `constants.js:7-10` and `index.css`.
  - The 4 phase colours (`#2B6CB0`, `#E67E22`, `#276749`, `#6B46C1`) appear hard-coded in 19 files (grep evidence) despite being declared once in `data/constants.js:5-10` and merged into `DataContext.phaseColors` (`:132-138`). The declared single-source-of-truth is routinely bypassed.
- **Risk**: Any theme change (dark mode, re-brand, higher-contrast for accessibility — see C-08) becomes a 1 000-file find-and-replace. The charter explicitly points at this and it is being ignored.
- **Recommendation**: Adopt a **ratchet**:
  1. Add to future ESLint config: `react/forbid-dom-props: ["error", { forbid: [{ propName: "style", message: "Use a CSS class (see docs/MA_CHARTE_GRAPHIQUE.md)." }] }]` — but scoped to new files only via `overrides`, so existing files don't block the build.
  2. Each sprint, port one pattern to `index.css`: `.stat-banner`, `.page-toolbar`, `.decorative-circle`, `.confirm-dialog-brand`, `.trust-signals`, etc.
  3. Port the 4 hard-coded phase colours first (they are semantic). Then the 4 client-type colours. Then the purple-scale for `prospectStages`.
  4. Target: < 400 inline-style sites within two months. A `grep -c "style={{"` budget in CI would anchor this.

---

#### H-03: `useEffect` dependency drift — 3 confirmed stale-closure bugs

- **Location**:
  - `ClientsPage.jsx:56-80` — `useEffect(() => { if (searchParams.get('newClient') === '1') setShowModal(true); ...; setActiveTab(tabParam); ... }, [searchParams])`. Declares dep `[searchParams]` but reads `setActiveTab`, `setViewMode`, `setNewSource`, `setExternalReferrer`, `setShowModal`. Setters are stable, so no bug **today**, but the pattern cannot pass a strict `react-hooks/exhaustive-deps` rule.
  - `FinancesPage.jsx:138` — `useMemo(() => monthlyStats(selectedMonth, selectedYear), [selectedMonth, selectedYear, sessions])` **misses `clients`, `sessionRates`, `getDefaultRate`**. `monthlyStats` closes over all three (line 110-113). Change the settings `session_rates` and the finance chart shows stale amounts until a month is re-picked.
  - `FinancesPage.jsx:146` — `useMemo(() => chartData-building, [objectifCA, sessions])` — same pattern; missing `clients`, `sessionRates`, `now` (closes over a top-level `new Date()` captured at first render → rolling chart window does not roll after midnight).
  - `FinancesPage.jsx:161` — `useMemo(() => { const isActuallyBillable = ...; const unpaid = sessions.filter(...); ... }, [sessions])` — reads `getInvoiceForSession` from closure, not declared.
  - `ClientDetailPage.jsx:98-100` — `useEffect(() => { if (editingTotal && totalInputRef.current) totalInputRef.current.focus() }, [editingTotal])`. `editingTotal` is never declared anywhere in the file (confirmed by grep in this audit — returns 0 matches). The effect never runs → feature silently dead. Cross-ref with C-03 ESLint `no-undef`, which would catch this on CI day 1.
  - `App.jsx:126` — `if (mounted && loading) setLoading(false)` inside the 10 s safety-timeout closure reads `loading` from the closure at mount time (always `true`), not the live state. Harmless today; brittle if behaviour changes.
- **Risk**: Stale state in a finance tool computing billable CA is exactly the kind of bug users only notice months later when they reconcile their books. `ClientDetailPage:99` is definitely broken — `editingTotal` does not exist.
- **Recommendation**: Enable `react-hooks/exhaustive-deps: "error"` in the ESLint config from C-03, and **do not allow `// eslint-disable-next-line` overrides without a justifying comment**. Fix each site:
  - `FinancesPage.monthlyStats` → extract as `useCallback` depending on `[clients, sessionRates, sessions]` and add it to the `useMemo` deps. Or better: pull the pure reduction out of the component entirely.
  - `ClientDetailPage:99` → delete the dead effect or wire up the missing `[editingTotal, setEditingTotal] = useState(false)`.
  - `App.jsx:125-128` → use a ref `initializedRef.current` instead of reading `loading` from closure.

---

#### H-04: Direct state mutation in `DeletedClientsPage.jsx:17-18` — violates `MES_REGLES_TECHNIQUES.md §2` verbatim

- **Location**: `src/pages/DeletedClientsPage.jsx:16-23`
  ```js
  const handleRestore = async (client) => {
    client.deleted = false       // line 17 — direct mutation of React state
    client.deletedAt = null      // line 18
    if (updateClient) {
      await updateClient(client.id, { deletedAt: null })
    }
    setSelected(prev => { ... })
  }
  ```
  `client` is an element of `clients` from `useData()`, which traces to `rawClients` state in `DataContext.jsx:29`. Mutating `client.deleted` changes the reference's content but not its identity, so React **does not re-render** — except that the subsequent `await updateClient(...)` triggers `loadData()` (C-01) which rebuilds the whole array and fixes the UI accidentally. Remove C-01 and this page breaks.
- `MES_REGLES_TECHNIQUES.md §2` says verbatim: *"Immuabilité : Ne JAMAIS muter l'état directement."*
- Very similar direct-mutation patterns appear in `sponsorshipService.js:58-69` (`client.clientLinks.push(...)`, `referrer.clientLinks.push(...)`) and `:86` (`client.clientLinks = client.clientLinks.filter(...)`). The service is called from the UI (`createSponsorshipLink`, `removeSponsorshipLink`, `clearSponsorshipOnSourceChange`) and mutates the `client` object passed in — still alive as a reference in `rawClients`.
- **Risk**: Hidden coupling to C-01 behaviour. Fixing C-01 surfaces these bugs. Today they're masked.
- **Recommendation**:
  - `DeletedClientsPage.handleRestore` → drop lines 17-18. Rely on the `updateClient` response + optimistic `setRawClients` update once C-01 is fixed.
  - `sponsorshipService` → return *new* client/referrer objects from the validation/creation functions and let the caller push them through `updateClient`. No mutation of `client.clientLinks` on the in-memory reference.

---

#### H-05: Duplicated helpers and constants across 4–8 files

- **Location** (confirmed by grep in this audit):
  - **Phase colours** (`#2B6CB0`, `#E67E22`, `#276749`, `#6B46C1`) — declared in `data/constants.js:5-10`, re-declared in `DataContext.jsx:132-138`, and hard-coded inline in at least **19 other files** including `ClientsPage.jsx`, `DashboardPage.jsx`, `FinancesPage.jsx`, `SessionCard.jsx`, `ClientStatsPanel.jsx`, `ClientTimelinePanel.jsx`, `EditIdentityModal.jsx`, `SessionDetailModal.jsx`, `DuplicateAlert.jsx`.
  - **`MONTHS_FR`** array — declared in `data/helpers.js`-equivalent usage and then **re-declared in `FinancesPage.jsx:75`**. Inline re-declaration in a 933-line file the author probably forgot about.
  - **Session rates** — `constants.js:31-34` (`{ client: 75, individual: 60 }`) is the nominal source of truth; `getDefaultRate` is re-implemented in `FinancesPage.jsx:21-25` with its own fallback logic (`75` hard-coded at line 23 instead of using `sessionRates.client`).
  - **Client-type labels** (`'Individuel'`, `'Couple'`, `'Famille'`) — `constants.js:36-40` declares a map, but re-hardcoded inline in `ClientsPage.jsx`, `DeletedClientsPage.jsx:61-65`, `DuplicateAlert.jsx`, `ClientHeaderPanel.jsx`, `ClientTypeBadge.jsx`, `EditIdentityModal.jsx`, `FinancesPage.jsx`. Eight files.
  - **`getClientType`** — exists in `data/helpers.js:55-63` (context), but `FinancesPage.jsx:39-46` re-declares a slightly different version (*"couple"* vs *"client"* as return key). These two functions diverge: `helpers.getClientType` returns `'client'` for couples, `FinancesPage.getClientType` returns `'couple'`. Any downstream consumer mixing them gets subtle display bugs.
  - **`getClientNameByContext`** in `FinancesPage.jsx:33-37` shadows the imported `getClientName` from `data/helpers` (line 11). The file imports both the helper *and* re-wraps it; arbitrary which one is called where.
  - **`AbsenceDash`** component — `FinancesPage.jsx:13-17`. Probably wanted elsewhere too but stays local.
  - **Date formatting** — `formatDate` exists three times: `data/helpers.js:80-85` (full French long-form), `FinancesPage.jsx:64-73` (short `'dd MMM'` only), `AdminPage.jsx:39-48` (bare `toLocaleDateString('fr-FR')`). Three shapes for the same concept.
- **Risk**: Classic drift path. When the phase colour gets re-tuned (already happened once — see commit history), the four declared sites get updated, the 19 ad-hoc sites don't. When the 75 € default rate needs to become 80 €, `constants.js` is edited, `FinancesPage.jsx:23` fallback stays at 75. Pricing bug, invisible in QA.
- **Recommendation**:
  1. Enforce `constants.js` as the single source. Remove `DataContext.jsx:131-138` defaults (the merged map stays, but the hard-coded fallbacks duplicate constants).
  2. Create `src/lib/date.js` that re-exports `MONTHS_FR`, `MONTHS_SHORT`, `formatDateShort`, `formatDateLong`, `formatTime`, `formatRelativeDate` — canonical.
  3. Delete `FinancesPage.getClientType` and `FinancesPage.getClientNameByContext`. Import from `data/helpers`. Fix the `'client'` vs `'couple'` drift in one place.
  4. Grep the 19 hard-coded phase-colour sites and replace with `getPhaseColor(phase).color` / `.bg` from `DataContext`.

---

#### H-06: `loadData()` has no guard against running during a prior load

- **Location**: `src/context/DataContext.jsx:55-88`. `loadData` sets `setLoading(true)` at the top, awaits 8 parallel queries, sets results, sets `setLoading(false)` at the bottom. It is referenced in `useEffect(() => { loadData() }, [loadData])` (line 88) and called after every CRUD (see C-01).
- If a user clicks two mutation buttons in quick succession, or if `user?.id` changes while a refetch is in flight, two `loadData()` runs race. The last one to resolve wins — but if the first one is slower for one of the eight tables (e.g. therapy_cycles is large), you can end up with a mix-and-match of stale and fresh data.
- Additionally, `loadData` depends on `user?.id` only (`:86`), but is invoked after every mutation in the CRUD wrappers. The `useCallback` dep array excludes `showToast` — which is stable but again, not declared.
- **Recommendation**: Either (a) add an `inflightRef` guard:
  ```js
  const inflight = useRef(false)
  const loadData = useCallback(async () => {
    if (inflight.current || !user?.id) return
    inflight.current = true
    try { ... } finally { inflight.current = false; setLoading(false) }
  }, [user?.id])
  ```
  or, better, (b) remove the post-mutation `loadData()` entirely per C-01 and the race disappears by construction.

---

#### H-07: `GlobalErrorBoundary` is a single top-level fallback — per-route boundary missing

- **Location**: `src/App.jsx:27-56` defines `GlobalErrorBoundary` and wraps everything below `<AuthProvider>` at `:205-235`. The Suspense fallback (`:211-215`) is also a single spinner for *all* routes.
- **Risk**: An uncaught render throw on `/clients/:id` crashes the whole app into the global fallback with *"Recharger l'application"* — throwing away the user's sidebar, unsaved form state, and navigation history. For a tool that includes note-taking and free-text consultation inputs, this is a data-loss risk.
- The boundary also dumps the error's `toString()` and `componentStack` directly into a `<pre>` on screen (`:43-47`) — in production this is leaking file paths, component names, and sometimes string payloads to the end user.
- **Recommendation**:
  1. Add a per-route boundary: wrap the `<Routes>` in a second `<ErrorBoundary>` inside the `<Suspense>` so the sidebar, header, and toast host stay alive when a single page crashes.
  2. In production (`import.meta.env.PROD`), hide the raw stack and show only "Contactez le support". Send the stack to Sentry (M-02).

---

### Medium

#### M-01: No error tracking / observability / source maps

- **Location**: `package.json` contains no `@sentry/*`, `rollbar`, `@datadog/browser-*`, `bugsnag`, `posthog-js`, or equivalent. `vite.config.js:1-19` does not configure source maps (default is off in production Vite 8 builds). No server-side logs are consumed anywhere.
- **Risk**: When a user reports *"my client restore didn't work"* (triggered by H-04), there is no breadcrumb, no stack, no session replay. The only signal is the *therapist's* report.
- **Recommendation**: `@sentry/react` at a free tier, initialised in `main.jsx`, wired into `GlobalErrorBoundary.componentDidCatch` (`App.jsx:33`) and into `window.addEventListener('unhandledrejection', ...)`. Enrich events with `user.id`, `user.role`, active route. Use Sentry source maps so stack traces are readable without shipping maps to the browser. Estimated effort: 1 hour.

---

#### M-02: 75 `console.*` calls ship to production

- **Location** — grep confirmed:
  - `AdminPage.jsx:13, 24` — `console.log('[AdminPage] Fetching users...')`, `console.log('[AdminPage] Users fetched:', data?.length || 0)`. Debug noise logged for every admin visit; leaks "users.length" count to console.
  - `AdminPage.jsx:20, 27` — `console.error(...)`.
  - `DataContext.jsx` — 22 `console.error` calls in the CRUD wrappers (one per mutation helper).
  - `dataService.js` — 28 `console.error` calls.
  - `invoiceService.js` — 9 `console.error` calls.
  - `App.jsx:34, 151, 177` — `console.error('[Fatal Error]', ...)`, `console.error('[Auth] Process error:', err)`, `console.warn('Logout error:', err)`.
  - `ClientsPage.jsx:523, 1140`, `DeletedClientsPage.jsx:52`, `LoginPage.jsx:18`, `EditIdentityModal.jsx:752`, `DataContext.jsx:81`.
- Total: **75** across 9 files (13 files if you count the single-line services re-countings).
- **Risk**: Pure noise reaching every user session and adding bundle size. Combined with M-01, this noise goes nowhere (no log collection), so it literally benefits no one.
- **Recommendation**: Once M-01 lands, replace `console.error` with a thin wrapper `reportError(err, context)` that forwards to Sentry. Remove all `console.log('[AdminPage] ...')` debug lines. Add `no-console: ["error", { allow: ["warn", "error"] }]` to ESLint (from C-03) once the wrapper is in place.

---

#### M-03: `window.confirm()` in `ReseauProPage.jsx:130`

- **Location**: `src/pages/ReseauProPage.jsx:130` — `if (window.confirm(\`Supprimer ${selected.size} partenaire(s) professionnel(s) ?\`)) { await deleteProfessionals(...) }`.
- The project has a full custom `ConfirmProvider` at `src/context/ConfirmContext.jsx:1-97` (branded, animated, keyboard Esc, focus trap). Every other deletion in the app goes through it (13 of 14 sites — confirmed by grep). This is the one bypass.
- A specific commit (`2775b5b — feat: modales custom — remplacement confirm/alert natifs par ConfirmContext`) explicitly replaced native `confirm`/`alert` — this file was missed.
- **Risk**: UX inconsistency (the user sees a browser-chrome popup that looks untrusted), blocking call (cannot be automated in tests), bypasses the "⚠️ IRRÉVERSIBLE" messaging used elsewhere.
- **Recommendation**: One-line fix. Replace with:
  ```js
  const ok = await confirm(`Supprimer ${selected.size} partenaire(s) professionnel(s) ?`, { variant: 'danger' })
  if (!ok) return
  await deleteProfessionals(Array.from(selected))
  setSelected(new Set())
  ```
  `confirm` is already imported at the top of the file.

---

#### M-04: `new Date().toISOString().split('T')[0]` repeated 11+ times — no shared `today()` helper

- **Location**: Confirmed occurrences:
  - `DashboardPage.jsx:29, 58, 140`
  - `ClientDetailPage.jsx` — one use implicit via `new Date().toISOString().slice(0,16)` for `contactDate`.
  - `services/exportService.js:92`
  - `services/invoiceService.js:49`
  - `data/helpers.js:92, 132`
  - `dataService.js:62, 277, 310` — `updated_at: new Date().toISOString()` repeats per service function.
- **Risk**: When someone needs to switch to `Intl.DateTimeFormat` for timezone-safety, or to a library like `date-fns-tz`, it's a 20-site patch.
- **Recommendation**: Export `today()`, `todayIso()`, `nowIsoMinute()` from `src/lib/date.js` (also created for H-05). Grep-replace once.

---

#### M-05: `OnboardingWizard.jsx:21-24` uses nested `setTimeout` for animation sequencing

- **Location**: `src/components/OnboardingWizard.jsx:21-24`
  ```js
  setTimeout(() => {
    setStep(next)
    setTimeout(() => setAnimating(false), 50)
  }, 220)
  ```
- **Risk**: Magic numbers (`220`, `50`) coupled to CSS keyframe duration in `index.css`. If the CSS transition changes, the setState runs at the wrong phase. Also no cleanup — if the wizard unmounts mid-transition, the setTimeout still fires and calls `setState` on an unmounted component (React 19 tolerates this but warns).
- **Recommendation**: Use `useReducer` for a state-machine `[idle → transitioning → settled]`, drive transitions off `onTransitionEnd` events on the slide element. Or at minimum, store the timer IDs in a ref and `clearTimeout` in a cleanup.

---

#### M-06: OAuth flow `implicit` — not PKCE

- **Location**: `src/lib/supabase.js:6-14`
  ```js
  export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit',     // ← line 11
      storageKey: 'coachcrm-auth-token',
    },
  })
  ```
- Supabase-js defaults to PKCE for public SPAs since v2.x. The `implicit` flow returns the access token in the URL hash, is explicitly not recommended by OAuth 2.1, and by major IdPs. Cross-reference §02 Security.
- **Risk**: Access token lands in `window.location.hash`. `App.jsx:119` reads it (`isOAuthCallback = window.location.hash.includes('access_token')`) and calls `window.history.replaceState` to strip it — acceptable mitigation but relies on it running before any third-party script reads `document.location`.
- **Recommendation**: Change to `flowType: 'pkce'` and test the Google OAuth callback. One line, one test. (This should be re-verified by §02 Security, and Google Cloud Console may need redirect URI adjustments.)

---

#### M-07: `App.jsx:125-129` safety timeout is 10 s on first load + stale-closure

- **Location**: `App.jsx:124-129`
  ```js
  const timeout = setTimeout(() => {
    if (mounted && loading) {
      setLoading(false)
    }
  }, 10000)
  ```
- **Risk**: (a) 10 s is a lifetime on a login screen — users will have refreshed already. (b) The `loading` read inside the closure was captured at mount time; React 19's StrictMode double-invoke can hide this. See H-03.
- **Recommendation**: Drop to 5 s + show an explicit *"Connexion lente…"* message; use a `useRef` to read live `loading`.

---

#### M-08: `manualChunks` is trivial — vendor bundle likely > 400 KB

- **Location**: `vite.config.js:10-17`
  ```js
  rollupOptions: { output: {
    manualChunks(id) { if (id.includes('node_modules')) return 'vendor' }
  }}
  ```
- Everything from `node_modules` lands in a single `vendor` chunk. `exceljs` (used only in `exportService.js`, invoked on a button click) ships in the initial bundle despite being ~500 KB minified.
- **Risk**: Initial JS payload is bloated for first-visit users, hurting LCP on mobile. `exceljs` and `file-saver` are export-only dependencies — they should be lazy-loaded or chunk-split.
- **Recommendation**: Either:
  1. Convert `exportClientDossierExcel` to `await import('exceljs')` dynamic inside `services/exportService.js`.
  2. Or use a `manualChunks` map:
     ```js
     manualChunks: {
       react: ['react', 'react-dom', 'react-router-dom'],
       supabase: ['@supabase/supabase-js'],
       excel: ['exceljs', 'file-saver'],
       icons: ['lucide-react'],
     }
     ```
  This belongs more to §04 Performance, but surfaces here because the build config is reviewed.

---

#### M-09: No `PropTypes`, no TypeScript — large component props implicit

- **Location**: Entire codebase. `package.json` has no `prop-types` dep, no `.ts[x]` files.
- Components with wide, undocumented prop surfaces:
  - `SessionDetailModal.jsx:14-21` — 6 props, each a grouped state/actions/utility bag. No schema, no JSDoc.
  - `EditIdentityModal.jsx:14-21` — 5 grouped-bag props.
  - `ClientStatsPanel`, `ClientTimelinePanel`, `ClientHeaderPanel` — each receives 10–20 props.
- **Risk**: The only safety check is manual review; renaming a key in `sessionModal` silently breaks the modal.
- **Recommendation**: TypeScript migration is a multi-week project. Cheaper intermediate: add JSDoc `@typedef` blocks for the grouped-bag props on the four big modals. If appetite allows, migrate one file per week to `.tsx`, starting from `data/constants.ts` (smallest, zero deps).

---

#### M-10: Root `index.html` defaults + no favicon

- **Location**: `index.html:1-17` — 17 lines. Uses the default Vite template title. No `<meta name="description">`, `<meta property="og:*">`, favicon, or `<link rel="apple-touch-icon">`.
- Not a bug, but a first-impression issue for a public-signup product.
- **Recommendation**: Add OG tags for linked sharing, a `rel="icon"` SVG favicon aligned with the `Heart` logo brand, and a `<meta name="robots" content="noindex">` on the SPA routes that should not be indexed (in SPA context this is a whole discussion — default `noindex` is safer).

---

#### M-11: `src/main.jsx:7-19` attaches a global input listener to *every* numeric input

- **Location**: `src/main.jsx:7-19`
  ```js
  document.addEventListener('input', (e) => {
    if (e.target.type === 'number' && !e.target._stripLz) {
      const val = e.target.value
      if (val.length > 1 && /^0\d/.test(val)) {
        e.target._stripLz = true
        const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
        nativeSet.call(e.target, String(Number(val)))
        e.target.dispatchEvent(new Event('input', { bubbles: true }))
        e.target._stripLz = false
      }
    }
  }, true)
  ```
- The commit message `feat: prevent leading zeros in all numeric inputs globally` confirms intent.
- **Risk**: (a) mutates a native input in capture phase and re-dispatches a synthetic `input` event — surprising to any React Hook Form / controlled component downstream; (b) attaches a DOM listener in a React file, so it survives React's tree-teardown and leaks across SPA lifecycle; (c) the `_stripLz` flag is set as an own-property on the DOM element — breaks object-freeze, inspector noise, and serializers.
- **Recommendation**: Move the logic to a `<input type="number" onChange={stripLeadingZeros} />` wrapper component used where it matters. The global listener is too broad for what it does.

---

#### M-12: `main` is the only branch, commits land straight to prod

- **Location**: `docs/SETUP_GUIDE.md:116` — *"Déploiement Automatique : chaque `git push` sur `main` déclenche un déploiement."*
- Combined with C-03 (no CI), this means every untested commit goes to production. 30 commits on `main` since setup — no branches, no PRs.
- **Risk**: For a health-data SaaS this is unacceptable operational posture regardless of code quality.
- **Recommendation**: Protect `main`. Require PR reviews (even solo-dev: PR → self-approve → merge still forces a pause + diff view). Block direct pushes to `main` in GitHub settings. Enable Vercel preview deploys per branch (free, no config).

---

#### M-13: `.single()` vs `.maybeSingle()` — 18 of 20 calls use `.single()`

- **Location**: 18 `.single()` calls in `services/dataService.js` and `invoiceService.js`. Only `App.jsx:75, 88` use `.maybeSingle()`.
- `.single()` errors when 0 rows match; `.maybeSingle()` returns `null`. For `getCurrentUser(email)` (`dataService.js:6-14`) and `getSettings(userId)` (`:264-272`) — both cases where "0 rows is normal" (first-time user has no settings row) — the `.single()` failure is silently absorbed by the `if (error) console.error` (C-04), and callers get `null` anyway. But this means any code reviewer can't tell "0 rows is OK here" vs "0 rows is a bug here".
- `dataService.js:270` has a special-case `if (error && error.code !== 'PGRST116')` — a strong signal the developer knew `.single()` was wrong here.
- **Recommendation**: Use `.maybeSingle()` everywhere the result might not exist. Reserve `.single()` for foreign-key-constrained fetches where absence is truly a bug (and then let it throw — once C-04 is fixed, this gives a clean error).

---

#### M-14: `GlobalErrorBoundary` in `App.jsx:27` is inside the same file as `App` — not reusable

- **Location**: `src/App.jsx:27-56`.
- **Risk**: Any per-route boundary (H-07) would require another class. Minor.
- **Recommendation**: Extract to `src/components/ErrorBoundary.jsx`. Accept a `fallback` prop so `App` can pass one fallback for the global case and `Layout` can pass a different one for per-route.

---

#### M-15: `LoginPage.jsx:248-263` — the email signup button calls `handleGoogleLogin`

- **Location**: `src/pages/LoginPage.jsx:235-263`. The page shows an email input (`:235-246`) and a big gold CTA labelled *"Créer mon compte gratuitement"* (`:248-263`) whose `onClick={handleGoogleLogin}` — signs the user in with Google, ignoring the email they typed.
- **Risk**: Users will type an email, click the gold button, and get redirected to Google. At best a surprise. At worst a drop-off.
- **Recommendation**: Either implement the email sign-up flow (`supabase.auth.signUp({ email, password })`, plus an OTP/magic-link option for no-password onboarding), or remove the email input and the "ou" divider entirely until it's real.

---

#### M-16: No `README.md` — project has no top-level entry point

- **Location**: No `README.md` at repo root. `git ls-files` returns no README.
- `docs/SETUP_GUIDE.md` partially fills this role but is not surfaced on GitHub as the repo landing page.
- **Risk**: New contributors (or the therapist-user reading the GitHub page) see nothing. Missing RGPD notice, licence, data-handling promise, contact info.
- **Recommendation**: Add a short `README.md` pointing to `docs/SETUP_GUIDE.md` and listing: stack summary, deploy target (Vercel), data residency (Supabase EU-West-2 per setup guide), contact email. Add an RGPD paragraph mentioning the data categories stored (special-category health data) and legal basis.

---

### Low / Informational

#### L-01: Commit messages are French-language, inconsistent scope prefixes

`git log --oneline` shows alternation between `feat:`, `fix:`, `fix(build):`, `feat(ui):`, `refactor:`, bare `docs:`. Adopt Conventional Commits (`feat(scope):`, `fix(scope):`, `chore(scope):`) uniformly — it's already mostly there.

#### L-02: `session_rates` key mismatch — DB default is `{couple: 75}`, code expects `{client: 75}`

`supabase/migration.sql:138` has `session_rates JSONB DEFAULT '{"couple": 75, "individual": 60}'`, but `data/constants.js:31-34` uses `{ client: 75, individual: 60 }` and `DataContext.jsx:40-43` merges DB over defaults. A brand-new user gets `sessionRates.couple = 75`, `sessionRates.individual = 60`, but the code everywhere reads `sessionRates.client` — fallback to undefined → pricing bug. Latent. Cross-ref §03 Data.

#### L-03: `DashboardPage.jsx:20` destructures 30+ values from `useData()` on one 500-character line

Wrap or use the context directly. Readability concern.

#### L-04: `index.css` is 1 484 lines, 26 KB, single file

Not a bug, but past the point where splitting into `base.css`, `components.css`, `utilities.css` becomes useful. Low priority.

#### L-05: `src/components/UrgencyCard.jsx:17` passes `color` as inline style rather than CSS class

One of the cleaner small components, but still hard-codes colour via prop. Low priority.

#### L-06: `pages/SessionsPage.jsx` is 9 lines — dead route

`src/pages/SessionsPage.jsx` contains a 9-line placeholder ("Séances — Cette page est en construction"). Either build it or remove the route (`App.jsx:220` — `<Route path="/sessions" element={<SessionsPage />} />`).

#### L-07: `data/constants.js:7-9` has `therapyPhases` including `debut, analyse, integration, bilan_final` but doc `MON_ARCHITECTURE_DONNEES.md` mentions `prospect` as a phase — doc drift

The UI handles `prospect` as a pseudo-phase via `client.phase === 'prospect'` checks; but the constants file has no `prospect` entry. Confusing for a reader of the constants file alone.

#### L-08: `ClientCreationMarker.jsx:50, 91` is the **only** site calling `confirm` with `variant: 'destructive'`

All other sites use `variant: 'danger'` or no variant. The `ConfirmContext` only handles `danger | alert | confirm` (`:83-88`). `destructive` falls through to the default styling — silently. Cosmetic bug.

#### L-09: No explicit `aria-`-less alert on `ClientsPage.jsx:1140` create-error banner

Already covered by C-08. Listed again for the remediation checklist tracker.

#### L-10: `vite.config.js` does not set `build.sourcemap: 'hidden'`

Belongs more to §04 Performance / §02 Security.

#### L-11: No `.nvmrc` / `.node-version` / `engines` in `package.json`

`docs/SETUP_GUIDE.md:9` says "Node.js v22+" but nothing enforces it. Add `"engines": { "node": ">=22" }` to `package.json`.

#### L-12: Ad-hoc CSS utility class `.animate-in` referenced in `Layout.jsx:32` — assumes it exists in `index.css`

Not audited directly; referenced as a style entry-point but no search-and-verify done. Low priority.

#### L-13: `ProfessionalReferrals` table declared in migration but never read by the app

`migration.sql:125-132` declares `professional_referrals`. No `.from('professional_referrals')` call anywhere in `src/`. Dead table — either delete the migration or wire it up. Cross-ref §03 Data.

#### L-14: Mermaid diagram in `MES_REGLES_METIER.md:9-18` — documentation is dense but well-structured

Positive signal. Flagged here so the remediation plan doesn't accidentally remove doc sections during the H-05 consolidation.

---

## What's Done Well

To counterbalance — these are genuine strengths that should be preserved through any remediation:

- **Doc-first culture, clearly**. Four substantial French-language docs (`MES_REGLES_METIER.md` 617 lines, `MES_REGLES_TECHNIQUES.md` 231 lines, `MA_CHARTE_GRAPHIQUE.md` 1 060 lines, `MON_ARCHITECTURE_DONNEES.md` 297 lines) describe the state-machine, the UI charter, the data model. The `.agents/rules/doc.md` absolute-rules for every commit are unusual and good — the problem is the code has drifted away from them, not that the rules are bad.
- **Separation of data concerns**. `services/*.js` cleanly isolate Supabase calls from React. `adapters.js` mechanically maps `snake_case ↔ camelCase` at the boundary — a discipline most React/Supabase codebases lack.
- **Centralised feedback primitives**. `ToastProvider` + `ConfirmProvider` are clean, branded, keyboard-aware, and correctly consumed in 13/14 sites.
- **Route-level code splitting is already in place**. `App.jsx:13-22` wraps every non-login page in `React.lazy`. The `Suspense` fallback exists. This is rarely done in small React projects.
- **`GlobalErrorBoundary` exists**. Even if it's a single top-level fallback (H-07), it is a real class-component boundary, not a hook hack — the author knows the React rules.
- **Google-OAuth + RLS-first authZ**. The frontend does *not* bake permission logic into UI state (the one exception being `App.jsx:224-226` admin-only route gates, which is legitimate). All access is RLS-driven.
- **Alliance-therapy business rule is centrally implemented**. `services/allianceService.js:53-127` has a single `checkAllianceTransition` function called from both create and update paths. This one module being unit-testable is a strong C-03 win.
- **Good semantic use of lucide-react**. Icons are imported per-component, tree-shaken correctly. No bundle bloat from icon libraries.
- **Sponsorship logic is a dedicated service**. `sponsorshipService.js` is well-documented, has clear French section headers, and validates against self-sponsorship and cycle creation. The mutation bug (H-04) aside, the reasoning is sound.
- **A `getComputedStatus` centralises active/inactive derivation** (`helpers.js:67-76`) instead of duplicating the rule per page. Good.
- **Vite 8 + React 19 is a current stack**. No legacy-dep drag.
- **Consistent French locale discipline**. Every toast, label, error message is in French. This is harder to sustain than it looks.

---

## Remediation Plan (prioritised)

| # | Item | Priority | Effort | Owner hint |
|---|------|----------|--------|------------|
| 1 | Commit the missing `therapy_cycles`, `invoices`, `invoice_sessions` tables + their RLS policies + missing `clients.*` columns as `supabase/002_*.sql` (C-02) | Critical | 2 h | Lead dev + Ops |
| 2 | Rewrite `services/dataService.js` + `invoiceService.js` to `throw` on error; verify toasts now fire in `DataContext` (C-04) | Critical | 1 day | Lead dev |
| 3 | Replace `loadData()` post-mutation calls with optimistic local state updates; keep `refreshData` as escape hatch (C-01, H-06) | Critical | 1 day | Lead dev |
| 4 | Remove the anon JWT + project ref from `docs/SETUP_GUIDE.md`; rotate Supabase JWT secret per §02 (C-07) | Critical | 1 h | Ops |
| 5 | Add `vitest` + first 40 pure-function tests (`allianceService`, `sponsorshipService`, `duplicateUtils`, `data/helpers`, `data/adapters`, `FinancesPage.monthlyStats` extracted) (C-03) | Critical | 2 days | Lead dev |
| 6 | Add `eslint.config.js` with `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`; `npm run lint` script (C-03, C-06, H-03) | Critical | 4 h | Lead dev |
| 7 | Add `.github/workflows/ci.yml` running `npm ci && npm run lint && npm run build && npm test`; protect `main` (C-03, M-12) | Critical | 4 h | Ops |
| 8 | Fix the two hook-order / mutation violations the project's own rules explicitly ban: `SessionDetailModal.jsx:22-24`, `OnboardingWizard.jsx:39,50`, `DeletedClientsPage.jsx:17-18`, `sponsorshipService` mutations (C-05, C-06, H-04) | Critical | 4 h | Lead dev |
| 9 | Add `aria-label` to every icon-only button; `aria-live` on toast host; `role="dialog"` on confirm modal; fix contrast in `LoginPage` (C-08) | Critical | 1 day | Lead dev |
| 10 | Add Sentry to `GlobalErrorBoundary` + `window.onunhandledrejection` + silent-Supabase-error handler (M-01) | High | 2 h | Ops |
| 11 | Replace `window.confirm` in `ReseauProPage.jsx:130` with `useConfirm` (M-03) | High | 5 min | Any dev |
| 12 | Extract shared `src/lib/date.js` (`MONTHS_FR`, `today()`, `formatDateShort`, `formatDateLong`) and `src/lib/phases.js` (phase colours as canonical source); delete duplicates in `FinancesPage` / `AdminPage` / `ClientsPage` (H-05) | High | 1 day | Lead dev |
| 13 | Fix the confirmed stale-closure bugs in `FinancesPage.jsx:138, 146, 161`; remove the dead `editingTotal` effect in `ClientDetailPage.jsx:98-100` (H-03) | High | 4 h | Lead dev |
| 14 | Remove all `console.log` debug in `AdminPage.jsx:13, 24`; replace remaining `console.error` with Sentry wrapper (M-02) | High | 1 h | Any dev |
| 15 | Change Supabase `flowType: 'implicit'` to `'pkce'` + re-test Google OAuth (M-06) | High | 30 min | Lead dev + Ops |
| 16 | Add per-route `<ErrorBoundary>` inside `<Suspense>`; extract boundary to `components/ErrorBoundary.jsx` (H-07, M-14) | Medium | 2 h | Lead dev |
| 17 | Lazy-load `exceljs` via dynamic `import()`; split `manualChunks` for react / supabase / excel / icons (M-08) | Medium | 1 h | Lead dev |
| 18 | Extract data hooks (`useClients`, `useMonthlyStats`, `useUrgencies` already exists — build more); begin `ClientsPage` + `FinancesPage` split (H-01) | Medium | ongoing | Lead dev |
| 19 | Add `react/forbid-dom-props: style` lint rule scoped to new code; weekly ratchet of 20 inline styles → CSS classes (H-02) | Medium | ongoing | Any dev |
| 20 | Switch the 16 `.single()` calls where 0 rows is normal to `.maybeSingle()` (M-13) | Medium | 1 h | Any dev |
| 21 | Implement real email signup in `LoginPage` or remove the email CTA (M-15) | Medium | 2 h | Lead dev |
| 22 | Add repo-root `README.md` with RGPD notice + runbook link (M-16) | Medium | 1 h | Ops |
| 23 | Add `"engines": { "node": ">=22" }` to `package.json` + `.nvmrc` (L-11) | Low | 5 min | Any dev |
| 24 | Remove / complete the 9-line `SessionsPage.jsx` stub (L-06) | Low | 15 min | Any dev |
| 25 | Clean up `M-11` global numeric-input listener (surgical refactor) | Low | 1 h | Lead dev |
| 26 | Adopt Conventional Commits across all contributors (L-01) | Low | — | Team |

**Minimum cut before production**: items **1 through 9**. Without those, do not release to any new therapist account. Items 10 through 15 should land inside the first post-launch sprint.

---

## Conclusion

CoachCRM is a **thoughtful, domain-aware, well-documented** React/Supabase app written by someone who has had the right product conversations with therapists. The charter doc, the business-rules doc, the alliance-therapy service, the sponsorship service, the centralised toast/confirm primitives, the lazy-loaded routes, the adapter layer, the RLS-first authZ — all of this is materially *above* the baseline for a SaaS of this size.

Its weaknesses are the familiar shape of a solo/small-team project that is about to cross into "production for paying users": **no automated safety net** (no tests, no lint, no CI, no observability), **a service layer that swallows every error**, **a state-management layer that refetches everything on every write**, **a schema file that does not match the running database**, **a handful of direct rule violations** that the project's own written standards forbid but which no one ran a grep against, and **zero accessibility primitives** for a product regulated by French and EU accessibility law.

None of these are hard to fix. The Critical list is roughly **one focused week** for one engineer, *provided* that week is allowed to be a moratorium on feature work. With items 1–9 done, CoachCRM becomes a **Medium-risk** codebase that can be released to a small closed-beta of French therapists in good conscience. With the full plan, it reaches the bar of a mature RGPD-regulated SaaS — and the existing docs become an asset rather than a mirror to what the code should have been.
