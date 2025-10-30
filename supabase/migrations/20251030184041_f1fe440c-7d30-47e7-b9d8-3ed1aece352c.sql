-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_members junction table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Add team_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add team_id to sessions
ALTER TABLE public.sessions 
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team"
ON public.teams
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = teams.id 
  AND team_members.user_id = auth.uid()
));

CREATE POLICY "Team admins can update their team"
ON public.teams
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = teams.id 
  AND team_members.user_id = auth.uid()
  AND team_members.role = 'admin'
));

-- Enable RLS on team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their team"
ON public.team_members
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM team_members tm
  WHERE tm.team_id = team_members.team_id 
  AND tm.user_id = auth.uid()
));

CREATE POLICY "Team admins can add members"
ON public.team_members
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = team_members.team_id
  AND team_members.user_id = auth.uid()
  AND team_members.role = 'admin'
));

CREATE POLICY "Team admins can remove members"
ON public.team_members
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM team_members tm
  WHERE tm.team_id = team_members.team_id 
  AND tm.user_id = auth.uid()
  AND tm.role = 'admin'
));

-- Update sessions RLS policies to be team-based
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.sessions;

CREATE POLICY "Team members can view team sessions"
ON public.sessions
FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can create team sessions"
ON public.sessions
FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can update team sessions"
ON public.sessions
FOR UPDATE
USING (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can delete team sessions"
ON public.sessions
FOR DELETE
USING (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);

-- Update saved_reports RLS policies to be team-based
DROP POLICY IF EXISTS "Users can view reports for their sessions" ON public.saved_reports;
DROP POLICY IF EXISTS "Users can create reports for their sessions" ON public.saved_reports;
DROP POLICY IF EXISTS "Users can update reports for their sessions" ON public.saved_reports;
DROP POLICY IF EXISTS "Users can delete reports for their sessions" ON public.saved_reports;

CREATE POLICY "Team members can view team reports"
ON public.saved_reports
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM sessions 
  WHERE sessions.id = saved_reports.session_id 
  AND sessions.team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Team members can create team reports"
ON public.saved_reports
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM sessions 
  WHERE sessions.id = saved_reports.session_id 
  AND sessions.team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Team members can update team reports"
ON public.saved_reports
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM sessions 
  WHERE sessions.id = saved_reports.session_id 
  AND sessions.team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Team members can delete team reports"
ON public.saved_reports
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM sessions 
  WHERE sessions.id = saved_reports.session_id 
  AND sessions.team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
));

-- Update dashboards RLS policies to be team-based
DROP POLICY IF EXISTS "Users can view their own dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Users can create their own dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Users can update their own dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Users can delete their own dashboards" ON public.dashboards;

ALTER TABLE public.dashboards ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

CREATE POLICY "Team members can view team dashboards"
ON public.dashboards
FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can create team dashboards"
ON public.dashboards
FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can update team dashboards"
ON public.dashboards
FOR UPDATE
USING (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can delete team dashboards"
ON public.dashboards
FOR DELETE
USING (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);

-- Update dashboard_reports RLS policies
DROP POLICY IF EXISTS "Users can view dashboard reports for their dashboards" ON public.dashboard_reports;
DROP POLICY IF EXISTS "Users can add reports to their dashboards" ON public.dashboard_reports;
DROP POLICY IF EXISTS "Users can update dashboard reports for their dashboards" ON public.dashboard_reports;
DROP POLICY IF EXISTS "Users can delete dashboard reports for their dashboards" ON public.dashboard_reports;

CREATE POLICY "Team members can view team dashboard reports"
ON public.dashboard_reports
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM dashboards 
  WHERE dashboards.id = dashboard_reports.dashboard_id 
  AND dashboards.team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Team members can add reports to team dashboards"
ON public.dashboard_reports
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM dashboards 
  WHERE dashboards.id = dashboard_reports.dashboard_id 
  AND dashboards.team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Team members can update team dashboard reports"
ON public.dashboard_reports
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM dashboards 
  WHERE dashboards.id = dashboard_reports.dashboard_id 
  AND dashboards.team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Team members can delete team dashboard reports"
ON public.dashboard_reports
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM dashboards 
  WHERE dashboards.id = dashboard_reports.dashboard_id 
  AND dashboards.team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
));

-- Add trigger for teams updated_at
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to automatically assign team_id to profiles when user joins a team
CREATE OR REPLACE FUNCTION sync_profile_team()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET team_id = NEW.team_id 
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sync_profile_team_on_member_add
AFTER INSERT ON team_members
FOR EACH ROW
EXECUTE FUNCTION sync_profile_team();