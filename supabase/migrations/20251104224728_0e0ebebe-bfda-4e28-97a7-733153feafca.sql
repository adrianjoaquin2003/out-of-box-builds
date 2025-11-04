-- Create a function to safely add columns to telemetry_data table
CREATE OR REPLACE FUNCTION public.add_telemetry_column(
  column_name text,
  column_type text DEFAULT 'real'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate column name (alphanumeric and underscores only)
  IF column_name !~ '^[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid column name: %', column_name;
  END IF;
  
  -- Validate column type
  IF column_type NOT IN ('real', 'text', 'integer', 'boolean') THEN
    RAISE EXCEPTION 'Invalid column type: %', column_type;
  END IF;
  
  -- Add column if it doesn't exist
  EXECUTE format(
    'ALTER TABLE public.telemetry_data ADD COLUMN IF NOT EXISTS %I %s',
    column_name,
    column_type
  );
  
  RAISE NOTICE 'Added column % to telemetry_data', column_name;
END;
$$;