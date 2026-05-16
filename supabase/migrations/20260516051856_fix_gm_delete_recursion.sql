-- Fix infinite recursion in gm_delete policy
-- The previous policy was checking if user is member by querying group_members itself
-- causing infinite recursion. Now we check if user is the group owner instead.

DROP POLICY IF EXISTS "gm_delete" ON group_members;

CREATE POLICY "gm_delete"
ON group_members FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    SELECT created_by FROM groups
    WHERE id = group_members.group_id
  ) = auth.uid()
);
