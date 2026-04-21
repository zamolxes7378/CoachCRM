-- ============================================================
-- 20260421_tighten_rls_with_check.sql
--
-- Adds explicit WITH CHECK clauses to every existing FOR ALL
-- policy on: clients, sessions, contacts, reports, settings,
-- professionals, client_links, professional_referrals.
--
-- Approach: DROP + CREATE (idempotent on re-run).
--
-- Findings closed: G-07, H-4 (partial)
-- ============================================================

-- ---- clients -----------------------------------------------
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
CREATE POLICY "Users can view own clients"
  ON clients
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- sessions ----------------------------------------------
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
CREATE POLICY "Users can view own sessions"
  ON sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- contacts ----------------------------------------------
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
CREATE POLICY "Users can view own contacts"
  ON contacts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- settings ----------------------------------------------
DROP POLICY IF EXISTS "Users can view own settings" ON settings;
CREATE POLICY "Users can view own settings"
  ON settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- professionals -----------------------------------------
DROP POLICY IF EXISTS "Users can view own professionals" ON professionals;
CREATE POLICY "Users can view own professionals"
  ON professionals
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- reports -----------------------------------------------
-- Split FOR ALL into separate SELECT and INSERT/UPDATE/DELETE
-- policies so that INSERT forgery (H-4) is blocked: the WITH
-- CHECK on INSERT/UPDATE validates BOTH client_id AND session_id
-- belong to the caller.
DROP POLICY IF EXISTS "Users can view own reports" ON reports;

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

-- ---- client_links ------------------------------------------
-- Table is currently dead (app uses clients.client_links JSONB),
-- but we harden it anyway so it is safe if ever activated.
DROP POLICY IF EXISTS "Users can view own client_links" ON client_links;
CREATE POLICY "Users can view own client_links"
  ON client_links
  FOR ALL
  USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  )
  WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- ---- professional_referrals --------------------------------
-- Also dead (data lives in clients.client_links JSONB), but
-- hardened for the same reason.
DROP POLICY IF EXISTS "Users can view own professional_referrals" ON professional_referrals;
CREATE POLICY "Users can view own professional_referrals"
  ON professional_referrals
  FOR ALL
  USING (
    professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid())
  );
