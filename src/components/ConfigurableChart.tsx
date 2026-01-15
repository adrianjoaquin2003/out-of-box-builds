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
  ReferenceArea,
} from 'recharts';
import { ChevronDown, X, Loader2, Plus, Trash2 } from 'lucide-react';
import {
  ChevronDown,
  X,
  Loader2,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  MoveLeft,
  MoveRight,
  Highlighter,
  RotateCcw,
  Eraser,
} from 'lucide-react';
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
  onPan?: (delta: number) => void;
  onResetZoom?: () => void;
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
  onPan,
  onResetZoom,
  availableMetrics = [],
  onSelectMetric,
}: ConfigurableChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Map<string, { min: number; max: number; avg: number }>>(new Map());
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [showMetricSelector, setShowMetricSelector] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlights, setHighlights] = useState<Array<{ start: number; end: number }>>([]);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [sessionId, JSON.stringify(metrics.map(m => m.key))]);

  useEffect(() => {
    if (!highlightMode) {
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  }, [highlightMode]);

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
@@ -204,147 +233,231 @@ export function ConfigurableChart({
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
      onMouseDown: handleHighlightStart,
      onMouseMove: handleHighlightMove,
      onMouseUp: handleHighlightEnd,
      onMouseLeave: handleHighlightEnd,
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

    const renderHighlights = () => {
      const selectionRange =
        selectionStart !== null && selectionEnd !== null
          ? {
              start: Math.min(selectionStart, selectionEnd),
              end: Math.max(selectionStart, selectionEnd),
            }
          : null;

      return (
        <>
          {highlights.map((range, index) => (
            <ReferenceArea
              key={`${range.start}-${range.end}-${index}`}
              x1={range.start}
              x2={range.end}
              fill="hsl(var(--primary) / 0.12)"
              stroke="hsl(var(--primary))"
              strokeOpacity={0.4}
            />
          ))}
          {selectionRange && (
            <ReferenceArea
              x1={selectionRange.start}
              x2={selectionRange.end}
              fill="hsl(var(--accent) / 0.18)"
              stroke="hsl(var(--accent))"
              strokeOpacity={0.5}
            />
          )}
        </>
      );
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
            {renderHighlights()}
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
            {renderHighlights()}
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
            {renderHighlights()}
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

  const formatTime = (value: number) => value.toFixed(2);

  const handleZoomClick = (direction: 'in' | 'out') => {
    if (!onZoom || !timeDomain) return;
    const center = (timeDomain[0] + timeDomain[1]) / 2;
    const delta = direction === 'in' ? 0.35 : -0.35;
    onZoom(center, delta);
  };

  const handlePanClick = (direction: 'left' | 'right') => {
    if (!onPan || !timeDomain) return;
    const range = timeDomain[1] - timeDomain[0];
    const delta = range * 0.2 * (direction === 'left' ? -1 : 1);
    onPan(delta);
  };

  const handleHighlightStart = (e: any) => {
    if (!highlightMode) return;
    if (e?.activeLabel == null) return;
    setSelectionStart(e.activeLabel);
    setSelectionEnd(e.activeLabel);
  };

  const handleHighlightMove = (e: any) => {
    if (!highlightMode || selectionStart === null) return;
    if (e?.activeLabel == null) return;
    setSelectionEnd(e.activeLabel);
  };

  const handleHighlightEnd = () => {
    if (!highlightMode || selectionStart === null || selectionEnd === null) return;
    if (selectionStart === selectionEnd) {
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    setHighlights((prev) => [...prev, { start, end }]);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

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
@@ -391,52 +504,109 @@ export function ConfigurableChart({
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
        <div className="flex flex-wrap items-center gap-2 pt-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleZoomClick('out')} disabled={!onZoom || !timeDomain}>
              <ZoomOut className="h-4 w-4 mr-1" />
              Zoom Out
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleZoomClick('in')} disabled={!onZoom || !timeDomain}>
              <ZoomIn className="h-4 w-4 mr-1" />
              Zoom In
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePanClick('left')} disabled={!onPan || !timeDomain}>
              <MoveLeft className="h-4 w-4 mr-1" />
              Pan Left
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePanClick('right')} disabled={!onPan || !timeDomain}>
              <MoveRight className="h-4 w-4 mr-1" />
              Pan Right
            </Button>
            {onResetZoom && (
              <Button variant="outline" size="sm" onClick={onResetZoom} disabled={!timeDomain}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={highlightMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setHighlightMode((prev) => !prev)}
            >
              <Highlighter className="h-4 w-4 mr-1" />
              {highlightMode ? 'Highlighting' : 'Highlight'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHighlights([])}
              disabled={highlights.length === 0}
            >
              <Eraser className="h-4 w-4 mr-1" />
              Clear Highlights
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Scroll horizontally to explore. Use zoom/pan to scale the timeline. Toggle highlight to drag over segments.
          </p>
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
            className={`overflow-x-auto ${highlightMode ? 'cursor-crosshair' : 'cursor-zoom-in'}`}
            style={{ userSelect: 'none' }}
          >
            <div style={{ minWidth: timeDomain ? (timeDomain[1] - timeDomain[0]) * 4 : Math.max(800, data.length * 1.5) + 'px' }}>
              <ResponsiveContainer width="100%" height={300}>
                {renderChart()}
              </ResponsiveContainer>
            </div>
            {highlights.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {highlights.map((range, index) => (
                  <Badge key={`${range.start}-${range.end}-${index}`} variant="secondary" className="text-xs">
                    {formatTime(range.start)}s → {formatTime(range.end)}s
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}