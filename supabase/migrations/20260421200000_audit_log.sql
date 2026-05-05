CREATE TABLE IF NOT EXISTS audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  entity text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  metadata jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- Users can read their own rows; admins read all; inserts via service role only
CREATE POLICY "users_read_own_audit_log" ON audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins_read_all_audit_log" ON audit_log FOR SELECT USING (is_admin());
