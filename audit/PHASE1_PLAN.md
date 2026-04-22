# CoachCRM — Phase 1 Implementation Plan

**Companion docs:** [`INDEX.md`](INDEX.md), [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) (Phase 0), [`live_db_verification_2026-04-21.md`](live_db_verification_2026-04-21.md), domain reports `01_*.md` … `07_*.md`.

**Goal:** close the ~94 residual (Phase‑1) findings across the 7 dimensions after Phase 0 lands. Scope mirrors Phase 0's track-decomposed execution: disjoint file sets, worktree-per-track, one PR per track.

**Countdown context (today 2026‑04‑21):** T‑103 days to EU AI Act Art. 50 (R‑06, 2026‑08‑02), T‑133 days to Factur‑X reception (R‑04, 2026‑09‑01).

---

## 0 · Known state / landmines

- **Phase 0 is not fully merged.** As of 2026‑04‑21, only Tracks B (frontend security) and H (legal pages) have landed on branch `audit/track-B-frontend-security`. Tracks A, C, D, E, F, G, I, J, M are still open. Many Phase‑1 tracks **hard‑depend** on Phase‑0 foundations — see the dependency column of the catalogue below.
- **Branching strategy:** Phase‑1 tracks must branch from `main` **after** the relevant Phase‑0 tracks merge. Do **not** base Phase‑1 work on the in‑flight `audit/track-B-frontend-security` branch.
- **MCP binding** still requires the same Supabase MCP rebinding (`ncjdvohafipisjcslrkk`) documented in Phase 0 §0bis. All destructive rules carry over verbatim.
- **Live DB v. `migration.sql` drift** documented in `live_db_verification_2026-04-21.md` is the source of truth. Do not assume the repo's `migration.sql` reflects production.
- **R‑04 / R‑06 are hard deadlines.** Tracks P1‑S (AI Act) and P1‑T (Factur‑X) gate public launch; schedule them first on the calendar even if they're not first in the merge order.
- **Human‑led gates** inside Phase 1: HDS decision (R‑07), DPA chain (G‑09), DPIA signoff (G‑04 completion), PDP vendor choice (R‑04). Tracks P1‑Y and P1‑T bundle these.
- **Accessibility naming:** Phase‑0 Track I closes A‑01..A‑08 (Critical). Phase‑1 Track P1‑V closes A‑09..A‑40 (High/Medium/Low).
- **Duplicate closures to avoid:** some §5 bullets are already in Phase 0 — `deleted_at` filter on `getClients` (Track F), `family` pricing (Track F), hook-order in `SessionDetailModal` (Track I will do it while adding focus trap). Do not re‑do in Phase 1.
- **File ownership discipline.** Each track lists an **exclusive file set**. Agents must not touch files outside their set even when the change seems obvious — cross‑track edits serialise into merge conflicts fast.

---

## 1 · Execution strategy at a glance

```
                         Phase 0 fully merged (A, C, D, E, F, G, I, J, M all green)
                                            │
            ┌───────────────────────────────┼──────────────────────────────────────┐
            ▼                               ▼                                      ▼
         P1-N                             P1-U                                   P1-Y
   observability                     code-quality                         DPIA · RoPA ·
   (Sentry + audit_log)              (constants, logs,                   DPA chain · HDS
   (1-2 d)                            hook fixes, README)                 (human-led, 2-3 d)
            │                         (2 d)                                      │
            ▼                                                                    ▼
         P1-P                             P1-V                                 P1-Z
   secure exports                    accessibility P1                       PHI encryption
   (XLSX ACL + audit)                 (A-09..A-40)                          (gated on HDS)
   (1 d)                              (2-3 d)                                (3-4 d)
            │
            ▼
         P1-O                             P1-W                                 P1-S
   auth hardening                    performance P1                         AI Act Art. 50
   (idle timeout, MFA,               (route-aware DP, CSS                   (deadline 2026-08-02)
   domain allowlist)                  dedup, mega-page                      (2 d code + legal)
   (2 d)                              splits, memoise) (3-4 d)
                                            │
         P1-Q                               │                                P1-T
   supply chain                             ▼                             Factur-X scoping
   (npm audit, Lighthouse,              P1-X                              (deadline 2026-09-01)
   axe, branch protect)              DB integrity                          (1 d scope + vendor call)
   (1 d)                              (UUIDs, TIMESTAMPTZ,
                                       indexes, retire
                                       dead tables)
         P1-R                          (1-2 d)
   retention · DSAR
   (retention_policies table,
   pg_cron, DSAR backend,
   note-column cleanup)
   (3-4 d)
                                            │
                                            ▼
                                       Integration pass:
                                       /review + /security-review + /code-review:code-review
                                       per track
                                            │
                                            ▼
                                       audit/phase1_verification.md
```

**Wall-clock estimate:** ~4–6 engineer-weeks, ~2–3 weeks with 3–4 parallel agent slots. Legal-review cycle on P1‑T and P1‑Y is the likely long pole.

---

## 2 · Track catalogue

Track prefix `P1-` distinguishes Phase‑1 from Phase‑0's A–M. Each track names its **goal**, **exclusive files**, **sub-agent**, **skill**, **findings closed**, **deliverables**, **exit criteria**, **dependencies**.

### P1-N — Observability & Error Wrapper

- **Goal:** add Sentry, build a `reportError(err, context)` wrapper, add an `audit_log` table + RLS, replace 75 raw `console.*` calls with the wrapper, and start emitting security events (login, export, delete_client).
- **Files (exclusive):**
  - `package.json` (add `@sentry/react`, `@sentry/vite-plugin`)
  - `vite.config.js` (Sentry vite plugin for source maps — coordinate with P1‑Q bundle split if both live on different branches)
  - `src/main.jsx` (Sentry init before ReactDOM.render)
  - `src/lib/errorReporter.js` **(NEW)** — `reportError`, `reportEvent`, `captureBreadcrumb`, PII masking
  - `src/lib/auditLog.js` **(NEW)** — thin client for emitting `audit_log` events
  - `supabase/migrations/<ts>_audit_log.sql` **(NEW)** — `CREATE TABLE audit_log (id uuid, user_id uuid, entity text, entity_id uuid, action text, metadata jsonb, ip_address inet, created_at timestamptz default now())` + RLS (users read own, admins read all, service role inserts)
  - `src/services/dataService.js`, `src/services/invoiceService.js`, `src/services/allianceService.js`, `src/services/exportService.js`, `src/services/sponsorshipService.js` — mechanical `console.error` → `reportError` sweep; audit emissions on delete
  - `src/context/DataContext.jsx` — CRUD wrappers emit `audit_log` events on success
  - `.env.example` (add `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`)
- **Sub-agent:** `feature-dev:code-architect` (design the wrapper + audit event taxonomy) → `general-purpose` for the sweep.
- **Skill:** `code-review:code-review` + `security-review`.
- **Findings closed:** **S-13, M-01, M-02, R-12 (partial — only reads; full R‑12 coverage needs P1‑Z access_log).**
- **Deliverables:**
  - `reportError(err, { user, route, extra })` swallows in dev, forwards to Sentry in prod; strips PII (email, address, free-text fields) by key match.
  - `audit_log` table migration passes on a Supabase branch, idempotent (`IF NOT EXISTS`).
  - Every service call-site that previously did `console.error(...)` now calls `reportError(...)` with `{ operation, entity, entity_id }` context.
  - `DataContext` emits an `audit_log` row on successful `deleteClient`, `deleteSession`, `deleteReport`, and `exportClientDossier`.
  - ESLint rule `no-console` enabled (allows `warn`, `error` only); migrated codebase passes.
- **Exit criteria:** forced error on staging appears in Sentry with correct user/route metadata; `select count(*) from audit_log where action='delete_client'` increments on manual test; no console.log/console.info left.
- **Depends on:** Phase‑0 Track G (error-handling contract) must be merged so service-layer error paths are consistent. Also **Phase‑0 Track D** (baseline migration) so the new migration timestamp sorts correctly.

### P1-O — Auth hardening (idle timeout · MFA · domain lock)

- **Goal:** close the residual auth gaps beyond PKCE + allowlist. Add idle timeout, TOTP MFA for admin role, Google Workspace domain lock.
- **Files (exclusive):**
  - `src/lib/supabase.js` (JWT expiry settings)
  - `src/hooks/useIdleTimeout.js` **(NEW)**
  - `src/components/IdleWarningModal.jsx` **(NEW)**
  - `src/App.jsx` (mount `useIdleTimeout(30*60_000, showWarning 2m, forceLogout)`)
  - `src/pages/AdminPage.jsx` (TOTP enrollment + challenge flow)
  - `src/pages/LoginPage.jsx` (add `hd` parameter to Google OAuth when configured; exact canonical `redirectTo` URL, no `window.location.origin`)
  - `src/lib/mfa.js` **(NEW)** — Supabase MFA enroll/challenge helpers
  - `docs/admin-mfa-setup.md` **(NEW)**
- **Sub-agent:** `feature-dev:code-architect` + `general-purpose`.
- **Skill:** `security-review`.
- **Findings closed:** **S-08, S-11, S-14, M-07 (App.jsx stale-closure timeout in the same area).**
- **Deliverables:**
  - 30‑minute idle timeout with 2‑minute warning toast + active-session refresh on user interaction.
  - Admin-role login enforces a TOTP challenge; enrollment UI on AdminPage for existing admins.
  - Google OAuth `redirectTo` uses `VITE_APP_URL` env var, not runtime origin.
  - `hd=kotech.ai` (or `hd=*`) parameter set on Google OAuth when `VITE_GOOGLE_WORKSPACE_DOMAIN` configured.
- **Exit criteria:** leave app idle 30 min → forced logout + redirect to `/login`; admin user without TOTP enrolled cannot access `/admin`; login from non-whitelisted domain rejected server-side, not just client-side.
- **Depends on:** Phase‑0 Track B (PKCE + allowlist already landed) and Track C (admin RPC).

### P1-P — Secure XLSX exports

- **Goal:** any export of Art. 9 data is confirmed, watermarked, optionally password-protected, and logged.
- **Files (exclusive):**
  - `src/services/exportService.js`
  - `src/pages/ClientDetailPage.jsx` (confirmation modal before export)
  - `src/components/ExportConfirmModal.jsx` **(NEW)** — password option + consent checkbox
  - `src/lib/xlsxExport.js` **(NEW)** — wraps exceljs with watermark (therapist name + export timestamp in header row)
- **Sub-agent:** `general-purpose`.
- **Skill:** `security-review`.
- **Findings closed:** **S-10.**
- **Deliverables:**
  - Export flow: Confirm → (optional password) → generate → emit `audit_log(action='export_client_dossier')` via P1‑N → download.
  - XLSX header row: therapist email, export timestamp, "Document confidentiel — Art. 9 RGPD. Usage restreint au professionnel destinataire."
  - File name pattern: `dossier_<client-initials>_<YYYY-MM-DD>_<therapist-id-hash>.xlsx` (no full client name).
- **Exit criteria:** export requires explicit consent click; the XLSX opens with the watermark; `audit_log` row created with `entity='client'`, `entity_id=<uuid>`, `action='export_client_dossier'`.
- **Depends on:** **P1-N** (reportError + audit_log). Phase‑0 Track F (exceljs dynamic-import) should be merged first.

### P1-Q — Supply chain & CI hardening

- **Goal:** replace `file-saver`, add `npm audit` + Dependabot, Lighthouse CI, axe CI, protect `main`, enable Sentry source-map upload on build.
- **Files (exclusive):**
  - `package.json` (remove `file-saver`; replace with native Blob + `URL.createObjectURL` helper)
  - `src/lib/fileDownload.js` **(NEW)** — replaces file-saver calls
  - `src/services/exportService.js` (swap import)
  - `.github/workflows/ci.yml` (extend with `npm audit --production`, `lighthouse-ci`, `axe` job)
  - `.github/dependabot.yml` **(NEW)**
  - `lighthouserc.json` **(NEW)**
  - `vite.config.js` (explicit `manualChunks: { react, supabase, excel, icons }` if not done in Phase 0 Track F)
  - `docs/branch-protection.md` **(NEW)** — manual runbook, since GitHub branch protection is settings-only
- **Sub-agent:** `general-purpose`.
- **Skill:** `code-review:code-review`.
- **Findings closed:** **S-09, M-08, M-12.**
- **Deliverables:**
  - `npm ci && npm run lint && npm test && npm audit --production` all green on PR.
  - Lighthouse CI budget: first‑paint ≤ 300 KB gz, LCP < 2.5 s, CLS < 0.1 (pilot targets).
  - Dependabot opens weekly PRs for devDeps + security-patch PRs for runtime deps.
  - `main` requires 1 PR review + CI green.
- **Exit criteria:** a trivial PR runs all four CI jobs green; `npm ls file-saver` returns nothing; Sentry release events tie stack traces back to source maps.
- **Depends on:** **Phase‑0 Track J** (baseline CI). P1-N (for Sentry source map upload config).

### P1-R — Retention · DSAR · data‑minimisation

- **Goal:** implement the 12‑category retention policy, wire pg_cron purge jobs, build the DSAR intake + extraction backend, consolidate overlapping note columns, add UI minimisation guidance.
- **Files (exclusive):**
  - `supabase/migrations/<ts>_retention_policies.sql` **(NEW)** — `retention_policies(entity, regime, retention_months)` seed rows
  - `supabase/migrations/<ts>_retention_columns.sql` **(NEW)** — `ALTER TABLE … ADD COLUMN deleted_at, anonymized_at, retention_until` on `clients`, `sessions`, `reports`, `invoices`, `contacts`, `audio_recordings` (when P1‑Z adds it)
  - `supabase/migrations/<ts>_purge_job.sql` **(NEW)** — `pg_cron` monthly `purge_expired_data()` function + schedule
  - `supabase/migrations/<ts>_dsar_requests.sql` **(NEW)** — `dsar_requests(subject_email, request_type, status, raised_at, fulfilled_at)` + RLS (admin-only)
  - `supabase/migrations/<ts>_consolidate_notes.sql` **(NEW)** — deprecation migration for `note_dynamique` / `note_axes` / `note_vigilance` / `note_objectifs` (pick canonical set, backfill, drop obsolete) — **MUST** coordinate with doc update
  - `src/services/dsarService.js` **(NEW)** — therapist-facing DSAR workflow
  - `src/pages/admin/DsarRequestsPage.jsx` **(NEW)**
  - `src/components/DataMinimisationHint.jsx` **(NEW)** — tooltip rendered next to free‑text inputs handling sensitive data
  - `src/pages/ClientDetailPage.jsx`, `src/components/client/SessionDetailModal.jsx`, `src/pages/ClientsPage.jsx` — add hint component at free‑text input sites
  - `docs/retention_policy.md` **(NEW)** — canonical policy matrix; link from `/confidentialite`
  - `docs/MON_ARCHITECTURE_DONNEES.md` — update to reflect consolidated note columns (per project rules: doc + code together)
- **Sub-agent:** `feature-dev:code-architect` (policy + schema design) → `feature-dev:code-explorer` (audit free‑text sites) → `general-purpose` (edits).
- **Skill:** `review` + `code-review:code-review`.
- **Findings closed:** **R-03, G-08, G-09, G-10 (partial — encryption itself is in P1‑Z), deprecate-notes, H-3 (clients.phase guard).**
- **Deliverables:**
  - `purge_expired_data()` runs monthly; dry‑run preview available via RPC.
  - DSAR workflow: admin opens a ticket, system generates a zip of the subject's rows (access right) or triggers erasure + anonymisation (erasure right) per regime.
  - `docs/retention_policy.md` matches `/confidentialite` page copy.
  - Four note columns consolidated: pick either the `note_*` or `axes_travail/points_vigilance/objectifs/dynamique_relationnelle` names — the live DB has the `note_*` set, so back-fill the doc-named set from `note_*` then drop `note_*` OR vice versa. Driver decides; the migration is idempotent and reversible in a single release window.
- **Exit criteria:** calling `purge_expired_data(dry_run => true)` returns expected row counts; DSAR page shows zero tickets until first manual test; free‑text inputs render the `DataMinimisationHint`.
- **Depends on:** **Phase‑0 Track D** (baseline migration). P1‑N (audit_log for purge emissions).

### P1-S — EU AI Act Art. 50 transparency ⚠ **HARD DEADLINE 2026-08-02**

- **Goal:** every AI‑generated output is labelled, the model metadata is stored, therapist validation is required, the AI system card is published.
- **Files (exclusive):**
  - `supabase/migrations/<ts>_ai_metadata.sql` **(NEW)** — add to `reports`: `ai_generated bool`, `ai_metadata jsonb` (model, version, prompt_hash, temperature, generated_at), `reviewed_at timestamptz`, `reviewed_by uuid`
  - `src/components/AiTransparencyBanner.jsx` **(NEW)** — "✨ Généré par IA — vérifiez avant utilisation"
  - `src/components/AiReviewGate.jsx` **(NEW)** — blocks CR publication until therapist clicks "Validé"
  - `src/pages/ClientDetailPage.jsx` + `src/pages/ReportsPage.jsx` (wherever AI content renders) — render banners
  - `docs/AI_SYSTEM_CARD.md` **(NEW)** — purposes, risks, human oversight, training-data policy, EU vendor choice
  - `docs/dpia/ai_section.md` **(NEW — feeds into P1‑Y)**
  - `src/pages/public/ConfidentialitePage.jsx` — add AI-processing paragraph (content task, coordinate with legal)
  - `docs/legal/confidentialite.md` — same
- **Sub-agent:** `feature-dev:code-architect` (governance + UI pattern) → `general-purpose`.
- **Skill:** `review` + `code-review:code-review`.
- **Findings closed:** **R-06.**
- **Deliverables:**
  - Schema change ships; LLM call-sites (once they exist) must populate `ai_metadata`.
  - AI content in UI shows banner + "Validé par [therapist name] le [date]" footer.
  - Reports with `ai_generated=true` and `reviewed_at=null` are visually marked "Brouillon — en attente de validation" and excluded from exports.
  - `docs/AI_SYSTEM_CARD.md` reviewed by counsel.
- **Exit criteria:** no AI‑generated report can be exported, finalised, or shared without `reviewed_at` set; transparency banner renders on every AI output; system card published.
- **Depends on:** none for infra work. Legal review cycle (H‑0 equivalent — schedule early). **Track this on calendar against 2026-08-02.**

### P1-T — Factur-X scoping & billing-reminders rename ⚠ **HARD DEADLINE 2026-09-01**

- **Goal:** Phase 0.5 is the honesty move — rename `invoices` → `billing_reminders` until real compliance arrives. Phase 1 here is **scoping + PDP vendor decision + migration plan**.
- **Files (exclusive):**
  - `supabase/migrations/<ts>_rename_invoices_to_billing_reminders.sql` **(NEW)** — `ALTER TABLE invoices RENAME TO billing_reminders`; same for `invoice_sessions` → `billing_reminder_sessions`
  - `src/services/invoiceService.js` → `src/services/billingReminderService.js` (rename file + symbols)
  - `src/pages/FinancesPage.jsx` — user-visible label "Rappels de paiement" instead of "Factures"
  - `docs/compliance/factur-x_roadmap.md` **(NEW)** — PDP vendor comparison (Pennylane / Docaposte / Chorus), decision log, implementation estimate
  - `docs/compliance/invoice_content_gap.md` **(NEW)** — L441‑9 / 242 nonies A CGI gap against current schema
  - `audit/PHASE2_FACTURX_PLAN.md` **(NEW)** — the real implementation plan for Q3 2026 (Phase‑2 from INDEX.md)
- **Sub-agent:** `feature-dev:code-architect` (rename + gap analysis) → `general-purpose`.
- **Skill:** `code-review:code-review`.
- **Findings closed:** **R-04 (scoped, not implemented), R-05 (documented, not implemented).**
- **Deliverables:**
  - Rename migration + app-side symbol change. All "Facture" strings in UI become "Rappel de paiement" unless a real invoice generator replaces them.
  - PDP vendor decision recorded (or scheduled) in `compliance/factur-x_roadmap.md`.
  - Gap analysis in `invoice_content_gap.md` enumerates the 12 missing L441‑9 fields with file:line refs.
- **Exit criteria:** no UI string promises "facture" legal status until real implementation lands; PDP vendor decision recorded or scheduled for a decision meeting within 30 days.
- **Depends on:** Phase‑0 Track D (baseline). **Track this on calendar against 2026-09-01.**

### P1-U — Code quality (constants · logs · hooks · README)

- **Goal:** close the residual code-quality findings that are mechanical, low‑risk, and don't depend on Phase 0 data-layer tracks.
- **Files (exclusive):**
  - `src/lib/date.js` **(NEW)** — `MONTHS_FR`, `today()`, `todayIso()`, `formatDateShort`, `formatDateLong`
  - `src/lib/phases.js` **(NEW)** — canonical phase colour palette
  - `src/data/constants.js` — re-export from `src/lib/*` so call sites migrate gradually
  - `src/context/DataContext.jsx` — remove hard-coded phase-colour fallbacks (lines 132-138)
  - `src/pages/FinancesPage.jsx` (lines 21-25,33-46,64-73,75 — replace with imports)
  - `src/pages/AdminPage.jsx` (lines 39-48)
  - `src/pages/ClientsPage.jsx`, `src/pages/DeletedClientsPage.jsx:61-65`, `src/components/DuplicateAlert.jsx`
  - `src/data/helpers.js:55-63,80-85`
  - `src/pages/DashboardPage.jsx:29,58,140`, `src/services/exportService.js:92`, `src/services/dataService.js:62,277,310`, `src/services/invoiceService.js:49` — replace `new Date().toISOString().split('T')[0]` with `todayIso()`
  - `src/components/ErrorBoundary.jsx` **(NEW)** — extracted from App.jsx:27-56 with `fallback` prop
  - `src/App.jsx:27-56,205-235` — use new boundary; add per-route inner boundary
  - `src/components/OnboardingWizard.jsx:21-24` — replace nested setTimeouts with `onTransitionEnd` state machine
  - `src/main.jsx:7-19` — remove document-level input listener; replace with `<NumberInput>` wrapper component in `src/components/NumberInput.jsx` **(NEW)**
  - `src/services/dataService.js`, `src/services/invoiceService.js`, `src/App.jsx:75,88` — `.single()` → `.maybeSingle()` on 18 of 20 call sites (leave FK-constrained fetches as `.single()`)
  - `src/pages/LoginPage.jsx:235-263` — either implement email OTP sign-in or remove the email input + "ou" divider
  - `index.html:1-17` — `<meta name="description">`, OG tags, `rel="icon"` SVG, `rel="apple-touch-icon"`, `robots`
  - `README.md` **(NEW)** — stack summary, Vercel deploy, EU-West-2 data residency, RGPD notice
  - `public/favicon.svg` **(NEW)** — branded icon
- **Sub-agent:** `general-purpose` for the mechanical sweep. `feature-dev:code-architect` only for the NumberInput pattern + error-boundary shape.
- **Skill:** `andrej-karpathy-skills:karpathy-guidelines` (surgical changes).
- **Findings closed:** **H-05, H-07, M-03 (confirmContext adoption), M-04, M-05, M-07, M-09 (partial — JSDoc only, TS migration stays out), M-10, M-11, M-13, M-14, M-15, M-16, A-32 (favicon), A-34 (OAuth SVG aria-hidden — defer to P1‑V actually).**
- **Deliverables:**
  - `src/lib/date.js` + `src/lib/phases.js` are the single source; no duplicate constants remain.
  - `ErrorBoundary` reusable; `App.jsx` has two boundaries (root + per-route inside `Suspense`).
  - `README.md` at repo root.
  - `npm run lint` stays green.
- **Exit criteria:** grep for `MONTHS_FR = [` returns 1 match (`src/lib/date.js`); grep for `new Date().toISOString().split('T')[0]` returns 0 matches in `src/`; root `README.md` exists and Vercel deploy link works.
- **Depends on:** Phase‑0 Track G (error-handling). **H-04 and H-06 split off into P1‑W** because they hard‑depend on Phase‑0 Track E (DataContext reform).

### P1-V — Accessibility Phase 1 (A-09..A-40)

- **Goal:** close the 32 residual a11y findings. Pins to RGAA-4 / WCAG 2.1 AA Level A compliance for the MVP launch.
- **Files (exclusive):**
  - `src/index.css` — add `@media (prefers-reduced-motion)`, `.sr-only` utility, `@media print` rules, fix contrast tokens `--text-secondary` `--text-tertiary` `--success` `--warning` `--info` `--accent-main`, remove `html { font-size: 14px }`
  - `src/context/ToastContext.jsx:46-92` — `role="region"` + `aria-live="polite"` on container; per-toast role; close-button `aria-label`; consolidate inline keyframes
  - `src/context/ConfirmContext.jsx:27-95` — `role="alertdialog"`, focus management, Escape handler, focus trap (reuse Phase‑0 Track I's `useFocusTrap` hook)
  - `src/pages/AdminPage.jsx:119-181`, `src/pages/DeletedClientsPage.jsx:102-119`, `src/pages/FinancesPage.jsx:464-470`, `src/pages/ReseauProPage.jsx:373-390`, `src/pages/ClientsPage.jsx:389-414` — tables: `<caption class="sr-only">`, `<th scope="col">`, `<th scope="row">`
  - Every form input site — `autoComplete` tokens
  - `src/App.jsx:186-193,211-215`, `src/pages/AdminPage.jsx:53`, `src/components/client/SessionDetailModal.jsx:335` — loading spinners wrapped with live regions
  - `src/components/layout/Sidebar.jsx:32-114` — `NavLink` `aria-current="page"`; `title=` → `aria-label`; disabled items `<button aria-disabled>` or `aria-hidden`
  - `src/pages/ReseauProPage.jsx:130` — replace `window.confirm()` with `useConfirm()` (after P1‑U's consolidation or in parallel)
  - `src/components/DuplicateAlert.jsx:13-23`, `src/components/client/SessionDetailModal.jsx:72`, `src/components/ConfirmBadge.jsx`, `src/components/PaymentBadge.jsx`, `src/pages/FinancesPage.jsx:551-553` — add text labels alongside colour signals
  - `src/components/client/SessionDetailModal.jsx:637,864` — radio/checkbox groups wrapped in `<fieldset><legend class="sr-only">`
  - `src/components/OnboardingWizard.jsx:370-380` — `<nav aria-label="Étapes"><ol>` with `aria-current="step"`
  - `src/pages/LoginPage.jsx:188-203,217-222` — `aria-invalid`/`aria-describedby` on email input; `aria-hidden="true"` on Google SVG
  - `src/hooks/usePageTitle.js` **(NEW)** — set `document.title` per route
  - `src/pages/public/AccessibilitePage.jsx` — update conformance declaration from "partielle" to the measured level after this track
  - `docs/MA_CHARTE_GRAPHIQUE.md` — document the updated contrast tokens (per project rule)
- **Sub-agent:** `feature-dev:code-architect` (pattern: focus trap reuse, sr-only util, table-semantics) → `general-purpose` (sweep).
- **Skill:** `review` + `code-review:code-review`.
- **Findings closed:** **A-09 through A-40** (excluding A-32 if P1‑U ships first — merge-order note).
- **Deliverables:**
  - axe DevTools run on 10 representative pages reports 0 Critical, ≤ 5 Moderate (a pragmatic threshold for Phase 1).
  - Contrast tokens updated in `index.css` **and** `docs/MA_CHARTE_GRAPHIQUE.md` in the same PR.
  - `@media (prefers-reduced-motion: reduce)` rule at the top of `index.css`.
  - `/accessibilite` public route (shipped by Phase‑0 Track H) now carries a real conformance statement.
- **Exit criteria:** keyboard-only traversal of login → dashboard → client detail → session modal works; all toasts announced; ConfirmContext dialog traps focus + Escape closes; `npm run test:axe` (added in P1‑Q) green.
- **Depends on:** **Phase‑0 Track I** (provides `useFocusTrap`, `useEscapeKey`, base `:focus-visible`). P1‑Q adds the axe CI job.

### P1-W — Performance Phase 1

- **Goal:** close the perf findings that require a) DataContext reform landed (Phase‑0 Track E) and b) cross-component memoisation / dedup / view creation.
- **Files (exclusive):**
  - `src/context/DataContext.jsx` — split into `CoreDataProvider` (clients/sessions/settings) and `ExtendedDataProvider` (invoices/cycles/professionals/contacts); route-aware mounting in `src/App.jsx`
  - `src/App.jsx` (wrap each route in the right provider)
  - `src/services/dataService.js` — `getClients` / `getSessions` / `getReports` add column shortlists for list views; `syncUser` gates UPDATE on real metadata diff
  - `supabase/migrations/<ts>_clients_with_stats_view.sql` **(NEW)** — `CREATE VIEW clients_with_stats AS SELECT c.*, count(s.id) FILTER … FROM clients c LEFT JOIN sessions s …` with `SECURITY INVOKER` (respects RLS)
  - `src/pages/FinancesPage.jsx:96-167,215-241` — `useMemo` for `yearStats`, `monthlyBreakdown`, `sessionsInMonth`
  - `src/pages/ClientsPage.jsx:82-135` — `useMemo` for filter/sort; `sessionsByClient` Map; begin mega-page split (extract `ClientsList`, `ClientsFilterBar`, `ClientCard` into `src/components/clients/`)
  - `src/pages/ClientDetailPage.jsx:122-165` — `useMemo` for derived session arrays
  - `src/context/DataContext.jsx` — `clientById: Map` built once via `useMemo`; replace `.find()` with `.get()` across call sites
  - `src/pages/DashboardPage.jsx` — use `clients_with_stats` view; drop redundant client-side joins
  - `src/pages/DeletedClientsPage.jsx:17-18` — replace direct mutation with immutable update via DataContext API (H-04 fix)
  - `src/services/sponsorshipService.js:58-69,86` — remove `client.clientLinks` mutations
  - Any `useEffect` with missing dep array in `src/pages/FinancesPage.jsx:138,146,161`, `src/pages/ClientDetailPage.jsx:98-100`, `src/pages/ClientsPage.jsx:56-80`, `src/App.jsx:126` — add deps or `useCallback` per H-03
  - `src/context/DataContext.jsx:55-88` — `inflightRef` guard in `loadData()` (H-06)
  - AbortController added to async `useEffect` fetches in `src/context/DataContext.jsx`, `src/pages/AdminPage.jsx`
- **Sub-agent:** `feature-dev:code-architect` (provider split + view design + mega-page split) → `code-simplifier` (memoisation sweep).
- **Skill:** `andrej-karpathy-skills:karpathy-guidelines` + `code-review:code-review`.
- **Findings closed:** **P-07, P-08, P-09, P-10, P-13, P-14, P-15, P-16, H-01 (partial — ClientsPage only), H-02 (starts; inline-style dedup is lumpy, set a ratchet from 1376→800), H-03, H-04, H-06, route-aware-dataprovider, server-side-clients-stats.**
- **Deliverables:**
  - Dashboard network tab: ≤ 2 Supabase queries on first render (vs. 8 today).
  - `clients_with_stats` view live; `DashboardPage` reads from it.
  - ClientsPage split into ≤ 4 files, each ≤ 400 LOC.
  - CI budget check on `style={{}}` count: fail if count increases; track inline-style count week over week.
- **Exit criteria:** first-paint bundle ≤ 300 KB gz (aligned with Phase-0 Track F target); Lighthouse LCP < 2.5 s on `/dashboard`; no `.find()` inside render loops.
- **Depends on:** **Phase‑0 Tracks C, E, F.** P1‑Q (Lighthouse CI).

### P1-X — DB integrity & cleanup

- **Goal:** tighten DB invariants not covered by Phase 0: UUIDs for JSONB IDs, TIMESTAMPTZ consistency, retire dead migration references, add remaining indexes, add append-only guards.
- **Files (exclusive):**
  - `supabase/migrations/<ts>_uuid_for_jsonb_ids.sql` **(NEW)** — no schema change; `src/services/sponsorshipService.js:148`, `src/components/client/EditIdentityModal.jsx:698` switch to `crypto.randomUUID()`. (Migration is a no-op anchor; real change is app-side.)
  - `supabase/migrations/<ts>_standardise_temporal.sql` **(NEW)** — `ALTER COLUMN … TYPE timestamptz` where `DATE`/`TIMESTAMP` columns still exist; remove `stripTz` usage from `src/data/adapters.js:71`, `src/services/allianceService.js:14-16`
  - `supabase/migrations/<ts>_deleted_at_partial_index.sql` **(NEW)** — `CREATE INDEX IF NOT EXISTS idx_clients_active ON clients (user_id) WHERE deleted_at IS NULL` (Phase‑0 Track C may already have this — verify; drop if dup)
  - `supabase/migrations/<ts>_emotional_maturity_append_only.sql` **(NEW)** — trigger rejecting length-decreasing writes to `clients.emotional_maturity_history`; OR child table migration (driver decides trade-off)
  - `supabase/migrations/<ts>_clients_phase_guard.sql` **(NEW)** — application guard OR CHECK via function referencing `settings.therapy_phases` (H-3)
  - `supabase/migrations/<ts>_retire_dead_tables.sql` **(NEW)** — if `migration.sql` still declares `client_links` / `professional_referrals` tables, this migration drops them or the declarations are simply removed from `migration.sql` (note: live DB never had them; this is a cleanup of the repo source file, coordinated with Phase‑0 Track D baseline)
  - `src/data/adapters.js` — remove stripTz; use `Intl.DateTimeFormat` for display
  - `src/services/sponsorshipService.js`, `src/components/client/EditIdentityModal.jsx` — `crypto.randomUUID()`
  - `supabase/seed.sql` — if not already scrubbed by Phase‑0 Track A, remove `status='completed'` seed row (C-5 closure) and synonyms fix `referral`/`parrainage`
- **Sub-agent:** `feature-dev:code-explorer` (trace temporal types across code) → `general-purpose`.
- **Skill:** `code-review:code-review`.
- **Findings closed:** **M-1, M-2, M-3, M-4, M-8 (seed synonyms), H-2 (doc update), H-3, retire-client-links, deleted-at-partial-index (if not covered by Phase‑0 Track C).**
- **Deliverables:**
  - Zero `Date.now()` calls generating IDs; zero `stripTz` calls; zero `DATE` columns on tables that need tz awareness.
  - `emotional_maturity_history` append-only invariant enforced (driver chooses trigger vs child table).
  - `migration.sql` matches live DB (no dead `client_links` table block).
- **Exit criteria:** `grep -rn "Date.now()" src/ | grep -v test` returns 0 hits in ID-generating contexts; temporal migration applies clean on a Supabase branch.
- **Depends on:** **Phase‑0 Track D** (baseline). Close coordination with P1‑R (retention columns overlap `deleted_at`).

### P1-Y — DPIA · RoPA · DPA chain · HDS decision (human-led)

- **Not a code track.** Captures the organisational work that engineering cannot finish alone.
- **Deliverables (all in `docs/dpia/` and `docs/compliance/`):**
  - **G-04 completion:** the DPIA draft started in Phase‑0 Track K is finalised and signed by counsel + Kotech leadership.
  - **G-09:** `docs/compliance/dpa_chain.md` — signed DPAs with Supabase, Vercel, Google (Workspace / OAuth). Subprocessor inventory with EU/non-EU flags and SCCs where non-EU.
  - **RoPA:** `docs/compliance/ropa.md` — 15 rows per §05 inventory; published to a staff-only link; reviewed yearly.
  - **R-07:** `docs/compliance/hds_decision.md` — formal HDS determination. Non-regulated professional persona = HDS not mandatory; Supabase EU + Vault column encryption justified. Sign-up gate on ADELI/RPPS; if a regulated pro claims, refuse until HDS-partner path exists.
  - **R-11:** `docs/legal/cookies.md` updated with Google-OAuth cookie notice copy.
  - **Engineering assist:** evidence pack listing the concrete technical controls from Tracks A–M and P1‑N..P1‑Z, ready for the DPIA to cite.
- **Findings closed:** **G-04 completion, G-09, R-07, R-11 (partial — the legal-copy half).**
- **Sub-agent:** `general-purpose` for evidence-pack aggregation; rest is human-led.
- **Depends on:** most Phase 0 and Phase 1 technical work merged (so the DPIA describes reality, not intent).

### P1-Z — Health data encryption & access log ⚠ **gated on P1‑Y HDS decision**

- **Goal:** implement column-level encryption via Supabase Vault + the Art.-9 access log (G-03, G-06, G-10). Only dispatch after the HDS/scope decision in P1‑Y is signed off — encryption scope changes materially if the persona changes.
- **Files (exclusive):**
  - `supabase/migrations/<ts>_vault_keys.sql` **(NEW)** — enable `vault`, create app key
  - `supabase/migrations/<ts>_encrypt_sensitive_columns.sql` **(NEW)** — `pgsodium` or `vault` column encryption on `reports.narrative`, `reports.vigilance`, `clients.notes`, `clients.ai_synthesis`, `sessions.summary`, `sessions.audio_file` (list subject to final HDS scope)
  - `supabase/migrations/<ts>_sensitive_access_log.sql` **(NEW)** — `access_log(user_id, entity, entity_id, action, accessed_at, ip_address)` table + RLS (admin-read, service-role insert, 6‑month retention via P1-R purge)
  - `supabase/migrations/<ts>_audio_bucket.sql` **(NEW)** — Storage bucket with RLS + signed URLs + 30‑day purge job
  - `src/services/dataService.js`, `src/services/invoiceService.js` — wrapper reads emit `access_log` rows; `getReport`, `getAudioUrl` write logs
  - `src/services/audioService.js` **(NEW)** — upload flow with patient-consent check
  - `docs/engineering/encryption.md` **(NEW)** — key rotation runbook
- **Sub-agent:** `feature-dev:code-architect` → `general-purpose` (with Supabase MCP access — sensitive; must follow §0bis guardrails verbatim).
- **Skill:** `security-review` + `code-review:code-review`.
- **Findings closed:** **G-03, G-06, G-10, R-12 (completion).**
- **Deliverables:**
  - 6 sensitive columns are encrypted at rest (beyond infra default).
  - Every read of `reports.narrative` or `clients.notes` generates an `access_log` row.
  - Audio uploads land in the bucket, are purged after 30 days, and create a consent-row link.
- **Exit criteria:** query `SELECT column_name FROM information_schema.columns WHERE table_name='reports' AND data_type='bytea'` returns `narrative`, `vigilance`; `SELECT count(*) FROM access_log WHERE action='read_report'` increments on manual test; audio purge job runs and removes objects older than 30 d on a Supabase branch test.
- **Depends on:** **P1‑Y (HDS decision)**, **P1‑R** (retention policy + purge infra), **P1‑N** (audit_log taxonomy).

---

## 3 · Dispatch prompts (same pattern as Phase 0 §3)

For each track, dispatch via `Agent(subagent_type=…, prompt=…, isolation="worktree")` with:

1. Track goal + findings codes (copy from §2).
2. Exclusive file list verbatim — agent must not touch anything else.
3. Deliverables list verbatim.
4. Pointers to the relevant domain audit section(s) + `live_db_verification_2026-04-21.md` where DB schema is concerned.
5. "Use commit style `fix(security):`, `feat(observability):`, `perf(dataContext):` etc. Do not modify tests unless adding new ones. Do not run `npm install` unless `package.json` changed."
6. The **MCP guardrails** from Phase 0 §0bis apply verbatim to any track that touches live DB.

---

## 4 · Merge order (minimises conflicts)

Assuming Phase 0 has merged in the order specified by Phase‑0 §4, merge Phase 1 as:

1. **P1-N** — observability + audit_log (no deps beyond Phase 0 G + D).
2. **P1-U** — code quality (constants, README, ErrorBoundary, favicon).
3. **P1-V** — accessibility Phase 1 (needs Phase‑0 Track I's hooks).
4. **P1-X** — DB integrity cleanup.
5. **P1-Q** — supply chain + CI tightening (Lighthouse + axe budgets fold in).
6. **P1-P** — secure exports (needs P1‑N live).
7. **P1-O** — auth hardening (independent of P1‑N/U once those land).
8. **P1-R** — retention + DSAR (needs P1‑N's audit_log).
9. **P1-W** — performance Phase 1 (needs Phase‑0 Tracks C/E/F).
10. **P1-S** — AI Act transparency (deadline 2026‑08‑02; schedule early).
11. **P1-T** — Factur-X rename + scoping (deadline 2026‑09‑01; schedule early).
12. **P1-Y** — DPIA / RoPA / DPA / HDS docs (runs in parallel; completes after 1–11 so it can cite them).
13. **P1-Z** — health‑data encryption + access log (gated on P1‑Y HDS decision).

**Critical path by deadline:** P1‑S must finish by **2026‑08‑02**; P1‑T rename must finish before first real "facture" is emitted, with full implementation by **2027‑09‑01** but reception capability by **2026‑09‑01**.

---

## 5 · Phase 1 verification (at the end)

Produce `audit/phase1_verification.md` mirroring `phase0_verification.md` (Track M output). Each track contributes a checklist item; Phase 1 is closed when all items are ✅ + a green `/review` + `/security-review` pass on staging.

Representative smoke tests:
- Trigger a forced error → Sentry receives it with user + route metadata.
- Open admin page without TOTP → blocked.
- Export a dossier → prompts confirm → produces watermarked XLSX → `audit_log` row.
- Leave app idle 30 minutes → forced logout.
- Every AI-generated report carries the transparency banner + blocks export until validated.
- DSAR workflow: admin opens a ticket → zip of subject rows produced.
- `clients_with_stats` view query latency < 200 ms at 10 000 clients (smoke data).

---

## 6 · Phase 2 preview (scheduled after Phase 1)

Out of scope here — see INDEX.md Phase 2/3. Big items:

- Real Factur-X / PDP integration (Q3 2026).
- Audio pipeline end-to-end (transcription vendor, SCCs, retention, purge).
- Probative integrity: object-level versioning + hash chain; qualified timestamping.
- RGAA declaration + schéma pluriannuel if commercial contracts demand it.
- Structured logging replacing `reportError` console transport; Better Stack or OpenTelemetry.
- Route-aware data prefetch + optimistic mutations everywhere.

---

*Plan authored 2026-04-21. Mirrors the structure of `IMPLEMENTATION_PLAN.md`. Residual-findings extraction from domain reports §01–§07 archived in the commit message that introduces this file.*
