-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert teams" ON public.teams;

-- Grant INSERT permission to authenticated role on teams table
GRANT INSERT ON public.teams TO authenticated;

-- Create a new simple INSERT policy
CREATE POLICY "allow_authenticated_insert"
ON public.teams
FOR INSERT
WITH CHECK (true);