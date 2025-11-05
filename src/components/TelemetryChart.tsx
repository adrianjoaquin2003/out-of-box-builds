import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

interface TelemetryChartProps {
  sessionId: string;
}

export const TelemetryChart = ({ sessionId }: TelemetryChartProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    maxSpeed: 0,
    avgSpeed: 0,
    maxRpm: 0,
    totalLaps: 0
  });

  useEffect(() => {
    fetchTelemetryData();
  }, [sessionId]);

  const fetchTelemetryData = async () => {
    try {
      const { data: telemetry, error } = await supabase
        .from('telemetry_data')
        .select('*')
        .eq('session_id', sessionId)
        .order('time', { ascending: true })
        .limit(1000); // Limit to prevent overwhelming the chart

      if (error) throw error;

      if (telemetry && telemetry.length > 0) {
        setData(telemetry);
        
        // Calculate statistics
        const speeds = telemetry.map(t => t.speed || 0).filter(s => s > 0);
        const rpms = telemetry.map(t => t.engine_speed || 0).filter(r => r > 0);
        const laps = new Set(telemetry.map(t => t.lap_number).filter(l => l !== null));
        
        setStats({
          maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
          avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
          maxRpm: rpms.length > 0 ? Math.max(...rpms) : 0,
          totalLaps: laps.size
        });
      }
    } catch (error) {
      console.error('Error fetching telemetry:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Telemetry Data</CardTitle>
          <CardDescription>Upload a telemetry file to see analysis</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Max Speed</CardDescription>
            <CardTitle className="text-2xl">{stats.maxSpeed.toFixed(1)} km/h</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Speed</CardDescription>
            <CardTitle className="text-2xl">{stats.avgSpeed.toFixed(1)} km/h</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Max RPM</CardDescription>
            <CardTitle className="text-2xl">{stats.maxRpm.toFixed(0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Laps</CardDescription>
            <CardTitle className="text-2xl">{stats.totalLaps}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Speed Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Speed Over Time</CardTitle>
          <CardDescription>Telemetry visualization - scroll horizontally to see all data</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div style={{ minWidth: Math.max(800, data.length * 1.5) + 'px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -5 }}
                  domain={[0, 'dataMax']}
                />
                <YAxis 
                  label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 'auto']}
                />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="speed" 
                  name="Speed"
                  stroke="hsl(var(--primary))" 
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* RPM Chart */}
      {data.some(d => d.engine_speed) && (
        <Card>
          <CardHeader>
            <CardTitle>Engine RPM</CardTitle>
            <CardDescription>RPM telemetry - scroll horizontally to see all data</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div style={{ minWidth: Math.max(800, data.length * 1.5) + 'px' }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -5 }}
                    domain={[0, 'dataMax']}
                  />
                  <YAxis 
                    label={{ value: 'RPM', angle: -90, position: 'insideLeft' }}
                    domain={[0, 'auto']}
                  />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="engine_speed" 
                    name="Engine RPM"
                    stroke="hsl(var(--chart-2))" 
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Throttle & G-Force Chart */}
      {(data.some(d => d.throttle_position) || data.some(d => (d.metrics as any)?.g_force_lat)) && (
        <Card>
          <CardHeader>
            <CardTitle>Throttle & G-Forces</CardTitle>
            <CardDescription>Driver inputs and forces over time - scroll horizontally to see all data</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div style={{ minWidth: Math.max(800, data.length * 1.5) + 'px' }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -5 }}
                    domain={[0, 'dataMax']}
                  />
                  <YAxis 
                    label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip />
                  <Legend />
                  {data.some(d => d.throttle_position) && (
                    <Line 
                      type="monotone" 
                      dataKey="throttle_position" 
                      name="Throttle %" 
                      stroke="hsl(var(--chart-3))" 
                      dot={false}
                      strokeWidth={2}
                    />
                  )}
                  {data.some(d => (d.metrics as any)?.g_force_lat) && (
                    <Line 
                      type="monotone" 
                      dataKey={(d: any) => d.metrics?.g_force_lat}
                      name="Lateral G" 
                      stroke="hsl(var(--chart-4))" 
                      dot={false}
                      strokeWidth={2}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
