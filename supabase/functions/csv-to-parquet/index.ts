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
      .update({ upload_status: 'processing' })
      .eq('id', fileId);

    // Download the CSV file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('racing-data')
      .download(fileRecord.file_path);

    if (downloadError) throw new Error(`Download failed: ${downloadError.message}`);

    console.log('File downloaded, size:', fileData.size);

    // Decompress if needed
    let csvText: string;
    if (fileRecord.file_path.endsWith('.deflate')) {
      const decompressed = new DecompressionStream('deflate');
      const decompressedStream = fileData.stream().pipeThrough(decompressed);
      const decompressedBlob = await new Response(decompressedStream).blob();
      csvText = await decompressedBlob.text();
    } else if (fileRecord.file_path.endsWith('.gz')) {
      const decompressed = new DecompressionStream('gzip');
      const decompressedStream = fileData.stream().pipeThrough(decompressed);
      const decompressedBlob = await new Response(decompressedStream).blob();
      csvText = await decompressedBlob.text();
    } else {
      csvText = await fileData.text();
    }

    console.log('CSV decompressed, length:', csvText.length);

    // Parse CSV and convert to columnar format
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const units = lines[1]?.split(',').map(u => u.trim()) || [];
    
    // Initialize column arrays
    const columns: Record<string, number[]> = {};
    headers.forEach(header => {
      columns[header] = [];
    });

    // Parse data rows
    for (let i = 2; i < lines.length; i++) {
      const values = lines[i].split(',');
      headers.forEach((header, idx) => {
        const value = parseFloat(values[idx]);
        columns[header].push(isNaN(value) ? 0 : value);
      });
    }

    console.log('CSV parsed, rows:', lines.length - 2, 'columns:', headers.length);

    // Convert to Apache Arrow format (using JSON for now, will optimize later)
    const parquetData = {
      schema: headers.map((h, i) => ({ name: h, type: 'float64', unit: units[i] || '' })),
      data: columns,
      rowCount: lines.length - 2
    };

    // For now, store as compressed JSON (we'll use actual Parquet later)
    const jsonString = JSON.stringify(parquetData);
    const compressed = new CompressionStream('gzip');
    const compressedStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(jsonString));
        controller.close();
      }
    }).pipeThrough(compressed);

    const compressedBlob = await new Response(compressedStream).blob();
    
    console.log('Data compressed, size:', compressedBlob.size);

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

    // Update session with parquet file path
    await supabase
      .from('sessions')
      .update({ 
        parquet_file_path: parquetPath,
        available_metrics: headers.map(h => ({
          key: h,
          label: h,
          unit: units[headers.indexOf(h)] || '',
          category: 'telemetry'
        }))
      })
      .eq('id', sessionId);

    // Mark file as processed
    await supabase
      .from('uploaded_files')
      .update({ upload_status: 'processed' })
      .eq('id', fileId);

    console.log('Conversion complete!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        parquetPath,
        rowCount: parquetData.rowCount,
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
