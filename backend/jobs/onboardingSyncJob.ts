import { runOnboardingSync } from '../services/onboardingSyncService';
import logger from '../config/logger';

export const startGoogleSyncScheduler = (): void => {
  // Execute every 60 minutes or a configurable interval
  setInterval(async () => {
    try {
      console.log('[WATCHER] Scheduled Google Form sync started...');
      await runOnboardingSync();
    } catch (error) {
      logger.error('Scheduled Google Form sync failed:', error);
    }
  }, 60 * 60 * 1000); 
  console.log('[BACKEND] Google Form sync worker initialized. Interval: 60 minutes.');
};
