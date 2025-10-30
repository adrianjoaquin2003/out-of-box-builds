-- Fix infinite recursion in team_members policies
-- The issue is that the INSERT policy references team_members while checking team_members

DROP POLICY IF EXISTS "Team admins can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can remove members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view members of their team" ON public.team_members;

-- Create a security definer function to check if user is team admin
CREATE OR REPLACE FUNCTION is_team_admin(check_team_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = check_team_id
    AND user_id = check_user_id
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a security definer function to check if user is team member
CREATE OR REPLACE FUNCTION is_team_member(check_team_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = check_team_id
    AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate policies using security definer functions
CREATE POLICY "Users can view members of their team"
ON public.team_members
FOR SELECT
USING (is_team_member(team_id, auth.uid()));

CREATE POLICY "Team admins can add members"
ON public.team_members
FOR INSERT
WITH CHECK (is_team_admin(team_id, auth.uid()));

CREATE POLICY "Team admins can remove members"
ON public.team_members
FOR DELETE
USING (is_team_admin(team_id, auth.uid()));

-- Now clear all data
DELETE FROM dashboard_reports;
DELETE FROM dashboards;
DELETE FROM saved_reports;
DELETE FROM telemetry_data;
DELETE FROM uploaded_files;
DELETE FROM sessions;
DELETE FROM team_members;
DELETE FROM profiles WHERE id IN (SELECT id FROM auth.users);
DELETE FROM teams;