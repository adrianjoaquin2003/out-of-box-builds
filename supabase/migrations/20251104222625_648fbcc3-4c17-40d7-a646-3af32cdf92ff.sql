-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can insert telemetry data for their sessions" ON public.telemetry_data;

-- Create new policy allowing team members to insert data for team sessions
CREATE POLICY "Team members can insert telemetry data for team sessions"
ON public.telemetry_data
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = telemetry_data.session_id
    AND sessions.team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  )
);