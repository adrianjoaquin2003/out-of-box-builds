import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function TeamOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [createTeamName, setCreateTeamName] = useState('');
  const [joinTeamName, setJoinTeamName] = useState('');

  const handleCreateTeam = async () => {
    if (!createTeamName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a team name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Create the team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: createTeamName,
        })
        .select()
        .single();

      if (teamError) {
        if (teamError.code === '23505') {
          toast({
            title: 'Team Exists',
            description: 'A team with this name already exists',
            variant: 'destructive',
          });
          return;
        }
        throw teamError;
      }

      // Add user as admin
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: user?.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      toast({
        title: 'Success',
        description: 'Team created successfully!',
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: 'Error',
        description: 'Failed to create team',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!joinTeamName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a team name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Find the team by name
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('name', joinTeamName)
        .maybeSingle();

      if (teamError) throw teamError;

      if (!team) {
        toast({
          title: 'Team Not Found',
          description: 'No team exists with that name',
          variant: 'destructive',
        });
        return;
      }

      // Request to join team (as member, not admin)
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: user?.id,
          role: 'member',
        });

      if (memberError) {
        if (memberError.code === '23505') {
          toast({
            title: 'Already a Member',
            description: 'You are already part of this team',
            variant: 'destructive',
          });
          return;
        }
        throw memberError;
      }

      toast({
        title: 'Success',
        description: `Joined ${team.name} successfully!`,
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error joining team:', error);
      toast({
        title: 'Error',
        description: 'Failed to join team',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Join or Create a Team</CardTitle>
          <CardDescription>
            You need to be part of a team to access RacingAnalytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Team</TabsTrigger>
              <TabsTrigger value="join">Join Team</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="create-team">Team Name</Label>
                <Input
                  id="create-team"
                  placeholder="e.g., Red Bull Racing"
                  value={createTeamName}
                  onChange={(e) => setCreateTeamName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && createTeamName.trim()) {
                      handleCreateTeam();
                    }
                  }}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  You'll be the team admin
                </p>
              </div>
              <Button 
                onClick={handleCreateTeam} 
                disabled={loading}
                className="w-full racing-gradient"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Team'
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="join" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="join-team">Team Name</Label>
                <Input
                  id="join-team"
                  placeholder="Enter exact team name"
                  value={joinTeamName}
                  onChange={(e) => setJoinTeamName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && joinTeamName.trim()) {
                      handleJoinTeam();
                    }
                  }}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Ask your team admin for the exact team name
                </p>
              </div>
              <Button 
                onClick={handleJoinTeam} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Team'
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
