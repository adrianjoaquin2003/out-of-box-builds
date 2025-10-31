-- Allow authenticated users to view basic profile info of other users
-- This is needed for team admins to search for and invite members
CREATE POLICY "Users can view other profiles for team invites"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);