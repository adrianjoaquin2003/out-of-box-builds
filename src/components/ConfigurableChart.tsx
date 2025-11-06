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
import { ChevronDown, X, Loader2 } from 'lucide-react';

interface ConfigurableChartProps {
  sessionId: string;
  metric: string;
  metricLabel: string;
  metricUnit: string;
  chartType: 'line' | 'area' | 'bar';
  onRemove: () => void;
  onChangeChartType: (type: 'line' | 'area' | 'bar') => void;
  readOnly?: boolean;
  timeDomain?: [number, number];
  onTimeRangeLoaded?: (min: number, max: number) => void;
  onZoom?: (center: number, zoomDelta: number) => void;
}

export function ConfigurableChart({
  sessionId,
  metric,
  metricLabel,
  metricUnit,
  chartType,
  onRemove,
  onChangeChartType,
  readOnly = false,
  timeDomain,
  onTimeRangeLoaded,
  onZoom,
}: ConfigurableChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ min: 0, max: 0, avg: 0 });
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [sessionId, metric]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !onZoom) return;

    const handleWheel = (e: WheelEvent) => {
      if (!timeDomain) {
        console.log('No timeDomain set yet, skipping zoom');
        return;
      }
      
      e.preventDefault();
      
      // Calculate the mouse position relative to the time domain
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const chartWidth = rect.width;
      const mouseTimePercent = mouseX / chartWidth;
      const currentRange = timeDomain[1] - timeDomain[0];
      const mouseTime = timeDomain[0] + currentRange * mouseTimePercent;
      
      // Zoom delta: scroll up (negative deltaY) should zoom IN (positive zoomDelta to decrease range)
      const zoomDelta = -e.deltaY * 0.001;
      
      console.log('Zoom event:', { deltaY: e.deltaY, zoomDelta, currentRange, mouseTime });
      
      onZoom(mouseTime, zoomDelta);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [onZoom, timeDomain]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log(`[${metricLabel}] Fetching data for metric: ${metric}, session: ${sessionId}`);
      
      // Get uploaded file for this session
      const { data: files, error: filesError } = await supabase
        .from('uploaded_files')
        .select('file_path')
        .eq('session_id', sessionId)
        .eq('upload_status', 'processed')
        .limit(1);

      if (filesError || !files || files.length === 0) {
        console.log('No CSV file, falling back to database');
        // Fallback for old data
        const firstBatch = supabase.rpc('sample_telemetry_data', {
          p_session_id: sessionId,
          p_metric: metric,
          p_sample_size: 2000
        }).range(0, 999);

        const secondBatch = supabase.rpc('sample_telemetry_data', {
          p_session_id: sessionId,
          p_metric: metric,
          p_sample_size: 2000
        }).range(1000, 1999);

        const [result1, result2] = await Promise.all([firstBatch, secondBatch]);
        
        if (result1.error || result2.error) {
          setLoading(false);
          return;
        }

        const telemetry = [...(result1.data || []), ...(result2.data || [])];
        
        if (!telemetry || telemetry.length === 0) {
          setLoading(false);
          return;
        }
        
        const validData = telemetry.map((t: any) => ({
          time: t.row_time,
          value: t.row_value,
        }));
        
      setData(validData);
        
        if (validData.length > 0) {
          const values = validData.map(d => d.value);
          const times = validData.map(d => d.time);
          setStats({
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
          });
          
          // Report time range to parent
          if (onTimeRangeLoaded) {
            onTimeRangeLoaded(Math.min(...times), Math.max(...times));
          }
        }
        setLoading(false);
        return;
      }

      // Stream CSV and extract metric
      console.log(`[${metricLabel}] Streaming from CSV:`, files[0].file_path);
      
      const { streamCsvMetric } = await import('@/lib/csvStreamer');
      const chartData = await streamCsvMetric(files[0].file_path, metric, 2000);

      console.log(`[${metricLabel}] Got ${chartData.length} points from CSV stream`);

      setData(chartData);

      if (chartData.length > 0) {
        const values = chartData.map(d => d.value);
        const times = chartData.map(d => d.time);
        setStats({
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
        });
        
        // Report time range to parent
        if (onTimeRangeLoaded) {
          onTimeRangeLoaded(Math.min(...times), Math.max(...times));
        }
      }
    } catch (error) {
      console.error(`[${metricLabel}] Error:`, error);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    // Calculate synchronized ticks if we have a shared time domain
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
      label: { value: `${metricLabel} (${metricUnit})`, angle: -90, position: 'insideLeft' },
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
            <Area
              type="monotone"
              dataKey="value"
              name={metricLabel}
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary) / 0.2)"
              strokeWidth={2}
            />
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
            <Bar dataKey="value" name={metricLabel} fill="hsl(var(--primary))" />
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
            <Line
              type="monotone"
              dataKey="value"
              name={metricLabel}
              stroke="hsl(var(--primary))"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{metricLabel}</CardTitle>
            <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
              <span>Min: {stats.min.toFixed(2)}{metricUnit}</span>
              <span>Max: {stats.max.toFixed(2)}{metricUnit}</span>
              <span>Avg: {stats.avg.toFixed(2)}{metricUnit}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <>
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
            No data available for this metric
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
