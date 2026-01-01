import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const triggerHaptic = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (Capacitor.isNativePlatform()) {
    try {
      const impactStyle = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      }[style];
      
      await Haptics.impact({ style: impactStyle });
    } catch (error) {
      console.log('Haptics not available:', error);
    }
  }
};
