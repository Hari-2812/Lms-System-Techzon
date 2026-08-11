import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import OnboardingRequest from '../models/OnboardingRequest';
import User from '../models/User';
import Course from '../models/Course';
import Enrollment from '../models/Enrollment';
import LearningPlan from '../models/LearningPlan';
import { sendWelcomeEmail } from '../services/email';
import { createNotification } from '../services/notificationService';
import logger from '../config/logger';

const generateTempPassword = (): string => {
  return crypto.randomBytes(6).toString('hex');
};

export const getOnboardingRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string || 'PENDING';
    const requests = await OnboardingRequest.find(status ? { status } : {}).sort({ submittedAt: -1 });
    
    // Transform to match frontend expectations if necessary, or let frontend adapt
    const transformed = requests.map(r => ({
      _id: r._id,
      googleRowId: r.sourceRowId,
      fullName: r.personalDetails.fullName,
      email: r.personalDetails.email,
      phone: r.personalDetails.phone,
      college: r.educationDetails?.college,
      city: r.addressDetails?.city,
      state: r.addressDetails?.state,
      preferredBatch: r.courseDetails.batch,
      courses: [{ _id: 'dummy', title: r.courseDetails.course }], // Mocking the object structure frontend expects for now, we map it on approval
      status: r.status,
      createdAt: r.submittedAt,
      rawFormData: r.rawFormData
    }));

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

    const { courses, learningPlan, batch, mentorId, durationMonths, remarks } = req.body;
    if (!courses || !courses.length) {
      throw new Error('No course selected for approval');
    }

    const email = request.personalDetails.email.toLowerCase().trim();
    let user = await User.findOne({ email }).session(session);
    let isNewUser = false;
    let tempPassword = '';

    if (!user) {
      isNewUser = true;
      tempPassword = generateTempPassword();
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

    // Provision Enrollment(s)
    const validPlan = await LearningPlan.findById(learningPlan).session(session);
    
    for (const courseId of courses) {
      const course = await Course.findById(courseId).session(session);
      if (!course) continue;

      const existingEnrollment = await Enrollment.findOne({ studentId: user._id, courseId: course._id }).session(session);
      if (!existingEnrollment) {
        await Enrollment.create([{
          studentId: user._id,
          courseId: course._id,
          learningPlanId: validPlan?._id,
          batch: batch || request.courseDetails.batch || 'Batch A',
          startDate: new Date(),
          expiryDate: new Date(new Date().setMonth(new Date().getMonth() + (durationMonths || 6))),
          status: 'active',
          progress: { completedLessons: [], percentComplete: 0 }
        }], { session });
      }
    }

    // Update Request Status
    // @ts-ignore
    request.status = 'APPROVED';
    request.approvedAt = new Date();
    // @ts-ignore
    request.approvedBy = (req as any).user?._id;
    request.student = { userId: user._id as mongoose.Types.ObjectId };
    await request.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Send email outside transaction
    if (isNewUser) {
      try {
        await sendWelcomeEmail(user.email, user.name, tempPassword, undefined);
        await createNotification({
          title: '🎓 Student Access Granted',
          message: `${user.name} has been provisioned and emailed access credentials.`,
          type: 'NEW_STUDENT_ONBOARDING',
          recipientRole: ['Admin', 'SuperAdmin'],
        });
      } catch (err: any) {
        logger.error('Welcome email failed:', err);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Student approved successfully',
      student: { id: user._id, name: user.name, email: user.email },
      enrollment: { status: 'ACTIVE' }
    });
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
