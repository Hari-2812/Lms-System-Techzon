import { Request, Response } from 'express';
import crypto from 'crypto';
import Onboarding from '../models/Onboarding';
import User from '../models/User';
import Enrollment from '../models/Enrollment';
import LearningPlan from '../models/LearningPlan';
import Course from '../models/Course';
import AuditLog from '../models/AuditLog';
import { sendWelcomeEmail } from '../services/email';
import { syncGoogleSheetsOnboardings } from '../services/googleSheets';
import { createNotification } from '../services/notificationService';
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

  if (!fullName || !email || !phone || !courses || !learningPlan) {
    res.status(400).json({ success: false, message: 'Name, email, phone, course selection, and learning plan are required.' });
    return;
  }

  const emailLower = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: emailLower });
  const existingOnboarding = await Onboarding.findOne({ email: emailLower });

  if (existingUser) {
    res.status(400).json({ success: false, message: 'A student account already exists for this email.' });
    return;
  }

  if (existingOnboarding) {
    if (process.env.NODE_ENV === 'development') {
      existingOnboarding.fullName = fullName;
      existingOnboarding.phone = phone;
      existingOnboarding.college = college;
      existingOnboarding.degree = degree;
      existingOnboarding.city = city;
      existingOnboarding.state = state;
      existingOnboarding.courses = courses;
      existingOnboarding.learningPlan = learningPlan;
      existingOnboarding.preferredBatch = preferredBatch || existingOnboarding.preferredBatch;
      existingOnboarding.preferredMentor = preferredMentor || existingOnboarding.preferredMentor;
      existingOnboarding.updatedAt = new Date();
      await existingOnboarding.save();
      res.status(200).json({ success: true, message: 'Onboarding request updated successfully.', data: existingOnboarding });
      return;
    }

    res.status(400).json({ success: false, message: 'An onboarding request already exists for this email.' });
    return;
  }

  try {
    const onboarding = new Onboarding({
      fullName,
      email: email.toLowerCase(),
      phone,
      college: college || '',
      degree: degree || '',
      city: city || '',
      state: state || '',
      courses,
      learningPlan,
      preferredBatch,
      preferredMentor: preferredMentor || undefined,
      status: 'pending',
    });

    await onboarding.save();
    logger.info(`New student onboarding request submitted from: ${email}`);

    // Try to get course title
    let courseTitle = 'MERN Stack Development';
    try {
      if (courses && courses.length > 0) {
        const courseDb = await Course.findById(courses[0]);
        if (courseDb) {
          courseTitle = courseDb.title;
        }
      }
    } catch (err) {
      logger.error('Error fetching course for notification:', err);
    }

    await createNotification({
      title: '🎓 New Student Registration',
      message: `${fullName} submitted an onboarding request for ${courseTitle}. Review and approve the student.`,
      type: 'ONBOARDING_CREATED',
      recipientRole: ['Admin', 'SuperAdmin'],
      metadata: { onboardingId: onboarding._id, courseName: courseTitle },
    });

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

    await createNotification({
      title: '❌ Student Request Rejected',
      message: `${request.fullName}'s onboarding request has been rejected.`,
      type: 'STUDENT_REJECTED',
      recipientRole: ['Admin', 'SuperAdmin'],
      metadata: { onboardingId: request._id, fullName: request.fullName },
    });

    res.status(200).json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 7. Approve Onboarding Request & Provision Account (ADMIN)
export const approveOnboarding = async (req: any, res: Response): Promise<void> => {
  console.log('Approval Started');
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
    const emailLower = request.email.toLowerCase();
    const tempPassword = generateTempPassword();

    if (process.env.NODE_ENV === 'development') {
      console.log('Generated Password:', tempPassword);
    }

    if (!user) {
      user = new User({
        name: request.fullName,
        email: emailLower,
        password: tempPassword,
        role: 'Student',
        status: 'active',
        isEmailVerified: true,
        needsPasswordChange: true,
      });
      await user.save();
      console.log('Student Created');
      logger.info(`Onboarding approval spawned new student user: ${request.email}`);
    } else {
      user.password = tempPassword;
      user.needsPasswordChange = true;
      user.status = 'active';
      await user.save();
      if (process.env.NODE_ENV === 'development') {
        console.log('Password Hash Exists:', !!user.password);
      }
      console.log('Existing student account password reset');
      logger.info(`Existing student account updated during onboarding approval: ${emailLower}`);
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
    console.log('Enrollment Created');

    // 4. Send Welcome Email Credentials
    const mainCourse = await Course.findById(finalCourseIds[0]);
    const mainMentor = finalMentorId ? await User.findById(finalMentorId) : null;
    let emailSent = false;

    let emailInfo: any = null;
    console.log('Sending Email...');
    if (tempPassword) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Before Email Password:', tempPassword);
      }
      try {
        emailInfo = await sendWelcomeEmail(
          request.email.toLowerCase(),
          request.fullName,
          tempPassword,
          undefined
        );
        emailSent = true;
        console.log('Email Delivered');
      } catch (emailError: any) {
        emailSent = false;
        logger.error('Welcome email sending failed during onboarding approval:', {
          message: emailError.message,
          code: emailError.code,
          response: emailError.response,
          stack: emailError.stack,
        });
        console.log('SMTP error during approval email:', emailError.message);
      }
    }

    const courseTitle = mainCourse ? mainCourse.title : 'General Course';
    
    // Create notifications
    await createNotification({
      title: '✅ Student Approved Successfully',
      message: `${request.fullName} has been enrolled in ${courseTitle}.`,
      type: 'STUDENT_APPROVED',
      recipientRole: ['Admin', 'SuperAdmin'],
      metadata: { onboardingId: request._id, fullName: request.fullName, courseName: courseTitle },
    });

    if (tempPassword) {
      if (emailSent) {
        await createNotification({
          title: '📧 Welcome Email Sent',
          message: `Login credentials successfully delivered to ${request.email.toLowerCase()}`,
          type: 'EMAIL_SENT',
          recipientRole: ['Admin', 'SuperAdmin'],
          metadata: {
            onboardingId: request._id,
            email: request.email,
            messageId: emailInfo?.id,
          },
        });
      } else {
        await createNotification({
          title: '⚠️ Email Delivery Failed',
          message: `Student account created, but email failed to deliver to ${request.email.toLowerCase()}.`,
          type: 'EMAIL_FAILED',
          recipientRole: ['Admin', 'SuperAdmin'],
          metadata: {
            onboardingId: request._id,
            email: request.email,
            error: emailInfo?.message || 'Email delivery failed',
          },
        });
      }
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

    const durationMonths = enrollment && enrollment.expiryDate && enrollment.startDate
      ? Math.round((enrollment.expiryDate.getTime() - enrollment.startDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
      : 6;
    const startDateStr = enrollment && enrollment.startDate ? enrollment.startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const endDateStr = enrollment && enrollment.expiryDate ? enrollment.expiryDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    let emailInfo: any = null;
    let emailSent = false;
    try {
      console.log('Email Sending Started');
      emailInfo = await sendWelcomeEmail(
        user.email,
        user.name,
        tempPassword,
        undefined
      );
      emailSent = true;
    } catch (emailError: any) {
      emailSent = false;
      logger.error('Welcome email sending failed during resend credentials:', {
        message: emailError.message,
        code: emailError.code,
        response: emailError.response,
        stack: emailError.stack,
      });
    }

    if (emailSent) {
      await createNotification({
        title: '📧 Welcome Email Sent',
        message: `Login credentials successfully delivered to ${user.email.toLowerCase()}`,
        type: 'EMAIL_SENT',
        recipientRole: ['Admin', 'SuperAdmin'],
        metadata: {
          userId: user._id,
          email: user.email,
          messageId: emailInfo?.id,
        },
      });
    } else {
      await createNotification({
        title: '⚠️ Email Delivery Failed',
        message: `Student account created, but email failed to deliver to ${user.email.toLowerCase()}.`,
        type: 'EMAIL_FAILED',
        recipientRole: ['Admin', 'SuperAdmin'],
        metadata: {
          userId: user._id,
          email: user.email,
          error: emailInfo?.message || 'Email delivery failed',
        },
      });
    }

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
      details: `Manually synchronized Google Sheets. Imported ${result.newImports} items, updated ${result.updated}, skipped ${result.skipped}.`,
    });

    res.status(200).json({
      success: true,
      message: `Google Sheets synced successfully! Imported ${result.newImports} new records, updated ${result.updated}, skipped ${result.skipped} invalid rows.`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error syncing Google Sheets:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
