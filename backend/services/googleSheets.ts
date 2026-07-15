import { google } from 'googleapis';
import Settings from '../models/Settings';
import Onboarding from '../models/Onboarding';
import Course from '../models/Course';
import LearningPlan from '../models/LearningPlan';
import User from '../models/User';
import Enrollment from '../models/Enrollment';
import logger from '../config/logger';
import { createNotification } from './notificationService';

interface GoogleSheetRow {
  rowNumber: number;
  timestamp: string;
  fullName: string;
  email: string;
  phone: string;
  courseName: string;
  source: 'GOOGLE_FORM';
}

const normalizeHeader = (header: string): string => header.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export const fetchSheetSubmissions = async (): Promise<GoogleSheetRow[]> => {
  const settings = await Settings.findOne();
  const sheetsConfig = settings?.googleSheetsSettings;

  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID?.trim() || sheetsConfig?.spreadsheetId?.trim();
  const worksheetName = process.env.GOOGLE_WORKSHEET_NAME?.trim() || sheetsConfig?.worksheetName?.trim();
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY || '';

  if (!spreadsheetId || !worksheetName || !serviceAccountEmail || !privateKeyRaw) {
    const message = 'Google Sheets integration is not configured. Spreadsheet ID, worksheet name, service account email, and private key are required.';
    logger.error(message, {
      spreadsheetId,
      worksheetName,
      serviceAccountEmailPresent: Boolean(serviceAccountEmail),
      privateKeyPresent: Boolean(privateKeyRaw),
      settings: sheetsConfig ? { spreadsheetId: sheetsConfig.spreadsheetId, worksheetName: sheetsConfig.worksheetName } : undefined,
    });
    throw new Error(message);
  }

  try {
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const range = `${worksheetName}!A1:Z`;

    console.log('Google Sheet Sync Started');
    console.log('Google Spreadsheet ID:', spreadsheetId);
    console.log('Google Worksheet Name:', worksheetName);
    console.log('Google Sheet Range:', range);
    console.log('Google Authentication Success');

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const rows = res.data.values || [];
    console.log('Total Rows Found:', rows.length);

    if (rows.length <= 1) {
      console.log('No data rows found in Google Sheet. Ensure the sheet contains headers and rows below the header.');
      return [];
    }

    const headerRow = rows[0].map((cell) => normalizeHeader(cell?.toString() || ''));
    const dataRows = rows
      .map((row, idx) => ({ row, rowNumber: idx + 1 }))
      .slice(1)
      .filter(({ row }) => row.some((cell) => `${cell || ''}`.trim() !== ''));

    if (dataRows.length > 0) {
      console.log('Latest Google Row:', dataRows[dataRows.length - 1].row);
    }

    const getValue = (row: any[], headerName: string): string => {
      const normalized = normalizeHeader(headerName);
      const index = headerRow.findIndex((column) => column === normalized);
      return index >= 0 ? `${row[index] || ''}`.trim() : '';
    };

    return dataRows.map(({ row, rowNumber }) => ({
      rowNumber,
      timestamp: getValue(row, 'Timestamp'),
      fullName: getValue(row, 'Name'),
      email: getValue(row, 'Mail id') || getValue(row, 'Email') || getValue(row, 'Email Address'),
      phone: getValue(row, 'Phone number') || getValue(row, 'Phone'),
      courseName: getValue(row, 'course') || getValue(row, 'Course'),
      source: 'GOOGLE_FORM' as const,
    }));
  } catch (error: any) {
    logger.error('Failed to read from Google Sheet via Service Account:', error);
    throw new Error(`Google Sheets fetch failed: ${error.message}`);
  }
};

export const syncGoogleSheetsOnboardings = async (): Promise<{
  totalRows: number;
  newImports: number;
  updated: number;
  duplicates: number;
  skipped: number;
  latestTimestamp?: string;
}> => {
  try {
    const submissions = await fetchSheetSubmissions();
    let newImports = 0;
    let updated = 0;
    let skipped = 0;
    let duplicates = 0;
    let latestTimestamp: string | undefined;

    const defaultPlan = await LearningPlan.findOne();

    for (const submission of submissions) {
      if (!submission.email) {
        skipped++;
        continue;
      }

      const email = submission.email.toLowerCase().trim();
      if (!email) {
        skipped++;
        continue;
      }

      const submittedAt = submission.timestamp ? new Date(submission.timestamp) : new Date();
      if (isNaN(submittedAt.getTime())) {
        logger.warn('Invalid timestamp in Google Sheet row. Using current time instead.', { rowNumber: submission.rowNumber, timestamp: submission.timestamp });
      }

      latestTimestamp = submission.timestamp || latestTimestamp;

      // 1. DYNAMIC COURSE MATCHING OR CREATION
      const normalizedCourseName = (submission.courseName || '').trim();
      let course = null;
      if (normalizedCourseName) {
        course = await Course.findOne({ title: new RegExp(`^${normalizedCourseName}$`, 'i') });
        if (!course) {
          console.log(`\nGoogle Form Email:\n${email}\nSelected Course:\n${normalizedCourseName}\nCourse not found.\nCreating new course...`);
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
          console.log(`Course Created Successfully.`);
        }
      }

      const courseIdStr = course ? course._id.toString() : 'N/A';
      const courseTitleStr = course ? course.title : 'N/A';

      // 2. CHECK EXISTING USER
      const existingUser = await User.findOne({ email });
      if (existingUser && course) {
        console.log(`\nGoogle Form Email:\n${email}\nSelected Course:\n${normalizedCourseName}\nMatched LMS Course:\n${courseTitleStr}\nCourse ID:\n${courseIdStr}`);
        
        // Update Enrollment
        const currentEnrollments = await Enrollment.find({ studentId: existingUser._id });
        const hasCourse = currentEnrollments.some(e => e.courseId.toString() === courseIdStr);
        
        if (!hasCourse) {
          // The student's course changed, or they don't have this course.
          // In dynamic Google Form sync, we replace their old enrollment with the new one
          await Enrollment.deleteMany({ studentId: existingUser._id });
          await Enrollment.create({
            studentId: existingUser._id,
            courseId: course._id,
            learningPlanId: defaultPlan ? defaultPlan._id : undefined,
            batch: 'Batch A',
            startDate: new Date(),
            expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
            status: 'active',
            progress: { completedLessons: [], percentComplete: 0 }
          });
          console.log(`Enrollment Updated:\nSUCCESS`);
          updated++;
        } else {
          console.log(`Enrollment Updated:\nSKIPPED (Already Enrolled)`);
          duplicates++;
        }
        continue;
      }

      // 3. HANDLE ONBOARDING FOR NEW USERS
      const existingOnboarding = await Onboarding.findOne({
        email,
        source: { $in: ['google-sheets', 'GOOGLE_FORM'] },
      }).sort({ submittedAt: -1 });
      const exactMatch = await Onboarding.findOne({ email, submittedAt });

      if (exactMatch) {
        duplicates++;
        continue;
      }

      const rowId = `row-${submission.rowNumber}`;
      const onboardingPayload = {
        fullName: submission.fullName,
        email,
        phone: submission.phone,
        courses: course ? [course._id] : [],
        learningPlan: defaultPlan ? defaultPlan._id : undefined,
        preferredBatch: 'Batch A',
        status: 'pending' as const,
        source: 'GOOGLE_FORM' as const,
        googleRowId: rowId,
        submittedAt: isNaN(submittedAt.getTime()) ? new Date() : submittedAt,
      };

      if (existingOnboarding) {
        if (process.env.NODE_ENV === 'development' || submission.timestamp) {
          existingOnboarding.fullName = onboardingPayload.fullName;
          existingOnboarding.phone = onboardingPayload.phone;
          existingOnboarding.courses = onboardingPayload.courses;
          if (onboardingPayload.learningPlan) {
            existingOnboarding.learningPlan = onboardingPayload.learningPlan;
          }
          existingOnboarding.preferredBatch = onboardingPayload.preferredBatch;
          existingOnboarding.googleRowId = onboardingPayload.googleRowId;
          existingOnboarding.submittedAt = onboardingPayload.submittedAt;
          existingOnboarding.status = 'pending';
          existingOnboarding.source = onboardingPayload.source;
          await existingOnboarding.save();
          updated++;
          continue;
        }

        duplicates++;
        continue;
      }

      const newOnboarding = new Onboarding(onboardingPayload);
      await newOnboarding.save();

      await createNotification({
        title: 'New Student Registration',
        message: `${submission.fullName} registered for ${courseTitleStr}`,
        type: 'NEW_STUDENT_ONBOARDING',
        recipientRole: ['Admin', 'SuperAdmin'],
        metadata: {
          studentName: submission.fullName,
          email,
          course: courseTitleStr,
          studentId: newOnboarding._id,
          googleRowId: onboardingPayload.googleRowId,
        },
      });

      newImports++;
    }

    logger.info(`Google Sheets Synchronizer completed. totalRows=${submissions.length}, newImports=${newImports}, updated=${updated}, duplicates=${duplicates}, skipped=${skipped}`);
    return {
      totalRows: submissions.length,
      newImports,
      updated,
      duplicates,
      skipped,
      latestTimestamp,
    };
  } catch (error) {
    logger.error('Error in syncGoogleSheetsOnboardings job:', error);
    throw error;
  }
};
