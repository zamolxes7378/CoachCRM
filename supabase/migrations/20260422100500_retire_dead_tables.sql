-- ============================================================
-- 20260422100500_retire_dead_tables.sql
--
-- Retire dead table declarations (P1-X, audit C-6 / tables.md).
--
-- Live DB verification (2026-04-21) confirms that these tables
-- DO NOT EXIST on the production database:
--   - client_links          (table)
--   - professional_referrals (table)
--
-- The equivalent data lives in:
--   - clients.client_links JSONB  (parrainage client↔client,
--                                  parrainage-pro, dossier)
--   - professionals.referrals JSONB (pro→client referral records)
--
-- The table declarations were present in supabase/migration.sql
-- (the legacy monolithic schema file) but were never applied to
-- the live DB.  They have been removed from migration.sql in
-- this commit so that the file no longer diverges from live.
--
-- This migration is a no-op on live (tables don't exist).
-- On a fresh DB reconstructed from migration.sql, these tables
-- will no longer be created.
--
-- If for any reason these tables DO exist in a non-prod environment
-- (e.g. a local Docker Supabase), the DROP statements below will
-- clean them up safely.
-- ============================================================

-- retired: client_links
DROP TABLE IF EXISTS client_links CASCADE;

-- retired: professional_referrals
DROP TABLE IF EXISTS professional_referrals CASCADE;
