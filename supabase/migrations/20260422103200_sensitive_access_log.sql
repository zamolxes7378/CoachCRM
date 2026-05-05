-- =============================================================================
-- 20260422103200_sensitive_access_log.sql
-- access_log table — Art. 9 sensitive data access audit trail.
--
-- Purpose: record every read of sensitive columns (reports.narrative,
--   clients.notes, clients.ai_synthesis, sessions.summary, sessions.audio_file)
--   to satisfy RGPD Art. 9 accountability obligations.
--
-- RLS:
--   INSERT: service_role only (application wrappers emit via elevated role)
--   SELECT: admin role only (via is_admin() helper from existing migrations)
--   UPDATE/DELETE: prohibited
--
-- Retention: 6 months (audit regime) — purge integrated into purge_expired_data().
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS access_log;
--   Remove the access_log section from purge_expired_data() (see below).
--   Remove the retention_policies row for access_log/audit.
--
-- Idempotent: uses CREATE TABLE IF NOT EXISTS; INSERT ON CONFLICT DO NOTHING;
--   CREATE OR REPLACE for purge function extension.
--
-- Findings closed: G-10 (no access audit trail for sensitive reads)
-- Track: P1-Z
-- =============================================================================

CREATE TABLE IF NOT EXISTS access_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  entity      TEXT        NOT NULL,            -- e.g. 'report', 'client', 'session', 'audio'
  entity_id   UUID        NOT NULL,            -- PK of the accessed row
  action      TEXT        NOT NULL,            -- e.g. 'read_report', 'read_notes', 'read_audio'
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address  INET,                            -- caller IP (populated by edge function if available)
  user_agent  TEXT                             -- caller UA (populated by edge function if available)
);

COMMENT ON TABLE access_log IS
  'Art. 9 sensitive-data access audit log. '
  'INSERT: service_role only. SELECT: admin only. No UPDATE/DELETE. '
  '6-month retention via purge_expired_data(). Finding G-10.';

-- Indexes
CREATE INDEX IF NOT EXISTS access_log_entity_entity_id_idx
  ON access_log (entity, entity_id);

CREATE INDEX IF NOT EXISTS access_log_user_accessed_idx
  ON access_log (user_id, accessed_at);

CREATE INDEX IF NOT EXISTS access_log_accessed_at_idx
  ON access_log (accessed_at);

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE access_log ENABLE ROW LEVEL SECURITY;

-- INSERT: service_role only
-- service_role bypasses RLS by default in Supabase — this policy documents intent
-- and blocks authenticated/anon from inserting directly.
DROP POLICY IF EXISTS "access_log_insert_service_role" ON access_log;
CREATE POLICY "access_log_insert_service_role"
  ON access_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- SELECT: admin role only (reuses is_admin() if defined; otherwise falls back to role check)
DROP POLICY IF EXISTS "access_log_select_admin" ON access_log;
CREATE POLICY "access_log_select_admin"
  ON access_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- UPDATE: prohibited — no policy means no access
-- DELETE: prohibited — no policy means no access

-- =============================================================================
-- Retention policy row
-- =============================================================================
INSERT INTO retention_policies (entity, regime, retention_months, legal_basis, notes)
VALUES (
  'access_log',
  'audit',
  6,
  'RGPD Art.32',
  'Journal d''accès aux données Art. 9 — conservation 6 mois. Purge automatique via purge_expired_data().'
)
ON CONFLICT (entity, regime) DO NOTHING;

-- =============================================================================
-- Extend purge_expired_data() to cover access_log (6-month hard delete)
--
-- We replace the entire function to add the access_log block.
-- The original body is reproduced verbatim from 20260422101200_purge_job.sql
-- with the access_log section appended.
-- =============================================================================
CREATE OR REPLACE FUNCTION purge_expired_data(dry_run boolean DEFAULT false)
RETURNS TABLE (entity text, rows_affected bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now         TIMESTAMPTZ := now();
  v_clients     BIGINT;
  v_sessions    BIGINT;
  v_reports     BIGINT;
  v_contacts    BIGINT;
  v_access_log  BIGINT;
BEGIN
  -- ── clients ────────────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_clients
  FROM clients
  WHERE retention_until IS NOT NULL
    AND retention_until < v_now
    AND anonymized_at IS NULL;

  IF NOT dry_run AND v_clients > 0 THEN
    UPDATE clients
    SET
      partner_a            = jsonb_build_object(
                               'firstName', 'ANONYMISÉ',
                               'lastName',  'ANONYMISÉ',
                               'email',     NULL,
                               'phone',     NULL
                             ),
      partner_b            = CASE
                               WHEN partner_b IS NOT NULL
                               THEN jsonb_build_object(
                                      'firstName', 'ANONYMISÉ',
                                      'lastName',  'ANONYMISÉ',
                                      'email',     NULL,
                                      'phone',     NULL
                                    )
                               ELSE NULL
                             END,
      notes                = NULL,
      note_dynamique       = NULL,
      note_axes            = NULL,
      note_vigilance       = NULL,
      note_objectifs       = NULL,
      billing_address      = NULL,
      external_referrer    = NULL,
      ai_synthesis         = NULL,
      anonymized_at        = v_now
    WHERE retention_until IS NOT NULL
      AND retention_until < v_now
      AND anonymized_at IS NULL;
  END IF;

  entity := 'clients'; rows_affected := v_clients; RETURN NEXT;

  -- ── sessions ───────────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_sessions
  FROM sessions
  WHERE retention_until IS NOT NULL
    AND retention_until < v_now
    AND anonymized_at IS NULL;

  IF NOT dry_run AND v_sessions > 0 THEN
    UPDATE sessions
    SET
      summary      = NULL,
      title        = NULL,
      anonymized_at = v_now
    WHERE retention_until IS NOT NULL
      AND retention_until < v_now
      AND anonymized_at IS NULL;
  END IF;

  entity := 'sessions'; rows_affected := v_sessions; RETURN NEXT;

  -- ── reports ────────────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_reports
  FROM reports
  WHERE retention_until IS NOT NULL
    AND retention_until < v_now
    AND anonymized_at IS NULL;

  IF NOT dry_run AND v_reports > 0 THEN
    UPDATE reports
    SET
      narrative          = NULL,
      client_name        = 'ANONYMISÉ',
      themes             = '[]'::jsonb,
      emotions_a         = '[]'::jsonb,
      emotions_b         = '[]'::jsonb,
      patterns           = '[]'::jsonb,
      progress           = '[]'::jsonb,
      vigilance          = NULL,
      exercises          = '[]'::jsonb,
      pedagogical_content = '[]'::jsonb,
      anonymized_at      = v_now
    WHERE retention_until IS NOT NULL
      AND retention_until < v_now
      AND anonymized_at IS NULL;
  END IF;

  entity := 'reports'; rows_affected := v_reports; RETURN NEXT;

  -- ── contacts ───────────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_contacts
  FROM contacts
  WHERE retention_until IS NOT NULL
    AND retention_until < v_now
    AND anonymized_at IS NULL;

  IF NOT dry_run AND v_contacts > 0 THEN
    UPDATE contacts
    SET
      note         = NULL,
      anonymized_at = v_now
    WHERE retention_until IS NOT NULL
      AND retention_until < v_now
      AND anonymized_at IS NULL;
  END IF;

  entity := 'contacts'; rows_affected := v_contacts; RETURN NEXT;

  -- ── access_log ─────────────────────────────────────────────────────────────
  -- Hard delete: audit logs older than 6 months are deleted (not anonymised).
  SELECT COUNT(*) INTO v_access_log
  FROM access_log
  WHERE accessed_at < (v_now - INTERVAL '6 months');

  IF NOT dry_run AND v_access_log > 0 THEN
    DELETE FROM access_log
    WHERE accessed_at < (v_now - INTERVAL '6 months');
  END IF;

  entity := 'access_log'; rows_affected := v_access_log; RETURN NEXT;

END;
$$;

COMMENT ON FUNCTION purge_expired_data(boolean) IS
  'Monthly data purge. Call with dry_run => true to preview counts. '
  'Scheduled via pg_cron (see 20260422101200_purge_job.sql). '
  'Covers: clients, sessions, reports, contacts, access_log. '
  'Findings: G-09, G-10.';

-- Restore grants (CREATE OR REPLACE clears them)
REVOKE ALL ON FUNCTION purge_expired_data(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_expired_data(boolean) TO authenticated;
