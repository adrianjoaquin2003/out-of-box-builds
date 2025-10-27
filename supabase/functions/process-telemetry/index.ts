import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelemetryRow {
  lap_number?: number
  time_seconds?: number
  speed?: number
  rpm?: number
  throttle_position?: number
  brake_pressure?: number
  gear?: number
  latitude?: number
  longitude?: number
  sector_time?: number
  delta_time?: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { fileId, sessionId } = await req.json()
    
    console.log('Processing telemetry file:', { fileId, sessionId })

    // Update status to processing
    await supabase
      .from('uploaded_files')
      .update({ upload_status: 'processing' })
      .eq('id', fileId)

    // Start background processing
    const processData = async () => {
      try {
        console.log('Starting background processing for file:', fileId)

        // Get file info from database
        const { data: fileData, error: fileError } = await supabase
          .from('uploaded_files')
          .select('*')
          .eq('id', fileId)
          .single()

        if (fileError) {
          console.error('Error fetching file:', fileError)
          throw new Error('File not found')
        }

        console.log('File data:', fileData)

        // Download file from storage
        const { data: fileContent, error: downloadError } = await supabase
          .storage
          .from('racing-data')
          .download(fileData.file_path)

        if (downloadError) {
          console.error('Error downloading file:', downloadError)
          throw new Error('Failed to download file')
        }

        console.log('File downloaded successfully, size:', fileContent.size)

        // Parse file content
        const text = await fileContent.text()
        const lines = text.split('\n').filter(line => line.trim())
        
        console.log('Total lines in file:', lines.length)
        
        if (lines.length === 0) {
          throw new Error('File is empty')
        }

        if (lines.length < 2) {
          throw new Error('File only contains headers, no data rows')
        }

        // Parse CSV headers
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        console.log('CSV Headers:', headers)

        // Map common header variations to our schema
        const headerMap: { [key: string]: keyof TelemetryRow } = {
      'lap': 'lap_number',
      'lap_number': 'lap_number',
      'lapnumber': 'lap_number',
      'time': 'time_seconds',
      'time_seconds': 'time_seconds',
      'elapsed_time': 'time_seconds',
      'speed': 'speed',
      'velocity': 'speed',
      'rpm': 'rpm',
      'engine_rpm': 'rpm',
      'throttle': 'throttle_position',
      'throttle_position': 'throttle_position',
      'brake': 'brake_pressure',
      'brake_pressure': 'brake_pressure',
      'gear': 'gear',
      'lat': 'latitude',
      'latitude': 'latitude',
      'lon': 'longitude',
      'longitude': 'longitude',
      'sector_time': 'sector_time',
      'delta': 'delta_time',
      'delta_time': 'delta_time',
        }

        // Parse data rows
        const telemetryData: TelemetryRow[] = []
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim())
          const row: TelemetryRow = {}

          headers.forEach((header, index) => {
            const mappedKey = headerMap[header]
            if (mappedKey && values[index]) {
              const value = parseFloat(values[index])
              if (!isNaN(value)) {
                row[mappedKey] = value
              }
            }
          })

          if (Object.keys(row).length > 0) {
            telemetryData.push(row)
          }
        }

        console.log(`Parsed ${telemetryData.length} telemetry records`)

        if (telemetryData.length === 0) {
          throw new Error('No valid telemetry data found in file. Check that columns match expected format.')
        }

        // Insert telemetry data in batches
        const batchSize = 500
        let insertedCount = 0

        for (let i = 0; i < telemetryData.length; i += batchSize) {
          const batch = telemetryData.slice(i, i + batchSize).map(row => ({
            ...row,
            session_id: sessionId,
            file_id: fileId,
          }))

          console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}, records ${i + 1} to ${Math.min(i + batchSize, telemetryData.length)}`)

          const { error: insertError } = await supabase
            .from('telemetry_data')
            .insert(batch)

          if (insertError) {
            console.error('Error inserting batch:', insertError)
            throw insertError
          }

          insertedCount += batch.length
          console.log(`Inserted ${insertedCount}/${telemetryData.length} records`)
        }

        // Update file status to processed
        const { error: updateError } = await supabase
          .from('uploaded_files')
          .update({ upload_status: 'processed' })
          .eq('id', fileId)

        if (updateError) {
          console.error('Error updating file status:', updateError)
        }

        console.log('Processing complete:', telemetryData.length, 'records inserted successfully')
      } catch (error) {
        console.error('Background processing error:', error)
        console.error('Error details:', { message: error.message, stack: error.stack })
        
        // Update status to failed
        try {
          await supabase
            .from('uploaded_files')
            .update({ upload_status: 'failed' })
            .eq('id', fileId)
          console.log('File status updated to failed')
        } catch (updateError) {
          console.error('Failed to update file status:', updateError)
        }
      }
    }

    // Start processing in background
    EdgeRuntime.waitUntil(processData())

    // Return immediate response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'File processing started. This may take a few moments.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 202, // Accepted
      }
    )

  } catch (error) {
    console.error('Error starting telemetry processing:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
