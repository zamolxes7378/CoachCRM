-- =============================================================================
-- 20260422101000_retention_policies.sql
-- Retention policy registry: one row per entity/regime pair.
-- Finding closed: R-03 (no documented retention schedule)
-- =============================================================================

CREATE TABLE IF NOT EXISTS retention_policies (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity          TEXT NOT NULL,        -- table name or logical category
  regime          TEXT NOT NULL,        -- 'health_data' | 'accounting' | 'contact' | etc.
  retention_months INTEGER NOT NULL,   -- 0 = delete on erasure request
  legal_basis     TEXT,                 -- e.g. 'RGPD Art.6(1)(b)', 'LPF Art. L102B'
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity, regime)
);

COMMENT ON TABLE retention_policies IS
  'Canonical retention schedule — one row per entity/regime. '
  'Matches docs/retention_policy.md. Update both together.';

-- Seed rows (12 categories per policy matrix)
INSERT INTO retention_policies (entity, regime, retention_months, legal_basis, notes)
VALUES
  -- Clients / dossiers patients
  ('clients',   'active_follow_up',   0,   'RGPD Art.6(1)(b)',
   'Données conservées pendant la durée du suivi actif'),
  ('clients',   'post_therapy',       60,  'RGPD Art.17 + recommandation CNIL santé',
   '5 ans après la fin du suivi (inactive/completed)'),
  ('clients',   'erasure_request',    0,   'RGPD Art.17',
   'Anonymisation immédiate sur demande DSAR effacement'),

  -- Sessions
  ('sessions',  'post_therapy',       60,  'RGPD Art.6(1)(b)',
   'Aligné sur le dossier client parent'),
  ('sessions',  'erasure_request',    0,   'RGPD Art.17',
   'Anonymisation immédiate sur demande DSAR effacement'),

  -- Reports (comptes-rendus)
  ('reports',   'post_therapy',       60,  'RGPD Art.6(1)(b)',
   'Aligné sur le dossier client parent'),
  ('reports',   'erasure_request',    0,   'RGPD Art.17',
   'Anonymisation immédiate sur demande DSAR effacement'),

  -- Contacts (appels, emails)
  ('contacts',  'general',            36,  'RGPD Art.6(1)(f)',
   '3 ans — intérêt légitime suivi commercial/thérapeutique'),
  ('contacts',  'erasure_request',    0,   'RGPD Art.17',
   'Suppression immédiate sur demande DSAR effacement'),

  -- Invoices / billing reminders
  ('invoices',  'accounting',         84,  'Code général des impôts Art.54',
   '7 ans — obligation comptable française'),

  -- Audit log
  ('audit_log', 'security',           12,  'RGPD Art.32',
   '12 mois — traçabilité sécurité'),

  -- DSAR requests
  ('dsar_requests', 'legal_record',   36,  'RGPD Art.12(1)',
   '3 ans — preuve de conformité DSAR')

ON CONFLICT (entity, regime) DO UPDATE
  SET retention_months = EXCLUDED.retention_months,
      legal_basis      = EXCLUDED.legal_basis,
      notes            = EXCLUDED.notes;
