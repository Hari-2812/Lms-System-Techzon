import { Request, Response } from 'express';
import { runDailyReminderJob, runDailyUnlockStatsJob } from '../scheduler/dailyScheduler';

export const testDailyReminder = async (req: Request, res: Response): Promise<void> => {
  const { dryRun } = req.query;
  try {
    const isDryRun = dryRun === 'true';
    const stats = await runDailyReminderJob(isDryRun);
    res.status(200).json({ success: true, mode: isDryRun ? 'DRY_RUN' : 'LIVE', stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const testDailyUnlock = async (req: Request, res: Response): Promise<void> => {
  const { dryRun } = req.query;
  try {
    const isDryRun = dryRun === 'true';
    const stats = await runDailyUnlockStatsJob(isDryRun);
    res.status(200).json({ success: true, mode: isDryRun ? 'DRY_RUN' : 'LIVE', stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
