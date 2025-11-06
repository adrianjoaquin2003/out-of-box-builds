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
  ReferenceLine as RechartReferenceLine,
} from 'recharts';
import { ChevronDown, X, Loader2, Settings2, Download } from 'lucide-react';
import { exportChartDataAsCSV } from '@/lib/reportExport';

export interface ChartSettings {
  yAxisMode: 'auto' | 'custom';
  yAxisMin?: number;
  yAxisMax?: number;
  showMovingAverage: boolean;
  movingAverageWindow: number;
  referenceLines: Array<{ value: number; label: string; color: string }>;
  colors: string[];
}

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
  settings?: ChartSettings;
  onSettingsChange?: (settings: ChartSettings) => void;
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
  settings,
  onSettingsChange,
}: ConfigurableChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ min: 0, max: 0, avg: 0 });
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState<ChartSettings>(settings || {
    yAxisMode: 'auto',
    showMovingAverage: false,
    movingAverageWindow: 10,
    referenceLines: [],
    colors: ['hsl(var(--primary))'],
  });

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
      
      // Zoom delta: positive = zoom in, negative = zoom out (inverted scroll)
      const zoomDelta = e.deltaY * 0.001;
      
      console.log('Zoom event:', { deltaY: e.deltaY, zoomDelta, currentRange, mouseTime });
      
      onZoom(mouseTime, zoomDelta);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [onZoom, timeDomain]);

  const calculateMovingAverage = (data: any[], window: number) => {
    return data.map((point, index) => {
      const start = Math.max(0, index - Math.floor(window / 2));
      const end = Math.min(data.length, index + Math.ceil(window / 2));
      const slice = data.slice(start, end);
      const avg = slice.reduce((sum, p) => sum + p.value, 0) / slice.length;
      return { ...point, movingAvg: avg };
    });
  };

  const handleExportCSV = () => {
    const dataToExport = localSettings.showMovingAverage
      ? calculateMovingAverage(data, localSettings.movingAverageWindow)
      : data;
    exportChartDataAsCSV(dataToExport, metricLabel, metricUnit);
  };

  const handleSettingsSave = (newSettings: ChartSettings) => {
    setLocalSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

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
    const displayData = localSettings.showMovingAverage
      ? calculateMovingAverage(data, localSettings.movingAverageWindow)
      : data;

    const commonProps = {
      data: displayData,
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

    const yAxisDomain = localSettings.yAxisMode === 'custom'
      ? [
          localSettings.yAxisMin ?? 'auto',
          localSettings.yAxisMax ?? 'auto',
        ]
      : (['auto', 'auto'] as [string, string]);

    const yAxisProps = {
      label: { value: `${metricLabel} (${metricUnit})`, angle: -90, position: 'insideLeft' },
      domain: yAxisDomain,
    };

    const renderReferenceLines = () =>
      localSettings.referenceLines.map((line, index) => (
        <RechartReferenceLine
          key={index}
          y={line.value}
          label={line.label}
          stroke={line.color}
          strokeDasharray="3 3"
        />
      ));

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip />
            <Legend />
            {renderReferenceLines()}
            <Area
              type="monotone"
              dataKey="value"
              name={metricLabel}
              stroke={localSettings.colors[0] || 'hsl(var(--primary))'}
              fill={`${localSettings.colors[0] || 'hsl(var(--primary))'} / 0.2`}
              strokeWidth={2}
            />
            {localSettings.showMovingAverage && (
              <Area
                type="monotone"
                dataKey="movingAvg"
                name="Moving Average"
                stroke="hsl(var(--chart-2))"
                fill="none"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            )}
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
            {renderReferenceLines()}
            <Bar
              dataKey="value"
              name={metricLabel}
              fill={localSettings.colors[0] || 'hsl(var(--primary))'}
            />
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
            {renderReferenceLines()}
            <Line
              type="monotone"
              dataKey="value"
              name={metricLabel}
              stroke={localSettings.colors[0] || 'hsl(var(--primary))'}
              dot={false}
              strokeWidth={2}
            />
            {localSettings.showMovingAverage && (
              <Line
                type="monotone"
                dataKey="movingAvg"
                name="Moving Average"
                stroke="hsl(var(--chart-2))"
                dot={false}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            )}
          </LineChart>
        );
    }
  };

  return (
    <>
      <Card data-chart-card>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    title="Chart Settings"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportCSV}
                    title="Export as CSV"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
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

    {!readOnly && onSettingsChange && (
      <div>Settings dialog placeholder - click settings icon</div>
    )}
  </>
  );
}
