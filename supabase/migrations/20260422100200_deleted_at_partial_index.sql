-- ============================================================
-- 20260422100200_deleted_at_partial_index.sql
--
-- Partial index for soft-deleted clients (P1-X).
--
-- idx_clients_active was already created by Phase-0 Track C in:
--   supabase/migrations/20260421_composite_indexes.sql
--
-- Re-stated here with IF NOT EXISTS for documentation and
-- idempotency — applying this file to any DB state is safe.
--
-- sessions and reports do not have a deleted_at column;
-- they filter soft-deleted clients via JOIN/inner on clients
-- (see dataService.js lines 86-88, 150-151), so no additional
-- partial index is needed on those tables.
--
-- Findings closed: P-05 (deleted_at partial index — confirmed
-- covered by Phase-0 Track C; this migration ratifies it).
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_clients_active
  ON clients (user_id)
  WHERE deleted_at IS NULL;
