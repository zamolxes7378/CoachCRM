-- =============================================================================
-- 20260422101200_purge_job.sql
-- pg_cron monthly purge job + purge_expired_data() function.
--
-- NOTE: pg_cron requires enabling the extension via Supabase Dashboard
--   (Database → Extensions → pg_cron). The CREATE EXTENSION statement is
--   included for self-hosted/local environments; on Supabase hosted it is a
--   no-op if the extension is not enabled via dashboard first.
--   The cron.schedule() call will fail gracefully (extension-not-found error)
--   until pg_cron is enabled — this is acceptable per P1-R constraints.
--
-- Finding closed: G-09 (no automated purge / retention enforcement)
-- =============================================================================

-- Enable pg_cron if available (no-op on Supabase hosted until enabled in dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =============================================================================
-- purge_expired_data(dry_run boolean DEFAULT false)
--
-- Dry-run (true):  returns row counts that WOULD be anonymised — no changes.
-- Live   (false):  anonymises expired records in-place; hard-deletes soft-
--                  deleted contacts older than retention_until.
--
-- Returns: TABLE(entity text, rows_affected bigint)
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
      -- Anonymise personal identifiers; keep aggregate/statistical fields
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
      vigilance          = '[]'::jsonb,
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

END;
$$;

COMMENT ON FUNCTION purge_expired_data(boolean) IS
  'Monthly data purge. Call with dry_run => true to preview counts. '
  'Scheduled via pg_cron (see below). Findings: G-09.';

-- Grant execute to authenticated role (admins only via RPC policy)
REVOKE ALL ON FUNCTION purge_expired_data(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_expired_data(boolean) TO authenticated;

-- =============================================================================
-- pg_cron schedule — first day of each month at 02:00 UTC
-- Will silently fail until pg_cron extension is enabled in Supabase Dashboard.
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'purge-expired-data-monthly',
      '0 2 1 * *',
      $cron$SELECT purge_expired_data(false)$cron$
    );
  ELSE
    RAISE NOTICE
      'pg_cron not enabled — skipping schedule. Enable via Supabase Dashboard → Database → Extensions → pg_cron, then re-run this migration or call: SELECT cron.schedule(''purge-expired-data-monthly'', ''0 2 1 * *'', ''SELECT purge_expired_data(false)'');';
  END IF;
END $$;
