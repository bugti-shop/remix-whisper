import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const triggerHaptic = async (_style: 'light' | 'medium' | 'heavy' = 'heavy') => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Force very high haptics across the app
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (error) {
    console.log('Haptics not available:', error);
  }
};
