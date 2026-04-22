# CoachCRM — Technical Controls Evidence Pack

> **Audience:** internal engineering + legal counsel, for use in DPIA (Article 35 GDPR) and DPA negotiations.
> This document aggregates technical controls shipped across Phase 0 and Phase 1 tracks. Each entry cites the implementing file(s), the finding code closed, and the track / commit that introduced the control.
>
> Cross-reference: [`docs/compliance/hds_decision.md`](hds_decision.md) · [`docs/compliance/ropa.md`](ropa.md)

---

## Table of Contents

1. [Access Control](#1-access-control)
2. [Audit Logging](#2-audit-logging)
3. [Data Retention and Erasure](#3-data-retention-and-erasure)
4. [Data Integrity](#4-data-integrity)
5. [Data Minimisation](#5-data-minimisation)
6. [Transparency — AI Act](#6-transparency--ai-act)
7. [Accessibility](#7-accessibility)
8. [Supply Chain and CI Security](#8-supply-chain-and-ci-security)
9. [Encryption at Rest](#9-encryption-at-rest)
10. [Incident Response](#10-incident-response)

---

## 1. Access Control

| Control | Files / Migrations | Finding(s) closed | Track / Commit |
|---------|--------------------|-------------------|----------------|
| **Supabase RLS — per-user row isolation on all tables** | `supabase/migrations/20260421_rls_users_therapy_cycles_invoices.sql`, `20260421_tighten_rls_with_check.sql`, `supabase/migrations/20260401000000_baseline_schema.sql` (policy scaffold) | S-01, S-02 | Track C — `03c6295` |
| **Admin role guard (server-side check)** | `supabase/migrations/20260421_admin_rpc.sql` — RPC functions gated on `auth.role()` | S-04 | Track C — `03c6295` |
| **TOTP MFA enforcement for admin accounts** | `src/hooks/useMFA.js`, `src/pages/AdminMFA.jsx`, `docs/admin-mfa-setup.md` | S-11 | P1-O — `f5ed705` |
| **Idle session timeout (30 min) with 2-min warning** | `src/hooks/useIdleTimeout.js`, `src/components/IdleWarningModal.jsx`, `src/App.jsx` | S-08 | P1-O — `f5ed705` |
| **Google Workspace domain lock (OAuth sign-in restricted to @kotech.ai)** | `src/lib/supabaseClient.js` (OAuth options), Supabase dashboard config | S-14 | P1-O — `f5ed705` |
| **PKCE OAuth flow (replaces implicit grant)** | `src/lib/supabaseClient.js` (`flowType: 'pkce'`), `src/lib/supabase.js` | S-03 | Track B — `74e0e23` |
| **Allowed-emails allowlist** | `supabase/migrations/20260421_allowed_emails.sql` | S-05 | Track C — `03c6295` |
| **Composite indexes on user_id FK columns** | `supabase/migrations/20260421_composite_indexes.sql` | Performance / isolation | Track C — `03c6295` |

---

## 2. Audit Logging

| Control | Files / Migrations | Finding(s) closed | Track / Commit |
|---------|--------------------|-------------------|----------------|
| **`audit_log` table** (user, action, entity, entity_id, metadata, timestamp) | `supabase/migrations/20260421200000_audit_log.sql` | G-05 | P1-N — `08506aa` |
| **`reportError()` structured error wrapper** | `src/lib/errorReporter.js` — every `console.error` replaced; severity enum | G-05 | P1-N — `08506aa` |
| **`auditLog()` helper** — emits rows to `audit_log` for all write operations | `src/lib/auditLog.js` | G-05 | P1-N — `08506aa` |
| **Sentry integration** — runtime error capture with DSN from env | `src/lib/sentry.js`, `src/main.jsx` (init) | G-05 | P1-N — `08506aa` |
| **Audit-log taxonomy** — action types: `CREATE`, `UPDATE`, `DELETE`, `EXPORT`, `DSAR_REQUEST`, `LOGIN`, `LOGOUT`, `MFA_ENROLLED` | `src/lib/auditLog.js` (enum constants) | G-05 | P1-N — `08506aa` |
| **Retention: 12 months** | `supabase/migrations/20260422101000_retention_policies.sql` (audit_log row), `docs/retention_policy.md` §7 | Art. 32 GDPR | P1-R — `7199562` |

---

## 3. Data Retention and Erasure

| Control | Files / Migrations | Finding(s) closed | Track / Commit |
|---------|--------------------|-------------------|----------------|
| **`retention_policies` table** — per-entity retention rules | `supabase/migrations/20260422101000_retention_policies.sql` | G-01, R-03 | P1-R — `7199562` |
| **Lifecycle columns** (`deleted_at`, `anonymized_at`, `retention_until`) on all main tables | `supabase/migrations/20260422101100_retention_columns.sql` | G-01 | P1-R — `7199562` |
| **`purge_expired_data()` RPC** — monthly pg_cron job; anonymises PII past `retention_until`; invoices protected until 7 years | `supabase/migrations/20260422101200_purge_job.sql` | G-01, R-03 | P1-R — `7199562` |
| **`dsar_requests` table** — tracks Art. 15/16/17/18/20 requests with status, due_date, resolution | `supabase/migrations/20260422101300_dsar_requests.sql` | G-09 (rights workflow) | P1-R — `7199562` |
| **Admin DSAR UI** — route `/admin/dsar`, sidebar link, status management | `src/pages/AdminDsar.jsx`, `src/services/dsarService.js`, `src/App.jsx` | G-09 | P1-R admin wire — `a190134` |
| **Retention matrix documented** | `docs/retention_policy.md` — 12 categories, durations, legal bases | G-01, R-03 | P1-R — `7199562` |

---

## 4. Data Integrity

| Control | Files / Migrations | Finding(s) closed | Track / Commit |
|---------|--------------------|-------------------|----------------|
| **UUID primary keys on JSONB-ID tables** — eliminates integer collision risk | `supabase/migrations/20260422100000_uuid_for_jsonb_ids.sql` | D-03 | P1-X — `2b70db8` |
| **TIMESTAMPTZ normalisation** — all temporal columns use timezone-aware types | `supabase/migrations/20260422100100_standardise_temporal.sql` | D-04 | P1-X — `2b70db8` |
| **Soft-delete partial index** on `deleted_at IS NULL` | `supabase/migrations/20260422100200_deleted_at_partial_index.sql` | D-05 | P1-X — `2b70db8` |
| **Emotional maturity append-only trigger** — prohibits UPDATE/DELETE on `emotional_maturity_scores` | `supabase/migrations/20260422100300_emotional_maturity_append_only.sql` | D-06 | P1-X — `2b70db8` |
| **`clients.phase` CHECK constraint guard** — prevents invalid therapeutic phase transitions | `supabase/migrations/20260422100400_clients_phase_guard.sql` | D-07 | P1-X — `2b70db8` |
| **Dead table retirement** (`professional_referrals`, `client_links` shadow) | `supabase/migrations/20260422100500_retire_dead_tables.sql` | D-08 | P1-X — `2b70db8` |
| **Notes consolidation** — merges duplicate `note_*` / `axes_*` column sets | `supabase/migrations/20260422101400_consolidate_notes.sql` | D-09 | P1-R — `7199562` |
| **`clients_with_stats` materialised view** | `supabase/migrations/20260422102000_clients_with_stats_view.sql` | Performance / integrity | P1-R — `7199562` |

---

## 5. Data Minimisation

| Control | Files / Migrations | Finding(s) closed | Track / Commit |
|---------|--------------------|-------------------|----------------|
| **`DataMinimisationHint` component** — contextual UI nudge shown on free-text fields prone to over-collection | `src/components/DataMinimisationHint.jsx` | G-09 | P1-R — `7199562` |
| **Export filename pattern** — XLSX exports use a non-PII filename pattern (`export_YYYYMMDD.xlsx`) | `src/services/exportService.js` (filename generation) | G-09 | P1-P — `0d51707` |
| **Export watermark + confirmation modal** — forces explicit user acknowledgement before data export | `src/components/ExportConfirmModal.jsx`, `src/services/exportService.js` | G-09 | P1-P — `0d51707` |
| **Audit log on export** — every XLSX export records a `EXPORT` event in `audit_log` | `src/services/exportService.js` (auditLog call) | G-09 | P1-P — `0d51707` |

---

## 6. Transparency — AI Act

| Control | Files / Migrations | Finding(s) closed | Track / Commit |
|---------|--------------------|-------------------|----------------|
| **AI System Card** — documents the AI system, its purpose, risk tier, and limitations per EU AI Act Art. 13 | `docs/AI_SYSTEM_CARD.md` | AI-01 | P1-S — `1de7772` |
| **DPIA AI section** — dedicated section assessing AI-specific risks in the impact assessment | `docs/dpia/ai_section.md` | AI-02, G-04 (partial) | P1-S — `1de7772` |
| **`ai_metadata` schema** — structured JSON field capturing model version, confidence, and disclaimer per generated report | `supabase/migrations/20260421210000_ai_metadata.sql`, `src/services/reportService.js` | AI-03 | P1-S — `dbfe639` |
| **Transparency banner in AI-generated reports** — UI disclosure that content is AI-generated and not a medical diagnosis | `src/components/AiTransparencyBanner.jsx` (or equivalent) | AI-03, Art. 50 AI Act | P1-S — `dbfe639` |
| **Privacy policy update** — reflects AI processing in data flows | `docs/legal/confidentialite.md` | AI-04 | P1-S — `1de7772` |

---

## 7. Accessibility

| Control | Files / Migrations | Finding(s) closed | Track / Commit |
|---------|--------------------|-------------------|----------------|
| **WCAG 2.1 AA / RGAA-4 remediations** — 32 findings A-09..A-40 addressed: focus management, ARIA labels, colour contrast, keyboard navigation, screen-reader announcements | Multiple components under `src/components/` | A-09 to A-40 | P1-V — `d07a733` / `c3334af` |
| **Accessibility declaration** | `docs/legal/accessibilite.md` | A-01 | P1-V — `d07a733` |

---

## 8. Supply Chain and CI Security

| Control | Files / Migrations | Finding(s) closed | Track / Commit |
|---------|--------------------|-------------------|----------------|
| **Dependabot** — weekly automated dependency PRs for npm and GitHub Actions | `.github/dependabot.yml` | SC-01 | P1-Q — `1b98803` |
| **`npm audit` in CI** — blocks merge on critical/high CVEs | `.github/workflows/ci.yml` (audit step) | SC-02 | P1-Q — `1b98803` |
| **Lighthouse CI budget** — performance and accessibility regressions block PRs | `.github/workflows/ci.yml` (Lighthouse step) | SC-03 | P1-Q — `1b98803` |
| **axe-core accessibility CI** — automated WCAG scan on every PR | `.github/workflows/ci.yml` (axe step) | SC-04, A-01 | P1-Q — `1b98803` |

---

## 9. Encryption at Rest

| Control | Files / Migrations | Finding(s) closed | Track / Commit |
|---------|--------------------|-------------------|----------------|
| **Supabase infrastructure encryption** — AES-256 disk encryption on all Supabase-managed storage (AWS EBS) and database volumes. Covers all tables by default. | Supabase platform — no migration required | G-03 (partial) | Infrastructure (pre-existing) |
| **Supabase Vault column encryption** — pgsodium-based column-level encryption on Art. 9 columns: `reports.narrative`, `reports.vigilance`, `clients.notes`, `clients.ai_synthesis`, `sessions.summary`, `sessions.audio_file` | *Planifié P1-Z* | G-03, G-06, G-10 | **Planifié P1-Z** |
| **Art. 9 access log** — per-read audit trail for sensitive column access | *Planifié P1-Z* | G-10 | **Planifié P1-Z** |
| **Audio bucket with RLS + signed URLs + 30-day purge** | *Planifié P1-Z* | G-10 | **Planifié P1-Z** |

---

## 10. Incident Response

| Control | Files / Migrations | Finding(s) closed | Track / Commit |
|---------|--------------------|-------------------|----------------|
| **Sentry error capture** — real-time exception tracking; alerts on error spikes | `src/lib/sentry.js`; DSN configured via `VITE_SENTRY_DSN` env var | G-05 | P1-N — `08506aa` |
| **`audit_log` taxonomy** — structured event types enable automated anomaly detection and post-incident forensics | `src/lib/auditLog.js` | G-05 | P1-N — `08506aa` |
| **Sentry region** | Sentry project region — **à confirmer** (EU vs. US affects transfer status in RoPA row 11) | G-05 | P1-N — `08506aa` |
| **Incident notification procedure** — Art. 33/34 GDPR 72-hour notification obligation | *Not yet documented — P2 item* | G-07 | **Planifié** |

---

## Summary — findings status

| Finding | Description | Status |
|---------|-------------|--------|
| G-01 | No retention policy | Closed — P1-R |
| G-03 | Art. 9 data without HDS / minimum safeguards | Partially closed — HDS decision + infra encryption; Vault pending P1-Z |
| G-04 | No DPIA | Partially closed — DPIA in progress (`docs/dpia/`) |
| G-05 | No audit logging | Closed — P1-N |
| G-06 | No column-level encryption | Planifié P1-Z |
| G-07 | No incident response plan | Planifié P2 |
| G-09 | Free-text fields / DSAR workflow absent | Closed — P1-R |
| G-10 | No access log for Art. 9 reads | Planifié P1-Z |
| R-03 | Retention durations not documented | Closed — P1-R |
| R-07 | HDS status undocumented | Closed — P1-Y (`hds_decision.md`) |
| S-01..S-14 | Auth / access control findings | Closed — Track B, C, P1-O |
| A-09..A-40 | Accessibility findings | Closed — P1-V |
| AI-01..AI-04 | AI Act transparency | Closed — P1-S |
| SC-01..SC-04 | Supply chain / CI | Closed — P1-Q |

---

*Last updated: 2026-04-22 — P1-Y evidence aggregation.*
*Cross-reference: [`hds_decision.md`](hds_decision.md) · [`ropa.md`](ropa.md)*
