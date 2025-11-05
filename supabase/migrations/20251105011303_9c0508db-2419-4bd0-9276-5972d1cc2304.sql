-- Update RLS policy to allow team members to view telemetry data for team sessions

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view telemetry data for their sessions" ON telemetry_data;

-- Create new policy that includes team access
CREATE POLICY "Users and team members can view telemetry data"
ON telemetry_data
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM sessions
    WHERE sessions.id = telemetry_data.session_id
      AND (
        sessions.user_id = auth.uid()  -- User's own sessions
        OR
        sessions.team_id IN (  -- Or team sessions
          SELECT team_members.team_id
          FROM team_members
          WHERE team_members.user_id = auth.uid()
        )
      )
  )
);