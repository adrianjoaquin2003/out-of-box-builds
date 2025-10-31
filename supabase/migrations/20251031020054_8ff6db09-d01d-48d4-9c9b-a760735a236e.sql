-- Add available_metrics column to sessions table to store detected fields from CSV
ALTER TABLE public.sessions 
ADD COLUMN available_metrics jsonb DEFAULT '[]'::jsonb;