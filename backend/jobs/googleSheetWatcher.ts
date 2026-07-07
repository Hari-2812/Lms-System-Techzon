import { syncGoogleSheetsOnboardings } from '../services/googleSheets';
import logger from '../config/logger';

export const startGoogleSheetWatcher = (): void => {
  setInterval(async () => {
    try {
      console.log('[WATCHER] Checking Google Sheet for new submissions...');
      const result = await syncGoogleSheetsOnboardings();
      if (result.newImports > 0 || result.updated > 0) {
        console.log(`[WATCHER] New students found: ${result.newImports}, updated: ${result.updated}`);
      } else {
        console.log('[WATCHER] No new Google Sheet students found.');
      }
    } catch (error) {
      logger.error('Google Sheet watcher sync failed:', error);
    }
  }, 60000);
  console.log('Google Sheet watcher running every 60 seconds');
};
