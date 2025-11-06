-- Drop all existing racing-data policies to start fresh
DROP POLICY IF EXISTS "Team members can view team session files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own racing data" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own racing data files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own racing data" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own racing data files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to racing-data bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own racing data" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own racing data files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files from racing-data" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own racing data files" ON storage.objects;

-- SELECT: Team members can view files from their team's sessions
CREATE POLICY "Team members can view team files"
ON storage.objects
FOR SELECT
TO authenticated
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
      WHERE uf.file_path = storage.objects.name
      AND tm.user_id = auth.uid()
    )
  )
);

-- INSERT: Users can upload their own files
CREATE POLICY "Users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'racing-data'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- DELETE: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'racing-data'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- UPDATE: Users can update their own files
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'racing-data'
  AND auth.uid()::text = (storage.foldername(name))[1]
);