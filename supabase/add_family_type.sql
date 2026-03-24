-- Add 'family' to the clients.type CHECK constraint
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_type_check;
ALTER TABLE clients ADD CONSTRAINT clients_type_check CHECK (type IN ('couple', 'individual', 'family'));
