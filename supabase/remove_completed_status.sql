-- ============================================
-- Suppression du statut 'completed' pour les clients
-- ============================================

-- 1. Changer les clients existants qui ont status='completed' vers 'active'
UPDATE clients SET status = 'active' WHERE status = 'completed';

-- 2. Changer la phase 'completed' vers 'bilan_final'
UPDATE clients SET phase = 'bilan_final' WHERE phase = 'completed';

-- 3. Mettre à jour la contrainte CHECK
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check CHECK (status IN ('active', 'inactive'));
