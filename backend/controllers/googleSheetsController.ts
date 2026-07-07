import { Request, Response } from 'express';
import { syncGoogleSheetsOnboardings as syncGoogleSheetsService } from '../services/googleSheets';
import AuditLog from '../models/AuditLog';
import logger from '../config/logger';

export const syncGoogleSheetsOnboardings = async (req: any, res: Response): Promise<void> => {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!spreadsheetId || !serviceAccountEmail || !privateKey) {
    res.status(400).json({
      success: false,
      message: 'Google Sheets configuration is incomplete.',
    });
    return;
  }

  try {
    const result = await syncGoogleSheetsService();

    await AuditLog.create({
      userId: req.user._id,
      action: 'SYNC_GOOGLE_SHEETS_SPREADSHEET',
      details: `Google Sheets Synced. Total: ${result.totalRows}, Imported: ${result.newImports}, Updated: ${result.updated}, Duplicates: ${result.duplicates}, Skipped: ${result.skipped}`,
    });

    res.status(200).json({
      success: true,
      message: `Google Sheets synced successfully! Imported ${result.newImports} new records, updated ${result.updated}, duplicates ${result.duplicates}, skipped ${result.skipped}.`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Google Sheets manual sync controller failure:', error);
    
    let statusCode = 500;
    if (error.message && (error.message.includes('incomplete') || error.message.includes('not configured') || error.message.includes('auth'))) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error executing Google Sheets sync action.',
    });
  }
};
