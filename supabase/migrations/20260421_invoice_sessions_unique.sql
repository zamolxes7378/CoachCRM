-- ============================================================
-- 20260421_invoice_sessions_unique.sql
--
-- Adds a UNIQUE constraint on (invoice_id, session_id) to
-- prevent the duplicate-link bug in addSessionToInvoice().
--
-- Without this constraint, calling addSessionToInvoice() twice
-- for the same (invoice, session) pair inserts two rows.
-- DataContext.jsx:119-125 builds invoiceBySessionId as a flat
-- map that silently overwrites on collision, so the duplicate
-- is invisible in the UI but wastes storage and breaks counts.
--
-- The constraint name matches the plan spec so Track D can
-- reference it in the baseline.
--
-- NOTE: if the live DB already has duplicate pairs this ALTER
-- will fail.  Track D must de-duplicate first:
--   DELETE FROM invoice_sessions a USING invoice_sessions b
--   WHERE a.ctid > b.ctid
--     AND a.invoice_id = b.invoice_id
--     AND a.session_id = b.session_id;
-- before applying this migration.
--
-- Findings closed: H-7
-- ============================================================

ALTER TABLE invoice_sessions
  ADD CONSTRAINT invoice_sessions_unique
  UNIQUE (invoice_id, session_id);
