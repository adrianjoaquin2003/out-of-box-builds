-- Check if user_role enum exists and add values if needed
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('driver', 'engineer', 'team_manager');
    END IF;
END $$;

-- Create sessions table for track sessions
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  session_type TEXT NOT NULL, -- 'practice', 'qualifying', 'race', etc.
  track_name TEXT,
  date DATE,
  weather_conditions TEXT,
  driver_name TEXT,
  car_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create uploaded_files table for CSV data
CREATE TABLE public.uploaded_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  upload_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processed', 'error'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create telemetry_data table for parsed CSV data
CREATE TABLE public.telemetry_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  lap_number INTEGER,
  time_seconds REAL,
  speed REAL,
  rpm INTEGER,
  throttle_position REAL,
  brake_pressure REAL,
  gear INTEGER,
  latitude REAL,
  longitude REAL,
  sector_time REAL,
  delta_time REAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sessions
CREATE POLICY "Users can view their own sessions" 
ON public.sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
ON public.sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON public.sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" 
ON public.sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for uploaded_files
CREATE POLICY "Users can view their own files" 
ON public.uploaded_files 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own files" 
ON public.uploaded_files 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files" 
ON public.uploaded_files 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" 
ON public.uploaded_files 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for telemetry_data
CREATE POLICY "Users can view telemetry data for their sessions" 
ON public.telemetry_data 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = telemetry_data.session_id 
    AND sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert telemetry data for their sessions" 
ON public.telemetry_data 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = telemetry_data.session_id 
    AND sessions.user_id = auth.uid()
  )
);

-- Create storage bucket for CSV files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('racing-data', 'racing-data', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload their own racing data files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'racing-data' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own racing data files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'racing-data' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own racing data files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'racing-data' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own racing data files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'racing-data' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create triggers for timestamp updates
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();