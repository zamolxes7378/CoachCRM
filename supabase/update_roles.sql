-- Sebastian Pavel → thérapeute
UPDATE users SET role = 'therapist' WHERE name ILIKE '%sebastian%pavel%';

-- Vérification
SELECT id, name, email, role FROM users ORDER BY created_at;
