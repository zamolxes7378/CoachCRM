-- ============================================================
-- 20260421_deleted_at_index.sql
--
-- Partial index on clients(user_id) WHERE deleted_at IS NULL.
--
-- Once Track F adds .is('deleted_at', null) to getClients(),
-- every client-list query will hit this index instead of
-- scanning all rows including soft-deleted ones.
--
-- The team's own architecture doc (MON_ARCHITECTURE_DONNEES.md
-- §278) promised this index but it was never committed.
--
-- Findings closed: H-6 (partial — Track F adds the server-side
-- filter; this index makes it efficient), L-5
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_clients_active
  ON clients (user_id)
  WHERE deleted_at IS NULL;
