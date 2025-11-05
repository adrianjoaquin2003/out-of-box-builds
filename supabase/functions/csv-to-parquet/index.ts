import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConvertRequest {
  fileId: string;
  sessionId: string;
}

interface TelemetryRow {
  session_id: string;
  file_id: string;
  time: number;
  speed?: number;
  engine_speed?: number;
  throttle_position?: number;
  lap_number?: number;
  lap_time?: number;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_altitude?: number;
  metrics: Record<string, number>;
}

// Streaming CSV parser
async function* parseCSVStream(
  stream: ReadableStream<Uint8Array>,
  batchSize: number = 50
): AsyncGenerator<TelemetryRow[]> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let headers: string[] = [];
  let units: string[] = [];
  let lineNumber = 0;
  let currentBatch: TelemetryRow[] = [];
  let sessionId = '';
  let fileId = '';

  const baseColumnMap: Record<string, string> = {
    'time': 'time',
    'ground_speed': 'speed',
    'gps_speed': 'speed',
    'drive_speed': 'speed',
    'engine_speed': 'engine_speed',
    'throttle_position': 'throttle_position',
    'throttle_pedal': 'throttle_position',
    'lap_number': 'lap_number',
    'lap_time': 'lap_time',
    'gps_latitude': 'gps_latitude',
    'gps_longitude': 'gps_longitude',
    'gps_altitude': 'gps_altitude',
  };

  const sanitize = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').substring(0, 63);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        
        lineNumber++;
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));

        // Line 15: Headers
        if (lineNumber === 15) {
          headers = values;
          continue;
        }

        // Line 16: Units
        if (lineNumber === 16) {
          units = values;
          continue;
        }

        // Data rows start at line 17
        if (lineNumber < 17) continue;

        // Parse row
        const row: TelemetryRow = {
          session_id: sessionId,
          file_id: fileId,
          time: 0,
          metrics: {}
        };

        headers.forEach((header, idx) => {
          const sanitized = sanitize(header);
          const coreColumn = baseColumnMap[sanitized];
          const value = parseFloat(values[idx]);

          if (isNaN(value)) return;

          if (coreColumn) {
            (row as any)[coreColumn] = value;
          } else {
            row.metrics[sanitized] = value;
          }
        });

        currentBatch.push(row);

        if (currentBatch.length >= batchSize) {
          yield currentBatch;
          currentBatch = [];
        }
      }
    }

    // Yield remaining rows
    if (currentBatch.length > 0) {
      yield currentBatch;
    }

    // Return metadata
    return { headers, units };
  } finally {
    reader.releaseLock();
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { fileId, sessionId } = await req.json() as ConvertRequest;
    
    console.log('Starting streaming CSV processing for file:', fileId);

    // Get file info
    const { data: fileRecord, error: fileError } = await supabase
      .from('uploaded_files')
      .select('file_path')
      .eq('id', fileId)
      .single();

    if (fileError) throw new Error(`File not found: ${fileError.message}`);

    // Update status to processing
    await supabase
      .from('uploaded_files')
      .update({ upload_status: 'processing', processing_progress: 0 })
      .eq('id', fileId);

    // Download the CSV file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('racing-data')
      .download(fileRecord.file_path);

    if (downloadError) throw new Error(`Download failed: ${downloadError.message}`);

    console.log('File downloaded, streaming decompression...');

    // Decompress stream
    let dataStream = fileData.stream();
    if (fileRecord.file_path.endsWith('.deflate')) {
      dataStream = dataStream.pipeThrough(new DecompressionStream('deflate'));
    } else if (fileRecord.file_path.endsWith('.gz')) {
      dataStream = dataStream.pipeThrough(new DecompressionStream('gzip'));
    }

    // Process CSV in streaming fashion
    let totalRows = 0;
    let headers: string[] = [];
    let units: string[] = [];
    const metricsSet = new Set<string>();

    for await (const batch of parseCSVStream(dataStream, 50)) {
      // Add session_id and file_id to each row
      batch.forEach(row => {
        row.session_id = sessionId;
        row.file_id = fileId;
        Object.keys(row.metrics).forEach(k => metricsSet.add(k));
      });

      // Insert batch
      const { error: insertError } = await supabase
        .from('telemetry_data')
        .insert(batch);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      totalRows += batch.length;
      
      // Update progress
      const progress = Math.min(95, Math.floor((totalRows / 232000) * 100));
      await supabase
        .from('uploaded_files')
        .update({ processing_progress: progress })
        .eq('id', fileId);

      console.log(`Inserted ${totalRows} rows (${progress}%)`);
    }

    console.log(`Processing complete! Total rows: ${totalRows}`);

    // Update session with available metrics
    const metricsMap: Record<string, { label: string; unit: string; category: string }> = {
      'time': { label: 'Time', unit: 's', category: 'Timing' },
      'speed': { label: 'Speed', unit: 'km/h', category: 'Performance' },
      'engine_speed': { label: 'Engine RPM', unit: 'RPM', category: 'Engine' },
      'throttle_position': { label: 'Throttle', unit: '%', category: 'Driver Input' },
    };

    const availableMetrics = Array.from(metricsSet).map(key => ({
      key,
      label: metricsMap[key]?.label || key,
      unit: metricsMap[key]?.unit || '',
      category: metricsMap[key]?.category || 'Other'
    }));

    await supabase
      .from('sessions')
      .update({ available_metrics: availableMetrics })
      .eq('id', sessionId);

    // Mark file as processed
    await supabase
      .from('uploaded_files')
      .update({ upload_status: 'processed', processing_progress: 100 })
      .eq('id', fileId);

    return new Response(
      JSON.stringify({ 
        success: true,
        rowCount: totalRows,
        columnCount: metricsSet.size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in csv-to-parquet:', error);
    
    // Update file status to failed
    const { fileId } = await req.json() as ConvertRequest;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    await supabase
      .from('uploaded_files')
      .update({ upload_status: 'failed' })
      .eq('id', fileId);

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
