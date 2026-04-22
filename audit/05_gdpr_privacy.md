# 05 — GDPR / Data Protection Audit

> **Application audited**: CoachCRM — *SaaS CRM for French couple-therapists*
> **Controller(s)**: each therapist tenant (the health professional treating the data subject)
> **Processor**: CoachCRM (the SaaS operator; `claudia@kotech.ai`, Kotech)
> **Audit date**: 21 April 2026
> **Auditor target**: pre-production readiness for a SaaS that will store Article 9 health data (psychotherapy) of French couples
> **Scope**: `/home/zamolxes/devs/coach-crm` — React 19 SPA + Supabase Postgres (`eu-west-2` / London, **UK**) + Vercel + Google OAuth; planned: audio upload, transcription, LLM analysis, pedagogical extraction
> **Regulatory frame**: Regulation (EU) 2016/679 (**GDPR**); French **Loi 78-17** (Loi Informatique et Libertés, LIL); **Code de la santé publique** (L1110-4, L1111-7, L1111-8); **Code de la consommation** (L121-2); **Code de commerce** (L123-22); CNIL guidance (cookies, DPIA criteria, référentiel "cabinet de soins"), EDPB guidelines 03/2019 & 04/2019

---

## 0. Executive Summary

- **GDPR compliance status**: **NON-COMPLIANT — NOT SHIPPABLE in current form.**
- **Overall risk**: **Critical.** The application already processes **Article 9 health data** (therapy notes, emotional state per partner, vigilance points, narratives, AI synthesis) and plans to extend to audio/transcription/LLM — all without the minimum legal and technical scaffolding a French health professional is required to have.
- **DPIA required**: **Yes, mandatory** under Art. 35(3)(b) and CNIL déliberation 2018-327. Not done.
- **HDS certification required to market truthfully**: **Yes** for any claim touching health-data hosting. **CoachCRM is not HDS-certified** and **claims "Données hébergées en France" while Supabase is in the UK** — see G-02 (false advertising under Code de la consommation L121-2).
- **Privacy notice / CGU**: **Absent**. The footer of `LoginPage.jsx:306` renders spans that look like links but have no `href` — see G-01.
- **Data subjects (the patients / couples / children)**: **no in-app consent trace, no information flow, no rights workflow.** The paper template `docs/template_consentement_patient.md` does not translate into any database artifact. The controller (the therapist) cannot demonstrate consent to the CNIL.
- **Cross-border / contractual chain**: **no DPA** documented with Supabase, Vercel, Google; future subprocessors (transcription, LLM) unidentified.
- **Personal data in version control**: `supabase/seed.sql` and `supabase/transfer_data.sql` include real-name email addresses — a minor data breach in the source-code repository.

**Recommendation: halt any production launch and any external communication mentioning HDS / France-hosting / RGPD-compliant until the Critical + High findings below are closed, and a DPIA + privacy policy + DPA chain are in place.**

Summary bullets:

1. The product falls squarely in CNIL's mandatory-DPIA list ("traitement de données de santé par un professionnel de santé"). `docs/synthese_strategique.md:64` is explicit: these are Article 9 data.
2. The schema already exposes sensitive therapy content as free text / JSONB: `reports.narrative`, `reports.patterns`, `reports.vigilance`, `reports.emotions_a`, `reports.emotions_b`, `clients.notes`, `clients.ai_synthesis`, `clients.note_vigilance`, `sessions.summary`, `sessions.audio_file` (`supabase/migration.sql:52,73-80`; `docs/MON_ARCHITECTURE_DONNEES.md:63,77,164-172`).
3. RLS tenant-isolation design is correct in intent but **incomplete**: see live-schema audit (`audit/live_schema/tables.md:100-123`) — `users`, `therapy_cycles`, `invoices`, `invoice_sessions` have no RLS policy in VCS; `reports` policy is SELECT-only semantics on a `FOR ALL`, which is insufficient for INSERT forgery protection.
4. No retention job, no erasure workflow, no portability export beyond a therapist-facing Excel dump (`src/services/exportService.js`) — which exposes one partner's data to the other without partitioning.
5. Google photo_url stored for no operational purpose beyond the `AdminPage` display (`src/pages/AdminPage.jsx:16,132`). Not biometric per CNIL but unnecessary → purpose-limitation breach.
6. LoginPage.jsx:274 claims **"Données hébergées en France, conformes RGPD"** while the project is hosted on Supabase `eu-west-2` (London). This is inaccurate and exposes Kotech to administrative fines **and** to consumer-law sanctions (DGCCRF / L121-2 Code de la consommation).

---

## 1. Scope & Methodology

**In scope**

1. The React 19 SPA in `src/` (routing, state, storage, auth flow).
2. The Supabase schema files `supabase/migration.sql`, `supabase/seed.sql`, `supabase/dev_rls.sql`, `supabase/transfer_data.sql`, `supabase/add_family_type.sql`, `supabase/remove_completed_status.sql`, `supabase/update_roles.sql`.
3. Third-party processors identified: Supabase (data + storage + auth), Vercel (frontend hosting), Google (OAuth).
4. Planned but not-yet-implemented flows per `docs/synthese_strategique.md`: audio upload, transcription, LLM analysis, pedagogical extraction.
5. French-language business docs: `docs/MES_REGLES_METIER.md`, `docs/MES_REGLES_TECHNIQUES.md`, `docs/MON_ARCHITECTURE_DONNEES.md`, `docs/fiche_interview_decouverte.md`, `docs/template_consentement_patient.md`.

**Out of scope**

- Live Supabase DB state (the audit environment was connected to a different project — see `audit/live_schema/README.md:6-9`). RLS and column drift flagged `[Unverified]`.
- Operational posture of the future transcription / LLM provider (not chosen).
- Internal HR/legal status of Kotech (the SaaS operator) beyond what appears in the repo.

**Method**

- Mapped every personal-data column in `supabase/migration.sql` + `docs/MON_ARCHITECTURE_DONNEES.md` to data subject, purpose, and lawful-basis candidate.
- Walked RLS policies as declared in `supabase/migration.sql:165-182` and `supabase/dev_rls.sql:14-26`, compared with runtime queries in `src/services/*.js`.
- Read each page (`src/pages/*.jsx`) for (a) personal-data flows, (b) UI-level transparency, (c) rights-exercise mechanisms.
- Cross-referenced findings with Articles 5, 6, 9, 13–22, 24–32, 33–34, 35, 37, 44–49 of the GDPR, CNIL's *liste DPIA* (2018-327), CNIL *référentiel "gestion des cabinets médicaux"* (2019), and the French *Code de la santé publique* health-data rules (L1110-4, L1111-8 HDS).

---

## 2. Controller / Processor Roles — the single most contested question here

CoachCRM's business model (`docs/synthese_strategique.md:32-65`) creates a multi-layer contractual stack that **must be documented in writing before MVP** because the paper consent template cannot be honoured without it.

| Role | Entity | Legal basis | Evidence |
|---|---|---|---|
| **Joint / primary controller of patient data** | Each therapist-tenant | Art. 9(2)(h) (medical diagnosis, health-care) combined with **explicit consent** per the template `docs/template_consentement_patient.md:70` | Therapist signs up, determines purposes (follow-up, billing), decides retention (5 y per template §6) |
| **Processor (contract operator)** | CoachCRM (Kotech SAS) | Art. 28 DPA with therapist-tenant required | `docs/synthese_strategique.md:74` "Isolation des données. Un thérapeute ne voit JAMAIS les données d'un autre" — classical processor posture |
| **Joint controller for Business #2** (formation / lead magnet) | CoachCRM itself | Changes on a per-purpose basis — extraction of pedagogical content is **a purpose of the CoachCRM operator**, not of the therapist | `docs/synthese_strategique.md:22-30, 175-214` explicitly describe the pedagogical-content business as "propre à la fondatrice" (= CoachCRM). This makes CoachCRM a controller for that purpose and therefore **jointly liable** under Art. 26 |
| **Sub-processor** | Supabase Inc. (AWS Dublin / London backbone) | Art. 28(2) + Supabase DPA | `audit/live_schema/README.md:20` — region `eu-west-2` = London, UK |
| **Sub-processor** | Vercel Inc. | Art. 28(2) + Vercel DPA | `vercel.json` (SPA delivery) |
| **Sub-processor** | Google LLC (Identity Platform / OAuth) | Art. 28 + SCCs (US); also independent controller for the Google Account it authenticates | `src/pages/LoginPage.jsx:11-16`, `src/App.jsx:65-105` |
| **Future sub-processor** | Transcription provider (unchosen) | Art. 28 + SCCs if non-EU | `docs/synthese_strategique.md:107-130` |
| **Future sub-processor** | LLM / analysis provider (unchosen) | Art. 28 + SCCs if non-EU | `docs/synthese_strategique.md:162-172` |
| **Health-data hoster** | Would need to be **HDS-certified** per `Code de la santé publique L1111-8` for French health professionals | Supabase is **not HDS-certified** → hard regulatory blocker | `docs/template_consentement_patient.md:102` promises "hébergement HDS si applicable" — ambiguous wording, not delivered |

**Key legal gap**: the joint-controller status CoachCRM acquires by extracting pedagogical content is nowhere documented and would fail an Art. 26 joint-controller transparency test at the first CNIL inspection.

---

## 3. Records of Processing Activities (RoPA) — draft

Article 30 register, reconstructed from schema + services + docs. 15 rows. Each therapist tenant will also need a personal RoPA as controller; this draft covers the **processor-level** RoPA (CoachCRM as operator).

| # | Processing activity | Data categories | Data subjects | Storage (table / bucket) | Purpose | Lawful basis candidate (Art. 6 / Art. 9) | Recipients / processors | Retention (observed) | Retention (recommended) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Therapist account (operator-side) | name, email (Google), role, photo_url, Google OAuth id-token claims | Therapists (SaaS users) | `users` (`supabase/migration.sql:6-13`); `auth.users` (Supabase-managed) | Authentication + tenant directory + admin oversight | Art. 6(1)(b) contract (SaaS) | Supabase, Google, Vercel | None documented (no deactivation flag; rows persist indefinitely) | End of contract + 3 y (commercial prescription) |
| 2 | Client / couple / family dossier — identity | `partner_a`, `partner_b` JSONB (firstName, lastName, email, phone), `billing_address`, `external_referrer`, `client_links` | **Patients (adults)** and their partners — couples, individuals, families | `clients` (`supabase/migration.sql:16-38`); runtime drift columns (`billing_address`, `client_links`, `external_referrer` — `audit/live_schema/tables.md:31-37`) | Therapy follow-up, billing, referrals | Art. 6(1)(b) contract (therapist ↔ patient) + Art. 9(2)(h) medical care | Supabase (processor), therapist (controller) | Indefinite; soft-delete `deleted_at` (`clients.deleted_at`) reversible | Duration of therapy + 20 years (Code de la santé publique L1142-28 for health records produced by a health professional) — but see §10 below for caveats |
| 3 | Therapy sessions (séances) — metadata + clinical summary | `date`, `duration`, `phase`, `status`, `title`, `summary`, `audio_file`, payment columns | Patients | `sessions` (`supabase/migration.sql:41-60`) | Therapy scheduling, clinical memory, billing | Art. 9(2)(h) medical care | Supabase | Indefinite | Same as RoPA #2 |
| 4 | Reports / comptes-rendus (**Article 9 health data, highest sensitivity**) | `narrative` (text), `themes[]`, `emotions_a[]`, `emotions_b[]`, `patterns[]`, `progress[]`, `vigilance[]`, `exercises[]`, `pedagogical_content[]`, `client_name` snapshot | Patients (couples) | `reports` (`supabase/migration.sql:63-82`) | Clinical memory, pre-session briefing, pedagogical extraction | **Art. 9(2)(h)** for clinical memory; **Art. 9(2)(a) explicit consent** for pedagogical-content reuse (per `docs/template_consentement_patient.md:49` "finalité 3") | Supabase | Indefinite | Therapy duration + 5 y for synthesis (template §6); audio raw **30 d** per template |
| 5 | Contacts / communications log | `type` (phone/email/sms/social/web/parrainage), `date`, `note`, `done` | Patients | `contacts` (`supabase/migration.sql:85-94`) | Relationship history | Art. 6(1)(f) legitimate interest (operational) | Supabase | Indefinite | Therapy duration + 3 y |
| 6 | Professional network (referrers) | first_name, last_name, email, phone, company, specialty, address, website, note | Third-party professionals (doctors, lawyers, referrers) | `professionals` (`supabase/migration.sql:97-111`); `referrals` JSONB drift column | Managing referral network | Art. 6(1)(f) legitimate interest — these are **third-party PII not directly the patients** | Supabase | Indefinite | Active + 3 y after last interaction |
| 7 | Client-to-client links (parrainage) | `client_id` ↔ `linked_client_id`, type, role | Patients + patients' referrers (who may also be patients) | `client_links` (`supabase/migration.sql:114-122`) + inline JSONB duplication in `clients.client_links` | Tracking word-of-mouth acquisition | Art. 6(1)(f) | Supabase | Indefinite | Therapy duration + 3 y |
| 8 | Settings (per-therapist) | `session_rates`, `recruitment_sources`, `therapy_config`, `therapy_phases` | Therapist only | `settings` | Operator UX | Art. 6(1)(b) | Supabase | Active | Active |
| 9 | Audio recordings (**planned**) | raw audio file of therapy session: voices of all participants + verbal content | Patients (**both partners**) + therapist | Object storage (not yet chosen — would likely be Supabase Storage) | Transcription + clinical memory | **Art. 9(2)(a) explicit consent** per template §4 | Transcription sub-processor | N/A | 30 d per template §6 |
| 10 | Transcripts (**planned**) | full-session text | Patients + therapist | `sessions.summary` or a new column/table (unscoped) | Clinical memory | Art. 9(2)(h) + Art. 9(2)(a) | Supabase, transcription provider | N/A | Therapy duration + 1 y per template |
| 11 | LLM analysis / AI synthesis (**planned**) | `clients.ai_synthesis` (JSON/text — `src/data/adapters.js:50-52`), prompts and responses routed through an LLM provider | Patients | `clients.ai_synthesis`; transient prompt/response payloads | Clinical analysis | Art. 9(2)(h) + explicit consent | Supabase + LLM sub-processor | N/A | Therapy duration + 5 y |
| 12 | Pedagogical content extraction | Excerpted methodology explanations from sessions → `reports.pedagogical_content[]` + downstream formation content | Patients (indirectly — extracted **from** their sessions) | `reports.pedagogical_content`; future "fiches méthodologiques" store (not in schema yet) | CoachCRM **secondary business** (formation) | **Art. 9(2)(a) explicit consent** (finalité 3 of template, §49) + **Art. 6(1)(a) consent** for the non-health aspects | Supabase + CoachCRM operator | N/A | Per template: "sans limitation de durée" — **but only if anonymisation is effective**, which must be audited |
| 13 | Invoices (**drift — not in migration**) | `invoice_id`, `client_id`, `invoice_date`, `sent`, `sent_at`, `user_id`, `invoice_sessions` links | Patients, therapist | `invoices`, `invoice_sessions` (not in `supabase/migration.sql`; see `audit/live_schema/tables.md:26-27`) | Billing | Art. 6(1)(c) legal (comptabilité) | Supabase | Indefinite | 10 years (Code de commerce L123-22) |
| 14 | Therapy cycles (**drift — not in migration**) | `start_date`, `rate`, `total_sessions`, `phase`, `client_id` | Patients | `therapy_cycles` (not in `supabase/migration.sql`; see `audit/live_schema/tables.md:25`) | Pricing / configuration | Art. 6(1)(b) | Supabase | Indefinite | Therapy duration + 5 y |
| 15 | Front-end storage (per-user) | `coachcrm-auth-token` (Supabase session), `coachcrm_onboarding_done` in localStorage | Therapist (self) | Browser only | Session + UX | Art. 6(1)(f); strictly necessary per CNIL délibération 2020-091 | N/A | Browser-local | Exempt from consent banner, still documented in privacy notice |

**RoPA gaps to close before go-live**:

- No row documents **audio / transcription / LLM** — yet docs/synthese_strategique.md says those are MVP.
- No row documents the **lead-magnet funnel** (extraction → formation products), which creates **joint-controller** exposure.
- Retention columns are all "Indefinite" because no purge mechanism exists.

---

## 4. Third-Party Processors / Sub-processors Map

| Processor | Data flowing | Purpose | Location | DPA status | Transfer tool | Action required |
|---|---|---|---|---|---|---|
| **Supabase Inc.** | Entire DB (including Art. 9 data in `reports`, `clients.notes`, `clients.ai_synthesis`, `sessions.summary`, `sessions.audio_file`), auth, storage | Primary backend | **`eu-west-2` = London, UK** (`audit/live_schema/README.md:20`) | **Not signed (no evidence in repo)** | UK is post-Brexit; UK has an **EU adequacy decision** (28 June 2021, renewed 2025), so no SCCs strictly required; but data is **outside the EU/EEA** technically | Sign Supabase DPA; **or** migrate project to an EU region (Frankfurt `eu-central-1`, Paris `eu-west-3`) — required to avoid contradicting the "France" marketing claim |
| **Vercel Inc.** | Frontend delivery; access logs with IP and route; no application data | SPA hosting | US HQ, global CDN | **Not signed** | SCCs (US); Data Privacy Framework (DPF) as of July 2023 | Sign Vercel DPA; confirm no Vercel Analytics enabled (none found in `vercel.json`) |
| **Google LLC** | Email, name, picture, `sub` (subject id) | OAuth sign-in | Global | **Not signed (for OAuth scope beyond the free tier)** | SCCs / DPF | Document Google as sub-processor; disclose in privacy notice |
| **Future transcription provider** | **Raw audio of therapy sessions** (Art. 9 voice + verbal content) | Speech-to-text | Unknown | N/A (not chosen) | Must be EU-based OR SCCs + TIA | Choose carefully: OVH Bloom / Whisper-on-Scaleway / Mistral Voxtral on OVH are EU options; OpenAI Whisper API is US + enterprise DPA |
| **Future LLM provider** | Full dossier text sent as prompt | Clinical analysis + pedagogical extraction | Unknown | N/A | Must be EU-based for health data | Evaluate Mistral AI (EU-hosted) vs. Anthropic/OpenAI (US); if non-EU, a DPIA extension and SCCs are mandatory |
| **No marketing-email / analytics / error-tracking SDK present** | — | — | — | — | — | Positive finding — keep it that way; if Sentry is added, configure `beforeSend` to scrub PII and treat as sub-processor |

**Transfer-impact findings**:

- **Supabase UK**: after Brexit, the UK is a **"third country"** under Art. 44 GDPR. The European Commission's adequacy decision (28 June 2021) lets data flow without SCCs, but (a) the decision is scheduled for periodic review (next in 2025), (b) the data is **not** in France contrary to the login claim. Migrate to an EU region or rewrite the claim.
- **Google**: even for the modest OAuth profile claims, a Google account's `sub` + email flows through Google's global infrastructure. EU-US DPF applies since 10 July 2023. Still must be disclosed under Art. 13(1)(e).
- **Vercel**: same DPF frame. CDN delivery of static JS does not expose Article 9 data but **does expose IP + UA** of therapists (low-sensitivity PII, but still a transfer).

---

## 5. Sensitive-Data Inventory (column-by-column)

Only columns that contain personal / special-category data are listed. Article 9 (health) columns are flagged with ⚠️.

### `users` (`supabase/migration.sql:6-13`)

| Column | Content kind | Art. 9? | Control in place | Gap |
|---|---|---|---|---|
| `id` | UUID — tenant identifier | No (pseudonymous) | RLS: **not in VCS** (`audit/live_schema/tables.md:103`) | `AdminPage.jsx:15` does a raw SELECT — proves at least one policy permits it; verify live |
| `name` | Full name (Google claim) | No | RLS as above | — |
| `email` | Contact + unique auth key | No | — | Unique constraint means deletion before re-use; OK |
| `role` | `admin` / `therapist` | No | — | Only two roles → fine |
| `photo_url` | URL to Google profile picture | No (but personal data — face) | — | **Purpose-limitation gap**: only displayed in `AdminPage.jsx:132`; nowhere else. Consider dropping or requiring re-opt-in |
| `created_at` | Timestamp | No | — | — |

### `clients` (`supabase/migration.sql:16-38` + runtime drift per `audit/live_schema/tables.md:31-45`)

| Column | Content kind | Art. 9? | Control | Gap |
|---|---|---|---|---|
| `user_id` | Therapist FK | No | RLS USING `user_id = auth.uid()` (`supabase/migration.sql:175`) | OK for SELECT; no `WITH CHECK` so INSERT can forge other tenants — see G-07 |
| `type` | `couple` / `individual` / `family` (drift) | No | — | — |
| `partner_a` JSONB | firstName, lastName, email, phone | No (ordinary PII) | RLS | Stored as JSONB — harder to audit, search, encrypt column-level |
| `partner_b` JSONB | Same, for second partner | No | RLS | Same |
| `phase` | Therapy phase (`debut`, `analyse`, `integration`) | **⚠️ Yes** — reveals therapeutic progression = health data | RLS | No additional protection — see G-03 |
| `source` | Recruitment channel | No | — | — |
| `status` | `active` / `inactive` / `completed` | Possibly — status `completed` implies concluded therapy = health data | RLS | — |
| `start_date`, `sessions_count`, `total_sessions`, `next_session`, `last_session` | Session counters + scheduling | **⚠️ Yes** — cadence is health data | RLS | — |
| `emotional_maturity` + `emotional_maturity_history` JSONB | Therapist-scored emotional maturity 0-100 + time-series | **⚠️ Yes, unambiguously** | RLS only | No pseudonymisation, no access log, no per-column encryption; subject never informed their emotional maturity is scored |
| `notes` text | Free-text notes about the couple | **⚠️ Yes** — likely contains diagnosis, symptoms | RLS | Seeded example includes "Couple marié depuis 8 ans. Problème de communication principal." — shows real case notes will land here |
| `exercises` JSONB | Homework exercises | **⚠️ Possibly** — reveals therapeutic intervention | RLS | — |
| `ai_synthesis` text/JSON (drift) | **LLM-generated clinical synthesis** | **⚠️ Yes, high sensitivity** | RLS | See G-04 (AI-generated data category needs dedicated treatment) |
| `note_dynamique`, `note_axes`, `note_vigilance`, `note_objectifs`, `axes_travail`, `points_vigilance`, `objectifs`, `dynamique_relationnelle` (drift) | Structured clinical notes | **⚠️ Yes** | RLS | Multiple overlapping columns = governance risk (see `audit/live_schema/tables.md:37-43`); retention impossible if unclear which is authoritative |
| `billing_address` (drift) | Postal address | No | RLS | Retention under comptabilité law |
| `prospect_stage`, `referred_by`, `client_links` (drift), `external_referrer` (drift) | Sales funnel | No | RLS | Lead data can persist after couple refuses therapy — purge path needed |
| `deleted_at` (drift) | Soft-delete timestamp | No | RLS | **Does not actually delete data**; see G-12 |

### `sessions` (`supabase/migration.sql:41-60`)

| Column | Content kind | Art. 9? | Control | Gap |
|---|---|---|---|---|
| `summary` text | Free-text session summary | **⚠️ Yes** | RLS | Dev `sampleTranscriptions` in `src/hooks/useSessionModalState.js:3-9` shows the kind of content: *"Le client a abordé les difficultés de communication … Travail sur la confiance et l'attachement"* — unambiguously Art. 9 |
| `audio_file` text | Path/URL to audio recording | **⚠️ Yes — voice biometric + content** | No storage bucket documented | See G-06 — no retention, no bucket policy, no encryption evidence |
| `payment_method`, `payment_received`, `payment_status`, `payment_amount`, `payment_date` | Payment info | No | RLS | Standard commercial — OK |
| `cancellation_reason` text (drift) | Free text | **⚠️ Possibly** ("maladie", "hospitalisation") | RLS | Free text ⇒ health data can appear without warning — see G-09 |
| `invoice_*` fields | Billing linkage | No | RLS | Retention under comptabilité (10y) |

### `reports` (`supabase/migration.sql:63-82`) — **HIGHEST SENSITIVITY TABLE**

| Column | Content kind | Art. 9? | Control | Gap |
|---|---|---|---|---|
| `narrative` text | Full narrative of the session | **⚠️ Yes** | RLS: `client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())` (`supabase/migration.sql:178`) | Complex RLS ⇒ correctness-audit required in live DB; forgery protection via `WITH CHECK` missing (see G-07) |
| `themes` JSONB | Themes addressed | **⚠️ Yes** | RLS | — |
| `emotions_a`, `emotions_b` JSONB | **Per-partner emotion lists** | **⚠️ Yes (strong)** — psychological profiling per individual | RLS | See §9 "profiling under Art. 22" analysis |
| `patterns` JSONB | Relationship patterns (avoidance, etc.) | **⚠️ Yes** | RLS | — |
| `progress` JSONB | Progress notes | **⚠️ Yes** | RLS | — |
| `vigilance` JSONB | **Risk signals** (flagging suicide / violence / abuse) | **⚠️ Yes — critical** | RLS | Whoever can read this row can deduce safety concerns about identified persons → need full audit log of access |
| `exercises` JSONB | Homework | Possibly | RLS | — |
| `pedagogical_content` JSONB | Extracted methodology | **⚠️ Derived from Art. 9 data** | RLS | Only becomes non-Art-9 if **properly anonymised**. Anonymisation here must be verifiable; free-text extraction likely leaks context. See G-11. |
| `client_name` text (drift) | Snapshot of client name | No | RLS | Snapshot pattern is good for audit (survives erasure) but needs documented purpose |

### `contacts` (`supabase/migration.sql:85-94`)

| Column | Content kind | Art. 9? | Control | Gap |
|---|---|---|---|---|
| `note` text | Free text about the communication | **⚠️ Possibly** — "le couple annule car le mari est hospitalisé" | RLS | Free text ⇒ flag it |
| `type`, `date`, `done` | Metadata | No | RLS | — |

### `professionals` (`supabase/migration.sql:97-111`)

| Column | Content kind | Art. 9? | Control | Gap |
|---|---|---|---|---|
| `first_name`, `last_name`, `email`, `phone`, `company`, `specialty`, `address`, `website`, `note` | Third-party contact data (other professionals) | No (the professional's profession — doctor, psychiatrist — is **occupation**, not health data about that person) | RLS | Data subjects are professionals who may not have consented to being in this database — see G-14 |

### `client_links`, `professional_referrals` (base schema)

Metadata about cross-client referrals; no new sensitive content beyond FK navigation. RLS coverage partial (see audit/live_schema/tables.md:107).

### Drift tables without RLS policy in VCS (`audit/live_schema/tables.md:103-106`)

- `users` — RLS enabled (`dev_rls.sql:14`) but **no policy declared** → either a policy exists live (undocumented) or the raw SELECT in `AdminPage.jsx:15` works because RLS is actually off.
- `therapy_cycles` — no RLS policy in VCS.
- `invoices` — no RLS policy in VCS; `getInvoices` filters by `user_id` **client-side** (`src/services/invoiceService.js:17`).
- `invoice_sessions` — join table, **never filters by `user_id`** — if RLS is off on this table, any authenticated therapist can enumerate every `invoice_id → session_id` mapping in the entire database.

**Action**: reconcile `supabase/migration.sql` with production immediately.

### Children (family type, `supabase/add_family_type.sql`)

- `clients.children` JSONB (App-side) — names + birth years (`EditIdentityModal.jsx:348-360`).
- **Article 8 GDPR** applies (children under 16). Children's data is special-regime — parental consent needed; subject to CNIL's enhanced-scrutiny guidance.
- **No age-gate in UI.** No recognition of minority status in backend. See G-13.

---

## 6. Article-by-Article Gap Analysis

### Art. 5 — Principles

| Principle | Compliance | Evidence / gap |
|---|---|---|
| 5(1)(a) **lawfulness, fairness, transparency** | ❌ | No privacy notice (G-01); false "France" claim in LoginPage.jsx:274 (G-02) |
| 5(1)(b) **purpose limitation** | ⚠️ | `photo_url` kept without active purpose (§5 table); pedagogical-extraction purpose not in patient consent trail (G-11) |
| 5(1)(c) **data minimisation** | ❌ | Free-text `notes`, `summary`, `narrative` everywhere; no structured vocabulary; `emotional_maturity_history` accumulates historical psychometric scores (§5 table); `children` birth years stored (§5 table); seed/transfer SQL committed with real emails (G-05) |
| 5(1)(d) **accuracy** | ⚠️ | `client_name` snapshot drift in `reports` not synchronised with `clients.partner_a` changes; no patient-side rectification flow (G-08) |
| 5(1)(e) **storage limitation** | ❌ | No retention schedule enforced. `clients.deleted_at` is **soft-delete only**; "definitive deletion" on DeletedClientsPage actually cascades FK DELETEs but leaves no audit trail (G-12). `audio_file` column has no retention mechanism despite template promising 30-d deletion |
| 5(1)(f) **integrity, confidentiality** | ⚠️ | Tenant isolation is designed but RLS has gaps (§5; G-07); no column-level encryption for `audio_file`, `ai_synthesis`, `notes` |
| 5(2) **accountability** | ❌ | No RoPA (§3), no DPIA (G-04), no DPO contact, no access log |

### Art. 6 — Lawfulness

- **Primary basis for therapist-to-patient data is Art. 6(1)(b)** (performance of therapy contract) combined with Art. 9(2)(h) medical care. This is correct in principle but **not documented anywhere in the repo**. The consent template mixes "consentement explicite Art. 6(1)(a) et Art. 9(2)(a)" (`docs/template_consentement_patient.md:70`) — which actually applies **only** to the audio-recording finalities, **not** to the base therapy follow-up. Using consent as the basis for the main therapy contract is a documented CNIL anti-pattern (the patient cannot meaningfully withdraw without terminating therapy) — EDPB Guidelines 05/2020 §47.
- **Pedagogical extraction (finalité 3)** correctly uses consent; but the lawful-basis swap between finalities is undocumented in the app.

### Art. 7 — Conditions for consent

- ❌ No consent ledger (who consented to what, when, for which finality).
- ❌ No in-app mechanism for **withdrawal** (template §10 assumes manual email / form).
- The separability test (Art. 7(2)) is respected in the paper template (checkboxes per finalité) but not in the app.

### Art. 8 — Children

- `clients.children` JSONB collected in `EditIdentityModal.jsx:348-360`.
- ❌ No parental-consent flow.
- ❌ No data-minimisation logic for minors (birth years stored; could be replaced by age-bracket).

### Art. 9 — Special-category data

- ❌ Processed at scale without the additional safeguards that Art. 9(3) and French *Code de la santé publique* require.
- ❌ Not HDS-hosted (despite ambiguous claim in consent template §7).
- ❌ No access log for `reports` rows.
- ❌ No stronger authentication than Google OAuth (no 2FA required for therapists).

### Art. 13/14 — Information

- ❌ No privacy notice. Login-page spans with `cursor:pointer` (`LoginPage.jsx:306`) pretend to be links but are not. This is a **structural** breach of Art. 13.
- ❌ Email / transactional emails: none implemented by the product; therapist contact is via `mailto:contact@coachcrm.fr` (`LoginPage.jsx:289`) — that mailbox domain is **not** the same as `kotech.ai` → identity confusion (G-02).

### Art. 15 — Access

- Therapist can see their own data (tenant view).
- ❌ Patients cannot access their own data via the app. The paper consent template (§8) tells them to ask the therapist by email.

### Art. 16 — Rectification

- Therapist can rectify via `EditIdentityModal.jsx`.
- ❌ Patient-initiated rectification not available in-app.

### Art. 17 — Erasure

- Soft-delete via `clients.deleted_at` (`DeletedClientsPage.jsx:14`).
- Hard-delete via `deleteClient` in `src/services/dataService.js:70-79`: cascades to `reports`, `sessions`, `contacts` — but **does not** delete: `client_links`, `therapy_cycles`, `invoices`, `invoice_sessions`, `professional_referrals`, auth row, audio files (no storage bucket integration).
- ❌ No **audit log** of erasure → accountability gap.
- ❌ No patient-facing erasure request path.

### Art. 18 — Restriction of processing

- ❌ Not implemented.

### Art. 19 — Notification of rectification / erasure to recipients

- ❌ Not implemented (no recipients list to notify anyway — this is a consequence of G-01).

### Art. 20 — Portability

- Partial: `src/services/exportService.js:4-94` produces an Excel dossier for export. But:
  - It is triggered by the **therapist** from `ClientHeaderPanel.jsx:82`, not by the patient.
  - It **combines both partners** into one file — a portability request from partner A would leak partner B's data.
  - It does not cover `reports`, `contacts`, `therapy_cycles`, `invoices`.

### Art. 21 — Object

- ❌ Not implemented.

### Art. 22 — Automated decision-making

- **AI synthesis** (`clients.ai_synthesis`) and **pattern detection** (`reports.patterns`) are AI outputs used by therapists to inform their practice.
- Strictly, these are **decision-support**, not fully automated decisions, so Art. 22(1) does not bite. However, the EDPB Guidelines on Automated Individual Decision-Making warn that systematic AI-output consumption with no meaningful human review drifts into Art. 22 territory.
- ❌ The app has **no "human-in-the-loop" audit signal** — there is no flag on a report indicating whether the therapist reviewed it vs. accepted the AI output verbatim.

### Art. 24–25 — Responsibility of the controller + privacy by design/default

- ❌ Privacy by design is not evidenced: schema accumulates free-text sensitive columns; no encryption; no masking; audit log absent.

### Art. 26 — Joint controllers

- ❌ CoachCRM's secondary formation business (extraction of pedagogical content for formation-sale) makes it a joint controller with the therapist for that purpose (§2 table). No Art. 26 arrangement documented.

### Art. 28 — Processor contract

- ❌ No DPA signed with Supabase, Vercel, Google. No terms-of-service version in repo for CoachCRM-to-therapist relation either.

### Art. 30 — Records of processing

- ❌ No RoPA (draft provided in §3 of this audit).

### Art. 32 — Security of processing

- Partial: HTTPS (Vercel, Supabase), RLS declared (albeit patchy), session tokens in localStorage only.
- ❌ No encryption of sensitive columns; no access-log table; no backup retention documented; no restore test; no pentest.
- ❌ Google OAuth only — no 2FA requirement for therapists; if the therapist's Google account is compromised, the entire tenant is compromised.

### Art. 33/34 — Breach notification

- ❌ No incident-response runbook; no pager / alerting; no 72-hour procedure documented.

### Art. 35 — DPIA

- **Mandatory**. See §10 below.

### Art. 37 — DPO

- Under Art. 37(1)(c), a DPO is mandatory when core activities consist of **large-scale processing of Art. 9 data**. CoachCRM-as-processor, once it has multiple therapist-tenants each with ~100 couples (= thousands of couples in Art. 9), **crosses "large-scale" threshold**. EDPB WP243 criteria (number of subjects, geography, duration, volume of data) → at scale, all four are met.
- ❌ No DPO designated in repo. Acceptable at MVP (5 testers), **not** acceptable at the stated 2-year horizon.

### Art. 44–49 — Cross-border transfers

- Supabase UK: adequacy decision → OK technically, but contradicts "France" marketing claim.
- Google / Vercel: DPF → OK, must be disclosed.
- Future transcription + LLM providers: to be selected **with transfers in mind** (prefer EU-only).

---

## 7. French-Specific Analysis

### Loi 78-17 (Loi Informatique et Libertés, revised by Loi 2018-493)

- Art. 9 LIL (national rules on special categories) mirrors Art. 9 GDPR; adds France-specific authorisation regimes for health-data processing **outside the direct care relationship** (e.g. research). CoachCRM's "finalité 2" (amélioration de la pratique professionnelle) and "finalité 3" (production de contenu pédagogique) sit at the edge of the direct-care exemption and would benefit from CNIL-methodology conformity (e.g. MR-004 reference methodology for retrospective studies — does not fit here, but the shape of the compliance logic is similar).

### Code de la santé publique L1110-4 (secret médical)

- Psychotherapy performed by a CNV-trained therapist is **not** always practised by a health professional strictly in the Art. L4111-1 CSP sense — **psychotherapist** is a protected title (decree 2010-534), but CNV coaches are not automatically psychotherapists. The consent template calls the person a "coach thérapeute de couple" (`docs/template_consentement_patient.md:11`), which is ambiguous.
- Regardless of title, the content processed is health-related (emotional state, therapy phases, vigilance points) and subject to secret professionnel for Art. 226-13 Code pénal purposes.
- **Actionable**: clarify in the privacy notice which legal status the therapist claims (psychothérapeute enregistré ADELI vs. coach CNV) because it determines (a) whether HDS hosting is strictly required, (b) the applicable professional-secret regime.

### Code de la santé publique L1111-8 — HDS hosting

- **Strict reading**: "toute personne qui héberge des données de santé à caractère personnel recueillies à l'occasion d'activités de prévention, de diagnostic, de soins ou de suivi social et médico-social, pour le compte de personnes physiques ou morales à l'origine de la production ou du recueil desdites données" must be HDS-certified.
- Supabase is **not HDS-certified** (as of writing, only OVHcloud, Outscale, Scaleway, Clever Cloud, Docaposte, AWS-via-HDS-partner-wrapper, and a handful of others hold the certification).
- Therefore: **any marketing of CoachCRM to French therapists** as a product storing health data is legally fragile. At minimum:
  1. Remove the "Données hébergées en France, conformes RGPD" claim (`LoginPage.jsx:274`) — it is wrong and misleading (G-02).
  2. Remove the consent-template line "hébergement HDS si applicable" (`docs/template_consentement_patient.md:102`) or replace it with a truthful description of the current host.
  3. If the product wants to serve French health professionals at scale, migrate to an HDS-certified host (Scaleway / OVH / Clever Cloud) before public launch.

### Code de la consommation L121-2 — pratiques commerciales trompeuses

- The "Données hébergées en France" claim is a **false material element** about an essential characteristic (hosting location), targeting consumers (therapists). That is the textbook definition of a pratique commerciale trompeuse. Sanction: up to 2 years imprisonment and €300,000 fine (L132-2), or 10% of average annual turnover.
- This is a **regulatory risk independent of GDPR fines**.

### CNIL guidance for cabinet-médical software

- The *référentiel "gestion des cabinets médicaux et paramédicaux"* (déliberation 2019-083) details expected measures: access audit logs, encryption at rest of the DB + sensitive fields, identity-federation with pro-santé cards (CPS) for practitioners, 20-year retention for the dossier médical (ciblé for CoachCRM given the therapy context).
- CoachCRM meets **none** of the référentiel's concrete requirements.

### CNIL mandatory-DPIA list (déliberation 2018-327)

- Item: *"Traitements portant sur des données de santé nécessaires à la constitution d'une base de données ou d'un registre."* — applies since the product is literally a data-base of health information.
- Item: *"Traitements portant sur des données dont le transfert vers un pays hors UE est envisagé."* — will apply once transcription/LLM providers are chosen if non-EU.

---

## 8. Retention Schedule — draft

Adapted from: Code de la santé publique R1112-7 (20-year hospital dossier), CNIL *référentiel cabinet médical*, and the product's own consent template.

| Data category | Active | Intermediate archive (restricted) | Definitive purge |
|---|---|---|---|
| Therapist accounts (`users`, `auth.users`) | Life of contract | +3 years (commercial prescription) | Then delete |
| Client dossier identity (`clients` base) | Therapy duration | +5 years (template §6 `CR synthétique`) | Then anonymise |
| Reports / `narrative`, `themes`, `emotions_*`, `patterns`, `vigilance` | Therapy duration | +5 years | Then anonymise or purge |
| Raw audio (`sessions.audio_file`) | **30 days** post-transcription (per template §6) | — | Immediate destruction |
| Full transcripts | Therapy duration | +1 year (per template §6) | Then purge |
| Exercises, progress notes | Therapy duration | +5 years | Then purge |
| Contacts log | Therapy duration | +3 years | Then purge |
| Invoices / invoice_sessions | Invoice year | +10 years (Code de commerce L123-22) | Then purge |
| Billing address | End of billing cycle | +10 years | Then purge |
| Professional network entries | Active + 3 years inactivity | — | Purge after |
| AI synthesis (`ai_synthesis`) | Therapy duration | +5 years (treat as part of dossier) | Then purge |
| Pedagogical content extracted | If truly anonymised → indefinite (template §6); otherwise = same as reports | — | Audit anonymisation annually |
| Settings (`settings`) | Active | — | Purge on tenant termination |
| `client_links`, `therapy_cycles` | Therapy duration | +5 years | Then purge |
| Auth sessions / OAuth refresh tokens | Supabase default (1 h + 1 w) | Rotated by Supabase | — |
| Browser localStorage | Session lifetime | — | Cleared on logout (`src/App.jsx:170-176`) |

Implementation sketch:

- Add a `retention_policy` table mapping `(table, applies_if_predicate, keep_days)` + a nightly Supabase pg_cron job calling `SECURITY DEFINER` functions to anonymise/delete.
- Add an `erasure_log` table (immutable) recording `{tenant_id, subject_id, action, at, actor}`.

---

## 9. Incident Preparedness — current state and requirement

- **Current state**: no incident-response runbook in `docs/`, no alerting, no breach-notification template, no internal register.
- **Required**: a documented process that satisfies Art. 33 (supervisor notification within 72h) and Art. 34 (data subjects if high-risk).

Minimum deliverables (**none present**):

- `docs/incident_response.md` with: detection channels, severity scale, triage runbook, CNIL declaration link (`https://notifications.cnil.fr/notifications/index`), data-subject communication template, post-mortem template.
- Internal breach register (required by Art. 33(5), even for breaches that are not notified).
- Annual tabletop breach exercise.

---

## 10. DPIA trigger assessment

CNIL déliberation 2018-327 — a DPIA is mandatory when any one of the 14 listed processing types applies OR when at least two of the nine EDPB WP248 criteria apply. CoachCRM matches:

| CNIL mandatory list item | Applies? | Why |
|---|---|---|
| *"Traitements de données de santé mis en œuvre par les établissements de santé ou les médico-sociaux pour la prise en charge des personnes"* — adapted by analogy | **Yes** | Psychotherapy dossiers, audio, transcripts, vigilance flags |
| *"Traitements portant sur des données dont le transfert vers un pays hors UE est envisagé"* | **Yes (planned)** | Future transcription/LLM providers |
| *"Traitements ayant pour finalité la recherche ou la formation professionnelle utilisant des données de santé"* | **Yes** | Business #2 extracts pedagogical content from therapy sessions (`docs/synthese_strategique.md:175-214`) |
| *"Traitements à grande échelle de données biométriques"* | **Partial** | Voice is biometric; Art. 9 triggers once used for identification — CoachCRM doesn't, but future speaker-diarisation might |

| EDPB WP248 criterion | Applies? |
|---|---|
| Evaluation or scoring | **Yes** — `emotional_maturity`, `patterns` |
| Automated decision with legal / significant effect | Not yet — review before enabling AI-led suggestions |
| Systematic monitoring | **Yes** — continuous session recording planned |
| Sensitive data or data of a highly personal nature | **Yes** — Art. 9 throughout |
| Large scale | **Planned** — 100 couples × 5 therapists MVP → scaling to "x5 en 2 ans" |
| Matching / combining datasets | **Yes** — pedagogical extraction combines many couples' sessions |
| Data concerning vulnerable subjects | **Yes** — patients in therapy, potentially minors in "family" mode |
| Innovative tech | **Yes** — LLM clinical synthesis |
| Prevents exercise of a right | Partial — no in-app rights workflow prevents Art. 15-20 exercise |

**Conclusion**: DPIA is **required** and currently **absent**. Should be performed with CNIL's PIA software (`https://www.cnil.fr/fr/outil-pia-telechargez-et-installez-le-logiciel-de-la-cnil`) or via an external privacy consultant, before MVP launch.

---

## 11. Cookies / Tracking inventory

| Storage | Purpose | Strictly necessary? | Consent required? |
|---|---|---|---|
| `localStorage['coachcrm-auth-token']` (`src/lib/supabase.js:12`) | Supabase session (JWT) | Yes | No (CNIL délibération 2020-091 §§strictly necessary) |
| `localStorage['coachcrm_onboarding_done']` (`src/App.jsx:140, 172, 201`) | Gate against re-showing the onboarding wizard | Functional / minor UX | **Grey area** — arguably UX-only; if implemented as a per-user DB flag instead, zero cookie issue |

**No analytics SDKs, no advertising pixels, no social-media scripts detected** (verified in `package.json`). **Positive finding.**

Recommendation: document both keys in the privacy notice under "Stockage local — fonctionnement du service". Consent banner not required because no tracker is used. If analytics is later added (even self-hosted Plausible or Matomo), review consent requirements per CNIL's 2020-091 guidance.

---

## 12. Consent Capture for Patients — current paper flow vs. recommended in-app

**Current state** (`docs/template_consentement_patient.md`):

- Paper form, printed and signed by both partners and the therapist.
- Stored in the therapist's paper file.
- **No digital trace in the app** — nothing in `clients`, `sessions`, or `reports` records whether and when consent was captured, nor for which finalité (clinical memory / amélioration pratique / pedagogical extraction).

**Legal consequence**: the therapist cannot demonstrate compliance with Art. 7(1) (burden of proof on the controller to show consent was obtained). In a CNIL inspection, the inspector would ask: "show me consent for patient X" — the therapist says "paper, in my cabinet" — inspector says "okay, but your SaaS also processes this patient's data, who is accountable?" — the answer must be clear and reproducible.

**Recommended**:

1. Add a `patient_consents` table (columns: `id`, `client_id`, `partner` enum {a, b}, `finality` enum {clinical_memory, practice_improvement, pedagogical_content}, `granted_at`, `withdrawn_at`, `evidence_file_path` optional, `evidence_hash` optional, `created_by`).
2. Add a drawer in `ClientDetailPage.jsx` where the therapist records consent and optionally uploads a scan of the signed paper → stored in a private Supabase bucket with server-computed SHA-256 hash (for integrity) and short signed URLs.
3. Enforce in server-side logic: `sessions.audio_file IS NULL` unless `patient_consents` has `finality='clinical_memory'` for all partners.
4. Surface a withdrawal button patient-facing eventually (post-MVP) — for now at least give therapist a single-click "revoke" that invalidates the consent row and triggers a purge of audio/transcripts still in the 30-day window.

---

## 13. Findings

### Severity scale

- 🔴 **Critical** — blocks production launch. Legal or regulatory breach with material fine risk or false-advertising exposure.
- 🟠 **High** — must be fixed in first sprint post-launch.
- 🟡 **Medium** — must be fixed within 90 days.
- 🔵 **Low / Informational** — good-hygiene items.

Code prefix: `G-NN` (GDPR).

---

### 🔴 Critical

#### G-01: No privacy notice anywhere; fake links on login page

- **GDPR article**: Art. 12(1), Art. 13, Art. 14. French: LCEN Art. 6 (obligation of website editor identification).
- **Location**: `src/pages/LoginPage.jsx:305-307`:
  ```
  En vous connectant, vous acceptez nos
  <span style={{ color: 'rgba(218,165,32,0.6)', cursor: 'pointer' }}>conditions d'utilisation</span>
  et notre
  <span style={{ color: 'rgba(218,165,32,0.6)', cursor: 'pointer' }}>politique de confidentialité</span>.
  ```
  These are `<span>`s styled to look like links but have **no `href` and no `onClick`**. They lead nowhere.
- No `/privacy` route in `src/App.jsx:216-228`.
- No mentions légales.
- **Risk**: baseline Art. 13 breach; CNIL fines under Art. 83(5)(b) can reach €20m / 4% turnover; reliable CNIL enforcement pattern for missing notices; also LCEN exposure.
- **Evidence observed**: None of the 14 Art. 13 items (controller identity, DPO contact, purposes, lawful basis, recipients, third-country transfers, retention, rights, consent-withdrawal route, right to complain, obligatory / voluntary nature, automated decisions) are surfaced in UI or email.
- **Recommendation**:
  1. Publish a `/privacy` page and a `/cgu` page accessible **without authentication**.
  2. Turn the spans into real `<a href="/privacy">` links.
  3. Populate the notice with the full content list enumerated in Art. 13 plus the RoPA-derived data (see §3 of this audit).
  4. Add the same privacy-notice link to the footer of the authenticated app (`Sidebar.jsx` or `Layout.jsx`).
  5. For emails (none yet — future): standard footer with controller identity + rights + DPO.

---

#### G-02: False marketing claim "Données hébergées en France" while Supabase is in London (UK)

- **GDPR article**: Art. 5(1)(a) loyauté; Art. 13(1)(e) recipients; Art. 44.
- **French law**: **Code de la consommation L121-2** (pratique commerciale trompeuse).
- **Location**:
  - `src/pages/LoginPage.jsx:274`:
    ```
    { icon: Shield, text: 'Données hébergées en France, conformes RGPD' }
    ```
  - Contradicted by `audit/live_schema/README.md:20` — Supabase region `eu-west-2 = London`.
  - Reinforced ambiguously in `docs/template_consentement_patient.md:102` — "hébergement HDS si applicable" (suggests HDS is in place; it is not).
- **Risk**: three-layer risk:
  1. GDPR transparency breach (Art. 5(1)(a)).
  2. Consumer-law breach — DGCCRF / Code de la consommation L121-2 → up to 2 years + €300,000, or 10% of turnover (L132-2).
  3. Contract defence — therapists who sign up on this claim and later discover the misrepresentation can rescind for dol (Art. 1137 Code civil).
- **Recommendation**:
  1. **Immediate**: remove the "Données hébergées en France" claim from `LoginPage.jsx:274`.
  2. **Short-term**: migrate Supabase project to an EU region (`eu-central-1` Frankfurt, or `eu-west-3` Paris, or `eu-west-1` Dublin) if staying on Supabase.
  3. **Medium-term**: if the product wants to keep the "France" + HDS claim, migrate to an HDS-certified EU host (Scaleway, OVH, Clever Cloud). Document this in the privacy notice.
  4. Rewrite the consent template §7 to describe the **actual** hosting (not hypothetical).

---

#### G-03: Article 9 health data processed without DPIA, HDS, or minimum safeguards

- **GDPR article**: Art. 9(1)–(2)(h), Art. 32, Art. 35.
- **French law**: Code de la santé publique L1110-4, L1111-8 (HDS), L1111-7.
- **Location**: any column in §5 flagged ⚠️, notably:
  - `clients.notes`, `clients.ai_synthesis`, `clients.emotional_maturity_history`, `clients.note_vigilance` (drift)
  - `sessions.summary`, `sessions.audio_file`
  - `reports.narrative`, `reports.vigilance`, `reports.emotions_a`, `reports.emotions_b`, `reports.patterns`, `reports.pedagogical_content`
- **Risk**: Processing Art. 9 data is **prohibited by default**. Art. 9(2)(h) (medical care) requires: (a) a health professional subject to secret (not always the case for CNV coaches — see §7); (b) appropriate safeguards (none in place). Failure: administrative fine up to €20m / 4% turnover (Art. 83(5)).
- **Recommendation**:
  1. Run a DPIA (see G-04).
  2. Migrate to HDS-certified host or clearly state the product is **not for French health-regulated activity** (which contradicts the product vision).
  3. Add column-level encryption (pgsodium + Supabase Vault) for the most sensitive text columns: `reports.narrative`, `reports.vigilance`, `clients.notes`, `clients.ai_synthesis`, `sessions.summary`, `sessions.audio_file` path.
  4. Add an `sensitive_access_log` table populated on every read (via `SECURITY DEFINER` view wrapper) of a `reports` row.
  5. Require 2FA for therapists (Supabase Auth MFA).
  6. Document the Art. 9(2) derogation in the privacy notice (Art. 9(2)(h) for direct care, Art. 9(2)(a) for pedagogical extraction).

---

#### G-04: No DPIA (Article 35) despite mandatory triggers

- **GDPR article**: Art. 35.
- **Location**: no DPIA artefact anywhere in the repo; `docs/synthese_strategique.md:308` marks it as "🔴 Avant le MVP" — acknowledged but not done.
- **Risk**: ungated launch of health-data processing without DPIA is among the textbook CNIL enforcement patterns.
- **Evidence**: §10 of this audit lists the triggers. 4+ apply.
- **Recommendation**:
  1. Perform DPIA using CNIL PIA software; scope = all 15 RoPA rows in §3.
  2. Include stakeholder consultation — at least two pilot therapists + one patient representative.
  3. Document residual risks and acceptance criteria.
  4. Publish an executive summary of the DPIA in the privacy notice (Art. 35(9)).

---

#### G-05: Real personal data committed to version control (seed.sql, transfer_data.sql)

- **GDPR article**: Art. 5(1)(f), Art. 32. French: Loi 78-17 Art. 34.
- **Location**:
  - `supabase/seed.sql:8` — `'anne-chantal.meyer@gmail.com'` (full name + personal Gmail).
  - `supabase/seed.sql:13-57` — **synthetic** client data but with realistic PII shape (`sophie.d@email.com` etc.) that a reader could inadvertently try to contact.
  - `supabase/transfer_data.sql:19,22` — `'anne-chantal.meyer@gmail.com'` and `'claudia@kotech.ai'` both hardcoded.
- **Risk**: the repo is private today, but:
  - Any leak (compromised developer laptop, forked branch pushed public) exposes these identities.
  - `anne-chantal.meyer@gmail.com` is almost certainly the actual founder — doubly sensitive (she is also a testimonial in `LoginPage.jsx:33`).
  - Version-control history is **forever**: even if removed now, the data is still in Git history.
- **Recommendation**:
  1. Replace real emails in `seed.sql` and `transfer_data.sql` with unambiguous placeholders (`therapist@example.local`, `target@example.local`).
  2. Delete `transfer_data.sql` — it is a one-shot migration and should not live in the repo long-term (also noted in `audit/live_schema/tables.md:86`).
  3. Run `git filter-repo` (or BFG) to scrub the history of these emails, then force-push (coordinate with collaborators).
  4. Add a pre-commit hook (e.g. `gitleaks`) to block future PII / secret commits.
  5. Add to `.gitignore`: `supabase/seed*.sql` if the seed will hold real names.

---

#### G-06: Audio recordings planned with no storage, encryption, or 30-day retention mechanism

- **GDPR article**: Art. 5(1)(e), Art. 5(1)(f), Art. 9, Art. 32.
- **Location**:
  - `supabase/migration.sql:52` — `audio_file TEXT` column. No foreign-key to a `storage.objects` row; no policy.
  - `src/hooks/useSessionModalState.js:35-52` — `handleStartRecording` is a fake (setTimeout pipeline inserting random sample transcriptions). No real upload path implemented yet.
  - `docs/template_consentement_patient.md:90` promises 30-day deletion of raw audio — no code enforces it.
- **Risk**: the MVP ship date for audio is imminent (per roadmap `docs/synthese_strategique.md:260-277`). Without a storage bucket + RLS + encryption + 30-d purge job, the first real upload becomes a data-protection incident.
- **Recommendation** (before first production audio upload):
  1. Create a private Supabase Storage bucket `session-audio` with RLS scoped by `(tenant_id, client_id)`.
  2. Short signed URLs (≤300 s) for playback.
  3. Nightly cron job deleting audio objects whose `created_at < now() - 30d`.
  4. Encrypt the audio at rest with a per-tenant KEK (Supabase Vault / pgsodium). Do not trust infrastructure-level disk encryption alone for Art. 9.
  5. Require consent row (`patient_consents`) before allowing upload — see §12.
  6. Audit log every upload + every download.
  7. If a transcription provider is non-EU, sign SCCs + DPA, perform TIA before send.

---

#### G-07: RLS gaps — `users`, `therapy_cycles`, `invoices`, `invoice_sessions` without policies in VCS; `reports` policy lacks WITH CHECK

- **GDPR article**: Art. 5(1)(f), Art. 32(1), Art. 25.
- **Location**:
  - `audit/live_schema/tables.md:100-106` — these four tables have **no RLS policy declared in VCS**.
  - `supabase/migration.sql:165-172` — `ALTER TABLE … ENABLE ROW LEVEL SECURITY` is declared for 8 tables, but policies in lines 175-182 are `FOR ALL USING (...)` without `WITH CHECK (...)`. A PostgreSQL RLS policy with only `USING` applied to `FOR ALL` **does not restrict INSERT/UPDATE/DELETE** (PostgreSQL docs: when `WITH CHECK` is omitted, the `USING` expression is used as the `WITH CHECK` for UPDATE/DELETE but **not for INSERT**). INSERT is unrestricted.
  - `src/services/invoiceService.js:10-21` — `getInvoices` filters by `user_id` client-side, meaning security depends on application correctness, not the database.
- **Risk**:
  - Therapist A can forge a `reports` row with `client_id` belonging to therapist B (since INSERT is unchecked); subsequent SELECT is blocked by the `USING`, but the row exists and disturbs data integrity.
  - `invoices` / `invoice_sessions` if RLS-off in production mean cross-tenant enumeration. **Privacy of billing patterns is a trade secret + business PII**.
  - `users` table accessed raw in `AdminPage.jsx:14-17` — which works only because *some* RLS policy exists on `users` in the live DB that permits it (not in VCS). A drift between VCS and live = **production mystery**.
- **Recommendation**:
  1. Commit the missing RLS policies to `supabase/` and document them.
  2. Add `WITH CHECK (user_id = auth.uid())` to every `FOR ALL` policy.
  3. Add a specialised policy for `users`: therapists see themselves only; admins see all.
  4. For `invoice_sessions`, write a policy like `invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())`.
  5. Audit live DB against VCS as part of CI.
  6. See also `02_security.md` once produced.

---

### 🟠 High

#### G-08: No Article 15–22 workflow for patients (data subjects)

- **GDPR article**: Art. 15–22.
- **Location**: no patient-facing UI (login is therapist-only); `DeletedClientsPage.jsx` is therapist-only; export in `exportService.js` is therapist-initiated and combines both partners (§6).
- **Risk**: patient cannot exercise rights; therapist cannot fulfil a DSAR in reasonable time.
- **Recommendation**:
  1. Build a DSAR intake channel (`privacy@coachcrm.fr` mailbox; publish in privacy notice).
  2. Backend: a `dsar_requests` table + a tool for the CoachCRM operator to extract per-subject data (`clients.partner_a.email = <email>` → all reports, sessions, contacts).
  3. Partition the export by partner when a couple files a DSAR — do not leak the other partner's data without their separate authority.
  4. Eventually: patient portal (out of MVP scope).

---

#### G-09: Free-text columns accumulate sensitive data without minimisation guards

- **GDPR article**: Art. 5(1)(c), Art. 25.
- **Location**: `clients.notes`, `reports.narrative`, `sessions.summary`, `contacts.note`, `professionals.note`, `clients.note_vigilance`, `clients.note_dynamique`, `clients.note_axes`, `clients.note_objectifs`, `clients.axes_travail`, `clients.points_vigilance`, `clients.objectifs`, `clients.dynamique_relationnelle`, `sessions.cancellation_reason` (drift).
- **Risk**: classic data-accumulation pattern. Users will enter medical diagnoses, family history, political views, religious practice, violent incidents — all without structured constraint. CNIL's recurring finding in HR/CRM audits.
- **Recommendation**:
  1. UI guidance (tooltips, placeholders) reminding users not to enter special-category data beyond what is strictly necessary.
  2. Nightly regex scan for `NIR` / IBAN / credit-card / medical-code patterns; alert the CoachCRM operator (meta-check, no content shown).
  3. Reduce the number of overlapping note columns to one canonical field (`audit/live_schema/tables.md:37-43` lists 8 overlapping note columns on `clients` — governance disaster).
  4. On erasure request, ensure all free-text columns are cleared (current `deleteClient` in `dataService.js:70-79` cascades to FKs but doesn't touch soft-deleted `clients` rows).

---

#### G-10: No encryption of sensitive columns beyond infrastructure default

- **GDPR article**: Art. 32(1)(a).
- **Location**: no pgsodium / Supabase Vault / column encryption anywhere in migrations.
- **Risk**: Supabase encrypts disk by default, but a leaked service-role key, a compromised backup file, or an internal Supabase admin can read `reports.narrative` in plain text. For Art. 9 data this is below the "appropriate" bar.
- **Recommendation**:
  1. Enable Supabase Vault.
  2. Encrypt (at column level) the following: `reports.narrative`, `reports.vigilance`, `clients.notes`, `clients.ai_synthesis`, `clients.note_vigilance`, `clients.note_dynamique`, `sessions.summary`, `sessions.audio_file` (path only; the object is encrypted separately).
  3. Keys managed via Supabase Vault + rotated yearly.
  4. Note that pgsodium limits indexing/search — agree with product on which columns lose full-text search (acceptable trade-off for the sensitive ones).

---

#### G-11: Pedagogical-content extraction — effective anonymisation unverified and consent-trail absent

- **GDPR article**: Art. 5(1)(b) purpose limitation; Art. 9(2)(a) consent; Art. 26 joint-controller.
- **Location**:
  - `reports.pedagogical_content` JSONB column (`supabase/migration.sql:80`).
  - Business model `docs/synthese_strategique.md:175-214`: "Agrégation par thématique … Regroupe les explications similaires de N séances … Lead magnet gratuit → modules payants".
  - Consent template `docs/template_consentement_patient.md:49-50`: promises anonymisation.
- **Risk**:
  - If pedagogical content can be **linked back to a couple** through narrative context ("Le couple X racontait que…"), the anonymisation is ineffective → **still Art. 9 data** → re-sale as formation content = personal-data sale without lawful basis.
  - Consent trail is paper-only → cannot be produced on demand per couple per finality.
  - CoachCRM becomes a joint controller for the formation business; Art. 26 arrangement is missing.
- **Recommendation**:
  1. Define an anonymisation standard (remove first names, demographics, context specifics; cluster across N ≥ 5 different couples).
  2. Implement and document an anonymisation review workflow: every piece of pedagogical content is reviewed by the CoachCRM operator + one independent reviewer before being extracted from `reports.pedagogical_content` into the formation store.
  3. Store the `patient_consents` row proving consent to finalité 3 before any extraction.
  4. Draft and publish an Art. 26 joint-controller arrangement between the therapist and CoachCRM.

---

#### G-12: Erasure does not cascade across all personal-data rows; no audit trail

- **GDPR article**: Art. 17, Art. 5(2) accountability.
- **Location**:
  - `src/services/dataService.js:70-79` — `deleteClient` cascades to `reports`, `sessions`, `contacts` — but omits `client_links` (both inline JSONB and the `client_links` table where this client appears as `linked_client_id`), `professional_referrals`, `therapy_cycles`, `invoices`, `invoice_sessions`, audio objects, `ai_synthesis` JSONB inside `clients` (deleted **with** `clients` row), orphaned `professionals.referrals` (drift column).
  - `clients.deleted_at` soft-delete (`DeletedClientsPage.jsx:14`) is the "archived" state before permanent delete; but hours/days/years between the two without retention policy.
  - No `erasure_log` table.
- **Risk**: incomplete erasure = the controller cannot certify to a patient that their data is gone; residual rows are still subject to RLS + RoPA obligations.
- **Recommendation**:
  1. Expand `deleteClient` to a server-side RPC that handles the full cascade inside a transaction (sessions → reports → contacts → client_links → professional_referrals → therapy_cycles → invoice_sessions → invoices (or anonymise for the 10-year accounting retention) → audio objects).
  2. Log every erasure into `erasure_log` (who, when, which subject, what was removed, what was kept under retention).
  3. Anonymise — don't delete — rows subject to mandatory retention (invoices); replace patient name with `"[erased]"`.
  4. Apply the same cascade when a therapist-tenant is deactivated.

---

#### G-13: Children collected in `clients.children` JSONB without Article 8 protections

- **GDPR article**: Art. 8 (child consent / parental authority).
- **Location**: `src/components/client/EditIdentityModal.jsx:327-360` — collects child first name + birth year; saved to `clients.children` JSONB (drift column — `audit/live_schema/tables.md:33`).
- **Risk**: children's data requires parental authority + enhanced CNIL scrutiny. CoachCRM collects it without:
  - A minor-specific data-minimisation path (age-bracket instead of birth year).
  - A parental-consent capture row.
  - A retention that considers the child's future capacity to exercise rights.
- **Recommendation**:
  1. Replace `birthYear` with `ageBracket` (≤6 / 7-12 / 13-17 / ≥18) unless a concrete clinical reason requires precision.
  2. Add a `consent_type = 'parental_authority'` variant in `patient_consents`.
  3. Document child-data handling in the privacy notice (retention, deletion at age of majority, specific access procedure).

---

#### G-14: Professional-network entries (`professionals`) collected without informing the data subjects

- **GDPR article**: Art. 14 (data not obtained from the subject).
- **Location**: `src/pages/ReseauProPage.jsx` — therapist records names + emails + phones + addresses of other professionals (doctors, lawyers, etc.) without any mechanism informing those professionals they were added.
- **Risk**: Art. 14 requires information to be provided to the data subject when data is collected from a third party. A physician whose contact is stored in CoachCRM has a right to know.
- **Recommendation**:
  1. Add a prompt when a professional is added: "Have you informed this person that you are storing their details in CoachCRM? (required by Art. 14 RGPD)"
  2. Offer a one-click email to the professional with the standard Art. 14 notice.
  3. Alternative: limit what can be stored in `professionals.note` (no clinical detail about that professional's patients).

---

#### G-15: No access log for sensitive reads

- **GDPR article**: Art. 32(1)(b), Art. 5(2).
- **Location**: no `sensitive_access_log` table; no view-level wrapper on `reports`.
- **Risk**: if a therapist's account is compromised and an attacker reads every `reports.narrative`, there is no trace. For Art. 9 data, this is below the expected standard.
- **Recommendation**: add an `access_log` table populated by a `SECURITY DEFINER` function wrapping SELECT on `reports` and `sessions.audio_file`. Report suspicious access patterns (mass read) to the CoachCRM operator daily.

---

#### G-16: Google OAuth sole authentication path; no MFA for therapists

- **GDPR article**: Art. 32(1)(b) appropriate security.
- **Location**: `src/pages/LoginPage.jsx:11-20`, `src/App.jsx:132-155`. No MFA requirement on the Google account, no app-level second factor.
- **Risk**: a therapist whose Google account is phished gives the attacker full tenant access to Art. 9 data of 100+ couples.
- **Recommendation**:
  1. Enforce MFA-required on Supabase Auth side (when Google OAuth IdP is used, the MFA check happens in Google — Google MFA must be verified at sign-up; if not configured, refuse login).
  2. Offer an in-app email+password fallback with TOTP as a second factor, for therapists whose Google posture is weak.
  3. Document in the privacy notice the mandatory MFA requirement.

---

### 🟡 Medium

#### G-17: `photo_url` kept for no operational purpose

- **GDPR article**: Art. 5(1)(b) purpose limitation.
- **Location**: `supabase/migration.sql:11`, `src/App.jsx:84,98`, `src/pages/AdminPage.jsx:16,132`.
- **Risk**: a photo of the therapist is imported from Google and displayed only on the admin console. Not biometric in the Art. 4(14) sense (unless used for identification, which it is not), but still personal data with no operational need beyond display.
- **Recommendation**: either drop the column and stop fetching `meta.avatar_url`, or gate the display behind a therapist preference ("afficher ma photo à l'admin").

---

#### G-18: `settings.therapy_phases` is stored as JSON with unbounded shape; may leak personal info via free-text phase labels

- **GDPR article**: Art. 5(1)(c).
- **Location**: `src/components/OnboardingWizard.jsx:34-43`, `src/pages/SettingsPage.jsx:35,45-51`.
- **Risk**: therapist can name a phase "Phase traumatique post-AVC" — then this label appears on every client card for that therapist's couples. Minor but real purpose-creep.
- **Recommendation**: enforce phase-label length (≤30 chars) and reject labels containing obvious Art. 9 keywords via a UI-level lint.

---

#### G-19: Onboarding marker in localStorage is per-device, not per-user

- **GDPR article**: Art. 5(1)(c); not fatal but minor.
- **Location**: `src/App.jsx:140` — `localStorage.getItem('coachcrm_onboarding_done')`.
- **Observation**: the key is **not namespaced per userId**, so if two therapists share a browser the second will skip onboarding. Likewise when the first deletes their account and a new therapist logs in.
- **Recommendation**: key the flag on `user.id` → `coachcrm_onboarding_done_{userId}` (matches the per-user pattern used elsewhere in well-designed SaaS).

---

#### G-20: `console.error` / `console.log` calls in production code may leak PII to browser dev-tools

- **GDPR article**: Art. 32(1) — confidentiality of processing.
- **Location**: 75 occurrences across 9 files (grep count). E.g. `src/services/dataService.js:12,22,35, ...` log raw Supabase errors which may contain payloads.
- **Risk**: a therapist's browser dev-tools console shows e.g. the full `clients` row payload on an error. If they record their screen (support video), PII leaks.
- **Recommendation**: gate `console.*` behind `if (import.meta.env.DEV)` or a small logger that redacts `email`, `phone`, `partner_a`, `partner_b`, `notes`, `narrative` before printing.

---

#### G-21: `client_links` table + inline JSONB — double source of truth causes retention drift

- **GDPR article**: Art. 5(1)(d) accuracy; Art. 17 erasure.
- **Location**: `supabase/migration.sql:114-122` (table) vs. `clients.client_links` JSONB (drift — `audit/live_schema/tables.md:33`). On delete of one client, both would need cleaning; neither `dataService.deleteClient` nor anything else touches the inline JSONB.
- **Recommendation**: deprecate one; consolidate to the table version for FK-cascade benefits; write a migration to rebuild the JSONB from the table or vice versa.

---

#### G-22: No terms of service for therapists

- **GDPR article**: Art. 28 (processor contract terms must exist for tenants).
- **Location**: `LoginPage.jsx:306` refers to "conditions d'utilisation" but they don't exist.
- **Risk**: first tenant dispute = no contract = consumer-protection fallbacks (Code de la consommation) apply with stronger pro-consumer tilt.
- **Recommendation**: publish CGU + DPA before MVP; link from login + account creation.

---

#### G-23: No SLA / availability commitment; no backup retention documented

- **GDPR article**: Art. 32(1)(b) availability; Art. 32(1)(c) ability to restore.
- **Location**: nothing in `docs/`.
- **Recommendation**: document Supabase's PITR window (7 days on Pro plan), commit to a backup-test quarterly, document RTO/RPO in the DPA.

---

#### G-24: No standard operating procedure (SOP) for data-subject requests

- **GDPR article**: Art. 12(3) — respond within 1 month.
- **Location**: no `docs/dsar_sop.md`.
- **Recommendation**: create a short runbook; include template responses, identity-verification steps, logging into `dsar_requests` table.

---

### 🔵 Low / Informational

#### G-25: No analytics / tracking — positive note

- `package.json` contains no GA/Mixpanel/Matomo/Sentry/PostHog. **Keep it that way** at MVP. If error reporting is later added, treat as processor.

---

#### G-26: Supabase Auth session stored in localStorage (not httpOnly cookie)

- **GDPR article**: Art. 32.
- **Observation**: Supabase's default; acceptable for the product's context but a minor XSS-exposure point. Supabase v2 supports PKCE flow with httpOnly cookie via `@supabase/ssr` — worth evaluating.

---

#### G-27: `dev_rls.sql` drops "Dev: public access" policies but only on 6 tables — leaves `professionals`, `client_links`, `professional_referrals`, `therapy_cycles`, `invoices`, `invoice_sessions` potentially open

- **Location**: `supabase/dev_rls.sql:6-11` and `audit/live_schema/tables.md:83-84`.
- **Risk**: if those "Dev: public access" policies were ever applied to those additional tables during development, they still grant `USING (true)` in production.
- **Recommendation**: run `SELECT schemaname, tablename, policyname, cmd, qual FROM pg_policies;` against live DB and drop any remaining dev policy.

---

#### G-28: Login-page photo-of-Anne-Chantal Meyer presented as testimonial

- **GDPR article**: Art. 6(1)(a)/(f) for marketing use.
- **Location**: `src/pages/LoginPage.jsx:33` — "Anne-Chantal Meyer, Thérapeute, Le Mans".
- **Observation**: presumably consented to as the founder/testimonial, but no consent documentation in repo.
- **Recommendation**: keep a signed marketing-consent form on file.

---

#### G-29: `upsertUser` upserts by email on every login — potential to overwrite role

- **Location**: `src/services/dataService.js:16-24`.
- **Observation**: `upsert({ id, name, email, role: 'therapist', photo_url }, { onConflict: 'email' })` — on every login, default `role='therapist'` is passed. If an admin re-logs, `App.jsx:79-89` uses `update` (not upsert) which preserves the existing role. But `upsertUser` is still available and risky for new pathways.
- **Recommendation**: drop the default `role` parameter from `upsertUser`, or restrict it to `getCurrentUser` lookups only.

---

#### G-30: Email placeholder `contact@coachcrm.fr` vs. actual company domain

- **Location**: `src/pages/LoginPage.jsx:289` — `mailto:contact@coachcrm.fr` while the rest of the repo says Kotech / kotech.ai (e.g. `supabase/transfer_data.sql:22` `claudia@kotech.ai`).
- **Observation**: brand-identity confusion. Emailing `contact@coachcrm.fr` may fail; identity of the controller is unclear to the user.
- **Recommendation**: unify contact domain; document in Mentions légales which legal entity operates the service.

---

## 14. Article 32 Security Measures — Summary Status

| Measure | Implemented? | Evidence | Comment |
|---|---|---|---|
| **(a) Pseudonymisation** | ❌ | — | `profiles.id`/`clients.id` are UUIDs but partner_a/partner_b stored as JSONB with plaintext names |
| **(a) Encryption — in transit** | ✅ | HTTPS via Vercel + Supabase | OK |
| **(a) Encryption — at rest, application-layer** | ❌ | No pgsodium / Vault usage | Gap for Art. 9 data — G-10 |
| **(a) Encryption — at rest, infrastructure** | ✅ (inherited) | Supabase default AES-256 at disk | Insufficient alone for Art. 9 |
| **(b) Ongoing confidentiality** | ⚠️ | RLS declared but patchy; no MFA | G-07, G-16 |
| **(b) Integrity** | ⚠️ | No audit log; no `WITH CHECK` on RLS policies | G-07, G-15 |
| **(b) Availability** | Inherited | Supabase HA + Vercel CDN | Document SLA in DPAs |
| **(b) Resilience** | Inherited | Supabase PITR | Verify retention window; test restore |
| **(c) Ability to restore** | Inherited | — | Document RTO/RPO |
| **(d) Regular testing** | ❌ | — | Add quarterly review + annual pentest |

---

## 15. DPIA Trigger Assessment — expanded table

| CNIL délibération 2018-327 criterion | Applies? | Evidence |
|---|---|---|
| Data of a highly personal nature | **Yes** | Art. 9 throughout — `reports.*`, `clients.notes`, audio |
| Large-scale processing | **Yes (planned)** | Roadmap: 5 therapists × 100 couples → scaling |
| Systematic monitoring | **Yes (planned)** | Continuous audio recording of sessions |
| Matching / combining datasets | **Yes (planned)** | Pedagogical-extraction pipeline cross-couple aggregation |
| Data concerning vulnerable subjects | **Yes** | Patients in psychotherapy; children in family mode |
| Automated decision-making with legal effect | No (nudges only for now) | LLM-produced synthesis is decision-support — borderline |
| Innovative technology | **Yes** | LLM clinical synthesis, voice transcription |
| Transfer outside EU | **Potential** | If LLM / transcription chosen US-based |
| Prevents data subject from exercising a right | **Partial** | No in-app rights workflow |

**≥2 criteria ⇒ DPIA mandatory. Current count: 6–7. DPIA required.**

---

## 16. What's Done Well

1. **Tenant isolation is designed into the schema** — `user_id` in every table; RLS enabled on the main 8 tables per `supabase/migration.sql:165-172`.
2. **No analytics or tracking SDKs** — `package.json` (30 lines, 7 runtime deps) is lean; no Sentry, no GA, no Mixpanel.
3. **Soft-delete pattern exists** — `clients.deleted_at` + `DeletedClientsPage.jsx` allows recovery from accidental archive.
4. **Logout hygiene** — `App.jsx:164-182` resets React state first, clears localStorage, calls `signOut({ scope: 'global' })`, redirects — textbook.
5. **Paper consent template is thorough** — `docs/template_consentement_patient.md` covers finalités separately, provides withdrawal form, mentions CNIL — good baseline material to digitise.
6. **Strategic plan acknowledges RGPD as 🔴 Critical for MVP** — `docs/synthese_strategique.md:308-313` explicitly flags privacy policy, CGU, consent as MVP blockers. The awareness is there.
7. **Single Supabase client singleton** — `src/lib/supabase.js` — minimises session-handling bugs.
8. **Scoped storageKey** — `storageKey: 'coachcrm-auth-token'` avoids collision with other Supabase apps on the same domain.
9. **JSONB schema for partners** (although it has downsides for column-level encryption) keeps identity data together per-partner, which simplifies partitioned DSAR responses.
10. **Retention thinking in the consent template** — `docs/template_consentement_patient.md:88-93` actually states concrete retention periods (30 d audio, therapy + 1 y transcripts, therapy + 5 y synthesis) — these only need to be enforced by code.

---

## 17. Remediation Plan (prioritised)

| # | Action | GDPR article / law | Priority | Effort | Owner |
|---|---|---|---|---|---|
| 1 | Remove "Données hébergées en France" claim from `LoginPage.jsx:274`; correct consent template §7 | Art. 5(1)(a); C. conso L121-2 | 🔴 Critical — **today** | S (<1 h) | Frontend + Legal |
| 2 | Publish `/privacy` + `/cgu` pages (public, no auth); link from login footer + email footers | Art. 13–14; LCEN | 🔴 Critical | M (3–5 d) | Legal + Frontend |
| 3 | Perform DPIA (CNIL PIA software) covering all 15 RoPA rows + planned audio/LLM flows | Art. 35 | 🔴 Critical | L (2–3 weeks) | DPO + external consultant |
| 4 | Sign DPAs with Supabase, Vercel, Google; migrate Supabase project to EU region (Frankfurt / Paris / Dublin) | Art. 28, 44–49 | 🔴 Critical | S (1 d + legal review) | Legal |
| 5 | Scrub `seed.sql` + delete `transfer_data.sql`; rewrite git history; add `gitleaks` pre-commit hook | Art. 32 | 🔴 Critical | S | Backend + Ops |
| 6 | Reconcile live DB RLS with VCS; add `WITH CHECK` to every RLS policy; cover `users`, `therapy_cycles`, `invoices`, `invoice_sessions` | Art. 32, Art. 5(1)(f) | 🔴 Critical | M (2–3 d) | Backend |
| 7 | Decide HDS posture (migrate host OR drop health-pro marketing) | L1111-8 CSP | 🔴 Critical | L | Leadership |
| 8 | Add `patient_consents` table + UI to capture consent before audio upload / LLM use | Art. 7, Art. 9(2)(a) | 🔴 Critical (before audio MVP) | M (4–6 d) | Full stack |
| 9 | Audio-storage pipeline: private bucket, 30-day purge cron, signed URLs, access log | Art. 5(1)(e), Art. 32 | 🔴 Critical (before audio MVP) | M | Backend |
| 10 | Designate a DPO (external OK); create `privacy@coachcrm.fr` mailbox | Art. 37 | 🟠 High | S | Leadership |
| 11 | Add `sensitive_access_log` + wrap `reports` SELECTs | Art. 32 | 🟠 High | M | Backend |
| 12 | Encrypt `reports.narrative/vigilance`, `clients.notes/ai_synthesis/note_*`, `sessions.summary` at column level | Art. 32(1)(a) | 🟠 High | M | Backend |
| 13 | Erasure cascade covering all personal-data tables + audio; `erasure_log` | Art. 17, Art. 5(2) | 🟠 High | M | Backend |
| 14 | DSAR workflow (inbox, `dsar_requests` table, per-partner export) | Art. 15–20 | 🟠 High | M | Full stack |
| 15 | Require MFA for therapists (Supabase Auth MFA + Google check) | Art. 32 | 🟠 High | S | Backend |
| 16 | Consolidate `client_links` duplication (table vs. JSONB); consolidate `notes*` columns | Art. 5(1)(d), Art. 17 | 🟠 High | M | Backend |
| 17 | Art. 14 notice for `professionals` entries (prompt + email) | Art. 14 | 🟠 High | S | Frontend |
| 18 | Children: replace `birthYear` with age-bracket; add parental-consent row | Art. 8 | 🟠 High | S | Full stack |
| 19 | Retention matrix (SQL + nightly cron) enforcing §8 above | Art. 5(1)(e), Art. 25 | 🟠 High | L (2 weeks) | Backend |
| 20 | Pedagogical-extraction anonymisation SOP + review workflow + Art. 26 arrangement | Art. 9(2)(a), Art. 26 | 🟠 High | M | Product + Legal |
| 21 | Replace `console.*` with a redacting logger in production | Art. 32 | 🟡 Medium | S | Frontend |
| 22 | Drop `photo_url` or gate it behind therapist preference | Art. 5(1)(b) | 🟡 Medium | S | Full stack |
| 23 | Incident-response runbook + breach register | Art. 33–34 | 🟡 Medium | S | Security |
| 24 | Per-user onboarding marker in localStorage | Art. 5(1)(c) | 🟡 Medium | S | Frontend |
| 25 | Cookie / storage inventory page (part of privacy notice) | CNIL 2020-091 | 🟡 Medium | S | Legal |
| 26 | Export service (`exportService.js`) partitioned per partner | Art. 20 | 🟡 Medium | S | Full stack |
| 27 | Publish `docs/ropa.md` as living RoPA | Art. 30 | 🔵 Low | S | Legal |
| 28 | Annual pentest + backup-restore drill | Art. 32 | 🔵 Low | — | Security |
| 29 | Review "dev" RLS policies leftover on tables not in `dev_rls.sql` | Art. 32 | 🔵 Low | S | Backend |
| 30 | Brand-identity unification (`coachcrm.fr` vs. `kotech.ai`) | Art. 13 | 🔵 Low | S | Legal + Ops |

Legend — Priority: 🔴 must-fix **before launching anything public or onboarding any real patient**; 🟠 first sprint after launch; 🟡 within 90 days; 🔵 documentation / cosmetic.

Effort: S ≤ 2 d, M 3–8 d, L ≥ 8 d.

---

## 18. Data-flow diagrams (text)

### Flow 1 — A therapist creates a client dossier

```
Browser (React SPA — src/pages/ClientsPage.jsx)
  │  therapist fills modal (partner_a, partner_b, notes)
  ▼
supabase.auth session (JWT in localStorage:'coachcrm-auth-token')
  │  INSERT INTO clients (user_id=auth.uid(), partner_a, partner_b, notes, ...)
  ▼
Supabase Postgres (eu-west-2 — London, UK)
  ├─ RLS check: "Users can view own clients" — NB: no WITH CHECK → INSERT unchecked (G-07)
  └─ Row written
  ◄  200 OK returned
SPA renders update
```

Personal data in transit: JWT (contains `sub=user.id`), full partner identity JSON, free-text notes. Transport: TLS 1.2+ via Vercel edge → Supabase API.

### Flow 2 — Therapist starts (fake, today; real, soon) session recording

```
ClientDetailPage → SessionDetailModal → handleStartRecording (useSessionModalState.js:35)
  │  TODAY: setTimeout → insert random sample transcription → update session.summary
  │  PLANNED: MediaRecorder → upload to Supabase Storage 'session-audio/' → POST to transcription provider
  ▼
Supabase Storage (planned) — private bucket, RLS scoped to tenant
  ▼
Transcription provider (TBD — hopefully EU — Whisper-on-Scaleway, OVH, Mistral Voxtral)
  │  returns text
  ▼
Supabase Postgres sessions.summary UPDATE
  ▼
LLM provider (TBD) consumes full dossier → produces clients.ai_synthesis, reports.*
```

**Gap**: every step from "Supabase Storage" onward is not implemented — no RLS, no SCCs, no DPIA.

### Flow 3 — Google OAuth sign-in

```
LoginPage (LoginPage.jsx:11-20) → supabase.auth.signInWithOAuth({ provider: 'google' })
  │  redirect to accounts.google.com
  ▼
Google authentication (Google LLC — US + global)
  │  id_token (JWT) with sub, email, name, picture
  ▼
Supabase Auth callback → INITIAL_SESSION event (App.jsx:132-155)
  │  syncUser(session.user) → upsertUser by email
  ▼
Application session established
```

Personal data to Google: user's intent to sign in + pre-existing Google account state. From Google to Supabase: identity claims + avatar. Cross-border: US DPF-based.

### Flow 4 — Data export ("portability" via Excel)

```
ClientHeaderPanel button (line 82 — labelled "droit de portabilité RGPD")
  │  onClick → exportClientDossierExcel(client, sessions, reports, ...)
  ▼
src/services/exportService.js → xlsx built with ExcelJS → file-saver
  │  includes partner_a + partner_b + billing info + all sessions + all reports
  ▼
Therapist downloads .xlsx
```

**Privacy issue**: the file aggregates both partners; a patient-initiated portability request should partition.

---

## 19. Detailed column-by-column inventory — Appendix

*(Summary appears in §5; the full spreadsheet-style inventory would duplicate the tables above. Included §5 is the authoritative version for this audit.)*

---

## 20. Glossary / References

| Abbrev. | Meaning |
|---|---|
| **CNIL** | Commission Nationale de l'Informatique et des Libertés (FR DPA) |
| **HDS** | Hébergeur de Données de Santé (health-data host certification, France) |
| **DPA** | Data Processing Agreement (Art. 28 GDPR) |
| **DPIA** | Data Protection Impact Assessment (Art. 35 GDPR) |
| **DPO** | Data Protection Officer (Art. 37 GDPR) |
| **RoPA** | Records of Processing Activities (Art. 30 GDPR) |
| **DSAR** | Data Subject Access Request (Art. 15 GDPR) |
| **SCC** | Standard Contractual Clauses (Art. 46) |
| **TIA** | Transfer Impact Assessment (Schrems II fall-out) |
| **DPF** | EU-US Data Privacy Framework (adequacy decision, 10 July 2023) |
| **LIL** | Loi Informatique et Libertés (Loi 78-17) |
| **LCEN** | Loi pour la Confiance dans l'Économie Numérique (2004-575) |
| **CSP** | Code de la santé publique |
| **MR-004** | CNIL reference methodology for retrospective studies using health data |

Key French-law citations used in the body:

- **Art. L1110-4 CSP** — secret médical.
- **Art. L1111-7 CSP** — patient's right of access to health record.
- **Art. L1111-8 CSP** — HDS certification obligation.
- **Art. L1142-28 CSP** — 10-year prescription of medical-liability actions (basis for 20-year retention of health records per R1112-7).
- **Art. L121-2 C. conso** — pratique commerciale trompeuse.
- **Art. L123-22 C. com** — 10-year retention of accounting records.
- **Art. 226-13 C. pén.** — criminal sanction for breach of professional secrecy.
- **Loi 78-17 Art. 9** — special-category processing (mirrors GDPR Art. 9).
- **CNIL délibération 2018-327** — mandatory-DPIA list.
- **CNIL délibération 2019-083** — référentiel gestion des cabinets médicaux et paramédicaux.
- **CNIL délibération 2020-091** — cookies/trackers, strictly-necessary exemption.

---

*End of audit — G-01 to G-30.*
