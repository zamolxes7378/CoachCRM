-- ============================================================
-- 20260422100300_emotional_maturity_append_only.sql
--
-- Append-only invariant for clients.emotional_maturity_history
-- (P1-X H-3 partial).
--
-- Business rule: the emotional maturity history is a sequential
-- record of assessments.  Entries must only be appended; reducing
-- the array length would silently destroy historical data.
--
-- Implementation: BEFORE UPDATE trigger.  If the incoming array
-- is shorter than the current one, raise an exception.  Equal or
-- longer length is allowed (append / replace-in-place are both
-- legal write patterns).
--
-- The function uses CREATE OR REPLACE so re-applying is safe.
-- The trigger uses DROP IF EXISTS + CREATE to guarantee idempotency
-- regardless of whether a prior version exists.
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_emotional_maturity_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow NULL→array transitions (first write) and array→NULL (clear)
  IF OLD.emotional_maturity_history IS NULL
     OR NEW.emotional_maturity_history IS NULL THEN
    RETURN NEW;
  END IF;

  IF jsonb_array_length(NEW.emotional_maturity_history)
       < jsonb_array_length(OLD.emotional_maturity_history) THEN
    RAISE EXCEPTION
      'emotional_maturity_history is append-only: cannot shrink from % to % entries',
      jsonb_array_length(OLD.emotional_maturity_history),
      jsonb_array_length(NEW.emotional_maturity_history);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emotional_maturity_append_only ON clients;

CREATE TRIGGER trg_emotional_maturity_append_only
  BEFORE UPDATE OF emotional_maturity_history ON clients
  FOR EACH ROW
  EXECUTE FUNCTION enforce_emotional_maturity_append_only();
