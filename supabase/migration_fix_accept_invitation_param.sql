-- Migration: Fix accept_invitation parameter name to match client payload
-- Replaces function signature to accept `invitation_token uuid` (client sends that key)

create or replace function public.accept_invitation(invitation_token uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_invitation group_invitations%ROWTYPE;
  v_result json;
begin
  -- Buscar invitación por token
  SELECT * INTO v_invitation
  FROM group_invitations
  WHERE token = invitation_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found'
      USING HINT = 'The invitation link may be invalid';
  END IF;

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

  -- Marcar aceptada
  UPDATE group_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE token = invitation_token;

  -- Agregar usuario al grupo
  INSERT INTO group_members (group_id, user_id)
  VALUES (v_invitation.group_id, auth.uid())
  ON CONFLICT (group_id, user_id) DO NOTHING;

  -- Retornar info
  SELECT json_build_object(
    'success', true,
    'message', 'Te uniste al grupo exitosamente',
    'group_id', v_invitation.group_id
  ) INTO v_result;

  RETURN v_result;
end;
$$;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
