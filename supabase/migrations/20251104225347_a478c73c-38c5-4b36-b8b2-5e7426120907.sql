-- Add progress tracking column to uploaded_files table
ALTER TABLE public.uploaded_files 
ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0 CHECK (processing_progress >= 0 AND processing_progress <= 100);