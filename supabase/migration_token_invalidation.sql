-- ============================================================================
-- MIGRACI脫N: INVALIDACI脫N DE TOKENS DE INVITACI脫N
-- ============================================================================
-- Fecha: 2025-11-15
-- Descripci贸n: Previene reutilizaci贸n de tokens de invitaci贸n mediante:
--   1. Agregar campo used_at para registrar cu谩ndo se us贸 el token
--   2. Trigger que valida que el token no fue usado y no expir贸
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AGREGAR CAMPO USED_AT
-- ----------------------------------------------------------------------------
-- Registra cu谩ndo se acept贸 la invitaci贸n (1era vez que se us贸 el token)

ALTER TABLE group_invitations 
  ADD COLUMN IF NOT EXISTS used_at timestamptz DEFAULT NULL;

-- 脥ndice para buscar tokens usados r谩pidamente
CREATE INDEX IF NOT EXISTS idx_group_invitations_used_at 
  ON group_invitations(used_at) WHERE used_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. TRIGGER PARA INVALIDAR TOKENS USADOS
-- ----------------------------------------------------------------------------
-- Valida que:
--   - Token no fue usado previamente (used_at IS NULL)
--   - Token no expir贸 (expires_at > now())
--   - No se puede cambiar de 'accepted' a otro estado (prevent茅 rollback)

CREATE OR REPLACE FUNCTION validate_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo validar cuando se cambia el status a 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    
    -- Verificar que token no fue usado previamente
    IF OLD.used_at IS NOT NULL THEN
      RAISE EXCEPTION 'This invitation has already been used on %', OLD.used_at
        USING HINT = 'Invitation tokens can only be used once';
    END IF;
    
    -- Verificar que token no expir贸
    IF NEW.expires_at < now() THEN
      RAISE EXCEPTION 'This invitation expired on %', NEW.expires_at
        USING HINT = 'Request a new invitation from the group admin';
    END IF;
    
    -- Registrar cu谩ndo se us贸 el token
    NEW.used_at := now();
  END IF;
  
  -- Prevenir que se revierta una invitaci贸n aceptada
  IF OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
    RAISE EXCEPTION 'Cannot change status of an accepted invitation'
      USING HINT = 'Accepted invitations are final';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger BEFORE UPDATE
CREATE TRIGGER check_invitation_token_validity
  BEFORE UPDATE ON group_invitations
  FOR EACH ROW
  EXECUTE FUNCTION validate_invitation_token();

-- ----------------------------------------------------------------------------
-- 3. FUNCIÓN HELPER PARA ACEPTAR INVITACIONES
-- ----------------------------------------------------------------------------
-- Función segura para aceptar invitaciones que verifica todas las condiciones

-- Eliminar función anterior si existe (puede tener parámetros diferentes)
-- Necesitamos DROP explícito porque estamos cambiando el nombre del parámetro
DROP FUNCTION IF EXISTS accept_invitation(uuid) CASCADE;

-- Crear nueva función con parámetro p_token
CREATE FUNCTION accept_invitation(p_token uuid)
RETURNS json AS $$
DECLARE
  v_invitation group_invitations%ROWTYPE;
  v_result json;
BEGIN
  -- Buscar invitaci贸n por token
  SELECT * INTO v_invitation
  FROM group_invitations
  WHERE token = p_token;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found'
      USING HINT = 'The invitation link may be invalid';
  END IF;
  
  -- Validaciones (tambi茅n las hace el trigger, pero mejor ser expl铆cito)
  IF v_invitation.status = 'accepted' THEN
    RAISE EXCEPTION 'This invitation has already been used'
      USING HINT = 'You are already a member of this group';
  END IF;
  
  IF v_invitation.expires_at < now() THEN
    RAISE EXCEPTION 'This invitation has expired'
      USING HINT = 'Request a new invitation from the group admin';
  END IF;
  
  IF v_invitation.status = 'rejected' THEN
    RAISE EXCEPTION 'This invitation was rejected'
      USING HINT = 'Request a new invitation from the group admin';
  END IF;
  
  -- Actualizar status (trigger se encargar谩 de validar y setear used_at)
  UPDATE group_invitations
  SET status = 'accepted'
  WHERE token = p_token;
  
  -- Agregar usuario al grupo
  INSERT INTO group_members (group_id, user_id)
  VALUES (v_invitation.group_id, auth.uid())
  ON CONFLICT (group_id, user_id) DO NOTHING; -- Por si ya es miembro
  
  -- Retornar informaci贸n del grupo
  SELECT json_build_object(
    'group_id', v_invitation.group_id,
    'invited_by', v_invitation.invited_by,
    'accepted_at', now()
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 4. VISTA PARA MONITOREAR INVITACIONES
-- ----------------------------------------------------------------------------
-- 脷til para detectar patrones de abuso (mismo usuario enviando muchas invitaciones)

CREATE OR REPLACE VIEW invitation_stats AS
SELECT 
  invited_by,
  status,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE used_at IS NOT NULL) as used_count,
  COUNT(*) FILTER (WHERE expires_at < now()) as expired_count,
  MAX(created_at) as last_invitation_sent
FROM group_invitations
GROUP BY invited_by, status;

-- ----------------------------------------------------------------------------
-- 5. POL脥TICAS RLS ACTUALIZADAS
-- ----------------------------------------------------------------------------
-- Asegurar que usuarios solo puedan ver invitaciones relevantes

-- Drop pol铆ticas antiguas si existen
DROP POLICY IF EXISTS "Users can view invitations they sent" ON group_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON group_invitations;

-- Pol铆tica: Ver invitaciones que enviaste
CREATE POLICY "Users can view invitations they sent"
  ON group_invitations FOR SELECT
  USING (auth.uid() = invited_by);

-- Pol铆tica: Ver invitaciones enviadas a tu email
CREATE POLICY "Users can view invitations sent to them"
  ON group_invitations FOR SELECT
  USING (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Pol铆tica: Aceptar invitaciones enviadas a tu email
CREATE POLICY "Users can accept invitations sent to them"
  ON group_invitations FOR UPDATE
  USING (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
  )
  WITH CHECK (status = 'accepted');

-- ----------------------------------------------------------------------------
-- 6. COMENTARIOS Y DOCUMENTACI脫N
-- ----------------------------------------------------------------------------

COMMENT ON COLUMN group_invitations.used_at IS 
  'Timestamp de cu谩ndo se acept贸 la invitaci贸n por primera vez. NULL si no se us贸 a煤n.';

COMMENT ON FUNCTION validate_invitation_token IS 
  'Trigger que previene reutilizaci贸n de tokens y valida expiraci贸n';

COMMENT ON FUNCTION accept_invitation IS 
  'Funci贸n segura para aceptar invitaciones con todas las validaciones necesarias';

COMMENT ON VIEW invitation_stats IS 
  'Estad铆sticas de invitaciones por usuario para detectar abuso';

-- ----------------------------------------------------------------------------
-- 7. VERIFICACI脫N DE INSTALACI脫N
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '鉁呪湌 Invitation token invalidation migration completed!';
  RAISE NOTICE 'Columns added: used_at to group_invitations';
  RAISE NOTICE 'Functions created: validate_invitation_token, accept_invitation';
  RAISE NOTICE 'Triggers created: check_invitation_token_validity';
  RAISE NOTICE 'Views created: invitation_stats';
  RAISE NOTICE '';
  RAISE NOTICE '馃攼 Tokens can now only be used once and expire after 7 days';
END $$;
