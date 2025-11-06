import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown, X, Loader2, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MetricConfig {
  key: string;
  label: string;
  unit: string;
}

interface ConfigurableChartProps {
  sessionId: string;
  metrics: MetricConfig[];
  chartType: 'line' | 'area' | 'bar';
  onRemove: () => void;
  onChangeChartType: (type: 'line' | 'area' | 'bar') => void;
  onRemoveMetric: (metricKey: string) => void;
  readOnly?: boolean;
  timeDomain?: [number, number];
  onTimeRangeLoaded?: (min: number, max: number) => void;
  onZoom?: (center: number, zoomDelta: number) => void;
  availableMetrics?: MetricConfig[];
  onSelectMetric?: (metricKey: string) => void;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function ConfigurableChart({
  sessionId,
  metrics,
  chartType,
  onRemove,
  onChangeChartType,
  onRemoveMetric,
  readOnly = false,
  timeDomain,
  onTimeRangeLoaded,
  onZoom,
  availableMetrics = [],
  onSelectMetric,
}: ConfigurableChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Map<string, { min: number; max: number; avg: number }>>(new Map());
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [showMetricSelector, setShowMetricSelector] = useState(false);

  useEffect(() => {
    fetchData();
  }, [sessionId, JSON.stringify(metrics.map(m => m.key))]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !onZoom) return;

    const handleWheel = (e: WheelEvent) => {
      if (!timeDomain) return;
      
      e.preventDefault();
      
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const chartWidth = rect.width;
      const mouseTimePercent = mouseX / chartWidth;
      const currentRange = timeDomain[1] - timeDomain[0];
      const mouseTime = timeDomain[0] + currentRange * mouseTimePercent;
      
      const zoomDelta = e.deltaY * 0.001;
      onZoom(mouseTime, zoomDelta);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [onZoom, timeDomain]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: files, error: filesError } = await supabase
        .from('uploaded_files')
        .select('file_path')
        .eq('session_id', sessionId)
        .eq('upload_status', 'processed')
        .limit(1);

      if (filesError || !files || files.length === 0) {
        const fetchPromises = metrics.map(async (metric) => {
          const firstBatch = supabase.rpc('sample_telemetry_data', {
            p_session_id: sessionId,
            p_metric: metric.key,
            p_sample_size: 2000
          }).range(0, 999);

          const secondBatch = supabase.rpc('sample_telemetry_data', {
            p_session_id: sessionId,
            p_metric: metric.key,
            p_sample_size: 2000
          }).range(1000, 1999);

          const [result1, result2] = await Promise.all([firstBatch, secondBatch]);
          
          if (result1.error || result2.error) {
            return { metric: metric.key, data: [] };
          }

          const telemetry = [...(result1.data || []), ...(result2.data || [])];
          return { metric: metric.key, data: telemetry };
        });

        const results = await Promise.all(fetchPromises);
        
        const mergedData = new Map<number, any>();
        const newStats = new Map<string, { min: number; max: number; avg: number }>();
        
        results.forEach(({ metric, data }) => {
          const values: number[] = [];
          data.forEach((t: any) => {
            const time = t.row_time;
            if (!mergedData.has(time)) {
              mergedData.set(time, { time });
            }
            mergedData.get(time)![metric] = t.row_value;
            values.push(t.row_value);
          });
          
          if (values.length > 0) {
            newStats.set(metric, {
              min: Math.min(...values),
              max: Math.max(...values),
              avg: values.reduce((a, b) => a + b, 0) / values.length,
            });
          }
        });
        
        const sortedData = Array.from(mergedData.values()).sort((a, b) => a.time - b.time);
        setData(sortedData);
        setStats(newStats);
        
        if (sortedData.length > 0 && onTimeRangeLoaded) {
          const times = sortedData.map(d => d.time);
          onTimeRangeLoaded(Math.min(...times), Math.max(...times));
        }
        
        setLoading(false);
        return;
      }

      const { streamCsvMetric } = await import('@/lib/csvStreamer');
      
      const fetchPromises = metrics.map(metric => 
        streamCsvMetric(files[0].file_path, metric.key, 2000)
      );
      
      const results = await Promise.all(fetchPromises);
      
      const mergedData = new Map<number, any>();
      const newStats = new Map<string, { min: number; max: number; avg: number }>();
      
      metrics.forEach((metric, index) => {
        const metricData = results[index];
        const values: number[] = [];
        
        metricData.forEach(point => {
          if (!mergedData.has(point.time)) {
            mergedData.set(point.time, { time: point.time });
          }
          mergedData.get(point.time)![metric.key] = point.value;
          values.push(point.value);
        });
        
        if (values.length > 0) {
          newStats.set(metric.key, {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
          });
        }
      });

      const sortedData = Array.from(mergedData.values()).sort((a, b) => a.time - b.time);
      setData(sortedData);
      setStats(newStats);

      if (sortedData.length > 0 && onTimeRangeLoaded) {
        const times = sortedData.map(d => d.time);
        onTimeRangeLoaded(Math.min(...times), Math.max(...times));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const calculateTicks = () => {
      if (!timeDomain) return undefined;
      
      const [min, max] = timeDomain;
      const range = max - min;
      const tickCount = Math.min(15, Math.max(8, Math.floor(range / 20)));
      const tickInterval = range / (tickCount - 1);
      
      return Array.from({ length: tickCount }, (_, i) => 
        Math.round((min + i * tickInterval) * 100) / 100
      );
    };

    const xAxisProps = {
      dataKey: 'time',
      type: 'number' as const,
      label: { value: 'Time (seconds)', position: 'insideBottom', offset: -5 },
      domain: timeDomain || ([0, 'dataMax'] as [number, string]),
      scale: 'linear' as const,
      ticks: calculateTicks(),
    };

    const yAxisProps = {
      label: { value: metrics.length === 1 ? `${metrics[0].label} (${metrics[0].unit})` : 'Value', angle: -90, position: 'insideLeft' },
      domain: ['auto', 'auto'] as [string, string],
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip />
            <Legend />
            {metrics.map((metric, index) => (
              <Area
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                name={metric.label}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                fill={`${CHART_COLORS[index % CHART_COLORS.length]} / 0.2`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip />
            <Legend />
            {metrics.map((metric, index) => (
              <Bar 
                key={metric.key}
                dataKey={metric.key} 
                name={metric.label} 
                fill={CHART_COLORS[index % CHART_COLORS.length]} 
              />
            ))}
          </BarChart>
        );
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip />
            <Legend />
            {metrics.map((metric, index) => (
              <Line
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                name={metric.label}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                dot={false}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        );
    }
  };

  const availableToAdd = availableMetrics.filter(
    m => !metrics.find(existing => existing.key === m.key)
  );

  return (
    <Card data-chart-container>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle>
              {metrics.length === 1 ? metrics[0].label : `Multi-Metric Chart (${metrics.length} metrics)`}
            </CardTitle>
            <div className="flex flex-wrap gap-3 mt-2">
              {metrics.map((metric) => {
                const metricStats = stats.get(metric.key);
                return (
                  <div key={metric.key} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {metric.label}
                    </Badge>
                    {metricStats && (
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>Min: {metricStats.min.toFixed(2)}{metric.unit}</span>
                        <span>Max: {metricStats.max.toFixed(2)}{metric.unit}</span>
                        <span>Avg: {metricStats.avg.toFixed(2)}{metric.unit}</span>
                      </div>
                    )}
                    {!readOnly && metrics.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={() => onRemoveMetric(metric.key)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <>
                {availableToAdd.length > 0 && onSelectMetric && (
                  <DropdownMenu open={showMetricSelector} onOpenChange={setShowMetricSelector}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Metric
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                      {availableToAdd.map(metric => (
                        <DropdownMenuItem 
                          key={metric.key}
                          onClick={() => {
                            onSelectMetric(metric.key);
                            setShowMetricSelector(false);
                          }}
                        >
                          {metric.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {chartType.charAt(0).toUpperCase() + chartType.slice(1)}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onChangeChartType('line')}>
                      Line Chart
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangeChartType('area')}>
                      Area Chart
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangeChartType('bar')}>
                      Bar Chart
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="sm" onClick={onRemove}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No data available for these metrics
          </div>
        ) : (
          <div 
            ref={chartContainerRef}
            className="overflow-x-auto cursor-zoom-in"
            style={{ userSelect: 'none' }}
          >
            <div style={{ minWidth: timeDomain ? (timeDomain[1] - timeDomain[0]) * 4 : Math.max(800, data.length * 1.5) + 'px' }}>
              <ResponsiveContainer width="100%" height={300}>
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
