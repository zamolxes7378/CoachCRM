-- ============================================
-- CoachCRM — Supabase Schema Migration
-- ============================================

-- 1. Users (praticiens)
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'therapist' CHECK (role IN ('admin', 'therapist')),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Clients (couples ou individuels)
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'couple' CHECK (type IN ('client', 'individual', 'family', 'couple')),
  partner_a JSONB NOT NULL,
  partner_b JSONB,
  phase TEXT DEFAULT 'debut',
  source TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  start_date DATE,
  sessions_count INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 20,
  next_session TIMESTAMPTZ,
  last_session TIMESTAMPTZ,
  emotional_maturity INTEGER DEFAULT 0,
  emotional_maturity_history JSONB DEFAULT '[]',
  notes TEXT,
  exercises JSONB DEFAULT '[]',
  prospect_stage TEXT,
  referred_by UUID REFERENCES clients(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Sessions (séances)
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  duration INTEGER DEFAULT 60,
  phase TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  title TEXT,
  summary TEXT,
  audio_file TEXT,
  has_report BOOLEAN DEFAULT false,
  payment_method TEXT,
  payment_received BOOLEAN DEFAULT false,
  payment_status TEXT,
  payment_amount NUMERIC(10,2),
  needs_invoice BOOLEAN DEFAULT false,
  invoice_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Reports (comptes-rendus)
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  couple_name TEXT,
  session_number INTEGER,
  date DATE,
  phase TEXT,
  duration TEXT,
  narrative TEXT,
  themes JSONB DEFAULT '[]',
  emotions_a JSONB DEFAULT '[]',
  emotions_b JSONB DEFAULT '[]',
  patterns JSONB DEFAULT '[]',
  progress JSONB DEFAULT '[]',
  vigilance JSONB DEFAULT '[]',
  exercises JSONB DEFAULT '[]',
  pedagogical_content JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Contacts (appels, emails, SMS)
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('phone', 'email', 'sms', 'social', 'web', 'parrainage')),
  date TIMESTAMPTZ NOT NULL,
  note TEXT,
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Professionals (réseau professionnel — recommandations)
CREATE TABLE professionals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  specialty TEXT,
  address TEXT,
  website TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. client_links — RETIRED (never existed in live DB)
--    Equivalent data lives in clients.client_links JSONB column.
--    See supabase/migrations/20260422100500_retire_dead_tables.sql.

-- 8. professional_referrals — RETIRED (never existed in live DB)
--    Equivalent data lives in professionals.referrals JSONB column.
--    See supabase/migrations/20260422100500_retire_dead_tables.sql.

-- 9. Settings (paramètres par praticien)
CREATE TABLE settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  session_rates JSONB DEFAULT '{"couple": 75, "individual": 60}',
  recruitment_sources JSONB DEFAULT '["Site web", "Téléphone", "Parrainage", "Email", "Réseaux sociaux"]',
  therapy_config JSONB DEFAULT '{"totalSessions": 20}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_sessions_client_id ON sessions(client_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_contacts_client_id ON contacts(client_id);
CREATE INDEX idx_reports_session_id ON reports(session_id);
CREATE INDEX idx_professionals_user_id ON professionals(user_id);
-- retired: idx_client_links_* and idx_professional_referrals_* removed (tables retired)

-- ============================================
-- Row Level Security (RLS)
-- Each user can only see their own data
-- ============================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
-- retired: client_links and professional_referrals RLS removed (tables retired)

-- Policies: users can only access their own data
CREATE POLICY "Users can view own clients" ON clients FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own sessions" ON sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own contacts" ON contacts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own reports" ON reports FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
CREATE POLICY "Users can view own settings" ON settings FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own professionals" ON professionals FOR ALL USING (user_id = auth.uid());
-- retired: client_links and professional_referrals policies removed (tables retired)
