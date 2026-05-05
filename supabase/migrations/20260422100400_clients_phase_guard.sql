-- ============================================================
-- 20260422100400_clients_phase_guard.sql
--
-- Phase validity guard for clients.phase (P1-X H-3).
--
-- Design decision: static CHECK vs per-user settings lookup.
--
-- A static CHECK on a hardcoded list (debut/analyse/integration/
-- bilan_final/prospect) would silently reject therapists who have
-- customised their therapy phases via settings.therapy_phases.
-- Live data confirms therapy_phases is user-configurable (stored
-- in settings JSONB), so a static list would be a footgun.
--
-- A per-user function CHECK (reading from settings for the matching
-- user_id) is Postgres-legal but introduces a subquery in every
-- INSERT/UPDATE, breaks for new users before their settings row
-- exists, and requires a SECURITY DEFINER function to read the
-- settings table inside the CHECK — adding SECURITY DEFINER just
-- for a guard is out of scope for this track.
--
-- Chosen guard: enforce that phase is NOT NULL and non-empty string.
-- This closes the most likely accidental corruption (NULL or blank
-- phase) while staying compatible with user-customised phase keys.
-- The application layer already validates phase selection against
-- the user's therapy phases list before writing.
--
-- Re-applying is safe: CHECK is added only if absent (Postgres
-- allows multiple ALTER TABLE ADD CONSTRAINT IF NOT EXISTS from
-- Pg15; for compatibility we use DO $$ to skip if already present).
-- ============================================================

DO $$
BEGIN
  -- Only add the constraint if it doesn't exist yet
  IF NOT EXISTS (
    SELECT 1
    FROM   information_schema.constraint_column_usage
    WHERE  table_name = 'clients'
      AND  constraint_name = 'clients_phase_nonempty'
  ) THEN
    ALTER TABLE clients
      ADD CONSTRAINT clients_phase_nonempty
        CHECK (phase IS NOT NULL AND phase <> '');
  END IF;
END
$$;
