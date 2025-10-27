import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { ConfigurableChart } from '@/components/ConfigurableChart';
import { toast } from '@/hooks/use-toast';

interface ChartConfig {
  id: string;
  metric: string;
  chartType: 'line' | 'area' | 'bar';
}

interface Session {
  id: string;
  name: string;
  track_name: string;
  date: string;
}

// Available metrics from telemetry data
const AVAILABLE_METRICS = [
  { key: 'ground_speed', label: 'Speed', unit: 'km/h', category: 'Performance' },
  { key: 'engine_speed', label: 'Engine RPM', unit: 'RPM', category: 'Engine' },
  { key: 'throttle_position', label: 'Throttle Position', unit: '%', category: 'Driver Input' },
  { key: 'g_force_lat', label: 'Lateral G-Force', unit: 'G', category: 'Forces' },
  { key: 'g_force_long', label: 'Longitudinal G-Force', unit: 'G', category: 'Forces' },
  { key: 'g_force_vert', label: 'Vertical G-Force', unit: 'G', category: 'Forces' },
  { key: 'engine_oil_temperature', label: 'Oil Temperature', unit: '°C', category: 'Engine' },
  { key: 'engine_oil_pressure', label: 'Oil Pressure', unit: 'bar', category: 'Engine' },
  { key: 'coolant_temperature', label: 'Coolant Temperature', unit: '°C', category: 'Engine' },
  { key: 'inlet_air_temperature', label: 'Inlet Air Temp', unit: '°C', category: 'Engine' },
  { key: 'boost_pressure', label: 'Boost Pressure', unit: 'bar', category: 'Engine' },
  { key: 'fuel_pressure_sensor', label: 'Fuel Pressure', unit: 'bar', category: 'Fuel' },
  { key: 'fuel_temperature', label: 'Fuel Temperature', unit: '°C', category: 'Fuel' },
  { key: 'gear', label: 'Gear', unit: '', category: 'Transmission' },
];

export default function ReportBuilder() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(AVAILABLE_METRICS.map(m => m.category)))];

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      setSession(data);
    } catch (error) {
      console.error('Error fetching session:', error);
      toast({
        title: 'Error',
        description: 'Failed to load session',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addChart = (metric: string) => {
    const newChart: ChartConfig = {
      id: `${metric}-${Date.now()}`,
      metric,
      chartType: 'line',
    };
    setCharts([...charts, newChart]);
    toast({
      title: 'Chart Added',
      description: `${AVAILABLE_METRICS.find(m => m.key === metric)?.label} chart added to report`,
    });
  };

  const removeChart = (chartId: string) => {
    setCharts(charts.filter(c => c.id !== chartId));
  };

  const updateChartType = (chartId: string, chartType: 'line' | 'area' | 'bar') => {
    setCharts(charts.map(c => c.id === chartId ? { ...c, chartType } : c));
  };

  const filteredMetrics = selectedCategory === 'All'
    ? AVAILABLE_METRICS
    : AVAILABLE_METRICS.filter(m => m.category === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{session?.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {session?.track_name} - {session && new Date(session.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Data Fields */}
        <aside className="w-80 border-r border-border bg-card/30 flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-lg mb-3">Available Metrics</h2>
            <ScrollArea className="h-12">
              <div className="flex gap-2">
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {filteredMetrics.map(metric => (
                <Card key={metric.key} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{metric.label}</p>
                        <p className="text-xs text-muted-foreground">{metric.unit || 'Value'}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addChart(metric.key)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Canvas - Report Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-6 py-6">
            {charts.length === 0 ? (
              <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <Card className="max-w-md text-center">
                  <CardHeader>
                    <CardTitle>Build Your Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Select metrics from the left sidebar to add charts to your report. 
                      You can customize each chart's appearance and layout.
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                {charts.map(chart => {
                  const metric = AVAILABLE_METRICS.find(m => m.key === chart.metric);
                  return (
                    <ConfigurableChart
                      key={chart.id}
                      sessionId={sessionId!}
                      metric={chart.metric}
                      metricLabel={metric?.label || chart.metric}
                      metricUnit={metric?.unit || ''}
                      chartType={chart.chartType}
                      onRemove={() => removeChart(chart.id)}
                      onChangeChartType={(type) => updateChartType(chart.id, type)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
