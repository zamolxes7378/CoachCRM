-- clients_with_stats view
-- SECURITY INVOKER: queries run as the calling user, so RLS on `clients` and
-- `sessions` is fully respected. Do NOT change to SECURITY DEFINER.

CREATE OR REPLACE VIEW public.clients_with_stats
WITH (security_invoker = true)
AS
SELECT
  c.*,
  COUNT(s.id) FILTER (WHERE s.status != 'cancelled')        AS sessions_count,
  MAX(s.date) FILTER (WHERE s.date <= now() AND s.status != 'cancelled') AS last_session_date,
  MIN(s.date) FILTER (WHERE s.date > now()  AND s.status != 'cancelled') AS next_session_date
FROM public.clients c
LEFT JOIN public.sessions s
  ON s.client_id = c.id
  AND s.user_id  = c.user_id
GROUP BY c.id;
