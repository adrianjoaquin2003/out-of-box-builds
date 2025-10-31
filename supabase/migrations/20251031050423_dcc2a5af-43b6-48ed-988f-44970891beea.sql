-- Create a function to efficiently sample telemetry data
-- This uses row_number and modulo to get evenly distributed samples across the full dataset
CREATE OR REPLACE FUNCTION sample_telemetry_data(
  p_session_id UUID,
  p_metric TEXT,
  p_sample_size INTEGER DEFAULT 2000
)
RETURNS TABLE (
  row_time REAL,
  row_value REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_rows INTEGER;
  sample_rate INTEGER;
BEGIN
  -- Get total number of rows for this session and metric
  SELECT COUNT(*) INTO total_rows
  FROM telemetry_data
  WHERE session_id = p_session_id
    AND (CASE p_metric
      WHEN 'time' THEN "time"
      WHEN 'lap_number' THEN lap_number::REAL
      WHEN 'lap_time' THEN lap_time
      WHEN 'lap_distance' THEN lap_distance
      WHEN 'g_force_lat' THEN g_force_lat
      WHEN 'g_force_long' THEN g_force_long
      WHEN 'g_force_vert' THEN g_force_vert
      WHEN 'ground_speed' THEN ground_speed
      WHEN 'gps_speed' THEN gps_speed
      WHEN 'drive_speed' THEN drive_speed
      WHEN 'engine_speed' THEN engine_speed::REAL
      WHEN 'engine_oil_pressure' THEN engine_oil_pressure
      WHEN 'engine_oil_temperature' THEN engine_oil_temperature
      WHEN 'coolant_temperature' THEN coolant_temperature
      WHEN 'throttle_position' THEN throttle_position
      WHEN 'throttle_pedal' THEN throttle_pedal
      WHEN 'boost_pressure' THEN boost_pressure
      WHEN 'gear' THEN gear::REAL
      ELSE NULL
    END) IS NOT NULL;
  
  -- Calculate sampling rate (every Nth row)
  sample_rate := GREATEST(1, total_rows / p_sample_size);
  
  -- Return sampled data using row_number and modulo
  RETURN QUERY
  WITH numbered_rows AS (
    SELECT 
      td."time",
      (CASE p_metric
        WHEN 'time' THEN td."time"
        WHEN 'lap_number' THEN td.lap_number::REAL
        WHEN 'lap_time' THEN td.lap_time
        WHEN 'lap_distance' THEN td.lap_distance
        WHEN 'g_force_lat' THEN td.g_force_lat
        WHEN 'g_force_long' THEN td.g_force_long
        WHEN 'g_force_vert' THEN td.g_force_vert
        WHEN 'ground_speed' THEN td.ground_speed
        WHEN 'gps_speed' THEN td.gps_speed
        WHEN 'drive_speed' THEN td.drive_speed
        WHEN 'engine_speed' THEN td.engine_speed::REAL
        WHEN 'engine_oil_pressure' THEN td.engine_oil_pressure
        WHEN 'engine_oil_temperature' THEN td.engine_oil_temperature
        WHEN 'coolant_temperature' THEN td.coolant_temperature
        WHEN 'throttle_position' THEN td.throttle_position
        WHEN 'throttle_pedal' THEN td.throttle_pedal
        WHEN 'boost_pressure' THEN td.boost_pressure
        WHEN 'gear' THEN td.gear::REAL
        ELSE NULL
      END) AS metric_value,
      ROW_NUMBER() OVER (ORDER BY td."time") AS row_num
    FROM telemetry_data td
    WHERE td.session_id = p_session_id
      AND (CASE p_metric
        WHEN 'time' THEN td."time"
        WHEN 'lap_number' THEN td.lap_number::REAL
        WHEN 'lap_time' THEN td.lap_time
        WHEN 'lap_distance' THEN td.lap_distance
        WHEN 'g_force_lat' THEN td.g_force_lat
        WHEN 'g_force_long' THEN td.g_force_long
        WHEN 'g_force_vert' THEN td.g_force_vert
        WHEN 'ground_speed' THEN td.ground_speed
        WHEN 'gps_speed' THEN td.gps_speed
        WHEN 'drive_speed' THEN td.drive_speed
        WHEN 'engine_speed' THEN td.engine_speed::REAL
        WHEN 'engine_oil_pressure' THEN td.engine_oil_pressure
        WHEN 'engine_oil_temperature' THEN td.engine_oil_temperature
        WHEN 'coolant_temperature' THEN td.coolant_temperature
        WHEN 'throttle_position' THEN td.throttle_position
        WHEN 'throttle_pedal' THEN td.throttle_pedal
        WHEN 'boost_pressure' THEN td.boost_pressure
        WHEN 'gear' THEN td.gear::REAL
        ELSE NULL
      END) IS NOT NULL
  )
  SELECT 
    numbered_rows."time" AS row_time,
    numbered_rows.metric_value AS row_value
  FROM numbered_rows
  WHERE (numbered_rows.row_num - 1) % sample_rate = 0
  ORDER BY numbered_rows."time";
END;
$$;