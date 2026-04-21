-- ============================================================
-- 20260421_admin_rpc.sql
--
-- Adds a SECURITY DEFINER function get_admin_user_list() that
-- returns all rows from users — but only when the calling
-- authenticated user has role = 'admin'.
--
-- AdminPage.jsx currently does a raw SELECT on users (S-04).
-- Track B will replace that call with:
--   supabase.rpc('get_admin_user_list')
-- This function enforces the server-side gate so even a
-- non-admin who knows the function name gets an empty result.
--
-- Column set mirrors AdminPage.jsx:
--   id, name, email, role, photo_url, created_at
-- (read the page before changing this signature)
--
-- Findings closed: S-04, C-2 (partial)
-- ============================================================

CREATE OR REPLACE FUNCTION get_admin_user_list()
RETURNS TABLE (
  id         uuid,
  name       text,
  email      text,
  role       text,
  photo_url  text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
-- Run as the function owner (postgres), not as the caller,
-- so it can bypass RLS on users.  The gate below ensures only
-- admins actually get rows.
SET search_path = public
AS $$
  SELECT
    u.id,
    u.name,
    u.email,
    u.role,
    u.photo_url,
    u.created_at
  FROM users AS u
  WHERE EXISTS (
    SELECT 1
    FROM users AS me
    WHERE me.id   = auth.uid()
      AND me.role = 'admin'
  )
  ORDER BY u.created_at DESC;
$$;

-- Allow authenticated users to call this function.
-- Non-admins will receive zero rows (the WHERE EXISTS returns
-- false), not an error — matching the behaviour Track B expects.
GRANT EXECUTE ON FUNCTION get_admin_user_list() TO authenticated;

-- Revoke from public (anon callers must not call this).
REVOKE EXECUTE ON FUNCTION get_admin_user_list() FROM public;
