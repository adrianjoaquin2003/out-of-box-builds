import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, LayoutDashboard, Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function Dashboards() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { team, loading: teamLoading } = useTeam();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDashboard, setNewDashboard] = useState({ name: '', description: '' });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDashboards();
  }, [user, navigate]);

  const fetchDashboards = async () => {
    try {
      // Dashboards are now team-scoped, RLS handles filtering
      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDashboards(data || []);
    } catch (error) {
      console.error('Error fetching dashboards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboards',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDashboard = async () => {
    if (!team) {
      toast({
        title: 'Error',
        description: 'You must be part of a team to create dashboards',
        variant: 'destructive',
      });
      return;
    }

    if (!newDashboard.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a dashboard name',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('dashboards')
        .insert({
          user_id: user?.id,
          team_id: team.id,
          name: newDashboard.name,
          description: newDashboard.description || null,
        })
        .select()
        .single();

      if (error) throw error;

      setDashboards([data, ...dashboards]);
      setDialogOpen(false);
      setNewDashboard({ name: '', description: '' });
      
      toast({
        title: 'Success',
        description: 'Dashboard created successfully',
      });

      // Navigate to the new dashboard
      navigate(`/dashboard-view/${data.id}`);
    } catch (error) {
      console.error('Error creating dashboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to create dashboard',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDashboard = async (dashboardId: string, dashboardName: string) => {
    if (!confirm(`Are you sure you want to delete "${dashboardName}"?`)) return;

    try {
      const { error } = await supabase
        .from('dashboards')
        .delete()
        .eq('id', dashboardId);

      if (error) throw error;

      setDashboards(dashboards.filter(d => d.id !== dashboardId));
      toast({
        title: 'Success',
        description: 'Dashboard deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting dashboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete dashboard',
        variant: 'destructive',
      });
    }
  };

  if (loading || teamLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sessions
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Analysis Dashboards</h1>
                <p className="text-sm text-muted-foreground">
                  Compare reports across multiple sessions
                </p>
              </div>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="racing-gradient">
              <Plus className="h-4 w-4 mr-2" />
              New Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {dashboards.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Dashboards Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create a dashboard to compare reports from multiple sessions and analyze setup changes.
              </p>
              <Button onClick={() => setDialogOpen(true)} className="racing-gradient">
                <Plus className="h-4 w-4 mr-2" />
                Create First Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map((dashboard) => (
              <Card 
                key={dashboard.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => navigate(`/dashboard-view/${dashboard.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <LayoutDashboard className="h-5 w-5" />
                        {dashboard.name}
                      </CardTitle>
                      {dashboard.description && (
                        <CardDescription className="mt-2">
                          {dashboard.description}
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDashboard(dashboard.id, dashboard.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p>Updated: {new Date(dashboard.updated_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Dashboard</DialogTitle>
            <DialogDescription>
              Create a dashboard to compare reports across sessions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Dashboard Name *</Label>
              <Input
                id="name"
                value={newDashboard.name}
                onChange={(e) => setNewDashboard({ ...newDashboard, name: e.target.value })}
                placeholder="e.g., Setup Comparison - Silverstone"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newDashboard.name.trim()) {
                    handleCreateDashboard();
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newDashboard.description}
                onChange={(e) => setNewDashboard({ ...newDashboard, description: e.target.value })}
                placeholder="Describe what this dashboard will analyze..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateDashboard} className="flex-1">
                Create Dashboard
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
