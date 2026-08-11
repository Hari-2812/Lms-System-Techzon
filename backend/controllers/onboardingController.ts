import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import OnboardingRequest from '../models/OnboardingRequest';
import User from '../models/User';
import Course from '../models/Course';
import GoogleSyncRecord from '../models/GoogleSyncRecord';
import { getAuthAndSheets, fetchSpreadsheetData, normalizeHeader, getField, normalizeCourseName } from '../services/onboardingSyncService';
import Enrollment from '../models/Enrollment';
import LearningPlan from '../models/LearningPlan';
import { sendWelcomeEmail, sendApprovalEmail } from '../services/email';
import { createNotification } from '../services/notificationService';
import logger from '../config/logger';
import { generateSecureTemporaryPassword } from '../utils/passwordGenerator';

export const deleteOnboardingRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const request = await OnboardingRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }

    // Only allow deletion of terminal states to be safe, or just let admin do whatever?
    // We allow it, but note that the GoogleSyncRecord is NOT deleted.
    // So the next sync will NOT respawn this exact row.
    // A fresh form submission by the same student will create a new row and a new request.
    await OnboardingRequest.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ success: true, message: 'Onboarding request removed successfully. Google sync history preserved.' });
  } catch (error: any) {
    logger.error('Error deleting onboarding request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOnboardingRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string;
    const query: any = {};
    if (status && status.toUpperCase() !== 'ALL') {
      query.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }
    
    const requests = await OnboardingRequest.find(query).sort({ submittedAt: -1 });
    
    // Transform to match frontend expectations if necessary, or let frontend adapt
    const allCourses = await Course.find().select('_id title').lean();
    
    const transformed = requests.map(r => {
      let resolvedCourseId = '';
      let resolvedCourseTitle = '';
      if (r.courseDetails && r.courseDetails.course) {
        const matchingCourse = allCourses.find(c => c.title.toLowerCase().trim() === r.courseDetails.course.toLowerCase().trim());
        if (matchingCourse) {
          resolvedCourseId = matchingCourse._id.toString();
          resolvedCourseTitle = matchingCourse.title;
        }
      }
      
      return {
        _id: r._id,
        googleRowId: r.sourceRowId,
        fullName: r.personalDetails.fullName,
        email: r.personalDetails.email,
        phone: r.personalDetails.phone,
        college: r.educationDetails?.college,
        city: r.addressDetails?.city,
        state: r.addressDetails?.state,
        preferredBatch: r.courseDetails.batch,
        courses: resolvedCourseId ? [{ _id: resolvedCourseId, title: resolvedCourseTitle }] : [], // Safely mapping the course
        status: r.status ? r.status.toUpperCase() : 'PENDING',
        createdAt: r.submittedAt,
        rawFormData: r.rawFormData
      };
    });

    res.status(200).json({ success: true, data: transformed, total: requests.length });
  } catch (error: any) {
    logger.error('Error fetching onboarding requests:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOnboardingRequestById = async (req: Request, res: Response): Promise<void> => {
  try {
    const request = await OnboardingRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }
    res.status(200).json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveOnboardingRequest = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await OnboardingRequest.findById(req.params.id).session(session);
    if (!request) {
      throw new Error('Onboarding request not found');
    }
    if (request.status !== 'PENDING') {
      throw new Error(`Request is already ${request.status}`);
    }

    let courseId = req.body.courseId;
    let course = null;

    if (!courseId) {
      throw new Error('Please select a course.');
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new Error('Invalid course selected');
    }

    course = await Course.findById(courseId).session(session);

    if (!course) {
      throw new Error('Invalid course selected');
    }

    const email = request.personalDetails.email.toLowerCase().trim();
    let user = await User.findOne({ email }).session(session);
    let isNewUser = false;
    let tempPassword = '';

    if (!user) {
      isNewUser = true;
      tempPassword = generateSecureTemporaryPassword();
      user = new User({
        name: request.personalDetails.fullName || 'Unknown',
        email,
        password: tempPassword,
        role: 'Student',
        status: 'active',
        isEmailVerified: true,
        needsPasswordChange: true,
        studentProfile: {
          phone: request.personalDetails.phone,
          city: request.addressDetails?.city,
          state: request.addressDetails?.state,
          college: request.educationDetails?.college,
          qualification: request.educationDetails?.qualification,
          gender: request.personalDetails.gender
        },
        sourceInformation: {
          source: request.source,
          sourceRowId: request.sourceRowId,
          sourceSubmittedAt: request.submittedAt,
          syncedAt: new Date(),
          syncStatus: 'SYNCED'
        }
      });
      await user.save({ session });
    }

    // Provision Enrollment
    let planCode = 'self-paced'; // Default
    if (request.courseDetails.courseType) {
       planCode = request.courseDetails.courseType.toLowerCase().replace(/\s+/g, '-');
    } else if (request.courseDetails.preferredMode) {
       planCode = request.courseDetails.preferredMode.toLowerCase().replace(/\s+/g, '-');
    }
    // Fallback normalization just in case
    if (planCode.includes('mentor')) planCode = 'mentor-led';
    if (planCode.includes('advanced')) planCode = 'advanced-mentor';

    let validPlan = await LearningPlan.findOne({ code: planCode }).session(session);
    if (!validPlan) {
       validPlan = await LearningPlan.findOne({ code: 'self-paced' }).session(session);
    }
    if (!validPlan) {
       validPlan = await LearningPlan.findOne().session(session);
    }
    if (!validPlan) {
       throw new Error('No learning plan is configured in the system. Please create a Learning Plan first.');
    }
    
    const existingEnrollment = await Enrollment.findOne({ studentId: user._id, courseId: course._id }).session(session);
    if (!existingEnrollment) {
      await Enrollment.create([{
        studentId: user._id,
        courseId: course._id,
        learningPlanId: validPlan._id,
        batch: request.courseDetails.batch || 'Batch A',
        startDate: new Date(),
        expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
        status: 'active',
        progress: { completedLessons: [], percentComplete: 0 }
      }], { session });
    }

    // Update Request Status
    // @ts-ignore
    request.status = 'APPROVED';
    request.approvedAt = new Date();
    // @ts-ignore
    request.approvedBy = (req as any).user?._id;
    request.student = { userId: user._id as mongoose.Types.ObjectId };
    // Keep record of selected vs original
    (request as any).selectedCourseId = course._id;
    (request as any).formCourse = request.courseDetails.course;
    await request.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Send email outside transaction
    let emailSent = false;
    let emailReason = '';
    
    try {
      await sendApprovalEmail(user.email, user.name, course.title, isNewUser ? tempPassword : undefined);
      emailSent = true;
      logger.info(`[EMAIL] Approval email sent successfully\nRecipient: ${user.email}\nTemplate: student-approval`);
      
      if (isNewUser) {
        await createNotification({
          title: '🎓 Student Access Granted',
          message: `${user.name} has been provisioned and emailed access credentials.`,
          type: 'NEW_STUDENT_ONBOARDING',
          recipientRole: ['Admin', 'SuperAdmin'],
        });
      }
    } catch (err: any) {
      logger.error('Approval email failed:', err);
      emailReason = err.message || 'Email service not configured or failed';
    }

    const responsePayload: any = {
      success: true,
      message: 'Student approved successfully',
      student: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      course: {
        id: course._id,
        name: course.title
      },
      enrollment: {
        status: 'ACTIVE'
      },
      access: {
        granted: true
      },
      email: {
        sent: emailSent
      }
    };
    
    if (!emailSent) {
      responsePayload.email.reason = emailReason;
    }

    res.status(200).json(responsePayload);
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    logger.error('Error approving onboarding request:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const rejectOnboardingRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    const request = await OnboardingRequest.findById(req.params.id);
    
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }
    
    // @ts-ignore
    request.status = 'REJECTED';
    request.rejectedAt = new Date();
    // @ts-ignore
    request.rejectedBy = (req as any).user?._id;
    request.rejectionReason = reason;
    
    await request.save();
    
    res.status(200).json({ success: true, message: 'Request rejected' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resendApprovalEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const request = await OnboardingRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }
    
    if (request.status !== 'APPROVED') {
      res.status(400).json({ success: false, message: 'Cannot resend email for unapproved request' });
      return;
    }

    const email = request.personalDetails.email.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ success: false, message: 'Student user not found in the system' });
      return;
    }

    let emailSent = false;
    let emailReason = '';
    try {
      // Find course title if possible, or fallback to the requested course
      let courseTitle = request.courseDetails?.course || 'Your Course';
      if ((request as any).selectedCourseId) {
        const course = await Course.findById((request as any).selectedCourseId);
        if (course) courseTitle = course.title;
      }
      
      let tempPassword = undefined;
      
      // If the user's account requires a password change (i.e. they haven't logged in and changed it yet),
      // we generate a brand new temporary password for security instead of sending the old one (which we don't have in plaintext anyway)
      if (user.needsPasswordChange) {
        tempPassword = generateSecureTemporaryPassword();
        user.password = tempPassword;
        await user.save(); // Mongoose pre-save hook will hash it
      }
      
      await sendApprovalEmail(user.email, user.name, courseTitle, tempPassword);
      emailSent = true;
      logger.info(`[EMAIL] Approval email sent successfully\nRecipient: ${user.email}\nTemplate: student-approval`);
    } catch (err: any) {
      logger.error(`[EMAIL] Approval email failed\nRecipient: ${user.email}\nReason: ${err.message}`);
      emailReason = err.message || 'SMTP authentication failed';
    }

    res.status(200).json({
      success: true,
      email: {
        sent: emailSent,
        error: emailSent ? undefined : emailReason
      }
    });
  } catch (error: any) {
    logger.error('Error resending email:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const migrateDuplicateGoogleForms = async (req: Request, res: Response): Promise<void> => {
  try {
    if (process.env.IMPORT_DUPLICATE_GOOGLE_FORM_SUBMISSIONS !== 'true') {
      res.status(403).json({ success: false, message: 'Migration mode is disabled. Please set IMPORT_DUPLICATE_GOOGLE_FORM_SUBMISSIONS=true in environment variables to proceed.' });
      return;
    }

    const isDryRun = String(req.query.dryRun) === 'true' || req.body.dryRun === true;

    // Fetch the sheet
    const { sheets, spreadsheetId, worksheetName } = await getAuthAndSheets();
    const rows = await fetchSpreadsheetData(sheets, spreadsheetId, worksheetName);

    if (rows.length <= 1) {
      res.status(200).json({ success: true, message: 'No data found in Google Sheet.' });
      return;
    }

    const headerRow = rows[0].map((h: any) => normalizeHeader(h?.toString() || ''));
    const dataRows = rows.slice(1);
    const originalHeaders = rows[0];

    const stats = {
      totalRows: dataRows.length,
      alreadyImported: 0,
      duplicateEmails: 0,
      rowsToImport: 0,
      existingUsers: 0,
      existingEnrollments: 0,
      imported: 0,
      skipped: 0
    };

    const seenEmailsInSheet = new Set<string>();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2;
      const sourceRowId = `row-${rowNumber}`;

      const emailRaw = getField(row, headerRow, 'Email') || getField(row, headerRow, 'Email Address') || getField(row, headerRow, 'Mail id');
      const email = emailRaw ? emailRaw.toLowerCase().trim() : '';

      if (!email) {
        stats.skipped++;
        continue;
      }

      // Check for already processed sourceRowId
      const existingReq = await OnboardingRequest.findOne({ source: 'google_form', sourceRowId });
      if (existingReq) {
        stats.alreadyImported++;
        seenEmailsInSheet.add(email); // Count it as seen so further identical emails count as duplicate
        continue;
      }

      // Check if duplicate email
      const userExists = await User.findOne({ email });
      if (userExists || seenEmailsInSheet.has(email)) {
        stats.duplicateEmails++;
      }
      seenEmailsInSheet.add(email);

      if (userExists) {
        stats.existingUsers++;
      }

      stats.rowsToImport++;

      if (!isDryRun) {
        // Essential Mapping
        const fullName = getField(row, headerRow, 'Name') || getField(row, headerRow, 'Full Name');
        const phone = getField(row, headerRow, 'Phone') || getField(row, headerRow, 'Phone Number') || getField(row, headerRow, 'Contact');
        const courseStr = getField(row, headerRow, 'Course') || getField(row, headerRow, 'Course Name') || '';
        const batchStr = getField(row, headerRow, 'Batch') || getField(row, headerRow, 'Preferred Batch') || '';
        
        const timestampRaw = getField(row, headerRow, 'Timestamp');
        const submittedAt = timestampRaw ? new Date(timestampRaw) : new Date();
        const mappedCourseTitle = normalizeCourseName(courseStr);

        const rawFormData: Record<string, any> = {};
        originalHeaders.forEach((h: any, idx: number) => {
          if (h) {
            rawFormData[h.toString()] = row[idx] !== undefined ? row[idx] : null;
          }
        });

        const newRequest = new OnboardingRequest({
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

        await newRequest.save();

        await GoogleSyncRecord.create({
          source: 'google_form',
          sourceRowId,
          syncedAt: new Date()
        });

        stats.imported++;
      }
    }

    res.status(200).json({
      success: true,
      message: isDryRun ? 'Dry run completed' : 'Migration completed successfully',
      isDryRun,
      stats
    });
  } catch (error: any) {
    logger.error('Error during migration:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const repairMissingOnboardingRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sheets, spreadsheetId, worksheetName } = await getAuthAndSheets();
    const rows = await fetchSpreadsheetData(sheets, spreadsheetId, worksheetName);

    if (rows.length <= 1) {
      res.status(200).json({ success: true, message: 'No data found in Google Sheet to repair from.' });
      return;
    }

    const headerRow = rows[0].map((h: any) => normalizeHeader(h?.toString() || ''));
    const dataRows = rows.slice(1);
    const originalHeaders = rows[0];

    const stats = {
      syncRecords: await GoogleSyncRecord.countDocuments({ source: 'google_form' }),
      onboardingRequests: await OnboardingRequest.countDocuments({ source: 'google_form' }),
      pendingOnboardingRequests: await OnboardingRequest.countDocuments({ source: 'google_form', status: 'PENDING' }),
      missingOnboardingRequests: 0,
      repaired: 0,
      alreadyPresent: 0,
      failed: 0
    };

    // Calculate missing
    const allSyncRecords = await GoogleSyncRecord.find({ source: 'google_form' });
    const allRequests = await OnboardingRequest.find({ source: 'google_form' });
    const reqIds = new Set(allRequests.map(r => r.sourceRowId));
    
    const missingIds = allSyncRecords.map(r => r.sourceRowId).filter(id => !reqIds.has(id));
    stats.missingOnboardingRequests = missingIds.length;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2;
      const sourceRowId = `row-${rowNumber}`;

      if (missingIds.includes(sourceRowId)) {
        try {
          const emailRaw = getField(row, headerRow, 'Email') || getField(row, headerRow, 'Email Address') || getField(row, headerRow, 'Mail id');
          const email = emailRaw ? emailRaw.toLowerCase().trim() : '';

          const fullName = getField(row, headerRow, 'Name') || getField(row, headerRow, 'Full Name');
          const phone = getField(row, headerRow, 'Phone') || getField(row, headerRow, 'Phone Number') || getField(row, headerRow, 'Contact');
          const courseStr = getField(row, headerRow, 'Course') || getField(row, headerRow, 'Course Name') || '';
          const batchStr = getField(row, headerRow, 'Batch') || getField(row, headerRow, 'Preferred Batch') || '';
          
          const timestampRaw = getField(row, headerRow, 'Timestamp');
          const submittedAt = timestampRaw ? new Date(timestampRaw) : new Date();
          const mappedCourseTitle = normalizeCourseName(courseStr);

          const rawFormData: Record<string, any> = {};
          originalHeaders.forEach((h: any, idx: number) => {
            if (h) {
              rawFormData[h.toString()] = row[idx] !== undefined ? row[idx] : null;
            }
          });

          const newRequest = new OnboardingRequest({
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

          await newRequest.save();
          stats.repaired++;
        } catch (e) {
          stats.failed++;
          logger.error(`Repair failed for ${sourceRowId}:`, e);
        }
      } else if (reqIds.has(sourceRowId)) {
        stats.alreadyPresent++;
      }
    }

    res.status(200).json({ success: true, stats });
  } catch (error: any) {
    logger.error('Error repairing requests:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
