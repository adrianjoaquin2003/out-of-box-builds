import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, BarChart3, Upload, Timer } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg racing-gradient">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gradient">RacingAnalytics</h1>
          </div>
          <Button onClick={() => navigate('/auth')} className="racing-gradient">
            Get Started
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold mb-6 text-gradient">
          Professional Motorsport Data Analysis
        </h1>
        <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
          Upload CSV data from ECUs, data loggers, and timing systems. 
          Visualize performance with sector heatmaps, lap deltas, GPS overlays, and advanced analytics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="p-6 rounded-lg border bg-card">
            <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Data Upload</h3>
            <p className="text-muted-foreground">Drag-and-drop CSV files from ECUs and data loggers</p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <BarChart3 className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Advanced Analytics</h3>
            <p className="text-muted-foreground">Sector heatmaps, lap deltas, and performance metrics</p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <Timer className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Real-time Insights</h3>
            <p className="text-muted-foreground">Driver comparison and consistency analysis</p>
          </div>
        </div>

        <Button 
          onClick={() => navigate('/auth')} 
          size="lg" 
          className="racing-gradient text-lg px-8 py-6 racing-glow"
        >
          Start Analyzing Your Data
        </Button>
      </main>
    </div>
  );
};

export default Index;
