-- ============================================================================
-- MIGRACI脫N: RATE LIMITING Y L脥MITES DE RECURSOS
-- ============================================================================
-- Fecha: 2025-11-15
-- Descripci贸n: Agrega protecci贸n contra abuso de recursos mediante:
--   1. Tabla rate_limits para trackear intentos por usuario/acci贸n
--   2. Funci贸n check_rate_limit para verificar l铆mites
--   3. Triggers para limitar creaci贸n de expenses, invitados, invitaciones
--   4. Job de limpieza autom谩tica de registros expirados
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLA RATE_LIMITS
-- ----------------------------------------------------------------------------
-- Almacena intentos de acciones por usuario dentro de ventanas de tiempo
-- Ejemplo: usuario X intent贸 crear 5 gastos en la 煤ltima hora

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'create_expense', 'add_guest', 'send_invitation'
  attempts integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, action)
);

-- 脥ndice para b煤squedas r谩pidas por usuario + acci贸n
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action 
  ON rate_limits(user_id, action);

-- 脥ndice para limpieza de ventanas expiradas
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start 
  ON rate_limits(window_start);

-- RLS: usuarios solo pueden ver sus propios rate limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits"
  ON rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Sistema puede insertar/actualizar (deshabilitamos RLS para triggers)
-- Nota: Los triggers se ejecutan con permisos de sistema, no de usuario

-- ----------------------------------------------------------------------------
-- 2. FUNCI脫N CHECK_RATE_LIMIT
-- ----------------------------------------------------------------------------
-- Verifica si un usuario puede realizar una acci贸n basado en l铆mites definidos
-- Retorna: TRUE si puede, FALSE si excedi贸 el l铆mite
-- Side effect: Incrementa contador de intentos

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_action text,
  p_max_attempts integer,
  p_window_minutes integer
) RETURNS boolean AS $$
DECLARE
  v_record rate_limits%ROWTYPE;
  v_window_duration interval;
  v_elapsed_seconds integer;
BEGIN
  -- Convertir minutos a intervalo
  v_window_duration := make_interval(mins => p_window_minutes);
  
  -- Buscar registro existente para este usuario + acci贸n
  SELECT * INTO v_record
  FROM rate_limits
  WHERE user_id = p_user_id AND action = p_action;
  
  -- Si no existe registro, crear uno nuevo
  IF NOT FOUND THEN
    INSERT INTO rate_limits (user_id, action, attempts, window_start)
    VALUES (p_user_id, p_action, 1, now());
    RETURN TRUE; -- Primera vez, permitir
  END IF;
  
  -- Calcular tiempo transcurrido desde el inicio de la ventana
  v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_record.window_start));
  
  -- Si la ventana expir贸, resetear contador
  IF v_elapsed_seconds > EXTRACT(EPOCH FROM v_window_duration) THEN
    UPDATE rate_limits
    SET attempts = 1, window_start = now(), updated_at = now()
    WHERE user_id = p_user_id AND action = p_action;
    RETURN TRUE; -- Nueva ventana, permitir
  END IF;
  
  -- Si a煤n est谩 dentro de la ventana y no excedi贸 el l铆mite
  IF v_record.attempts < p_max_attempts THEN
    UPDATE rate_limits
    SET attempts = attempts + 1, updated_at = now()
    WHERE user_id = p_user_id AND action = p_action;
    RETURN TRUE; -- Dentro del l铆mite, permitir
  END IF;
  
  -- Excedi贸 el l铆mite
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3. TRIGGERS PARA RATE LIMITING
-- ----------------------------------------------------------------------------

-- 3A. LIMITAR CREACI脫N DE GASTOS (50 por hora por usuario)
CREATE OR REPLACE FUNCTION enforce_expense_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_allowed boolean;
BEGIN
  -- Verificar rate limit: 50 gastos por hora
  v_allowed := check_rate_limit(
    auth.uid(),
    'create_expense',
    50,  -- m谩ximo 50 intentos
    60   -- ventana de 60 minutos
  );
  
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit exceeded: You can only create 50 expenses per hour. Please try again later.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_expense_rate_limit
  BEFORE INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION enforce_expense_rate_limit();

-- 3B. LIMITAR ADICI脫N DE INVITADOS (10 por hora por usuario)
CREATE OR REPLACE FUNCTION enforce_guest_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_allowed boolean;
BEGIN
  -- Solo aplicar a invitados (user_id NULL o no registrado)
  -- Si es un miembro registrado acept谩ndose por invitaci贸n, no limitar
  IF NEW.user_id IS NULL THEN
    v_allowed := check_rate_limit(
      auth.uid(),
      'add_guest',
      25,  -- m谩ximo 25 invitados por hora
      60   -- ventana de 60 minutos
    );
    
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Rate limit exceeded: You can only add 25 guests per hour. Please try again later.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_guest_rate_limit
  BEFORE INSERT ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION enforce_guest_rate_limit();

-- 3C. LIMITAR ENV脥O DE INVITACIONES (5 por hora por usuario)
CREATE OR REPLACE FUNCTION enforce_invitation_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_allowed boolean;
BEGIN
  v_allowed := check_rate_limit(
    auth.uid(),
    'send_invitation',
    25,   -- m谩ximo 25 invitaciones por hora
    60   -- ventana de 60 minutos
  );
  
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit exceeded: You can only send 25 invitations per hour. Please try again later.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_invitation_rate_limit
  BEFORE INSERT ON group_invitations
  FOR EACH ROW
  EXECUTE FUNCTION enforce_invitation_rate_limit();

-- ----------------------------------------------------------------------------
-- 4. LIMPIEZA AUTOM脕TICA DE REGISTROS EXPIRADOS
-- ----------------------------------------------------------------------------
-- Usa pg_cron para borrar registros de ventanas que ya expiraron (>2 horas)
-- NOTA: pg_cron debe estar habilitado en tu proyecto de Supabase
-- Dashboard > Database > Extensions > pg_cron (enable)

-- Verificar si pg_cron está disponible
DO $$
BEGIN
  -- Intentar crear extensión si no existe
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  
  RAISE NOTICE 'pg_cron extension enabled';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not enable pg_cron extension. You may need to enable it manually in Supabase Dashboard.';
END $$;

-- Programar job de limpieza cada hora (fuera del bloque DO)
-- Si ya existe un job con este nombre, primero lo eliminamos
SELECT cron.unschedule('cleanup-rate-limits') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rate-limits'
);

-- Crear el job de limpieza
SELECT cron.schedule(
  'cleanup-rate-limits',           -- nombre del job
  '0 * * * *',                     -- cada hora en punto (cron format)
  'DELETE FROM rate_limits WHERE window_start < now() - interval ''2 hours'''
);

-- ----------------------------------------------------------------------------
-- 5. COMENTARIOS Y DOCUMENTACI脫N
-- ----------------------------------------------------------------------------

COMMENT ON TABLE rate_limits IS 
  'Trackea intentos de acciones por usuario para implementar rate limiting y prevenir abuso';

COMMENT ON COLUMN rate_limits.action IS 
  'Tipo de acci贸n: create_expense, add_guest, send_invitation, etc.';

COMMENT ON COLUMN rate_limits.attempts IS 
  'N煤mero de intentos desde window_start';

COMMENT ON COLUMN rate_limits.window_start IS 
  'Inicio de la ventana de tiempo actual. Se resetea cuando expira.';

COMMENT ON FUNCTION check_rate_limit IS 
  'Verifica si un usuario puede realizar una acci贸n. Retorna TRUE si est谩 dentro del l铆mite, FALSE si lo excedi贸.';

-- ----------------------------------------------------------------------------
-- 6. VERIFICACI脫N DE INSTALACI脫N
-- ----------------------------------------------------------------------------

-- Consulta para verificar que todo se instal贸 correctamente
DO $$
BEGIN
  RAISE NOTICE '鉁呪湌 Rate limiting migration completed successfully!';
  RAISE NOTICE 'Tables created: rate_limits';
  RAISE NOTICE 'Functions created: check_rate_limit, enforce_expense_rate_limit, enforce_guest_rate_limit, enforce_invitation_rate_limit';
  RAISE NOTICE 'Triggers created: check_expense_rate_limit, check_guest_rate_limit, check_invitation_rate_limit';
  RAISE NOTICE '';
  RAISE NOTICE '馃攷 Current rate limits:';
  RAISE NOTICE '  - Expenses: 50 per hour';
  RAISE NOTICE '  - Guests: 25 per hour';
  RAISE NOTICE '  - Invitations: 25 per hour';
END $$;
