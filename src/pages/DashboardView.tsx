import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Plus, Loader2, X } from 'lucide-react';
import { ConfigurableChart } from '@/components/ConfigurableChart';
import { toast } from '@/hooks/use-toast';

interface Dashboard {
  id: string;
  name: string;
  description: string | null;
}

interface Report {
  id: string;
  name: string;
  session_id: string;
  charts_config: any;
}

interface Session {
  id: string;
  name: string;
  track_name: string;
  date: string;
}

interface DashboardReport {
  id: string;
  report_id: string;
  position: number;
  saved_reports: Report & { sessions: Session };
}

export default function DashboardView() {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [reports, setReports] = useState<DashboardReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [addReportDialogOpen, setAddReportDialogOpen] = useState(false);
  const [availableReports, setAvailableReports] = useState<(Report & { sessions: Session })[]>([]);
  const [timeDomain, setTimeDomain] = useState<[number, number] | undefined>(undefined);
  const [timeRanges, setTimeRanges] = useState<Map<string, [number, number]>>(new Map());
  const [originalTimeDomain, setOriginalTimeDomain] = useState<[number, number] | undefined>(undefined);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDashboard();
    fetchDashboardReports();
  }, [user, dashboardId, navigate]);

  const fetchDashboard = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .eq('id', dashboardId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate('/dashboards');
        return;
      }
      setDashboard(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardReports = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboard_reports')
        .select(`
          *,
          saved_reports (
            *,
            sessions (*)
          )
        `)
        .eq('dashboard_id', dashboardId)
        .order('position', { ascending: true });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching dashboard reports:', error);
    }
  };

  const fetchAvailableReports = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_reports')
        .select(`
          *,
          sessions (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out reports already in this dashboard
      const existingReportIds = new Set(reports.map(r => r.report_id));
      const filtered = (data || []).filter(r => !existingReportIds.has(r.id));
      setAvailableReports(filtered);
    } catch (error) {
      console.error('Error fetching available reports:', error);
    }
  };

  const handleAddReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('dashboard_reports')
        .insert({
          dashboard_id: dashboardId,
          report_id: reportId,
          position: reports.length,
        });

      if (error) throw error;

      await fetchDashboardReports();
      setAddReportDialogOpen(false);
      
      toast({
        title: 'Success',
        description: 'Report added to dashboard',
      });
    } catch (error) {
      console.error('Error adding report:', error);
      toast({
        title: 'Error',
        description: 'Failed to add report',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveReport = async (dashboardReportId: string) => {
    try {
      const { error } = await supabase
        .from('dashboard_reports')
        .delete()
        .eq('id', dashboardReportId);

      if (error) throw error;

      await fetchDashboardReports();
      
      toast({
        title: 'Success',
        description: 'Report removed from dashboard',
      });
    } catch (error) {
      console.error('Error removing report:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove report',
        variant: 'destructive',
      });
    }
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
    if (!timeDomain || !originalTimeDomain) return;
    
    const [currentMin, currentMax] = timeDomain;
    const currentRange = currentMax - currentMin;
    const [origMin, origMax] = originalTimeDomain;
    const maxRange = origMax - origMin;
    
    // Calculate new range (limit zoom in to 5% of original, zoom out to 100% of original)
    const zoomFactor = Math.exp(-zoomDelta);
    let newRange = currentRange * zoomFactor;
    newRange = Math.max(maxRange * 0.05, Math.min(maxRange, newRange));
    
    // Calculate new bounds centered on mouse position
    const centerPercent = (center - currentMin) / currentRange;
    let newMin = center - newRange * centerPercent;
    let newMax = center + newRange * (1 - centerPercent);
    
    // Clamp to original bounds
    if (newMin < origMin) {
      newMin = origMin;
      newMax = origMin + newRange;
    }
    if (newMax > origMax) {
      newMax = origMax;
      newMin = origMax - newRange;
    }
    
    setTimeDomain([newMin, newMax]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboards')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboards
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{dashboard?.name}</h1>
                {dashboard?.description && (
                  <p className="text-sm text-muted-foreground">{dashboard.description}</p>
                )}
              </div>
            </div>
            <Button 
              onClick={() => {
                fetchAvailableReports();
                setAddReportDialogOpen(true);
              }}
              className="racing-gradient"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Report
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {reports.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">No Reports Added</h3>
              <p className="text-muted-foreground mb-4">
                Add reports to this dashboard to start comparing data across sessions
              </p>
              <Button 
                onClick={() => {
                  fetchAvailableReports();
                  setAddReportDialogOpen(true);
                }}
                className="racing-gradient"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Report
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {reports.map((dashboardReport) => {
              const report = dashboardReport.saved_reports;
              const session = report.sessions;
              const chartsConfig = (report.charts_config as any) || [];

              return (
                <Card key={dashboardReport.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{report.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {session.name} - {session.track_name} - {new Date(session.date).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveReport(dashboardReport.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {chartsConfig.map((chart: any) => {
                        const AVAILABLE_METRICS = [
                          { key: 'ground_speed', label: 'Speed', unit: 'km/h' },
                          { key: 'engine_speed', label: 'Engine RPM', unit: 'RPM' },
                          { key: 'throttle_position', label: 'Throttle Position', unit: '%' },
                          { key: 'g_force_lat', label: 'Lateral G-Force', unit: 'G' },
                          { key: 'g_force_long', label: 'Longitudinal G-Force', unit: 'G' },
                          { key: 'g_force_vert', label: 'Vertical G-Force', unit: 'G' },
                          { key: 'engine_oil_temperature', label: 'Oil Temperature', unit: '°C' },
                          { key: 'coolant_temperature', label: 'Coolant Temperature', unit: '°C' },
                          { key: 'boost_pressure', label: 'Boost Pressure', unit: 'bar' },
                          { key: 'fuel_pressure_sensor', label: 'Fuel Pressure', unit: 'bar' },
                          { key: 'gear', label: 'Gear', unit: '' },
                        ];
                        const metric = AVAILABLE_METRICS.find(m => m.key === chart.metric);
                        
                        return (
                          <ConfigurableChart
                            key={chart.id}
                            sessionId={session.id}
                            metric={chart.metric}
                            metricLabel={metric?.label || chart.metric}
                            metricUnit={metric?.unit || ''}
                            chartType={chart.chartType}
                            onRemove={() => {}}
                            onChangeChartType={() => {}}
                            readOnly
                            timeDomain={timeDomain}
                            onTimeRangeLoaded={(min, max) => handleTimeRangeLoaded(`${dashboardReport.id}-${chart.id}`, min, max)}
                            onZoom={handleZoom}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={addReportDialogOpen} onOpenChange={setAddReportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Report to Dashboard</DialogTitle>
            <DialogDescription>
              Select a saved report to add to this dashboard
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {availableReports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No available reports. Create some reports first!
                </p>
              ) : (
                availableReports.map((report) => (
                  <Card 
                    key={report.id} 
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleAddReport(report.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{report.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {report.sessions.name} - {report.sessions.track_name} - {new Date(report.sessions.date).toLocaleDateString()}
                          </p>
                        </div>
                        <Button size="sm">Add</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
