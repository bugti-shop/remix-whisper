import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WelcomeProvider, useWelcome } from "@/contexts/WelcomeContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { RevenueCatProvider, useRevenueCat } from "@/contexts/RevenueCatContext";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import OnboardingFlow from "@/components/OnboardingFlow";
import Index from "./pages/Index";
import Notes from "./pages/Notes";
import NotesCalendar from "./pages/NotesCalendar";
import WebClipper from "./pages/WebClipper";
import Settings from "./pages/Settings";
import SyncSettingsPage from "./pages/SyncSettingsPage";
import Reminders from "./pages/Reminders";
import Today from "./pages/todo/Today";
import Upcoming from "./pages/todo/Upcoming";
import TodoCalendar from "./pages/todo/TodoCalendar";
import TodoSettings from "./pages/todo/TodoSettings";
import CustomToolDetail from "./pages/todo/CustomToolDetail";
import NotFound from "./pages/NotFound";
import { NavigationBackProvider } from "@/components/NavigationBackProvider";
import { notificationManager } from "@/utils/notifications";
import { Capacitor } from "@capacitor/core";

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
          <Route path="/settings/sync" element={<SyncSettingsPage />} />
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
  const { isPro, isInitialized, presentPaywallIfNeeded, checkEntitlement } = useRevenueCat();

  // Check subscription status and redirect to paywall if expired
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      // Only check on native platforms
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      // Wait for RevenueCat to initialize
      if (!isInitialized) {
        return;
      }

      // Check if user has active subscription
      const hasActiveSubscription = await checkEntitlement();

      if (!hasActiveSubscription) {
        // Subscription expired or cancelled - clear local access
        localStorage.removeItem('npd_pro_access');
        localStorage.removeItem('npd_trial_start');
        
        console.log('Subscription expired, redirecting to paywall');
        
        // Reset to onboarding/paywall
        resetWelcome();
        
        // Present paywall
        await presentPaywallIfNeeded();
      }
    };

    checkSubscriptionStatus();
    
    // Check every 5 minutes
    const interval = setInterval(checkSubscriptionStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isInitialized, checkEntitlement, presentPaywallIfNeeded, resetWelcome]);

  useEffect(() => {
    notificationManager.initialize().catch(console.error);
  }, []);

  if (!hasSeenWelcome) {
    return <OnboardingFlow onComplete={completeWelcome} />;
  }

  return (
    <SubscriptionGuard onSubscriptionExpired={resetWelcome}>
      <Toaster />
      <Sonner />
      <AppRoutes />
    </SubscriptionGuard>
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
