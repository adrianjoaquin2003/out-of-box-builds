-- Clear all existing data
DELETE FROM telemetry_data;
DELETE FROM uploaded_files;
DELETE FROM sessions;
DELETE FROM profiles;

-- Drop existing telemetry_data table
DROP TABLE IF EXISTS telemetry_data;

-- Create new telemetry_data table matching MoTeC CSV format
CREATE TABLE public.telemetry_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL,
  file_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Core timing and lap data
  time real,
  lap_number integer,
  lap_time real,
  lap_distance real,
  lap_gain_loss_running real,
  running_lap_time real,
  lap_time_predicted real,
  reference_lap_time real,
  trip_distance real,
  
  -- G-Forces
  g_force_lat real,
  g_force_long real,
  g_force_vert real,
  
  -- Speed
  ground_speed real,
  gps_speed real,
  drive_speed real,
  
  -- GPS data
  gps_latitude real,
  gps_longitude real,
  gps_altitude real,
  gps_heading real,
  gps_sats_used integer,
  gps_time text,
  gps_date text,
  
  -- Engine data
  engine_speed integer,
  engine_oil_pressure real,
  engine_oil_temperature real,
  coolant_temperature real,
  ignition_timing real,
  
  -- Fuel data
  fuel_pressure_sensor real,
  fuel_temperature real,
  fuel_used_m1 real,
  fuel_inj_primary_duty_cycle real,
  
  -- Air and boost
  inlet_manifold_pressure real,
  inlet_air_temperature real,
  boost_pressure real,
  airbox_temperature real,
  
  -- Throttle and pedals
  throttle_position real,
  throttle_pedal real,
  
  -- Transmission
  gear integer,
  gear_detect_value real,
  
  -- Electrical
  bat_volts_ecu real,
  bat_volts_dash real,
  
  -- System
  cpu_usage real,
  device_up_time real,
  comms_rs232_2_diag real,
  dash_temp real
);

-- Enable RLS
ALTER TABLE public.telemetry_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view telemetry data for their sessions"
  ON public.telemetry_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = telemetry_data.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert telemetry data for their sessions"
  ON public.telemetry_data
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = telemetry_data.session_id
      AND sessions.user_id = auth.uid()
    )
  );