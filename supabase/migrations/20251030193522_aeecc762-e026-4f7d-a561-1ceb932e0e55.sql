-- Drop the problematic policy
DROP POLICY IF EXISTS "Allow team creation" ON public.teams;

-- Create a new policy that explicitly checks for authenticated users
CREATE POLICY "Authenticated users can create teams"
ON public.teams
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);