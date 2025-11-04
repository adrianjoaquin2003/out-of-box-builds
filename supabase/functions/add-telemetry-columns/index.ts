import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ColumnDefinition {
  csvHeader: string;
  dbColumn: string;
  unit: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { columns } = await req.json() as { columns: ColumnDefinition[] };
    console.log('Adding columns:', columns.length);

    const results = {
      added: [] as string[],
      skipped: [] as string[],
      errors: [] as string[]
    };

    // Process columns in small batches
    const batchSize = 5;
    for (let i = 0; i < columns.length; i += batchSize) {
      const batch = columns.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async ({ csvHeader, dbColumn, unit }) => {
        try {
          const isStringField = (csvHeader.toLowerCase().includes('time') && 
                               csvHeader.toLowerCase().includes('gps')) ||
                               csvHeader.toLowerCase().includes('date');
          const columnType = isStringField ? 'text' : 'real';
          
          const { error } = await supabase.rpc('add_telemetry_column', {
            column_name: dbColumn,
            column_type: columnType
          });
          
          if (error) {
            if (error.message?.includes('already exists')) {
              results.skipped.push(dbColumn);
            } else {
              console.error(`Error adding column ${dbColumn}:`, error);
              results.errors.push(`${dbColumn}: ${error.message}`);
            }
          } else {
            results.added.push(dbColumn);
          }
        } catch (error) {
          console.error(`Failed to add column ${dbColumn}:`, error);
          results.errors.push(`${dbColumn}: ${error.message}`);
        }
      }));
      
      // Small delay between batches
      if (i + batchSize < columns.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('Column addition complete:', results);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in add-telemetry-columns:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
