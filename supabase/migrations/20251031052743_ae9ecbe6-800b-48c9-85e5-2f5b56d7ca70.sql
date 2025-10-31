-- Allow authenticated users to view all teams so they can discover and join them
CREATE POLICY "Authenticated users can view all teams"
ON public.teams
FOR SELECT
TO authenticated
USING (true);