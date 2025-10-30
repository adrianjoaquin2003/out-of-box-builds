import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LayoutDashboard, Users, LogOut, Home } from 'lucide-react';
import { useTeam } from '@/hooks/useTeam';

export default function HomePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { team, teamMember, isAdmin } = useTeam();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">RacingAnalytics</h1>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {getInitials(user?.user_metadata?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">
                    {user?.user_metadata?.full_name || 'User'}
                  </h2>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between py-2 border-t">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <span className="font-medium capitalize">
                    {user?.user_metadata?.role || 'User'}
                  </span>
                </div>
                {team && (
                  <>
                    <div className="flex items-center justify-between py-2 border-t">
                      <span className="text-sm text-muted-foreground">Team</span>
                      <span className="font-medium">{team.name}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-t">
                      <span className="text-sm text-muted-foreground">Team Role</span>
                      <span className="font-medium capitalize">{teamMember?.role}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Navigate to different areas of the app</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="w-full justify-start"
                size="lg"
              >
                <LayoutDashboard className="mr-2 h-5 w-5" />
                Go to Dashboard
              </Button>
              <Button 
                onClick={() => navigate('/dashboards')} 
                variant="outline"
                className="w-full justify-start"
                size="lg"
              >
                <LayoutDashboard className="mr-2 h-5 w-5" />
                View All Dashboards
              </Button>
              {isAdmin && (
                <Button 
                  onClick={() => navigate('/team')} 
                  variant="outline"
                  className="w-full justify-start"
                  size="lg"
                >
                  <Users className="mr-2 h-5 w-5" />
                  Manage Team
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
