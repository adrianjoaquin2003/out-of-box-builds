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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { fileId, sessionId } = await req.json()
    
    console.log('Processing telemetry file:', { fileId, sessionId })

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

    // Download file from storage
    const { data: fileContent, error: downloadError } = await supabase
      .storage
      .from('racing-data')
      .download(fileData.file_path)

    if (downloadError) {
      console.error('Error downloading file:', downloadError)
      throw new Error('Failed to download file')
    }

    // Parse file content
    const text = await fileContent.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      throw new Error('File is empty')
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

    // Insert telemetry data in batches
    const batchSize = 1000
    let insertedCount = 0

    for (let i = 0; i < telemetryData.length; i += batchSize) {
      const batch = telemetryData.slice(i, i + batchSize).map(row => ({
        ...row,
        session_id: sessionId,
        file_id: fileId,
      }))

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

    // Update file status
    await supabase
      .from('uploaded_files')
      .update({ upload_status: 'processed' })
      .eq('id', fileId)

    console.log('Processing complete')

    return new Response(
      JSON.stringify({
        success: true,
        recordsProcessed: telemetryData.length,
        message: `Successfully processed ${telemetryData.length} telemetry records`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing telemetry:', error)
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
