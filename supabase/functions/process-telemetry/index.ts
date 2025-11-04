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

    // Get decompression stream based on file type
    let stream: ReadableStream<Uint8Array>;
    if (fileData.file_name.endsWith('.deflate')) {
      console.log('Setting up deflate decompression stream...');
      stream = fileContent.stream().pipeThrough(new DecompressionStream('deflate'));
    } else if (fileData.file_name.endsWith('.gz')) {
      console.log('Setting up gzip decompression stream...');
      stream = fileContent.stream().pipeThrough(new DecompressionStream('gzip'));
    } else if (fileData.file_name.endsWith('.parquet')) {
      console.log('Parquet files not yet supported in edge function');
      throw new Error('Parquet processing not implemented. Please use CSV files.');
    } else {
      stream = fileContent.stream();
    }

    // Read only first 10KB to extract headers
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let headerText = '';
    let bytesRead = 0;
    const maxHeaderBytes = 10000;
    
    while (bytesRead < maxHeaderBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      headerText += decoder.decode(value, { stream: true });
      bytesRead += value.length;
    }
    reader.releaseLock();
    
    const firstLines = headerText.split('\n');
    console.log('Read first', firstLines.length, 'lines for headers');

    // MoTeC CSV format: metadata ends at line 14, column names at line 15, units at line 16, data starts at line 17
    if (firstLines.length < 17) {
      throw new Error('File too short to be a valid MoTeC CSV');
    }

    // Parse column names from line 15 (index 14)
    const headerLine = firstLines[14];
    const headers = headerLine.split(',').map(h => h.trim());
    
    // Parse units from line 16 (index 15)
    const unitsLine = firstLines[15];
    const units = unitsLine.split(',').map(u => u.trim());
    
    console.log('CSV Headers (first 10):', headers.slice(0, 10));
    console.log('CSV Units (first 10):', units.slice(0, 10));
    console.log('Total columns:', headers.length);

    // Function to sanitize column names for database
    const sanitizeColumnName = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 63); // Postgres identifier limit
    };

    // Create mapping from CSV headers to database columns
    const baseColumnMap: Record<string, string> = {
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

    // Build complete column map including unmapped columns
    const columnMap: Record<string, string> = { ...baseColumnMap };
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (!columnMap[header] && header) {
        const dbColumn = sanitizeColumnName(header);
        columnMap[header] = dbColumn;
      }
    }

    console.log('Using column map with', Object.keys(columnMap).length, 'columns');

    // Re-download and process data rows line-by-line via stream
    console.log('Starting to process data rows...');
    const { data: fileContent2, error: downloadError2 } = await supabase
      .storage
      .from('racing-data')
      .download(fileData.file_path);
    
    if (downloadError2) throw downloadError2;
    
    // Get decompression stream again
    let dataStream: ReadableStream<Uint8Array>;
    if (fileData.file_name.endsWith('.deflate')) {
      dataStream = fileContent2.stream().pipeThrough(new DecompressionStream('deflate'));
    } else if (fileData.file_name.endsWith('.gz')) {
      dataStream = fileContent2.stream().pipeThrough(new DecompressionStream('gzip'));
    } else {
      dataStream = fileContent2.stream();
    }
    
    let processedRows = 0;
    let insertedRows = 0;
    const batchSize = 50; // Smaller batch size to reduce memory usage
    let currentBatch: TelemetryRow[] = [];
    const fieldsWithData = new Set<string>();
    
    // Process stream line by line
    const streamReader = dataStream.getReader();
    const streamDecoder = new TextDecoder();
    let buffer = '';
    let lineCount = 0;
    let done = false;
    
    while (!done) {
      const { done: streamDone, value } = await streamReader.read();
      done = streamDone;
      
      if (value) {
        buffer += streamDecoder.decode(value, { stream: !done });
      }
      
      // Process complete lines from buffer
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.substring(0, newlineIndex).trim();
        buffer = buffer.substring(newlineIndex + 1);
        lineCount++;
        
        // Skip metadata and header lines (first 16 lines)
        if (lineCount <= 16 || !line) continue;
      
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
                  numValue = numValue * 3.6;
                } else if (unit.toLowerCase() === 'mph') {
                  numValue = numValue * 1.60934;
                }
              }
              row[dbColumn] = numValue;
            }
          }
        }
      }

      // Track fields with data (for first 100 rows)
      if (processedRows < 100) {
        Object.keys(row).forEach(key => {
          if (key !== 'session_id' && key !== 'file_id' && row[key] !== null && row[key] !== undefined) {
            fieldsWithData.add(key);
          }
        });
      }

        currentBatch.push(row);
        processedRows++;
        
        // Log progress every 5000 rows
        if (processedRows % 5000 === 0) {
          console.log(`Processed ${processedRows} rows, inserted ${insertedRows} rows...`);
        }

        // Insert batch when it reaches batchSize
        if (currentBatch.length >= batchSize) {
          const { error: insertError } = await supabase
            .from('telemetry_data')
            .insert(currentBatch);

          if (insertError) {
            console.error('Error inserting batch:', insertError);
            throw insertError;
          }
          
          insertedRows += currentBatch.length;
          currentBatch = []; // Clear batch to free memory
          
          // Update progress every 10 batches
          if (insertedRows % 500 === 0) {
            // Estimate progress based on rows processed (rough estimate)
            const estimatedProgress = Math.min(95, Math.floor((insertedRows / 10000) * 100));
            await supabase
              .from('uploaded_files')
              .update({ 
                upload_status: 'processing',
                processing_progress: estimatedProgress,
                updated_at: new Date().toISOString()
              })
              .eq('id', fileId);
          }
        }
      }
    }

    // Insert remaining rows
    if (currentBatch.length > 0) {
      const { error: insertError } = await supabase
        .from('telemetry_data')
        .insert(currentBatch);

      if (insertError) {
        console.error('Error inserting final batch:', insertError);
        throw insertError;
      }
      insertedRows += currentBatch.length;
    }

    console.log('Parsed and inserted', insertedRows, 'telemetry records');

    if (insertedRows === 0) {
      throw new Error('No valid telemetry data found in file');
    }

    // Detect available metrics by checking which fields have non-null data
    const availableMetrics: Array<{ key: string; label: string; unit: string; category: string }> = [];
    const metricsMap: Record<string, { label: string; unit: string; category: string }> = {
      ground_speed: { label: 'Speed', unit: 'km/h', category: 'Performance' },
      gps_speed: { label: 'GPS Speed', unit: 'km/h', category: 'Performance' },
      drive_speed: { label: 'Drive Speed', unit: 'km/h', category: 'Performance' },
      engine_speed: { label: 'Engine RPM', unit: 'RPM', category: 'Engine' },
      throttle_position: { label: 'Throttle Position', unit: '%', category: 'Driver Input' },
      throttle_pedal: { label: 'Throttle Pedal', unit: '%', category: 'Driver Input' },
      g_force_lat: { label: 'Lateral G-Force', unit: 'G', category: 'Forces' },
      g_force_long: { label: 'Longitudinal G-Force', unit: 'G', category: 'Forces' },
      g_force_vert: { label: 'Vertical G-Force', unit: 'G', category: 'Forces' },
      engine_oil_temperature: { label: 'Oil Temperature', unit: '°C', category: 'Engine' },
      engine_oil_pressure: { label: 'Oil Pressure', unit: 'bar', category: 'Engine' },
      coolant_temperature: { label: 'Coolant Temperature', unit: '°C', category: 'Engine' },
      inlet_air_temperature: { label: 'Inlet Air Temp', unit: '°C', category: 'Engine' },
      boost_pressure: { label: 'Boost Pressure', unit: 'bar', category: 'Engine' },
      fuel_pressure_sensor: { label: 'Fuel Pressure', unit: 'bar', category: 'Fuel' },
      fuel_temperature: { label: 'Fuel Temperature', unit: '°C', category: 'Fuel' },
      fuel_used_m1: { label: 'Fuel Used', unit: 'L', category: 'Fuel' },
      fuel_inj_primary_duty_cycle: { label: 'Fuel Inj Duty Cycle', unit: '%', category: 'Fuel' },
      inlet_manifold_pressure: { label: 'Manifold Pressure', unit: 'bar', category: 'Engine' },
      airbox_temperature: { label: 'Airbox Temperature', unit: '°C', category: 'Engine' },
      gear: { label: 'Gear', unit: '', category: 'Transmission' },
      gear_detect_value: { label: 'Gear Detect', unit: '', category: 'Transmission' },
      bat_volts_ecu: { label: 'Battery ECU', unit: 'V', category: 'Electrical' },
      bat_volts_dash: { label: 'Battery Dash', unit: 'V', category: 'Electrical' },
      lap_number: { label: 'Lap Number', unit: '', category: 'Lap Data' },
      lap_time: { label: 'Lap Time', unit: 's', category: 'Lap Data' },
      lap_distance: { label: 'Lap Distance', unit: 'm', category: 'Lap Data' },
      running_lap_time: { label: 'Running Lap Time', unit: 's', category: 'Lap Data' },
      trip_distance: { label: 'Trip Distance', unit: 'm', category: 'GPS' },
      gps_latitude: { label: 'GPS Latitude', unit: '°', category: 'GPS' },
      gps_longitude: { label: 'GPS Longitude', unit: '°', category: 'GPS' },
      gps_altitude: { label: 'GPS Altitude', unit: 'm', category: 'GPS' },
      gps_heading: { label: 'GPS Heading', unit: '°', category: 'GPS' },
    };

    // Build available metrics list from ALL CSV columns (not just ones with data)
    const allMetrics = new Set<string>();
    for (const header of headers) {
      const dbColumn = columnMap[header];
      if (dbColumn && dbColumn !== 'session_id' && dbColumn !== 'file_id') {
        allMetrics.add(dbColumn);
      }
    }

    allMetrics.forEach(field => {
      const unit = headers.reduce((acc, header, idx) => {
        if (columnMap[header] === field) return units[idx] || '';
        return acc;
      }, '');

      if (metricsMap[field]) {
        availableMetrics.push({
          key: field,
          ...metricsMap[field]
        });
      } else {
        // For unknown fields, create a basic entry
        const label = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const category = field.includes('temp') ? 'Engine' :
                        field.includes('pressure') ? 'Engine' :
                        field.includes('speed') || field.includes('rpm') ? 'Performance' :
                        field.includes('gps') ? 'GPS' :
                        field.includes('lap') ? 'Lap Data' :
                        field.includes('fuel') ? 'Fuel' :
                        field.includes('gear') ? 'Transmission' :
                        field.includes('throttle') || field.includes('brake') || field.includes('steering') ? 'Driver Input' :
                        field.includes('g_force') ? 'Forces' :
                        field.includes('suspension') || field.includes('damper') ? 'Suspension' :
                        field.includes('tire') || field.includes('wheel') ? 'Tires' :
                        'Other';
        
        availableMetrics.push({
          key: field,
          label,
          unit,
          category
        });
      }
    });

    console.log('Detected available metrics:', availableMetrics.map(m => m.key));

    // Update session with available metrics
    await supabase
      .from('sessions')
      .update({ available_metrics: availableMetrics })
      .eq('id', sessionId);

    await supabase
      .from('uploaded_files')
      .update({ 
        upload_status: 'processed',
        processing_progress: 100
      })
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