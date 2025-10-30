-- Drop and recreate the INSERT policy for teams to ensure it works correctly
DROP POLICY IF EXISTS "Anyone can create a team" ON public.teams;

CREATE POLICY "Anyone can create a team"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (true);