import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sessionId } = await req.json();
    console.log('Clearing telemetry data for session:', sessionId);

    // Delete all telemetry data for the session
    const { error: deleteError } = await supabase
      .from('telemetry_data')
      .delete()
      .eq('session_id', sessionId);

    if (deleteError) {
      console.error('Error deleting telemetry data:', deleteError);
      throw deleteError;
    }

    // Clear available_metrics from session
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ available_metrics: [] })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      throw updateError;
    }

    console.log('Telemetry data cleared successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Telemetry data cleared' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error clearing telemetry:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
