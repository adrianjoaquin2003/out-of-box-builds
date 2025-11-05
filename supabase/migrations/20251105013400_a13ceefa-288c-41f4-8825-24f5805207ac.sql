-- Drop old table and functions
DROP TABLE IF EXISTS telemetry_data CASCADE;
DROP FUNCTION IF EXISTS sample_telemetry_data(uuid, text, integer);
DROP FUNCTION IF EXISTS add_telemetry_column(text, text);

-- Create new optimized telemetry table with hybrid model
CREATE TABLE telemetry_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Core metrics as columns for fast querying
  time real NOT NULL,
  lap_number real,
  lap_time real,
  speed real,
  engine_speed real,
  throttle_position real,
  gps_latitude real,
  gps_longitude real,
  gps_altitude real,
  
  -- All other metrics stored as JSONB (reduces from 500+ columns to 1!)
  metrics jsonb DEFAULT '{}'::jsonb NOT NULL
);

-- Create indexes for optimal performance
CREATE INDEX idx_telemetry_session_time ON telemetry_data (session_id, time);
CREATE INDEX idx_telemetry_file ON telemetry_data (file_id);
CREATE INDEX idx_telemetry_metrics_gin ON telemetry_data USING GIN (metrics jsonb_path_ops);

-- Enable RLS
ALTER TABLE telemetry_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members can insert telemetry data for team sessions"
  ON telemetry_data FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = telemetry_data.session_id
      AND sessions.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users and team members can view telemetry data"
  ON telemetry_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = telemetry_data.session_id
      AND (
        sessions.user_id = auth.uid()
        OR sessions.team_id IN (
          SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete telemetry data for their sessions"
  ON telemetry_data FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = telemetry_data.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- Optimized sampling function for hybrid schema
CREATE OR REPLACE FUNCTION sample_telemetry_data(
  p_session_id uuid,
  p_metric text,
  p_sample_size integer DEFAULT 2000
)
RETURNS TABLE(row_time real, row_value real)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_core_metric boolean;
BEGIN
  -- Check if metric is a core column or in JSONB
  is_core_metric := p_metric IN ('speed', 'engine_speed', 'throttle_position', 'lap_number', 'lap_time', 'gps_latitude', 'gps_longitude', 'gps_altitude');
  
  IF is_core_metric THEN
    -- Query core columns directly (blazing fast)
    RETURN QUERY EXECUTE format(
      'WITH numbered_rows AS (
        SELECT 
          time as row_time,
          %I as row_value,
          ROW_NUMBER() OVER (ORDER BY time) as rn,
          COUNT(*) OVER () as total_count
        FROM telemetry_data
        WHERE session_id = $1
          AND %I IS NOT NULL
      )
      SELECT row_time, row_value
      FROM numbered_rows
      WHERE rn %% GREATEST(1, (total_count / $2)::INTEGER) = 0
         OR rn = total_count
      ORDER BY row_time
      LIMIT $2',
      p_metric,
      p_metric
    )
    USING p_session_id, p_sample_size;
  ELSE
    -- Query from JSONB metrics (still fast with GIN index)
    RETURN QUERY EXECUTE format(
      'WITH numbered_rows AS (
        SELECT 
          time as row_time,
          (metrics->>%L)::real as row_value,
          ROW_NUMBER() OVER (ORDER BY time) as rn,
          COUNT(*) OVER () as total_count
        FROM telemetry_data
        WHERE session_id = $1
          AND metrics ? %L
          AND (metrics->>%L) IS NOT NULL
      )
      SELECT row_time, row_value
      FROM numbered_rows
      WHERE rn %% GREATEST(1, (total_count / $2)::INTEGER) = 0
         OR rn = total_count
      ORDER BY row_time
      LIMIT $2',
      p_metric,
      p_metric,
      p_metric
    )
    USING p_session_id, p_sample_size;
  END IF;
END;
$$;