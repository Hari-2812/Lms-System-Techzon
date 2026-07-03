import { syncGoogleSheetsOnboardings } from '../services/googleSheets';
import logger from '../config/logger';

export const runGoogleSync = async (): Promise<void> => {
  try {
    console.log('[BACKEND] Automated 1-minute Google Sheets synchronization started.');
    const result = await syncGoogleSheetsOnboardings();
    console.log(`[BACKEND] Automated sync completed. Synced: ${result.synced}, Skipped: ${result.skipped}`);
  } catch (error) {
    logger.error('Error running automated Google sync worker:', error);
    console.error('[BACKEND] Error in Google sync worker:', error);
  }
};

// Execute every 1 minute
export const startGoogleSyncScheduler = (): void => {
  setInterval(runGoogleSync, 60 * 1000);
  console.log('[BACKEND] Google Sheets sync worker initialized. Interval: 1 minute.');
};
