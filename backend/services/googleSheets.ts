import { google } from 'googleapis';
import Settings from '../models/Settings';
import Onboarding from '../models/Onboarding';
import Course from '../models/Course';
import LearningPlan from '../models/LearningPlan';
import User from '../models/User';
import logger from '../config/logger';
import { createNotification } from './notificationService';

interface GoogleSheetRow {
  rowId: string;
  fullName: string;
  email: string;
  phone: string;
  college: string;
  degree: string;
  city: string;
  state: string;
  courseName: string;
  preferredBatch: string;
  preferredMentorEmail?: string;
  submissionDate: string;
}

export const fetchSheetSubmissions = async (): Promise<GoogleSheetRow[]> => {
  const settings = await Settings.findOne();
  const sheetsConfig = settings?.googleSheetsSettings;

  if (!sheetsConfig || !sheetsConfig.spreadsheetId || !sheetsConfig.serviceAccountJson) {
    logger.warn('Google Sheets integration is not configured. Returning development mock sheet records.');
    // Return sample mock data to test out of the box
    return [
      {
        rowId: 'row-1',
        fullName: 'Aravind Swamy',
        email: 'aravind@example.com',
        phone: '9876543210',
        college: 'PSG College of Technology',
        degree: 'B.E. Computer Science',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        courseName: 'React JS Development',
        preferredBatch: 'Batch A',
        preferredMentorEmail: 'mentor@techzonwide.com',
        submissionDate: new Date().toISOString(),
      },
      {
        rowId: 'row-2',
        fullName: 'Divya Nair',
        email: 'divya@example.com',
        phone: '8765432109',
        college: 'St. Josephs College',
        degree: 'M.Sc. Information Technology',
        city: 'Bangalore',
        state: 'Karnataka',
        courseName: 'Full Stack Node.js Developer',
        preferredBatch: 'Batch B',
        preferredMentorEmail: 'mentor@techzonwide.com',
        submissionDate: new Date(Date.now() - 3600000).toISOString(),
      }
    ];
  }

  try {
    const credentials = JSON.parse(sheetsConfig.serviceAccountJson);
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetsConfig.spreadsheetId,
      range: `${sheetsConfig.worksheetName || 'Sheet1'}!A2:K`,
    });

    const rows = res.data.values || [];
    return rows.map((row, index) => ({
      rowId: `row-${index + 2}`, // 1-indexed header + A2 offset
      fullName: row[0] || '',
      email: row[1] || '',
      phone: row[2] || '',
      college: row[3] || '',
      degree: row[4] || '',
      city: row[5] || '',
      state: row[6] || '',
      courseName: row[7] || '',
      preferredBatch: row[8] || 'Batch A',
      preferredMentorEmail: row[9] || '',
      submissionDate: row[10] || new Date().toISOString(),
    }));
  } catch (error: any) {
    logger.error('Failed to read from Google Sheet via Service Account:', error);
    throw new Error(`Google Sheets fetch failed: ${error.message}`);
  }
};

export const syncGoogleSheetsOnboardings = async (): Promise<{ synced: number; skipped: number }> => {
  console.log("[BACKEND] Google sync started");
  try {
    const submissions = await fetchSheetSubmissions();
    let synced = 0;
    let skipped = 0;

    // Fetch default course & plan in case parsing strings fail
    const defaultCourse = await Course.findOne();
    const defaultPlan = await LearningPlan.findOne();

    for (const sub of submissions) {
      // Clean email check to avoid duplicate onboarding rows
      if (!sub.email) {
        skipped++;
        continue;
      }

      const existing = await Onboarding.findOne({
        $or: [
          { googleRowId: sub.rowId },
          { email: sub.email.toLowerCase() }
        ]
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Try finding Course in DB by matching name
      let course = await Course.findOne({ title: new RegExp(sub.courseName, 'i') });
      if (!course) {
        course = defaultCourse;
      }

      // Try matching mentor email
      let mentorId: string | undefined;
      if (sub.preferredMentorEmail) {
        const mentor = await User.findOne({ email: sub.preferredMentorEmail.toLowerCase(), role: 'Mentor' });
        if (mentor) {
          mentorId = mentor._id.toString();
        }
      }

      const newOnboarding = new Onboarding({
        fullName: sub.fullName,
        email: sub.email.toLowerCase(),
        phone: sub.phone,
        college: sub.college,
        degree: sub.degree,
        city: sub.city,
        state: sub.state,
        courses: course ? [course._id] : [],
        learningPlan: defaultPlan ? defaultPlan._id : undefined,
        preferredBatch: sub.preferredBatch || 'Batch A',
        preferredMentor: mentorId || undefined,
        status: 'pending',
        source: 'google-sheets',
        googleRowId: sub.rowId,
      });

      await newOnboarding.save();
      console.log(`[BACKEND] New onboarding detected: ${sub.email}`);
      
      const courseTitle = course ? course.title : 'Full Stack Development';
      console.log("[BACKEND] Creating admin notification");
      await createNotification({
        title: "New Student Registration",
        message: `${sub.fullName} registered for ${courseTitle}`,
        type: "NEW_STUDENT_ONBOARDING",
        recipientRole: ["Admin", "SuperAdmin"],
        metadata: {
          studentName: sub.fullName,
          email: sub.email,
          course: courseTitle,
          studentId: newOnboarding._id,
          googleRowId: sub.rowId
        }
      });

      synced++;
    }

    logger.info(`Google Sheets Synchronizer completed. Synced: ${synced}, Skipped: ${skipped}`);
    return { synced, skipped };
  } catch (error) {
    logger.error('Error in syncGoogleSheetsOnboardings job:', error);
    throw error;
  }
};
