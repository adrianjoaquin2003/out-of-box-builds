-- Temporarily create a very permissive policy to test
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;

CREATE POLICY "Allow team creation"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (true);