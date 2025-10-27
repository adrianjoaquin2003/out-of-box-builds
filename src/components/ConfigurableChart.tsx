import { useEffect, useState } from 'react';
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
}

export function ConfigurableChart({
  sessionId,
  metric,
  metricLabel,
  metricUnit,
  chartType,
  onRemove,
  onChangeChartType,
}: ConfigurableChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ min: 0, max: 0, avg: 0 });

  useEffect(() => {
    fetchData();
  }, [sessionId, metric]);

  const fetchData = async () => {
    try {
      const { data: telemetry, error } = await supabase
        .from('telemetry_data')
        .select('*')
        .eq('session_id', sessionId)
        .order('time', { ascending: true })
        .limit(2000);

      if (error) throw error;

      if (telemetry && telemetry.length > 0) {
        // Filter out null values and prepare data
        const validData = telemetry
          .filter((t: any) => t[metric] != null && t.time != null)
          .map((t: any) => ({
            time: t.time,
            value: t[metric],
          }));

        setData(validData);

        // Calculate statistics
        if (validData.length > 0) {
          const values = validData.map(d => d.value);
          setStats({
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching telemetry:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const xAxisProps = {
      dataKey: 'time',
      label: { value: 'Time (seconds)', position: 'insideBottom', offset: -5 },
      domain: [0, 'dataMax'] as [number, string],
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
          <div className="overflow-x-auto">
            <div style={{ minWidth: Math.max(800, data.length * 1.5) + 'px' }}>
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
