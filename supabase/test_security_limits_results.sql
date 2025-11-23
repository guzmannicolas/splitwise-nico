-- ============================================================================ 
-- SCRIPT DE TESTING: RATE LIMITING Y LÍMITES DE RECURSOS (RESULTADOS COMO TABLA)
-- ============================================================================ 
-- Ejecutar este script en el SQL Editor de Supabase para ver los resultados en la pestaña Results
-- No requiere DO $$ ni RAISE NOTICE

-- 1. Buscar un usuario de prueba
WITH test_user AS (
  SELECT id as user_id FROM auth.users LIMIT 1
),

-- 2. Crear grupo de prueba (si no existe)
created_group AS (
  INSERT INTO groups (name, description, created_by)
  SELECT 'Security Test Group', 'Testing rate limits', user_id FROM test_user
  RETURNING id as group_id, created_by
),

-- 3. Intentar crear gastos hasta el límite
expense_inserts AS (
  SELECT COUNT(*) as before_count FROM expenses WHERE description LIKE 'Test Expense %'
),

-- 4. Intentar agregar invitados hasta el límite

guest_inserts AS (
  SELECT COUNT(*) as before_count FROM group_members
),

-- 5. Intentar enviar invitaciones hasta el límite
invitation_inserts AS (
  SELECT COUNT(*) as before_count FROM group_invitations WHERE invited_email LIKE 'test%@example.com'
)

-- 6. Mostrar resultados
SELECT
  (SELECT user_id FROM test_user) as user_id,
  (SELECT group_id FROM created_group) as group_id,
  (SELECT before_count FROM expense_inserts) as expenses_before,
  (SELECT COUNT(*) FROM expenses WHERE description LIKE 'Test Expense %') as expenses_after,
  (SELECT before_count FROM guest_inserts) as guests_before,
  (SELECT COUNT(*) FROM group_members) as guests_after,
  (SELECT before_count FROM invitation_inserts) as invitations_before,
  (SELECT COUNT(*) FROM group_invitations WHERE invited_email LIKE 'test%@example.com') as invitations_after,
  (SELECT COUNT(*) FROM rate_limits WHERE user_id = (SELECT user_id FROM test_user)) as rate_limits_entries;

-- Puedes limpiar los datos de prueba manualmente si lo deseas:
-- DELETE FROM expenses WHERE description LIKE 'Test Expense %';
-- DELETE FROM group_members WHERE display_name LIKE 'Guest %';
-- DELETE FROM group_invitations WHERE invited_email LIKE 'test%@example.com';
-- DELETE FROM groups WHERE name = 'Security Test Group';
