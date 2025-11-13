-- Fix: Asegurar que la política de UPDATE permite soft delete
-- Este script corrige el problema "new row violates row-level security policy"

-- 1. Eliminar política de UPDATE si existe (puede tener nombre incorrecto)
drop policy if exists settlements_soft_delete on public.settlements;
drop policy if exists settlements_update on public.settlements;

-- 2. Recrear política de UPDATE que permita soft delete a cualquier miembro del grupo
create policy settlements_update on public.settlements
for update to authenticated
using (
  public.user_is_member_of_group(group_id, auth.uid())
)
with check (
  public.user_is_member_of_group(group_id, auth.uid())
);

-- 3. Recargar cache
notify pgrst, 'reload schema';
