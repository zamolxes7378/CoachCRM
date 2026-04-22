# 06 — French & EU Regulatory Compliance Audit

> **Application** : CoachCRM — SaaS CRM for French couple-therapists
> **Auditor** : Pre-production compliance review — France & EU (non-GDPR regulatory layer)
> **Date** : 21 April 2026
> **Scope** : French & EU regulations outside the strict GDPR perimeter (GDPR itself is covered in §05)
> **Target** : production readiness for the MVP (5 therapist testers) and Freemium V2 rollout
> **Branch audited** : `main`

---

## Executive Summary

- **Overall regulatory risk** : **High** — with one **Critical** deadline (e-invoicing) and one **High** structural gap (misleading commercial claim on login page).
- **Ready for pre-production rollout to 5 therapist testers?** : **No — conditional**.
- **Ready for Freemium V2 (paid subscription to therapists)?** : **No — blockers must be lifted**.
- **Hard calendar deadlines identified** :
  - **2026-09-01** (T-133 days from today) — mandatory **reception** of structured B2B e-invoices by all VAT-assujetties French businesses, and mandatory **emission** by large + mid-sized companies. CoachCRM, *as a SaaS vendor planning to invoice therapists for subscriptions*, becomes in-scope for reception from that date.
  - **2027-09-01** (T-498 days) — mandatory **emission** by SMEs and micro-enterprises, covering CoachCRM's own vendor-billing stack.
- **Six findings** are blockers prior to any production opening to real patient data (R-01 to R-06 below). The remaining ten are medium/low-priority but should be tracked.
- **The login page contains a *factually unverifiable* commercial claim** ("Données hébergées en France, conformes RGPD" — `LoginPage.jsx:274`) that, absent proof of an EU-region Supabase project and signed DPAs, constitutes a potential L121-2 C. conso. misleading commercial practice. This is the single highest-leverage fix: one word edit or one configuration check, with asymmetric legal downside.
- **Health-data borderline status** : couple-therapists using CNV are *not* regulated health professionals in the strict sense of Code de la santé publique L4161-1, so **HDS certification is not strictly mandatory** under L1111-8 CSP. However, the data processed (session recordings, therapy notes, emotional maturity metrics) is unambiguously **health data under GDPR Art. 9** — HDS becomes strongly recommended *and* must be documented in the DPIA.
- **Mentions légales, CGU/CGV, politique de confidentialité, déclaration d'accessibilité, politique de cookies** — *all absent* from the public surface (`LoginPage.jsx` has pseudo-links with no routes). The founder document (`docs/synthese_strategique.md` §"Chantiers Complémentaires Identifiés") self-identifies "CGU / CGV de la plateforme" and "Politique de confidentialité" as 🔴 "Avant le MVP" — they remain undone.
- **No retention policy is codified in the schema** — neither for therapy data (CSP R1112-7 potentially applicable: 20 years), nor for accounting data (L123-22 C. com. : 10 years), nor for CRM contact data (CNIL : 3 years after last contact). Eight data categories lack any enforced retention.
- **The planned AI features (transcription, CR generation, cross-dossier pattern detection, AI chat with full file context)** place CoachCRM in the **EU AI Act — limited-risk** category. Article 50 transparency obligations on AI-generated content are **not implemented**; the roadmap does not mention them.
- **Invoices are "bookkeeping-only"** : `invoices` table has `invoice_date`, `sent`, `sent_at`, `client_id`, linked `invoice_sessions` — but **no PDF generator**, no invoice number sequence, no issuer/recipient identity snapshot, no TVA fields, no Factur-X/UBL/CII capability, no compliant mentions (C. com. L441-9 + CGI 242 nonies A). The app calls it an "invoice" but it is in fact only a payment-tracker flag. This needs to be either honestly renamed ("rappel de facturation") or upgraded to a real invoice generator.

---

## Scope & Methodology

### What this audit covers

The *non-GDPR* French and EU regulatory layer relevant to a SaaS CRM hosting health-related data and billing information in France:

1. Health-data and health-professions statute (CSP L4161-1, L1111-8, R1112-7 ; Loi 2004-806 Art. 91 ; C. pénal 226-13)
2. Electronic invoicing mandate (Ord. 2021-1190, Loi de finances 2024 Art. 91, CGI 289 bis)
3. LCEN obligations for online services (Loi 2004-575 Art. 6-III)
4. Code de la consommation (L121-2, L221-5, L221-18)
5. Document retention across all applicable codes
6. Accessibility (RGAA 4.1 — cross-referenced to §07)
7. Invoice content rules (C. com. L441-9, CGI 242 nonies A)
8. eIDAS 2 electronic archiving (Reg. UE 910/2014 + 2024/1183)
9. EU AI Act (Reg. UE 2024/1689)
10. CNIL sectoral doctrine applicable to health-practice software
11. Consumer-rights specifics (withdrawal right, pre-contract information)

### Explicitly out-of-scope (covered elsewhere)

| Topic | Handled in |
|---|---|
| RGPD / Loi Informatique & Libertés core (lawful basis, DPIA, DPO, data-subject rights) | `audit/05_gdpr.md` |
| Accessibility technical review (WCAG 2.1 AA / RGAA 4.1 detailed grid) | `audit/07_accessibility.md` |
| DPA with Supabase, Google OAuth, OpenAI (or equivalent LLM vendor), Vercel | GDPR sub-processors chapter in §05 |
| Security vulnerabilities (RLS bypass, XSS, CSRF, session replay) | `audit/03_security.md` |
| TRACFIN / AML | Not applicable (low risk, low transaction volume) |

### Method

- Full read of `docs/synthese_strategique.md`, `docs/MES_REGLES_METIER.md`, `docs/template_consentement_patient.md`, `audit/live_schema/tables.md`
- Static review of `src/pages/LoginPage.jsx`, `src/App.jsx`, `src/services/invoiceService.js`, `src/pages/FinancesPage.jsx`, `src/services/dataService.js`, `supabase/migration.sql`
- Targeted searches (case-insensitive) : `mentions`, `cgv`, `cgu`, `RGAA`, `accessibilité`, `HDS`, `Factur-X`, `SIRET`, `SIREN`, `TVA`, `retention`, `archivage`, `consent`, `cookie`, `privacy`, `confidential`
- Regulatory sources consulted : Legifrance (statutes and codes cited), EUR-Lex (regulations/directives), CNIL (sectoral guidance), DGFiP (BOFiP + impots.gouv.fr e-invoicing portal), DINUM (RGAA 4.1), accessibilite.numerique.gouv.fr
- Reference template : `/home/zamolxes/devs/cra-app/audit/06_french_regulations.md`

### Severity scale (consistent with §05 and §07)

| Code | Meaning |
|---|---|
| 🔴 **Critical** | Regulatory non-compliance with hard calendar deadline, or structural legal exposure that can trigger administrative sanction / consumer-law action / criminal liability. Must be resolved before production. |
| 🟠 **High** | Material non-compliance with meaningful liability; can be lived with for a few weeks but must have a remediation ticket open. |
| 🟡 **Medium** | Gap with moderate or contingent risk; a plan is sufficient. |
| 🔵 **Low / Informational** | Documented or acknowledged, or very contingent. |

---

## Regulation Applicability Matrix

| # | Regulation / Text | Applicability | Status in CoachCRM |
|---|---|---|---|
| 1 | **RGPD (UE 2016/679) + Loi n° 78-17 du 6 janvier 1978 (LIL) modifiée** | ✅ Applicable (health data, Art. 9) | See `audit/05_gdpr.md`. Not re-covered here. |
| 2 | **Loi n° 2004-575 du 21 juin 2004 (LCEN)** — Art. 6-III (mentions légales, éditeur identification) | ✅ Applicable (public site on `coachcrm.fr` domain intended) | 🟠 **Non-compliant** — `LoginPage.jsx` has no mentions, pseudo-links only (l.306) |
| 3 | **Code de la consommation** — L121-2 (pratique commerciale trompeuse), L221-5 (précontractuelle information), L221-18 (droit de rétractation) | ⚠️ Applicable to any therapist signing up as *auto-entrepreneur/consumer* for a paid tier; L121-2 applies universally | 🔴 **High risk** — misleading claim on login (`LoginPage.jsx:274`) ; no précontractuelle information layer |
| 4 | **Ordonnance n° 2021-1190 du 15/09/2021 + Loi de finances 2024 Art. 91** — e-invoicing B2B | ✅ Applicable to **CoachCRM-as-vendor** from 2026-09-01 (reception) and 2027-09-01 (emission, SME bracket) | 🔴 **Critical** — no Factur-X/UBL/CII, no PDP/PPF integration, no invoice number sequence |
| 5 | **Code de commerce** — L123-22 (10-year accounting archival), L441-9 (invoice mandatory content), L441-10 (B2B payment terms ≤ 60 days) | ✅ Applicable to any invoice CoachCRM issues or therapists issue through the app | 🔴 **Non-compliant** — `invoices` table lacks required fields; no retention |
| 6 | **Code général des impôts (CGI)** — Art. 289 (facture obligatoire), 242 nonies A (mentions), 293 B (franchise TVA), 283-2 (autoliquidation) | ✅ Applicable if CoachCRM or its therapists issue real invoices through the app | 🔴 **Non-compliant** — `invoices` row is a sent-flag, not a compliant document |
| 7 | **Livre des procédures fiscales** — L102 B (6-year fiscal retention of supporting documents) | ✅ Applicable | ❌ No retention implemented |
| 8 | **Code civil** — Art. 2224 (5-year common prescription) | ✅ Applicable to litigation support | ❌ Implicit only |
| 9 | **Code de la santé publique** — L1111-8 (HDS hosting), L4161-1 (titre de médecin), R1112-7 (conservation 20 ans dossier médical) | ⚠️ **Nuanced** — not a regulated health profession for CNV therapists, but data is health data under GDPR. HDS **not strictly mandatory** ; R1112-7 20-year retention **not strictly mandatory** as written | 🟠 Ambiguous — login page implies certification; none declared |
| 10 | **Loi n° 2004-806 du 09/08/2004, Art. 91** — titre de psychothérapeute protégé | ⚠️ Applicable *if* any therapist on the platform holds the psychotherapist title | 🟡 Not screened; target persona is "coach thérapeute de couple CNV" — probably not title-holder |
| 11 | **Code pénal Art. 226-13** — secret professionnel (violation criminelle) | ⚠️ Applicable only for titled health professionals (medical, paramedical, certain psychologists/psychiatrists). CoachCRM's target users are **mostly outside** this criminal scope. Software-vendor accessory liability possible in edge cases. | 🟡 Depends on user profile |
| 12 | **RGAA 4.1 — Décret 2019-768 du 24/07/2019 + Loi 2005-102 Art. 47** | ⚠️ Not strictly mandatory below 250 M€ CA, but required if B2B client demands; European Accessibility Act 28/06/2025 on consumer-facing services | Cross-referenced to `audit/07_accessibility.md`. No declaration here. |
| 13 | **Règlement eIDAS 2 (UE 910/2014 + UE 2024/1183)** | ℹ️ Optional but relevant if invoices go fully paperless to probative value | ❌ Not implemented (no qualified timestamp, no signature) |
| 14 | **EU AI Act (Règlement UE 2024/1689)** — Art. 50 transparency ; Art. 6 + Annex III (risk classification) ; Art. 113 phased application | ✅ Applicable to planned LLM features (transcription, auto-CR, cross-dossier analysis, IA chat) — **limited-risk** at minimum, Art. 50 transparency kicks in from 2026-08-02 | 🟠 **Gap** — no transparency labelling, no AI system documentation |
| 15 | **CNIL sectoral doctrine** — Délib. 2019-015 (psy software / DPIA health) ; guide "gestion de cabinet médical/paramédical" | ℹ️ Applicable as interpretive reference | 🟡 To be consulted during DPIA (§05) |

---

## Retention Matrix — Required vs Observed

Legal retention durations derived from the codes; "observed" = what the app actually enforces today.

| # | Data category | Required retention | Legal basis | Observed in CoachCRM | Gap severity |
|---|---|---|---|---|---|
| 1 | **Therapy notes** (`reports`, `clients.notes`, `clients.note_dynamique`, `clients.ai_synthesis`) | Fine-grained : considered health data under GDPR Art. 9. If therapist is **not** a health professional → *no CSP floor*, only GDPR Art. 5.1.e (no longer than necessary). Good practice : **end of therapy + 5 years** (prescription civile, C. civ. 2224). If therapist **is** a titled health professional → **20 years after last consultation** (CSP R1112-7). | GDPR Art. 5.1.e + C. civ. 2224 + (conditionally) CSP R1112-7 | ❌ None — no `retention_until`, no soft-delete timestamp workflow | 🟠 High |
| 2 | **Session audio recordings** (planned MVP) | Per the consent template `docs/template_consentement_patient.md` : audio brut **30 days** post-transcription, transcription **therapy duration + 1 year**, CR **therapy duration + 5 years** | GDPR Art. 5.1.e + consent bound | ❌ Audio pipeline not built yet; but **retention not yet codified in schema** either | 🟠 High (pre-build) |
| 3 | **Invoices** (`invoices`, `invoice_sessions`) | **10 years** (C. com. L123-22) — regardless of whether issued by therapist or by CoachCRM-as-SaaS vendor | C. com. L123-22 | ❌ No retention column; `deleteInvoice` in service is hard delete | 🔴 Critical |
| 4 | **Sessions** (`sessions`, `sessions.payment_amount`, `sessions.payment_date`) if used to substantiate invoices | **6 years** (LPF L102 B) for anything that substantiates tax | LPF L102 B | ❌ No retention | 🔴 Critical |
| 5 | **Contact log** (`contacts`) — CRM interactions phone/email/SMS | **3 years after last contact** (CNIL doctrine on B2B CRMs — Délib. "prospection commerciale") | CNIL | ❌ No expiry | 🟡 Medium |
| 6 | **Professionals** (`professionals`, `client_links`, `professional_referrals`) | **3 years after last contact** | CNIL | ❌ No expiry | 🟡 Medium |
| 7 | **User accounts** (`users`) after deactivation | **3 years after last login** for CRM part, but **10 years** for anything tied to issued invoices | GDPR 5.1.e + C. com. L123-22 | ❌ No `deactivated_at`, no anonymize workflow | 🟠 High |
| 8 | **Soft-deleted clients** (`clients.deleted_at` exists per `live_schema/tables.md`) | After soft-delete → **purge or anonymize** per consent & CRM rules, generally 12 months grace | GDPR Art. 5.1.e + Art. 17 | 🟡 Soft-delete column exists ; no hard-delete cron | 🟡 Medium |
| 9 | **Onboarding state** (`localStorage.coachcrm_onboarding_done`) | Device-scoped, not relevant | — | Done | ✅ — |
| 10 | **OAuth session tokens** (Supabase / Google) | Technical, 6 months max recommended (CNIL) | CNIL logs guidance 2021 | Managed by Supabase (depends on plan) | 🟡 To verify at plan-level |
| 11 | **AI-generated synthetic content** (`clients.ai_synthesis`, `reports.narrative`) | Same as therapy data (derived from health data → health data) | GDPR Art. 9 | ❌ No retention | 🟠 High |
| 12 | **Access / download logs** for signed URLs (if audio is served from Storage) | **6 months** (CNIL logs guidance) | CNIL | ❌ Not tracked | 🟡 Medium (pre-build) |

> **Conclusion of the retention matrix** : **12 data categories** have a *legal* retention duration (or floor/ceiling) ; **0** of them are codified in the schema. This is one of the two transverse blockers (the other being e-invoicing). A `retention_policies` table + a monthly `pg_cron` purge/anonymize job is required before onboarding the first billable tenant.

---

## Findings

Each finding follows the format : **Location · Risk · Evidence · Recommendation · Legal reference**. Code prefix `R-01`…

---

### 🔴 Critical

---

#### R-01 · Misleading commercial claim on public login page — "Données hébergées en France, conformes RGPD"

- **Location** :
  - `/home/zamolxes/devs/coach-crm/src/pages/LoginPage.jsx:274`
  - The same page claims `cookies...`, `conformité`, `hébergement` without any substantiating evidence or link to DPA / certification / sub-processor list.
  - No mentions légales, no politique de confidentialité, no CGV are reachable from the page (the footer `l.306` references «conditions d'utilisation» and «politique de confidentialité» but they are `<span>` elements, not `<a>` — they do not link anywhere).

- **Risk** : The public surface of a SaaS is, by default, a *commercial communication* under Art. L121-2 Code de la consommation (false commercial practice) and Art. 20 LCEN (obligation of identification of commercial communications). Two substantive claims are made :

  1. **"Données hébergées en France"** — factually unverifiable from the codebase. Supabase offers EU regions (including `eu-west-3` Paris) but *nothing in the repo proves the project is provisioned in France* ; `supabase.js` uses env vars only. If the Supabase project is in `eu-west-1` (Ireland) or `us-east-1`, the claim is **false**. This is a textbook L121-2 misleading practice — fine up to **300 000 €** for an individual or **10 % of revenue** for a legal person (L132-2 C. conso.).

  2. **"Conformes RGPD"** — GDPR compliance is a process, not a certification status. Stating this without supporting documentation (DPIA, registry of processing, DPA with each sub-processor, legal basis per finality, retention policy) is materially misleading given that all these artefacts are **currently missing** (see §05 GDPR audit and R-02 below). This exposes the publisher to L121-2 and, for the DPO angle, to a CNIL article-58 corrective power.

  Both claims are made *before the user signs anything*, so the protection of L221-5 C. conso. (précontractuelle information) and the droit de rétractation L221-18 (14 days for consumers who are *auto-entrepreneurs* signing up as individuals) are also implicated.

- **Evidence** :
  ```jsx
  // LoginPage.jsx l.272-283
  {[
    { icon: CheckCircle, text: 'Gratuit jusqu\'à 5 clients, sans engagement' },
    { icon: Shield, text: 'Données hébergées en France, conformes RGPD' },
    { icon: Sparkles, text: 'IA intégrée, aucune configuration requise' }
  ].map((item, i) => { ... })}
  ```
  ```jsx
  // LoginPage.jsx l.305-307  — pseudo-links that go nowhere
  <p>En vous connectant, vous acceptez nos <span>conditions d'utilisation</span>
     et notre <span>politique de confidentialité</span>.</p>
  ```

- **Recommendation** :
  1. **Immediate (sprint 0)** :
     - Either **prove** the Supabase project is in an FR region (config export, screenshot, invoice) **and** keep the wording, or **rewrite** to "Données hébergées dans l'UE, chiffrées en transit et au repos". The latter is truthful and verifiable for any EU-region Supabase project.
     - Replace "conformes RGPD" with "conçu dans le respect du RGPD" (duty-of-care language, not certification claim) until the DPIA and politique de confidentialité are published.
  2. **Make the footer links real** : `/mentions-legales`, `/confidentialite`, `/cgu`, `/cgv`, `/accessibilite`, `/cookies`. All five MUST return 200 OK before any paid tier goes live.
  3. **Document the host region** in `docs/MES_REGLES_TECHNIQUES.md` and pin it in a committed config (e.g. `supabase.config.toml`) so a future infra change cannot silently invalidate the claim.
  4. **Link to an up-to-date sub-processor list** from `/confidentialite` (Google OAuth for sign-in ; Supabase for DB/storage ; Vercel for edge ; LLM vendor TBD). Each needs a DPA reference.
  5. If an AI transcription vendor is used that **does** send audio to the US (OpenAI Whisper API, Deepgram, AssemblyAI), mark `audio transfer` explicitly — the claim "Données hébergées en France" becomes *categorically false* the moment a recording is uploaded to such a service.

- **Legal reference** :
  - Code consommation Art. L121-2, L121-3, L121-4, L132-1 à L132-2 (sanctions) — https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069565/LEGISCTA000032226487
  - LCEN Art. 20 (identification communications commerciales)
  - RGPD Art. 5.1.a (principle of transparency)
  - DGCCRF doctrine on "allégations environnementales et éthiques" (applicable by analogy to data-hosting claims)

---

#### R-02 · No mentions légales, no politique de confidentialité, no CGU, no CGV, no accessibility statement on the public surface

- **Location** :
  - `/home/zamolxes/devs/coach-crm/src/App.jsx` — the `<Routes>` block (l.217–228) has *no* public/unauthenticated route. All paths `/mentions-legales`, `/confidentialite`, `/cgv`, `/cgu`, `/accessibilite`, `/cookies` resolve to `<Navigate to="/" />` which renders the LoginPage.
  - `/home/zamolxes/devs/coach-crm/src/pages/LoginPage.jsx:305-307` — the "conditions d'utilisation" and "politique de confidentialité" are `<span>` pseudo-links.
  - `docs/synthese_strategique.md` §"Chantiers Complémentaires Identifiés" flags this **itself** : «CGU / CGV de la plateforme» and «Politique de confidentialité» are listed as 🔴 «Avant le MVP» and remain undone as of today.

- **Risk** : This is the canonical LCEN Art. 6-III-1 failure. Mandatory information a professional editor of an online service must publish includes :
  - Legal name, legal form (SAS / SARL / EI / EURL…)
  - Registered office address
  - RCS number + registration city
  - Share capital (commercial companies)
  - SIREN
  - VAT intracom number
  - Director of publication (nom du directeur de la publication)
  - Host contact details (for CoachCRM : Vercel Inc. 440 N Barranca Ave #4133, Covina CA 91723 — or Vercel Netherlands BV, Keizersgracht 391A, 1016 EJ Amsterdam)
  - Email + phone for user contact
  - Link to the politique de confidentialité (required independently by GDPR Art. 13)

  Additionally, and because CoachCRM is a SaaS sold to professionnels (B2B) and potentially to *auto-entrepreneurs-as-consumers* :
  - **CGV** (Art. L441-1 C. com. for B2B + L211-1 C. conso. if B2C) are mandatory before any paid subscription
  - **CGU** (contract of use) must bind the therapist for the SaaS service terms
  - **Droit de rétractation** notice (L221-18 C. conso., 14 days) for any therapist subscribing as consumer
  - **Politique de cookies** — Google OAuth redirection sets third-party cookies (NID, SID) on the Google domain (not CoachCRM's), but per CNIL délib. 2020-091 the initial act of clicking "Se connecter avec Google" must be preceded by an information notice if the domain owner has any analytics/trackers (even first-party session cookies per ePrivacy Art. 5.3).
  - **Déclaration d'accessibilité** (see R-08 and `audit/07_accessibility.md`).

- **Evidence** : searches `mentions|cgv|cgu|accessibilite|privacy|confidential` in `src/` return only `LoginPage.jsx` (pseudo-links, no routes); the `<Routes>` block has no matching route — any such URL redirects to the login page via the `*` catch-all.

- **Recommendation** :
  1. **Ship six public routes before the MVP opens to real patient data** :
     - `/mentions-legales` — LCEN Art. 6-III-1 + R123-237 C. com. (for SAS/SARL with a website : mentions obligatoires)
     - `/confidentialite` — GDPR Art. 13 + 14 (finalities, lawful bases, retention, sub-processors, transfers outside EU, rights, DPO or contact)
     - `/cgu` — contract of use
     - `/cgv` — general conditions of sale (for the paid tier)
     - `/cookies` — cookie policy + banner (even if only first-party session cookies are set)
     - `/accessibilite` — accessibility statement per Décret 2019-768 template (even "non-conforme" is acceptable, silence is not)
  2. **Make them accessible before authentication** — these routes must render on an unauthenticated request. Refactor `App.jsx` to split the `BrowserRouter` outside the auth gate, with the public routes accessible regardless of `user` state.
  3. **Linked from the login footer** — turn `l.305-307` `<span>` into real `<a href="/cgu">`, `<a href="/confidentialite">`.
  4. **Document the editor's legal identity** in committed docs (not just in the UI) — CoachCRM appears to be in fund-raising / founder stage; legal form must be defined (EURL / SAS?) before publication.

- **Legal reference** :
  - LCEN (Loi 2004-575 du 21/06/2004) Art. 6-III-1 & 6-III-2 — https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000037388971
  - Code de commerce Art. R123-237 (mentions sites commerciaux)
  - Code de la consommation Art. L221-5 (pré-contractuel distant) & L221-18 (rétractation)
  - GDPR Art. 13, Art. 14
  - CNIL délib. 2020-091 (cookies et traceurs)
  - Décret 2019-768 du 24/07/2019 (RGAA / accessibilité numérique)

---

#### R-03 · No retention policy codified — 12 data categories, some health-data

- **Location** : transverse — no migration implements retention
  - `supabase/migration.sql` — no retention columns, no expiry trigger, no cron job
  - `audit/live_schema/tables.md` — confirms schema drift; `deleted_at` exists on `clients` but no hard-delete workflow
  - `src/services/invoiceService.js:145-152` — `deleteInvoice` is an unconditional hard delete, with zero safeguard for the 10-year accounting archival floor (L123-22 C. com.)
  - `src/services/dataService.js` — no `purgeExpired` / `anonymize` helpers

- **Risk** : See the retention matrix above. A CRM-for-therapists that processes **health data** (GDPR Art. 9) and **accounting data** (C. com. L123-22, CGI L102 B) and **CRM contact data** (CNIL 3-year rule) must enforce **three different** retention regimes simultaneously, sometimes with conflicting floors/ceilings (ex : "client asked for erasure" vs "invoice from that client still within 10-year legal archive"). The absence of any codification means **every** flow is non-compliant — not just symbolically, but operationally :

  1. **Conservation excessive** → GDPR Art. 5.1.e breach, CNIL corrective order possible.
  2. **Early loss** → `deleteInvoice` wipes rows that the tax administration may request up to 6 years later (LPF L102 B) — administrative fiscal fine risk.
  3. **Inconsistent "erasure" semantics** → `clients.deleted_at` exists but has no cascade rule; `reports`, `sessions`, `contacts`, `ai_synthesis` are *not* soft-deleted along with the parent `clients` row, creating orphan health data.

- **Evidence** :
  - Search `retention|archiv|conservation` in `src/` : 24 hits across 5 files — all cosmetic (button labels, tooltip copy), **none** codifying a purge.
  - `migration.sql` has no `retention_until`, no `anonymized_at`, no `purge_due_at` columns.
  - No pg_cron job declared.
  - `invoiceService.deleteInvoice` (l.145-152) : `.from('invoices').delete().eq('id', invoiceId)` — no guard.

- **Recommendation** :
  1. **Create a `retention_policies(entity_name, duration_months, legal_basis, purge_strategy)` reference table** with at minimum :
     - `reports` / 60 after therapy end / `GDPR 5.1.e + C.civ 2224` / `anonymize`
     - `clients` / 36 after last contact / `CNIL CRM doctrine` / `anonymize`
     - `sessions` / 72 / `LPF L102 B (6 ans)` / `anonymize_payment_fields`
     - `invoices` / 120 / `C. com. L123-22 (10 ans)` / `cold_archive`
     - `invoice_sessions` / 120 / idem / `cold_archive`
     - `contacts` / 36 after last contact / `CNIL` / `hard_delete`
     - `professionals` / 36 after last contact / `CNIL` / `anonymize`
     - `audio_recordings` (future) / 1 after transcription validated / `template consent` / `hard_delete`
     - `ai_synthesis` / follow parent `clients` / `GDPR Art. 9` / `anonymize`
  2. **Add `deleted_at`, `anonymized_at`, `retention_until` columns** to each regulated entity.
  3. **Monthly `pg_cron` job** `purge_expired_data()` — SECURITY DEFINER function that anonymizes or hard-deletes per policy.
  4. **Replace `invoiceService.deleteInvoice` hard-delete** with a `markInvoiceForLegalRetention()` that clears derived fields but keeps the accounting row for 10 years.
  5. **Document the policy** in `docs/MES_REGLES_METIER.md` and publish it under `/confidentialite` (§ "Durées de conservation").

- **Legal reference** :
  - RGPD Art. 5.1.e + Art. 17
  - Code civil Art. 2224 (prescription 5 ans)
  - Code de commerce L123-22 (10 ans)
  - Livre des procédures fiscales L102 B (6 ans fiscaux)
  - CSP R1112-7 (20 ans — *conditional*, see §1 note)
  - CNIL « Les durées de conservation des données » (https://www.cnil.fr/fr/les-durees-de-conservation-des-donnees)

---

#### R-04 · Factur-X / e-invoicing mandate — no architecture, hard deadline 2026-09-01

- **Location** :
  - `/home/zamolxes/devs/coach-crm/src/services/invoiceService.js` (entire file, 152 lines)
  - `/home/zamolxes/devs/coach-crm/supabase/migration.sql` — **no `invoices` table declared** ; table is inferred at runtime (cf. `audit/live_schema/tables.md` "NO migration committed"), meaning the stack is **structurally unfit for a regulatory audit** (no version-controlled schema for invoices).
  - `/home/zamolxes/devs/coach-crm/docs/synthese_strategique.md` — roadmap §V2 "Gestion des plans et facturation" — not addressed

- **Risk** : **Critical with calendar deadline**. Ordonnance 2021-1190 du 15/09/2021, modified by Loi de finances 2024 (loi n° 2023-1322 du 29/12/2023, Art. 91), imposes :

  | Date | Obligation | CoachCRM applicability |
  |---|---|---|
  | **2026-09-01** | All VAT-registered businesses must be able to **receive** structured B2B e-invoices | ⚠️ Relevant *if* CoachCRM invoices therapists for the freemium subscription — CoachCRM = vendor, therapist = customer = in-scope receiver |
  | **2026-09-01** | Large + mid-size enterprises must **emit** in structured format | ✅ Relevant if CoachCRM becomes mid-size |
  | **2027-09-01** | SMEs + micro-enterprises must **emit** | ✅ **Directly applies to CoachCRM emitting subscription invoices to therapists**, and to therapists emitting invoices to their professional clients *through the app* |

  Authorized formats : **Factur-X** (PDF/A-3 with embedded XML CII) — most common in FR ; **UBL** (Universal Business Language) ; **CII** (Cross Industry Invoice ISO 16931).

  Authorized channels : registered **PDP (Plateforme de Dématérialisation Partenaire)** or the public **PPF (Portail Public de Facturation)**. After the deadlines, **no plain PDF emailed between VAT-assujettis is legal**.

  Additionally, **e-reporting** obligations cover B2C and transfrontalier B2B transactions — CoachCRM's therapist-to-couple invoicing is **B2C** and therefore triggers e-reporting to DGFiP.

  Current state of CoachCRM :
  - No XML generation (CII, UBL, Factur-X) — 0 references in code.
  - No PDP integration, no PPF integration — 0 references to Chorus / PPF / PDP / Sage Network / Pennylane / Docaposte.
  - No invoice number sequencing — `invoices.invoice_date` and `sent` boolean only.
  - No issuer/recipient identity snapshot — the `invoices` row references `user_id` and `client_id` by FK only; if the user or client data changes over time, the historical invoice silently mutates, breaking the "fidélité" principle (BOI-TVA-DECLA-30-20-10).
  - **No PDF generation at all** — the app stores `sent_at` but there is no artefact to send. "Sending" is purely a UI flag.

  The `invoices` table is therefore **not an invoice** in any legal sense : it is a payment-chasing reminder list. This semantic gap is the real risk — a therapist or an auditor can reasonably assume the app produces a compliant document, it does not.

- **Evidence** :
  ```js
  // invoiceService.js:42-55 — createInvoice
  const { data: invoice } = await supabase.from('invoices').insert({
    user_id: userId, client_id: clientId,
    invoice_date: invoiceDate || new Date().toISOString().slice(0, 10),
    sent: false,
  }).select().single()
  ```
  No `invoice_number`, no `issuer_name`, no `issuer_siret`, no `issuer_tva_number`, no `recipient_name`, no `recipient_address`, no `amount_ht`, no `amount_ttc`, no `tva_rate`, no `tva_amount`, no `due_date`, no `penalty_rate`, no `factur_x_xml`, no `pdp_transaction_id`.

  ```js
  // invoiceService.js:85-87 — emitInvoice
  export async function emitInvoice(invoiceId) {
    return updateInvoice(invoiceId, { sent: true, sent_at: new Date().toISOString() })
  }
  ```
  "Emit" = flip a boolean. No document is produced. No transmission happens. No legal artefact exists.

- **Recommendation** :

  **Phase 0 — honest naming (≤ 1 day)** :
  1. Rename `invoices` → `billing_reminders` in UI (DB rename is heavier, can be deferred). Until CoachCRM issues real invoices, the domain language must not suggest it does. `InvoiceBadge.jsx`, `invoiceService.js`, `useData().getInvoiceForSession` all need relabelling.
  2. Add a banner to `FinancesPage.jsx` : "Ce module gère les rappels d'émission de facture. L'édition de la facture officielle reste à votre charge."

  **Phase 1 — Q3 2026 (before 2026-09-01)** :
  3. **Decide the role** : is CoachCRM
     - (a) only a *billing assistant* for therapists (they emit invoices themselves through their accountant / Pennylane / Tiime / any PDP), or
     - (b) a *real invoice generator* for therapists (user expectation of the paid tier)?
  4. In scenario (a) : document formally + add export-to-CSV/XML of billing lines so the therapist can import into a PDP.
  5. In scenario (b) : choose a PDP (Pennylane, Docaposte, Sage, Esker, iPaidThat, Generix…) and integrate via API.
  6. **CoachCRM-as-vendor emission stack** : CoachCRM will *itself* send subscription invoices to therapists from 2027-09-01 (SME bracket). Build once, use twice.

  **Phase 2 — Q1 2027** :
  7. Generate Factur-X PDF/A-3 + embedded CII XML.
  8. Register sequential invoice numbers : `CCRM-2027-000001` (Art. 242 nonies A-3° CGI).
  9. Capture issuer/recipient snapshots at emission time (immutability principle).

  **Migration committed** : create `supabase/migration_invoices_v2.sql` adding at least : `invoice_number`, `issuer_snapshot jsonb`, `recipient_snapshot jsonb`, `amount_ht`, `amount_ttc`, `tva_rate`, `tva_amount`, `due_date`, `penalty_rate`, `factur_x_pdf_path`, `factur_x_xml`, `pdp_transaction_id`, `pdp_status`, `e_reporting_id`.

- **Legal reference** :
  - Ordonnance n° 2021-1190 du 15/09/2021 — https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000044053700
  - Décret n° 2022-1299 du 07/10/2022
  - Loi n° 2023-1322 du 29/12/2023 (LF 2024), Art. 91
  - CGI Art. 289 bis (facture électronique) et 290 (e-reporting)
  - Norme EN 16931-1 (sémantique) / ISO 20022 + CII (syntaxe)
  - https://www.impots.gouv.fr/facturation-electronique
  - https://www.economie.gouv.fr/cedef/facturation-electronique

---

#### R-05 · Invoice content does not satisfy Art. L441-9 C. com. and Art. 242 nonies A CGI

- **Location** :
  - `src/services/invoiceService.js` (152 lines)
  - `supabase/migration.sql` — `invoices` table not declared (so no columns at all in VCS)

- **Risk** : Any invoice — whether generated by an app or written by hand — must carry a minimum set of mandatory mentions defined cumulatively by :

  | Statute | Requirement |
  |---|---|
  | C. com. L441-9 | **Unique, sequential, chronological number** on a series specific to the issuer |
  | C. com. L441-9 | Name, address, SIRET of issuer and of recipient |
  | C. com. L441-9 | Date of issue, date of delivery/service |
  | C. com. L441-9 | Designation and quantity of goods/services, unit price |
  | C. com. L441-10 | Payment terms, date of payment, late-payment penalty rate, indemnité forfaitaire 40 € for recovery costs |
  | CGI 242 nonies A | VAT rate, VAT amount per rate, VAT intracom number if both parties are assujettis |
  | CGI 293 B | If issuer is micro-entrepreneur : mention **"TVA non applicable, art. 293 B du CGI"** |
  | CGI 283-2 | If autoliquidation : **"Autoliquidation"** mention |
  | CGI 262 ter I | If intracom exempt : **"Exonération TVA, art. 262 ter I du CGI"** |

  CoachCRM's `invoices` row has : `id`, `user_id`, `client_id`, `invoice_date`, `sent`, `sent_at`, and via the join `invoice_sessions`, a list of session IDs. **None of the mandatory mentions above exist as columns** — the app neither captures them nor generates them.

  Practical consequence : if a therapist *uses CoachCRM* to produce what they believe is an invoice, and forwards it (or relies on it for VAT declaration), their invoice is **formally invalid**. The therapist faces the sanction, but CoachCRM can be held accessory-liable under a theory of *product unsuitability* (L217-4 C. conso.) or *professional misrepresentation* if the UI implies the output is a real invoice (R-01 misleading practice cross-applies).

- **Evidence** : read `invoiceService.js` in full — the only "invoice" fields are `invoice_date`, `sent`, `sent_at`.

- **Recommendation** : merged with R-04 Phase 2. If the decision is scenario (a) "billing assistant", rename the module and document the non-invoice nature explicitly. If scenario (b), implement all of the above fields *plus* the CGI-mandated boilerplate text strings.

- **Legal reference** :
  - C. com. Art. L441-9, L441-10 — https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000032227337
  - CGI Art. 289, 242 nonies A, 293 B, 283-2, 262 ter I
  - Décret 2013-350 du 25/04/2013 (modalités de facturation)
  - BOI-TVA-DECLA-30-20-10 et BOI-CF-COM-10-10 (BOFiP)

---

#### R-06 · EU AI Act — no transparency mechanism for AI-generated content (Art. 50)

- **Location** :
  - `docs/synthese_strategique.md` §"Axe 1 — Mémoire Clinique Augmentée" and §"Axe 2 — Analyse Augmentée" — heavy LLM usage planned
  - `src/pages/LoginPage.jsx:27` — "Synthèses et comptes-rendus IA" advertised as feature
  - `src/pages/LoginPage.jsx:29` — "Assistant IA pour rituels de bien-être" advertised as V2
  - `src/pages/LoginPage.jsx:275` — "IA intégrée, aucune configuration requise"
  - No `docs/AI_*.md` exists ; no transparency labelling anywhere in UI
  - `clients.ai_synthesis text` exists in schema drift (cf. `live_schema/tables.md`) — no metadata about *when* generated, *by which model*, *with what prompt*, *reviewed by human yes/no*

- **Risk** : The EU AI Act (Regulation (EU) 2024/1689), in force since 2024-08-01 with phased application (Art. 113) :
  - **2025-02-02** : prohibitions (Art. 5) — not relevant here
  - **2025-08-02** : general-purpose AI rules, governance — indirectly relevant (via the LLM vendor)
  - **2026-08-02** : Art. 50 (**transparency obligations for providers and deployers**) — **directly applicable to CoachCRM**
  - **2027-08-02** : full application of high-risk AI rules

  CoachCRM is at minimum a **deployer** of a general-purpose AI model (likely GPT-4/Claude/Gemini for transcription-and-summary, Whisper for STT). The planned features place it in the **limited-risk** category (not high-risk per Annex III, which lists only specific sectors — therapy support is not explicitly listed, though the borderline with "employment / education / essential services" is thin).

  Art. 50 transparency duties that **apply** :
  1. **Art. 50.2** — AI-generated audio / image / video / text that is deployed to the public must be labelled as artificially generated in a machine-readable format. The auto-CR, the "ritual assistant" chatbot, and any AI-produced synthesis **must** be tagged `ai_generated=true` in a way that propagates (watermark, metadata).
  2. **Art. 50.3** — Users of emotion recognition or biometric categorisation systems must be *informed*. **Diarisation** (identifying "who spoke" in a couple session) is borderline biometric categorisation depending on technique ; if the diarisation uses voice characteristics for speaker attribution, Art. 50.3 is triggered.
  3. **Art. 50.4** — Deployers of AI that generates *deep fakes* or *manipulated text* must disclose it. The auto-CR is "manipulated text" in the regulatory sense (AI-generated text on a matter of public interest — health care qualifies) and must therefore carry a disclosure.

  Additionally, the planned **"IA chat with full dossier"** (Axe 2 V2) processes Article 9 health data through an LLM. The DPIA (GDPR Art. 35, covered in §05) is mandatory, and the CNIL sandbox/doctrine on "assistants IA en santé" (2024 doctrine) recommends :
  - prompt-and-completion logging with retention
  - guardrails on prompt injection (no patient-identifiable data leaves EU region)
  - human-in-the-loop for any clinical recommendation

  None of these are presently implemented.

- **Evidence** : `grep -ri "ai_generated|transparency|AI Act|Art\. 50|watermark"` in `src/` → **0 hits**.

- **Recommendation** :
  1. **Label AI content in the UI** — every auto-CR must carry a visible banner "Contenu généré par IA — à relire avant validation" and a backend column `reports.ai_generated boolean`, `reports.reviewed_at timestamptz`, `reports.reviewed_by uuid`.
  2. **Store AI metadata** — `ai_synthesis_metadata jsonb` with `{model, version, prompt_hash, temperature, generated_at, reviewed_at, reviewed_by}`.
  3. **Human-in-the-loop gate** — make the CR "validated" status explicit and require therapist confirmation before the CR becomes part of the dossier of record.
  4. **Choose an EU-region LLM vendor** if "données hébergées en France" is kept as a commercial claim (R-01). Mistral Large (via Azure FR or direct), Claude via Anthropic EU, Gemini via GCP EU — *not* OpenAI direct API (US default).
  5. **Register the AI system** — under EU AI Act Art. 49, certain systems are registered in the EU database. Verify whether the planned deployment triggers this (low likelihood for limited-risk, but worth checking).
  6. **Document the AI pipeline** in a new `docs/AI_SYSTEM_CARD.md` : purposes, training data (none — deployer only), risks, mitigations, human oversight, incident response.
  7. **DPIA update** — the GDPR DPIA (§05) must include a specific AI-processing section covering each LLM call.

- **Legal reference** :
  - Règlement (UE) 2024/1689 du 13/06/2024 (AI Act) — https://eur-lex.europa.eu/eli/reg/2024/1689/oj
    - Art. 50 (transparency) applicable 2026-08-02
    - Art. 113 (phased entry)
    - Annex III (high-risk classification — therapy not listed)
  - RGPD Art. 22 (automated decision-making) — a CR is not an "automated decision" per se, but the IA chat giving clinical suggestions is borderline
  - CNIL doctrine IA 2024 — https://www.cnil.fr/fr/ia

---

### 🟠 High

---

#### R-07 · Health-data status is ambiguous, HDS decision undocumented

- **Location** :
  - `docs/synthese_strategique.md` §"Chantiers Complémentaires Identifiés" — 🔴 Before MVP : «hébergement HDS»
  - `docs/template_consentement_patient.md` §7 — **"Stockage sécurisé sur serveurs conformes aux normes européennes (hébergement HDS si applicable)"** — the *"si applicable"* is a hedge; a formal determination has not been made
  - `LoginPage.jsx:274` — **"Données hébergées en France, conformes RGPD"** — implies health-data-grade hosting without declaration

- **Risk** : Art. L1111-8 CSP imposes HDS certification (Hébergeur de Données de Santé) on **any entity that hosts data concerning health on behalf of a natural or legal person subject to professional secrecy** (i.e. a medical professional). Three conditions must be met for HDS to be strictly mandatory :

  1. The data is health data (**yes** — audio of therapy, emotional maturity metrics, vigilance flags, `reports.emotions_a/b`, patterns analysis — all Art. 9 GDPR data).
  2. The entity is a *hosting provider* on behalf of a third party (yes — CoachCRM hosts data on behalf of therapists).
  3. The data subject is under the care of a *health professional subject to professional secrecy per C. pénal 226-13* (**the grey zone**) — this includes titled psychotherapists, psychologists, psychiatrists, etc. It **does not** automatically extend to "coach thérapeute de couple CNV" who is not on the ADELI/RPPS register.

  CoachCRM's target persona per `synthese_strategique.md` is "thérapeute de couple CNV" — non-regulated. **So HDS is not strictly mandatory** as the law stands. BUT :
  - If *any* signed-up therapist holds the titled **psychothérapeute** (Loi 2004-806 Art. 91) qualification, or is a psychologue, médecin, etc. → HDS becomes mandatory the moment that user uploads a patient record.
  - The commercial claim on the login page implies an HDS-grade hosting. Absent that certification, misleading practice (R-01) compounds.
  - CNIL doctrine on "assistants numériques santé" (sectoral guidance) recommends HDS **regardless** of the strict applicability, as a "best practice" for app-health data.

- **Evidence** :
  - Supabase's standard EU tier is **not HDS-certified** (as of 2026 publicly — https://supabase.com/security — Supabase is SOC 2, ISO 27001, GDPR-ready, but HDS certification is an additional French-specific scope not held).
  - No mention in the codebase of an HDS hosting switch.

- **Recommendation** :
  1. **Formally document the HDS determination** in a new `docs/COMPLIANCE_DECISION_HDS.md` : target persona is non-regulated ; data is health data ; HDS not strictly mandatory under L1111-8 ; Supabase EU chosen with encryption at rest + in transit as the practical mitigation.
  2. **Gate sign-up by professional status** — during onboarding, ask the therapist for their ADELI / RPPS number (if any). If they claim to be psychologue / psychothérapeute / psychiatre / médecin, either :
     - refuse the sign-up until CoachCRM holds an HDS certification ; or
     - route their tenant to a separate HDS-certified hosting plan (long-term).
  3. **Align commercial claims with the chosen infrastructure** — if Supabase non-HDS is the choice, the login-page claim must be muted (R-01).
  4. **Roadmap-lock**: before soliciting regulated health professionals, either (i) achieve HDS via a partner (OVH Healthcare, Clever Cloud HDS, Azure Health Data Services FR…) or (ii) exclude them explicitly from CGV.

- **Legal reference** :
  - CSP Art. L1111-8 (hébergement des données de santé)
  - CSP Art. L4161-1 (exercice illégal médecine)
  - Loi 2004-806 du 09/08/2004 Art. 91 (titre psychothérapeute)
  - Décret n° 2018-137 du 26/02/2018 (certification HDS)
  - Code pénal Art. 226-13 (secret professionnel)
  - https://esante.gouv.fr/labels-certifications/hebergement-des-donnees-de-sante

---

#### R-08 · No accessibility statement, no schéma pluriannuel (cross-ref §07)

- **Location** : transverse — no route `/accessibilite`, no meta-declaration
- **Risk** : Under Décret 2019-768, a **déclaration d'accessibilité** is required on every page of any site subject to the obligation. Applicability thresholds :
  - Public legal persons : always
  - Private legal persons with CA FR ≥ 250 M€ : yes
  - European Accessibility Act (Dir. UE 2019/882) : applicable to specific consumer-facing services from 2025-06-28 — CoachCRM as B2B therapy software is likely outside the direct scope, but the field is expanding.

  CoachCRM is below the 250 M€ threshold (MVP phase). **Strict legal applicability is no**, but :
  1. If any therapist client is contractually tied to a public-sector practice, the obligation can propagate.
  2. Silence is worse than a "non-conformant" statement : publishing an `/accessibilite` page with level "non évalué" is free and preempts criticism.
  3. Cross-reference : the detailed WCAG/RGAA grid is handled in `audit/07_accessibility.md`.

- **Recommendation** : publish a `/accessibilite` page with the DINUM template (even "non-conforme"). Cost : 1 hour. Benefit : LCEN obligation R-02 + defusing consumer-law claims.

- **Legal reference** : Loi 2005-102 Art. 47 ; Décret 2019-768 ; RGAA 4.1 ; Directive UE 2019/882

---

#### R-09 · No consumer précontractuelle information layer (Art. L221-5 C. conso.) for the paid tier

- **Location** : `docs/synthese_strategique.md` "modèle économique freemium" planned ; no `/cgv`, no price grid, no consumer-info layer
- **Risk** : When the freemium tier ships, any therapist signing up as auto-entrepreneur-person-physique is a **consumer** under L217-3 C. conso. (by default, unless explicitly acting *"pour des besoins qui entrent dans le cadre de son activité commerciale, industrielle, artisanale, libérale ou agricole"* — the line is thin for a solo therapist). Consequences :
  - Pre-contract information (L221-5) — all characteristics, price, delivery modes, right of withdrawal, AR guarantees
  - Right of withdrawal 14 days (L221-18) for any distance contract, unless the therapist explicitly waives it for an immediately-executed service (L221-28)
  - Cooling-off reimbursement obligations (L221-24)

- **Recommendation** : ship `/cgv` with explicit pre-contract layer and right-of-withdrawal notice before the paid tier goes live.

- **Legal reference** : C. conso. L221-5, L221-18, L221-24, L221-28

---

#### R-10 · `users.role` schema does not isolate data owners from admins in RLS

- **Location** :
  - `supabase/migration.sql` l.10 — `role TEXT DEFAULT 'therapist' CHECK (role IN ('admin', 'therapist'))`
  - `supabase/migration.sql` l.175 — `CREATE POLICY "Users can view own clients" ON clients FOR ALL USING (user_id = auth.uid());`
  - `src/App.jsx:224-226` — admin routes gated by `user.role === 'admin'` client-side only

- **Risk** : This is primarily a §03 security concern (client-side role check, RLS policies not enforcing admin limits). It is listed here because admin access to patient data **without the patient's or therapist's knowledge** violates GDPR Art. 5 transparency and the CNIL doctrine on psychology-practice software (unpublished but referenced) which requires *"accès à la donnée de santé strictement limité au professionnel de santé en charge"*. If the admin role has cross-tenant visibility, every tenant's data is exposed to the platform operator — this must be either (a) forbidden by RLS, or (b) explicitly disclosed in the politique de confidentialité.

- **Recommendation** : see `audit/03_security.md` for the RLS hardening. From a regulatory angle, either restrict admin to billing metadata only, or disclose clearly in `/confidentialite`.

- **Legal reference** : GDPR Art. 5 ; CSP L1111-7 (accès dossier) if health-professional scope ; CNIL health-software doctrine

---

### 🟡 Medium

---

#### R-11 · Google OAuth — no cookie notice, no alternative auth

- **Location** : `LoginPage.jsx:9-21`, `LoginPage.jsx:204-224` (Google button), `LoginPage.jsx:248-263` (the "Créer mon compte" button in fact calls `handleGoogleLogin` too — there is no email+password option at all).

- **Risk** :
  1. **CNIL délib. 2020-091** — cookies and trackers must be consented to before being placed, except strictly necessary ones. Clicking "Se connecter avec Google" triggers a Google-domain navigation that sets third-party cookies ; the consent is via the action of clicking, but the *preceding information* (a short notice) is missing.
  2. **Exclusive Google auth** discriminates against users who refuse Google for legitimate reasons (professional ethics, GAFAM opt-out). For a SaaS handling health data, single-provider auth is a *product* weakness in a CNIL-audit context.

- **Recommendation** :
  1. Add a small text below the Google button : *« En utilisant Google, vous acceptez la politique de confidentialité Google. Google peut déposer des cookies sur votre appareil. »*
  2. Ship email + password (magic link) as an alternative before opening to beyond 5 testers.
  3. Link to `/cookies` page.

- **Legal reference** : Directive ePrivacy 2002/58/CE Art. 5.3 ; LIL Art. 82 ; CNIL délib. 2020-091 ; GDPR Art. 25 (privacy by design — avoiding sole-provider lock-in)

---

#### R-12 · No access log for health-data reads (CNIL traceability doctrine)

- **Location** : `src/services/dataService.js`, `src/services/invoiceService.js` — Supabase queries fire directly, no server-side audit trail of reads

- **Risk** : CNIL doctrine "Journalisation — dispositif de traçabilité" (2021) recommends a read-log for health data, retained **at least 6 months, ideally 3 years**. The current stack logs nothing at application level ; Supabase Pro logs are rotation-limited and not per-row.

- **Recommendation** : for audio and report reads in particular, add a lightweight `access_log(user_id, entity, entity_id, action, accessed_at, ip_address)` table + a wrapper on `createSignedUrl`.

- **Legal reference** : CNIL recommandation « Journalisation » 2021 ; GDPR Art. 24, 32

---

#### R-13 · No payment-terms L441-10 compliance on invoice module

- **Location** : `src/services/invoiceService.js` — no `due_date`, no `payment_terms`, no check on payment delay

- **Risk** : If CoachCRM becomes a real invoice generator (R-04 scenario b), each invoice must carry a payment term ≤ 60 days (ex. 45 days end-of-month). Non-compliance exposes the emitter to a DGCCRF fine up to **2 M€** (L441-16 C. com.).

- **Recommendation** : bundled with R-04/R-05.

- **Legal reference** : C. com. L441-10, L441-16

---

#### R-14 · No mechanism for data-subject portability export for patients

- **Location** : `src/components/client/ClientHeaderPanel.jsx:82` — button labelled "Exporter l'ensemble du dossier patient (Excel) conformément au droit de portabilité RGPD" — this exports *for the therapist*, not for the *patient*. The patient (data subject) cannot request an export themselves; no portal.

- **Risk** : GDPR Art. 20 (right to portability) is the patient's right, not the therapist's. The UI currently frames it as a therapist convenience. In the *intended* use case (therapist assists the patient's request), it is acceptable — but the UX copy misrepresents the legal basis. Cross-ref §05 GDPR.

- **Recommendation** : amend the tooltip : "Export au format Excel pour répondre à une demande de portabilité du patient (RGPD Art. 20)" — making clear it is a *tool* for the therapist to fulfil a *patient* right.

- **Legal reference** : GDPR Art. 20

---

#### R-15 · Seed data contains real personal data — ethical and contractual risk

- **Location** : `supabase/seed.sql` + `audit/live_schema/README.md` notes that `transfer_data.sql:49` hard-codes `claudia@kotech.ai` (a real person), and `seed.sql` seeds `anne-chantal.meyer@gmail.com` (likely a real therapist)

- **Risk** :
  1. Personal data in version control = leak into every fork, every CI artifact, every developer workstation. This is a straight-up GDPR Art. 32 breach.
  2. If the therapist (Anne-Chantal Meyer on the login-page testimonial `l.33`) consented to be a testimonial but **not** to having her email seeded in dev databases, the consent basis is exceeded (GDPR Art. 6.1.a + Art. 7 specificity of consent).
  3. `claudia@kotech.ai` is an unrelated organisation's address — copy-paste from the Kotech codebase, indicative of sloppy seed hygiene.

- **Recommendation** :
  - Replace all seed emails with `alice@example.com` / `bob@example.com` (IANA-reserved domain).
  - Purge the offending commits from history if the repo is pushed publicly (BFG-Repo-Cleaner) ; if private, it is sufficient to remove going forward.
  - Cross-ref security audit §03.

- **Legal reference** : GDPR Art. 5.1.c (data minimisation), Art. 6.1.a (consent), Art. 32 (security)

---

#### R-16 · No direct-debit / SEPA mandate management — vendor-billing gap

- **Location** : `docs/synthese_strategique.md` "freemium monthly subscription" + "facturation plateforme" V2
- **Risk** : When CoachCRM bills therapists, the payment method is likely SEPA direct debit (DOM EU norm) or Stripe card-on-file. Both require :
  - SEPA mandate (SEPA Rulebook, CNIL doctrine on IBAN handling)
  - PCI-DSS scope (if card handling) — out-of-scope if Stripe hosts the card
  - Information notice per Règlement UE 2015/751 (interchange fees, though mostly issuer-side)
- **Recommendation** : defer to the billing-integration ticket when it comes ; ensure Stripe Billing or similar is used, not raw SEPA file generation.
- **Legal reference** : Règlement UE 260/2012 (SEPA) ; CNIL IBAN doctrine 2018

---

### 🔵 Low / Informational

---

#### R-17 · No NIR (numéro de sécurité sociale) collection — confirmation

- **Location** : searched `nir|securité_sociale|social_security|numero_securite` in `src/` — 0 hits
- **Risk** : none — positive confirmation. Schema matches CNIL restrictive NIR doctrine by default.
- **Recommendation** : document this explicitly in `docs/MES_REGLES_METIER.md` ("CoachCRM ne collecte jamais de NIR"). Add a CI check to ensure no future PR introduces it.
- **Legal reference** : Décret 2019-341 du 19/04/2019 ; CNIL délib. NIR ; GDPR Art. 87

---

#### R-18 · Psychothérapeute title — persona gating (informational)

- **Location** : `docs/synthese_strategique.md` target persona "coach thérapeute de couple CNV"
- **Risk** : Low — target persona is non-regulated. However, if the sign-up flow does **not** screen for protected titles, a psychothérapeute / psychologue / médecin can self-onboard, silently triggering the stricter HDS + 20-year CSP retention regime without CoachCRM being ready. See R-07 for the mitigation.
- **Recommendation** : onboarding questionnaire : "Êtes-vous titulaire d'un titre professionnel protégé (psychologue, psychothérapeute, médecin, psychiatre) ? Si oui, précisez votre numéro ADELI / RPPS." + gate by acceptable values.
- **Legal reference** : Loi 2004-806 Art. 91 ; CSP L4161-1 ; C. pénal 226-13

---

#### R-19 · Testimonial on login page — consent documentation

- **Location** : `LoginPage.jsx:32-35` — "Anne-Chantal Meyer" and "Jean-Pierre Rousseau" named with city and profession
- **Risk** : Image right (droit à l'image) + GDPR Art. 6 lawful basis. If written consent from these individuals exists, file it. If they are fictitious, label the testimonials as illustrative.
- **Recommendation** : file a written-consent per testimonial-person in a compliance folder, or replace with clearly illustrative names.
- **Legal reference** : GDPR Art. 6 ; C. civ. Art. 9 (droit à l'image/vie privée)

---

#### R-20 · Cross-border data transfers — OAuth Google + LLM vendor

- **Location** : `LoginPage.jsx:9-21` (Google OAuth) + planned LLM vendor (TBD)
- **Risk** : Cross-referenced to §05 GDPR. Mentioned here for completeness : Google is a US transfer ; any US LLM vendor is too ; SCC 2021/914 + TIA required. If "Données hébergées en France" is kept on login, every US sub-processor contradicts it (see R-01).
- **Recommendation** : maintain a published sub-processor list on `/confidentialite` with the legal transfer mechanism column.
- **Legal reference** : GDPR Chap. V ; SCC 2021/914 ; TADPF (if EU-US framework used)

---

## What's Done Well

The codebase has a few features that *partially* mitigate the above :

- **Patient-consent template** (`docs/template_consentement_patient.md`) — 219 lines, covers all Art. 13 GDPR items, distinguishes three finalities with separate opt-in, documents retention per artefact, includes withdrawal form. This is **above average** for a pre-MVP SaaS; it ships before the build does. Preserve it.
- **Soft-delete on clients** (`clients.deleted_at` per `live_schema/tables.md`) — even though uncoupled from a purge workflow, the column is already there, ready to host the lifecycle management of R-03.
- **Row Level Security is enabled** on 6 core tables (`clients`, `sessions`, `contacts`, `reports`, `settings`, `professionals`) with `user_id = auth.uid()` tenant isolation. Good tenant-isolation foundation.
- **No NIR collection** — positive confirmation (R-17).
- **Google OAuth avoids password management** — reduces the surface area for credential leakage (a tick under GDPR Art. 32), even if it introduces the cookie notice gap (R-11).
- **Client-side lazy loading of all routes** — `App.jsx:13-23` uses `React.lazy` for every page. Makes the public surface (login page) light, which marginally helps accessibility and cookie-minimisation (fewer third-party scripts on first paint).
- **The consent template already anticipates HDS hosting "if applicable"** — the 🔴 "avant MVP" flag in `synthese_strategique.md` shows awareness of the gap (R-07), which is better than silence.

---

## Remediation Plan — Prioritised with Deadlines

| # | Priority | Action | Regulatory deadline | Effort |
|---|---|---|---|---|
| **R-01** | 🔴 Critical | Rewrite misleading commercial claim on login ; verify Supabase region ; make legal links real | **Immediate** (L121-2 ongoing) | XS (1 h) — **fix today** |
| **R-02** | 🔴 Critical | Publish `/mentions-legales`, `/confidentialite`, `/cgu`, `/cgv`, `/accessibilite`, `/cookies` ; refactor routing so they are public | **Before MVP opens** (LCEN permanent) | S (2–3 days) |
| **R-03** | 🔴 Critical | `retention_policies` table + purge cron + columns `retention_until`, `anonymized_at` on 8 entities | **Before MVP opens to real data** | M (2 weeks) |
| **R-04** | 🔴 Critical | Decision on billing-assistant vs invoice-emitter role ; at minimum, PDP reception-side integration | **2026-09-01** (T-133 days) | M (6–8 weeks) |
| **R-05** | 🔴 Critical | If emitter chosen, implement Art. L441-9 + 242 nonies A mentions | Tied to R-04 | M |
| **R-06** | 🔴 Critical | AI transparency labelling ; AI system card ; EU-region LLM vendor | **2026-08-02** (T-103 days — Art. 50 entry) | M (3–4 weeks) |
| **R-07** | 🟠 High | HDS decision documented ; onboarding gate on protected titles | Before opening to > 5 testers | S (3 days decision + M for HDS if chosen) |
| **R-08** | 🟠 High | Publish accessibility statement (even non-conforme) | LCEN permanent | XS (2 h) |
| **R-09** | 🟠 High | CGV + précontract info for paid tier | Before V2 freemium | S (3 days) |
| **R-10** | 🟠 High | Admin role scoping in RLS ; disclose in `/confidentialite` | Before MVP | S–M (tied to §03) |
| **R-11** | 🟡 Medium | Cookie notice + alt auth method | Before public launch | S (1 day) |
| **R-12** | 🟡 Medium | Access log for health-data reads | Before > 5 testers | S (3–4 days) |
| **R-13** | 🟡 Medium | L441-10 compliance on invoices | Tied to R-04 | S |
| **R-14** | 🟡 Medium | Relabel portability-export UI copy | Now | XS |
| **R-15** | 🟡 Medium | Seed data scrubbed of real personal data ; history purged | Now | S (½ day) |
| **R-16** | 🟡 Medium | Vendor-billing via Stripe Billing (defer until V2) | V2 freemium launch | M (tied to V2) |
| **R-17** | 🔵 Info | Document no-NIR rule | Now | XS |
| **R-18** | 🔵 Info | Onboarding questionnaire for protected titles | Tied to R-07 | XS |
| **R-19** | 🔵 Info | Archive testimonial consents | Now | XS |
| **R-20** | 🔵 Info | Publish sub-processor list on `/confidentialite` | Tied to R-02 | S (bundled) |

**Total critical effort** : ~10 weeks of 1 FTE to resolve the six criticals, parallelisable to ~6 weeks calendar.

**Hard-deadline watch** :

| Date | Days from 2026-04-21 | Blocker if unresolved |
|---|---|---|
| **2026-08-02** | T-103 | EU AI Act Art. 50 transparency (R-06) |
| **2026-09-01** | T-133 | E-invoicing reception obligation (R-04) |
| **2027-08-02** | T-468 | EU AI Act full high-risk application (monitoring only) |
| **2027-09-01** | T-498 | E-invoicing emission obligation SMEs (R-04 scenario b) |

---

## Conclusion

CoachCRM is at an **early, pre-MVP** stage with respect to French and EU regulation. The good news : the gaps are not the product of bad design choices, they are simply *not yet built*. The founder document `synthese_strategique.md` explicitly flags the main legal chantiers, which is a mature starting posture.

The bad news : **six Critical findings** must be closed before real patient data enters the system. Three of them are cheap (R-01 wording fix, R-02 public pages, R-17 documentation) ; three of them are expensive (R-03 retention machinery, R-04 e-invoicing architecture, R-06 AI Act compliance). The expensive three all have **calendar deadlines in 2026** that make them non-deferrable past Q3 2026.

**Single highest-leverage action today** : the login-page commercial claim (R-01) — a 5-minute text edit that closes a consumer-law exposure and reduces the magnitude of every other finding's reputational downside.

**Production verdict** :

> **Not ready for production**. **Conditional path forward** :
> 1. **Week 1** : Fix R-01 wording, publish skeleton public pages for R-02 (even with placeholder content), document R-17 + R-18 onboarding gate.
> 2. **Weeks 2–4** : Ship retention machinery (R-03), HDS decision + onboarding gate (R-07), access log (R-12).
> 3. **Weeks 2–6** : AI Act transparency (R-06) — must land before 2026-08-02.
> 4. **Weeks 5–10** : E-invoicing decision + PDP reception (R-04, R-05) — must land before 2026-09-01.
> 5. **Before opening to > 5 testers** : seed data scrubbing (R-15), RLS admin scoping (R-10), CGV (R-09).

**Opening to 5 therapist testers** is acceptable after weeks 1–2 provided :
- Testers sign a *test-user consent* explicitly acknowledging pre-production status
- No real patient data is entered (or it is entered only under each tester's own GDPR responsibility, with a DPA between them and CoachCRM)
- The misleading claim on login is fixed

**Opening to paying customers** requires all six Criticals closed and a CNIL/DPO review of the politique de confidentialité.

---

## Appendix A — Flow-by-flow regulatory mapping

### A.1 Flow "Therapy notes" (`reports`, `clients.notes`, `clients.ai_synthesis`)

| Element | Detail |
|---|---|
| Entities | `reports(narrative, themes, emotions_a, emotions_b, patterns, progress, vigilance, exercises, pedagogical_content)` + `clients.ai_synthesis` |
| Files | `src/pages/ReportDetailPage.jsx`, `supabase/migration.sql` §4 |
| Texts | GDPR Art. 9 (health data) ; GDPR 5.1.e ; C. civ. 2224 ; CSP R1112-7 (conditional) ; EU AI Act Art. 50 |
| Status | 🟠 Rich schema, zero retention enforcement, no AI-generated labelling |
| Residual risk | R-03, R-06, R-07 |

### A.2 Flow "Audio recordings" (planned MVP)

| Element | Detail |
|---|---|
| Entities | Not yet built — `sessions.audio_file text` column exists as placeholder |
| Texts | GDPR Art. 9 + Art. 25 (by design) ; consent template patient ; EU AI Act Art. 50.3 (biometric diarisation) ; CSP L1111-8 (HDS) |
| Status | Not shipped — fortunate opportunity to build it right |
| Residual risk | R-03, R-06, R-07, R-12 |

### A.3 Flow "Invoices" (`invoices`, `invoice_sessions`)

| Element | Detail |
|---|---|
| Entities | `invoices(user_id, client_id, invoice_date, sent, sent_at)` (runtime only — not in `migration.sql`) ; `invoice_sessions(invoice_id, session_id)` |
| Files | `src/services/invoiceService.js` (152 lines) ; `src/pages/FinancesPage.jsx` (consumer) |
| Texts | Ord. 2021-1190 ; CGI 289, 242 nonies A, 293 B, 283-2 ; C. com. L441-9, L441-10, L123-22 ; LPF L102 B |
| Status | 🔴 Not an invoice in the legal sense — a payment-chasing flag. Table not even in version control. |
| Residual risk | R-04, R-05, R-13 |

### A.4 Flow "Client file" (`clients`, `client_links`)

| Element | Detail |
|---|---|
| Entities | `clients` (rich, ~30 columns) + `client_links` |
| Texts | GDPR Art. 5.1.e ; CNIL CRM doctrine (3 ans) |
| Status | 🟠 Soft-delete column exists, no purge, no anonymisation |
| Residual risk | R-03 |

### A.5 Flow "Sessions" (`sessions`)

| Element | Detail |
|---|---|
| Entities | `sessions(date, duration, phase, status, title, summary, payment_method, payment_amount, payment_date, needs_invoice, invoice_sent)` |
| Texts | GDPR ; LPF L102 B if substantiates invoices |
| Status | 🟠 Payment fields present — retention absent |
| Residual risk | R-03 |

### A.6 Flow "Professional network" (`professionals`, `professional_referrals`, `client_links`)

| Element | Detail |
|---|---|
| Entities | `professionals` + `professional_referrals` (dead-table risk per `live_schema/README.md`) |
| Texts | GDPR Art. 6.1.f (legitimate interest B2B CRM) ; CNIL 3-year rule |
| Status | 🟡 Schema drift ; retention absent |
| Residual risk | R-03, cleanup of dead table |

### A.7 Flow "AI synthesis" (`clients.ai_synthesis`, `reports.narrative` generated)

| Element | Detail |
|---|---|
| Entities | `clients.ai_synthesis text` (JSON-encoded) |
| Texts | GDPR Art. 9 + Art. 22 (automated decision) ; EU AI Act Art. 50 |
| Status | 🟠 No metadata, no labelling, no human-review gate |
| Residual risk | R-06 |

### A.8 Flow "Tenant billing" (CoachCRM-as-vendor, planned V2)

| Element | Detail |
|---|---|
| Entities | Not built |
| Texts | Ord. 2021-1190 (CoachCRM in-scope as issuer from 2027-09-01) ; CGI 289 bis ; SEPA Reg. 260/2012 |
| Status | Not shipped |
| Residual risk | R-04, R-16 |

---

## Appendix B — File-to-finding cross-reference

| File | Findings |
|---|---|
| `/home/zamolxes/devs/coach-crm/src/pages/LoginPage.jsx` | R-01, R-02, R-06, R-11, R-19 |
| `/home/zamolxes/devs/coach-crm/src/App.jsx` | R-02, R-10 |
| `/home/zamolxes/devs/coach-crm/src/services/invoiceService.js` | R-03 (hard delete), R-04, R-05, R-13 |
| `/home/zamolxes/devs/coach-crm/src/services/dataService.js` | R-03, R-12 |
| `/home/zamolxes/devs/coach-crm/src/pages/FinancesPage.jsx` | R-04, R-05 |
| `/home/zamolxes/devs/coach-crm/src/components/client/ClientHeaderPanel.jsx` | R-14 |
| `/home/zamolxes/devs/coach-crm/supabase/migration.sql` | R-03, R-04 (missing table), R-10 |
| `/home/zamolxes/devs/coach-crm/supabase/seed.sql` | R-15 |
| `/home/zamolxes/devs/coach-crm/supabase/transfer_data.sql` | R-15 |
| `/home/zamolxes/devs/coach-crm/docs/synthese_strategique.md` | R-02 (self-flagged), R-04, R-07 |
| `/home/zamolxes/devs/coach-crm/docs/template_consentement_patient.md` | ✅ Preserve (good baseline) |
| **(to create)** `src/pages/public/MentionsLegales.jsx` | R-02 |
| **(to create)** `src/pages/public/Confidentialite.jsx` | R-02, R-20 |
| **(to create)** `src/pages/public/CGV.jsx` | R-02, R-09 |
| **(to create)** `src/pages/public/CGU.jsx` | R-02 |
| **(to create)** `src/pages/public/Cookies.jsx` | R-02, R-11 |
| **(to create)** `src/pages/public/Accessibilite.jsx` | R-02, R-08 |
| **(to create)** `docs/COMPLIANCE_DECISION_HDS.md` | R-07 |
| **(to create)** `docs/AI_SYSTEM_CARD.md` | R-06 |
| **(to create)** `supabase/migrations/2026xxxx_retention_policies.sql` | R-03 |
| **(to create)** `supabase/migrations/2026xxxx_invoices_v2_einvoicing.sql` | R-04, R-05 |
| **(to create)** `supabase/migrations/2026xxxx_access_log.sql` | R-12 |

---

## Appendix C — Legal texts cited

### EU law
- **Règlement (UE) 2016/679** (RGPD) — https://eur-lex.europa.eu/eli/reg/2016/679/oj/fra
- **Règlement (UE) 910/2014** (eIDAS) + **UE 2024/1183** (eIDAS 2) — https://eur-lex.europa.eu/eli/reg/2014/910/oj/fra
- **Règlement (UE) 2024/1689** (AI Act) — https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- **Règlement (UE) 260/2012** (SEPA)
- **Directive 2002/58/CE** (ePrivacy)
- **Directive (UE) 2019/882** (European Accessibility Act)
- **Directive 2011/83/UE** (consumer rights — base of L221 C. conso.)

### French law
- **Loi n° 78-17 du 6 janvier 1978** modifiée (Loi Informatique et Libertés) — Legifrance
- **Loi n° 2004-575 du 21 juin 2004** (LCEN) — Art. 6-III, 20
- **Loi n° 2004-806 du 9 août 2004** — Art. 91 (titre psychothérapeute)
- **Loi n° 2005-102 du 11 février 2005** — Art. 47 (accessibilité)
- **Ordonnance n° 2021-1190 du 15 septembre 2021** (facturation électronique) — https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000044053700
- **Loi n° 2023-1322 du 29 décembre 2023** (LF 2024) — Art. 91 (report échéances e-facture)
- **Décret n° 2019-768 du 24 juillet 2019** (RGAA)
- **Décret n° 2018-137 du 26 février 2018** (certification HDS)
- **Décret n° 2022-1299 du 7 octobre 2022** (modalités e-facture)

### Codes
- **Code civil** — Art. 9 (vie privée) ; 1366, 1367, 1368 (preuve électronique) ; 2224 (prescription)
- **Code de la santé publique** — L1111-7 (accès dossier) ; L1111-8 (HDS) ; L4161-1 (exercice médecine) ; R1112-7 (conservation dossier 20 ans)
- **Code du travail** — out-of-scope here (handled in §05)
- **Code de commerce** — L123-22, L441-1, L441-9, L441-10, L441-16, R123-237
- **Code général des impôts** — 289, 289 bis, 290, 293 B, 242 nonies A, 262 ter I, 283-2
- **Livre des procédures fiscales** — L102 B
- **Code de la consommation** — L121-2, L121-3, L121-4, L132-1, L132-2, L211-1, L217-3, L217-4, L221-5, L221-18, L221-24, L221-28
- **Code pénal** — Art. 226-13 (secret professionnel)
- **Code monétaire et financier** — (referenced by cross-link to C. com. L441-10 délais paiement)
- **Code des postes et communications électroniques** — L34-5

### Doctrine and standards
- **CNIL** — référentiel RH délib. 2019-001
- **CNIL** — Délibération 2020-091 (cookies)
- **CNIL** — doctrine NIR
- **CNIL** — recommandation « Journalisation » 2021
- **CNIL** — doctrine IA 2024
- **DGFiP** — BOI-TVA-DECLA-30-20-10, BOI-CF-COM-10
- **DINUM** — RGAA 4.1 (https://accessibilite.numerique.gouv.fr/)
- **eSanté** — HDS certification (https://esante.gouv.fr/labels-certifications/hebergement-des-donnees-de-sante)
- **Norme EN 16931-1** (e-invoice semantics) ; **ISO 20022** / **CII** (syntax)
- **AFNOR** NF Z42-013 (archivage électronique), NF Z42-020 (coffre-fort numérique)

---

## Appendix D — Glossary

| Term | Definition |
|---|---|
| **CNV** | Communication Non-Violente — méthodologie de Marshall Rosenberg ; cadre métier des thérapeutes cibles |
| **HDS** | Hébergeur de Données de Santé — certification française requise par CSP L1111-8 pour héberger des données de santé pour le compte d'un professionnel de santé |
| **ADELI / RPPS** | Registres français des professionnels de santé (Automatisation DEs LIstes / Répertoire Partagé des Professionnels de Santé) |
| **PDP** | Plateforme de Dématérialisation Partenaire — prestataire privé immatriculé DGFiP |
| **PPF** | Portail Public de Facturation — service public gratuit |
| **Factur-X** | Format hybride franco-allemand : PDF/A-3 + XML CII embarqué (ZUGFeRD côté DE) |
| **UBL** | Universal Business Language (OASIS) |
| **CII** | Cross Industry Invoice (UN/CEFACT) ISO 16931 |
| **LCEN** | Loi pour la Confiance dans l'Économie Numérique |
| **RGAA** | Référentiel Général d'Amélioration de l'Accessibilité |
| **CSP** | Code de la Santé Publique |
| **DGCCRF** | Direction Générale de la Concurrence, Consommation et Répression des Fraudes |
| **DGFiP** | Direction Générale des Finances Publiques |
| **DPIA** | Data Protection Impact Assessment (AIPD) |
| **DPO** | Data Protection Officer (DPD) |
| **SCC** | Standard Contractual Clauses (clauses contractuelles types UE 2021/914) |
| **TADPF** | Transatlantic Data Privacy Framework (EU–US decision 2023) |
| **B2B / B2C** | Business-to-business / Business-to-consumer |
| **ePrivacy** | Directive 2002/58/CE (e-communications) |
| **PCI-DSS** | Payment Card Industry Data Security Standard |
| **TVA** | Taxe sur la Valeur Ajoutée |
| **SIRET / SIREN** | Numéro d'identification des établissements / entreprises en France |
| **NIR** | Numéro d'Inscription au Répertoire (numéro de sécurité sociale) |

---

*End of report 06 — French & EU Regulatory Compliance Audit for CoachCRM.*
