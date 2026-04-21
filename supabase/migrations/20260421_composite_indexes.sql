-- ============================================================
-- 20260421_composite_indexes.sql
--
-- Adds 5 composite / targeted indexes that cover the hottest
-- query shapes identified in the performance audit (P-05).
--
-- All use CREATE INDEX IF NOT EXISTS so this file is idempotent.
-- Findings closed: P-05
-- ============================================================

-- sessions queried by user, ordered most-recent-first
-- (getSessions, getReports inner join)
CREATE INDEX IF NOT EXISTS idx_sessions_user_date
  ON sessions (user_id, date DESC);

-- sessions queried by client, ordered most-recent-first
-- (getSessionsByClient)
CREATE INDEX IF NOT EXISTS idx_sessions_client_date
  ON sessions (client_id, date DESC);

-- reports filtered by client
-- (getReports via client_id + the new Track-F rewrite that
--  replaces the sessions!inner join)
CREATE INDEX IF NOT EXISTS idx_reports_client_id
  ON reports (client_id);

-- contacts queried by user, ordered most-recent-first
-- (getContacts)
CREATE INDEX IF NOT EXISTS idx_contacts_user_date
  ON contacts (user_id, date DESC);

-- invoice_sessions join lookups (invoice_id → session_ids)
-- used by getInvoices / getInvoicesByClient select expansion
CREATE INDEX IF NOT EXISTS idx_invoice_sessions_invoice
  ON invoice_sessions (invoice_id);
