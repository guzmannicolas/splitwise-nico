-- Migration: Sistema de Invitaciones a Grupos
-- Fecha: 2025-11-04
-- Descripción: Agrega tabla de invitaciones y lógica de aceptación

-- ============================================
-- 1. TABLA: group_invitations
-- ============================================
create table if not exists public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  token uuid unique default gen_random_uuid(), -- Token único para el link de aceptación
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days'), -- Expira en 7 días
  accepted_at timestamptz,
  
  -- Evitar invitaciones duplicadas pendientes
  unique(group_id, invited_email, status)
);

-- Índices para performance
create index idx_invitations_email on public.group_invitations(invited_email);
create index idx_invitations_token on public.group_invitations(token);
create index idx_invitations_status on public.group_invitations(status);

-- ============================================
-- 2. RLS POLICIES
-- ============================================
alter table public.group_invitations enable row level security;

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
    -- Es tu email
    invited_email = (select email from auth.users where id = auth.uid())
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
    invited_email = (select email from auth.users where id = auth.uid())
  );

-- ============================================
-- 3. FUNCIÓN: Aceptar Invitación
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

  -- Obtener email del usuario
  select email into v_user_email from auth.users where id = v_user_id;

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
-- 4. FUNCIÓN: Rechazar Invitación
-- ============================================
create or replace function public.reject_invitation(invitation_token uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_user_email text;
begin
  -- Obtener email del usuario
  select email into v_user_email 
  from auth.users 
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

-- ============================================
-- 5. FUNCIÓN: Limpiar Invitaciones Expiradas
-- ============================================
create or replace function public.cleanup_expired_invitations()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.group_invitations
  where status = 'pending'
    and expires_at < now();
end;
$$;

-- ============================================
-- 6. GRANTS
-- ============================================
grant usage on schema public to authenticated, anon;
grant select, insert, update on public.group_invitations to authenticated;
grant execute on function public.accept_invitation to authenticated;
grant execute on function public.reject_invitation to authenticated;

-- ============================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================
-- 1. Frontend debe enviar invitaciones con: email del invitado, group_id
-- 2. Supabase enviará email automático con link: https://tu-dominio.com/accept-invite?token=xxx
-- 3. Página /accept-invite debe llamar a accept_invitation(token)
-- 4. Configurar Email Templates en Supabase Dashboard
