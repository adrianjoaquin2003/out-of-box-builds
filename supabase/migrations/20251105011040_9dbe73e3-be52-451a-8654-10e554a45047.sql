-- Create function to efficiently sample telemetry data
-- This avoids timeout issues with large datasets by sampling evenly

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
AS $$
BEGIN
  -- Use a window function to sample evenly across the dataset
  -- This is much faster than ORDER BY RANDOM() or TABLESAMPLE
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
       OR rn = total_count  -- Always include the last row
    ORDER BY row_time
    LIMIT $2',
    p_metric,
    p_metric
  )
  USING p_session_id, p_sample_size;
END;
$$;