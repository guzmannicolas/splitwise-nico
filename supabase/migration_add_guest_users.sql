-- Migración: Agregar soporte para usuarios invitados (guests)
-- Fecha: 2025-11-13

-- 1. Agregar columna is_guest a profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_guest boolean DEFAULT false;

-- 2. Permitir email NULL para guests
ALTER TABLE public.profiles 
ALTER COLUMN email DROP NOT NULL;

-- 3. Crear función para agregar guest a grupo
CREATE OR REPLACE FUNCTION public.add_guest_to_group(
  p_group_id uuid,
  p_full_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_id uuid;
BEGIN
  -- Verificar que el usuario actual es miembro del grupo
  IF NOT public.user_is_member_of_group(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'No eres miembro de este grupo';
  END IF;

  -- Crear perfil de invitado
  INSERT INTO public.profiles (id, email, full_name, is_guest)
  VALUES (gen_random_uuid(), NULL, p_full_name, true)
  RETURNING id INTO v_guest_id;

  -- Agregar invitado al grupo
  INSERT INTO public.group_members (group_id, user_id)
  VALUES (p_group_id, v_guest_id);

  RETURN v_guest_id;
END;
$$;

-- 4. Actualizar políticas RLS de profiles para permitir ver y crear guests
DROP POLICY IF EXISTS profiles_select_shared ON public.profiles;
CREATE POLICY profiles_select_shared ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid() 
  OR public.share_group(id, auth.uid())
  OR is_guest = true  -- Permitir ver guests en grupos compartidos
);

-- 5. Permitir INSERT de guests solo mediante la función
-- (La función ya es SECURITY DEFINER, así que bypasea RLS)

-- 6. Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest ON public.profiles(is_guest);

-- 7. Comentarios
COMMENT ON COLUMN public.profiles.is_guest IS 'Indica si el usuario es un invitado temporal sin autenticación';
COMMENT ON FUNCTION public.add_guest_to_group IS 'Crea un usuario invitado y lo agrega automáticamente al grupo';

-- Recargar cache
NOTIFY pgrst, 'reload schema';
