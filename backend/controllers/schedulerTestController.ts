import { Request, Response } from 'express';
import { runDailyReminderJob, runDailyUnlockStatsJob } from '../scheduler/dailyScheduler';

export const testDailyReminder = async (req: Request, res: Response): Promise<void> => {
  const { dryRun } = req.query;
  try {
    const isDryRun = dryRun === 'true';
    const stats = await runDailyReminderJob(isDryRun);
    res.status(200).json({ success: true, mode: isDryRun ? 'DRY_RUN' : 'LIVE', ...stats });
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

import { getRegisteredStudentsForDirectory } from '../services/studentService';
import { sendDailyReminderEmail } from '../services/email';

export const testDailyReminderForStudent = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: 'Student email is required' });
    return;
  }
  
  try {
    const students = await getRegisteredStudentsForDirectory();
    const student = students.find((s: any) => s.email === email);
    
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found in Student Directory' });
      return;
    }

    let maskedEmail = student.email;
    const atIndex = maskedEmail.indexOf('@');
    if (atIndex > 2) {
      maskedEmail = maskedEmail.substring(0, 2) + '*'.repeat(atIndex - 2) + maskedEmail.substring(atIndex);
    }
    
    let brevoResult = null;
    try {
      brevoResult = await sendDailyReminderEmail(student.email, student.name);
      res.status(200).json({
        success: true,
        studentName: student.name,
        recipientEmail: maskedEmail,
        brevoResult,
        status: 'delivered'
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        studentName: student.name,
        recipientEmail: maskedEmail,
        error: err.message,
        status: 'failed'
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
