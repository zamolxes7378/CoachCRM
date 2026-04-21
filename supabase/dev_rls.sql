-- ============================================
-- Dev RLS — SECURE MODE (Defense in Depth)
-- ============================================

-- Drop insecure dev policies if they exist
DROP POLICY IF EXISTS "Dev: public access" ON clients;
DROP POLICY IF EXISTS "Dev: public access" ON sessions;
DROP POLICY IF EXISTS "Dev: public access" ON contacts;
DROP POLICY IF EXISTS "Dev: public access" ON reports;
DROP POLICY IF EXISTS "Dev: public access" ON settings;
DROP POLICY IF EXISTS "Dev: public access" ON users;

-- Enable RLS on all tables (safe to re-run)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Apply Secure Policies (users can only access their own data)
CREATE POLICY "Users can view own clients" ON clients FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own sessions" ON sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own contacts" ON contacts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own reports" ON reports FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
CREATE POLICY "Users can view own settings" ON settings FOR ALL USING (user_id = auth.uid());

