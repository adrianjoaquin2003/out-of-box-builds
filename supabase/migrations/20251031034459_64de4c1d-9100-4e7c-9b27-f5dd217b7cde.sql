-- Delete all data from tables in correct order to avoid foreign key constraints

-- Delete dashboard reports first (has foreign keys to dashboards and saved_reports)
DELETE FROM dashboard_reports;

-- Delete saved reports (has foreign key to sessions)
DELETE FROM saved_reports;

-- Delete telemetry data (has foreign key to sessions)
DELETE FROM telemetry_data;

-- Delete uploaded files (has foreign key to sessions)
DELETE FROM uploaded_files;

-- Delete dashboards (has foreign key to teams)
DELETE FROM dashboards;

-- Delete sessions (has foreign key to teams)
DELETE FROM sessions;

-- Delete team members (has foreign key to teams)
DELETE FROM team_members;

-- Clear team associations from profiles
UPDATE profiles SET team_id = NULL WHERE team_id IS NOT NULL;

-- Delete teams (parent table)
DELETE FROM teams;