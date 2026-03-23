-- ============================================
-- Dev RLS — Corrected (handles existing objects)
-- ============================================

-- Drop strict policies (ignore if not found)
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
DROP POLICY IF EXISTS "Users can view own settings" ON settings;
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

-- Allow all operations (temporary dev mode)
CREATE POLICY "Dev: public access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev: public access" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev: public access" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev: public access" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev: public access" ON reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev: public access" ON settings FOR ALL USING (true) WITH CHECK (true);
