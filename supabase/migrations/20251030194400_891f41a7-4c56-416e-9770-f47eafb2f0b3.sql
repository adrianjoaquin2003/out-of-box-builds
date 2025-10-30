-- Drop the problematic policy
DROP POLICY IF EXISTS "Allow authenticated users to create teams" ON public.teams;

-- Create a simple policy that just checks authentication
CREATE POLICY "Authenticated users can insert teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (true);