// Web Worker for processing telemetry CSV files
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ubmasfaniokqszfbwatj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVibWFzZmFuaW9rcXN6ZmJ3YXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyNDcwNjAsImV4cCI6MjA2OTgyMzA2MH0.N9x52Oq_oD62-2C7vKA4hhx82DNlkwXbBHhYyjtKabc";

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

interface ProcessMessage {
  type: 'process';
  fileId: string;
  sessionId: string;
  filePath: string;
  accessToken: string;
}

// Column mapping from CSV headers to database columns
// NOTE: All speed columns map to 'speed' in the new schema
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

const sanitizeColumnName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 63);
};

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
  boost_pressure: { label: 'Boost Pressure', unit: 'bar', category: 'Engine' },
  gear: { label: 'Gear', unit: '', category: 'Transmission' },
  bat_volts_ecu: { label: 'Battery ECU', unit: 'V', category: 'Electrical' },
  bat_volts_dash: { label: 'Battery Dash', unit: 'V', category: 'Electrical' },
};

self.onmessage = async (e: MessageEvent<ProcessMessage>) => {
  const { type, fileId, sessionId, filePath, accessToken } = e.data;

  if (type !== 'process') return;

  try {
    console.log('Worker starting with:', { fileId, sessionId });
    
    // Initialize Supabase client with user's access token
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    self.postMessage({ type: 'status', message: 'Downloading file...' });
    console.log('Updating file status to processing...');

    // Update file status to processing
    await supabase
      .from('uploaded_files')
      .update({ upload_status: 'processing', processing_progress: 0 })
      .eq('id', fileId);

    // Download file from storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('racing-data')
      .download(filePath);

    if (downloadError) throw downloadError;

    self.postMessage({ type: 'status', message: 'Processing file stream...' });

    // Process file as a stream - NO memory loading!
    const decompressedStream = fileBlob.stream().pipeThrough(new DecompressionStream('deflate'));
    const reader = decompressedStream.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    let lineNumber = 0;
    let headers: string[] = [];
    let units: string[] = [];
    let columnMap: Record<string, string> = {};
    
    let processedRows = 0;
    let insertedRows = 0;
    const batchSize = 100; // Reduced for CSVs with 300+ columns to avoid payload size limits
    let currentBatch: TelemetryRow[] = [];
    let batchesSinceUpdate = 0;
    const fieldsWithData = new Set<string>();
    
    // Stream processing loop
    while (true) {
      const { done, value } = await reader.read();
      
      if (value) {
        buffer += decoder.decode(value, { stream: !done });
      }
      
      // Process complete lines from buffer
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.substring(0, newlineIndex).trim();
        buffer = buffer.substring(newlineIndex + 1);
        lineNumber++;
        
        // Line 15 = headers, Line 16 = units
        if (lineNumber === 15) {
          headers = line.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          console.log('Extracted', headers.length, 'columns from CSV');
          continue;
        }
        if (lineNumber === 16) {
          units = line.split(',').map(u => u.trim().replace(/^"|"$/g, ''));
          
          // Build column map
          columnMap = { ...baseColumnMap };
          for (const header of headers) {
            if (!columnMap[header] && header) {
              columnMap[header] = sanitizeColumnName(header);
            }
          }
          console.log('Column map built with', Object.keys(columnMap).length, 'mappings');
          continue;
        }
        
        // Skip metadata and header lines
        if (lineNumber < 17 || !line) continue;
        
        // Parse data row
        const values = line.split(',').map(v => {
          const trimmed = v.trim();
          return (trimmed[0] === '"' && trimmed[trimmed.length - 1] === '"') 
            ? trimmed.slice(1, -1) 
            : trimmed;
        });
        
        const row: TelemetryRow = {
          session_id: sessionId,
          file_id: fileId,
          metrics: {}
        };

        // Core metrics that get dedicated columns
        const coreMetrics = new Set(['time', 'lap_number', 'lap_time', 'speed', 'engine_speed', 'throttle_position', 'gps_latitude', 'gps_longitude', 'gps_altitude']);

        // Map columns
        for (let j = 0; j < headers.length; j++) {
          const header = headers[j];
          const dbColumn = columnMap[header];
          const unit = units[j] || '';
          const value = values[j];
          
          if (!dbColumn || value === undefined || value === null || value === '') {
            continue;
          }

          // Parse numeric values
          const numValue = parseFloat(value);
          
          if (!isNaN(numValue)) {
            // Convert speed units to km/h
            let convertedValue = numValue;
            if (dbColumn === 'speed') {
              if (unit.toLowerCase() === 'm/s') {
                convertedValue = numValue * 3.6;
              } else if (unit.toLowerCase() === 'mph') {
                convertedValue = numValue * 1.60934;
              }
            }
            
            // Route to core column or JSONB metrics
            if (coreMetrics.has(dbColumn)) {
              (row as any)[dbColumn] = convertedValue;
            } else {
              row.metrics[dbColumn] = convertedValue;
            }
          }
        }

        // Track fields with data (first 100 rows only)
        if (processedRows < 100) {
          Object.keys(row.metrics).forEach(key => {
            fieldsWithData.add(key);
          });
        }

        currentBatch.push(row);
        processedRows++;

        // Insert batch when full
        if (currentBatch.length >= batchSize) {
          try {
            const { error: insertError } = await supabase
              .from('telemetry_data')
              .insert(currentBatch);

            if (insertError) {
              console.error('Insert error at row', processedRows, ':', insertError);
              console.error('Error code:', insertError.code);
              console.error('Error message:', insertError.message);
              console.error('Error hint:', insertError.hint);
              console.error('Error details:', insertError.details);
              console.error('Batch size:', currentBatch.length);
              console.error('First row sample:', JSON.stringify(currentBatch[0]).substring(0, 500));
              throw new Error(`Database insert failed at row ${processedRows}: ${insertError.message || insertError.code || 'Unknown error'}`);
            }

            insertedRows += currentBatch.length;
            currentBatch = []; // Free memory immediately
            batchesSinceUpdate++;

            // Update progress every 2 batches
            if (batchesSinceUpdate >= 2) {
              // Linear progress: assume ~50k rows max, cap at 95%
              // This provides smooth, predictable progress without knowing total row count
              const progressBase = Math.min(95, Math.floor((insertedRows / 50000) * 95));
              
              await supabase
                .from('uploaded_files')
                .update({ processing_progress: progressBase })
                .eq('id', fileId);
              
              self.postMessage({
                type: 'progress',
                progress: progressBase,
                processed: processedRows,
                total: insertedRows
              });
              
              batchesSinceUpdate = 0;
            }
          } catch (error) {
            console.error('Batch insert failed at row', processedRows, ':', error);
            throw error;
          }
        }
      }
      
      if (done) break;
    }

    // Insert remaining rows
    if (currentBatch.length > 0) {
      const { error: insertError } = await supabase
        .from('telemetry_data')
        .insert(currentBatch);

      if (insertError) throw insertError;
      insertedRows += currentBatch.length;
    }

    console.log('Processing complete. Inserted', insertedRows, 'rows');

    // Build available metrics list
    const availableMetrics: Array<{ key: string; label: string; unit: string; category: string }> = [];
    
    for (const header of headers) {
      const dbColumn = columnMap[header];
      if (!dbColumn || dbColumn === 'session_id' || dbColumn === 'file_id') continue;

      const unit = headers.reduce((acc, h, idx) => {
        if (columnMap[h] === dbColumn) return units[idx] || '';
        return acc;
      }, '');

      if (metricsMap[dbColumn]) {
        availableMetrics.push({
          key: dbColumn,
          ...metricsMap[dbColumn]
        });
      } else {
        const label = dbColumn.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const category = dbColumn.includes('temp') ? 'Engine' :
                        dbColumn.includes('pressure') ? 'Engine' :
                        dbColumn.includes('speed') || dbColumn.includes('rpm') ? 'Performance' :
                        dbColumn.includes('gps') ? 'GPS' :
                        dbColumn.includes('lap') ? 'Lap Data' :
                        dbColumn.includes('fuel') ? 'Fuel' :
                        dbColumn.includes('gear') ? 'Transmission' :
                        dbColumn.includes('throttle') || dbColumn.includes('brake') || dbColumn.includes('steering') ? 'Driver Input' :
                        dbColumn.includes('g_force') ? 'Forces' :
                        dbColumn.includes('suspension') || dbColumn.includes('damper') ? 'Suspension' :
                        dbColumn.includes('tire') || dbColumn.includes('wheel') ? 'Tires' :
                        'Other';
        
        availableMetrics.push({ key: dbColumn, label, unit, category });
      }
    }

    // Update session with available metrics
    await supabase
      .from('sessions')
      .update({ available_metrics: availableMetrics })
      .eq('id', sessionId);

    // Mark as complete with 100% progress
    const { error: completeError } = await supabase
      .from('uploaded_files')
      .update({ 
        upload_status: 'processed',
        processing_progress: 100
      })
      .eq('id', fileId);

    if (completeError) {
      console.error('Error marking file as complete:', completeError);
    }

    console.log('File marked as complete at 100%');

    self.postMessage({
      type: 'complete',
      insertedRows,
      message: `Successfully processed ${insertedRows.toLocaleString()} rows`
    });

  } catch (error: any) {
    console.error('Worker error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Try to update status to failed
    try {
      const { fileId, accessToken } = e.data;
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      });
      
      await supabase
        .from('uploaded_files')
        .update({ upload_status: 'failed' })
        .eq('id', fileId);
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    self.postMessage({
      type: 'error',
      error: error.message || 'Unknown error occurred'
    });
  }
};