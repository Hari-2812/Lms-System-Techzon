import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import OnboardingRequest from '../models/OnboardingRequest';
import User from '../models/User';
import Course from '../models/Course';
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
    const status = req.query.status as string || 'PENDING';
    const requests = await OnboardingRequest.find(status ? { status } : {}).sort({ submittedAt: -1 });
    
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
        status: r.status,
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

    let courseId = req.body.courseId || (req.body.courses && req.body.courses[0]);
    let course = null;

    if (courseId) {
      if (mongoose.Types.ObjectId.isValid(courseId)) {
        course = await Course.findById(courseId).session(session);
      } else {
        // Fallback: maybe courseId is actually a title like "AI"
        course = await Course.findOne({ 
          title: { $regex: new RegExp(`^${courseId.trim()}$`, 'i') } 
        }).session(session);
      }
    }
    
    // Fallback: if course is still not found and onboarding request has a course title
    if (!course && request.courseDetails && request.courseDetails.course) {
       course = await Course.findOne({
         title: { $regex: new RegExp(`^${request.courseDetails.course.trim()}$`, 'i') }
       }).session(session);
    }

    if (!course) {
      if (!courseId) throw new Error('Please select a course.');
      else throw new Error('Selected course was not found.');
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

    const validPlan = await LearningPlan.findOne({ code: planCode }).session(session) || await LearningPlan.findOne({ code: 'self-paced' }).session(session);
    if (!validPlan) {
       throw new Error('No learning plan is configured for this course.');
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
