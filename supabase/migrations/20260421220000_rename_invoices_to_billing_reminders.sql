-- Rename invoices → billing_reminders and invoice_sessions → billing_reminder_sessions
-- This is an honest rename: these records are payment reminders, not legally compliant invoices.
-- Full Factur-X / PDP compliance is planned for Phase 2 (Q3 2026).
--
-- Confirmed schema (from baseline_schema.sql + live DB verification 2026-04-21):
--   invoices: id, user_id, client_id, invoice_date, sent, sent_at, created_at
--   invoice_sessions: invoice_id, session_id (composite PK + UNIQUE on session_id)
--
-- DO NOT apply to the live DB — migration file only (Phase 2 decision point pending).

ALTER TABLE IF EXISTS invoices RENAME TO billing_reminders;
ALTER TABLE IF EXISTS invoice_sessions RENAME TO billing_reminder_sessions;

-- Update FK column names for clarity (invoice_id → billing_reminder_id)
ALTER TABLE IF EXISTS billing_reminder_sessions
  RENAME COLUMN invoice_id TO billing_reminder_id;

-- Sequences and indexes are renamed automatically by PostgreSQL on table rename.
-- The FK constraint on billing_reminder_sessions referencing billing_reminders
-- is also updated automatically by PostgreSQL on table rename.

-- Rename indexes to match new table names (cosmetic — does not affect behaviour)
ALTER INDEX IF EXISTS idx_invoices_user_id         RENAME TO idx_billing_reminders_user_id;
ALTER INDEX IF EXISTS idx_invoices_client_id       RENAME TO idx_billing_reminders_client_id;
ALTER INDEX IF EXISTS idx_invoice_sessions_invoice_id  RENAME TO idx_billing_reminder_sessions_billing_reminder_id;
ALTER INDEX IF EXISTS idx_invoice_sessions_session_id  RENAME TO idx_billing_reminder_sessions_session_id;
