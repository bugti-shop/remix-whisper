import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WelcomeProvider, useWelcome } from "@/contexts/WelcomeContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { RevenueCatProvider } from "@/contexts/RevenueCatContext";
import OnboardingFlow from "@/components/OnboardingFlow";
import Index from "./pages/Index";
import Notes from "./pages/Notes";
import NotesCalendar from "./pages/NotesCalendar";
import WebClipper from "./pages/WebClipper";
import Settings from "./pages/Settings";
import Reminders from "./pages/Reminders";
import Today from "./pages/todo/Today";
import Upcoming from "./pages/todo/Upcoming";
import TodoCalendar from "./pages/todo/TodoCalendar";
import TodoSettings from "./pages/todo/TodoSettings";
import CustomToolDetail from "./pages/todo/CustomToolDetail";
import NotFound from "./pages/NotFound";
import { NavigationBackProvider } from "@/components/NavigationBackProvider";
import { notificationManager } from "@/utils/notifications";
import { addDays } from "date-fns";

const queryClient = new QueryClient();

// Global error handler for unhandled errors (prevents white screen on mobile)
if (typeof window !== 'undefined') {
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('Global error:', { message, source, lineno, colno, error });
    return false;
  };
  
  window.onunhandledrejection = (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  };
}

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <NavigationBackProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/calendar" element={<NotesCalendar />} />
          <Route path="/clip" element={<WebClipper />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/todo/today" element={<Today />} />
          <Route path="/todo/upcoming" element={<Upcoming />} />
          <Route path="/todo/calendar" element={<TodoCalendar />} />
          <Route path="/todo/settings" element={<TodoSettings />} />
          <Route path="/todo/tool/:toolId" element={<CustomToolDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </NavigationBackProvider>
    </BrowserRouter>
  );
};

const AppContent = () => {
  const { hasSeenWelcome, completeWelcome, resetWelcome } = useWelcome();

  // Check if trial has expired and lock access
  useEffect(() => {
    const checkTrialExpiration = () => {
      const trialStartStr = localStorage.getItem('npd_trial_start');
      const hasAdminAccess = localStorage.getItem('npd_admin_bypass') === 'true';
      const hasProAccess = localStorage.getItem('npd_pro_access') === 'true';
      
      // Skip check for admins or if no trial started
      if (hasAdminAccess || !trialStartStr || !hasProAccess) return;
      
      const trialStart = new Date(trialStartStr);
      const trialEnd = addDays(trialStart, 3); // 3-day trial
      const now = new Date();
      
      if (now >= trialEnd) {
        // Trial expired - reset to onboarding paywall
        console.log('Trial expired, redirecting to paywall');
        resetWelcome();
      }
    };
    
    checkTrialExpiration();
    // Check every minute
    const interval = setInterval(checkTrialExpiration, 60000);
    return () => clearInterval(interval);
  }, [resetWelcome]);

  useEffect(() => {
    notificationManager.initialize().catch(console.error);
  }, []);

  if (!hasSeenWelcome) {
    return <OnboardingFlow onComplete={completeWelcome} />;
  }

  return (
    <>
      <Toaster />
      <Sonner />
      <AppRoutes />
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RevenueCatProvider>
          <WelcomeProvider>
            <SubscriptionProvider>
              <AppContent />
            </SubscriptionProvider>
          </WelcomeProvider>
        </RevenueCatProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
