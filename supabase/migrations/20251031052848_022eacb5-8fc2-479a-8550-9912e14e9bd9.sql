-- Allow users to add themselves as members (not admins) to any team
CREATE POLICY "Users can join teams as members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND role = 'member'
);