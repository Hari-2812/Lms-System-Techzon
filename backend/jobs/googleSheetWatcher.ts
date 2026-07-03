import { syncGoogleSheetsOnboardings } from '../services/googleSheets';
import logger from '../config/logger';

export const startGoogleSheetWatcher = (): void => {
  setInterval(async () => {
    try {
      console.log('[WATCHER] Google Sheet watcher checking for new submissions...');
      const result = await syncGoogleSheetsOnboardings();
      if (result.synced > 0) {
        console.log(`[WATCHER] Sync completed. Synced ${result.synced} new records.`);
      }
    } catch (error) {
      logger.error('Google Sheet watcher sync failed:', error);
    }
  }, 60000);
  console.log('Google Sheet watcher running every 60 seconds');
};
