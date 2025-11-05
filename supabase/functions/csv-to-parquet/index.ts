import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConvertRequest {
  fileId: string;
  sessionId: string;
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
    
    console.log('Starting CSV to Parquet conversion for file:', fileId);

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
      .update({ upload_status: 'processing', processing_progress: 10 })
      .eq('id', fileId);

    // Download the CSV file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('racing-data')
      .download(fileRecord.file_path);

    if (downloadError) throw new Error(`Download failed: ${downloadError.message}`);

    console.log('File downloaded, converting to columnar format...');

    await supabase.from('uploaded_files').update({ processing_progress: 30 }).eq('id', fileId);

    // Decompress stream and read as text
    let dataStream = fileData.stream();
    if (fileRecord.file_path.endsWith('.deflate')) {
      dataStream = dataStream.pipeThrough(new DecompressionStream('deflate'));
    } else if (fileRecord.file_path.endsWith('.gz')) {
      dataStream = dataStream.pipeThrough(new DecompressionStream('gzip'));
    }

    const csvText = await new Response(dataStream).text();
    const lines = csvText.split('\n').filter(line => line.trim());

    console.log(`CSV has ${lines.length} lines`);

    // Parse headers (line 15) and units (line 16)
    const headers = lines[14]?.split(',').map(h => h.trim().replace(/"/g, '')) || [];
    const units = lines[15]?.split(',').map(u => u.trim().replace(/"/g, '')) || [];

    console.log(`Found ${headers.length} columns`);

    await supabase.from('uploaded_files').update({ processing_progress: 50 }).eq('id', fileId);

    // Initialize column arrays for columnar storage
    const columns: Record<string, number[]> = {};
    headers.forEach(header => {
      const sanitized = header.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      columns[sanitized] = [];
    });

    // Parse data rows (starting from line 17, index 16)
    for (let i = 16; i < lines.length; i++) {
      const values = lines[i].split(',');
      headers.forEach((header, idx) => {
        const sanitized = header.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        const value = parseFloat(values[idx]);
        columns[sanitized].push(isNaN(value) ? 0 : value);
      });
    }

    const rowCount = lines.length - 16;
    console.log(`Parsed ${rowCount} data rows`);

    await supabase.from('uploaded_files').update({ processing_progress: 70 }).eq('id', fileId);

    // Create columnar format (Parquet-like structure as JSON)
    const parquetData = {
      schema: headers.map((h, i) => {
        const sanitized = h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        return { 
          name: sanitized, 
          originalName: h,
          type: 'float64', 
          unit: units[i] || '' 
        };
      }),
      data: columns,
      rowCount
    };

    // Compress and upload
    const jsonString = JSON.stringify(parquetData);
    const encoder = new TextEncoder();
    const jsonBytes = encoder.encode(jsonString);
    
    const compressedStream = new ReadableStream({
      start(controller) {
        controller.enqueue(jsonBytes);
        controller.close();
      }
    }).pipeThrough(new CompressionStream('gzip'));

    const compressedBlob = await new Response(compressedStream).blob();
    
    console.log(`Compressed size: ${compressedBlob.size} bytes`);

    await supabase.from('uploaded_files').update({ processing_progress: 85 }).eq('id', fileId);

    // Upload Parquet file to storage
    const parquetPath = `${fileRecord.file_path.replace(/\.(csv|deflate|gz)$/, '')}.parquet.gz`;
    const { error: uploadError } = await supabase.storage
      .from('racing-data')
      .upload(parquetPath, compressedBlob, {
        contentType: 'application/octet-stream',
        upsert: true
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    console.log('Parquet file uploaded:', parquetPath);

    // Update session with parquet file path and available metrics
    const metricsMap: Record<string, { label: string; category: string }> = {
      'time': { label: 'Time', category: 'Timing' },
      'ground_speed': { label: 'Speed', category: 'Performance' },
      'engine_speed': { label: 'Engine RPM', category: 'Engine' },
      'throttle_position': { label: 'Throttle', category: 'Driver Input' },
    };

    const availableMetrics = parquetData.schema
      .filter(col => col.name !== 'time')
      .map(col => ({
        key: col.name,
        label: metricsMap[col.name]?.label || col.originalName,
        unit: col.unit,
        category: metricsMap[col.name]?.category || 'Other'
      }));

    await supabase
      .from('sessions')
      .update({ 
        parquet_file_path: parquetPath,
        available_metrics: availableMetrics
      })
      .eq('id', sessionId);

    // Mark file as processed
    await supabase
      .from('uploaded_files')
      .update({ upload_status: 'processed', processing_progress: 100 })
      .eq('id', fileId);

    console.log('Conversion complete!');

    return new Response(
      JSON.stringify({ 
        success: true,
        parquetPath,
        rowCount,
        columnCount: headers.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in csv-to-parquet:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
