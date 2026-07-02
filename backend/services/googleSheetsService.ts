import { google } from 'googleapis';
import Onboarding from '../models/Onboarding';
import Course from '../models/Course';
import LearningPlan from '../models/LearningPlan';
import User from '../models/User';
import logger from '../config/logger';

export interface GoogleSheetsOnboardingRecord {
  timestamp: string;
  name: string;
  email: string;
  phone: string;
  courseName: string;
  status: 'New' | 'Imported' | 'Duplicate' | 'Error';
}

export const syncGoogleSpreadsheetData = async (): Promise<{
  total: number;
  synced: number;
  duplicates: number;
  skipped: number;
  records: GoogleSheetsOnboardingRecord[];
}> => {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1aPwxtq336Ledc9XmP6plEKa59CCKDZgM4u5Sw1Z7QXo';
  const worksheetName = process.env.GOOGLE_WORKSHEET_NAME || 'Form Responses 1';
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!serviceAccountEmail || !privateKey) {
    logger.warn('Google Service Account credentials are not defined in environment variables. Falling back to development simulated sheet responses.');
    
    // Fallback simulated records as requested for development to run out of the box
    const simulatedRows: GoogleSheetsOnboardingRecord[] = [
      {
        timestamp: new Date().toISOString(),
        name: 'Aravind Swamy',
        email: 'aravind@example.com',
        phone: '9876543210',
        courseName: 'React JS Development',
        status: 'New',
      },
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        name: 'Divya Nair',
        email: 'divya@example.com',
        phone: '8765432109',
        courseName: 'Full Stack Node.js Developer',
        status: 'New',
      }
    ];

    return await processImportRecords(simulatedRows);
  }

  try {
    // Format private key properly to handle Render multi-line environment variables
    const formattedKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${worksheetName}!A2:E`, // Columns: A=Timestamp, B=Name, C=Mail id, D=Phone number, E=Course
    });

    const rows = response.data.values || [];
    const records: GoogleSheetsOnboardingRecord[] = rows.map((row) => ({
      timestamp: row[0] || new Date().toISOString(),
      name: row[1] || '',
      email: (row[2] || '').trim().toLowerCase(),
      phone: row[3] || '',
      courseName: row[4] || '',
      status: 'New',
    }));

    return await processImportRecords(records);
  } catch (error: any) {
    logger.error('Error fetching Google spreadsheet responses:', error);
    throw new Error(`Google Sheets fetch failed: ${error.message}`);
  }
};

const processImportRecords = async (records: GoogleSheetsOnboardingRecord[]) => {
  let synced = 0;
  let duplicates = 0;
  let skipped = 0;

  const defaultCourse = await Course.findOne();
  const defaultPlan = await LearningPlan.findOne();

  for (const record of records) {
    if (!record.email) {
      record.status = 'Error';
      skipped++;
      continue;
    }

    // Check if duplicate in User or Onboarding requests
    const userExists = await User.findOne({ email: record.email });
    const onboardingExists = await Onboarding.findOne({ email: record.email });

    if (userExists || onboardingExists) {
      record.status = 'Duplicate';
      duplicates++;
      continue;
    }

    // Match Course
    let course = await Course.findOne({ title: new RegExp(record.courseName, 'i') });
    if (!course) {
      course = defaultCourse;
    }

    // Create Onboarding Request in LMS
    const newOnboarding = new Onboarding({
      fullName: record.name,
      email: record.email,
      phone: record.phone,
      college: 'PSG College of Technology', // Default fallback
      degree: 'B.E. Computer Science',      // Default fallback
      city: 'Coimbatore',                   // Default fallback
      state: 'Tamil Nadu',                  // Default fallback
      courses: course ? [course._id] : [],
      learningPlan: defaultPlan ? defaultPlan._id : undefined,
      status: 'pending',
      source: 'google-sheets',
    });

    await newOnboarding.save();
    record.status = 'Imported';
    synced++;
  }

  return {
    total: records.length,
    synced,
    duplicates,
    skipped,
    records,
  };
};
