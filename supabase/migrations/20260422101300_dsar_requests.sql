-- =============================================================================
-- 20260422101300_dsar_requests.sql
-- Data Subject Access Request (DSAR) intake table + admin-only RLS.
-- Finding closed: G-10 (partial — no DSAR intake mechanism)
-- =============================================================================

CREATE TABLE IF NOT EXISTS dsar_requests (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_email TEXT        NOT NULL,
  request_type  TEXT        NOT NULL CHECK (request_type IN ('access', 'erasure', 'portability', 'rectification', 'restriction')),
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'in_progress', 'fulfilled', 'rejected', 'cancelled')),
  raised_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at  TIMESTAMPTZ,
  handler_id    UUID        REFERENCES auth.users(id),  -- admin who handled it
  notes         TEXT,
  -- Audit trail
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE dsar_requests IS
  'Data Subject Access/Erasure Request log. Admin-only access. '
  'Retention: 36 months per retention_policies (legal_record regime).';

COMMENT ON COLUMN dsar_requests.request_type IS
  'access=droit d''accès, erasure=droit à l''effacement, '
  'portability=portabilité, rectification=rectification, restriction=limitation';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION dsar_requests_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dsar_requests_updated_at ON dsar_requests;
CREATE TRIGGER dsar_requests_updated_at
  BEFORE UPDATE ON dsar_requests
  FOR EACH ROW EXECUTE FUNCTION dsar_requests_set_updated_at();

-- ── RLS: admin-only ───────────────────────────────────────────────────────────
ALTER TABLE dsar_requests ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage DSAR requests"
  ON dsar_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_dsar_requests_status     ON dsar_requests (status);
CREATE INDEX IF NOT EXISTS idx_dsar_requests_raised_at  ON dsar_requests (raised_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsar_requests_email      ON dsar_requests (subject_email);
