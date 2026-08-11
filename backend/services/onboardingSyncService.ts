import { google } from 'googleapis';
import User from '../models/User';
import Course from '../models/Course';
import Enrollment from '../models/Enrollment';
import LearningPlan from '../models/LearningPlan';
import SyncStat from '../models/SyncStat';
import OnboardingRequest from '../models/OnboardingRequest';
import GoogleSyncRecord from '../models/GoogleSyncRecord';
import Settings from '../models/Settings';
import logger from '../config/logger';
import crypto from 'crypto';
import { sendWelcomeEmail } from './email';
import { createNotification } from './notificationService';

const generateTempPassword = (): string => {
  return crypto.randomBytes(6).toString('hex');
};

export const normalizeHeader = (header: string): string => {
  return header.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

export const getField = (row: any[], headerRow: string[], headerName: string): string => {
  const normalized = normalizeHeader(headerName);
  const index = headerRow.findIndex((col) => col === normalized);
  return index >= 0 ? `${row[index] || ''}`.trim() : '';
};

// Course mapping with aliases
const COURSE_MAPPING: Record<string, string> = {
  'full stack development': 'Full Stack Development',
  'ai data science': 'AI & Data Science',
  'cyber security': 'Cyber Security',
  'aws cloud computing': 'AWS & Cloud Computing',
  'mern stack': 'MERN Stack Development',
};

export const normalizeCourseName = (courseName: string): string => {
  const normalized = normalizeHeader(courseName);
  // Try to find a match in the mapping
  for (const [alias, actual] of Object.entries(COURSE_MAPPING)) {
    if (normalized.includes(normalizeHeader(alias))) {
      return actual;
    }
  }
  return courseName.trim(); // Return as-is if no alias matches
};

const extractSpreadsheetId = (input: string): string => {
  const match = input.match(/\/d\/(.*?)(\/|$)/);
  return match ? match[1] : input;
};

export const getAuthAndSheets = async () => {
  const settings = await Settings.findOne();
  const sheetsConfig = settings?.googleSheetsSettings;

  const rawSpreadsheetId = process.env.GOOGLE_SPREADSHEET_ID?.trim() || sheetsConfig?.spreadsheetId?.trim();
  const worksheetName = process.env.GOOGLE_WORKSHEET_NAME?.trim() || sheetsConfig?.worksheetName?.trim();
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY || '';

  if (!rawSpreadsheetId || !serviceAccountEmail || !privateKeyRaw) {
    const error: any = new Error('Google Sheets credentials missing.');
    error.code = 'CREDENTIALS_MISSING';
    throw error;
  }

  const spreadsheetId = extractSpreadsheetId(rawSpreadsheetId);
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  try {
    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    return { auth, sheets, spreadsheetId, worksheetName };
  } catch (err: any) {
    const error: any = new Error('Google authentication failed.');
    error.code = 'AUTH_FAILED';
    throw error;
  }
};

export const fetchSpreadsheetData = async (sheets: any, spreadsheetId: string, worksheetName?: string) => {
  try {
    let metadata;
    try {
      metadata = await sheets.spreadsheets.get({ spreadsheetId });
    } catch (err: any) {
      if (err.code === 403 || err.status === 403) {
         const error: any = new Error('Google authentication succeeded, but the configured spreadsheet cannot be accessed. Please verify that the Google service account has access to the response spreadsheet.');
         error.code = 'GOOGLE_SHEETS_ACCESS_DENIED';
         throw error;
      }
      if (err.code === 404 || err.status === 404) {
         const error: any = new Error('Spreadsheet not found.');
         error.code = 'SPREADSHEET_NOT_FOUND';
         throw error;
      }
      throw err;
    }

    const sheetsList = metadata.data.sheets || [];
    let targetSheet = sheetsList[0]?.properties?.title;

    if (worksheetName) {
      const match = sheetsList.find((s: any) => s.properties?.title === worksheetName);
      if (match) {
        targetSheet = match.properties?.title;
      } else {
        const error: any = new Error(`Google Spreadsheet connected successfully, but the configured worksheet '${worksheetName}' was not found.`);
        error.code = 'WORKSHEET_NOT_FOUND';
        throw error;
      }
    }

    const range = `${targetSheet}!A1:Z`;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption: 'FORMATTED_VALUE',
    });

    return res.data.values || [];
  } catch (err) {
    throw err;
  }
};

export const testGoogleConnection = async () => {
  try {
    const { sheets, spreadsheetId, worksheetName } = await getAuthAndSheets();
    const rows = await fetchSpreadsheetData(sheets, spreadsheetId, worksheetName);
    
    return {
      success: true,
      googleAuthentication: true,
      sheetsApi: true,
      spreadsheetAccess: true,
      worksheetAccess: true,
      responseRows: Math.max(0, rows.length - 1)
    };
  } catch (err: any) {
    return {
      success: false,
      code: err.code || 'UNKNOWN_ERROR',
      message: err.message || 'Connection test failed',
      details: {
        googleAuthentication: err.code !== 'CREDENTIALS_MISSING' && err.code !== 'AUTH_FAILED',
        spreadsheetAccess: err.code !== 'CREDENTIALS_MISSING' && err.code !== 'AUTH_FAILED' && err.code !== 'GOOGLE_SHEETS_ACCESS_DENIED' && err.code !== 'SPREADSHEET_NOT_FOUND',
        worksheetAccess: err.code !== 'CREDENTIALS_MISSING' && err.code !== 'AUTH_FAILED' && err.code !== 'GOOGLE_SHEETS_ACCESS_DENIED' && err.code !== 'SPREADSHEET_NOT_FOUND' && err.code !== 'WORKSHEET_NOT_FOUND',
      }
    };
  }
};

export const runOnboardingSync = async () => {
  console.log('[SYNC] Starting Google Form Onboarding Sync');
  
  const stat = new SyncStat();
  // We will overload these stats:
  // created = newRequests
  // updated = updatedRequests
  // alreadySynced = alreadyPending
  
  try {
    const { sheets, spreadsheetId, worksheetName } = await getAuthAndSheets();
    const rows = await fetchSpreadsheetData(sheets, spreadsheetId, worksheetName);

    stat.totalRows = Math.max(0, rows.length - 1);

    if (rows.length <= 1) {
      console.log('[SYNC] No data found.');
      await stat.save();
      return stat;
    }

    const headerRow = rows[0].map((h: any) => normalizeHeader(h?.toString() || ''));
    const dataRows = rows.slice(1);
    
    // We map rows to objects to save as rawFormData
    const originalHeaders = rows[0];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2;
      stat.processed++;
      
      const rawFormData: Record<string, any> = {};
      originalHeaders.forEach((h: any, idx: number) => {
        if (h) {
          rawFormData[h.toString()] = row[idx] !== undefined ? row[idx] : null;
        }
      });

      // Essential Mapping
      const emailRaw = getField(row, headerRow, 'Email') || getField(row, headerRow, 'Email Address') || getField(row, headerRow, 'Mail id');
      const email = emailRaw.toLowerCase().trim();
      
      const fullName = getField(row, headerRow, 'Name') || getField(row, headerRow, 'Full Name');
      const phone = getField(row, headerRow, 'Phone') || getField(row, headerRow, 'Phone Number') || getField(row, headerRow, 'Contact');
      const courseStr = getField(row, headerRow, 'Course') || getField(row, headerRow, 'Course Name') || '';
      const batchStr = getField(row, headerRow, 'Batch') || getField(row, headerRow, 'Preferred Batch') || '';
      
      const timestampRaw = getField(row, headerRow, 'Timestamp');
      const submittedAt = timestampRaw ? new Date(timestampRaw) : new Date();

      if (!email) {
        stat.skipped++;
        stat.syncErrors.push({ row: rowNumber, email: 'Missing', reason: 'Missing Email', message: 'Record skipped because email was empty' });
        continue;
      }
      
      // Course Matching
      const mappedCourseTitle = normalizeCourseName(courseStr);

      const sourceRowId = `row-${rowNumber}`;
      
      // 1. Check if this exact row has been synced before
      let syncRecord = await GoogleSyncRecord.findOne({ source: 'google_form', sourceRowId });
      let existingReq = await OnboardingRequest.findOne({ source: 'google_form', sourceRowId });

      if (syncRecord && existingReq) {
         stat.alreadySynced++;
         continue; // Both exist, properly synced
      }

      if (syncRecord && !existingReq) {
        console.log(`[SYNC] Rebuilding missing onboarding request for ${sourceRowId}`);
        stat.repaired++;
      } else if (!syncRecord && existingReq) {
        console.log(`[SYNC] Rebuilding missing sync record for ${sourceRowId}`);
        await GoogleSyncRecord.create({ source: 'google_form', sourceRowId, syncedAt: new Date() });
        stat.alreadySynced++;
        continue;
      } else {
        stat.created++;
      }
      let request = new OnboardingRequest({
        source: 'google_form',
        sourceRowId,
        submittedAt,
        syncedAt: new Date(),
        status: 'PENDING',
        personalDetails: {
          fullName: fullName || 'Unknown',
          email: email,
          phone: phone,
          city: getField(row, headerRow, 'City'),
          state: getField(row, headerRow, 'State'),
          gender: getField(row, headerRow, 'Gender')
        },
        addressDetails: {
          city: getField(row, headerRow, 'City'),
          state: getField(row, headerRow, 'State'),
        },
        educationDetails: {
          qualification: getField(row, headerRow, 'Qualification'),
          college: getField(row, headerRow, 'College'),
        },
        courseDetails: {
          course: mappedCourseTitle || courseStr,
          batch: batchStr,
        },
        rawFormData
      });
      
      try {
        await request.save();
        
        // 3. Save sync history if it wasn't already there
        if (!syncRecord) {
          await GoogleSyncRecord.create({
            source: 'google_form',
            sourceRowId,
            syncedAt: new Date()
          });
        }
      } catch (saveErr: any) {
        // If it's a duplicate key error (E11000) for source_1_sourceRowId_1, 
        // it means an OnboardingRequest for this row already exists from before GoogleSyncRecord was added,
        // or a concurrent process inserted it.
        if (saveErr.code === 11000) {
           stat.created--; // Revert the optimistic created increment
           stat.alreadySynced++;
           // We do NOT backfill GoogleSyncRecord here, because doing so prevents an admin
           // from cleanly resetting stale OnboardingRequest data.
        } else {
           stat.created--; // Revert
           stat.skipped++;
           stat.syncErrors.push({ 
             row: rowNumber, 
             email, 
             reason: 'Save Error', 
             message: saveErr.message 
           });
           logger.error(`[SYNC] Save Error for row ${rowNumber}:`, saveErr);
        }
      }
    }

    await stat.save();
    console.log(`[SYNC] Completed. New: ${stat.created}, Repaired: ${stat.repaired}, Updated: ${stat.updated}, Already Pending/Processed: ${stat.alreadySynced}, Skipped: ${stat.skipped}`);
    return stat;
    
  } catch (error: any) {
    logger.error('Google Sheets sync error:', error);
    stat.syncErrors.push({ row: 0, email: 'system', reason: error.code || 'Fatal Error', message: error.message });
    await stat.save();
    throw error;
  }
};
