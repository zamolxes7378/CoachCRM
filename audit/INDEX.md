# CoachCRM — Pre-Production Audit

**Audit date:** 2026-04-21
**Auditor:** Claude Code (Opus 4.7), parallel multi-domain static analysis
**Scope:** entire repository at branch `main`
**Target environment:** French SaaS CRM for couple-therapists, production deployment
**Status:** pre-MVP, 5-therapist pilot imminent, Freemium-V2 planned

---

## Overall Verdict

> ### **NOT production-ready.** The seven domain audits converge on the same picture: a functionally thoughtful product with a serious compliance, security, and operational gap versus the regulated context it will ship into.
>
> Three blockers alone justify pausing any external launch: **(1) the live Supabase anon JWT is committed to git** (precludes rotation, advertises the target), **(2) Article 9 health data is processed with no DPIA, no privacy notice, no retention, no DPA chain**, and **(3) the login page carries a factually unverifiable commercial claim** ("Données hébergées en France") for infrastructure hosted in London.
>
> A staged remediation plan (see `IMPLEMENTATION_PLAN.md`) targets a minimum-viable **pre-MVP cut in ≈ 2 engineer-weeks** (closes Critical security + GDPR blockers), followed by a **6-week hardening phase** (operational readiness, accessibility, schema clean-up), and a **regulatory runway to 2026-09-01** (Factur-X reception) and **2026-08-02** (EU AI Act Art. 50 transparency) for the paid-tier launch.

### Aggregate risk heatmap

| Dimension | Overall risk | Production-ready? | Critical findings |
|---|---|---|---|
| [01 — Code Quality & Ops](01_code_quality.md) | 🟠 High | **No** (conditional) | 8 |
| [02 — Security](02_security.md) | 🔴 Critical | **No** | 2 |
| [03 — Performance](03_performance.md) | 🟠 High | **No** (pilot OK, V2 no) | 5 |
| [04 — Database & RLS](04_database_schema.md) | 🟠 High | **No** (conditional) | 6 |
| [05 — GDPR / Privacy](05_gdpr_privacy.md) | 🔴 Critical | **No** | 9 |
| [06 — French & EU Regulations](06_french_regulations.md) | 🟠 High | **No** (conditional) | 6 |
| [07 — Accessibility (WCAG / RGAA)](07_accessibility.md) | 🟠 High | Conditional | 8 |
| **Consolidated** | 🔴 **Critical** | **No** | **≈ 44** (see Top-20 below) |

### Hard regulatory deadlines affecting this app

| Deadline | Countdown | Requirement | Current state | Report |
|---|---|---|---|---|
| **2026-08-02** | T-103 days | EU AI Act Art. 50 — AI content transparency (roadmap includes auto-CR, LLM analysis) | Not implemented, not scoped | §06 R-06 |
| **2026-09-01** | T-133 days | French B2B e-invoicing — mandatory **reception** of structured invoices (CoachCRM as vendor billing therapists is in-scope) | Not implemented — no Factur-X, no PDP | §06 R-04 |
| **2027-09-01** | T-498 days | French B2B e-invoicing — mandatory **emission** by SMEs/micro-enterprises | Not implemented | §06 R-04 |
| **GDPR (in force)** | — | DPIA before processing Art. 9 health data at scale | Not performed | §05 G-04 |
| **C. santé publique + L121-2 C. conso** | — | HDS-certified hosting or truthful marketing (not both-false) | False claim on LoginPage:274 | §05 G-02 / §06 R-01 |
| **C. com. L123-22 / CGI L102B** | — | 10-year accounting retention; 6-year tax records | Unconditional hard-delete via `invoiceService.deleteInvoice` | §06 R-03 |

---

## Reports

Each report follows the same template: Executive Summary → Scope & Methodology → Findings (Critical → Low) → What's Done Well → Remediation Plan → Conclusion. Findings use a domain prefix (C-xx code quality, S-xx security, P-xx performance, C-1…C-6 / H-x DB, G-xx GDPR, R-xx regulations, A-xx accessibility) so cross-references stay stable.

### [01 — Code Quality, Architecture & Operational Readiness](01_code_quality.md)

729 lines · 57 frontend source files · 13 868 LOC · 77 Supabase calls vs ~30 explicit error checks · 74 of 77 silently swallow errors.

- 🔴 `DataContext.loadData()` called after every one of 20 mutation helpers — 8 parallel `select('*')` per click (C-01)
- 🔴 `supabase/migration.sql` doesn't declare `therapy_cycles`, `invoices`, `invoice_sessions`, nor 11 columns on `clients` the app reads/writes (C-02)
- 🔴 No tests, no lint, no CI, no `.github/`, no `eslint.config.js` (C-03)
- 🔴 Silent `console.error`-then-return-null across 74 service calls (C-04)
- 🔴 `OnboardingWizard.jsx:39,50` mutates imported constants in place — violates the project's own `MES_REGLES_TECHNIQUES.md §2` verbatim (C-05)
- 🔴 `SessionDetailModal.jsx:22-24` has the hook-order violation the project's own rules forbid (C-06)
- 🔴 `docs/SETUP_GUIDE.md:62-63` commits the live Supabase anon JWT (C-07) — cross-ref §02 S-01
- 🔴 Zero `aria-*` / `role=` across 13 868 JSX lines (C-08) — full story in §07
- 🟠 Six files > 500 lines carry most business logic; 1 376 inline `style={{…}}` sites across 42 files

### [02 — Security Audit](02_security.md)

727 lines · OWASP Top 10 2021/2024 mapping · full RLS matrix · threat model.

- 🔴 **S-01: Live Supabase anon JWT + URL committed** (`docs/SETUP_GUIDE.md:62-63`), JWT valid until ~2036
- 🔴 **S-02: No signup gate** — `src/App.jsx:92-101` auto-provisions any Google identity as `therapist`
- 🟠 **S-03: Legacy OAuth implicit flow** (`src/lib/supabase.js:11`) — token in URL fragment
- 🟠 **S-04: `/admin` client-side-only gate + raw `users` SELECT** with no server-side auth (`src/pages/AdminPage.jsx:14-25`)
- 🟠 **S-05: `users`, `therapy_cycles`, `invoices`, `invoice_sessions` have no RLS policy in VCS** — tenant-leak risk `[Unverified]`
- 🟠 **S-06: Real PII in version control** — `supabase/seed.sql:8`, `supabase/transfer_data.sql:19,22`
- 🟠 **S-07: Zero HTTP security headers** — `vercel.json` only configures SPA rewrites (no CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- 🟡 No MFA, no idle timeout, no audit-log table, no observability (Sentry etc.), XLSX export emits Art. 9 data with no audit entry

### [03 — Performance & Scalability](03_performance.md)

753 lines · bundle audit + index audit + query-cost projection at 2-year scale.

- 🔴 **P-01: Vendor chunk lumps `exceljs` (~1 MB) with core deps** — ships on every first load (`vite.config.js:13-15`)
- 🔴 **P-02: Every CRUD mutation reloads 8 parallel `select('*')` queries** — quantified: 60–150 MB/user/day, 6–15 GB/day fleet-wide at 100 therapists
- 🔴 **P-03: `getReports` joins whole `sessions` table** (`dataService.js:145`) instead of filtering by `client_id`
- 🔴 **P-04: `select('*')` on 11/12 query sites** — pulls wide JSONB columns (`ai_synthesis`, `emotional_maturity_history`, `client_links`) on list views
- 🔴 **P-05: No composite indexes on hottest query shapes** — `sessions(user_id, date DESC)`, `reports(client_id)`, `invoice_sessions(invoice_id)` all missing
- 🟠 P-06 N+1 write loop in `allianceService.js:115-125` · P-07 global capture-phase `input` listener on document (`main.jsx:8-19`) · P-08 `DataProvider` wraps Router so 8 queries fire before any route paints

### [04 — Database Schema & Data Integrity](04_database_schema.md)

649 lines · full schema inventory + RLS matrix + column-drift catalogue.

- 🔴 **C-1: `therapy_cycles`, `invoices`, `invoice_sessions` are entire production tables with zero migration coverage** (invoices shape reverse-engineered from `invoiceService.js`)
- 🔴 **C-2: `users` `ENABLE ROW LEVEL SECURITY` with zero policy in VCS** — yet AdminPage reads it. Either ghost policy or RLS is off `[Unverified]`
- 🔴 **C-3: RLS status unknown for the three drifted tables** — cross-tenant enumeration risk
- 🔴 **C-4: Real PII in `seed.sql:8`, `transfer_data.sql:19,22`** (overlaps S-06)
- 🔴 **C-5: `seed.sql:55` writes `status='completed'`** — violates `remove_completed_status.sql`'s tightened CHECK; seed will fail
- 🔴 **C-6: `client_links` dual source of truth** (table + JSONB); `professional_referrals` table dead
- 🟠 H-1 `family` client type silently priced as couple (`allianceService.js:19,65`) · H-4 `reports` policy validates `client_id` only, not `session_id` → cross-tenant forgery risk · H-5 `deleteClient` manual 4-step cascade despite `ON DELETE CASCADE` · H-6 `deleted_at` filter missing from `getClients` server-side and from alliance/invoice/sponsorship services · H-7 `invoice_sessions` probably lacks `UNIQUE(invoice_id, session_id)`

### [05 — GDPR / Data Protection](05_gdpr_privacy.md)

1 095 lines · 15-row RoPA · Articles 5/6/9/13-22/24-32/33-34/35/37/44-49 · CNIL doctrine.

- 🔴 **Non-compliant** overall posture · **DPIA mandatory** under CNIL déliberation 2018-327 · **CoachCRM is not HDS-certified**
- 🔴 **G-01: No privacy notice** — `LoginPage.jsx:305-307` has dead `<span>` pseudo-links
- 🔴 **G-02: False marketing claim** — "Données hébergées en France" (`LoginPage.jsx:274`) while Supabase is `eu-west-2` / London. Art. 5(1)(a) + L121-2 C. conso.
- 🔴 **G-03: Art. 9 data processed with no DPIA, no HDS host, no column encryption, no access log**
- 🔴 **G-04: Mandatory DPIA not performed** — 4+ CNIL criteria met
- 🔴 **G-05: Real personal data in version control** — overlaps S-06 / C-4
- 🔴 **G-06: Planned audio flow has no storage, encryption, or 30-day purge** despite consent template promising 30 days
- 🔴 **G-07: RLS policies use `FOR ALL USING` without `WITH CHECK`** → INSERT forgery possible
- 🔴 **G-08: No data-subject-rights workflow for patients** — paper consent not wired to any DB artifact
- 🔴 **G-09: No DPA chain** documented with Supabase, Vercel, Google; no subprocessor inventory

### [06 — French & EU Regulations](06_french_regulations.md)

925 lines · 15-regulation applicability matrix · 12-row retention matrix · deadline-tracked blockers.

- 🔴 **R-01: Misleading commercial claim** on login (`LoginPage.jsx:274`) — L121-2 C. conso. exposure; highest-leverage fix (5-minute edit). Overlaps G-02
- 🔴 **R-02: No `/mentions-legales`, `/confidentialite`, `/cgu`, `/cgv`, `/accessibilite`, `/cookies` routes** — LCEN Art. 6-III + C. conso. L221-5. Self-flagged in `docs/synthese_strategique.md` as "🔴 Avant le MVP"
- 🔴 **R-03: No retention policy codified** across 12 data categories — violates L123-22 C. com. (10-year invoices), CGI L102B (6-year tax), CNIL 3-year CRM default
- 🔴 **R-04: Factur-X / e-invoicing mandate** — **2026-09-01 reception** (T-133 days) applies to CoachCRM as vendor; **2027-09-01 emission** (T-498 days). Invoices table not even in `migration.sql`
- 🔴 **R-05: Invoice content fails L441-9 C. com. + 242 nonies A CGI** — no invoice_number sequence, no issuer/recipient snapshots, no TVA fields, no payment terms, no PDF generator
- 🔴 **R-06: EU AI Act Art. 50 transparency** — **2026-08-02** (T-103 days). Planned LLM features (auto-CR, diarisation, IA chat over dossier) have zero transparency labelling, no AI system card
- 🟠 R-07 HDS decision undocumented · R-08 accessibility statement absent · R-09 no CGV/précontract layer for paid tier · R-10 admin role client-side-gated only

### [07 — Accessibility (WCAG 2.1 AA / RGAA 4)](07_accessibility.md)

752 lines · 30-criterion status table · 28-pair contrast analysis.

- 🔴 **A-01: Zero `aria-*` / `role=` across the codebase** — grep returns 0
- 🔴 **A-02: Zero `htmlFor` on `<label>`** — 46 `<label>`, 0 associations, 78 `<input>` with 0 `autoComplete`
- 🔴 **A-03: No `:focus-visible` rule** — `outline: none` declared, no replacement
- 🔴 **A-04: 7 modal sites lack `role="dialog"`, `aria-modal`, focus trap, Escape handler**
- 🔴 **A-05: Icon-only buttons have no accessible name** — rely on `title=` or nothing
- 🔴 **A-06: Skip-link absent + duplicate `<h1>` every page** (`Sidebar.jsx:27` + page `<h1>`) — 1.3.1 failure
- 🔴 **A-07: Contrast failures** — `--text-tertiary` 2.15:1, `--text-secondary` 4.12:1, `--success` 3.07:1, `--warning` 2.35:1, `--info` 4.01:1, focus-ring 1.1:1
- 🔴 **A-08: `LoginPage.jsx:306` dead-span pseudo-links** for mandatory legal pages (overlaps R-02) — 2.1.1 + 4.1.2 outright failure
- 🟠 `prefers-reduced-motion` absent · `ReseauProPage.jsx:130` uses native `window.confirm()` for destructive bulk delete · `html { font-size: 14px }` reduces zoom headroom · `main.jsx:8-19` synthetic `input` event re-fires may confuse AT

---

## Top 20 Critical blockers (cross-dimensional, deduplicated)

Ranked by severity × effort — the items that must resolve before any external launch:

| # | Blocker | Dimension | Effort | Rationale |
|---|---------|-----------|--------|-----------|
| 1 | **Rotate Supabase anon key + purge `docs/SETUP_GUIDE.md:62-63` from git history** | Security + Code | XS (30 min + BFG rewrite) | S-01 / C-07 — key valid until 2036; advertised to GitHub scanners |
| 2 | **Remove `supabase/seed.sql` + `transfer_data.sql` from git; purge history** | Security + DB + GDPR | XS (20 min) | S-06 / C-4 / G-05 — real personal emails committed |
| 3 | **Gate OAuth signup behind an admin allowlist** | Security | S (2 h) | S-02 — any Google account currently auto-provisions as `therapist` |
| 4 | **Fix the false "Données hébergées en France" claim** on `LoginPage.jsx:274` | GDPR + Regs | XS (5 min edit) | G-02 / R-01 — L121-2 C. conso. exposure; disproportionate risk vs cost |
| 5 | **Publish `/mentions-legales`, `/confidentialite`, `/cgu`, `/cookies`, `/accessibilite` routes** + footer links | GDPR + Regs + A11y | M (legal review + 1 d) | G-01 / R-02 / A-08 — LCEN Art. 6-III + Arts. 13-14 RGPD |
| 6 | **Kick off DPIA and document it** | GDPR | L (2–3 d organisational) | G-04 — CNIL-mandatory for Art. 9 at scale |
| 7 | **Commit base schema + RLS for `users`, `therapy_cycles`, `invoices`, `invoice_sessions` + all 19 drifted columns** | DB + Security | M (1 d) | C-1 / C-2 / C-3 / S-05 — schema must be reproducible and auditable |
| 8 | **Add `WITH CHECK` to every RLS policy** (not just `USING`) | DB + GDPR | S (1 h) | G-07 / H-4 — INSERT-forgery on `reports`, `client_links` |
| 9 | **Move `/admin` gate server-side** (dedicated `admins` table or JWT claim) + add `users` RLS policy | Security + DB | S (2 h) | S-04 / R-10 — currently only client-side `user.role === 'admin'` |
| 10 | **Stop the `await loadData()` pattern after every mutation — use optimistic local updates** | Code + Perf | M (1–2 d) | C-01 / P-02 — biggest operational + scalability risk |
| 11 | **Set baseline CI: `lint` script + `test` runner (Vitest) + GitHub Actions `build + lint` workflow** | Code | M (1 d) | C-03 — compliance-app baseline; lint alone catches C-05 / C-06 |
| 12 | **Fix silent-error pattern across services** — throw or return typed result, surface via Toast | Code + GDPR | M (1 d) | C-04 / G-incident — failed writes currently indistinguishable from success |
| 13 | **Add HTTP security headers via `vercel.json`** (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) | Security | XS (30 min) | S-07 |
| 14 | **Switch OAuth to PKCE** (`flowType: 'pkce'`) | Security | XS (15 min + test) | S-03 — implicit flow deprecated since 2021 |
| 15 | **Add `WITH CHECK` + `INSERT`/`UPDATE`/`DELETE` policies for `reports`, `contacts`, `client_links`** | DB | S (1 h) | H-4 — `FOR ALL USING` alone doesn't protect INSERT |
| 16 | **Dynamic-import `exceljs` + split vendor chunk** (`vite.config.js`) | Perf | XS (15 min) | P-01 — ~280 KB gz dead code on every first load |
| 17 | **Add missing composite indexes** — `sessions(user_id, date DESC)`, `reports(client_id)`, `invoice_sessions(invoice_id)` | Perf + DB | XS (15 min) | P-05 — future-proofing for 2-year scale |
| 18 | **Fix the `family` client-type pricing gap** (`allianceService.js:19,65`) + add `family` entry to `sessionRates` default | DB + Code | XS (10 min) | H-1 — family clients silently billed at couple rate |
| 19 | **Apply Phase-0 accessibility fixes**: `htmlFor`, `:focus-visible`, `role="dialog"` + Escape on modals, keyboard support on clickable `<div>`s, fix pseudo-links on LoginPage footer, replace `window.confirm` | Accessibility | M (3 d) | A-01 / A-02 / A-03 / A-04 / A-08 — hard WCAG AA blockers |
| 20 | **Replace contrast-failing design tokens** — `--text-secondary`, `--text-tertiary`, `--success`, `--warning`, `--info` (global-search + replace; charte doc update) | Accessibility | S (4 h + charte update) | A-07 |

### Regulatory blockers with a **hard deadline**

| Item | Deadline | Effort | Note |
|---|---|---|---|
| EU AI Act Art. 50 — transparency labelling on planned LLM outputs | **2026-08-02** (T-103 d) | S (scope + legal review) | R-06 — applies the moment the auto-CR feature ships |
| Factur-X reception capability in the invoice data model + PDP integration decision | **2026-09-01** (T-133 d) | L (4–6 w or integrate a PDP SaaS — Docoon / Iopole / Chorus) | R-04 — mandatory reception by all VAT-assujetti; CoachCRM as B2B vendor is in scope |
| Retention policy codified end-to-end (jobs + RoPA + UI) | **ASAP** | M (3 d policy + 1 w implementation) | R-03 / G-03 |
| Invoice content L441-9 + 242 nonies A compliance | Before paid-tier launch | M (1 w) | R-05 — or honestly rename "invoices" → "rappels" until a real generator exists |

---

## Phased remediation roadmap

Full plan with owners, estimates and exit criteria in [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md).

### Phase 0 — Unblock pre-MVP pilot (target: 2 engineer-weeks)

All 20 Critical blockers above. Exit criteria:
- Credentials rotated, secrets & PII purged from git history, signup gated
- Privacy notice + mentions légales + CGU online; false marketing claim corrected; DPIA kicked off
- Base schema + RLS fully reproducible from migrations; `WITH CHECK` added; admin gate server-side
- Baseline CI (lint + test + GitHub Actions); error-handling contract fixed; ErrorBoundary still in place
- Phase-0 accessibility fixes in; contrast tokens updated; dead-span pseudo-links replaced
- Security headers and PKCE live

### Phase 1 — Hardening (target: 4–6 weeks)

- **Security:** idle timeout, MFA option for admins, audit-log table, observability (Sentry), supply-chain watch (`exceljs` / `file-saver`), XLSX export ACL + audit entry (S-08..S-14)
- **DB / RLS:** write migrations for all 19 drifted columns, drop dead `client_links` / `professional_referrals` tables OR pivot the app to them, add missing indexes, fix `deleteClient` to rely on cascade, add `deleted_at` partial index + filter, add `UNIQUE(invoice_id, session_id)` (H-5..H-7, M-1..M-3)
- **Performance:** optimistic-update pattern everywhere, route-aware `DataProvider`, dynamic `exceljs`, `select(...)` column shortlists, dedupe inline styles into classes, lazy avatars, memoised `clients` Map, cache `sessions`×`clients` join on the server via a view (P-06..P-15)
- **Code quality:** extract duplicated constants (`MONTHS_FR`, phase colours, `clientTypeLabels`) into `data/` modules that pages re-import; split mega-pages (`ClientsPage` 1 160 → container + child panels); fix two hook-order violations; surface all Supabase errors via Toast; gate debug logs behind `import.meta.env.DEV` (H-01..H-07, M-01..M-16)
- **Accessibility (A-09..A-40):** skip-link, de-dupe `<h1>`, `prefers-reduced-motion`, `autoComplete` on forms, toast `role="status"`, icon-buttons `aria-label`, keyboard focus trap + Escape on every modal, native confirm replaced

### Phase 2 — Regulatory & compliance (target: up to 2026-08-02 / 2026-09-01)

- **EU AI Act Art. 50:** AI content labelling, AI system card, user-facing transparency text, opt-out for training data
- **Factur-X / PDP:** scope decision (integrate Docoon/Iopole or Chorus PPF) → `invoices` table redesign → invoice-number sequence + issuer/recipient snapshots + TVA fields + PDF + XML
- **Retention automation:** scheduled purge/anonymisation jobs per data category; document in the RoPA; UI surfaces for data-subject rights
- **Probative integrity** on therapy documents: object-level versioning + hash chain; evaluate qualified timestamping; HDS decision recorded in DPIA
- **RGAA declaration + schéma pluriannuel** if paid-tier commercial contracts require it

### Phase 3 — Operational maturity (ongoing)

- Error tracking (Sentry or Better Stack) with French-language messaging preserved
- Structured logging pattern replacing ad-hoc `console.*`
- Monitoring dashboards for Supabase quotas, Auth abuse, Factur-X reception volume
- Runbooks in `docs/` (incident response, accounting closure, patient data-subject request flow)
- `.github/workflows/` covering build, lint, PR previews, Lighthouse CI

---

## What's genuinely done well

Across all seven reports, reviewers consistently highlighted:

- **`GlobalErrorBoundary` at app root** (`src/App.jsx:27-56`) with French-language fallback and actionable reload CTA. One of the few pre-prod practices already in place.
- **React.lazy per-page code-splitting** (`src/App.jsx:13-22`) — the author knows SPA discipline.
- **Documentation culture**: `docs/MES_REGLES_METIER.md` (617 lines), `MES_REGLES_TECHNIQUES.md` (231), `MON_ARCHITECTURE_DONNEES.md` (297), `MA_CHARTE_GRAPHIQUE.md` (1 060), `template_consentement_patient.md` (219), `synthese_strategique.md` (324). Clear, versioned, French — a rare asset. The gap flagged across reports is **doc-code drift**, not doc absence.
- **Adapter layer** (`src/data/adapters.js`) keeps the DB/UI impedance mismatch in one file — a solid architectural choice that made this audit tractable.
- **Thoughtful domain modelling**: alliance-therapeutic transitions (`src/services/allianceService.js`), sponsorship network (`sponsorshipService.js`), soft-delete with a dedicated "deleted clients" admin page — the product has real clinical logic, not a generic CRM.
- **No `dangerouslySetInnerHTML`** anywhere — eliminates the largest XSS family.
- **No analytics / tracking pixels** in the client — no ad-tech GDPR headaches out of the gate.
- **Single-practitioner-per-tenant RLS shape** is correct in intent (`user_id = auth.uid()`); the gaps are missing policies on 4 tables and missing `WITH CHECK` clauses, not conceptual confusion.
- **The team self-flags its own regulatory gaps** (`docs/synthese_strategique.md` §"Chantiers Complémentaires Identifiés" marks CGU/CGV and privacy-policy as 🔴 "Avant le MVP") — indicating awareness, just a gap between awareness and execution.

---

## Methodology & limitations

- **Static analysis only.** No build run, no runtime profile, no penetration test, no live Supabase dashboard inspection. Findings prefixed `[Unverified]` (notably the RLS posture of `users`, `therapy_cycles`, `invoices`, `invoice_sessions`) reflect genuine knowledge gaps that require in-database verification before remediation.
- **Parallel execution.** Seven domain specialists ran concurrently, each briefed with a structured prompt and the `/home/zamolxes/devs/coach-crm/audit/live_schema/tables.md` snapshot. They cross-reference but did not coordinate in real time.
- **Evidence-based.** Every finding cites a concrete `file:line` location. Counts and percentages come from mechanical greps (1 376 inline styles, 252 `onClick`, 46 `<label>`, 77 Supabase calls, 0 `aria-*`).
- **Reference template.** Reports mirror the structure of a sister audit at `/home/zamolxes/devs/cra-app/audit/`, which was already executed and remediated end-to-end on the Kotech CRA repo. Severity scale, finding codes and section order match that precedent.
- **Out of scope.** User-experience research, business-process analysis, infrastructure cost modelling, third-party legal review (DPAs signed or not with Supabase/Vercel/Google — this must be confirmed separately by Kotech legal or its DPO). Supabase Dashboard configuration (redirect-URL allowlist, rate limiting, password policy, email templates) is in scope only insofar as it affects the code.

---

## How to use this audit

1. **Executive read.** This `INDEX.md` is sufficient for a go/no-go decision. Sections "Overall Verdict" + "Top 20 Critical blockers" + "Hard regulatory deadlines" answer the shipping question.
2. **Engineering triage.** Open each report directly (`01_*` → `07_*`) in the order you plan to remediate. Findings are numbered with a domain prefix for stable cross-referencing across reports.
3. **Tracking.** Import the 20 Phase-0 blockers + the per-report remediation tables into your issue tracker. `IMPLEMENTATION_PLAN.md` pre-groups them by phase with effort estimates.
4. **Re-audit.** After Phase 0, re-run a targeted pass on the two Critical-rated dimensions (§02 Security, §05 GDPR) to confirm blockers are actually closed before any external launch. The §04 `[Unverified]` RLS findings need **live-DB verification** before they can be safely closed.

---

*Reports produced 2026-04-21. Seven domain reports totaling ≈ 5 630 lines of Markdown. Companion plan: [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md).*
