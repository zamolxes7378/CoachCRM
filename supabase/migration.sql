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

-- 7. Client Links (parrainage client↔client, parrainage-pro, dossier)
CREATE TABLE client_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  linked_client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  linked_professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('parrainage', 'parrainage-pro', 'dossier')),
  role TEXT CHECK (role IN ('parrain', 'filleul')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Professional Referrals (recommandations pro → clients)
CREATE TABLE professional_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_name TEXT,
  date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

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
CREATE INDEX idx_client_links_client_id ON client_links(client_id);
CREATE INDEX idx_client_links_linked_client_id ON client_links(linked_client_id);
CREATE INDEX idx_client_links_linked_professional_id ON client_links(linked_professional_id);
CREATE INDEX idx_professional_referrals_professional_id ON professional_referrals(professional_id);
CREATE INDEX idx_professional_referrals_client_id ON professional_referrals(client_id);

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
ALTER TABLE client_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_referrals ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own data
CREATE POLICY "Users can view own clients" ON clients FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own sessions" ON sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own contacts" ON contacts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own reports" ON reports FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
CREATE POLICY "Users can view own settings" ON settings FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own professionals" ON professionals FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own client_links" ON client_links FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
CREATE POLICY "Users can view own professional_referrals" ON professional_referrals FOR ALL USING (professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));
