import { Request, Response } from 'express';
import crypto from 'crypto';
import User from '../models/User';
import Course from '../models/Course';
import LearningPlan from '../models/LearningPlan';
import Enrollment from '../models/Enrollment';
import Payment from '../models/Payment';
import AuditLog from '../models/AuditLog';
import { sendWelcomeEmail } from '../services/email';
import logger from '../config/logger';

// Helper to generate a random temporary password
const generateTempPassword = (): string => {
  return crypto.randomBytes(6).toString('hex');
};

// Process successful payment, provision account and enrollment
export const processEnrollment = async (
  email: string,
  name: string,
  courseIdOrSlug: string,
  planCodeOrSlug: string,
  paymentDetails: {
    paymentId: string;
    orderId: string;
    amount: number;
    signature?: string;
  }
) => {
  try {
    // 1. Fetch Course and Learning Plan
    let course = await Course.findById(courseIdOrSlug);
    if (!course) {
      course = await Course.findOne({ slug: courseIdOrSlug.toLowerCase() });
    }

    let plan = await LearningPlan.findOne({ code: planCodeOrSlug.toLowerCase() });
    if (!plan) {
      plan = await LearningPlan.findById(planCodeOrSlug);
    }

    if (!course || !plan) {
      throw new Error(`Invalid course (${courseIdOrSlug}) or plan (${planCodeOrSlug})`);
    }

    // 2. Create User if not existing
    let user = await User.findOne({ email: email.toLowerCase() });
    let tempPassword = '';

    if (!user) {
      tempPassword = generateTempPassword();
      user = new User({
        name,
        email: email.toLowerCase(),
        password: tempPassword,
        role: 'student',
        status: 'active',
        isEmailVerified: true,
      });
      await user.save();
      logger.info(`Automated student account created for email: ${email}`);
    }

    // 3. Create/Update Enrollment
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(startDate.getMonth() + plan.durationMonths);

    // Update if student is already enrolled or create new
    const enrollment = await Enrollment.findOneAndUpdate(
      { studentId: user._id, courseId: course._id },
      {
        learningPlanId: plan._id,
        startDate,
        expiryDate,
        status: 'active',
        progress: { completedLessons: [], percentComplete: 0 },
      },
      { upsert: true, new: true }
    );

    // 4. Record Payment
    const payment = new Payment({
      paymentId: paymentDetails.paymentId,
      orderId: paymentDetails.orderId,
      signature: paymentDetails.signature,
      studentEmail: email.toLowerCase(),
      studentName: name,
      courseId: course._id,
      learningPlanId: plan._id,
      amount: paymentDetails.amount,
      status: 'captured',
      transactionDate: new Date(),
    });
    await payment.save();

    // 5. Send Welcome Email
    await sendWelcomeEmail(email, name, tempPassword || undefined);

    // 6. Log activity
    await AuditLog.create({
      userId: user._id,
      action: 'ENROLLMENT_AUTOMATION',
      details: `User enrolled in course: ${course.title} via plan: ${plan.name}. Payment ID: ${paymentDetails.paymentId}`,
    });

    logger.info(`Enrollment successfully verified and activated for ${email} in course ${course.title}`);
    return { user, enrollment, payment };
  } catch (error) {
    logger.error('Error processing auto-enrollment in webhook:', error);
    throw error;
  }
};

// Razorpay Webhook Handler
export const razorpayWebhook = async (req: Request, res: Response): Promise<void> => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'yourwebhooksecret';
  const signature = req.headers['x-razorpay-signature'] as string;

  if (!signature) {
    res.status(400).json({ success: false, message: 'Signature missing' });
    return;
  }

  // Verify signature
  const shasum = crypto.createHmac('sha256', webhookSecret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  if (digest !== signature) {
    logger.warn('Invalid Razorpay signature matching failed.');
    res.status(400).json({ success: false, message: 'Invalid signature match' });
    return;
  }

  const event = req.body.event;
  logger.info(`Razorpay Webhook Event Received: ${event}`);

  if (event === 'payment.captured') {
    const paymentEntity = req.body.payload.payment.entity;
    const amount = paymentEntity.amount / 100; // converted to main currency unit
    const email = paymentEntity.email;
    const notes = paymentEntity.notes || {};

    const name = notes.studentName || notes.name || 'Student';
    const courseId = notes.courseId || notes.courseSlug;
    const planCode = notes.planCode || notes.planId;

    if (!courseId || !planCode) {
      logger.warn(`Missing metadata in payment notes: Course: ${courseId}, Plan: ${planCode}`);
      // Return 200 to acknowledge webhook receipt but log failure
      res.status(200).json({ success: false, message: 'Missing course/plan metadata in notes' });
      return;
    }

    try {
      await processEnrollment(email, name, courseId, planCode, {
        paymentId: paymentEntity.id,
        orderId: paymentEntity.order_id,
        amount,
        signature,
      });
      res.status(200).json({ success: true, message: 'Webhook enrollment processed' });
      return;
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
      return;
    }
  }

  res.status(200).json({ success: true, message: 'Event acknowledged' });
};

// Simulation Route (for development testing)
export const simulatePaymentWebhook = async (req: Request, res: Response): Promise<void> => {
  const { email, name, courseIdOrSlug, planCodeOrSlug } = req.body;

  if (!email || !name || !courseIdOrSlug || !planCodeOrSlug) {
    res.status(400).json({ success: false, message: 'Missing details for simulation' });
    return;
  }

  try {
    const paymentId = 'pay_' + crypto.randomBytes(8).toString('hex');
    const orderId = 'order_' + crypto.randomBytes(8).toString('hex');

    const result = await processEnrollment(email, name, courseIdOrSlug, planCodeOrSlug, {
      paymentId,
      orderId,
      amount: 4999,
    });

    res.status(200).json({
      success: true,
      message: 'Simulated payment enrollment successfully processed!',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
