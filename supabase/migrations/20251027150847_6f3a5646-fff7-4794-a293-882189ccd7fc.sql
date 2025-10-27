-- Clear all data from backend tables

-- Delete telemetry data first (has foreign keys)
DELETE FROM telemetry_data;

-- Delete uploaded files
DELETE FROM uploaded_files;

-- Delete sessions
DELETE FROM sessions;

-- Optionally clear profiles (keeping structure)
-- Uncomment if you want to clear profiles too:
-- DELETE FROM profiles;