import { useEffect, useCallback } from 'react';
import { useRevenueCat } from '@/contexts/RevenueCatContext';
import { Capacitor } from '@capacitor/core';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  onSubscriptionExpired?: () => void;
}

export function SubscriptionGuard({ children, onSubscriptionExpired }: SubscriptionGuardProps) {
  const { 
    isInitialized, 
    isPro, 
    customerInfo, 
    checkEntitlement, 
    presentPaywallIfNeeded 
  } = useRevenueCat();

  const handleSubscriptionCheck = useCallback(async () => {
    // Only check on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Wait for initialization
    if (!isInitialized) {
      return;
    }

    // Check if user has active subscription
    const hasActiveSubscription = await checkEntitlement();

    if (!hasActiveSubscription) {
      console.log('SubscriptionGuard: No active subscription, presenting paywall');
      
      // Clear any stored trial/access flags
      localStorage.removeItem('npd_pro_access');
      localStorage.removeItem('npd_trial_start');
      
      // Call callback if provided
      onSubscriptionExpired?.();
      
      // Present paywall
      await presentPaywallIfNeeded();
    }
  }, [isInitialized, checkEntitlement, presentPaywallIfNeeded, onSubscriptionExpired]);

  // Check subscription status on mount and when customer info changes
  useEffect(() => {
    handleSubscriptionCheck();
  }, [handleSubscriptionCheck, customerInfo]);

  // Periodic check every 5 minutes for subscription status
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const interval = setInterval(() => {
      handleSubscriptionCheck();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [handleSubscriptionCheck]);

  return <>{children}</>;
}

// Hook for components that need to check subscription status
export function useSubscriptionGuard() {
  const { isPro, checkEntitlement, presentPaywallIfNeeded, customerInfo } = useRevenueCat();

  const requireSubscription = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      // On web, check localStorage for development
      return localStorage.getItem('npd_pro_access') === 'true';
    }

    const hasSubscription = await checkEntitlement();
    
    if (!hasSubscription) {
      // Clear trial access
      localStorage.removeItem('npd_pro_access');
      localStorage.removeItem('npd_trial_start');
      
      // Show paywall
      await presentPaywallIfNeeded();
      
      // Check again after paywall
      return await checkEntitlement();
    }
    
    return true;
  }, [checkEntitlement, presentPaywallIfNeeded]);

  // Check if subscription is expired or will expire soon
  const getSubscriptionStatus = useCallback(() => {
    if (!customerInfo) {
      return { isActive: false, expirationDate: null, willRenew: false };
    }

    const entitlement = customerInfo.entitlements.active['npd Pro'];
    
    if (!entitlement) {
      return { isActive: false, expirationDate: null, willRenew: false };
    }

    return {
      isActive: true,
      expirationDate: entitlement.expirationDate ? new Date(entitlement.expirationDate) : null,
      willRenew: entitlement.willRenew ?? false,
    };
  }, [customerInfo]);

  return {
    isPro,
    requireSubscription,
    getSubscriptionStatus,
  };
}
