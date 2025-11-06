-- Drop the restrictive policy that only allows users to view their own files
DROP POLICY IF EXISTS "Users can view their own files" ON uploaded_files;

-- Create a new policy that allows team members to view files for sessions in their team
CREATE POLICY "Team members can view team session files"
ON uploaded_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = uploaded_files.session_id
    AND sessions.team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Also allow users to view their own files (for backward compatibility)
CREATE POLICY "Users can view their own files"
ON uploaded_files
FOR SELECT
USING (auth.uid() = user_id);