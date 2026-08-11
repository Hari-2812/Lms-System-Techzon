import { Request, Response } from 'express';
import { runOnboardingSync } from '../services/onboardingSyncService';
import SyncStat from '../models/SyncStat';
import logger from '../config/logger';

export const syncGoogleSheets = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await runOnboardingSync();
    
    res.status(200).json({
      success: true,
      message: `Sync completed. Created: ${result.created}, Updated: ${result.updated}, Failed: ${result.failed}, Skipped: ${result.skipped}`,
      summary: {
        totalRows: result.totalRows,
        processed: result.processed,
        created: result.created,
        updated: result.updated,
        alreadySynced: result.alreadySynced,
        failed: result.failed,
        skipped: result.skipped
      },
      syncErrors: result.syncErrors
    });
  } catch (error: any) {
    logger.error('Error syncing Google Sheets manually:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSyncStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await SyncStat.find().sort({ timestamp: -1 }).limit(10);
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
