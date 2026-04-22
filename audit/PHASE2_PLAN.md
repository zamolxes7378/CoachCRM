# CoachCRM — Phase 2 Implementation Plan

**Date:** 2026-04-22
**Driver:** _________________________ (to confirm vendor contracts and conditional tracks before dispatch)
**Summary:** 12 tracks (P2-A through P2-L) across 4 waves. Two hard deadlines: Factur-X reception **2026-09-01** (P2-D) and audio EU-residency vendor **driver confirms before dispatch** (P2-E). P2-L conditional on commercial contracts.

**Companion docs:** [`PHASE1_PLAN.md`](PHASE1_PLAN.md) · [`phase1_verification.md`](phase1_verification.md) · [`PHASE2_FACTURX_PLAN.md`](PHASE2_FACTURX_PLAN.md) · [`INDEX.md`](INDEX.md)

---

## 0 · Known state / landmines

### Main branch tip (2026-04-22)

- **Commit:** `7cecbb3` (chore: .gitignore + GitNexus config)
- **Phase 1 status:** 13/13 tracks merged; verification in `phase1_verification.md`. Three ⚠️ deviations carry into Phase 2:
  1. **Audio 30-day purge missing** — `supabase/migrations/20260422103300_audio_bucket.sql` documents the gap and emits a `RAISE NOTICE`. A scheduled Supabase Edge Function (`purge-old-audio`) is required; SQL cannot hard-delete Storage objects. **This is P2-A's sole job.**
  2. **XLSX password UI-only** — ExcelJS OSS browser build does not support encryption; the UI renders the field but the file is not encrypted. Accepted deviation; not in scope for Phase 2 (server-side PDF generation via P2-D covers the real invoice case).
  3. **`CoreDataProvider` / `ExtendedDataProvider` split skipped in P1-W** — deferred from Phase 1 because memoisation wins were sufficient. Now folded into **P2-C** along with the `clients_with_stats` view gap.

### Open engineering pre-conditions

- **ADELI/RPPS sign-up gate (P2-B):** `docs/compliance/hds_decision.md` §4 contains an explicit `TODO engineering` requiring the registration gate before any commercial launch. This is a **condition préalable** to public launch per the HDS decision document.
- **`reports.vigilance` encryption cast** (`phase1_verification.md` §4): a migration casting `jsonb → bytea` is needed before vault fully applies. Tracked in P2-F (probative integrity) as part of the document-hardening pass.
- **Supabase extension enablement:** `pg_cron` and `vault` must be enabled via Supabase Dashboard on the live project before Phase 1 migrations run. Verify before dispatching any P2 track that adds a migration.
- **Sentry EU region:** `phase1_verification.md` §5 item 6 — confirm Sentry project region is EU and update `evidence_pack.md`. Tracked in P2-K.
- **DPIA sign-off, DPAs, AI System Card counsel review** — human-led gates from Phase 1, still open. Not in scope for any Phase 2 code track but must close before external launch.

### MCP guardrails (live-DB tracks — copy verbatim from Phase 1 §0bis)

Any track touching live DB via Supabase MCP **must** follow these rules:

1. **Read before write.** Always inspect the live schema with `SELECT` before any DDL.
2. **No irreversible DDL without a rollback block.** Every migration must have a documented `-- ROLLBACK:` comment.
3. **Never run `DROP TABLE` or `DELETE` without a dry-run `SELECT` first** that confirms the target rows.
4. **Never disable RLS** — not even temporarily on dev tables.
5. **Use `ON CONFLICT DO NOTHING` / `IF NOT EXISTS`** on all inserts and DDL to keep migrations idempotent.
6. **Confirm extension enablement** (`pg_cron`, `vault`, `net`) via `SELECT * FROM pg_extension` before referencing them in migrations.

---

## 1 · Goals & acceptance

Phase 2 closes four categories of work: **(a)** three carry-overs from Phase 1 deviations (audio purge, sign-up gate, provider split); **(b)** the two headline regulatory items (Factur-X reception by 2026-09-01, audio pipeline); **(c)** quality and operational work (probative integrity, structured logging, prefetch/mutations, test baseline); **(d)** one conditional RGAA track.

Parallelism matters because the 12 tracks touch almost entirely disjoint parts of the codebase — supabase Edge Functions, signup flow, DataContext, billing/invoice layer, audio pipeline, observability, router/query layer, report hashing, and test infra have no shared files within any single wave. With 3–4 agent slots, Wave 1 alone saves ~1 week of wall-clock time.

**Contract:** every track owns an **exclusive file list**. Agents must not modify files outside their set. Where a file logically belongs to two tracks, it is assigned to exactly one and the other notes "Coordinates with P2-X". Contested files (`.env.example`, `App.jsx`, `dataService.js`) are assigned in Wave 0 / Wave 1 to the track that owns the bulk of the work in that file; later waves coordinate.

---

## 2 · Tracks

### P2-A — Audio purge Edge Function (carry-over from P1-Z)

- **Goal:** create and schedule a Supabase Edge Function that deletes `audio_recordings` Storage objects older than 30 days, closing the G-06 purge gap documented in `20260422103300_audio_bucket.sql`.
- **Files (exclusive):**
  - `supabase/functions/purge-old-audio/index.ts` **(NEW)** — Deno Edge Function: list objects older than 30 days, call `storage.remove([paths])`, log to `audit_log` with `action='purge_audio'`
  - `supabase/functions/purge-old-audio/deno.json` **(NEW)** — Deno config
  - `supabase/migrations/<ts>_schedule_audio_purge.sql` **(NEW)** — `cron.schedule('purge-old-audio-daily', '0 3 * * *', 'SELECT net.http_post(...)')` (guarded by `IF EXISTS pg_extension WHERE extname='pg_cron'`)
  - `docs/engineering/audio_purge_runbook.md` **(NEW)** — deploy steps, rollback, manual trigger, log verification
- **Sub-agent:** `general-purpose`
- **Model tier:** Sonnet 4.6
- **Findings closed:** **G-06 (full closure)**, P1-Z carry-over (audio purge).
- **Deliverables:**
  - Edge Function deployed to Supabase project, callable via `POST /functions/v1/purge-old-audio`.
  - Daily cron schedule registered.
  - `audit_log` row with `action='purge_audio'` created per run with count of deleted objects.
  - Runbook documents how to trigger manually, verify logs, and roll back.
- **Exit criteria:** manual invocation returns HTTP 200; `SELECT count(*) FROM audit_log WHERE action='purge_audio'` increments; no Storage objects older than 30 days remain after the run on a test bucket with seeded old objects.
- **Depends on:** P1-Z (merged — audio bucket + `audit_log` exist). `pg_cron` and `net` extensions enabled in Supabase Dashboard.
- **Parallelisable with:** P2-B, P2-C

---

### P2-B — ADELI/RPPS sign-up gate (carry-over from hds_decision.md §4)

- **Goal:** wire the HDS decision document's mandatory engineering gate on the registration flow — block regulated professionals (ADELI/RPPS holders) from completing sign-up.
- **Files (exclusive):**
  - `src/pages/LoginPage.jsx` — add profession-type question step after Google OAuth; block + waitlist message if regulated professional selected
  - `src/components/SignupGateModal.jsx` **(NEW)** — "Êtes-vous un professionnel de santé réglementé disposant d'un numéro ADELI ou RPPS ?" modal with Oui / Non branches; "Oui" branch shows waitlist message and stops the flow
  - `supabase/migrations/<ts>_waitlist.sql` **(NEW)** — `waitlist(email, profession_type, requested_at)` table with RLS (admin-only read, unauthenticated insert)
  - `src/services/waitlistService.js` **(NEW)** — `addToWaitlist(email, professionType)` Supabase insert
  - `docs/compliance/signup_gate.md` **(NEW)** — engineering rationale (reference hds_decision.md §4), test scenarios, rollback (env flag `VITE_DISABLE_SIGNUP_GATE=true` for dev)
- **Sub-agent:** `feature-dev:code-architect`
- **Model tier:** Sonnet 4.6
- **Findings closed:** **R-07 engineering TODO** (hds_decision.md §4), pre-condition for any commercial launch per HDS decision.
- **Deliverables:**
  - Sign-up flow: after Google OAuth, user sees the gate question. "Non" → normal provisioning. "Oui" → waitlist insert + French message ("CoachCRM n'est pas encore homologué pour les professionnels de santé réglementés. Votre adresse a été enregistrée pour le lancement de notre offre HDS.") + no therapist row created.
  - `waitlist` table with admin-only read RLS.
  - Dev override via env flag.
- **Exit criteria:** a test sign-in that selects "Oui" (ADELI/RPPS) does NOT create a row in `users` table and DOES insert a row in `waitlist`; a test sign-in selecting "Non" provisions normally; manual axe pass shows the modal is accessible (role="alertdialog", focus trap).
- **Depends on:** Phase 0 Track B (PKCE + allowlist — merged). No Phase 2 dependency.
- **Parallelisable with:** P2-A, P2-C

---

### P2-C — CoreDataProvider/ExtendedDataProvider split + `clients_with_stats` view (carry-over from P1-W)

- **Goal:** implement the DataContext provider split that was skipped in P1-W (deviation documented in `phase1_verification.md` §4), and land the `clients_with_stats` view properly scoped to the DataContext refactor.
- **Files (exclusive):**
  - `src/context/CoreDataContext.jsx` **(NEW)** — `CoreDataProvider`: clients, sessions, settings; loaded on mount
  - `src/context/ExtendedDataContext.jsx` **(NEW)** — `ExtendedDataProvider`: invoices/billing_reminders, therapy cycles, professionals, contacts; lazy-loaded per route
  - `src/context/DataContext.jsx` — replace with thin re-export shim that merges both contexts for backward compatibility; existing consumers do not need changes if the shim exposes the same shape
  - `src/App.jsx` — wrap each route in the correct provider (Core everywhere; Extended only on Finances, ResauPro, Admin)
  - `supabase/migrations/<ts>_clients_with_stats_view.sql` **(NEW)** — `CREATE VIEW clients_with_stats AS SELECT c.*, count(s.id) FILTER (WHERE s.deleted_at IS NULL) AS session_count, max(s.date) AS last_session_date FROM clients c LEFT JOIN sessions s ON s.client_id = c.id GROUP BY c.id` with `SECURITY INVOKER`
  - `src/services/dataService.js` — `getDashboardClients()` reads from `clients_with_stats` view; add `getReports` fix (drop cross-join, use `client_id` filter per P-03); add column shortlists for list views (per P-04)
  - `src/pages/DashboardPage.jsx` — use `clients_with_stats` query via `getDashboardClients()`
- **Sub-agent:** `feature-dev:code-architect`
- **Model tier:** Sonnet 4.6
- **Findings closed:** **P-08** (DataProvider mounts before routing), **P-03** (getReports cross-join), **P-04** (select('*') on list views), P1-W carry-over (provider split + view).
- **Deliverables:**
  - Dashboard network tab: ≤ 2 Supabase queries on first render (down from 8).
  - `clients_with_stats` view live; `DashboardPage` reads from it.
  - `getReports` cross-join removed — relies on `client_id` filter + RLS.
  - `npm run lint` passes; no TypeScript/prop-type regressions.
- **Exit criteria:** `DashboardPage` renders with only `clients_with_stats` + `settings` queries visible in Network tab; Finances route triggers `ExtendedDataProvider` load on first visit; Lighthouse LCP on `/dashboard` ≤ 2.5 s.
- **Depends on:** Phase 0 Tracks C + E (merged). Phase 1 P1-W (merged — memoisation/Map wins already in place).
- **Parallelisable with:** P2-A, P2-B

---

### P2-D — Real Factur-X / PDP integration ⚠ **HARD DEADLINE 2026-09-01** (driver confirms Pennylane before dispatch)

- **Goal:** implement reception of Factur-X structured invoices via PDP (Pennylane recommended), plus the schema additions and PDF generator needed for emission; close R-04 and R-05 fully.
- **Driver decision required:** confirm Pennylane as PDP vendor (or alternate) before dispatching this track. Pennylane recommended per `docs/compliance/factur-x_roadmap.md`.
- **Files (exclusive):**
  - `supabase/migrations/<ts>_invoices_schema.sql` **(NEW)** — rename `billing_reminders` back to `invoices`; add SIRET, TVA intra, sequential invoice number (`invoice_number_seq` sequence), buyer_name snapshot, buyer_siret, amount_ht, tva_rate, amount_tva, payment_conditions, late_penalty_rate, due_date
  - `supabase/migrations/<ts>_received_invoices.sql` **(NEW)** — `received_invoices(id, pdp_id, facturx_xml text, facturx_status, received_at, supplier_siret, amount_ht, tva, parsed_at)` table + RLS (admin-read)
  - `src/services/billingReminderService.js` → `src/services/invoiceService.js` (rename back; update all imports)
  - `src/services/pdpService.js` **(NEW)** — REST client for Pennylane PDP API: `submitInvoice(invoice)`, `pollReceptionWebhook()`, `parseFacturX(xml)`
  - `src/services/pdfService.js` **(NEW)** — server-side PDF generation with embedded Factur-X XML (use `@factur-x/factur-x` or equivalent); output a Factur-X EN16931 compliant PDF/A-3
  - `src/pages/FinancesPage.jsx` — restore "Factures" label now legally backed; add reception inbox tab showing `received_invoices`
  - `src/components/invoice/InvoiceFormModal.jsx` **(NEW)** — full L441-9 / 242 nonies A CGI compliant invoice form (sequential number pre-filled, buyer snapshot, TVA fields, payment conditions)
  - `src/components/invoice/ReceivedInvoicesList.jsx` **(NEW)** — display incoming Factur-X from Chorus Pro / PDP
  - `.env.example` — add `VITE_PDP_VENDOR`, `PDP_API_KEY`, `PDP_ENDPOINT` (P2-D owns `.env.example` in Wave 1)
  - `docs/compliance/factur-x_roadmap.md` — update with Pennylane onboarding steps and go-live checklist
- **Sub-agent:** `feature-dev:code-architect`
- **Model tier:** Sonnet 4.6
- **Findings closed:** **R-04 (full)**, **R-05 (full)**.
- **Deliverables:**
  - Reception: incoming Factur-X XML from PDP webhook is parsed, stored in `received_invoices`, displayed in the UI with supplier name, amount, status.
  - Emission: compliant PDF/A-3 with embedded EN16931 XML generated on demand; sequential invoice number; all 12 L441-9 fields present.
  - `pdfService.js` + `pdpService.js` tested with mocked Pennylane responses.
  - Schema migration idempotent; rollback documented.
- **Exit criteria:** `SELECT invoice_number FROM invoices ORDER BY invoice_number_seq DESC LIMIT 1` returns a sequential non-null value; a test POST to the PDP webhook endpoint creates a row in `received_invoices`; generated PDF opens in Acrobat with embedded XML extractable; no UI string promises "facture" status without a real invoice number.
- **Depends on:** P1-T (billing_reminders rename — merged). PDP vendor contract signed (driver gate).
- **Parallelisable with:** P2-E, P2-G (no shared files within Wave 1)

---

### P2-E — Audio pipeline end-to-end (driver confirms Whisper-on-Scaleway before dispatch)

- **Goal:** complete the audio recording → transcription → session note pipeline using Whisper on Scaleway for EU data residency.
- **Driver decision required:** confirm Whisper-on-Scaleway as transcription vendor before dispatch (EU residency SCCs already covered by Scaleway's DPA). Add env vars manually to `.env.example` post Wave 1 merge (P2-D owns the file in Wave 1).
- **Files (exclusive):**
  - `supabase/functions/transcribe-audio/index.ts` **(NEW)** — Edge Function: fetch signed URL from `audio_recordings`, POST to Scaleway Whisper API, store transcript in `sessions.transcript`
  - `supabase/functions/transcribe-audio/deno.json` **(NEW)**
  - `supabase/migrations/<ts>_sessions_transcript.sql` **(NEW)** — `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS transcript text, ADD COLUMN IF NOT EXISTS transcript_language varchar(5) DEFAULT 'fr', ADD COLUMN IF NOT EXISTS transcribed_at timestamptz`
  - `src/services/audioService.js` — extend `uploadAudio()` to trigger Edge Function after upload; add `getTranscript(sessionId)` and `retryTranscription(sessionId)` methods
  - `src/components/client/SessionDetailModal.jsx` — add transcript display panel (read-only textarea under the audio player section); "Relancer la transcription" button if `transcript IS NULL`
  - `src/components/AudioRecorder.jsx` **(NEW)** — `<MediaRecorder>` wrapper: record → preview → upload with consent confirmation; progress indicator
  - `docs/engineering/audio_pipeline.md` **(NEW)** — Scaleway Whisper API key setup, EU residency rationale, SCCs reference, transcript field note
- **Sub-agent:** `feature-dev:code-architect`
- **Model tier:** Sonnet 4.6
- **Findings closed:** **G-06 (pipeline completion)**, audio pipeline gap from `INDEX.md` Phase 2 preview.
- **Deliverables:**
  - Record → upload → auto-transcribe flow works end-to-end in staging.
  - Transcript stored in `sessions.transcript`; displayed in `SessionDetailModal`.
  - Transcription retry available when auto-transcription fails.
  - EU residency documented.
- **Exit criteria:** upload a WAV file via `AudioRecorder`; within 60 s the session record shows a non-null `transcript` in French; `SessionDetailModal` displays the transcript; `transcribed_at` is set.
- **Depends on:** P1-Z (audio bucket + `audioService.js` base — merged). P2-A (purge function — so the new objects are covered by the purge schedule). Scaleway vendor confirmed (driver gate).
- **Parallelisable with:** P2-D, P2-G

---

### P2-F — Probative integrity: versioning + hash chain + `reports.vigilance` cast

- **Goal:** add object-level versioning on reports and invoices, a hash chain linking each version to its predecessor, a qualified-timestamp hook, and close the `reports.vigilance` jsonb→bytea cast deferred from P1-Z.
- **Files (exclusive):**
  - `supabase/migrations/<ts>_report_versions.sql` **(NEW)** — `report_versions(id uuid, report_id uuid, version int, content_hash text, signed_at timestamptz, previous_hash text, created_by uuid, created_at timestamptz)` + RLS (admin-read); trigger `before_report_update` that inserts a version row and rejects mutations to finalized reports
  - `supabase/migrations/<ts>_vigilance_cast.sql` **(NEW)** — cast `reports.vigilance jsonb → text → bytea`; re-apply vault encryption; idempotent; rollback documented
  - `supabase/migrations/<ts>_invoice_versions.sql` **(NEW)** — `invoice_versions(...)` same shape as report_versions, applied to the `invoices` table (depends on P2-D schema landing first — Wave 2 starts after Wave 1 merges)
  - `src/services/integrityService.js` **(NEW)** — `hashContent(data)` (SHA-256 via Web Crypto), `signReport(reportId)`, `verifyChain(reportId)`, optional `requestTimestamp(hash)` (freemium timestamping via freetsa.org)
  - `src/components/ReportIntegrityBadge.jsx` **(NEW)** — displays "Signé le [date] · Empreinte [hash[:8]]" badge on finalized reports
  - `src/pages/ClientDetailPage.jsx` — render `ReportIntegrityBadge` on each report card (read-only, coordinates with P2-H for query changes but files are separate)
  - `docs/engineering/probative_integrity.md` **(NEW)** — hash chain algorithm, qualified timestamping rationale, key rotation, legal reference (Art. L212-3 C. com., Art. 1366-1367 C. civ.)
- **Sub-agent:** `feature-dev:code-architect`
- **Model tier:** Sonnet 4.6
- **Findings closed:** **P1-Z carry-over** (`reports.vigilance` cast), probative integrity gap from `INDEX.md` Phase 2 preview.
- **Deliverables:**
  - Every report finalization creates a `report_versions` row with a SHA-256 hash of the content and a link to the previous hash.
  - `verifyChain(reportId)` returns `true` if the chain is unbroken.
  - `reports.vigilance` encrypted at rest in Vault (cast migration applied).
  - `ReportIntegrityBadge` visible on finalized reports in the UI.
- **Exit criteria:** update a finalized report → trigger rejects update OR creates a new version row; `verifyChain()` returns `true` on an unmodified chain and `false` after a direct SQL update bypassing the trigger; `SELECT data_type FROM information_schema.columns WHERE table_name='reports' AND column_name='vigilance'` returns `bytea`.
- **Depends on:** P1-Z (vault + encryption migrations — merged). P2-D must merge first for `invoice_versions` to have the correct `invoices` schema.
- **Parallelisable with:** P2-H, P2-J (within Wave 2)

---

### P2-G — Structured logging migration (OTel / Better Stack)

- **Goal:** replace `reportError` console transport with structured, correlated logs shipped to an observability backend (Better Stack recommended for French-language ops; OTel-compatible).
- **Files (exclusive):**
  - `package.json` — add `@logtail/browser` (Better Stack browser SDK) or equivalent OTel-compatible logger
  - `src/lib/errorReporter.js` — swap console transport for structured JSON emitter; preserve PII masking; add `correlation_id` (UUID per user session, stored in sessionStorage); format `{ level, message, correlation_id, user_id_hash, route, extra, timestamp }`
  - `src/lib/logger.js` **(NEW)** — thin wrapper: `logger.info()`, `logger.warn()`, `logger.error()` — always structured, always includes `correlation_id`; dev mode pretty-prints, prod ships to backend
  - `src/main.jsx` — init logger with Better Stack `sourceToken` from env; call before Sentry init
  - `.github/workflows/ci.yml` — add `LOGTAIL_SOURCE_TOKEN` secret reference to build step (or equivalent)
  - `docs/engineering/observability.md` **(NEW)** — log format spec, correlation ID convention, Better Stack dashboard setup, alert rules (error-rate spike, purge failures)
- **Sub-agent:** `general-purpose`
- **Model tier:** Haiku 4.5 (config/doc-heavy migration, mechanical transport swap)
- **Findings closed:** structured logging gap from `INDEX.md` Phase 2 preview / `PHASE1_PLAN.md` §6.
- **Deliverables:**
  - Every `reportError()` call emits a structured log to Better Stack (or chosen backend) with `correlation_id`.
  - Dev mode: pretty-printed `console.debug` output unchanged.
  - `docs/engineering/observability.md` includes alert-rule examples.
  - `npm run lint` passes; no remaining raw `console.error` calls in service files.
- **Exit criteria:** force an error in staging → Better Stack receives a structured JSON log with `correlation_id`, `user_id_hash`, `route`; no plaintext `console.error` remains in `src/services/`; `npm run lint` green.
- **Parallelisable with:** P2-D, P2-E
- **Note on `.env.example`:** P2-D owns `.env.example` in Wave 1. P2-G env vars (`VITE_LOGTAIL_SOURCE_TOKEN`) must be added manually after Wave 1 merges, or coordinated via a driver-controlled post-merge commit.

---

### P2-H — Route-aware prefetch + optimistic mutations

- **Goal:** replace `loadData()` after every mutation with optimistic local-state patches; add react-router loaders/defer for route-aware prefetch; close P-02 (the scalability bomb).
- **Files (exclusive):**
  - `src/context/DataContext.jsx` — replace `await loadData()` in all 20 mutation methods with per-entity `setState(prev => prev.map/concat/filter(...))`; keep `loadData()` as a fallback for cascade-affecting deletes only
  - `src/services/dataService.js` — ensure all mutation methods return the updated row (already true for most; verify and align)
  - `src/services/allianceService.js` — replace N+1 UPDATE loop with `supabase.from('clients').update(...).in('id', [...])` (P-06 fix)
  - `src/App.jsx` — add react-router `loader` functions for `/dashboard`, `/clients`, `/finances` routes; use `defer()` for non-critical data
  - `src/pages/DashboardPage.jsx`, `src/pages/ClientsPage.jsx`, `src/pages/FinancesPage.jsx` — consume `useLoaderData()` / `Await` instead of pulling from DataContext for initial render
  - `src/pages/AdminPage.jsx` — add `loading="lazy" referrerPolicy="no-referrer" decoding="async"` to therapist avatar `<img>` tags (P-11 fix)
- **Sub-agent:** `feature-dev:code-architect` (optimistic update pattern + loader wiring) → `code-simplifier` (mutation sweep)
- **Model tier:** Sonnet 4.6
- **Findings closed:** **P-02** (full), **P-06**, **P-08** (partial — core split done in P2-C; this adds loaders), **P-11**.
- **Deliverables:**
  - Single-row mutations (updateClient, updateSession, updateContact, createSession, createClient, createContact, updateProfessional) use optimistic local-state update; no `loadData()` call.
  - Alliance batch-delete replaces N+1 loop with one bulk UPDATE.
  - Dashboard and ClientsPage route loaders fire in parallel with React render.
  - Avatar `<img>` tags have `loading="lazy"`.
- **Exit criteria:** "Mark session paid" click triggers zero Supabase `SELECT` queries (only the UPDATE); Network tab shows no `loadData` fan-out; alliance batch-delete of 5 sessions issues exactly 1 `UPDATE` + 1 `DELETE` query; Lighthouse performance score on `/dashboard` ≥ 85.
- **Depends on:** P2-C must merge first (CoreDataProvider split changes the DataContext shape that P2-H patches).
- **Parallelisable with:** P2-F, P2-J

---

### P2-I — E2E Playwright smoke suite

- **Goal:** cover the 7 Phase 1 smoke flows from `phase1_verification.md` §3 with automated Playwright tests, replacing the "Requires staging" status for 5 of the 7.
- **Files (exclusive):**
  - `playwright.config.ts` **(NEW)** — base URL, screenshot-on-failure, CI reporter
  - `e2e/auth.spec.ts` **(NEW)** — login → dashboard flow; idle timeout simulation (mock timer); TOTP admin gate
  - `e2e/export.spec.ts` **(NEW)** — export dossier → confirm modal → XLSX download → watermark header present
  - `e2e/ai-transparency.spec.ts` **(NEW)** — AI-generated report → transparency banner visible → export blocked without `reviewed_at`
  - `e2e/dsar.spec.ts` **(NEW)** — admin opens DSAR ticket → route renders → zero tickets shown initially
  - `e2e/performance.spec.ts` **(NEW)** — `clients_with_stats` query latency assertion (Supabase mock or real staging)
  - `e2e/signup-gate.spec.ts` **(NEW)** — ADELI/RPPS sign-up blocked; waitlist insert (depends on P2-B landing)
  - `e2e/audio.spec.ts` **(NEW)** — upload WAV → transcript appears (depends on P2-E landing; test is skipped if `VITE_SCALEWAY_API_KEY` not set)
  - `.github/workflows/ci.yml` — add Playwright E2E job (only on push to `main` + PRs touching `src/` or `e2e/`)
  - `package.json` — add `@playwright/test`
- **Sub-agent:** `general-purpose`
- **Model tier:** Sonnet 4.6
- **Findings closed:** closes all 7 smoke-test items in `phase1_verification.md` §3 (replaces "Requires staging" with automated verification).
- **Deliverables:**
  - 7 spec files covering all smoke scenarios.
  - CI job green on `main` (auth, export, AI transparency, DSAR). Audio + signup-gate specs skip gracefully if env vars absent.
  - Screenshots on failure stored as CI artifacts.
- **Exit criteria:** `npx playwright test` exits 0 on staging env with live Supabase; CI Playwright job passes; `audit/phase1_verification.md` §3 smoke-test table status updated to ✅ for all 5 automatable items.
- **Depends on:** P2-B (signup gate), P2-E (audio) — specs are gated by env vars so the suite still runs without these tracks. P2-K (Sentry sourcemap) for the observability assertion.
- **Parallelisable with:** P2-K, P2-L

---

### P2-J — Test coverage ratchet (first unit + integration baseline)

- **Goal:** establish the first unit and integration test baseline for the app (zero tests today); add a coverage ratchet to CI that fails if coverage drops below the committed baseline.
- **Files (exclusive):**
  - `vitest.config.ts` **(NEW)** — Vitest config with jsdom, coverage provider `v8`, exclude `e2e/`
  - `src/services/__tests__/dataService.test.ts` **(NEW)** — unit tests for `getClients` column shortlist, `getReports` (no cross-join), `getDashboardClients` view query
  - `src/services/__tests__/integrityService.test.ts` **(NEW)** — `hashContent()`, `verifyChain()` with mocked Supabase (depends on P2-F landing; test is written but skipped if P2-F not merged)
  - `src/lib/__tests__/errorReporter.test.ts` **(NEW)** — PII masking unit tests (no email, no address fields in payload)
  - `src/lib/__tests__/logger.test.ts` **(NEW)** — correlation_id present, structured format
  - `src/context/__tests__/DataContext.test.tsx` **(NEW)** — optimistic mutation patches: updateClient, createSession, deleteContact
  - `.github/workflows/ci.yml` — add coverage threshold step: `--coverage --coverage-threshold='{"lines":60}'`
  - `package.json` — add `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`
- **Sub-agent:** `general-purpose`
- **Model tier:** Sonnet 4.6
- **Findings closed:** **C-03 (partial — test runner now exists)**; establishes ratchet from 0 % → 60 % line coverage on the tested modules.
- **Deliverables:**
  - `npm test` runs and exits 0.
  - Coverage report generated; ≥ 60 % lines on `src/services/`, `src/lib/`, `src/context/`.
  - CI fails if coverage drops below the threshold.
- **Exit criteria:** `npm test -- --coverage` green; CI coverage job passes on `main`; `vitest.config.ts` committed.
- **Depends on:** P2-C (provider split changes DataContext shape; tests target the final shape). P2-G (logger tests require the new `logger.js`). P2-H (optimistic mutation tests require the patched DataContext).
- **Parallelisable with:** P2-F, P2-H (within Wave 2)

---

### P2-K — Sentry source-map upload verification

- **Goal:** verify and complete the Sentry source-map upload pipeline that P1-Q said "enable" but marked ⚠️ as "requires `SENTRY_AUTH_TOKEN` in CI secrets" — confirm wired end-to-end and update `evidence_pack.md` with EU region confirmation.
- **Files (exclusive):**
  - `vite.config.js` — verify Sentry vite plugin config; add `authToken: process.env.SENTRY_AUTH_TOKEN`, `org`, `project`, `release` fields
  - `.github/workflows/ci.yml` — add `SENTRY_AUTH_TOKEN` secret usage in build step; add a post-deploy step that calls `npx @sentry/cli releases finalize`
  - `docs/compliance/evidence_pack.md` — update Sentry row: confirm EU region (`sentry.io` → `de.sentry.io` if EU), add source-map upload verification date
  - `docs/engineering/sentry_setup.md` **(NEW)** — region selection rationale, source-map upload config, EU data-residency proof (screenshot location in `docs/compliance/screenshots/`), alert rules
- **Sub-agent:** `general-purpose`
- **Model tier:** Haiku 4.5 (config verification + doc update)
- **Findings closed:** **P1-Q carry-over** (Sentry source-map), `phase1_verification.md` §5 item 6 (EU region confirmation).
- **Deliverables:**
  - `SENTRY_AUTH_TOKEN` secret documented in `sentry_setup.md` (not committed).
  - CI build uploads source maps; Sentry release visible in dashboard with correct file associations.
  - `evidence_pack.md` updated with EU region confirmation.
- **Exit criteria:** a CI PR build creates a Sentry release visible in the dashboard; stack traces in Sentry map to source lines; `evidence_pack.md` Sentry row shows EU region confirmed.
- **Depends on:** P1-Q (ci.yml + vite.config.js — merged). No Phase 2 track dependencies.
- **Parallelisable with:** P2-I, P2-L

---

### P2-L — RGAA declaration + schéma pluriannuel *(propose — driver confirmation required)*

> **Conditional track.** Only dispatch if the driver confirms that commercial contracts with public-sector or publicly funded clients (mutuelles, associations) require a formal RGAA accessibility declaration. Do NOT dispatch without this confirmation.

- **Goal:** produce and publish the formal RGAA 4.1 accessibility declaration and the multi-year accessibility improvement schedule ("schéma pluriannuel"), as required by commercial partners requesting RGAA conformance evidence.
- **Files (exclusive):**
  - `src/pages/public/AccessibilitePage.jsx` — update the conformance statement from Phase 1's "partielle" to include the formal declaration structure (RGAA Art. 47 format): date de l'audit, liste des pages auditées, taux de conformité global, liste des non-conformités restantes
  - `docs/accessibility/declaration_rgaa.md` **(NEW)** — formal RGAA 4.1 declaration in French: scope, pages tested, conformance rate, non-conformances list, contact for accessibility issues, date of next audit
  - `docs/accessibility/schema_pluriannuel_2026-2028.md` **(NEW)** — 3-year plan: 2026 (Phase 1 + Phase 2 fixes), 2027 (inline-style reduction, remaining modals), 2028 (full AA conformance, NVDA/VoiceOver test campaign)
  - `docs/MA_CHARTE_GRAPHIQUE.md` — add note linking to the schéma pluriannuel (coordinates with Phase 1 P1-V update already landed)
- **Sub-agent:** `general-purpose`
- **Model tier:** Haiku 4.5 (documentation + legal text, French)
- **Findings closed:** **A-item 29** from `audit/07_accessibility.md` (RGAA declaration), R-08 (accessibility statement).
- **Deliverables:**
  - `/accessibilite` public page shows a legally compliant RGAA 4.1 declaration.
  - `docs/accessibility/schema_pluriannuel_2026-2028.md` published.
  - Declaration includes contact email for accessibility complaints.
- **Exit criteria:** `/accessibilite` route renders the declaration with date, pages tested, and schéma pluriannuel link; French text reviewed and approved by driver; no broken links in the declaration.
- **Depends on:** P2-I (E2E Playwright) landing gives a more accurate conformance rate to quote in the declaration. Can be dispatched with Phase 1's A-09..A-40 data as the baseline if P2-I is delayed.
- **Parallelisable with:** P2-I, P2-K

---

## 3 · Dispatch prompts

Dispatch each track via:

```python
Agent(
    subagent_type="feature-dev:code-architect",   # or general-purpose / code-simplifier
    prompt="""
    ## Track P2-X — <Title>

    **Goal:** <one-sentence goal from §2>

    **Exclusive file list** (do NOT modify files outside this list):
    <paste file list verbatim from §2>

    **Findings to close:** <codes>

    **Deliverables:**
    <paste deliverables verbatim from §2>

    **Exit criteria:**
    <paste exit criteria verbatim from §2>

    **Dependencies:** <depends on text>

    **References:**
    - audit/PHASE2_PLAN.md §P2-X
    - audit/phase1_verification.md §4 (deviations)
    - audit/PHASE2_FACTURX_PLAN.md (for P2-D only)
    - docs/compliance/hds_decision.md §4 (for P2-B only)
    - supabase/migrations/20260422103300_audio_bucket.sql (for P2-A/E)

    **MCP guardrails:** All DB migrations must follow the guardrails in
    audit/PHASE2_PLAN.md §0 verbatim (read before write, rollback block, no DROP without
    dry-run SELECT, IF NOT EXISTS, confirm extensions).

    **Commit style:** use `feat(audio):`, `feat(compliance):`, `feat(perf):`,
    `fix(integrity):`, `feat(logging):`, `test(e2e):` etc. Do not touch files outside
    the exclusive list. Do not run `npm install` unless `package.json` changed.

    Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
    """,
    isolation="worktree",
)
```

For live-DB tracks (P2-A, P2-B, P2-D, P2-E, P2-F), add to the prompt:

```
**Supabase MCP binding:** ncjdvohafipisjcslrkk (same as Phase 1).
Follow guardrails in audit/PHASE2_PLAN.md §0 verbatim.
```

---

## 4 · Waves for parallel execution

### Wave 0 — Carry-overs (fast, unblocks downstream)

Small, self-contained, no shared files. Run all three in parallel. Wave 0 must fully merge before Wave 2 dispatches (P2-H depends on P2-C; P2-F depends on P2-D for invoice_versions schema).

| Wave | Track | Model | Sub-agent | Files touched (summary) | Conflicts with |
|------|-------|-------|-----------|-------------------------|----------------|
| 0 | P2-A | Sonnet 4.6 | general-purpose | `supabase/functions/purge-old-audio/`, 1 migration, 1 doc | none |
| 0 | P2-B | Sonnet 4.6 | feature-dev:code-architect | `LoginPage.jsx`, `SignupGateModal.jsx`, 1 migration, `waitlistService.js`, 1 doc | none |
| 0 | P2-C | Sonnet 4.6 | feature-dev:code-architect | `CoreDataContext.jsx`, `ExtendedDataContext.jsx`, `DataContext.jsx` (shim), `App.jsx`, 1 migration, `dataService.js` | none |

**Rationale:** These three tracks have fully disjoint file sets and no shared DB schema overlap. P2-A touches only Edge Function files. P2-B touches only the signup flow and a new `waitlist` table. P2-C touches only DataContext internals and the `clients_with_stats` view. Running them in parallel saves ~3 days of wall-clock time.

**How to fire Wave 0:**

```python
# Fire all three Wave 0 agents simultaneously
for track in ["P2-A", "P2-B", "P2-C"]:
    Agent(
        subagent_type=AGENTS[track]["subagent"],
        prompt=build_prompt(track),
        isolation="worktree",
    )
```

---

### Wave 1 — Headline items (largest; run after Wave 0 merges)

P2-D, P2-E, P2-G are the three biggest tracks. Their file sets are fully disjoint: P2-D owns the invoice layer + `.env.example`; P2-E owns Edge Functions for transcription + `audioService.js` + `AudioRecorder.jsx` + `SessionDetailModal.jsx` (audio section only); P2-G owns `errorReporter.js` + `logger.js` + `main.jsx` (logger init only, not App auth). `.env.example` is owned by P2-D in this wave; P2-E and P2-G env vars are added manually post-merge.

| Wave | Track | Model | Sub-agent | Files touched (summary) | Conflicts with |
|------|-------|-------|-----------|-------------------------|----------------|
| 1 | P2-D | Sonnet 4.6 | feature-dev:code-architect | 2 migrations, `invoiceService.js`, `pdpService.js`, `pdfService.js`, `FinancesPage.jsx`, `InvoiceFormModal.jsx`, `ReceivedInvoicesList.jsx`, `.env.example`, 1 doc | none within wave |
| 1 | P2-E | Sonnet 4.6 | feature-dev:code-architect | `supabase/functions/transcribe-audio/`, 1 migration, `audioService.js`, `SessionDetailModal.jsx` (audio section), `AudioRecorder.jsx`, 1 doc | none within wave |
| 1 | P2-G | Haiku 4.5 | general-purpose | `package.json` (logging dep only), `errorReporter.js`, `logger.js`, `main.jsx` (logger init), `.github/workflows/ci.yml` (secret ref only), 1 doc | none within wave |

**Rationale:** P2-D is the highest-priority item (hard deadline 2026-09-01). Running it in parallel with P2-E and P2-G means the Factur-X work is not serialised behind the transcription or logging work. The three tracks have genuinely disjoint file ownership: P2-D owns `invoiceService.js` and `FinancesPage.jsx`; P2-E owns `audioService.js` and `SessionDetailModal.jsx` (only the audio recorder section — no modal structure overlap with P2-H's DataContext mutations); P2-G owns `errorReporter.js` and `logger.js`.

**Note:** `SessionDetailModal.jsx` is listed under P2-E (audio panel section only). P2-H also needs to access `DataContext.jsx` and `App.jsx`. These files do not overlap; the coordination note is: P2-E adds a new section to the modal; P2-H does not touch `SessionDetailModal.jsx`.

**How to fire Wave 1:**

```python
# Fire all three Wave 1 agents simultaneously, after Wave 0 PRs merge
for track in ["P2-D", "P2-E", "P2-G"]:
    Agent(
        subagent_type=AGENTS[track]["subagent"],
        prompt=build_prompt(track),
        isolation="worktree",
    )
```

---

### Wave 2 — Quality + performance (run after Wave 0 + Wave 1 merge)

P2-F, P2-H, P2-J are parallelisable. P2-F depends on P2-D schema (invoice_versions). P2-H depends on P2-C (DataContext split). P2-J depends on P2-C + P2-G + P2-H for the final code shape of the modules under test.

| Wave | Track | Model | Sub-agent | Files touched (summary) | Conflicts with |
|------|-------|-------|-----------|-------------------------|----------------|
| 2 | P2-F | Sonnet 4.6 | feature-dev:code-architect | 3 migrations, `integrityService.js`, `ReportIntegrityBadge.jsx`, `ClientDetailPage.jsx` (badge render), 1 doc | none within wave |
| 2 | P2-H | Sonnet 4.6 | feature-dev:code-architect → code-simplifier | `DataContext.jsx`, `dataService.js`, `allianceService.js`, `App.jsx` (loaders), `DashboardPage.jsx`, `ClientsPage.jsx`, `FinancesPage.jsx` (loader consume), `AdminPage.jsx` (avatar lazy) | none within wave |
| 2 | P2-J | Sonnet 4.6 | general-purpose | `vitest.config.ts`, `src/**/__tests__/*.test.{ts,tsx}` (NEW), `package.json` (test deps), `.github/workflows/ci.yml` (coverage step) | none within wave |

**Rationale:** P2-F touches only migration files and two new components. P2-H touches DataContext + service files + route loaders. P2-J touches only test files and vitest config. No file overlaps within this wave. P2-H's `FinancesPage.jsx` changes (loader consumption) do not conflict with P2-D's `FinancesPage.jsx` changes (reception inbox UI) because they are in separate worktrees from Wave 1; the merge resolution at wave boundary is the known conflict point (see §5).

**How to fire Wave 2:**

```python
for track in ["P2-F", "P2-H", "P2-J"]:
    Agent(
        subagent_type=AGENTS[track]["subagent"],
        prompt=build_prompt(track),
        isolation="worktree",
    )
```

---

### Wave 3 — Polish + conditional (run after Wave 2 merges)

P2-I, P2-K, P2-L are independent of each other. P2-I benefits from P2-B and P2-E being merged (signup-gate and audio specs), but its CI job skips gracefully if env vars are absent. P2-L should only be dispatched after driver confirmation.

| Wave | Track | Model | Sub-agent | Files touched (summary) | Conflicts with |
|------|-------|-------|-----------|-------------------------|----------------|
| 3 | P2-I | Sonnet 4.6 | general-purpose | `playwright.config.ts`, `e2e/*.spec.ts` (NEW), `package.json` (playwright dep), `.github/workflows/ci.yml` (E2E job) | none within wave |
| 3 | P2-K | Haiku 4.5 | general-purpose | `vite.config.js` (Sentry fields), `.github/workflows/ci.yml` (sourcemap step), `evidence_pack.md`, `docs/engineering/sentry_setup.md` | none within wave |
| 3 | P2-L *(conditional)* | Haiku 4.5 | general-purpose | `AccessibilitePage.jsx`, `docs/accessibility/declaration_rgaa.md`, `docs/accessibility/schema_pluriannuel_2026-2028.md`, `MA_CHARTE_GRAPHIQUE.md` | none within wave |

**Rationale:** The three tracks are fully independent. P2-K is mechanical config verification. P2-I writes only test files. P2-L writes only documentation and updates the public accessibility page. Dispatch all three in parallel (P2-L only if driver confirms).

---

## 5 · Merge order

### Within each wave: merge in parallel (all PRs can land simultaneously)

**Wave 0 → Wave 1 boundary:** No conflicts expected. Wave 0 does not touch any file that Wave 1 touches. However, verify `DataContext.jsx` after P2-C lands — Wave 1 tracks must branch from `main` *after* P2-C merges so they see the new context shape.

**Wave 1 → Wave 2 boundary:** Expected conflict on `FinancesPage.jsx`. P2-D adds the reception inbox tab; P2-H adds route loaders for the finances route. Resolution: P2-H's agent must rebase onto the Wave 1 `main` and update the loader to wrap the P2-D reception inbox in `defer()`. This is a known, small conflict. Assign a driver slot (~30 min) to resolve before dispatching Wave 2.

Wave 1 also introduces the renamed `invoiceService.js` (from `billingReminderService.js`). P2-F's `invoice_versions` migration must reference the final `invoices` table name from P2-D — verify before P2-F dispatch.

**Wave 2 → Wave 3 boundary:** P2-J adds a Vitest coverage threshold to `.github/workflows/ci.yml`. P2-K adds a Sentry sourcemap step to the same file. P2-I adds a Playwright job to the same file. All three are additive (new job definitions), so git auto-merge should succeed. Verify CI runs all three new jobs without interference.

### Linear merge recommendation within each wave

| Order | Track | Why |
|-------|-------|-----|
| Wave 0.1 | P2-A | No deps; small; Edge Functions deploy first |
| Wave 0.2 | P2-B | No deps; gate closes before P2-D opens sign-ups |
| Wave 0.3 | P2-C | No deps; must merge before Wave 1 dispatch |
| Wave 1.1 | P2-G | Smallest Wave 1 track; logging foundation for P2-J tests |
| Wave 1.2 | P2-D | Hard-deadline track; merge second so schema is stable for P2-F |
| Wave 1.3 | P2-E | No Wave 2 dependency; can merge last in Wave 1 |
| Wave 2.1 | P2-J | Test baseline first; CI failures surface early |
| Wave 2.2 | P2-F | Probative integrity on stable schema from P2-D |
| Wave 2.3 | P2-H | Optimistic mutations last (touches most files) |
| Wave 3.1 | P2-K | Sentry; wires into CI before Playwright |
| Wave 3.2 | P2-I | E2E specs; runs after Sentry is wired |
| Wave 3.3 | P2-L | Conditional; last and optional |

---

## 6 · Phase 2 verification

Produce `audit/phase2_verification.md` mirroring `phase1_verification.md`. Template:

### Per-track summary table (to fill in)

| Track | Title | Commit | Exit criteria status | Notes |
|-------|-------|--------|----------------------|-------|
| P2-A | Audio purge Edge Function | — | — | — |
| P2-B | ADELI/RPPS sign-up gate | — | — | — |
| P2-C | CoreDataProvider split + view | — | — | — |
| P2-D | Factur-X / PDP integration | — | — | — |
| P2-E | Audio pipeline end-to-end | — | — | — |
| P2-F | Probative integrity | — | — | — |
| P2-G | Structured logging | — | — | — |
| P2-H | Optimistic mutations + prefetch | — | — | — |
| P2-I | E2E Playwright smoke | — | — | — |
| P2-J | Test coverage ratchet | — | — | — |
| P2-K | Sentry sourcemap verification | — | — | — |
| P2-L | RGAA declaration | — | — | *(conditional)* |

### Smoke tests

| # | Smoke test | Target track |
|---|-----------|--------------|
| 1 | Audio purge Edge Function invoked manually → `audit_log` row created; no Storage objects older than 30 days remain. | P2-A |
| 2 | Sign up with "Oui" (ADELI/RPPS) → no `users` row created; `waitlist` row present. | P2-B |
| 3 | `/dashboard` renders with ≤ 2 Supabase queries in Network tab. | P2-C |
| 4 | POST to PDP webhook endpoint → row in `received_invoices`; PDF generated with sequential invoice number and embedded Factur-X XML. | P2-D |
| 5 | Upload WAV → transcript visible in `SessionDetailModal` within 60 s. | P2-E |
| 6 | Finalize a report → `report_versions` row created; `verifyChain()` returns `true`; direct SQL update rejected by trigger. | P2-F |
| 7 | Force error in staging → Better Stack receives structured JSON log with `correlation_id`. | P2-G |
| 8 | "Mark session paid" → zero `SELECT` queries in Network tab (only the UPDATE). | P2-H |
| 9 | `npx playwright test` exits 0 on staging. | P2-I |
| 10 | `npm test -- --coverage` exits 0; coverage ≥ 60 % on `src/services/` + `src/lib/` + `src/context/`. | P2-J |
| 11 | CI build creates Sentry release; stack traces map to source lines; `evidence_pack.md` shows EU region confirmed. | P2-K |
| 12 | `/accessibilite` renders formal RGAA 4.1 declaration with date and schéma pluriannuel link. | P2-L *(conditional)* |

### Known deviations template

| Track | Deviation | Detail |
|-------|-----------|--------|
| *(to fill in during verification)* | | |

---

## 7 · Phase 3 preview

- **Audio pipeline v2:** real-time diarisation (speaker separation for couple sessions), keyword extraction, auto-populated session notes draft. Requires LLM vendor selection (SCCs + DPA chain).
- **RGPD annual review (April 2027):** re-run DPIA against updated RoPA; confirm HDS decision remains valid; verify DPAs renewed with all subprocessors; update `evidence_pack.md`.
- **Penetration test:** external PT before first 100-user milestone. Focus on RLS bypass, Vault key extraction, PDP webhook authentication.
- **SOC 2 Type I lite audit:** if commercial enterprise contracts require it. Scope: access control (P1-O, P2-B), audit logging (P1-N, P2-G), data retention (P1-R), incident response runbook.
- **HDS path:** if Kotech decides to open to regulated professionals (psychologues, psychothérapeutes), migrate hosting to an HDS-certified provider (OVHcloud Healthcare, Scaleway Healthcare, Clever Cloud HDS), replace the ADELI/RPPS gate with a routing flow, update DPAs and CGU.

---

*Plan authored 2026-04-22. Mirrors the structure of `PHASE1_PLAN.md`. Tracks P2-A through P2-L are grounded in `phase1_verification.md` §4 deviations, `audit/INDEX.md` Phase 2 preview, `audit/03_performance.md` §P2 items 11-12, `audit/07_accessibility.md` §Phase 3 item 29, `docs/compliance/hds_decision.md` §4, and `audit/PHASE2_FACTURX_PLAN.md`.*
