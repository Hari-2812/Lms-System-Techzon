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
    throw new Error('Google Sheets credentials are not configured.');
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
  const defaultPlan = await LearningPlan.findOne();

  for (const record of records) {
    if (!record.email) {
      record.status = 'Error';
      skipped++;
      continue;
    }

    // Match Course dynamically
    const normalizedCourseName = (record.courseName || '').trim();
    let course = await Course.findOne({ title: new RegExp(`^${normalizedCourseName}$`, 'i') });
    
    if (!course && normalizedCourseName) {
      function titleCase(str: string) {
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.substring(1)).join(' ');
      }
      const courseTitle = titleCase(normalizedCourseName.replace(/[-_]/g, ' '));
      course = await Course.create({
        title: courseTitle,
        slug: courseTitle.toLowerCase().replace(/\s+/g, '-'),
        description: `${courseTitle} automatically created via Google Forms sync.`,
        category: 'Uncategorized',
        status: 'published'
      });
      console.log(`Course not found.\nCreating new course...\nCourse Created Successfully.`);
    }

    // Check if duplicate in User or Onboarding requests
    const userExists = await User.findOne({ email: record.email });
    const onboardingExists = await Onboarding.findOne({ email: record.email });

    if (userExists || onboardingExists) {
      record.status = 'Duplicate';
      duplicates++;
      continue;
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
