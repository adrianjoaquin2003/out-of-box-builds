import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTeam } from '@/hooks/useTeam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Upload, BarChart3, Timer, Zap, LogOut, FileText, LayoutDashboard, Users, RefreshCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import * as Papa from 'papaparse';

interface Session {
  id: string;
  name: string;
  session_type: string;
  track_name: string;
  date: string;
  driver_name: string;
  car_info: string;
  created_at: string;
}

interface FileStatus {
  id: string;
  session_id: string;
  file_name: string;
  upload_status: 'pending' | 'processing' | 'processed' | 'failed';
  created_at: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  team_name?: string;
}

// Helper function to compress CSV file using Deflate
const compressCsvFile = async (file: File): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const stream = new Blob([arrayBuffer]).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream('deflate'));
  const compressedBlob = await new Response(compressedStream).blob();
  return compressedBlob;
};

// Helper function to extract metadata from CSV (client-side parsing)
const extractCsvMetadata = async (
  file: File
): Promise<Array<{ key: string; label: string; unit: string; category: string }>> => {
  return new Promise((resolve, reject) => {
    const metricsMap: Record<string, { label: string; unit: string; category: string }> = {
      'time': { label: 'Time', unit: 's', category: 'Timing' },
      'ground_speed': { label: 'Speed', unit: 'km/h', category: 'Performance' },
      'gps_speed': { label: 'GPS Speed', unit: 'km/h', category: 'Performance' },
      'drive_speed': { label: 'Drive Speed', unit: 'km/h', category: 'Performance' },
      'engine_speed': { label: 'Engine RPM', unit: 'RPM', category: 'Engine' },
      'throttle_position': { label: 'Throttle Position', unit: '%', category: 'Driver Input' },
      'throttle_pedal': { label: 'Throttle Pedal', unit: '%', category: 'Driver Input' },
      'g_force_lat': { label: 'Lateral G-Force', unit: 'G', category: 'Forces' },
      'g_force_long': { label: 'Longitudinal G-Force', unit: 'G', category: 'Forces' },
      'g_force_vert': { label: 'Vertical G-Force', unit: 'G', category: 'Forces' },
      'engine_oil_temperature': { label: 'Oil Temperature', unit: '°C', category: 'Engine' },
      'engine_oil_pressure': { label: 'Oil Pressure', unit: 'bar', category: 'Engine' },
      'coolant_temperature': { label: 'Coolant Temperature', unit: '°C', category: 'Engine' },
      'inlet_air_temperature': { label: 'Inlet Air Temp', unit: '°C', category: 'Engine' },
      'boost_pressure': { label: 'Boost Pressure', unit: 'bar', category: 'Engine' },
      'fuel_pressure_sensor': { label: 'Fuel Pressure', unit: 'bar', category: 'Fuel' },
      'fuel_temperature': { label: 'Fuel Temperature', unit: '°C', category: 'Fuel' },
      'lap_number': { label: 'Lap Number', unit: '', category: 'Lap Data' },
      'lap_time': { label: 'Lap Time', unit: 's', category: 'Lap Data' },
      'lap_distance': { label: 'Lap Distance', unit: 'm', category: 'Lap Data' },
      'gear': { label: 'Gear', unit: '', category: 'Transmission' },
      'bat_volts_ecu': { label: 'Battery ECU', unit: 'V', category: 'Electrical' },
      'bat_volts_dash': { label: 'Battery Dash', unit: 'V', category: 'Electrical' },
    };

    // Read the file as text to detect MoTeC format and extract headers manually
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        // MoTeC CSV format: metadata lines 1-14, headers at line 15, units at line 16, data starts at line 17
        if (lines.length < 17) {
          reject(new Error('File too short to be valid telemetry data'));
          return;
        }
        
        // Extract column headers from line 15 (index 14)
        const headerLine = lines[14];
        const headers = headerLine.split(',').map(h => h.trim());
        
        // Extract units from line 16 (index 15) if available
        const unitsLine = lines[15];
        const units = unitsLine.split(',').map(u => u.trim());
        
        // Parse a sample of data rows (lines 17-1017) to detect which fields have data
        const sampleRows: Record<string, any>[] = [];
        for (let i = 16; i < Math.min(lines.length, 1016); i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(',').map(v => v.trim());
          const row: Record<string, any> = {};
          
          headers.forEach((header, idx) => {
            if (values[idx] !== undefined && values[idx] !== '') {
              row[header] = values[idx];
            }
          });
          
          sampleRows.push(row);
        }
        
        // Build available metrics list
        const availableMetrics: Array<{ key: string; label: string; unit: string; category: string }> = [];
        
        headers.forEach((header, idx) => {
          const normalizedKey = header.toLowerCase().replace(/ /g, '_');
          
          // Get unit for this field
          const unit = units[idx] || '';
          
          // Track metadata - assume all columns have data
          if (metricsMap[normalizedKey]) {
            availableMetrics.push({
              key: normalizedKey,
              ...metricsMap[normalizedKey]
            });
          } else if (!['session_id', 'file_id', 'id'].includes(normalizedKey)) {
            availableMetrics.push({
              key: normalizedKey,
              label: header,
              unit: unit,
              category: 'Other'
            });
          }
        });
        
        resolve(availableMetrics);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { team, loading: teamLoading } = useTeam();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedSessionForReport, setSelectedSessionForReport] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<Array<{ id: string; name: string }>>([]);
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileStatus[]>>({});

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchUserData();
  }, [user, navigate]);

  const fetchUserData = async () => {
    try {
      await Promise.all([fetchProfile(), fetchSessions(), fetchFileStatuses()]);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      // If profile doesn't exist, create one
      if (!data && user) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              role: user.user_metadata?.role || 'driver',
              team_name: user.user_metadata?.team_name
            }
          ])
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
        
        toast({
          title: "Profile Created",
          description: "Your profile has been set up successfully.",
        });
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Profile Error",
        description: "There was an issue loading your profile. Please try refreshing.",
        variant: "destructive",
      });
    }
  };

  const fetchSessions = async () => {
    try {
      // Sessions are now team-scoped, so no need to filter by user_id
      // RLS policies will handle team-based access
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load sessions",
        variant: "destructive",
      });
    }
  };

  const fetchFileStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('uploaded_files')
        .select('id, session_id, file_name, upload_status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group files by session_id
      const grouped = (data || []).reduce((acc, file) => {
        if (!acc[file.session_id]) {
          acc[file.session_id] = [];
        }
        acc[file.session_id].push(file as FileStatus);
        return acc;
      }, {} as Record<string, FileStatus[]>);

      setFileStatuses(grouped);
    } catch (error) {
      console.error('Error fetching file statuses:', error);
    }
  };

  const createNewSession = async () => {
    if (!team) {
      toast({
        title: "No Team",
        description: "You must be part of a team to create sessions",
        variant: "destructive",
      });
      return;
    }

    const sessionName = prompt('Enter session name:');
    if (!sessionName) return;

    const sessionType = prompt('Enter session type (practice/qualifying/race):') || 'practice';
    const trackName = prompt('Enter track name:') || '';

    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert([
          {
            user_id: user?.id,
            team_id: team.id,
            name: sessionName,
            session_type: sessionType,
            track_name: trackName,
            date: new Date().toISOString().split('T')[0],
            driver_name: profile?.full_name || user?.email?.split('@')[0] || 'Unknown Driver',
            car_info: ''
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setSessions([data, ...sessions]);
      toast({
        title: "Session Created",
        description: `${sessionName} has been created successfully.`,
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (sessionId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt,.log';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Check file size (500MB limit)
      const MAX_FILE_SIZE = 500 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File Too Large",
          description: `File size is ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum allowed size is 500MB.`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Analyzing File",
        description: `Reading ${file.name} to detect metrics...`,
      });

      try {
        // Extract metadata client-side (fast, only reads first 1000 rows)
        const metadata = await extractCsvMetadata(file);
        
        toast({
          title: "Metadata Extracted",
          description: `Found ${metadata.length} metrics. Compressing file...`,
        });

        // Compress the original CSV with deflate
        const compressedBlob = await compressCsvFile(file);
        const originalSize = file.size / (1024 * 1024);
        const compressedSize = compressedBlob.size / (1024 * 1024);
        const compressionRatio = ((1 - compressedBlob.size / file.size) * 100).toFixed(1);

        toast({
          title: "Compression Complete",
          description: `${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB (${compressionRatio}% smaller). Uploading...`,
        });

        // Upload compressed file
        const compressedFileName = file.name + '.deflate';
        const filePath = `${user?.id}/${sessionId}/${Date.now()}_${compressedFileName}`;
        const { error: uploadError } = await supabase.storage
          .from('racing-data')
          .upload(filePath, compressedBlob);

        if (uploadError) throw uploadError;

        // Record file in database
        const { data: fileRecord, error: dbError } = await supabase
          .from('uploaded_files')
          .insert([
            {
              session_id: sessionId,
              user_id: user?.id,
              file_name: compressedFileName,
              file_path: filePath,
              file_size: compressedBlob.size,
              upload_status: 'processed' // Processed client-side!
            }
          ])
          .select()
          .single();

        if (dbError) throw dbError;

        // Update session with available metrics
        const { error: sessionError } = await supabase
          .from('sessions')
          .update({ available_metrics: metadata })
          .eq('id', sessionId);

        if (sessionError) throw sessionError;

        toast({
          title: "Upload Complete",
          description: `Successfully uploaded with ${metadata.length} metrics. Ready to analyze!`,
        });

        // Refresh
        fetchSessions();
        fetchFileStatuses();
      } catch (error) {
        console.error('Error processing file:', error);
        toast({
          title: "Upload Failed",
          description: error.message || "Failed to process file.",
          variant: "destructive",
        });
      }
    };
    input.click();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'driver': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'engineer': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'team_manager': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getFileStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">Processed</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Processing</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      default:
        return null;
    }
  };

  const getSessionFiles = (sessionId: string) => {
    return fileStatuses[sessionId] || [];
  };

  const getSessionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'race': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'qualifying': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'practice': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const handleAnalyzeSession = async (sessionId: string) => {
    setSelectedSessionForReport(sessionId);
    
    // Fetch saved reports for this session
    const { data } = await supabase
      .from('saved_reports')
      .select('id, name')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    
    setSavedReports(data || []);
    setReportDialogOpen(true);
  };

  const handleCreateNewReport = () => {
    navigate(`/session/${selectedSessionForReport}/report`);
    setReportDialogOpen(false);
  };

  const handleOpenReport = (reportId: string) => {
    navigate(`/session/${selectedSessionForReport}/report/${reportId}`);
    setReportDialogOpen(false);
  };

  if (loading || teamLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Team Assigned</CardTitle>
            <CardDescription>
              You need to be part of a team to access the dashboard. Create a team or contact your team administrator to join one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => navigate('/team-onboarding')} className="w-full racing-gradient">
              Create or Join Team
            </Button>
            <Button onClick={signOut} variant="outline" className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg racing-gradient">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">RacingAnalytics</h1>
                <p className="text-sm text-muted-foreground">Professional Motorsport Data Analysis</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">{profile?.full_name || user?.email}</p>
                <p className="text-xs text-muted-foreground">{team.name}</p>
                <Badge variant="outline" className={getRoleColor(profile?.role || 'driver')}>
                  {profile?.role?.toUpperCase().replace('_', ' ') || 'DRIVER'}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/team')}>
                <Users className="h-4 w-4 mr-2" />
                Team
              </Button>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                Welcome back, {profile?.full_name?.split(' ')[0] || 'Driver'}
              </h2>
              <p className="text-muted-foreground">
                Analyze your racing performance with professional-grade telemetry tools.
              </p>
            </div>
            <Button onClick={() => navigate('/dashboards')} variant="outline" size="lg">
              <LayoutDashboard className="h-5 w-5 mr-2" />
              View Dashboards
            </Button>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 flex items-center space-x-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{sessions.length}</p>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center space-x-3">
                <Timer className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold">
                    {sessions.filter(s => s.session_type.toLowerCase() === 'race').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Race Sessions</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center space-x-3">
                <Zap className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">
                    {sessions.filter(s => s.session_type.toLowerCase() === 'qualifying').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Qualifying</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center space-x-3">
                <Upload className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Data Files</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sessions Section */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Track Sessions</h3>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                fetchFileStatuses();
                toast({
                  title: "Status Refreshed",
                  description: "File processing statuses updated",
                });
              }} 
              variant="outline"
              size="default"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
            <Button onClick={createNewSession} className="racing-gradient">
              <Plus className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </div>
        </div>

        {sessions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Sessions Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first track session to start analyzing racing data.
              </p>
              <Button onClick={createNewSession} className="racing-gradient">
                <Plus className="h-4 w-4 mr-2" />
                Create First Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session) => (
              <Card key={session.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{session.name}</CardTitle>
                    <Badge variant="outline" className={getSessionTypeColor(session.session_type)}>
                      {session.session_type.toUpperCase()}
                    </Badge>
                  </div>
                  <CardDescription>
                    {session.track_name || 'Unknown Track'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span>{new Date(session.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Driver:</span>
                      <span>{session.driver_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Files:</span>
                      <span>{getSessionFiles(session.id).length}</span>
                    </div>
                  </div>
                  
                  {/* File Status Indicators */}
                  {getSessionFiles(session.id).length > 0 && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {getSessionFiles(session.id).map((file) => (
                        <div key={file.id} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate max-w-[150px]">
                            {file.file_name.replace('.deflate', '')}
                          </span>
                          {getFileStatusBadge(file.upload_status)}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleFileUpload(session.id)}>
                      <Upload className="h-3 w-3 mr-1" />
                      Upload Data
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleAnalyzeSession(session.id)}>
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Analyze
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Report Selection Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Report</DialogTitle>
            <DialogDescription>
              Create a new report or open an existing one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button 
              onClick={handleCreateNewReport}
              className="w-full racing-gradient"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create New Report
            </Button>
            
            {savedReports.length > 0 && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or open existing
                    </span>
                  </div>
                </div>
                
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {savedReports.map(report => (
                      <Button
                        key={report.id}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleOpenReport(report.id)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {report.name}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;