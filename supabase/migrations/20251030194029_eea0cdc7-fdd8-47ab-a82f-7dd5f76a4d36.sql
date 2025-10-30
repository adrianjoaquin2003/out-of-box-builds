-- Re-enable RLS on teams table
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Drop and recreate the INSERT policy with explicit role check
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;

CREATE POLICY "Allow authenticated users to create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');