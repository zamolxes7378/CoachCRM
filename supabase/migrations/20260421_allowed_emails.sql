-- ============================================================
-- 20260421_allowed_emails.sql
--
-- Creates the allowed_emails table used by Track B's signup
-- gate.  Before provisioning a new therapist row, App.jsx
-- checks that the Google-auth email is present here.
--
-- Table design:
--   email        — the allowed Google email (primary key)
--   invited_by   — which admin added this entry (nullable on
--                  first bootstrap before any admin exists)
--   invited_at   — when the invite was added
--
-- RLS: only admins can INSERT / UPDATE / DELETE.
--      No authenticated user can SELECT the full list
--      (prevents enumeration of colleagues' emails).
--      App.jsx checks membership via the admin RPC or a
--      targeted single-row SELECT on their own email only.
--
-- Findings closed: S-02 (partial — Track B implements the gate)
-- ============================================================

CREATE TABLE IF NOT EXISTS allowed_emails (
  email       text        PRIMARY KEY,
  invited_by  uuid        REFERENCES users(id) ON DELETE SET NULL,
  invited_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (idempotency):
DROP POLICY IF EXISTS "allowed_emails_self_check" ON allowed_emails;
DROP POLICY IF EXISTS "allowed_emails_admin_all"  ON allowed_emails;

-- Any authenticated user may check whether their own email is
-- in the allowlist (needed during login / sync-user flow).
CREATE POLICY "allowed_emails_self_check"
  ON allowed_emails
  FOR SELECT
  USING (
    email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- Admins have full read + write access.
CREATE POLICY "allowed_emails_admin_all"
  ON allowed_emails
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id   = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id   = auth.uid()
        AND role = 'admin'
    )
  );
