import { Request, Response } from 'express';
import User from '../models/User';
import logger from '../config/logger';
import { generateSecureTemporaryPassword } from '../utils/passwordGenerator';
import { sendCredentialsResetEmail } from '../services/email';
import Enrollment from '../models/Enrollment';
import Payment from '../models/Payment';
import Course from '../models/Course';
import mongoose from 'mongoose';

export const updateStudentDetails = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.params;
  const { name, email, phone, city, qualification, dateOfBirth, gender, address, state, pincode, college, occupation, experience } = req.body;

  try {
    const student = await User.findById(studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== student.email) {
        // Check for duplicates
        const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: studentId } });
        if (existingUser) {
          res.status(400).json({ success: false, message: 'A student with this email already exists.' });
          return;
        }
        student.email = normalizedEmail;
      }
    }

    if (name) student.name = name;

    // Update studentProfile nested fields
    if (!student.studentProfile) {
      student.studentProfile = {};
    }

    if (phone !== undefined) student.studentProfile.phone = phone;
    if (city !== undefined) student.studentProfile.city = city;
    if (qualification !== undefined) student.studentProfile.qualification = qualification;
    if (dateOfBirth !== undefined) student.studentProfile.dateOfBirth = dateOfBirth;
    if (gender !== undefined) student.studentProfile.gender = gender;
    if (address !== undefined) student.studentProfile.address = address;
    if (state !== undefined) student.studentProfile.state = state;
    if (pincode !== undefined) student.studentProfile.pincode = pincode;
    if (college !== undefined) student.studentProfile.college = college;
    if (occupation !== undefined) student.studentProfile.occupation = occupation;
    if (experience !== undefined) student.studentProfile.experience = experience;

    await student.save();

    logger.info(`[ADMIN_ACTION] Student ${student.email} details updated by admin ${(req as any).user.email}`);

    res.status(200).json({ success: true, message: 'Student details updated successfully.', data: student });
  } catch (error: any) {
    logger.error('Error updating student details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resendStudentCredentials = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.params;

  try {
    const student = await User.findById(studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    // 1. Generate new temp password
    const newTempPassword = generateSecureTemporaryPassword();

    // 2. Set new password and flag
    student.password = newTempPassword;
    student.needsPasswordChange = true;
    
    // 3. Save to database (Mongoose pre-save hook will hash it)
    await student.save();

    // 4. Send email
    let emailSent = false;
    let emailErrorCategory = 'UNKNOWN';
    try {
      await sendCredentialsResetEmail(student.email, student.name, newTempPassword);
      emailSent = true;
      logger.info(`[ADMIN_ACTION] Login credentials resent successfully to ${student.email} by admin ${(req as any).user.email}`);
    } catch (emailErr: any) {
      logger.error(`[EMAIL_ERROR] Failed to send credentials to ${student.email}:`, emailErr);
      if (emailErr.message === "BREVO_IP_UNAUTHORIZED") {
        emailErrorCategory = 'BREVO_IP_UNAUTHORIZED';
      }
      // We don't fail the request, we just notify the admin the email failed
    }

    if (emailSent) {
      res.status(200).json({
        success: true,
        message: 'Login credentials sent successfully',
        email: student.email,
        emailSent: true
      });
    } else {
      // Password was changed but email failed
      const errorMsg = emailErrorCategory === 'BREVO_IP_UNAUTHORIZED'
        ? 'Credentials were updated, but Brevo rejected the email request because the server IP is not authorized. Please contact the administrator.'
        : 'Credentials updated, but email delivery failed. Please use Resend Login Credentials again.';
        
      res.status(200).json({
        success: true,
        message: errorMsg,
        email: student.email,
        emailSent: false,
        errorCategory: emailErrorCategory
      });
    }
  } catch (error: any) {
    logger.error('Error resending student credentials:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteStudentCompletely = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.params;
  const adminId = (req as any).user._id;
  const adminEmail = (req as any).user.email;

  // Dynamically import models to prevent circular dependencies if any, 
  // or we can just require them inline. For safety, let's require them inline here.
  const Enrollment = require('../models/Enrollment').default;
  const Progress = require('../models/Progress').default;
  const Certificate = require('../models/Certificate').default;
  const Submission = require('../models/Submission').default;
  const QuizResult = require('../models/QuizResult').default;
  const SupportTicket = require('../models/SupportTicket').default;
  const Notification = require('../models/Notification').default;
  const OnboardingRequest = require('../models/OnboardingRequest').default;
  const AuditLog = require('../models/AuditLog').default;
  const mongoose = require('mongoose');

  try {
    const student = await User.findById(studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    if (student.role === 'Admin' || student.role === 'SuperAdmin') {
      res.status(403).json({ success: false, message: 'Cannot delete an administrator account from Student Directory.' });
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    let deletedStats = {
      student: false,
      enrollments: 0,
      progressRecords: 0,
      certificates: 0,
      submissions: 0,
      quizResults: 0,
      supportTickets: 0,
      notifications: 0,
    };

    try {
      // Delete student-owned records
      const enrollmentsDel = await Enrollment.deleteMany({ studentId }, { session });
      deletedStats.enrollments = enrollmentsDel.deletedCount || 0;

      const progressDel = await Progress.deleteMany({ userId: studentId }, { session });
      deletedStats.progressRecords = progressDel.deletedCount || 0;

      const certsDel = await Certificate.deleteMany({ studentId }, { session });
      deletedStats.certificates = certsDel.deletedCount || 0;

      const subDel = await Submission.deleteMany({ studentId }, { session });
      deletedStats.submissions = subDel.deletedCount || 0;

      const quizDel = await QuizResult.deleteMany({ studentId }, { session });
      deletedStats.quizResults = quizDel.deletedCount || 0;

      const ticketDel = await SupportTicket.deleteMany({ studentId }, { session });
      deletedStats.supportTickets = ticketDel.deletedCount || 0;

      const notifDel = await Notification.deleteMany({ recipientId: studentId }, { session });
      deletedStats.notifications = notifDel.deletedCount || 0;

      // Update OnboardingRequest instead of deleting, so sync doesn't recreate it
      await OnboardingRequest.updateMany(
        { userId: studentId }, 
        { $unset: { userId: 1 }, status: 'REJECTED' }, // Using REJECTED or keeping APPROVED but unlinking. Let's use REJECTED to signify manual deletion.
        { session }
      );

      // Finally, delete the student
      await User.findByIdAndDelete(studentId, { session });
      deletedStats.student = true;

      // Audit Log
      await AuditLog.create([{
        userId: adminId,
        action: 'STUDENT_PERMANENTLY_DELETED',
        details: `Deleted student ${student.email} (${studentId})`,
      }], { session });

      await session.commitTransaction();
      session.endSession();

      logger.info(`[ADMIN_ACTION] Student ${student.email} permanently deleted by ${adminEmail}`);

      res.status(200).json({
        success: true,
        message: 'Student permanently removed from the LMS',
        studentId,
        deleted: deletedStats
      });

    } catch (txError: any) {
      await session.abortTransaction();
      session.endSession();
      throw txError;
    }

  } catch (error: any) {
    logger.error('Error permanently deleting student:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentAccessAudit = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.params;

  try {
    const student = await User.findById(studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const enrollments = await Enrollment.find({ studentId }).populate('courseId', 'title _id');
    const payments = await Payment.find({ 
      $or: [
        { studentEmail: student.email },
      ]
    }).populate('courseId', 'title _id');

    // Audit logic
    const auditMap = new Map<string, any>();

    // Process payments
    for (const payment of payments) {
      const courseIdStr = payment.courseId?._id?.toString() || payment.courseId?.toString();
      if (!courseIdStr) continue;
      
      if (!auditMap.has(courseIdStr)) {
        auditMap.set(courseIdStr, {
          courseId: courseIdStr,
          courseName: (payment.courseId as any)?.title || 'Unknown Course',
          paymentStatus: payment.status,
          paymentId: payment.orderId,
          enrollmentStatus: 'NONE',
          lmsAccess: 'DENIED',
          auditStatus: '⚠ Enrollment Missing',
          accessVerified: false
        });
      } else {
        const entry = auditMap.get(courseIdStr);
        if (payment.status === 'captured') {
          entry.paymentStatus = 'captured';
          entry.paymentId = payment.orderId;
        }
      }
    }

    // Process enrollments
    for (const enr of enrollments) {
      const courseIdStr = enr.courseId?._id?.toString() || enr.courseId?.toString();
      if (!courseIdStr) continue;

      if (!auditMap.has(courseIdStr)) {
        auditMap.set(courseIdStr, {
          courseId: courseIdStr,
          courseName: (enr.courseId as any)?.title || 'Unknown Course',
          paymentStatus: 'NONE',
          paymentId: null,
          enrollmentStatus: enr.status,
          lmsAccess: (enr.status === 'active' || enr.status === 'completed') ? 'GRANTED' : 'DENIED',
          auditStatus: (enr.status === 'active' || enr.status === 'completed') ? '⚠ Incorrect Access' : '⚠ No Payment',
          accessVerified: enr.accessVerified,
          accessVerifiedAt: enr.accessVerifiedAt,
          accessVerifiedBy: enr.accessVerifiedBy
        });
      } else {
        const entry = auditMap.get(courseIdStr);
        entry.enrollmentStatus = enr.status;
        entry.lmsAccess = (enr.status === 'active' || enr.status === 'completed') ? 'GRANTED' : 'DENIED';
        
        entry.accessVerified = enr.accessVerified;
        entry.accessVerifiedAt = enr.accessVerifiedAt;
        entry.accessVerifiedBy = enr.accessVerifiedBy;
        
        let currentStatus = '';
        if (entry.paymentStatus === 'captured' && (enr.status === 'active' || enr.status === 'completed')) {
          currentStatus = 'ELIGIBLE';
        } else if (entry.paymentStatus === 'NONE' && (enr.status === 'active' || enr.status === 'completed') && enr.accessVerified) {
          currentStatus = 'ELIGIBLE';
        } else if (entry.paymentStatus !== 'captured' && entry.paymentStatus !== 'NONE' && (enr.status === 'active' || enr.status === 'completed')) {
          currentStatus = '⚠ INCORRECT ACCESS';
        } else if (enr.status === 'expired') {
          currentStatus = '⚠ Enrollment Expired';
        } else if (enr.status === 'suspended') {
          currentStatus = '⚠ Enrollment Suspended';
        } else {
          currentStatus = '⚠ Not Verified';
        }

        if (enr.accessVerified) {
          if (currentStatus === 'ELIGIBLE') {
            entry.auditStatus = '✓ CORRECT ACCESS';
          } else {
            entry.auditStatus = '⚠ ACCESS NO LONGER VALID';
          }
        } else {
          if (currentStatus === 'ELIGIBLE') {
            entry.auditStatus = '⚠ NOT VERIFIED';
          } else {
            entry.auditStatus = currentStatus;
          }
        }
      }
    }

    const auditResults = Array.from(auditMap.values());

    const activeCourses = auditResults.filter(r => r.enrollmentStatus === 'active' || r.enrollmentStatus === 'completed' || r.paymentStatus === 'captured');

    const summary = {
      totalCourses: activeCourses.length,
      paidCourses: auditResults.filter(r => r.paymentStatus === 'captured').length,
      activeEnrollments: auditResults.filter(r => r.enrollmentStatus === 'active' || r.enrollmentStatus === 'completed').length,
      incorrectAccess: auditResults.filter(r => r.auditStatus === '⚠ INCORRECT ACCESS').length,
      lmsAccess: auditResults.some(r => (r.enrollmentStatus === 'active' || r.enrollmentStatus === 'completed') && r.lmsAccess === 'GRANTED') ? 'GRANTED' : 'DENIED'
    };

    res.status(200).json({
      success: true,
      data: {
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          phone: student.studentProfile?.phone,
          status: student.status
        },
        summary,
        audit: auditResults,
        enrollments,
        payments
      }
    });

  } catch (error: any) {
    logger.error('Error fetching student access audit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeStudentCourseAccess = async (req: Request, res: Response): Promise<void> => {
  const { studentId, courseId } = req.params;

  try {
    const enrollment = await Enrollment.findOne({ studentId, courseId });
    if (!enrollment) {
      res.status(404).json({ success: false, message: 'Enrollment not found for this course.' });
      return;
    }

    if (enrollment.status === 'suspended') {
      res.status(200).json({ success: true, message: 'Course access is already removed/suspended.' });
      return;
    }

    enrollment.status = 'suspended';
    enrollment.accessVerified = false;
    await enrollment.save();

    logger.info(`[ADMIN_ACTION] Admin removed course access for student ${studentId}, course ${courseId}`);

    res.status(200).json({ success: true, message: 'Course access removed successfully.' });
  } catch (error: any) {
    logger.error('Error removing student course access:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignStudentCourse = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.params;
  const { courseId } = req.body;

  try {
    const student = await User.findById(studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found.' });
      return;
    }

    let plan = await mongoose.model('LearningPlan').findOne({ code: 'self-paced', isActive: true });
    if (!plan) {
      plan = await mongoose.model('LearningPlan').findOne({ isActive: true });
    }
    if (!plan) {
      res.status(400).json({ success: false, message: 'No active learning plans found in the system. Please create a global learning plan first.' });
      return;
    }

    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found.' });
      return;
    }

    // reactivate a suspended one.
    let enrollment = await Enrollment.findOne({ studentId, courseId });
    if (enrollment) {
      if (enrollment.status === 'active') {
        res.status(400).json({ success: false, message: 'Student is already actively enrolled in this course.' });
        return;
      }
      enrollment.status = 'active';
      enrollment.accessVerified = true;
      enrollment.accessVerifiedAt = new Date();
      enrollment.accessVerifiedBy = req.user?._id;
      
      if (plan) {
        enrollment.learningPlanId = plan._id as any;
        const durationMonths = (plan as any).durationMonths || 6;
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + durationMonths);
        enrollment.expiryDate = expiryDate;
      }
      await enrollment.save();
    } else {
      const durationMonths = (plan as any).durationMonths || 6;
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

      enrollment = new Enrollment({
        studentId,
        courseId,
        learningPlanId: plan._id,
        status: 'active',
        startDate: new Date(),
        expiryDate,
        accessVerified: true,
        accessVerifiedAt: new Date(),
        accessVerifiedBy: req.user?._id
      });
      await enrollment.save();
    }

    logger.info(`[ADMIN_ACTION] Admin assigned course ${courseId} to student ${studentId}`);

    res.status(200).json({ success: true, message: 'Course assigned successfully.', data: enrollment });
  } catch (error: any) {
    logger.error('Error assigning student course:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyStudentCourseAccess = async (req: Request, res: Response): Promise<void> => {
  const { studentId, courseId } = req.params;
  const adminId = (req as any).user._id;

  try {
    const student = await User.findById(studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found.' });
      return;
    }

    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found.' });
      return;
    }

    const enrollment = await Enrollment.findOne({ studentId, courseId, status: 'active' });
    if (!enrollment) {
      res.status(400).json({ success: false, message: 'Cannot verify: no active enrollment found.' });
      return;
    }

    const payment = await Payment.findOne({ studentEmail: student.email, courseId, status: 'captured' });
    if (!payment) {
      res.status(400).json({ success: false, message: 'Cannot verify: no captured payment found.' });
      return;
    }

    enrollment.accessVerified = true;
    enrollment.accessVerifiedAt = new Date();
    enrollment.accessVerifiedBy = adminId;
    await enrollment.save();

    logger.info(`[ADMIN_ACTION] Admin verified course access for student ${studentId}, course ${courseId}`);

    res.status(200).json({ success: true, message: 'Course access verified successfully.' });
  } catch (error: any) {
    logger.error('Error verifying student course access:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
