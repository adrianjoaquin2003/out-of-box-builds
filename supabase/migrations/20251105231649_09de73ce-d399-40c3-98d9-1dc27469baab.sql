-- Add parquet file path to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS parquet_file_path TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_parquet_file_path ON sessions(parquet_file_path) WHERE parquet_file_path IS NOT NULL;

-- We'll keep telemetry_data table for now in case there's existing data
-- but new uploads will use Parquet files instead