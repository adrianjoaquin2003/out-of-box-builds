-- Create saved_reports table
CREATE TABLE public.saved_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  charts_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view reports for their sessions"
ON public.saved_reports
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM sessions 
  WHERE sessions.id = saved_reports.session_id 
  AND sessions.user_id = auth.uid()
));

CREATE POLICY "Users can create reports for their sessions"
ON public.saved_reports
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM sessions 
  WHERE sessions.id = saved_reports.session_id 
  AND sessions.user_id = auth.uid()
));

CREATE POLICY "Users can update reports for their sessions"
ON public.saved_reports
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM sessions 
  WHERE sessions.id = saved_reports.session_id 
  AND sessions.user_id = auth.uid()
));

CREATE POLICY "Users can delete reports for their sessions"
ON public.saved_reports
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM sessions 
  WHERE sessions.id = saved_reports.session_id 
  AND sessions.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_saved_reports_updated_at
BEFORE UPDATE ON public.saved_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();