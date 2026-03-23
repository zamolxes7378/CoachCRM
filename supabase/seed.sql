-- ============================================
-- CoachCRM — Seed Data
-- Run this in Supabase SQL Editor AFTER dev_rls.sql
-- ============================================

-- 1. Insert the practitioner
INSERT INTO users (id, name, email, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Anne-Chantal Meyer', 'anne-chantal.meyer@gmail.com', 'admin');

-- 2. Insert clients
INSERT INTO clients (id, user_id, type, partner_a, partner_b, phase, source, status, start_date, sessions_count, total_sessions, next_session, last_session, emotional_maturity, emotional_maturity_history, notes, exercises) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'couple',
    '{"firstName":"Sophie","lastName":"Dupont","email":"sophie.d@email.com","phone":"06 12 34 56 78"}',
    '{"firstName":"Thomas","lastName":"Dupont","email":"thomas.d@email.com","phone":"06 98 76 54 32"}',
    'analyse', 'website', 'active', '2025-11-15', 12, 20,
    '2026-03-19T14:00:00', '2026-03-05', 62, '[30,35,38,42,45,48,50,52,55,58,60,62]',
    'Couple marié depuis 8 ans. Problème de communication principal.',
    '[{"id":"e1","title":"Journal des émotions quotidien","status":"completed","dueDate":"2026-03-10"},{"id":"e2","title":"Exercice d''écoute active (15 min/jour)","status":"in-progress","dueDate":"2026-03-20"},{"id":"e3","title":"Lettre de gratitude au partenaire","status":"pending","dueDate":"2026-03-25"}]'),

  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'couple',
    '{"firstName":"Claire","lastName":"Martin","email":"claire.m@email.com","phone":"06 11 22 33 44"}',
    '{"firstName":"Lucas","lastName":"Martin","email":"lucas.m@email.com","phone":"06 55 66 77 88"}',
    'debut', 'phone', 'active', '2026-02-01', 3, 20,
    '2026-03-19T16:00:00', '2026-03-12', 28, '[20,24,28]',
    'En couple depuis 3 ans, pas mariés. Premiers signes de crise.',
    '[{"id":"e4","title":"Identifier 3 besoins fondamentaux","status":"completed","dueDate":"2026-03-05"}]'),

  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'couple',
    '{"firstName":"Isabelle","lastName":"Rey","email":"isa.r@email.com","phone":"06 99 88 77 66"}',
    '{"firstName":"Marc","lastName":"Rey","email":"marc.r@email.com","phone":"06 44 33 22 11"}',
    'integration', 'referral', 'active', '2025-06-10', 15, 20,
    '2026-03-21T10:00:00', '2026-03-14', 78, '[25,30,35,40,45,50,55,58,62,65,68,70,73,75,78]',
    'Très bonne progression. Phase d''intégration en cours.',
    '[{"id":"e5","title":"Rituel de connexion quotidien","status":"in-progress","dueDate":"2026-03-30"},{"id":"e6","title":"Pratique CNV en situation de conflit","status":"in-progress","dueDate":"2026-04-05"}]'),

  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'couple',
    '{"firstName":"Julie","lastName":"Bernard","email":"julie.b@email.com","phone":"06 10 20 30 40"}',
    '{"firstName":"Pierre","lastName":"Bernard","email":"pierre.b@email.com","phone":"06 50 60 70 80"}',
    'analyse', 'phone', 'active', '2025-09-20', 8, 20,
    '2026-03-22T11:00:00', '2026-03-12', 45, '[22,25,28,32,35,38,42,45]',
    'Enjeux de parentalité et répartition des tâches.',
    '[{"id":"e7","title":"Planning parental équilibré","status":"pending","dueDate":"2026-03-18"}]'),

  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', 'couple',
    '{"firstName":"Émilie","lastName":"Leroy","email":"emilie.l@email.com","phone":"06 11 33 55 77"}',
    '{"firstName":"Nicolas","lastName":"Leroy","email":"nicolas.l@email.com","phone":"06 22 44 66 88"}',
    'debut', 'website', 'inactive', '2026-03-01', 2, 20,
    NULL, '2026-03-10', 22, '[18,22]',
    'Couple en pause depuis le 10 mars. Raison : voyage à l''étranger. Reprise prévue en avril.',
    '[]'),

  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000001', 'individual',
    '{"firstName":"Claudia","lastName":"Pavel","email":"claudia.p@email.com","phone":"06 77 88 99 00"}',
    NULL,
    'completed', 'referral', 'completed', '2025-07-20', 16, 20,
    '2026-03-19T21:00:00', '2026-03-17', 82, '[28,32,38,42,48,52,56,60,63,66,70,73,75,78,80,82]',
    'Thérapie terminée avec succès. Excellente progression.',
    '[{"id":"e8","title":"Méditation guidée (10 min/jour)","status":"in-progress","dueDate":"2026-04-01"},{"id":"e9","title":"Bilan hebdomadaire en autonomie","status":"in-progress","dueDate":"2026-04-10"}]');

-- 3. Insert sessions (sample — first 10)
INSERT INTO sessions (id, client_id, user_id, date, duration, phase, status, title, summary, payment_method, payment_received, needs_invoice, invoice_sent, audio_file, has_report) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001',
    '2026-03-19T14:00:00', 75, 'analyse', 'completed', 'Séance #13 — Communication non violente', NULL, 'cheque', false, false, false, NULL, false),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001',
    '2026-03-05T14:00:00', 90, 'analyse', 'completed', 'Séance #12 — Patterns d''évitement', 'Évitement conflits', 'cheque', true, true, false, 'session_12.m4a', true),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001',
    '2026-02-19T14:00:00', 80, 'analyse', 'completed', 'Séance #11 — Gestion de la colère', 'Colère et triggers', 'virement', true, false, false, 'session_11.m4a', true),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001',
    '2026-03-19T16:00:00', 60, 'debut', 'completed', 'Séance #4 — Besoins fondamentaux', NULL, 'especes', true, false, false, NULL, false),
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001',
    '2026-03-14T10:00:00', 70, 'integration', 'completed', 'Séance #15 — Bilan de mi-parcours', 'Bilan mi-parcours', 'especes', true, false, false, 'session_15.m4a', true),
  ('00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001',
    '2026-03-12T11:00:00', 85, 'analyse', 'completed', 'Séance #8 — Parentalité et équilibre', 'Charge parentale', 'virement', false, true, false, 'session_8.m4a', true),
  ('00000000-0000-0000-0000-000000000207', '00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000001',
    '2026-03-19T21:00:00', 60, 'integration', 'completed', 'Séance #17 — Autonomie et bilan', NULL, 'cheque', true, false, false, NULL, false),
  ('00000000-0000-0000-0000-000000000208', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001',
    '2026-03-26T14:00:00', 75, 'analyse', 'scheduled', 'Séance #14 — Bilan analyse', NULL, NULL, false, false, false, NULL, false),
  ('00000000-0000-0000-0000-000000000209', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001',
    '2026-03-28T16:00:00', 60, 'debut', 'scheduled', 'Séance #5 — Expression des besoins', NULL, NULL, false, false, false, NULL, false),
  ('00000000-0000-0000-0000-000000000210', '00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000001',
    '2026-04-02T21:00:00', 60, 'integration', 'scheduled', 'Séance #18 — Clôture de suivi', NULL, NULL, false, false, false, NULL, false);

-- 4. Insert settings
INSERT INTO settings (user_id, session_rates, recruitment_sources, therapy_config) VALUES
  ('00000000-0000-0000-0000-000000000001',
   '{"couple": 75, "individual": 60}',
   '["Site web", "Téléphone", "Parrainage", "Email", "Réseaux sociaux"]',
   '{"totalSessions": 20}');
