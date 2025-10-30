-- Create dashboards table
CREATE TABLE public.dashboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dashboard_reports junction table
CREATE TABLE public.dashboard_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dashboard_id, report_id)
);

-- Enable RLS on dashboards
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dashboards"
ON public.dashboards
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own dashboards"
ON public.dashboards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboards"
ON public.dashboards
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboards"
ON public.dashboards
FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on dashboard_reports
ALTER TABLE public.dashboard_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dashboard reports for their dashboards"
ON public.dashboard_reports
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM dashboards 
  WHERE dashboards.id = dashboard_reports.dashboard_id 
  AND dashboards.user_id = auth.uid()
));

CREATE POLICY "Users can add reports to their dashboards"
ON public.dashboard_reports
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM dashboards 
  WHERE dashboards.id = dashboard_reports.dashboard_id 
  AND dashboards.user_id = auth.uid()
));

CREATE POLICY "Users can update dashboard reports for their dashboards"
ON public.dashboard_reports
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM dashboards 
  WHERE dashboards.id = dashboard_reports.dashboard_id 
  AND dashboards.user_id = auth.uid()
));

CREATE POLICY "Users can delete dashboard reports for their dashboards"
ON public.dashboard_reports
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM dashboards 
  WHERE dashboards.id = dashboard_reports.dashboard_id 
  AND dashboards.user_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_dashboards_updated_at
BEFORE UPDATE ON public.dashboards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();