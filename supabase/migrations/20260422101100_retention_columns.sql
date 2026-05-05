-- =============================================================================
-- 20260422101100_retention_columns.sql
-- Add retention lifecycle columns to core tables.
-- clients.deleted_at already exists (baseline_schema + 20260401000000).
-- All ALTER TABLE … ADD COLUMN use IF NOT EXISTS — safe to re-run.
-- audio_recordings is handled by P1-Z track; skipped here.
-- Finding closed: G-08 (no retention timestamps on records)
-- =============================================================================

-- ── clients ──────────────────────────────────────────────────────────────────
-- deleted_at already added by 20260401000000_baseline_schema.sql — skip
ALTER TABLE clients ADD COLUMN IF NOT EXISTS anonymized_at   TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ;

COMMENT ON COLUMN clients.anonymized_at   IS 'Set when personal data is anonymised (DSAR erasure or purge job).';
COMMENT ON COLUMN clients.retention_until IS 'Absolute deadline; purge job hard-deletes or anonymises when now() > retention_until.';

-- ── sessions ─────────────────────────────────────────────────────────────────
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS deleted_at       TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS anonymized_at    TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS retention_until  TIMESTAMPTZ;

COMMENT ON COLUMN sessions.deleted_at      IS 'Soft-delete timestamp.';
COMMENT ON COLUMN sessions.anonymized_at   IS 'Set when personal data is anonymised.';
COMMENT ON COLUMN sessions.retention_until IS 'Absolute retention deadline.';

-- ── reports ──────────────────────────────────────────────────────────────────
ALTER TABLE reports ADD COLUMN IF NOT EXISTS deleted_at       TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS anonymized_at    TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS retention_until  TIMESTAMPTZ;

COMMENT ON COLUMN reports.deleted_at      IS 'Soft-delete timestamp.';
COMMENT ON COLUMN reports.anonymized_at   IS 'Set when personal data is anonymised.';
COMMENT ON COLUMN reports.retention_until IS 'Absolute retention deadline.';

-- ── invoices (billing_reminders) ─────────────────────────────────────────────
-- Table may be named billing_reminders after P1-T migration.
-- Use IF NOT EXISTS on both to be safe.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_reminders') THEN
    ALTER TABLE billing_reminders ADD COLUMN IF NOT EXISTS deleted_at       TIMESTAMPTZ;
    ALTER TABLE billing_reminders ADD COLUMN IF NOT EXISTS anonymized_at    TIMESTAMPTZ;
    ALTER TABLE billing_reminders ADD COLUMN IF NOT EXISTS retention_until  TIMESTAMPTZ;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at       TIMESTAMPTZ;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS anonymized_at    TIMESTAMPTZ;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS retention_until  TIMESTAMPTZ;
  END IF;
END $$;

-- ── contacts ─────────────────────────────────────────────────────────────────
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at       TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS anonymized_at    TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS retention_until  TIMESTAMPTZ;

COMMENT ON COLUMN contacts.deleted_at      IS 'Soft-delete timestamp.';
COMMENT ON COLUMN contacts.anonymized_at   IS 'Set when personal data is anonymised.';
COMMENT ON COLUMN contacts.retention_until IS 'Absolute retention deadline.';

-- ── Partial indexes for purge job efficiency ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_retention_due
  ON clients (retention_until)
  WHERE retention_until IS NOT NULL AND anonymized_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_retention_due
  ON sessions (retention_until)
  WHERE retention_until IS NOT NULL AND anonymized_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reports_retention_due
  ON reports (retention_until)
  WHERE retention_until IS NOT NULL AND anonymized_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_retention_due
  ON contacts (retention_until)
  WHERE retention_until IS NOT NULL AND anonymized_at IS NULL;
