// Web Worker for processing telemetry CSV files
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ubmasfaniokqszfbwatj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVibWFzZmFuaW9rcXN6ZmJ3YXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyNDcwNjAsImV4cCI6MjA2OTgyMzA2MH0.N9x52Oq_oD62-2C7vKA4hhx82DNlkwXbBHhYyjtKabc";

interface TelemetryRow {
  session_id: string;
  file_id: string;
  [key: string]: any;
}

interface ProcessMessage {
  type: 'process';
  fileId: string;
  sessionId: string;
  filePath: string;
  accessToken: string;
}

// Column mapping from CSV headers to database columns
const baseColumnMap: Record<string, string> = {
  'Time': 'time',
  'Lap Number': 'lap_number',
  'Lap Time': 'lap_time',
  'Lap Distance': 'lap_distance',
  'G Force Lat': 'g_force_lat',
  'G Force Long': 'g_force_long',
  'G Force Vert': 'g_force_vert',
  'Ground Speed': 'ground_speed',
  'GPS Speed': 'gps_speed',
  'Drive Speed': 'drive_speed',
  'Engine Speed': 'engine_speed',
  'Engine Oil Pressure': 'engine_oil_pressure',
  'Engine Oil Temperature': 'engine_oil_temperature',
  'Coolant Temperature': 'coolant_temperature',
  'Throttle Position': 'throttle_position',
  'Throttle Pedal': 'throttle_pedal',
  'Boost Pressure': 'boost_pressure',
  'Gear': 'gear',
  'Bat Volts ECU': 'bat_volts_ecu',
  'Bat Volts Dash': 'bat_volts_dash',
};

const sanitizeColumnName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 63);
};

self.onmessage = async (e: MessageEvent<ProcessMessage>) => {
  const { type, fileId, sessionId, filePath, accessToken } = e.data;

  if (type !== 'process') return;

  try {
    // Initialize Supabase client with user's access token
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    self.postMessage({ type: 'status', message: 'Downloading file...' });

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

    self.postMessage({ type: 'status', message: 'Decompressing file...' });

    // Decompress file
    const decompressedStream = fileBlob.stream().pipeThrough(new DecompressionStream('deflate'));
    const decompressedBlob = await new Response(decompressedStream).blob();
    const text = await decompressedBlob.text();
    
    self.postMessage({ type: 'status', message: 'Parsing CSV...' });

    // Parse CSV
    const lines = text.split('\n');
    
    if (lines.length < 17) {
      throw new Error('File too short to be valid MoTeC CSV');
    }

    // Extract headers and units
    const headerLine = lines[14];
    const headers = headerLine.split(',').map(h => h.trim());
    
    const unitsLine = lines[15];
    const units = unitsLine.split(',').map(u => u.trim());

    // Build column map
    const columnMap: Record<string, string> = { ...baseColumnMap };
    for (const header of headers) {
      if (!columnMap[header] && header) {
        columnMap[header] = sanitizeColumnName(header);
      }
    }

    // Parse data rows
    const dataLines = lines.slice(16).filter(line => line.trim());
    const totalRows = dataLines.length;
    
    self.postMessage({ 
      type: 'status', 
      message: `Processing ${totalRows.toLocaleString()} rows...` 
    });

    let processedRows = 0;
    let insertedRows = 0;
    const batchSize = 1000; // Increased from 100 for faster processing
    let currentBatch: TelemetryRow[] = [];
    let batchesSinceUpdate = 0;

    // Track fields with data for available_metrics
    const fieldsWithData = new Set<string>();
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
      boost_pressure: { label: 'Boost Pressure', unit: 'bar', category: 'Engine' },
      gear: { label: 'Gear', unit: '', category: 'Transmission' },
      bat_volts_ecu: { label: 'Battery ECU', unit: 'V', category: 'Electrical' },
      bat_volts_dash: { label: 'Battery Dash', unit: 'V', category: 'Electrical' },
    };

    for (const line of dataLines) {
      if (!line.trim()) continue;

      const values = line.split(',').map(v => v.trim());
      const row: TelemetryRow = {
        session_id: sessionId,
        file_id: fileId
      };

      // Debug first row - send to main thread
      if (processedRows === 0) {
        self.postMessage({
          type: 'debug',
          message: `First row has ${values.length} values. First 5 values: ${values.slice(0, 5).join(' | ')}`
        });
        self.postMessage({
          type: 'debug', 
          message: `Headers count: ${headers.length}. First 5 headers: ${headers.slice(0, 5).join(' | ')}`
        });
      }

      // Map columns
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const dbColumn = columnMap[header];
        const unit = units[j] || '';
        const value = values[j];
        
        if (!dbColumn || value === undefined || value === null || value === '') {
          continue;
        }

        // Handle string fields  
        if (dbColumn === 'gps_time' || dbColumn === 'gps_date') {
          row[dbColumn] = value;
          if (processedRows === 0) {
            self.postMessage({ 
              type: 'debug', 
              message: `String ${dbColumn} = "${value}"` 
            });
          }
          continue;
        }

        // Parse numeric values
        const numValue = parseFloat(value);
        
        if (processedRows === 0 && j < 10) {
          self.postMessage({
            type: 'debug',
            message: `Col ${j}: [${header}]->[${dbColumn}] value="${value}" parsed=${numValue} isNaN=${isNaN(numValue)}`
          });
        }
        
        if (!isNaN(numValue)) {
          // Convert speed units to km/h
          let convertedValue = numValue;
          if ((dbColumn === 'ground_speed' || dbColumn === 'gps_speed' || dbColumn === 'drive_speed')) {
            if (unit.toLowerCase() === 'm/s') {
              convertedValue = numValue * 3.6;
            } else if (unit.toLowerCase() === 'mph') {
              convertedValue = numValue * 1.60934;
            }
          }
          row[dbColumn] = convertedValue;
        }
      }

      // Track fields with data (first 100 rows)
      if (processedRows < 100) {
        Object.keys(row).forEach(key => {
          if (key !== 'session_id' && key !== 'file_id' && row[key] !== null && row[key] !== undefined) {
            fieldsWithData.add(key);
          }
        });
      }

      currentBatch.push(row);
      processedRows++;

      // Insert batch
      if (currentBatch.length >= batchSize) {
        const { error: insertError } = await supabase
          .from('telemetry_data')
          .insert(currentBatch);

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }

        insertedRows += currentBatch.length;
        currentBatch = [];
        batchesSinceUpdate++;

        // Update progress less frequently (every 5 batches to reduce overhead)
        if (batchesSinceUpdate >= 5) {
          const progress = Math.floor((processedRows / totalRows) * 95);
          await supabase
            .from('uploaded_files')
            .update({ processing_progress: progress })
            .eq('id', fileId);

          self.postMessage({
            type: 'progress',
            progress,
            processed: processedRows,
            total: totalRows
          });
          
          batchesSinceUpdate = 0;
        }
      }
    }

    // Insert remaining rows
    if (currentBatch.length > 0) {
      const { error: insertError } = await supabase
        .from('telemetry_data')
        .insert(currentBatch);

      if (insertError) throw insertError;
      insertedRows += currentBatch.length;
    }

    // Build available metrics list
    const availableMetrics: Array<{ key: string; label: string; unit: string; category: string }> = [];
    
    // Use ALL columns from CSV, not just ones with data
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

    // Mark as complete
    await supabase
      .from('uploaded_files')
      .update({ 
        upload_status: 'processed',
        processing_progress: 100
      })
      .eq('id', fileId);

    self.postMessage({
      type: 'complete',
      insertedRows,
      message: `Successfully processed ${insertedRows.toLocaleString()} rows`
    });

  } catch (error: any) {
    console.error('Worker error:', error);
    
    // Try to update status to failed
    try {
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
