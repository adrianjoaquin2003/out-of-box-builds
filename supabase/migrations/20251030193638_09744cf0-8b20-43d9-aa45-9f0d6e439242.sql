-- Drop the policy with wrong role
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;

-- Create policy for authenticated users (not public role)
CREATE POLICY "Authenticated users can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (true);