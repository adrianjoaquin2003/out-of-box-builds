-- Convert integer columns to real (float) in telemetry_data
ALTER TABLE telemetry_data 
  ALTER COLUMN lap_number TYPE real,
  ALTER COLUMN gps_sats_used TYPE real,
  ALTER COLUMN engine_speed TYPE real,
  ALTER COLUMN gear TYPE real;