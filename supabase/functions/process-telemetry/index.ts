import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelemetryRow {
  session_id: string;
  file_id: string;
  time?: number;
  lap_number?: number;
  lap_time?: number;
  lap_distance?: number;
  lap_gain_loss_running?: number;
  running_lap_time?: number;
  lap_time_predicted?: number;
  reference_lap_time?: number;
  trip_distance?: number;
  g_force_lat?: number;
  g_force_long?: number;
  g_force_vert?: number;
  ground_speed?: number;
  gps_speed?: number;
  drive_speed?: number;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_altitude?: number;
  gps_heading?: number;
  gps_sats_used?: number;
  gps_time?: string;
  gps_date?: string;
  engine_speed?: number;
  engine_oil_pressure?: number;
  engine_oil_temperature?: number;
  coolant_temperature?: number;
  ignition_timing?: number;
  fuel_pressure_sensor?: number;
  fuel_temperature?: number;
  fuel_used_m1?: number;
  fuel_inj_primary_duty_cycle?: number;
  inlet_manifold_pressure?: number;
  inlet_air_temperature?: number;
  boost_pressure?: number;
  airbox_temperature?: number;
  throttle_position?: number;
  throttle_pedal?: number;
  gear?: number;
  gear_detect_value?: number;
  bat_volts_ecu?: number;
  bat_volts_dash?: number;
  cpu_usage?: number;
  device_up_time?: number;
  comms_rs232_2_diag?: number;
  dash_temp?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { fileId, sessionId } = await req.json();
    console.log('Processing telemetry file:', { fileId, sessionId });

    await supabase
      .from('uploaded_files')
      .update({ upload_status: 'processing' })
      .eq('id', fileId);

    EdgeRuntime.waitUntil(processData(supabase, fileId, sessionId));

    return new Response(
      JSON.stringify({ message: 'Processing started' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 202 }
    );
  } catch (error) {
    console.error('Error initiating processing:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function processData(supabase: any, fileId: string, sessionId: string) {
  try {
    console.log('Starting background processing for file:', fileId);

    const { data: fileData, error: fileError } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError) throw fileError;
    console.log('File data:', fileData);

    const { data: fileContent, error: downloadError } = await supabase
      .storage
      .from('racing-data')
      .download(fileData.file_path);

    if (downloadError) throw downloadError;
    console.log('File downloaded successfully, size:', fileContent.size);

    const text = await fileContent.text();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    console.log('Total lines in file:', lines.length);

    // MoTeC CSV format: metadata ends at line 14, column names at line 15, units at line 16, data starts at line 17
    if (lines.length < 17) {
      throw new Error('File too short to be a valid MoTeC CSV');
    }

    // Parse column names from line 15 (index 14)
    const headerLine = lines[14];
    const headers = headerLine.split(',').map(h => h.trim());
    
    // Parse units from line 16 (index 15)
    const unitsLine = lines[15];
    const units = unitsLine.split(',').map(u => u.trim());
    
    console.log('CSV Headers (first 10):', headers.slice(0, 10));
    console.log('CSV Units (first 10):', units.slice(0, 10));
    console.log('Total columns:', headers.length);

    // Create mapping from CSV headers to database columns
    const columnMap: Record<string, string> = {
      'Time': 'time',
      'Lap Number': 'lap_number',
      'Lap Time': 'lap_time',
      'Lap Distance': 'lap_distance',
      'Lap Gain/Loss Running': 'lap_gain_loss_running',
      'Running Lap Time': 'running_lap_time',
      'Lap Time Predicted': 'lap_time_predicted',
      'Reference Lap Time': 'reference_lap_time',
      'Trip Distance': 'trip_distance',
      'G Force Lat': 'g_force_lat',
      'G Force Long': 'g_force_long',
      'G Force Vert': 'g_force_vert',
      'Ground Speed': 'ground_speed',
      'GPS Speed': 'gps_speed',
      'Drive Speed': 'drive_speed',
      'GPS Latitude': 'gps_latitude',
      'GPS Longitude': 'gps_longitude',
      'GPS Altitude': 'gps_altitude',
      'GPS Heading': 'gps_heading',
      'GPS Sats Used': 'gps_sats_used',
      'GPS Time': 'gps_time',
      'GPS Date': 'gps_date',
      'Engine Speed': 'engine_speed',
      'Engine Oil Pressure': 'engine_oil_pressure',
      'Engine Oil Temperature': 'engine_oil_temperature',
      'Coolant Temperature': 'coolant_temperature',
      'Ignition Timing': 'ignition_timing',
      'Fuel Pressure Sensor': 'fuel_pressure_sensor',
      'Fuel Temperature': 'fuel_temperature',
      'Fuel Used M1': 'fuel_used_m1',
      'Fuel Inj Primary Duty Cycle': 'fuel_inj_primary_duty_cycle',
      'Inlet Manifold Pressure': 'inlet_manifold_pressure',
      'Inlet Air Temperature': 'inlet_air_temperature',
      'Boost Pressure': 'boost_pressure',
      'Airbox Temperature': 'airbox_temperature',
      'Throttle Position': 'throttle_position',
      'Throttle Pedal': 'throttle_pedal',
      'Gear': 'gear',
      'Gear Detect Value': 'gear_detect_value',
      'Bat Volts ECU': 'bat_volts_ecu',
      'Bat Volts Dash': 'bat_volts_dash',
      'CPU Usage': 'cpu_usage',
      'Device Up Time': 'device_up_time',
      'Comms RS232-2 Diag': 'comms_rs232_2_diag',
      'Dash Temp': 'dash_temp'
    };

    // Parse data rows (starting from line 17, index 16)
    const telemetryData: TelemetryRow[] = [];
    for (let i = 16; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      const row: TelemetryRow = {
        session_id: sessionId,
        file_id: fileId
      };

      // Map each column to database field
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const dbColumn = columnMap[header];
        const unit = units[j] || '';
        
        if (dbColumn && values[j] !== undefined && values[j] !== '') {
          const value = values[j];
          
          // Handle string fields
          if (dbColumn === 'gps_time' || dbColumn === 'gps_date') {
            row[dbColumn] = value;
          } else {
            // Parse numeric values
            let numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              // Convert speed units to km/h
              if ((dbColumn === 'ground_speed' || dbColumn === 'gps_speed' || dbColumn === 'drive_speed')) {
                if (unit.toLowerCase() === 'm/s') {
                  numValue = numValue * 3.6; // m/s to km/h
                } else if (unit.toLowerCase() === 'mph') {
                  numValue = numValue * 1.60934; // mph to km/h
                } else if (unit.toLowerCase().includes('km/h') || unit.toLowerCase().includes('kph')) {
                  // Already in km/h, no conversion needed
                } else {
                  // If unit is unknown, assume it needs conversion from m/s (common default)
                  console.log(`Unknown speed unit '${unit}' for ${header}, assuming m/s`);
                  numValue = numValue * 3.6;
                }
              }
              row[dbColumn] = numValue;
            }
          }
        }
      }

      telemetryData.push(row);
    }

    console.log('Parsed', telemetryData.length, 'telemetry records');

    if (telemetryData.length === 0) {
      throw new Error('No valid telemetry data found in file');
    }

    // Insert in batches of 1000
    const batchSize = 1000;
    for (let i = 0; i < telemetryData.length; i += batchSize) {
      const batch = telemetryData.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('telemetry_data')
        .insert(batch);

      if (insertError) {
        console.error('Error inserting batch:', insertError);
        throw insertError;
      }
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(telemetryData.length / batchSize)}`);
    }

    await supabase
      .from('uploaded_files')
      .update({ upload_status: 'processed' })
      .eq('id', fileId);

    console.log('File processing completed successfully');
  } catch (error) {
    console.error('Background processing error:', error);
    console.error('Error details:', { message: error.message, stack: error.stack });
    
    await supabase
      .from('uploaded_files')
      .update({ upload_status: 'failed' })
      .eq('id', fileId);
    
    console.log('File status updated to failed');
  }
}