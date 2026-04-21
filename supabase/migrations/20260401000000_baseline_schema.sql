-- =============================================================================
-- [Unverified] Baseline schema captured from static cross-reference
-- (audit/live_schema/tables.md + src/services + src/data/adapters.js)
-- on 2026-04-21. Pre-dates the migration history. Sort-order: this file
-- (20260401) applies before all 20260421_* migrations from Track C.
-- Track M must verify against pg_dump of live DB before treating as
-- authoritative.
--
-- Purpose: closes C-1, C-2, C-3 (schema capture) and supports S-05
--   posture verification by Track M.
--
-- Apply-safety: every statement uses IF NOT EXISTS / CREATE OR REPLACE /
--   ADD COLUMN IF NOT EXISTS so this file is idempotent on both a fresh DB
--   and the current production DB.
--
-- Do NOT re-run ENABLE ROW LEVEL SECURITY on tables already covered by
--   supabase/migration.sql (clients, sessions, contacts, reports, settings,
--   professionals, client_links, professional_referrals) — those statements
--   are idempotent in Postgres and safe to repeat, but we omit them here for
--   clarity. The three new tables (therapy_cycles, invoices, invoice_sessions)
--   have their ENABLE statements below.
--
-- RLS policies for therapy_cycles / invoices / invoice_sessions are owned by
--   Track C (20260421_rls_users_therapy_cycles_invoices.sql) — this baseline
--   only creates the tables and enables RLS on them.
-- =============================================================================


-- =============================================================================
-- § 1  Missing tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- therapy_cycles
-- Confirmed by:
--   • src/data/adapters.js  (adaptTherapyCycle / unadaptTherapyCycle) —
--     client_id, user_id, start_date, total_sessions, rate, phase confirmed
--   • src/services/dataService.js  — getTherapyCycles(userId), createTherapyCycle,
--     updateTherapyCycle, deleteTherapyCycle all .from('therapy_cycles')
--   • docs/MON_ARCHITECTURE_DONNEES.md  — table documented
--   • audit/live_schema/tables.md  (A + S + D columns)
--   • audit/04_database_schema.md  §"reverse-engineered schema"
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS therapy_cycles (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID        REFERENCES clients(id)  ON DELETE CASCADE,  -- [Unverified — sourced from audit/live_schema/tables.md snapshot] — inferred from getTherapyCycles(userId) + adaptTherapyCycle
  user_id         UUID        REFERENCES users(id)    ON DELETE CASCADE,  -- [Unverified — sourced from audit/live_schema/tables.md snapshot] — inferred from getTherapyCycles(userId).eq('user_id', userId)
  start_date      DATE,                                                    -- [Unverified — sourced from audit/live_schema/tables.md snapshot] — confirmed by adapters.js unadaptTherapyCycle + dataService order('start_date')
  rate            NUMERIC,                                                 -- [Unverified — sourced from audit/live_schema/tables.md snapshot] — inferred from audit/04_database_schema.md §reverse-engineered; not in adapter but present in cycle object
  total_sessions  INTEGER,                                                 -- [Unverified — sourced from audit/live_schema/tables.md snapshot] — confirmed by adapters.js adaptTherapyCycle/unadaptTherapyCycle
  phase           TEXT,                                                    -- [Unverified — sourced from audit/live_schema/tables.md snapshot] — inferred from audit/04_database_schema.md §reverse-engineered
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS for therapy_cycles (policies added by Track C)
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE therapy_cycles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_therapy_cycles_client_id ON therapy_cycles (client_id);
CREATE INDEX IF NOT EXISTS idx_therapy_cycles_user_id   ON therapy_cycles (user_id);


-- ---------------------------------------------------------------------------
-- invoices
-- Confirmed by:
--   • src/services/invoiceService.js  — createInvoice inserts: user_id,
--     client_id, invoice_date, sent=false; emitInvoice sets sent=true,
--     sent_at=now(); unemitInvoice sets sent=false, sent_at=null
--   • src/data/adapters.js  adaptInvoice — id, user_id, client_id,
--     invoice_date, sent, sent_at, created_at confirmed by explicit mapping
--   • audit/live_schema/tables.md  (A + S columns)
--   • audit/04_database_schema.md  §"reverse-engineered schema"
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES users(id)    ON DELETE CASCADE,  -- [Unverified — sourced from audit/live_schema/tables.md snapshot] — confirmed by invoiceService.getInvoices(.eq('user_id',userId)) + adaptInvoice
  client_id     UUID        REFERENCES clients(id)  ON DELETE CASCADE,  -- [Unverified — sourced from audit/live_schema/tables.md snapshot] — confirmed by invoiceService.getInvoicesByClient(.eq('client_id',clientId)) + adaptInvoice. FK status [Unverified] per audit/04_database_schema.md
  invoice_date  DATE,                                                    -- [Unverified — sourced from audit/live_schema/tables.md snapshot] — confirmed by invoiceService.createInvoice insert + adaptInvoice.invoiceDate
  sent          BOOLEAN     DEFAULT false,                               -- [Unverified — sourced from audit/live_schema/tables.md snapshot] — confirmed by invoiceService.createInvoice(sent:false) + emitInvoice(sent:true) + adaptInvoice
  sent_at       TIMESTAMPTZ,                                             -- [Unverified — sourced from audit/live_schema/tables.md snapshot] — confirmed by emitInvoice(sent_at:now().toISOString()) + unemitInvoice(sent_at:null). Must be nullable.
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- RLS for invoices (policies added by Track C)
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_invoices_user_id   ON invoices (user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices (client_id);


-- ---------------------------------------------------------------------------
-- invoice_sessions  (join table: invoices ↔ sessions)
-- Confirmed by:
--   • src/services/invoiceService.js  — addSessionToInvoice inserts
--     {invoice_id, session_id}; removeSessionFromInvoice deletes by both;
--     getInvoices selects invoice_sessions(session_id) via FK join;
--     setInvoiceSessions deletes all then re-inserts
--   • src/data/adapters.js  adaptInvoice — reads inv.invoice_sessions.map(is=>is.session_id)
--   • audit/live_schema/tables.md  (S column)
--   • audit/04_database_schema.md  §"reverse-engineered schema"
--
-- UNIQUE constraint: Track C adds it via 20260421_invoice_sessions_unique.sql.
-- We declare the PK here as a composite to prevent duplicate inserts from
-- addSessionToInvoice; Track C's migration is idempotent with this shape.
-- [Unverified — sourced from audit/live_schema/tables.md snapshot] — actual
-- PK/UNIQUE strategy on the live DB is unknown (audit/04_database_schema.md H-7).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_sessions (
  invoice_id  UUID  NOT NULL REFERENCES invoices(id)  ON DELETE CASCADE,  -- [Unverified — sourced from audit/live_schema/tables.md snapshot] — confirmed by invoiceService multiple call sites; ON DELETE CASCADE inferred from deleteInvoice comment "cascade"
  session_id  UUID  NOT NULL REFERENCES sessions(id)  ON DELETE CASCADE,  -- [Unverified — sourced from audit/live_schema/tables.md snapshot] — confirmed by invoiceService multiple call sites
  PRIMARY KEY (invoice_id, session_id)                                     -- [Unverified — sourced from audit/live_schema/tables.md snapshot] — existence of PK/UNIQUE unknown from static analysis; declared here to prevent duplicates (H-7)
);

-- RLS for invoice_sessions (policies added by Track C)
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE invoice_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_invoice_sessions_invoice_id ON invoice_sessions (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_sessions_session_id ON invoice_sessions (session_id);


-- =============================================================================
-- § 2  Drifted columns on existing tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- clients — 14+ drifted columns
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
-- ---------------------------------------------------------------------------

-- deleted_at: soft-delete timestamp
-- Confirmed: adapters.js:46,47 (read: c.deleted_at / write: out.deleted_at)
--            ClientsPage.jsx:519, ClientDetailPage.jsx:479
--            audit/04_database_schema.md §clients column drift
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- billing_address: per-client billing address override
-- Confirmed: adapters.js:43 (read: c.billing_address) + adapters.js:163 (write)
--            audit/04_database_schema.md §clients column drift
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- client_links: JSONB sponsorship/referral links (dual source of truth — see C-6)
-- Confirmed: adapters.js:44 (read: c.client_links || c.clientLinks || [])
--            adapters.js:164 (write: out.client_links)
--            sponsorshipService.js (entire sponsorship feature)
--            audit/04_database_schema.md §C-6
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_links JSONB DEFAULT '[]';

-- external_referrer: free-form JSONB {firstName, lastName} for external referrers
-- Confirmed: adapters.js:45 (read: c.external_referrer || c.externalReferrer)
--            adapters.js:165 (write: out.external_referrer)
--            audit/04_database_schema.md §clients column drift
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS external_referrer JSONB;

-- session_rate: per-client rate override (overrides global sessionRates)
-- Confirmed: adapters.js:48 (read: c.session_rate), adapters.js:167 (write)
--            ClientDetailPage.jsx:47; allianceService.js:20 (client.session_rate)
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS session_rate NUMERIC;

-- session_frequency: desired sessions per time period (integer)
-- Confirmed: adapters.js:49 (read: c.session_frequency), adapters.js:168 (write)
--            audit/04_database_schema.md §clients column drift
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS session_frequency INTEGER;

-- ai_synthesis: JSON-encoded AI synthesis text (stored as text, parsed client-side)
-- Confirmed: adapters.js:50-52 (read: JSON.parse if string starts with { or [)
--            adapters.js:169-172 (write: JSON.stringify if object)
--            audit/04_database_schema.md §clients column drift (no JSON constraint)
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_synthesis TEXT;

-- note_dynamique: therapist note on relational dynamics
-- Confirmed: adapters.js:53 (read: c.note_dynamique), adapters.js:173 (write)
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS note_dynamique TEXT;

-- note_axes: therapist note on work axes
-- Confirmed: adapters.js:54 (read: c.note_axes), adapters.js:174 (write)
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS note_axes TEXT;

-- note_vigilance: therapist note on vigilance points
-- Confirmed: adapters.js:55 (read: c.note_vigilance), adapters.js:175 (write)
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS note_vigilance TEXT;

-- note_objectifs: therapist note on objectives
-- Confirmed: adapters.js:56 (read: c.note_objectifs), adapters.js:176 (write)
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS note_objectifs TEXT;

-- axes_travail: work axes (older column generation — may overlap note_axes)
-- Confirmed: docs/MON_ARCHITECTURE_DONNEES.md:76 only
-- NOT confirmed by adapters.js — orphan column candidate per audit/04_database_schema.md
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
-- Track M: verify whether this column exists and is still written to vs. note_axes
ALTER TABLE clients ADD COLUMN IF NOT EXISTS axes_travail TEXT;

-- points_vigilance: vigilance points (older generation — may overlap note_vigilance)
-- Confirmed: docs/MON_ARCHITECTURE_DONNEES.md only
-- NOT confirmed by adapters.js — orphan column candidate
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS points_vigilance TEXT;

-- objectifs: objectives (older generation — may overlap note_objectifs)
-- Confirmed: docs/MON_ARCHITECTURE_DONNEES.md only
-- NOT confirmed by adapters.js — orphan column candidate
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS objectifs TEXT;

-- dynamique_relationnelle: relational dynamics (older gen — may overlap note_dynamique)
-- Confirmed: docs/MON_ARCHITECTURE_DONNEES.md only
-- NOT confirmed by adapters.js — orphan column candidate
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS dynamique_relationnelle TEXT;


-- ---------------------------------------------------------------------------
-- sessions — 5 drifted columns
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
-- ---------------------------------------------------------------------------

-- cancellation_reason: reason text when status='cancelled'
-- Confirmed: adapters.js:85 (read: s.cancellation_reason)
--            adapters.js:200 (write: out.cancellation_reason)
--            audit/04_database_schema.md §sessions column drift
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- payment_date: date payment was received (separate from session date)
-- Confirmed: adapters.js:84 (read: s.payment_date), adapters.js:199 (write)
--            audit/04_database_schema.md §sessions column drift
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS payment_date DATE;

-- invoice_date: date of invoice associated with this session
-- Confirmed: adapters.js:88 (read: s.invoice_date), adapters.js:203 (write)
--            docs/MON_ARCHITECTURE_DONNEES.md:143
--            audit/04_database_schema.md §sessions column drift (listed as 5th column)
-- NOTE: tables.md §sessions lists only 4 columns; adapters.js reveals a 5th (invoice_date)
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- invoice_covered_session_ids: JSONB array of session UUIDs this invoice covers
-- Confirmed: adapters.js:89 (read: s.invoice_covered_session_ids), adapters.js:204 (write)
--            audit/04_database_schema.md §sessions column drift
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS invoice_covered_session_ids JSONB;

-- covered_session_ids: JSONB array (alternate / secondary coverage tracking)
-- Confirmed: adapters.js:90 (read: s.covered_session_ids), adapters.js:205 (write)
--            audit/04_database_schema.md §sessions column drift
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS covered_session_ids JSONB;


-- ---------------------------------------------------------------------------
-- reports — 1 drifted column
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
-- ---------------------------------------------------------------------------

-- client_name: snapshot of client display name at report creation time
-- Confirmed: adapters.js:101 (read: r.client_name → clientName)
--            docs/MON_ARCHITECTURE_DONNEES.md:159
--            audit/04_database_schema.md §reports column drift
--            audit/live_schema/tables.md §reports
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE reports ADD COLUMN IF NOT EXISTS client_name TEXT;


-- ---------------------------------------------------------------------------
-- settings — 2 drifted columns
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
-- ---------------------------------------------------------------------------

-- therapy_phases: JSONB array of phase objects configured by the therapist
-- Confirmed: DataContext.jsx:51 (settings?.therapy_phases)
--            SettingsPage.jsx:35 (upsertSettings({ therapy_phases: phases }))
--            audit/04_database_schema.md §settings column drift
--            audit/live_schema/tables.md §settings
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE settings ADD COLUMN IF NOT EXISTS therapy_phases JSONB;

-- default_therapy_config: JSONB with per-user therapy config (e.g. {totalSessions: 20})
-- Confirmed: DataContext.jsx:52 (settings?.default_therapy_config)
--            SettingsPage.jsx:40 (upsertSettings({ default_therapy_config: { totalSessions: total } }))
--            audit/04_database_schema.md §settings column drift (listed as 2nd column)
--            audit/live_schema/tables.md §settings
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_therapy_config JSONB;


-- ---------------------------------------------------------------------------
-- professionals — 1 drifted column (docs-only evidence)
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
-- ---------------------------------------------------------------------------

-- referrals: JSONB array of referral records (per docs/MON_ARCHITECTURE_DONNEES.md)
-- Confirmed: docs/MON_ARCHITECTURE_DONNEES.md:243 only
-- NOT confirmed by adapters.js (adaptProfessional does not map this field)
-- NOT confirmed by dataService.js or any service
-- Track M: verify whether this column actually exists in the live DB; if not, omit.
-- [Unverified — sourced from audit/live_schema/tables.md snapshot]
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS referrals JSONB;


-- =============================================================================
-- § 3  Triggers and functions
-- =============================================================================

-- No triggers or functions are declared in any VCS file under supabase/.
-- audit/04_database_schema.md §"Trigger & Function Inventory" confirms: none in VCS.
-- clients.updated_at and professionals.updated_at are maintained by application code
-- (dataService.updateClient:62, dataService.updateProfessional:310) — no DB trigger.
--
-- [Unverified — sourced from audit/live_schema/tables.md snapshot] — any live DB
-- trigger or function is invisible to static analysis. Track M must run:
--   SELECT pg_get_functiondef(oid) FROM pg_proc p
--     JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public';
--   SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgisinternal = false;
-- and commit any discovered definitions here.
