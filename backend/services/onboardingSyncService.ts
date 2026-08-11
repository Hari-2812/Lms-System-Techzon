import { google } from 'googleapis';
import User from '../models/User';
import Course from '../models/Course';
import Enrollment from '../models/Enrollment';
import LearningPlan from '../models/LearningPlan';
import SyncStat from '../models/SyncStat';
import Settings from '../models/Settings';
import logger from '../config/logger';
import crypto from 'crypto';
import { sendWelcomeEmail } from './email';
import { createNotification } from './notificationService';

const generateTempPassword = (): string => {
  return crypto.randomBytes(6).toString('hex');
};

const normalizeHeader = (header: string): string => {
  return header.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

const getField = (row: any[], headerRow: string[], headerName: string): string => {
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

const normalizeCourseName = (courseName: string): string => {
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

const getAuthAndSheets = async () => {
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

const fetchSpreadsheetData = async (sheets: any, spreadsheetId: string, worksheetName?: string) => {
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
    
    const defaultPlan = await LearningPlan.findOne();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2;
      stat.processed++;

      // Essential Mapping
      const emailRaw = getField(row, headerRow, 'Email') || getField(row, headerRow, 'Email Address') || getField(row, headerRow, 'Mail id');
      const email = emailRaw.toLowerCase().trim();
      
      const fullName = getField(row, headerRow, 'Name') || getField(row, headerRow, 'Full Name');
      const phone = getField(row, headerRow, 'Phone') || getField(row, headerRow, 'Phone Number') || getField(row, headerRow, 'Contact');
      const courseStr = getField(row, headerRow, 'Course') || getField(row, headerRow, 'Course Name');
      const batchStr = getField(row, headerRow, 'Batch') || getField(row, headerRow, 'Preferred Batch');
      
      const timestampRaw = getField(row, headerRow, 'Timestamp');
      const submittedAt = timestampRaw ? new Date(timestampRaw) : new Date();

      if (!email) {
        stat.skipped++;
        stat.syncErrors.push({ row: rowNumber, email: 'Missing', reason: 'Missing Email', message: 'Record skipped because email was empty' });
        continue;
      }
      
      // Course Matching
      const mappedCourseTitle = normalizeCourseName(courseStr);
      let course = await Course.findOne({ title: new RegExp(`^${mappedCourseTitle}$`, 'i') });
      
      if (!course && mappedCourseTitle) {
        // Log mapping failure but do NOT silently create incorrect enrollment or skip user creation
        console.warn(`[SYNC] Course not matched for row ${rowNumber}: ${courseStr} -> ${mappedCourseTitle}`);
      }

      // Check existing user
      let user = await User.findOne({ email });
      let isNewUser = false;
      let tempPassword = '';

      if (user) {
        // Verify if it's already synced by checking submittedAt (if possible) or just update profile
        // If we strictly check sourceSubmittedAt, we might skip updates if they edit the form (Google Forms updates same row sometimes)
        if (user.sourceInformation?.sourceRowId === `row-${rowNumber}` && user.sourceInformation?.sourceSubmittedAt?.getTime() === submittedAt.getTime()) {
           stat.alreadySynced++;
           // We could continue, but maybe they updated other fields? 
           // Let's just update the profile to be safe.
        } else {
           stat.updated++;
        }
      } else {
        isNewUser = true;
        stat.created++;
        tempPassword = generateTempPassword();
        user = new User({
          name: fullName || 'Unknown',
          email: email,
          password: tempPassword,
          role: 'Student',
          status: 'active',
          isEmailVerified: true,
          needsPasswordChange: true,
        });
      }

      // Update Profile & Source Info
      user.name = fullName || user.name;
      user.studentProfile = {
        phone: phone || user.studentProfile?.phone,
        college: getField(row, headerRow, 'College') || user.studentProfile?.college,
        city: getField(row, headerRow, 'City') || user.studentProfile?.city,
        state: getField(row, headerRow, 'State') || user.studentProfile?.state,
        qualification: getField(row, headerRow, 'Qualification') || user.studentProfile?.qualification,
      };
      user.sourceInformation = {
        source: 'google_form',
        sourceRowId: `row-${rowNumber}`,
        sourceSubmittedAt: submittedAt,
        syncedAt: new Date(),
        syncStatus: 'SYNCED'
      };

      await user.save();

      // Handle Enrollment
      if (course) {
        const existingEnrollment = await Enrollment.findOne({ studentId: user._id, courseId: course._id });
        if (!existingEnrollment) {
          await Enrollment.create({
            studentId: user._id,
            courseId: course._id,
            learningPlanId: defaultPlan?._id,
            batch: batchStr || 'Batch A',
            startDate: new Date(),
            expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
            status: 'active',
            progress: { completedLessons: [], percentComplete: 0 }
          });
        }
      } else if (courseStr) {
         // Could track course mapping failures somewhere
         user.sourceInformation.syncStatus = 'FAILED';
         await user.save();
         stat.syncErrors.push({ row: rowNumber, email, reason: 'Course Mapping Failed', message: `Could not map course: ${courseStr}` });
      }

      // Send Email to New Users
      if (isNewUser) {
        try {
          await sendWelcomeEmail(user.email, user.name, tempPassword, undefined);
          await createNotification({
            title: '🎓 New Student Synced',
            message: `${user.name} was imported from Google Forms.`,
            type: 'NEW_STUDENT_ONBOARDING',
            recipientRole: ['Admin', 'SuperAdmin'],
          });
        } catch (err: any) {
          logger.error('Email sending failed for synced user:', err);
        }
      }
    }

    await stat.save();
    console.log(`[SYNC] Completed. Created: ${stat.created}, Updated: ${stat.updated}, Skipped: ${stat.skipped}`);
    return stat;
    
  } catch (error: any) {
    logger.error('Google Sheets sync error:', error);
    stat.syncErrors.push({ row: 0, email: 'system', reason: error.code || 'Fatal Error', message: error.message });
    await stat.save();
    throw error;
  }
};
