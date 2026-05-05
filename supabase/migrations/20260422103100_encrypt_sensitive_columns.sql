-- =============================================================================
-- 20260422103100_encrypt_sensitive_columns.sql
-- Transparent Column Encryption (TCE) via pgsodium security labels.
--
-- Target columns (Art. 9 sensitive data per hds_decision.md):
--   reports.narrative    TEXT  → bytea (encrypted)
--   reports.vigilance    JSONB → bytea (encrypted, cast to text first)
--   clients.notes        TEXT  → bytea (encrypted)
--   clients.ai_synthesis TEXT  → bytea (encrypted)
--   sessions.summary     TEXT  → bytea (encrypted)
--   sessions.audio_file  TEXT  → bytea (encrypted)
--
-- MECHANISM: pgsodium TCE (Transparent Column Encryption).
--   Security labels on columns instruct pgsodium to auto-encrypt on write and
--   auto-decrypt on read for authorised roles. The key ID (UUID from pgsodium.key)
--   is embedded in the security label — NOT key material.
--
-- PREREQUISITE: 20260422103000_vault_keys.sql must have run first.
--
-- ROLLBACK (before go-live, while data is still plaintext):
--   1. DROP the encrypted columns (or restore from backup).
--   2. Re-add as TEXT/JSONB with original data.
--   3. Remove the security labels:
--        SECURITY LABEL FOR pgsodium ON COLUMN <tbl>.<col> IS NULL;
--   Full rollback with live encrypted data requires re-running the re-encryption
--   UPDATE in reverse (decrypt then cast back to text) — see encryption.md §Rollback.
--
-- IDEMPOTENCY: Each DO block checks for the existing column type before altering.
--   Re-running after the migration is a no-op.
--
-- PAID PLAN NOTE:
--   pgsodium TCE is available on Supabase Free/Pro/Team/Enterprise.
--   If pgsodium is absent, this migration emits RAISE NOTICE and skips all DDL.
--
-- Findings closed: G-03, G-06 (column encryption at rest beyond infra default)
-- Track: P1-Z
-- =============================================================================

DO $$
DECLARE
  v_key_id  UUID;
  v_label   TEXT;
BEGIN
  -- ── Guard: pgsodium must be loaded ─────────────────────────────────────────
  IF (SELECT count(*) FROM pg_extension WHERE extname = 'pgsodium') = 0 THEN
    RAISE NOTICE
      'pgsodium not loaded — skipping column encryption. '
      'Enable pgsodium (see 20260422103000_vault_keys.sql) and re-run.';
    RETURN;
  END IF;

  -- ── Retrieve the app key UUID ───────────────────────────────────────────────
  SELECT id INTO v_key_id
  FROM pgsodium.key
  WHERE name = 'coach-crm-app-key'
  LIMIT 1;

  IF v_key_id IS NULL THEN
    RAISE EXCEPTION
      'Key "coach-crm-app-key" not found in pgsodium.key. '
      'Run 20260422103000_vault_keys.sql first.';
  END IF;

  -- ── reports.narrative (TEXT → bytea) ───────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reports' AND column_name = 'narrative'
      AND data_type = 'text'
  ) THEN
    -- Step 1: Add a temporary bytea column
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS narrative_enc bytea;
    -- Step 2: Encrypt existing data into temp column
    UPDATE reports
    SET narrative_enc = pgsodium.crypto_aead_det_encrypt(
      convert_to(narrative, 'utf8'),
      convert_to('reports.narrative', 'utf8'),
      v_key_id
    )
    WHERE narrative IS NOT NULL;
    -- Step 3: Drop original column, rename encrypted column
    ALTER TABLE reports DROP COLUMN narrative;
    ALTER TABLE reports RENAME COLUMN narrative_enc TO narrative;
    -- Step 4: Apply security label for auto-encryption on future writes
    v_label := format('encrypt with key id %s security label for pgsodium', v_key_id);
    EXECUTE format(
      $sql$SECURITY LABEL FOR pgsodium ON COLUMN reports.narrative IS 'encrypt with key id %s'$sql$,
      v_key_id
    );
    RAISE NOTICE 'reports.narrative encrypted (key: %)', v_key_id;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reports' AND column_name = 'narrative'
      AND data_type = 'bytea'
  ) THEN
    -- Already encrypted — ensure security label is applied
    EXECUTE format(
      $sql$SECURITY LABEL FOR pgsodium ON COLUMN reports.narrative IS 'encrypt with key id %s'$sql$,
      v_key_id
    );
    RAISE NOTICE 'reports.narrative already bytea — security label refreshed.';
  END IF;

  -- ── reports.vigilance (JSONB → bytea) ──────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reports' AND column_name = 'vigilance'
      AND data_type IN ('text', 'jsonb')
  ) THEN
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS vigilance_enc bytea;
    UPDATE reports
    SET vigilance_enc = pgsodium.crypto_aead_det_encrypt(
      convert_to(vigilance::text, 'utf8'),
      convert_to('reports.vigilance', 'utf8'),
      v_key_id
    )
    WHERE vigilance IS NOT NULL;
    ALTER TABLE reports DROP COLUMN vigilance;
    ALTER TABLE reports RENAME COLUMN vigilance_enc TO vigilance;
    EXECUTE format(
      $sql$SECURITY LABEL FOR pgsodium ON COLUMN reports.vigilance IS 'encrypt with key id %s'$sql$,
      v_key_id
    );
    RAISE NOTICE 'reports.vigilance encrypted (key: %)', v_key_id;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reports' AND column_name = 'vigilance'
      AND data_type = 'bytea'
  ) THEN
    EXECUTE format(
      $sql$SECURITY LABEL FOR pgsodium ON COLUMN reports.vigilance IS 'encrypt with key id %s'$sql$,
      v_key_id
    );
    RAISE NOTICE 'reports.vigilance already bytea — security label refreshed.';
  END IF;

  -- ── clients.notes (TEXT → bytea) ───────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'notes'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes_enc bytea;
    UPDATE clients
    SET notes_enc = pgsodium.crypto_aead_det_encrypt(
      convert_to(notes, 'utf8'),
      convert_to('clients.notes', 'utf8'),
      v_key_id
    )
    WHERE notes IS NOT NULL;
    ALTER TABLE clients DROP COLUMN notes;
    ALTER TABLE clients RENAME COLUMN notes_enc TO notes;
    EXECUTE format(
      $sql$SECURITY LABEL FOR pgsodium ON COLUMN clients.notes IS 'encrypt with key id %s'$sql$,
      v_key_id
    );
    RAISE NOTICE 'clients.notes encrypted (key: %)', v_key_id;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'notes'
      AND data_type = 'bytea'
  ) THEN
    EXECUTE format(
      $sql$SECURITY LABEL FOR pgsodium ON COLUMN clients.notes IS 'encrypt with key id %s'$sql$,
      v_key_id
    );
    RAISE NOTICE 'clients.notes already bytea — security label refreshed.';
  END IF;

  -- ── clients.ai_synthesis (TEXT → bytea) ────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'ai_synthesis'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_synthesis_enc bytea;
    UPDATE clients
    SET ai_synthesis_enc = pgsodium.crypto_aead_det_encrypt(
      convert_to(ai_synthesis, 'utf8'),
      convert_to('clients.ai_synthesis', 'utf8'),
      v_key_id
    )
    WHERE ai_synthesis IS NOT NULL;
    ALTER TABLE clients DROP COLUMN ai_synthesis;
    ALTER TABLE clients RENAME COLUMN ai_synthesis_enc TO ai_synthesis;
    EXECUTE format(
      $sql$SECURITY LABEL FOR pgsodium ON COLUMN clients.ai_synthesis IS 'encrypt with key id %s'$sql$,
      v_key_id
    );
    RAISE NOTICE 'clients.ai_synthesis encrypted (key: %)', v_key_id;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'ai_synthesis'
      AND data_type = 'bytea'
  ) THEN
    EXECUTE format(
      $sql$SECURITY LABEL FOR pgsodium ON COLUMN clients.ai_synthesis IS 'encrypt with key id %s'$sql$,
      v_key_id
    );
    RAISE NOTICE 'clients.ai_synthesis already bytea — security label refreshed.';
  END IF;

  -- ── sessions.summary (TEXT → bytea) ────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'summary'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS summary_enc bytea;
    UPDATE sessions
    SET summary_enc = pgsodium.crypto_aead_det_encrypt(
      convert_to(summary, 'utf8'),
      convert_to('sessions.summary', 'utf8'),
      v_key_id
    )
    WHERE summary IS NOT NULL;
    ALTER TABLE sessions DROP COLUMN summary;
    ALTER TABLE sessions RENAME COLUMN summary_enc TO summary;
    EXECUTE format(
      $sql$SECURITY LABEL FOR pgsodium ON COLUMN sessions.summary IS 'encrypt with key id %s'$sql$,
      v_key_id
    );
    RAISE NOTICE 'sessions.summary encrypted (key: %)', v_key_id;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'summary'
      AND data_type = 'bytea'
  ) THEN
    EXECUTE format(
      $sql$SECURITY LABEL FOR pgsodium ON COLUMN sessions.summary IS 'encrypt with key id %s'$sql$,
      v_key_id
    );
    RAISE NOTICE 'sessions.summary already bytea — security label refreshed.';
  END IF;

  -- ── sessions.audio_file (TEXT → bytea) ─────────────────────────────────────
  -- Note: audio_file stores a storage path/URL (not the binary blob). Encrypting
  -- the path prevents enumeration of storage objects even if the DB is compromised.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'audio_file'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS audio_file_enc bytea;
    UPDATE sessions
    SET audio_file_enc = pgsodium.crypto_aead_det_encrypt(
      convert_to(audio_file, 'utf8'),
      convert_to('sessions.audio_file', 'utf8'),
      v_key_id
    )
    WHERE audio_file IS NOT NULL;
    ALTER TABLE sessions DROP COLUMN audio_file;
    ALTER TABLE sessions RENAME COLUMN audio_file_enc TO audio_file;
    EXECUTE format(
      $sql$SECURITY LABEL FOR pgsodium ON COLUMN sessions.audio_file IS 'encrypt with key id %s'$sql$,
      v_key_id
    );
    RAISE NOTICE 'sessions.audio_file encrypted (key: %)', v_key_id;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'audio_file'
      AND data_type = 'bytea'
  ) THEN
    EXECUTE format(
      $sql$SECURITY LABEL FOR pgsodium ON COLUMN sessions.audio_file IS 'encrypt with key id %s'$sql$,
      v_key_id
    );
    RAISE NOTICE 'sessions.audio_file already bytea — security label refreshed.';
  END IF;

  RAISE NOTICE 'Column encryption migration complete. Verify with: '
    'SELECT column_name, data_type FROM information_schema.columns '
    'WHERE table_name IN (''reports'',''clients'',''sessions'') '
    'AND column_name IN (''narrative'',''vigilance'',''notes'',''ai_synthesis'',''summary'',''audio_file'');';
END $$;

-- =============================================================================
-- Decryption views (SECURITY INVOKER — callers must have SELECT on base tables)
--
-- These views decrypt columns for authorised roles. They use SECURITY INVOKER
-- so the caller's RLS policies apply. The underlying pgsodium decryption is
-- performed server-side — plaintext never leaves the DB engine in encrypted form.
--
-- Usage: SELECT * FROM reports_decrypted WHERE client_id = '...';
-- =============================================================================

CREATE OR REPLACE VIEW reports_decrypted
WITH (security_invoker = true)
AS
  SELECT
    id,
    client_id,
    session_id,
    date,
    content,
    tags,
    client_name,
    session_number,
    -- Decrypt narrative (returns bytea → convert to text)
    CASE
      WHEN narrative IS NOT NULL
      THEN convert_from(
        pgsodium.crypto_aead_det_decrypt(
          narrative,
          convert_to('reports.narrative', 'utf8'),
          (SELECT id FROM pgsodium.key WHERE name = 'coach-crm-app-key' LIMIT 1)
        ),
        'utf8'
      )
      ELSE NULL
    END AS narrative,
    themes,
    emotions_a,
    emotions_b,
    patterns,
    progress,
    -- Decrypt vigilance and cast back to jsonb
    CASE
      WHEN vigilance IS NOT NULL
      THEN convert_from(
        pgsodium.crypto_aead_det_decrypt(
          vigilance,
          convert_to('reports.vigilance', 'utf8'),
          (SELECT id FROM pgsodium.key WHERE name = 'coach-crm-app-key' LIMIT 1)
        ),
        'utf8'
      )::jsonb
      ELSE NULL
    END AS vigilance,
    exercises,
    pedagogical_content,
    created_at,
    retention_until,
    anonymized_at
  FROM reports;

COMMENT ON VIEW reports_decrypted IS
  'Decrypted view of reports. SECURITY INVOKER — RLS of calling user applies. '
  'narrative and vigilance columns are decrypted inline.';

CREATE OR REPLACE VIEW clients_decrypted
WITH (security_invoker = true)
AS
  SELECT
    id,
    user_id,
    type,
    phase,
    status,
    source,
    start_date,
    created_at,
    updated_at,
    deleted_at,
    session_rate,
    session_frequency,
    billing_address,
    note_dynamique,
    note_axes,
    note_vigilance,
    note_objectifs,
    client_links,
    external_referrer,
    referred_by,
    prospect_stage,
    partner_a,
    partner_b,
    -- Decrypt notes
    CASE
      WHEN notes IS NOT NULL
      THEN convert_from(
        pgsodium.crypto_aead_det_decrypt(
          notes,
          convert_to('clients.notes', 'utf8'),
          (SELECT id FROM pgsodium.key WHERE name = 'coach-crm-app-key' LIMIT 1)
        ),
        'utf8'
      )
      ELSE NULL
    END AS notes,
    -- Decrypt ai_synthesis
    CASE
      WHEN ai_synthesis IS NOT NULL
      THEN convert_from(
        pgsodium.crypto_aead_det_decrypt(
          ai_synthesis,
          convert_to('clients.ai_synthesis', 'utf8'),
          (SELECT id FROM pgsodium.key WHERE name = 'coach-crm-app-key' LIMIT 1)
        ),
        'utf8'
      )
      ELSE NULL
    END AS ai_synthesis,
    retention_until,
    anonymized_at
  FROM clients;

COMMENT ON VIEW clients_decrypted IS
  'Decrypted view of clients. SECURITY INVOKER — RLS of calling user applies.';

CREATE OR REPLACE VIEW sessions_decrypted
WITH (security_invoker = true)
AS
  SELECT
    id,
    user_id,
    client_id,
    date,
    duration,
    status,
    title,
    payment_status,
    payment_date,
    cancellation_reason,
    invoice_covered_session_ids,
    covered_session_ids,
    created_at,
    updated_at,
    -- Decrypt summary
    CASE
      WHEN summary IS NOT NULL
      THEN convert_from(
        pgsodium.crypto_aead_det_decrypt(
          summary,
          convert_to('sessions.summary', 'utf8'),
          (SELECT id FROM pgsodium.key WHERE name = 'coach-crm-app-key' LIMIT 1)
        ),
        'utf8'
      )
      ELSE NULL
    END AS summary,
    -- Decrypt audio_file path
    CASE
      WHEN audio_file IS NOT NULL
      THEN convert_from(
        pgsodium.crypto_aead_det_decrypt(
          audio_file,
          convert_to('sessions.audio_file', 'utf8'),
          (SELECT id FROM pgsodium.key WHERE name = 'coach-crm-app-key' LIMIT 1)
        ),
        'utf8'
      )
      ELSE NULL
    END AS audio_file,
    retention_until,
    anonymized_at
  FROM sessions;

COMMENT ON VIEW sessions_decrypted IS
  'Decrypted view of sessions. SECURITY INVOKER — RLS of calling user applies.';

-- Grant SELECT on views to authenticated role (RLS on base tables still applies)
GRANT SELECT ON reports_decrypted  TO authenticated;
GRANT SELECT ON clients_decrypted  TO authenticated;
GRANT SELECT ON sessions_decrypted TO authenticated;
GRANT SELECT ON reports_decrypted  TO service_role;
GRANT SELECT ON clients_decrypted  TO service_role;
GRANT SELECT ON sessions_decrypted TO service_role;
