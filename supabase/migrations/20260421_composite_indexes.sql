-- ============================================================
-- 20260421_composite_indexes.sql
--
-- Adds 3 composite / targeted indexes that cover the hottest
-- query shapes identified in the performance audit (P-05).
--
-- idx_reports_client_id dropped: already present on live DB
--   (confirmed §3.4 live_db_verification_2026-04-21.md).
-- idx_invoice_sessions_invoice dropped: covered by
--   invoice_sessions (invoice_id, session_id) PK left-prefix.
-- idx_clients_active folded in from deleted_at_index.sql per
--   plan §2 Track C composite_indexes bullet (⚠ live-verified).
--
-- All use CREATE INDEX IF NOT EXISTS so this file is idempotent.
-- Findings closed: P-05, H-6 (partial), L-5
-- ============================================================

-- sessions queried by user, ordered most-recent-first
-- (getSessions, getReports inner join)
CREATE INDEX IF NOT EXISTS idx_sessions_user_date
  ON sessions (user_id, date DESC);

-- sessions queried by client, ordered most-recent-first
-- (getSessionsByClient)
CREATE INDEX IF NOT EXISTS idx_sessions_client_date
  ON sessions (client_id, date DESC);

-- clients filtered to non-deleted rows for current user
-- (getClients — Track F adds .is('deleted_at', null) server-side;
--  this index makes it efficient and closes the promise in
--  MON_ARCHITECTURE_DONNEES.md §278)
CREATE INDEX IF NOT EXISTS idx_clients_active
  ON clients (user_id)
  WHERE deleted_at IS NULL;
