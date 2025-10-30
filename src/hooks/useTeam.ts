import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Team {
  id: string;
  name: string;
}

interface TeamMember {
  role: 'admin' | 'member';
}

export function useTeam() {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTeam(null);
      setTeamMember(null);
      setLoading(false);
      return;
    }

    fetchTeam();
  }, [user]);

  const fetchTeam = async () => {
    try {
      // Get user's team membership
      const { data: membership, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role, teams(id, name)')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (memberError) throw memberError;

      if (membership && membership.teams) {
        setTeam(membership.teams as any);
        setTeamMember({ role: membership.role as 'admin' | 'member' });
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = teamMember?.role === 'admin';

  return { team, teamMember, isAdmin, loading, refetch: fetchTeam };
}
