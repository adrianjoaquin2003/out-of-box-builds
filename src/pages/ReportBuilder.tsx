import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Loader2, Save } from 'lucide-react';
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
  available_metrics?: Array<{ key: string; label: string; unit: string; category: string }>;
}

interface Metric {
  key: string;
  label: string;
  unit: string;
  category: string;
}

export default function ReportBuilder() {
  const { sessionId, reportId } = useParams<{ sessionId: string; reportId?: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reportName, setReportName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [availableMetrics, setAvailableMetrics] = useState<Metric[]>([]);
  const [timeDomain, setTimeDomain] = useState<[number, number] | undefined>(undefined);
  const [timeRanges, setTimeRanges] = useState<Map<string, [number, number]>>(new Map());
  const [originalTimeDomain, setOriginalTimeDomain] = useState<[number, number] | undefined>(undefined);

  const categories = ['All', ...Array.from(new Set(availableMetrics.map(m => m.category)))];

  useEffect(() => {
    if (sessionId) {
      fetchSession();
      if (reportId) {
        fetchReport();
      }
    }
  }, [sessionId, reportId]);

  const fetchSession = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      
      // Parse available_metrics as an array of Metric objects
      let metrics = Array.isArray(data.available_metrics) 
        ? (data.available_metrics as unknown as Metric[])
        : [];
      
      // Check if metadata needs fixing (has quoted keys)
      if (metrics.length > 0 && metrics[0].key.startsWith('"')) {
        // Fix the metadata by removing extra quotes
        const fixedMetrics = metrics.map(metric => ({
          key: metric.key.replace(/"/g, ''),
          label: metric.label.replace(/"/g, ''),
          unit: metric.unit.replace(/"/g, ''),
          category: metric.category
        }));
        
        // Update the session with fixed metadata
        const { error: updateError } = await supabase
          .from('sessions')
          .update({ available_metrics: fixedMetrics as any })
          .eq('id', sessionId);
        
        if (updateError) {
          console.error('Error updating metadata:', updateError);
        } else {
          metrics = fixedMetrics;
          toast({
            title: 'Metadata Fixed',
            description: 'Session metadata has been automatically corrected',
          });
        }
      }
      
      setSession({
        id: data.id,
        name: data.name,
        track_name: data.track_name || '',
        date: data.date || '',
        available_metrics: metrics
      });
      setAvailableMetrics(metrics);
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

  const fetchReport = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) throw error;
      
      setReportName(data.name);
      setCharts((data.charts_config as any) || []);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report',
        variant: 'destructive',
      });
    }
  };

  const handleSaveReport = async () => {
    if (!reportName.trim()) {
      setShowSaveDialog(true);
      return;
    }

    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (reportId) {
        // Update existing report
        const { error } = await supabase
          .from('saved_reports')
          .update({ 
            name: reportName,
            charts_config: charts as any
          })
          .eq('id', reportId);

        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Report updated successfully',
        });
      } else {
        // Create new report
        const { data, error } = await supabase
          .from('saved_reports')
          .insert({
            session_id: sessionId!,
            user_id: userData.user?.id!,
            name: reportName,
            charts_config: charts as any
          })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Report saved successfully',
        });

        // Navigate to the newly created report
        navigate(`/session/${sessionId}/report/${data.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: 'Error',
        description: 'Failed to save report',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      setShowSaveDialog(false);
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
      description: `${availableMetrics.find(m => m.key === metric)?.label} chart added to report`,
    });
  };

  const removeChart = (chartId: string) => {
    setCharts(charts.filter(c => c.id !== chartId));
  };

  const updateChartType = (chartId: string, chartType: 'line' | 'area' | 'bar') => {
    setCharts(charts.map(c => c.id === chartId ? { ...c, chartType } : c));
  };

  const handleTimeRangeLoaded = (chartId: string, min: number, max: number) => {
    setTimeRanges(prev => {
      const updated = new Map(prev);
      updated.set(chartId, [min, max]);
      
      // Calculate global time domain from all loaded ranges
      if (updated.size > 0) {
        const allRanges = Array.from(updated.values());
        const globalMin = Math.min(...allRanges.map(r => r[0]));
        const globalMax = Math.max(...allRanges.map(r => r[1]));
        setTimeDomain([globalMin, globalMax]);
        
        // Set original domain if not yet set
        if (!originalTimeDomain) {
          setOriginalTimeDomain([globalMin, globalMax]);
        }
      }
      
      return updated;
    });
  };

  const handleZoom = (center: number, zoomDelta: number) => {
    if (!timeDomain || !originalTimeDomain) {
      console.log('Cannot zoom: missing domains', { timeDomain, originalTimeDomain });
      return;
    }
    
    const [currentMin, currentMax] = timeDomain;
    const currentRange = currentMax - currentMin;
    const [origMin, origMax] = originalTimeDomain;
    const maxRange = origMax - origMin;
    
    console.log('Before zoom:', { currentRange, maxRange, zoomDelta });
    
    // Calculate new range (limit zoom in to 0.1 seconds minimum)
    const zoomFactor = Math.exp(-zoomDelta);
    let newRange = currentRange * zoomFactor;
    
    console.log('Calculated newRange:', newRange, 'zoomFactor:', zoomFactor);
    
    // Clamp to valid range
    newRange = Math.max(0.1, Math.min(maxRange, newRange));
    
    console.log('After clamp:', newRange);
    
    // Calculate new bounds centered on mouse position
    const centerPercent = (center - currentMin) / currentRange;
    let newMin = center - newRange * centerPercent;
    let newMax = center + newRange * (1 - centerPercent);
    
    // Ensure bounds stay within original data range
    if (newMin < origMin) {
      newMin = origMin;
      newMax = Math.min(origMax, origMin + newRange);
    }
    if (newMax > origMax) {
      newMax = origMax;
      newMin = Math.max(origMin, origMax - newRange);
    }
    
    console.log('Setting new timeDomain:', [newMin, newMax]);
    setTimeDomain([newMin, newMax]);
  };

  const filteredMetrics = availableMetrics
    .filter(m => selectedCategory === 'All' || m.category === selectedCategory)
    .filter(m => 
      searchQuery === '' || 
      m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.key.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                <h1 className="text-2xl font-bold">
                  {reportName || 'New Report'} - {session?.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {session?.track_name} - {session && new Date(session.date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button 
              onClick={() => reportName ? handleSaveReport() : setShowSaveDialog(true)}
              disabled={isSaving || charts.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : reportId ? 'Update Report' : 'Save Report'}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Data Fields */}
        <aside className="w-80 border-r border-border bg-card/30 flex flex-col">
          <div className="p-4 border-b border-border space-y-3">
            <h2 className="font-semibold text-lg">Available Metrics</h2>
            
            <Input
              placeholder="Search metrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            
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
              {filteredMetrics.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-sm">No metrics found</p>
                  <p className="text-xs mt-1">Try a different search or category</p>
                </div>
              ) : (
                filteredMetrics.map(metric => (
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
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Canvas - Report Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-6 py-6">
            {availableMetrics.length === 0 ? (
              <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <Card className="max-w-md text-center">
                  <CardHeader>
                    <CardTitle>No Telemetry Data Available</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      This session doesn't have any telemetry data yet. Upload a CSV file to get started.
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : charts.length === 0 ? (
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
                  const metric = availableMetrics.find(m => m.key === chart.metric);
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
                      timeDomain={timeDomain}
                      onTimeRangeLoaded={(min, max) => handleTimeRangeLoaded(chart.id, min, max)}
                      onZoom={handleZoom}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Save Report Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Report</DialogTitle>
            <DialogDescription>
              Give your report a name to save it for later use
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reportName">Report Name</Label>
              <Input
                id="reportName"
                placeholder="e.g., Vehicle Dynamics Report"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && reportName.trim()) {
                    handleSaveReport();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSaveReport} 
                disabled={!reportName.trim() || isSaving}
                className="flex-1"
              >
                {isSaving ? 'Saving...' : 'Save Report'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowSaveDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
