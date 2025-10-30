import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ReportBuilder from "./pages/ReportBuilder";
import Dashboards from "./pages/Dashboards";
import DashboardView from "./pages/DashboardView";
import TeamManagement from "./pages/TeamManagement";
import TeamOnboarding from "./pages/TeamOnboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/home" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboards" element={<Dashboards />} />
          <Route path="/dashboard-view/:dashboardId" element={<DashboardView />} />
          <Route path="/team" element={<TeamManagement />} />
          <Route path="/team-onboarding" element={<TeamOnboarding />} />
          <Route path="/session/:sessionId/report" element={<ReportBuilder />} />
          <Route path="/session/:sessionId/report/:reportId" element={<ReportBuilder />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
