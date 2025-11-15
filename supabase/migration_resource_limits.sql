-- ============================================================================
-- MIGRACI脫N: L脥MITES DE RECURSOS POR USUARIO Y GRUPO
-- ============================================================================
-- Fecha: 2025-11-15
-- Descripci贸n: Previene crecimiento descontrolado de recursos mediante:
--   1. L铆mite de 50 grupos por usuario
--   2. L铆mite de 100 miembros por grupo
--   3. L铆mite de 1000 gastos por grupo
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. L脥MITE DE GRUPOS POR USUARIO (M脕XIMO 50)
-- ----------------------------------------------------------------------------
-- Trigger que verifica antes de agregar un usuario a un nuevo grupo

CREATE OR REPLACE FUNCTION enforce_max_groups_per_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_group_count integer;
BEGIN
  -- Contar grupos actuales del usuario
  SELECT COUNT(DISTINCT group_id) INTO v_user_group_count
  FROM group_members
  WHERE user_id = NEW.user_id;
  
  -- Si ya tiene 50 grupos, bloquear
  IF v_user_group_count >= 50 THEN
    RAISE EXCEPTION 'User has reached maximum number of groups (50)'
      USING HINT = 'Leave some groups before joining new ones';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_max_groups_per_user
  BEFORE INSERT ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_groups_per_user();

-- ----------------------------------------------------------------------------
-- 2. L脥MITE DE MIEMBROS POR GRUPO (M脕XIMO 100)
-- ----------------------------------------------------------------------------
-- Trigger que verifica antes de agregar un nuevo miembro a un grupo

CREATE OR REPLACE FUNCTION enforce_max_members_per_group()
RETURNS TRIGGER AS $$
DECLARE
  v_member_count integer;
BEGIN
  -- Contar miembros actuales del grupo
  SELECT COUNT(*) INTO v_member_count
  FROM group_members
  WHERE group_id = NEW.group_id;
  
  -- Si ya tiene 100 miembros, bloquear
  IF v_member_count >= 100 THEN
    RAISE EXCEPTION 'Group has reached maximum number of members (100)'
      USING HINT = 'Remove inactive members before adding new ones';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_max_members_per_group
  BEFORE INSERT ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_members_per_group();

-- ----------------------------------------------------------------------------
-- 3. L脥MITE DE GASTOS POR GRUPO (M脕XIMO 1000)
-- ----------------------------------------------------------------------------
-- Trigger que verifica antes de crear un nuevo gasto en un grupo

CREATE OR REPLACE FUNCTION enforce_max_expenses_per_group()
RETURNS TRIGGER AS $$
DECLARE
  v_expense_count integer;
BEGIN
  -- Contar gastos actuales del grupo
  SELECT COUNT(*) INTO v_expense_count
  FROM expenses
  WHERE group_id = NEW.group_id;
  
  -- Si ya tiene 1000 gastos, bloquear
  IF v_expense_count >= 1000 THEN
    RAISE EXCEPTION 'Group has reached maximum number of expenses (1000)'
      USING HINT = 'Archive old expenses or create a new group for new expenses';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_max_expenses_per_group
  BEFORE INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_expenses_per_group();

-- ----------------------------------------------------------------------------
-- 4. VISTAS PARA MONITOREAR USO DE RECURSOS
-- ----------------------------------------------------------------------------

-- Vista: Grupos por usuario (para ver qui茅n est谩 cerca del l铆mite)
CREATE OR REPLACE VIEW user_group_usage AS
SELECT 
  user_id,
  COUNT(DISTINCT group_id) as group_count,
  50 - COUNT(DISTINCT group_id) as remaining_groups
FROM group_members
GROUP BY user_id
ORDER BY group_count DESC;

-- Vista: Miembros por grupo (para ver qu茅 grupos est谩n llenos)
CREATE OR REPLACE VIEW group_member_usage AS
SELECT 
  g.id as group_id,
  g.name as group_name,
  COUNT(gm.user_id) as member_count,
  100 - COUNT(gm.user_id) as remaining_slots,
  CASE 
    WHEN COUNT(gm.user_id) >= 90 THEN 'WARNING'
    WHEN COUNT(gm.user_id) >= 100 THEN 'FULL'
    ELSE 'OK'
  END as status
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
GROUP BY g.id, g.name
ORDER BY member_count DESC;

-- Vista: Gastos por grupo (para ver qu茅 grupos est谩n cerca del l铆mite)
CREATE OR REPLACE VIEW group_expense_usage AS
SELECT 
  g.id as group_id,
  g.name as group_name,
  COUNT(e.id) as expense_count,
  1000 - COUNT(e.id) as remaining_expenses,
  CASE 
    WHEN COUNT(e.id) >= 900 THEN 'WARNING'
    WHEN COUNT(e.id) >= 1000 THEN 'FULL'
    ELSE 'OK'
  END as status
FROM groups g
LEFT JOIN expenses e ON g.id = e.group_id
GROUP BY g.id, g.name
ORDER BY expense_count DESC;

-- Vista combinada: Resumen de uso de recursos
CREATE OR REPLACE VIEW resource_usage_summary AS
SELECT 
  'Total Users' as metric,
  COUNT(DISTINCT user_id)::text as value
FROM group_members
UNION ALL
SELECT 
  'Total Groups',
  COUNT(*)::text
FROM groups
UNION ALL
SELECT 
  'Total Expenses',
  COUNT(*)::text
FROM expenses
UNION ALL
SELECT 
  'Users at limit (50 groups)',
  COUNT(*)::text
FROM user_group_usage
WHERE group_count >= 50
UNION ALL
SELECT 
  'Groups at limit (100 members)',
  COUNT(*)::text
FROM group_member_usage
WHERE member_count >= 100
UNION ALL
SELECT 
  'Groups at limit (1000 expenses)',
  COUNT(*)::text
FROM group_expense_usage
WHERE expense_count >= 1000;

-- ----------------------------------------------------------------------------
-- 5. FUNCI脫N PARA VERIFICAR SI USUARIO PUEDE A脩ADIR RECURSOS
-- ----------------------------------------------------------------------------
-- 脷til para mostrar advertencias en el frontend antes de intentar crear

CREATE OR REPLACE FUNCTION can_add_to_group(p_user_id uuid, p_group_id uuid)
RETURNS json AS $$
DECLARE
  v_user_group_count integer;
  v_group_member_count integer;
  v_group_expense_count integer;
  v_result json;
BEGIN
  -- Contar grupos del usuario
  SELECT COUNT(DISTINCT group_id) INTO v_user_group_count
  FROM group_members
  WHERE user_id = p_user_id;
  
  -- Contar miembros del grupo
  SELECT COUNT(*) INTO v_group_member_count
  FROM group_members
  WHERE group_id = p_group_id;
  
  -- Contar gastos del grupo
  SELECT COUNT(*) INTO v_group_expense_count
  FROM expenses
  WHERE group_id = p_group_id;
  
  -- Construir resultado
  SELECT json_build_object(
    'can_join_group', v_user_group_count < 50,
    'can_add_member', v_group_member_count < 100,
    'can_add_expense', v_group_expense_count < 1000,
    'limits', json_build_object(
      'user_groups', json_build_object('current', v_user_group_count, 'max', 50),
      'group_members', json_build_object('current', v_group_member_count, 'max', 100),
      'group_expenses', json_build_object('current', v_group_expense_count, 'max', 1000)
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 6. CONFIGURACI脫N DE PERMISOS RLS PARA VISTAS
-- ----------------------------------------------------------------------------
-- Las vistas heredan permisos de las tablas subyacentes,
-- pero a帽adimos permisos expl铆citos para claridad

-- Usuarios pueden ver su propio uso de recursos
GRANT SELECT ON user_group_usage TO authenticated;
GRANT SELECT ON group_member_usage TO authenticated;
GRANT SELECT ON group_expense_usage TO authenticated;
GRANT SELECT ON resource_usage_summary TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. COMENTARIOS Y DOCUMENTACI脫N
-- ----------------------------------------------------------------------------

COMMENT ON FUNCTION enforce_max_groups_per_user IS 
  'Limita usuarios a m谩ximo 50 grupos para prevenir abuso';

COMMENT ON FUNCTION enforce_max_members_per_group IS 
  'Limita grupos a m谩ximo 100 miembros para mantener performance';

COMMENT ON FUNCTION enforce_max_expenses_per_group IS 
  'Limita grupos a m谩ximo 1000 gastos para prevenir crecimiento descontrolado';

COMMENT ON VIEW user_group_usage IS 
  'Muestra cu谩ntos grupos tiene cada usuario y cu谩ntos le quedan disponibles';

COMMENT ON VIEW group_member_usage IS 
  'Muestra cu谩ntos miembros tiene cada grupo y su estado (OK/WARNING/FULL)';

COMMENT ON VIEW group_expense_usage IS 
  'Muestra cu谩ntos gastos tiene cada grupo y su estado (OK/WARNING/FULL)';

COMMENT ON FUNCTION can_add_to_group IS 
  'Verifica si un usuario puede a帽adir recursos a un grupo sin exceder l铆mites';

-- ----------------------------------------------------------------------------
-- 8. VERIFICACI脫N DE INSTALACI脫N
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '鉁呪湌 Resource limits migration completed successfully!';
  RAISE NOTICE 'Functions created: enforce_max_groups_per_user, enforce_max_members_per_group, enforce_max_expenses_per_group';
  RAISE NOTICE 'Triggers created: check_max_groups_per_user, check_max_members_per_group, check_max_expenses_per_group';
  RAISE NOTICE 'Views created: user_group_usage, group_member_usage, group_expense_usage, resource_usage_summary';
  RAISE NOTICE '';
  RAISE NOTICE '馃攽 Resource limits:';
  RAISE NOTICE '  - Max groups per user: 50';
  RAISE NOTICE '  - Max members per group: 100';
  RAISE NOTICE '  - Max expenses per group: 1000';
END $$;
