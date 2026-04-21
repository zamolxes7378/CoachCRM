-- Phase 0 Track F fix-up: close two DB gaps.
-- Authored 2026-04-21 after code review.
-- Idempotent: safe to re-apply.

-- 1) contacts.client_id FK must CASCADE on delete (live DB already has this;
--    migration.sql was drift. Track D baseline captures live truth; this
--    migration ensures ANY fresh-apply path also gets it.)
ALTER TABLE contacts
  DROP CONSTRAINT IF EXISTS contacts_client_id_fkey;
ALTER TABLE contacts
  ADD CONSTRAINT contacts_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- 2) clients_type_check must match live DB = {client, individual, family}.
--    Keep 'couple' in the allow-list to avoid rejecting pre-existing rows
--    if any leaked through before the type migration; adapters.js maps to
--    'client' on write now.
ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_type_check;
ALTER TABLE clients
  ADD CONSTRAINT clients_type_check
  CHECK (type IN ('client', 'individual', 'family', 'couple'));
