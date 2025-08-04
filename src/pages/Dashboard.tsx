import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Upload, BarChart3, Timer, Zap, LogOut } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user?.id)
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
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
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
            name: sessionName,
            session_type: sessionType,
            track_name: trackName,
            date: new Date().toISOString().split('T')[0],
            driver_name: user?.email?.split('@')[0] || 'Unknown Driver',
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'driver': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'engineer': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'team_manager': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getSessionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'race': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'qualifying': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'practice': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
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
                <p className="text-sm font-medium">{user?.email}</p>
                <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  DRIVER
                </Badge>
              </div>
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
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, Driver
          </h2>
          <p className="text-muted-foreground mb-6">
            Analyze your racing performance with professional-grade telemetry tools.
          </p>
          
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
          <Button onClick={createNewSession} className="racing-gradient">
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
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
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(session.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Upload className="h-3 w-3 mr-1" />
                      Upload Data
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
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
    </div>
  );
};

export default Dashboard;