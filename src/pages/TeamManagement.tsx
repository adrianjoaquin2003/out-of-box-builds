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
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, UserPlus, Loader2, Trash2, Crown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TeamMemberInfo {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

export default function TeamManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { team, isAdmin, loading: teamLoading } = useTeam();
  const [members, setMembers] = useState<TeamMemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!teamLoading && team) {
      fetchMembers();
    }
  }, [user, team, teamLoading, navigate]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profiles!inner (
            full_name,
            email
          )
        `)
        .eq('team_id', team?.id)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setMembers((data || []) as any);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Find user by email (case-insensitive)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', inviteEmail.trim())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        toast({
          title: 'User Not Found',
          description: 'No user exists with that email address',
          variant: 'destructive',
        });
        return;
      }

      // Add member to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team?.id,
          user_id: profile.id,
          role: 'member',
        });

      if (memberError) {
        if (memberError.code === '23505') {
          toast({
            title: 'Already a Member',
            description: 'This user is already part of your team',
            variant: 'destructive',
          });
        } else {
          throw memberError;
        }
        return;
      }

      await fetchMembers();
      setInviteDialogOpen(false);
      setInviteEmail('');
      
      toast({
        title: 'Success',
        description: 'Team member added successfully',
      });
    } catch (error) {
      console.error('Error inviting member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add team member',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from the team?`)) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await fetchMembers();
      toast({
        title: 'Success',
        description: 'Team member removed',
      });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team member',
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

  if (!team) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Team</CardTitle>
            <CardDescription>You must be part of a team to access this page</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
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
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{team.name}</h1>
                <p className="text-sm text-muted-foreground">Team Management</p>
              </div>
            </div>
            {isAdmin && (
              <Button onClick={() => setInviteDialogOpen(true)} className="racing-gradient">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Team Members ({members.length})</CardTitle>
            <CardDescription>
              Manage your team members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-lg font-semibold">
                        {member.profiles.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{member.profiles.full_name}</p>
                      <p className="text-sm text-muted-foreground">{member.profiles.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === 'admin' ? 'default' : 'outline'}>
                      {member.role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                      {member.role.toUpperCase()}
                    </Badge>
                    {isAdmin && member.user_id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id, member.profiles.full_name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Enter the email address of the user you want to add to your team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inviteEmail.trim()) {
                    handleInviteMember();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleInviteMember} className="flex-1">
                Add Member
              </Button>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
