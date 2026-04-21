-- ============================================================
-- 20260421_tighten_rls_with_check.sql
--
-- Adds explicit WITH CHECK clauses to every existing FOR ALL
-- policy on: clients, sessions, contacts, reports, settings,
-- professionals.
--
-- Note: client_links and professional_referrals tables are
-- declared in supabase/migration.sql but DO NOT EXIST in the
-- live DB (verified 2026-04-21 via live_db_verification pack).
-- They are skipped here — DROP POLICY on a nonexistent table
-- errors in Postgres. If those tables are ever created later,
-- they should get their own tightening migration.
--
-- Approach: DROP + CREATE (idempotent on re-run).
--
-- Findings closed: G-07, H-4 (partial)
-- ============================================================

-- Each table below has TWO live permissive policies that behave
-- identically (one with explicit WITH CHECK, one where Postgres
-- auto-fills from USING). Drop both and recreate a single
-- consolidated policy.
-- Live names confirmed 2026-04-21 via pg_policies introspection.

-- ---- clients -----------------------------------------------
DROP POLICY IF EXISTS "Users can manage own clients" ON clients;
DROP POLICY IF EXISTS "Users can view own clients"   ON clients;
CREATE POLICY "Users can manage own clients"
  ON clients
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- sessions ----------------------------------------------
DROP POLICY IF EXISTS "Users can manage own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view own sessions"   ON sessions;
CREATE POLICY "Users can manage own sessions"
  ON sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- contacts ----------------------------------------------
DROP POLICY IF EXISTS "Users can manage own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can view own contacts"   ON contacts;
CREATE POLICY "Users can manage own contacts"
  ON contacts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- settings ----------------------------------------------
DROP POLICY IF EXISTS "Users can manage own settings" ON settings;
DROP POLICY IF EXISTS "Users can view own settings"   ON settings;
CREATE POLICY "Users can manage own settings"
  ON settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- professionals -----------------------------------------
DROP POLICY IF EXISTS "Users can manage own professionals" ON professionals;
DROP POLICY IF EXISTS "Users can view own professionals"   ON professionals;
CREATE POLICY "Users can manage own professionals"
  ON professionals
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- reports -----------------------------------------------
-- Split FOR ALL into separate SELECT and INSERT/UPDATE/DELETE
-- policies so that INSERT forgery (H-4) is blocked: the WITH
-- CHECK on INSERT/UPDATE validates BOTH client_id AND session_id
-- belong to the caller.
DROP POLICY IF EXISTS "Users can manage own reports" ON reports;
DROP POLICY IF EXISTS "Users can view own reports"   ON reports;

CREATE POLICY "reports_select"
  ON reports
  FOR SELECT
  USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "reports_insert"
  ON reports
  FOR INSERT
  WITH CHECK (
    client_id  IN (SELECT id FROM clients  WHERE user_id = auth.uid())
    AND session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "reports_update"
  ON reports
  FOR UPDATE
  USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  )
  WITH CHECK (
    client_id  IN (SELECT id FROM clients  WHERE user_id = auth.uid())
    AND session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "reports_delete"
  ON reports
  FOR DELETE
  USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- NOTE: client_links and professional_referrals tables are not in
-- the live DB (verified 2026-04-21). Skipping — see header comment.
