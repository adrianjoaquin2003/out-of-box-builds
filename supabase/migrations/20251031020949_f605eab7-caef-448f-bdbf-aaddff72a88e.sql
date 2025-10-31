-- Clear all telemetry data
DELETE FROM telemetry_data;

-- Reset available_metrics for all sessions
UPDATE sessions SET available_metrics = '[]'::jsonb;