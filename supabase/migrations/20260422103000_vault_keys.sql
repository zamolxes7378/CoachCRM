-- =============================================================================
-- 20260422103000_vault_keys.sql
-- Enable pgsodium extension and create an application-level encryption key
-- for Transparent Column Encryption (TCE) on sensitive Art. 9 columns.
--
-- PLAN: non-regulated HDS persona (hds_decision.md 2026-04-22).
--       Supabase EU + pgsodium TCE is the approved path.
--
-- ROLLBACK:
--   The extension and key cannot simply be dropped once columns reference them.
--   Full rollback requires: first migrate _encrypt_sensitive_columns.sql in
--   reverse (convert bytea columns back to text, drop security labels), then:
--     DELETE FROM pgsodium.key WHERE name = 'coach-crm-app-key';
--   Do NOT DROP EXTENSION pgsodium — it is a shared Supabase extension.
--
-- PAID PLAN NOTE:
--   pgsodium is available on all Supabase plans (Free + Pro + Team + Enterprise)
--   as it ships with the Supabase postgres image. It does NOT require dashboard
--   enablement — it is pre-installed. Verify with:
--     SELECT * FROM pg_available_extensions WHERE name = 'pgsodium';
--
-- KEY SECURITY:
--   The encryption key is stored in pgsodium's internal key table (encrypted at
--   rest by the Supabase-managed root key). The key ID (a UUID) is stored as a
--   security label on the column — NOT the key material itself. Key material
--   NEVER appears in application code, migrations, or environment variables.
--
-- Findings closed: G-03, G-06, G-10
-- Track: P1-Z
-- =============================================================================

-- Enable pgsodium (no-op if already enabled; pre-installed on Supabase)
DO $$
BEGIN
  IF (SELECT count(*) FROM pg_available_extensions WHERE name = 'pgsodium') > 0 THEN
    -- pgsodium is available — ensure it is enabled
    CREATE EXTENSION IF NOT EXISTS pgsodium WITH SCHEMA pgsodium;
    RAISE NOTICE 'pgsodium extension ensured.';
  ELSE
    RAISE WARNING
      'pgsodium extension is NOT available in pg_available_extensions. '
      'Column encryption (P1-Z) will be skipped. '
      'REMEDIATION: Upgrade to a Supabase plan that includes pgsodium, '
      'or contact Supabase support. See docs/engineering/encryption.md.';
  END IF;
END $$;

-- Enable vault extension (for secrets management — complements pgsodium)
-- On Supabase, vault may require dashboard enablement:
--   Dashboard → Database → Extensions → vault
-- If not available, the CREATE EXTENSION will fail silently in this DO block.
DO $$
BEGIN
  IF (SELECT count(*) FROM pg_available_extensions WHERE name = 'vault') > 0 THEN
    CREATE EXTENSION IF NOT EXISTS vault WITH SCHEMA vault;
    RAISE NOTICE 'vault extension ensured.';
  ELSE
    RAISE NOTICE
      'vault extension not available (may require Supabase dashboard enablement: '
      'Database → Extensions → vault). Continuing — pgsodium TCE does not require vault.';
  END IF;
END $$;

-- =============================================================================
-- Create application encryption key (idempotent)
--
-- This DO block creates the key exactly once. The generated key UUID is stored
-- inside pgsodium.key (encrypted by Supabase root key).
-- NEVER log or expose this UUID to end-users — it is a key reference, not
-- the key itself, but losing it makes decryption impossible.
--
-- After running this migration, record the key UUID via:
--   SELECT id FROM pgsodium.key WHERE name = 'coach-crm-app-key';
-- Store this UUID in your deployment runbook (encryption.md §Key Inventory).
-- =============================================================================
DO $$
DECLARE
  v_key_count INTEGER;
BEGIN
  IF (SELECT count(*) FROM pg_extension WHERE extname = 'pgsodium') = 0 THEN
    RAISE NOTICE 'pgsodium not loaded — skipping key creation.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_key_count
  FROM pgsodium.key
  WHERE name = 'coach-crm-app-key';

  IF v_key_count = 0 THEN
    -- Create a new symmetric encryption key (type = aead-det for deterministic
    -- authenticated encryption — suitable for column-level TCE).
    PERFORM pgsodium.create_key(
      name    := 'coach-crm-app-key',
      key_type := 'aead-det'
    );
    RAISE NOTICE
      'Created pgsodium key "coach-crm-app-key". '
      'Record the UUID from: SELECT id FROM pgsodium.key WHERE name = ''coach-crm-app-key'';';
  ELSE
    RAISE NOTICE 'Key "coach-crm-app-key" already exists — skipping creation.';
  END IF;
END $$;

-- Grant pgsodium usage to service_role (needed for TCE decryption)
DO $$
BEGIN
  IF (SELECT count(*) FROM pg_extension WHERE extname = 'pgsodium') > 0 THEN
    GRANT USAGE ON SCHEMA pgsodium TO service_role;
    GRANT SELECT ON pgsodium.key TO service_role;
  END IF;
END $$;

COMMENT ON EXTENSION pgsodium IS
  'Supabase Transparent Column Encryption (TCE). '
  'App key: "coach-crm-app-key" in pgsodium.key. '
  'See docs/engineering/encryption.md for rotation runbook.';
