-- =============================================================================
-- 20260422101400_consolidate_notes.sql
-- Consolidate note columns on clients table.
--
-- DECISION: keep note_* names (live DB set, confirmed by adapters.js).
--   The doc-only aliases (axes_travail, points_vigilance, objectifs,
--   dynamique_relationnelle) were already removed from the baseline_schema
--   migration (20260401000000 line 181: "Ghost columns … not present in live DB").
--   This migration is therefore a no-op DDL guard + backfill documentation.
--
-- Canonical columns (already present):
--   clients.note_dynamique  → dynamique relationnelle (free text)
--   clients.note_axes       → axes de travail (free text)
--   clients.note_vigilance  → points de vigilance (free text)
--   clients.note_objectifs  → objectifs thérapeutiques (free text)
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + backfill via DO block.
-- Finding closed: deprecate-notes
-- =============================================================================

-- Ensure the canonical columns exist (they should from baseline_schema)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS note_dynamique  TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS note_axes       TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS note_vigilance  TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS note_objectifs  TEXT;

-- Ghost-column backfill: if the doc-named aliases ever existed in the DB,
-- copy their data into the note_* columns (no-op if columns don't exist).
DO $$
DECLARE
  col RECORD;
BEGIN
  -- axes_travail → note_axes
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'axes_travail'
  ) THEN
    UPDATE clients
    SET note_axes = axes_travail
    WHERE note_axes IS NULL AND axes_travail IS NOT NULL;
    RAISE NOTICE 'Backfilled axes_travail → note_axes';
  END IF;

  -- points_vigilance → note_vigilance
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'points_vigilance'
  ) THEN
    UPDATE clients
    SET note_vigilance = points_vigilance
    WHERE note_vigilance IS NULL AND points_vigilance IS NOT NULL;
    RAISE NOTICE 'Backfilled points_vigilance → note_vigilance';
  END IF;

  -- objectifs → note_objectifs
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'objectifs'
  ) THEN
    UPDATE clients
    SET note_objectifs = objectifs
    WHERE note_objectifs IS NULL AND objectifs IS NOT NULL;
    RAISE NOTICE 'Backfilled objectifs → note_objectifs';
  END IF;

  -- dynamique_relationnelle → note_dynamique
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'dynamique_relationnelle'
  ) THEN
    UPDATE clients
    SET note_dynamique = dynamique_relationnelle
    WHERE note_dynamique IS NULL AND dynamique_relationnelle IS NOT NULL;
    RAISE NOTICE 'Backfilled dynamique_relationnelle → note_dynamique';
  END IF;
END $$;

-- Add column comments for clarity
COMMENT ON COLUMN clients.note_dynamique  IS 'Note libre thérapeute : dynamique relationnelle. Canonique (note_* set).';
COMMENT ON COLUMN clients.note_axes       IS 'Note libre thérapeute : axes de travail. Canonique (note_* set).';
COMMENT ON COLUMN clients.note_vigilance  IS 'Note libre thérapeute : points de vigilance. Canonique (note_* set).';
COMMENT ON COLUMN clients.note_objectifs  IS 'Note libre thérapeute : objectifs thérapeutiques. Canonique (note_* set).';
