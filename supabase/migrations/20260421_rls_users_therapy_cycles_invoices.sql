-- ============================================================
-- 20260421_rls_users_therapy_cycles_invoices.sql
--
-- Adds RLS policies for the four tables that had none in VCS:
--   users, therapy_cycles, invoices, invoice_sessions
--
-- users policy design:
--   - Any authenticated user can SELECT their own row.
--   - Only admins (role = 'admin') can SELECT all rows.
--     Admin listing goes through get_admin_user_list() RPC
--     (added in 20260421_admin_rpc.sql), but we also allow
--     direct SELECT for the own-row case so upsertUser works.
--   - INSERT / UPDATE allowed only for the user's own row
--     (Supabase auth.uid() == id) — the upsertUser path in
--     App.jsx relies on this.
--   - DELETE blocked for all authenticated users (admin ops
--     go through the service role or a future admin RPC).
--
-- therapy_cycles: own rows via user_id = auth.uid()
-- invoices:       own rows via user_id = auth.uid()
-- invoice_sessions: own via parent invoice belonging to caller
--
-- Findings closed: C-2, C-3, S-05 (partial)
-- ============================================================

-- ==== users =================================================
-- RLS was enabled in dev_rls.sql but no policy existed in VCS.
-- Ensure it is on (safe to repeat):
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop any previously authored variants so this is idempotent.
-- Live names verified 2026-04-21 — these three were created via
-- Supabase Studio and have no VCS counterpart. They must go so
-- the new named set below becomes the sole source of truth.
DROP POLICY IF EXISTS "Users can read own profile"   ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
-- New-set drops (idempotent on re-run):
DROP POLICY IF EXISTS "users_select_own"        ON users;
DROP POLICY IF EXISTS "users_select_admin_list" ON users;
DROP POLICY IF EXISTS "users_insert_own"        ON users;
DROP POLICY IF EXISTS "users_update_own"        ON users;
DROP POLICY IF EXISTS "users_delete_deny"       ON users;

-- Any authenticated user can read their own row.
CREATE POLICY "users_select_own"
  ON users
  FOR SELECT
  USING (id = auth.uid());

-- Admins can read all rows (needed by AdminPage until Track B
-- migrates it to the get_admin_user_list() RPC).
CREATE POLICY "users_select_admin_list"
  ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS me
      WHERE me.id = auth.uid()
        AND me.role = 'admin'
    )
  );

-- INSERT: only for the caller's own UUID (supports upsertUser).
CREATE POLICY "users_insert_own"
  ON users
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- UPDATE: only own row.
CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DELETE: blocked for all authenticated clients.
-- (Hard deletes require service role or admin RPC.)
CREATE POLICY "users_delete_deny"
  ON users
  FOR DELETE
  USING (false);

-- ==== therapy_cycles ========================================
ALTER TABLE therapy_cycles ENABLE ROW LEVEL SECURITY;

-- Live Studio-authored policy (verified 2026-04-21) — drop first:
DROP POLICY IF EXISTS "Users can manage their own therapy cycles" ON therapy_cycles;
-- New-set drops (idempotent on re-run):
DROP POLICY IF EXISTS "therapy_cycles_select" ON therapy_cycles;
DROP POLICY IF EXISTS "therapy_cycles_insert" ON therapy_cycles;
DROP POLICY IF EXISTS "therapy_cycles_update" ON therapy_cycles;
DROP POLICY IF EXISTS "therapy_cycles_delete" ON therapy_cycles;

CREATE POLICY "therapy_cycles_select"
  ON therapy_cycles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "therapy_cycles_insert"
  ON therapy_cycles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "therapy_cycles_update"
  ON therapy_cycles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "therapy_cycles_delete"
  ON therapy_cycles
  FOR DELETE
  USING (user_id = auth.uid());

-- ==== invoices ==============================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Live Studio-authored policy (verified 2026-04-21) — drop first:
DROP POLICY IF EXISTS "Users manage own invoices" ON invoices;
-- New-set drops (idempotent on re-run):
DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_update" ON invoices;
DROP POLICY IF EXISTS "invoices_delete" ON invoices;

CREATE POLICY "invoices_select"
  ON invoices
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "invoices_insert"
  ON invoices
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "invoices_update"
  ON invoices
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "invoices_delete"
  ON invoices
  FOR DELETE
  USING (user_id = auth.uid());

-- ==== invoice_sessions ======================================
-- This join table has no user_id column; isolation is enforced
-- via the parent invoices row.
ALTER TABLE invoice_sessions ENABLE ROW LEVEL SECURITY;

-- Live Studio-authored policy (verified 2026-04-21) — drop first:
DROP POLICY IF EXISTS "Users manage own invoice_sessions" ON invoice_sessions;
-- New-set drops (idempotent on re-run):
DROP POLICY IF EXISTS "invoice_sessions_select" ON invoice_sessions;
DROP POLICY IF EXISTS "invoice_sessions_insert" ON invoice_sessions;
DROP POLICY IF EXISTS "invoice_sessions_delete" ON invoice_sessions;

CREATE POLICY "invoice_sessions_select"
  ON invoice_sessions
  FOR SELECT
  USING (
    invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
  );

CREATE POLICY "invoice_sessions_insert"
  ON invoice_sessions
  FOR INSERT
  WITH CHECK (
    invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
  );

-- UPDATE is not used by the app (rows are deleted + re-inserted),
-- but we add a safe guard anyway.
DROP POLICY IF EXISTS "invoice_sessions_update" ON invoice_sessions;
CREATE POLICY "invoice_sessions_update"
  ON invoice_sessions
  FOR UPDATE
  USING (
    invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
  )
  WITH CHECK (
    invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
  );

CREATE POLICY "invoice_sessions_delete"
  ON invoice_sessions
  FOR DELETE
  USING (
    invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
  );
