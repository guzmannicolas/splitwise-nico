-- FIX: Corregir RLS policies de group_invitations
-- Ejecutar DESPUÉS de migration_invitations.sql si da error de permisos

-- Eliminar políticas anteriores
drop policy if exists "Ver invitaciones del grupo o propias" on public.group_invitations;
drop policy if exists "Crear invitaciones como miembro" on public.group_invitations;
drop policy if exists "Actualizar mis invitaciones" on public.group_invitations;

-- Políticas corregidas (sin acceder a auth.users directamente)

-- Ver invitaciones: miembros del grupo o el invitado
create policy "Ver invitaciones del grupo o propias"
  on public.group_invitations for select
  using (
    -- Eres miembro del grupo
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_invitations.group_id
        and gm.user_id = auth.uid()
    )
    or
    -- Es tu email (comparar con profiles.email)
    invited_email = (select email from public.profiles where id = auth.uid())
  );

-- Crear invitaciones: solo miembros del grupo
create policy "Crear invitaciones como miembro"
  on public.group_invitations for insert
  with check (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_invitations.group_id
        and gm.user_id = auth.uid()
    )
  );

-- Actualizar invitaciones: solo el invitado (para aceptar/rechazar)
create policy "Actualizar mis invitaciones"
  on public.group_invitations for update
  using (
    invited_email = (select email from public.profiles where id = auth.uid())
  );

-- ============================================
-- FIX: Función accept_invitation (sin acceso a auth.users)
-- ============================================
create or replace function public.accept_invitation(invitation_token uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_invitation record;
  v_user_id uuid;
  v_user_email text;
begin
  -- Obtener usuario actual
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('success', false, 'message', 'No autenticado');
  end if;

  -- Obtener email del usuario desde profiles (no de auth.users)
  select email into v_user_email from public.profiles where id = v_user_id;
  
  if v_user_email is null then
    return json_build_object('success', false, 'message', 'Perfil no encontrado');
  end if;

  -- Buscar invitación
  select * into v_invitation
  from public.group_invitations
  where token = invitation_token
    and status = 'pending'
    and expires_at > now();

  if not found then
    return json_build_object('success', false, 'message', 'Invitación no válida o expirada');
  end if;

  -- Verificar que el email coincide
  if v_invitation.invited_email != v_user_email then
    return json_build_object('success', false, 'message', 'Esta invitación no es para tu email');
  end if;

  -- Verificar que no sea ya miembro
  if exists (
    select 1 from public.group_members
    where group_id = v_invitation.group_id
      and user_id = v_user_id
  ) then
    return json_build_object('success', false, 'message', 'Ya eres miembro de este grupo');
  end if;

  -- Agregar como miembro
  insert into public.group_members (group_id, user_id)
  values (v_invitation.group_id, v_user_id);

  -- Marcar invitación como aceptada
  update public.group_invitations
  set status = 'accepted',
      accepted_at = now()
  where id = v_invitation.id;

  return json_build_object(
    'success', true,
    'message', 'Te uniste al grupo exitosamente',
    'group_id', v_invitation.group_id
  );
end;
$$;

-- ============================================
-- FIX: Función reject_invitation
-- ============================================
create or replace function public.reject_invitation(invitation_token uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_user_email text;
begin
  -- Obtener email del usuario desde profiles
  select email into v_user_email 
  from public.profiles 
  where id = auth.uid();

  if v_user_email is null then
    return json_build_object('success', false, 'message', 'No autenticado');
  end if;

  -- Actualizar invitación
  update public.group_invitations
  set status = 'rejected'
  where token = invitation_token
    and invited_email = v_user_email
    and status = 'pending';

  if not found then
    return json_build_object('success', false, 'message', 'Invitación no encontrada');
  end if;

  return json_build_object('success', true, 'message', 'Invitación rechazada');
end;
$$;
