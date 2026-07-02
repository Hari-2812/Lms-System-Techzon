import { Request, Response } from 'express';
import crypto from 'crypto';
import Onboarding from '../models/Onboarding';
import User from '../models/User';
import Enrollment from '../models/Enrollment';
import LearningPlan from '../models/LearningPlan';
import Course from '../models/Course';
import AuditLog from '../models/AuditLog';
import { sendWelcomeEmail } from '../services/emailService';
import { syncGoogleSheetsOnboardings } from '../services/googleSheets';
import logger from '../config/logger';

// Helper to generate a random temporary password
const generateTempPassword = (): string => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const num = '23456789';
  const sym = '!@#$%-+';
  const all = upper + lower + num + sym;
  
  let pwd = '';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += num[Math.floor(Math.random() * num.length)];
  pwd += sym[Math.floor(Math.random() * sym.length)];
  
  for (let i = 4; i < 12; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
};

// 1. Submit Onboarding Request (PUBLIC)
export const submitOnboarding = async (req: Request, res: Response): Promise<void> => {
  const { fullName, email, phone, college, degree, city, state, courses, learningPlan, preferredBatch, preferredMentor } = req.body;

  if (!fullName || !email || !phone || !college || !degree || !city || !state || !courses || !learningPlan) {
    res.status(400).json({ success: false, message: 'All registration details are required' });
    return;
  }

  try {
    const onboarding = new Onboarding({
      fullName,
      email: email.toLowerCase(),
      phone,
      college,
      degree,
      city,
      state,
      courses,
      learningPlan,
      preferredBatch,
      preferredMentor: preferredMentor || undefined,
      status: 'pending',
    });

    await onboarding.save();
    logger.info(`New student onboarding request submitted from: ${email}`);
    res.status(201).json({ success: true, message: 'Your onboarding application has been submitted successfully!', data: onboarding });
  } catch (error: any) {
    logger.error('Error submitting onboarding request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. Get Onboarding Requests (ADMIN)
export const getOnboardings = async (req: Request, res: Response): Promise<void> => {
  const { status } = req.query;
  const filter: any = {};
  if (status) filter.status = status;

  try {
    const requests = await Onboarding.find(filter)
      .populate('courses', 'title')
      .populate('learningPlan', 'name')
      .populate('preferredMentor', 'name')
      .sort('-createdAt');

    res.status(200).json({ success: true, data: requests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Get Single Onboarding Details (ADMIN)
export const getOnboardingDetails = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const request = await Onboarding.findById(id)
      .populate('courses', 'title category')
      .populate('learningPlan', 'name price durationMonths features')
      .populate('preferredMentor', 'name email');

    if (!request) {
      res.status(404).json({ success: false, message: 'Onboarding request not found' });
      return;
    }

    res.status(200).json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. Update Onboarding Request Details (ADMIN)
export const updateOnboarding = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const request = await Onboarding.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!request) {
      res.status(404).json({ success: false, message: 'Onboarding request not found' });
      return;
    }

    await AuditLog.create({
      userId: req.user._id,
      action: 'UPDATE_ONBOARDING',
      details: `Updated onboarding application: ${request.fullName} (${request.email})`,
    });

    res.status(200).json({ success: true, data: request });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// 5. Delete Onboarding Request (ADMIN)
export const deleteOnboarding = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const request = await Onboarding.findByIdAndDelete(id);
    if (!request) {
      res.status(404).json({ success: false, message: 'Onboarding request not found' });
      return;
    }

    await AuditLog.create({
      userId: req.user._id,
      action: 'DELETE_ONBOARDING',
      details: `Deleted onboarding application: ${request.fullName} (${request.email})`,
    });

    res.status(200).json({ success: true, message: 'Onboarding request deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 6. Reject Onboarding Request (ADMIN)
export const rejectOnboarding = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  const { remarks } = req.body;

  try {
    const request = await Onboarding.findByIdAndUpdate(
      id,
      { status: 'rejected', remarks, approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    );

    if (!request) {
      res.status(404).json({ success: false, message: 'Onboarding request not found' });
      return;
    }

    await AuditLog.create({
      userId: req.user._id,
      action: 'REJECT_ONBOARDING',
      details: `Rejected onboarding request: ${request.fullName}. Reason: ${remarks || 'No remarks provided'}`,
    });

    res.status(200).json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 7. Approve Onboarding Request & Provision Account (ADMIN)
export const approveOnboarding = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  const { courses, learningPlan, batch, mentorId, durationMonths, remarks } = req.body;

  try {
    const request = await Onboarding.findById(id);
    if (!request) {
      res.status(404).json({ success: false, message: 'Onboarding request not found' });
      return;
    }

    if (request.status === 'approved') {
      res.status(400).json({ success: false, message: 'This onboarding request has already been approved.' });
      return;
    }

    // Capture values from body or fall back to request defaults
    const finalCourseIds = courses || request.courses;
    const finalPlanId = learningPlan || request.learningPlan;
    const finalBatch = batch || request.preferredBatch || 'Batch A';
    const finalMentorId = mentorId || request.preferredMentor;

    const plan = await LearningPlan.findById(finalPlanId);
    if (!plan) {
      res.status(400).json({ success: false, message: 'Invalid or missing learning plan selected.' });
      return;
    }

    // 1. Provision User Account
    let user = await User.findOne({ email: request.email.toLowerCase() });
    let tempPassword = '';

    if (!user) {
      tempPassword = generateTempPassword();
      user = new User({
        name: request.fullName,
        email: request.email.toLowerCase(),
        password: tempPassword,
        role: 'Student',
        status: 'active',
        isEmailVerified: true,
        needsPasswordChange: true,
      });
      await user.save();
      logger.info(`Onboarding approval spawned new student user: ${request.email}`);
    } else {
      // Ensure user profile status is active
      if (user.status !== 'active') {
        user.status = 'active';
        await user.save();
      }
    }

    // 2. Spawning Enrollments (spawns one enrollment per selected course)
    const startDate = new Date();
    const expiryDate = new Date();
    const activeDuration = durationMonths || plan.durationMonths || 6;
    expiryDate.setMonth(startDate.getMonth() + activeDuration);

    const enrollmentResults = [];
    for (const courseId of finalCourseIds) {
      const dbCourse = await Course.findById(courseId);
      if (!dbCourse) continue;

      // Spawns/updates course enrollment
      const enrollment = await Enrollment.findOneAndUpdate(
        { studentId: user._id, courseId: dbCourse._id },
        {
          learningPlanId: plan._id,
          batch: finalBatch,
          mentorId: finalMentorId || undefined,
          createdBy: req.user._id,
          startDate,
          expiryDate,
          status: 'active',
          progress: { completedLessons: [], percentComplete: 0 },
        },
        { upsert: true, new: true }
      );
      enrollmentResults.push(enrollment);
    }

    // 3. Mark Onboarding Request as Approved
    request.status = 'approved';
    request.remarks = remarks;
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();
    await request.save();

    // 4. Send Welcome Email Credentials
    const mainCourse = await Course.findById(finalCourseIds[0]);
    const mainMentor = finalMentorId ? await User.findById(finalMentorId) : null;
    let emailSent = false;

    if (tempPassword) {
      emailSent = await sendWelcomeEmail({
        studentName: request.fullName,
        email: request.email.toLowerCase(),
        passwordTemp: tempPassword,
        courseTitle: mainCourse ? mainCourse.title : 'General Course',
        planName: plan.name,
        batchName: finalBatch,
        mentorName: mainMentor ? mainMentor.name : 'Not Assigned',
      });
    } else {
      emailSent = true; // Student already has an active account & password
    }

    // 5. Audit Logging
    await AuditLog.create({
      userId: req.user._id,
      action: 'APPROVE_ONBOARDING',
      details: `Approved onboarding ID ${request._id} for ${request.fullName}. Spawned ${enrollmentResults.length} enrollments. Email sent: ${emailSent}`,
    });

    res.status(200).json({
      success: true,
      message: 'Onboarding approved successfully. Student access provisioned!',
      emailSent,
      data: {
        user: { id: user._id, name: user.name, email: user.email },
        enrollments: enrollmentResults,
      },
    });
  } catch (error: any) {
    logger.error('Error during onboarding approval:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const resendCredentials = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'Student user not found' });
      return;
    }

    const tempPassword = generateTempPassword();
    user.password = tempPassword;
    user.needsPasswordChange = true;
    await user.save();

    const enrollment = await Enrollment.findOne({ studentId: user._id })
      .populate('courseId')
      .populate('learningPlanId')
      .populate('mentorId');

    const courseTitle = enrollment && (enrollment.courseId as any) ? (enrollment.courseId as any).title : 'General Course';
    const planName = enrollment && (enrollment.learningPlanId as any) ? (enrollment.learningPlanId as any).name : 'Standard Plan';
    const batchName = (enrollment && enrollment.batch) || 'Batch A';
    const mentorName = enrollment && (enrollment.mentorId as any) ? (enrollment.mentorId as any).name : 'Not Assigned';

    const emailSent = await sendWelcomeEmail({
      studentName: user.name,
      email: user.email,
      passwordTemp: tempPassword,
      courseTitle,
      planName,
      batchName,
      mentorName,
    });

    await AuditLog.create({
      userId: req.user._id,
      action: 'RESEND_CREDENTIALS',
      details: `Resent welcome login credentials to: ${user.email}. Email sent: ${emailSent}`,
    });

    res.status(200).json({
      success: true,
      emailSent,
      message: emailSent ? 'Credentials resent successfully!' : 'Credentials generated, but email delivery failed.',
    });
  } catch (error: any) {
    logger.error('Error resending credentials:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const syncGoogleSheets = async (req: any, res: Response): Promise<void> => {
  try {
    const result = await syncGoogleSheetsOnboardings();
    
    await AuditLog.create({
      userId: req.user._id,
      action: 'SYNC_GOOGLE_SHEETS',
      details: `Manually synchronized Google Sheets. Synced ${result.synced} items, skipped ${result.skipped}.`,
    });

    res.status(200).json({
      success: true,
      message: `Google Sheets synced successfully! Added ${result.synced} new records, skipped ${result.skipped} duplicates.`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error syncing Google Sheets:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
