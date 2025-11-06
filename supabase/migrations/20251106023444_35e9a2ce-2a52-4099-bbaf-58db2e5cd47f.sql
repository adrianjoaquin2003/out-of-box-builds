-- Drop existing restrictive storage policies if they exist
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Allow team members to read files from team sessions
CREATE POLICY "Team members can view team session files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'racing-data' 
  AND (
    -- File owner can view
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Team members can view files from their team's sessions
    EXISTS (
      SELECT 1 
      FROM uploaded_files uf
      JOIN sessions s ON s.id = uf.session_id
      JOIN team_members tm ON tm.team_id = s.team_id
      WHERE uf.file_path = name
      AND tm.user_id = auth.uid()
    )
  )
);

-- Allow users to upload their own files
CREATE POLICY "Users can upload to racing-data bucket"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'racing-data'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files from racing-data"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'racing-data'
  AND auth.uid()::text = (storage.foldername(name))[1]
);