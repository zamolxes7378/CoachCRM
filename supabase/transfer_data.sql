-- ============================================
-- Transfert des données : Anne-Chantal → Claudia
-- ============================================
-- Ce script transfère toutes les données du compte de test
-- vers le compte de production, sans supprimer le compte source.

-- Étape 1 : Identifier les IDs
-- (Vérifiez d'abord avec : SELECT id, name, email FROM users;)

-- Étape 2 : Transférer les données
-- Remplacez les UUIDs ci-dessous par les vrais IDs de vos utilisateurs

DO $$
DECLARE
  v_source_id UUID;
  v_target_id UUID;
BEGIN
  -- Trouver l'ID source (Anne-Chantal)
  SELECT id INTO v_source_id FROM users WHERE email = 'anne-chantal.meyer@gmail.com';
  
  -- Trouver l'ID cible (Claudia)
  SELECT id INTO v_target_id FROM users WHERE email = 'claudia@kotech.ai';

  IF v_source_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur source (anne-chantal.meyer@gmail.com) non trouvé';
  END IF;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur cible (claudia@kotech.ai) non trouvé';
  END IF;

  RAISE NOTICE 'Transfert de % vers %', v_source_id, v_target_id;

  -- Transférer les clients
  UPDATE clients SET user_id = v_target_id WHERE user_id = v_source_id;
  RAISE NOTICE 'Clients transférés';

  -- Transférer les sessions
  UPDATE sessions SET user_id = v_target_id WHERE user_id = v_source_id;
  RAISE NOTICE 'Sessions transférées';

  -- Transférer les contacts
  UPDATE contacts SET user_id = v_target_id WHERE user_id = v_source_id;
  RAISE NOTICE 'Contacts transférés';

  -- Transférer les settings (supprimer l'existant de Claudia s'il y en a, pour éviter unicité)
  DELETE FROM settings WHERE user_id = v_target_id;
  UPDATE settings SET user_id = v_target_id WHERE user_id = v_source_id;
  RAISE NOTICE 'Settings transférés';

  RAISE NOTICE 'Transfert terminé avec succès !';
END $$;
