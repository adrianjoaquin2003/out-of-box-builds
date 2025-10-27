-- Create storage policies for the racing-data bucket

-- Allow users to upload their own files
CREATE POLICY "Users can upload their own racing data"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'racing-data' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own files
CREATE POLICY "Users can view their own racing data"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'racing-data' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own racing data"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'racing-data' AND
  (storage.foldername(name))[1] = auth.uid()::text
);