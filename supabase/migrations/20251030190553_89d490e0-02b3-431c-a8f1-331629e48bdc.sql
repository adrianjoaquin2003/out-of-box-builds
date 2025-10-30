-- Drop existing policy and create a more explicit one
DROP POLICY IF EXISTS "Anyone can create a team" ON public.teams;

-- Create policy that allows authenticated users to insert teams
CREATE POLICY "Authenticated users can create teams"
ON public.teams
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');