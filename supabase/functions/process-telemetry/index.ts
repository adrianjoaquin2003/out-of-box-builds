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
  speed?: number;
  engine_speed?: number;
  throttle_position?: number;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_altitude?: number;
  metrics: Record<string, any>;
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
      .update({ upload_status: 'processing', processing_progress: 0 })
      .eq('id', fileId);

    // Process the data directly (no background task)
    await processData(supabase, fileId, sessionId);

    return new Response(
      JSON.stringify({ message: 'Processing complete' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error processing:', error);
    
    // Update file status to failed
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { fileId } = await req.json();
      
      await supabase
        .from('uploaded_files')
        .update({ upload_status: 'failed' })
        .eq('id', fileId);
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }
    
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
    // NOTE: All speed columns map to 'speed' in new hybrid schema
    const baseColumnMap: Record<string, string> = {
      'Time': 'time',
      'Lap Number': 'lap_number',
      'Lap Time': 'lap_time',
      'Ground Speed': 'speed',
      'GPS Speed': 'speed',
      'Drive Speed': 'speed',
      'Engine Speed': 'engine_speed',
      'Throttle Position': 'throttle_position',
      'GPS Latitude': 'gps_latitude',
      'GPS Longitude': 'gps_longitude',
      'GPS Altitude': 'gps_altitude',
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
        file_id: fileId,
        metrics: {}
      };

      // Core metrics that get dedicated columns
      const coreMetrics = new Set(['time', 'lap_number', 'lap_time', 'speed', 'engine_speed', 'throttle_position', 'gps_latitude', 'gps_longitude', 'gps_altitude']);

      // Map each column to database field
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const dbColumn = columnMap[header];
        const unit = units[j] || '';
        
        if (dbColumn && values[j] !== undefined && values[j] !== '') {
          const value = values[j];
          
          // Parse numeric values
          let numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            // Convert speed units to km/h
            if (dbColumn === 'speed') {
              if (unit.toLowerCase() === 'm/s') {
                numValue = numValue * 3.6;
              } else if (unit.toLowerCase() === 'mph') {
                numValue = numValue * 1.60934;
              }
            }
            
            // Route to core column or JSONB metrics
            if (coreMetrics.has(dbColumn)) {
              row[dbColumn] = numValue;
            } else {
              row.metrics[dbColumn] = numValue;
            }
          }
        }
      }

      // Track fields with data (for first 100 rows)
      if (processedRows < 100) {
        Object.keys(row.metrics).forEach(key => {
          if (row.metrics[key] !== null && row.metrics[key] !== undefined) {
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
      speed: { label: 'Speed', unit: 'km/h', category: 'Performance' },
      engine_speed: { label: 'Engine RPM', unit: 'RPM', category: 'Engine' },
      throttle_position: { label: 'Throttle Position', unit: '%', category: 'Driver Input' },
      throttle_pedal: { label: 'Throttle Pedal', unit: '%', category: 'Driver Input' },
      lap_number: { label: 'Lap Number', unit: '', category: 'Lap Data' },
      lap_time: { label: 'Lap Time', unit: 's', category: 'Lap Data' },
      gps_latitude: { label: 'GPS Latitude', unit: '°', category: 'GPS' },
      gps_longitude: { label: 'GPS Longitude', unit: '°', category: 'GPS' },
      gps_altitude: { label: 'GPS Altitude', unit: 'm', category: 'GPS' },
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
      lap_distance: { label: 'Lap Distance', unit: 'm', category: 'Lap Data' },
      running_lap_time: { label: 'Running Lap Time', unit: 's', category: 'Lap Data' },
      trip_distance: { label: 'Trip Distance', unit: 'm', category: 'GPS' },
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